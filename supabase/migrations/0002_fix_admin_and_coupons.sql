-- 0002_fix_admin_and_coupons.sql
--
-- Corrections to 0001, found by introspecting the live database after it was
-- applied. 0001 was written against a schema inferred by probing for column
-- names, and inference missed four things.
--
-- Nothing here drops data. All four statements are idempotent.

/* ── 1. is_admin() must honour user_roles ──────────────────────────────────────
 *
 * This database already had a role-based admin model before 0001:
 *
 *   user_roles(user_id, role) with role in ('admin','staff','customer')
 *   is_super_admin()  -> checks user_roles for role = 'admin'
 *   admin_set_user_role() -> grants a role by INSERTing into user_roles
 *   policies such as products_admin_write / orders_admin_all -> call is_admin()
 *
 * 0001 replaced is_admin() with a check against an admin_emails allowlist only.
 * The two existing admin accounts happen to be the same two addresses in the
 * allowlist, so nobody lost access, but the app's own admin-grant path stopped
 * working: admin_set_user_role() writes to user_roles, which the new is_admin()
 * no longer reads. The next admin granted through the app would silently get
 * customer access. Both mechanisms now count.
 *
 * SECURITY DEFINER and the function owner are what let this read user_roles
 * without recursing through that table's own policies.
 */
create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public
as $$
  select
    exists (
      select 1 from public.user_roles
       where user_id = auth.uid()
         -- cast through text so this does not depend on the app_role enum
         -- keeping its name
         and role::text = 'admin'
    )
    or exists (
      select 1 from public.admin_emails
       where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

/* ── 2. reviews.author_name is NOT NULL ───────────────────────────────────────
 *
 * The reviews table predates 0001 and its display-name column is author_name
 * text NOT NULL. Probing for user_name/name/author/customer_name missed it, and
 * 0001 added a *second* nullable user_name column beside it. Every insert
 * failed with:
 *
 *   23502 null value in column "author_name" of relation "reviews"
 *   violates not-null constraint
 *
 * The client now supplies author_name, and the trigger mirrors it into the
 * nullable user_name so the moderation queue and anything else already reading
 * that column keep working. The duplicate column is left in place: dropping it
 * would be a destructive change to a table this project owns.
 */
create or replace function public.reviews_stamp_insert() returns trigger
  language plpgsql security definer set search_path = public
as $$
begin
  new.user_email := auth.jwt() ->> 'email';

  -- author_name is the column the table actually requires.
  new.user_name := coalesce(new.user_name, new.author_name);

  if public.is_admin() then
    new.status := coalesce(new.status, 'approved');
    new.is_approved := (new.status = 'approved');
  else
    -- A visitor must not be able to post a live review, whatever they send.
    new.status := 'pending';
    new.is_approved := false;
  end if;

  new.reviewed_at := now();
  return new;
end;
$$;

/* ── 3. coupons.code needs to be unique ────────────────────────────────────────
 *
 * coupons is keyed by id uuid; code is plain text with no unique constraint.
 * The Admin editor upserts with onConflict: 'code', which Postgres rejects:
 *
 *   42P10 there is no unique or exclusion constraint matching the ON CONFLICT
 *   specification
 *
 * The table is empty, so this cannot collide with anything today. The check is
 * kept as a guard rather than a silent assumption.
 */
do $$
begin
  if exists (
    select 1 from public.coupons
     group by lower(code) having count(*) > 1
  ) then
    raise exception
      'coupons.code has duplicates; resolve them before adding the unique index';
  end if;
end;
$$;

create unique index if not exists coupons_code_key on public.coupons (lower(code));

/* ── 4. products_public_read defeats archiving ─────────────────────────────────
 *
 * Two permissive SELECT policies on products now coexist:
 *
 *   products_public_read  using (true)          <- pre-existing
 *   products are public    using (is_active)     <- from 0001
 *
 * Permissive policies are OR-ed together, so "using (true)" wins and every
 * product is world-readable regardless of is_active. That makes archive and
 * restore in the Admin panel a client-side illusion: the row is still served to
 * the public. Dropping the unconditional one leaves the is_active policy as the
 * only public SELECT path.
 */
drop policy if exists "products_public_read" on public.products;

/* The archived path now has to actually work, so confirm the surviving policy
   is the is_active one rather than something else left behind. */
do $$
declare
  pub_read integer;
begin
  select count(*) into pub_read
    from pg_policies
   where schemaname = 'public'
     and tablename = 'products'
     and cmd = 'SELECT'
     and (qual is null or qual = 'true' or qual = ' true');

  if pub_read > 0 then
    raise exception
      'products still has % unrestricted SELECT policy/ies; archiving is not enforced', pub_read;
  end if;
end;
$$;

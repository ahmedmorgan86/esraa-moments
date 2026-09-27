-- 0003_tighten_coupons.sql
--
-- Corrects a false assumption carried in 0002, and removes the policy that
-- shipped with the project before any of this work.
--
-- Nothing here drops data.

/* ── 1. what 0002 believed about coupons.code, and why it changed nothing ──────
 *
 * 0002 contains:
 *
 *   create unique index if not exists coupons_code_key on coupons (lower(code))
 *
 * coupons already had, from the original schema:
 *
 *   [u] coupons_code_key   UNIQUE (code)
 *
 * The auto-generated name for a unique constraint on coupons.code is
 * coupons_code_key. "if not exists" matches by name, so the statement found the
 * existing constraint and did nothing at all -- no index on lower(code) was
 * ever created, and 0002's claim that it fixed the Admin upsert was wrong. The
 * upsert was never broken: onConflict: 'code' resolves against the constraint
 * that was already there. Verified by inserting with ON CONFLICT (code).
 *
 * What is genuinely missing is case-insensitivity. UNIQUE (code) allows both
 * "SAVE10" and "save10" as separate rows. The client uppercases on write, so
 * that can only happen through a hand-issued INSERT, but the guarantee is
 * worth having and costs nothing: pin the format with a CHECK, and the existing
 * UNIQUE (code) becomes case-insensitive by construction.
 */
update public.coupons set code = upper(btrim(code))
 where code <> upper(btrim(code));

alter table public.coupons
  drop constraint if exists coupons_code_normalized;
alter table public.coupons
  add constraint coupons_code_normalized
  check (code = upper(btrim(code))) not valid;
alter table public.coupons validate constraint coupons_code_normalized;

/* ── 2. stop publishing every active coupon to the internet ───────────────────
 *
 * coupons_public_read_active shipped with the original project and lets anyone
 * read active codes, bypassing the min_order and expiry checks that
 * validate_coupon() exists to enforce. The codes are the only secret part of a
 * discount, and the table is otherwise empty of anything private.
 *
 * The storefront never reads this table: Product.tsx calls the validate_coupon
 * RPC, which is SECURITY DEFINER and therefore unaffected by the policy.
 * fetchCoupons() is called only from Admin, behind is_admin().
 */
do $$
declare
  is_definer boolean;
begin
  -- Everything below depends on this. If validate_coupon were not SECURITY
  -- DEFINER it would be subject to the policy being dropped, and every coupon
  -- box on every product page would silently stop validating.
  select p.prosecdef into is_definer
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'validate_coupon';

  if is_definer is null then
    raise exception 'public.validate_coupon is missing; refusing to change coupon policies';
  end if;

  if not is_definer then
    raise exception
      'public.validate_coupon is not SECURITY DEFINER; dropping the public read policy would break storefront coupon validation';
  end if;

  if not has_function_privilege('anon', 'public.validate_coupon(text,numeric)', 'EXECUTE') then
    raise exception 'anon can no longer execute validate_coupon; storefront validation would break';
  end if;
end;
$$;

drop policy if exists "coupons_public_read_active" on public.coupons;

-- Admin keeps full access, stated explicitly rather than inherited from
-- whatever shipped before, so the result does not depend on that.
drop policy if exists "coupons_admin_read" on public.coupons;
create policy "coupons_admin_read" on public.coupons
  for select to authenticated
  using (public.is_admin());

/* ── 3. prove the storefront path still works, then clean up ──────────────────
 *
 * Run as anon, through the RLS now in force, so this is the path a customer
 * takes. A failure here aborts the migration rather than shipping a database
 * where coupons have quietly stopped validating.
 */
do $$
declare
  res jsonb;
begin
  perform set_config('request.jwt.claims', '', true);

  insert into public.coupons (code, amount, min_order, is_active, usage_limit)
  values ('ZZSELFTEST', 10, 50, true, 5);

  -- EXECUTE, not a bare SET: SET LOCAL ROLE is not a PL/pgSQL statement.
  execute 'set local role anon';

  select public.validate_coupon('ZZSELFTEST', 100) into res;
  if res is null or res ->> 'valid' <> 'true' then
    raise exception 'validate_coupon broke for anon: %', res::text;
  end if;

  -- 10 is under the 50 minimum, so the discount must be refused
  select public.validate_coupon('ZZSELFTEST', 10) into res;
  if res ->> 'valid' <> 'false' then
    raise exception 'min_order is not being enforced: %', res::text;
  end if;

  -- and the table really is closed to anon now
  if exists (select 1 from public.coupons) then
    raise exception 'anon can still read the coupons table';
  end if;

  execute 'reset role';

  delete from public.coupons where code = 'ZZSELFTEST';
end;
$$;

/* ── 4. no unqualified SELECT path may remain on coupons ────────────────────── */
do $$
declare
  leaks integer;
begin
  select count(*) into leaks
    from pg_policies
   where schemaname = 'public'
     and tablename = 'coupons'
     and cmd = 'SELECT'
     and (qual is null or qual = 'true' or qual = ' true');

  if leaks > 0 then
    raise exception
      'coupons still has % unrestricted SELECT policy/ies; codes remain public', leaks;
  end if;
end;
$$;

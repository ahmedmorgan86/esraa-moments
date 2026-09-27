-- ESRAA Moments — shared data layer
--
-- Moves the store off per-browser localStorage so that Admin edits actually
-- reach customers. Every table below is additive and idempotent: this file
-- can be re-run against a database that already has some of it.
--
-- Apply with either:
--   supabase db push
--   or paste into the Supabase Studio SQL editor and run once.

-- ─────────────────────────────────────────────────────────────────────────────
-- Admin identity
--
-- The admin check lives here rather than only in the client so that RLS is the
-- single source of truth. adminAuth.ts in the frontend is a UX affordance for
-- hiding the /admin route; it is not a security boundary.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.admin_emails (
  email      text primary key,
  created_at timestamptz not null default now()
);

insert into public.admin_emails (email) values
  ('esraamomentsstore@gmail.com'),
  ('ahmed.morgan2009@gmail.com')
on conflict (email) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_emails a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.admin_emails enable row level security;

drop policy if exists "admins read own row" on public.admin_emails;
create policy "admins read own row" on public.admin_emails
  for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- ─────────────────────────────────────────────────────────────────────────────
-- settings — key/value store for store details, appearance and CMS content
--
-- site.tsx already reads key = 'site', so this table shape is what the app was
-- written against; it is created here if it does not exist yet.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.settings add column if not exists updated_at timestamptz not null default now();

-- ─────────────────────────────────────────────────────────────────────────────
-- products — the catalogue
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id              text primary key,
  name            text        not null,
  name_en         text,
  category        text        not null,
  price           numeric(10, 2) not null default 0 check (price >= 0),
  stock           integer     not null default 0 check (stock >= 0),
  image           text        not null default '',
  desc            text        not null default '',
  desc_en         text,
  featured        boolean     not null default false,
  is_starting_from boolean    not null default false,
  sort_order      integer     not null default 0,
  archived        boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category) where archived = false;
create index if not exists products_sort_idx on public.products (sort_order, id);

-- ─────────────────────────────────────────────────────────────────────────────
-- reviews — public submissions with moderation
--
-- status: 'pending' | 'approved' | 'rejected'
-- Anonymous visitors may submit, but they may only ever insert a pending
-- review, and may only ever read approved ones. The check constraint is what
-- stops a crafted request from self-approving its own review.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id         text primary key,
  product_id text        not null,
  user_name  text        not null check (char_length(user_name) between 1 and 60),
  rating     integer     not null check (rating between 1 and 5),
  comment    text        not null check (char_length(comment) between 1 and 800),
  status     text        not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  user_email text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint reviews_product_fk foreign key (product_id) references public.products (id) on delete cascade
);

alter table public.reviews add column if not exists user_email text;

create index if not exists reviews_product_status_idx on public.reviews (product_id, status);
create index if not exists reviews_pending_idx on public.reviews (created_at desc) where status = 'pending';

-- Stamp the author and force the pending state server-side. The insert policy
-- already rejects a self-approved submission, but relying on one mechanism for
-- this is how moderation bypasses happen; the trigger makes it unconditional.
create or replace function public.reviews_stamp_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_email := auth.jwt() ->> 'email';
  -- An admin may insert an already-approved review when seeding, nobody else can.
  if not public.is_admin() then
    new.status := 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_stamp_insert on public.reviews;
create trigger reviews_stamp_insert
  before insert on public.reviews
  for each row execute function public.reviews_stamp_insert();

-- ─────────────────────────────────────────────────────────────────────────────
-- wishlist_items — synced for signed-in customers
--
-- Guests keep their existing localStorage wishlist; it is merged into this
-- table on first sign-in and the union is written back.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.wishlist_items (
  user_id    uuid not null references auth.users (id) on delete cascade,
  product_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id),
  constraint wishlist_product_fk foreign key (product_id) references public.products (id) on delete cascade
);

create index if not exists wishlist_user_idx on public.wishlist_items (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- coupons
--
-- The storefront has no direct read access to this table on purpose. Discount
-- arithmetic happens only inside validate_coupon() below, so a client cannot
-- invent its own discount by editing local state.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.coupons (
  code           text primary key check (code = upper(code)),
  discount_type  text    not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10, 2) not null check (discount_value > 0),
  min_order      numeric(10, 2) not null default 0 check (min_order >= 0),
  max_uses       integer not null default 0 check (max_uses >= 0),
  used_count     integer not null default 0 check (used_count >= 0),
  expires_at     timestamptz,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- A percentage discount can never exceed the order it is applied to.
  constraint coupons_percent_cap check (discount_type <> 'percent' or discount_value <= 100),
  constraint coupons_uses_cap check (max_uses = 0 or used_count <= max_uses)
);

create index if not exists coupons_active_idx on public.coupons (active) where active;

-- ─────────────────────────────────────────────────────────────────────────────
-- validate_coupon — the only place a discount is ever computed
--
-- Called by the storefront with anon rights, so it is SECURITY DEFINER. That
-- also means it must not trust its search_path or let a caller shadow
-- `coupons`; both are pinned below.
--
-- Returns jsonb: { valid, discount, reason, code, discount_type }
--   discount is 0 when valid is false. reason is a stable machine-readable
--   string that the UI maps to a translated message.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.validate_coupon(p_code text, p_subtotal numeric)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c    public.coupons%rowtype;
  disc numeric(12, 2);
begin
  if p_code is null or btrim(p_code) = '' then
    return jsonb_build_object('valid', false, 'discount', 0, 'reason', 'empty', 'code', null, 'discount_type', null);
  end if;

  select * into c from public.coupons where code = upper(btrim(p_code));

  if not found then
    return jsonb_build_object('valid', false, 'discount', 0, 'reason', 'not_found', 'code', null, 'discount_type', null);
  end if;
  if not c.active then
    return jsonb_build_object('valid', false, 'discount', 0, 'reason', 'inactive', 'code', c.code, 'discount_type', c.discount_type);
  end if;
  if c.expires_at is not null and c.expires_at < now() then
    return jsonb_build_object('valid', false, 'discount', 0, 'reason', 'expired', 'code', c.code, 'discount_type', c.discount_type);
  end if;
  if c.max_uses > 0 and c.used_count >= c.max_uses then
    return jsonb_build_object('valid', false, 'discount', 0, 'reason', 'exhausted', 'code', c.code, 'discount_type', c.discount_type);
  end if;
  if p_subtotal is null or p_subtotal < c.min_order then
    return jsonb_build_object('valid', false, 'discount', 0, 'reason', 'min_order', 'code', c.code, 'discount_type', c.discount_type, 'min_order', c.min_order);
  end if;

  if c.discount_type = 'percent' then
    disc := round(p_subtotal * c.discount_value / 100, 2);
  else
    disc := c.discount_value;
  end if;

  -- Never hand back more than the order is worth.
  disc := least(greatest(disc, 0), p_subtotal);

  return jsonb_build_object(
    'valid', true, 'discount', disc, 'reason', 'ok',
    'code', c.code, 'discount_type', c.discount_type, 'min_order', c.min_order
  );
end;
$$;

revoke all on function public.validate_coupon(text, numeric) from public;
grant execute on function public.validate_coupon(text, numeric) to anon, authenticated;

-- redeem_coupon — increments the use counter. Admin only, and deliberately not
-- called from the storefront: a customer could otherwise burn through a
-- limited-use code just by typing it in repeatedly.
create or replace function public.redeem_coupon(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  c public.coupons%rowtype;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  update public.coupons
     set used_count = used_count + 1, updated_at = now()
   where code = upper(btrim(coalesce(p_code, '')))
     and (max_uses = 0 or used_count < max_uses)
  returning * into c;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;

  return jsonb_build_object('ok', true, 'code', c.code, 'used_count', c.used_count, 'max_uses', c.max_uses);
end;
$$;

revoke all on function public.redeem_coupon(text) from public;
grant execute on function public.redeem_coupon(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row level security
-- ─────────────────────────────────────────────────────────────────────────────

-- products: world-readable, admin-writable
alter table public.products enable row level security;

drop policy if exists "products are public" on public.products;
create policy "products are public" on public.products
  for select to anon, authenticated using (archived = false);

drop policy if exists "admins manage products" on public.products;
create policy "admins manage products" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- settings: world-readable (store details are public anyway), admin-writable
alter table public.settings enable row level security;

drop policy if exists "settings are public" on public.settings;
create policy "settings are public" on public.settings
  for select to anon, authenticated using (true);

drop policy if exists "admins manage settings" on public.settings;
create policy "admins manage settings" on public.settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- reviews: approved-only reads, pending-only writes, admin moderates
--
-- The public read and admin read are deliberately two policies rather than one
-- `status = 'approved' or is_admin()`. is_admin() has EXECUTE revoked from
-- public, and an OR still evaluates its right-hand side when the left is false
-- — so an anonymous visitor asking for a pending review would get a permission
-- error instead of an empty result. Separate policies keep each caller's
-- privilege set honest.
alter table public.reviews enable row level security;

drop policy if exists "approved reviews are public" on public.reviews;
create policy "approved reviews are public" on public.reviews
  for select to anon, authenticated using (status = 'approved');

drop policy if exists "admins read all reviews" on public.reviews;
create policy "admins read all reviews" on public.reviews
  for select to authenticated using (public.is_admin());

drop policy if exists "anyone may submit a review" on public.reviews;
create policy "anyone may submit a review" on public.reviews
  for insert to anon, authenticated
  with check (status = 'pending');

-- Separate so an admin can seed a review straight to 'approved' without the
-- pending rule blocking it. Permissive policies are OR'd, so anon still only
-- ever gets the pending-only rule.
drop policy if exists "admins may seed a review" on public.reviews;
create policy "admins may seed a review" on public.reviews
  for insert to authenticated with check (public.is_admin());

-- Reviews are anonymous submissions, so there is no author identity to check
-- against: the trigger stamps user_email, but nothing in the storefront lets
-- someone withdraw a review, so deletion is an admin action only.
drop policy if exists "authors may delete their own review" on public.reviews;

drop policy if exists "admins moderate reviews" on public.reviews;
create policy "admins moderate reviews" on public.reviews
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins delete reviews" on public.reviews;
create policy "admins delete reviews" on public.reviews
  for delete to authenticated using (public.is_admin());

-- wishlist: strictly your own rows
alter table public.wishlist_items enable row level security;

drop policy if exists "own wishlist" on public.wishlist_items;
create policy "own wishlist" on public.wishlist_items
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- coupons: no direct client access at all; validate_coupon() is the interface
alter table public.coupons enable row level security;

drop policy if exists "admins manage coupons" on public.coupons;
create policy "admins manage coupons" on public.coupons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime
--
-- Products, settings and reviews have to update on an already-open tab; a
-- visitor sitting on the shop page should not need a reload to see new stock.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  -- A missing publication would make ALTER PUBLICATION raise, and the error
  -- would abort the whole transaction including every table above it.
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;

  foreach t in array array['products', 'settings', 'reviews'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

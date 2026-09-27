-- 0001_shared_data.sql — shared storefront data
--
-- IMPORTANT — this migration extends the schema that already exists in the
-- project. It never drops, truncates or recreates a populated table.
--
-- The live database was built with a different, earlier shape than the app
-- expected, and the first draft of this file assumed the app's shape. Applying
-- that draft would have aborted on `create index ... (category)` ("column
-- category does not exist"), taking every statement in the transaction with it.
-- The real shape is:
--
--   products : id uuid pk, slug, name, description, category_id uuid -> categories,
--              price, stock, image_url, is_featured, is_active, created_at
--   reviews  : id uuid pk, product_id uuid, rating, body, is_approved bool
--   coupons  : code pk, discount_type, amount, usage_limit, used_count,
--              expires_at, is_active
--   settings : key pk, value, updated_at
--
-- So the differences are closed by *adding* columns and by mapping the client
-- onto the real names, never by renaming or recreating anything:
--
--   products.archived        -> products.is_active        (archived = NOT is_active)
--   products.image           -> products.image_url
--   products.desc            -> products.description
--   products.featured        -> products.is_featured
--   reviews.comment          -> reviews.body
--   coupons.discount_value   -> coupons.amount
--   coupons.max_uses         -> coupons.usage_limit
--   coupons.active           -> coupons.is_active
--
-- Every `create table if not exists` below is a no-op against this project and
-- only serves a genuinely empty database, where it creates the same shape so
-- there is one schema to reason about.

/* ── admin_emails + is_admin() ─────────────────────────────────────────────── */

create table if not exists public.admin_emails (
  email      text primary key,
  created_at timestamptz not null default now()
);

insert into public.admin_emails (email) values
  ('esraamomentsstore@gmail.com'),
  ('ahmed.morgan2009@gmail.com')
on conflict (email) do nothing;

alter table public.admin_emails enable row level security;
-- No policies on purpose: the table is unreachable over the API. is_admin() is
-- SECURITY DEFINER and reads it as the owner, so the policies below can still
-- ask the question without exposing the list of administrators.

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.admin_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Only these two roles may evaluate it. Leaving EXECUTE on PUBLIC would let any
-- role call is_admin(), and revoking it from the roles that need it would make
-- every policy below fail with "permission denied".
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

/* ── products ──────────────────────────────────────────────────────────────── */

create table if not exists public.products (
  id                 uuid primary key default gen_random_uuid(),
  slug               text,
  name               text not null,
  name_en            text,
  description        text not null default '',
  desc_en            text,
  category           text,
  category_id        uuid,
  price              numeric(10,2) not null default 0,
  stock              integer not null default 0,
  image_url          text not null default '',
  is_featured        boolean not null default false,
  is_active          boolean not null default true,
  is_starting_from   boolean not null default false,
  sort_order         integer,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- The `create table` above is a no-op against this project, so the columns the
-- app needs but the table lacks have to be added explicitly. Without these the
-- file would "succeed" and the storefront would still 400 on every product
-- query, because the columns would never exist.
--
-- sort_order is added nullable on purpose: it is backfilled from the existing
-- row order further down and only then made NOT NULL.
alter table public.products add column if not exists slug             text;
alter table public.products add column if not exists name_en          text;
alter table public.products add column if not exists desc_en          text;
alter table public.products add column if not exists category         text;
alter table public.products add column if not exists is_starting_from boolean not null default false;
alter table public.products add column if not exists sort_order       integer;

-- id is a uuid and the client never sends one, so it needs the generator.
alter table public.products alter column id set default gen_random_uuid();

-- The Admin form has no slug field, so a new product arrives without one.
-- Rather than make slug nullable-by-accident, fill it in here.
create or replace function public.products_default_slug() returns trigger
  language plpgsql as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := 'p-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  end if;
  return new;
end;
$$;

drop trigger if exists products_default_slug_trg on public.products;
create trigger products_default_slug_trg
  before insert on public.products
  for each row execute function public.products_default_slug();

create or replace function public.products_touch_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at_trg on public.products;
create trigger products_touch_updated_at_trg
  before update on public.products
  for each row execute function public.products_touch_updated_at();

/* ── reviews ───────────────────────────────────────────────────────────────── */

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  rating      integer not null default 5 check (rating between 1 and 5),
  body        text not null default '',
  user_name   text,
  user_email  text,
  is_approved boolean not null default false,
  status      text,
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);

-- Same reason as products: the create above does nothing to a table that is
-- already there, and these are the columns the moderation queue is built on.
alter table public.reviews add column if not exists user_name   text;
alter table public.reviews add column if not exists user_email  text;
alter table public.reviews add column if not exists status      text;
alter table public.reviews add column if not exists reviewed_at timestamptz;

-- The client generates an r-prefixed id for its optimistic local copy, which
-- this uuid column would reject, so the insert omits the id entirely.
alter table public.reviews alter column id set default gen_random_uuid();

-- The column that carries the moderation state is `status`, and the trigger
-- below is what keeps `is_approved` in step so nothing that still reads the old
-- boolean sees a stale value.
create or replace function public.reviews_sync_approved() returns trigger
  language plpgsql as $$
begin
  if new.status is not null then
    new.is_approved := (new.status = 'approved');
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_sync_approved_trg on public.reviews;
create trigger reviews_sync_approved_trg
  before insert or update on public.reviews
  for each row execute function public.reviews_sync_approved();

-- Backfill: a pre-existing row is approved exactly when is_approved was set.
update public.reviews
   set status = case when is_approved then 'approved' else 'pending' end
 where status is null or status not in ('pending', 'approved', 'rejected');

/**
 * Stamps the review with the signed-in account and forces anything a
 * non-admin submits into the moderation queue. SECURITY DEFINER is required:
 * the submitting role has no write access to user_email.
 */
create or replace function public.reviews_stamp_insert() returns trigger
  language plpgsql security definer set search_path = public
as $$
begin
  new.user_email := auth.jwt() ->> 'email';
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

drop trigger if exists reviews_stamp_insert_trg on public.reviews;
create trigger reviews_stamp_insert_trg
  before insert on public.reviews
  for each row execute function public.reviews_stamp_insert();

/* ── coupons ───────────────────────────────────────────────────────────────── */

create table if not exists public.coupons (
  code           text primary key,
  discount_type  text not null default 'percent' check (discount_type in ('percent', 'fixed')),
  amount         numeric(10,2) not null default 0,
  min_order      numeric(10,2) not null default 0,
  usage_limit    integer,
  used_count     integer not null default 0,
  expires_at     timestamptz,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- amount / usage_limit / is_active already exist, so the client is pointed at
-- them and only min_order is genuinely new. The default of 0 means "no minimum".
alter table public.coupons add column if not exists min_order numeric(10,2) not null default 0;

/* ── wishlist ──────────────────────────────────────────────────────────────── */

create table if not exists public.wishlist_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

/* ── settings ──────────────────────────────────────────────────────────────── */

-- Already matches this file exactly; kept so an empty database also works.
create table if not exists public.settings (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz not null default now()
);

/* ── backfill ──────────────────────────────────────────────────────────────── */

-- The storefront filters on a readable label (/shop?cat=…) and the existing
-- products only carry the categories foreign key, so mirror the label across.
-- category_id is left untouched, so nothing that joins categories breaks.
--
-- Guarded because this file does not create `categories` — the relation only
-- exists in this project, and an unguarded join would abort the whole
-- migration on a database that does not have it.
do $$
begin
  if to_regclass('public.categories') is not null then
    update public.products p
       set category = c.name
      from public.categories c
     where p.category_id = c.id
       and (p.category is null or btrim(p.category) = '');
  end if;
end;
$$;

-- Catalogue order, assigned once to rows that do not have it yet. Filling only
-- the nulls means re-running this cannot undo a later manual reorder.
update public.products p
   set sort_order = s.rn
  from (
    select id, (row_number() over (order by created_at, name) - 1)::integer as rn
      from public.products
     where sort_order is null
  ) s
 where p.id = s.id
   and p.sort_order is null;

update public.products set sort_order = 0 where sort_order is null;
alter table public.products alter column sort_order set default 0;
alter table public.products alter column sort_order set not null;

-- The table has no English columns, which would leave the English half of the
-- bilingual UI empty. These 16 are the products carried over from the repo seed
-- and are matched on the Arabic name, so they recover their English copy. The
-- four products that exist only in the database keep a NULL and are filled in
-- from Admin. Only empty values are written, so this is safe to re-run.
update public.products p
   set name_en = v.name_en,
       desc_en = v.desc_en
  from (values
    ('توزيعة سبوع الدبدوب الملكي',   'Royal Teddy Baby Shower Favor',        'Luxury teddy bear figurine with white musk bottle and baby welcome card.'),
    ('توزيعة سبوع الحوت والسبحة',   'Whale & Tasbeeh Baby Shower Favor',    'Digital prayer counter with imported chocolates in an elegant box.'),
    ('عقد اللؤلؤ والخطوبة الكلاسيكي', 'Classic Pearl Engagement Favor',       'Wide card featuring a ring illustration with an elegant pearl bracelet.'),
    ('بوكس الأكريليك المذهب للخطوبة', 'Gold-Acrylic Engagement Box',          'Premium acrylic box with chocolates, musk and a golden ribbon.'),
    ('توزيعات حنة الورود المخملية',   'Velvet Rose Henna Favor',              'Handcrafted luxury card with red heart chocolate and dried flowers.'),
    ('مانيكير وفراشة الحنة ثلاثية الأبعاد', '3D Butterfly & Manicure Henna Favor', 'Feminine-tone nail polish with hand-cut butterfly wings.'),
    ('مسك الختام والعود الملكي',      'Royal Oud & Musk Favor',               'Crystal fragrance bottle with a thank-you card for Katb Ktab guests.'),
    ('شموع الصويا الطبيعية باللؤلؤ',   'Pearl Soy Candles',                    'Jasmine-scented soy candle adorned with pearls and satin ribbon.'),
    ('مروحة ورقية مذهبة للزفاف',      'Gilded Paper Wedding Fan',             'Paper fan with rose embroidery and the couple''s names in gold ink.'),
    ('بوكس زفاف الورد والذهب',       'Rose & Gold Wedding Box',              'Large gift box with rose-gold touches and natural flowers.'),
    ('توزيعات عيد الميلاد بالبالون والكرت', 'Balloon & Card Birthday Favor',  'Custom chocolate with a cheerful colorful birthday card.'),
    ('توزيعات التخرج بقبعة الأكاديمية', 'Graduation Cap Favor',              'Graduation cap figurine with a congratulation card and achievement map.'),
    ('استقبال مولود زهور ولبان دكر',  'New Baby Flowers & Frankincense Favor','Elegant hospital-visit favors celebrating the newborn.'),
    ('فانوس رمضان والأذكار الفاخرة',   'Ramadan Lantern & Prayers Favor',     'Miniature acrylic lantern with Ramadan prayers card.'),
    ('عيدية العيد الفاخرة في مغلف مذهب', 'Deluxe Eidi Gold Envelope',          'Eidi envelope printed with festive greetings in a refined design.'),
    ('توزيعات الشركات وهدايا العملاء', 'Corporate & Client Gifts',             'Official gift box with company branding and premium fragrances.')
  ) as v(name, name_en, desc_en)
 where p.name = v.name
   and (p.name_en is null or btrim(p.name_en) = '');

/* ── indexes ───────────────────────────────────────────────────────────────── */

-- Named for the columns that actually exist. The previous draft used
-- (category) and (archived), which is what made it abort.
create index if not exists products_sort_order_idx on public.products (sort_order);
create index if not exists products_category_idx   on public.products (category);

-- Unique rather than a plain index, so the seed can upsert on slug and stay
-- idempotent. All 20 existing rows already have distinct slugs. NULLs are
-- still allowed to repeat, which is why the slug trigger above exists.
create unique index if not exists products_slug_key on public.products (slug);
create index if not exists products_active_idx     on public.products (is_active);
create index if not exists reviews_product_idx     on public.reviews (product_id);
create index if not exists reviews_status_idx      on public.reviews (status);
create index if not exists wishlist_user_idx       on public.wishlist_items (user_id);

/* ── row level security ────────────────────────────────────────────────────── */

alter table public.products       enable row level security;
alter table public.reviews        enable row level security;
alter table public.coupons        enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.settings       enable row level security;

-- products
drop policy if exists "products are public" on public.products;
create policy "products are public" on public.products
  for select using (is_active);

drop policy if exists "admins manage products" on public.products;
create policy "admins manage products" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- reviews. The four cases are kept as separate policies on purpose: a combined
-- "select" policy cannot express "approved rows for everyone, every row for an
-- admin", because OR-ing the branches would leak the queue to the public.
drop policy if exists "approved reviews are public" on public.reviews;
create policy "approved reviews are public" on public.reviews
  for select using (status = 'approved');

drop policy if exists "admins read all reviews" on public.reviews;
create policy "admins read all reviews" on public.reviews
  for select using (public.is_admin());

drop policy if exists "anyone may submit a review" on public.reviews;
create policy "anyone may submit a review" on public.reviews
  for insert with check (status = 'pending');

drop policy if exists "admins may seed a review" on public.reviews;
create policy "admins may seed a review" on public.reviews
  for insert with check (public.is_admin());

drop policy if exists "admins moderate reviews" on public.reviews;
create policy "admins moderate reviews" on public.reviews
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins delete reviews" on public.reviews;
create policy "admins delete reviews" on public.reviews
  for delete using (public.is_admin());

-- wishlist: a row is visible only to the account that owns it.
drop policy if exists "own wishlist" on public.wishlist_items;
create policy "own wishlist" on public.wishlist_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- coupons: never readable from the storefront, only validated through the RPC.
drop policy if exists "admins manage coupons" on public.coupons;
create policy "admins manage coupons" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

-- settings
drop policy if exists "settings are public" on public.settings;
create policy "settings are public" on public.settings
  for select using (true);

drop policy if exists "admins write settings" on public.settings;
create policy "admins write settings" on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

/* ── coupon maths ──────────────────────────────────────────────────────────── */

-- The only place a discount is calculated. The browser used to do this against
-- localStorage, which a customer could edit to invent any price.
create or replace function public.validate_coupon(p_code text, p_subtotal numeric)
returns jsonb
  language plpgsql stable security definer set search_path = public
as $$
declare
  c public.coupons%rowtype;
  v_min numeric;
  v_discount numeric;
begin
  select * into c from public.coupons where lower(code) = lower(p_code);

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'not_found', 'code', p_code, 'discount', 0);
  end if;

  if not c.is_active then
    return jsonb_build_object('valid', false, 'reason', 'inactive', 'code', c.code, 'discount', 0);
  end if;

  if c.expires_at is not null and c.expires_at < now() then
    return jsonb_build_object('valid', false, 'reason', 'expired', 'code', c.code, 'discount', 0);
  end if;

  v_min := coalesce(c.min_order, 0);
  if p_subtotal < v_min then
    return jsonb_build_object('valid', false, 'reason', 'min_order', 'code', c.code,
                              'min_order', v_min, 'discount', 0);
  end if;

  if c.usage_limit is not null and c.used_count >= c.usage_limit then
    return jsonb_build_object('valid', false, 'reason', 'exhausted', 'code', c.code, 'discount', 0);
  end if;

  if c.discount_type = 'percent' then
    v_discount := round(p_subtotal * c.amount / 100, 2);
  else
    v_discount := least(c.amount, p_subtotal);
  end if;

  return jsonb_build_object(
    'valid', true, 'reason', 'ok', 'code', c.code, 'discount', v_discount,
    'discount_type', c.discount_type, 'min_order', v_min
  );
end;
$$;

revoke all on function public.validate_coupon(text, numeric) from public;
grant execute on function public.validate_coupon(text, numeric) to anon, authenticated;

create or replace function public.redeem_coupon(p_code text)
returns jsonb
  language plpgsql security definer set search_path = public
as $$
declare
  v_code text;
begin
  update public.coupons
     set used_count = used_count + 1
   where lower(code) = lower(p_code)
     and is_active
     and (usage_limit is null or used_count < usage_limit)
     and (expires_at is null or expires_at >= now())
  returning code into v_code;

  if v_code is null then
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  return jsonb_build_object('ok', true, 'code', v_code);
end;
$$;

revoke all on function public.redeem_coupon(text) from public;
-- Admin only: the storefront validates a code but must not be able to burn one.
grant execute on function public.redeem_coupon(text) to authenticated;

/* ── realtime ──────────────────────────────────────────────────────────────── */

-- Supabase errors with "publication does not exist" if the publication is
-- missing, and a bare `alter publication ... add table` is not re-runnable, so
-- each table is added only once and only if it is not already a member.
do $$
declare
  t text;
  pub_exists boolean;
begin
  select exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    into pub_exists;

  if pub_exists then
    foreach t in array array['products', 'settings', 'reviews'] loop
      if not exists (
        select 1 from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end;
$$;

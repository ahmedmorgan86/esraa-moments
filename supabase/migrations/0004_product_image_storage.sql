-- 0004_product_image_storage.sql
--
-- Storage for product images, so the admin panel can upload and replace a
-- picture instead of pasting a URL by hand.
--
-- Before this, products.image_url was only ever a string. The admin form had a
-- text box, which meant every picture either had to live somewhere public and be
-- pasted in, or it was a hand-typed path that breaks silently.
--
-- Design notes:
--
-- * The bucket is public. Product pictures are the storefront, so every visitor
--   has to be able to fetch them without an account. That is the same exposure
--   the old /images/*.jpeg files already had.
-- * Writes are gated on public.is_admin(), the same gate as
--   products_admin_write. Whoever can edit a product row can edit its picture;
--   nobody else can upload, overwrite or delete an object. Matching the product
--   policy is deliberate: a separate storage gate would let someone delete a
--   product's image while leaving the row pointing at it.
-- * Objects are addressed by an opaque random name, never the slug. Slugs
--   change when a product is renamed, and a path built from them would leave
--   orphaned files behind on every rename.
-- * 5 MB and an explicit MIME allowlist. The old images are large AI-generated
--   JPEGs, so the cap is set above the current largest file rather than at a
--   typical web-image size.
--
-- Nothing here drops data. Every statement is idempotent.

/* ── bucket ────────────────────────────────────────────────────────────────────
 *
 * public = true so the public-image endpoint serves objects without a session.
 * updated on conflict so re-running repairs a bucket whose settings drifted.
 */
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
   set public              = excluded.public,
       file_size_limit     = excluded.file_size_limit,
       allowed_mime_types  = excluded.allowed_mime_types;

/* ── storage.buckets has to be readable, or nothing above works ────────────────
 *
 * storage.buckets has RLS enabled on this project but carried no policies at
 * all, so it selected zero rows for every request. The Storage API resolves a
 * bucket by name before it does anything else, so every call against this
 * bucket failed with "Bucket not found" even though the row was present and
 * public. Object policies cannot fix that: they are only evaluated once the
 * bucket has been found.
 *
 * Scoped to public buckets rather than using (true) the way the platform
 * default does. This project has one bucket and it is public, so nothing here
 * needs the wider grant, and it keeps private bucket names from being
 * enumerable by an anonymous caller. If a private bucket is ever added, widen
 * this deliberately then, rather than discovering the failure at upload time.
 */
drop policy if exists "public buckets are readable" on storage.buckets;

create policy "public buckets are readable"
  on storage.buckets for select
  to anon, authenticated
  using (public);

/* ── policies ─────────────────────────────────────────────────────────────────
 *
 * Dropped first: create policy has no or-replace form, and this file is meant to
 * be safe to re-run.
 *
 * The legacy names were dropped too. This bucket and an equivalent set of
 * policies already existed in the live database, created outside version control
 * on 2026-08-23, so without this the file would leave two overlapping copies of
 * every policy behind. The legacy predicates were byte-for-byte equivalent apart
 * from UPDATE, which omitted WITH CHECK and therefore inherited USING; dropping
 * them changes nothing except that the live database ends up matching this file.
 */
drop policy if exists "product images are public"    on storage.objects;
drop policy if exists "admins upload product images" on storage.objects;
drop policy if exists "admins update product images" on storage.objects;
drop policy if exists "admins delete product images" on storage.objects;

drop policy if exists "product images public read"   on storage.objects;
drop policy if exists "product images admin upload"  on storage.objects;
drop policy if exists "product images admin update"  on storage.objects;
drop policy if exists "product images admin delete"  on storage.objects;

-- Anyone may read a product picture. This is the storefront.
create policy "product images are public"
  on storage.objects for select
  using (bucket_id = 'product-images');
-- Admin writes. is_admin() is security definer, so it reads user_roles and
-- admin_emails without recursing through their own policies.
create policy "admins upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "admins update product images"
  on storage.objects for update
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "admins delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin());

import { supabase, isSupabaseConfigured } from './supabase';
import type { Product, Coupon, Review } from '../data';

/* ──────────────────────────────────────────────────────────────────────────────
 * Shared store data.
 *
 * Every read tries Supabase and falls back to the visitor's localStorage copy,
 * so the storefront keeps working if the network or the table is unavailable.
 * Admin writes go to Supabase first and fall back to localStorage, reporting
 * which one actually took via the boolean they return.
 *
 * The migration for all of this is supabase/migrations/0001_shared_data.sql.
 * ──────────────────────────────────────────────────────────────────────────── */

export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type ReviewRow = Review & { status: ReviewStatus; user_email?: string | null };

export type CouponCheck =
  | { valid: true; discount: number; reason: 'ok'; code: string; discount_type: 'percent' | 'fixed'; min_order: number }
  | { valid: false; discount: 0; reason: string; code: string | null; discount_type: string | null; min_order?: number };

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export function writeLocal(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota / private mode */ }
}

/* ── products ─────────────────────────────────────────────────────────────── */

/**
 * The live `products` table predates this file and uses different column names
 * than the app's Product type. The mapping is confined to these two functions
 * so the rest of the app never has to know:
 *
 *   archived -> is_active (inverted)   image  -> image_url
 *   desc     -> description            featured -> is_featured
 *
 * `id` is the table's uuid and is the app's Product.id, which is also what
 * /product/:id routes on and what reviews.product_id and wishlist_items
 * .product_id store.
 */
type ProductRow = {
  id: string; slug: string | null; name: string; name_en: string | null;
  description: string; desc_en: string | null; category: string | null;
  category_id: string | null; price: number | string; stock: number;
  image_url: string; is_featured: boolean; is_active: boolean;
  is_starting_from: boolean; sort_order: number;
};

/** The column list both product readers use, so the two cannot drift apart. */
const PRODUCT_COLUMNS =
  'id,slug,name,name_en,description,desc_en,category,price,stock,image_url,is_featured,is_active,is_starting_from,sort_order';

function toProduct(r: ProductRow): Product {
  return {
    id: r.id,
    name: r.name,
    name_en: r.name_en ?? undefined,
    // Empty rather than undefined: Shop filters on this string, and a
    // null category would not match any filter.
    category: r.category ?? '',
    price: Number(r.price),
    stock: Number(r.stock),
    image: r.image_url ?? '',
    desc: r.description,
    desc_en: r.desc_en ?? undefined,
    featured: r.is_featured,
    isStartingFrom: r.is_starting_from,
    // Carried through so Admin can show and restore archived rows. Dropping it
    // here would make an archived product indistinguishable from a live one.
    archived: !r.is_active,
  };
}

type ProductInsert = {
  slug?: string;
  name: string;
  name_en: string | null;
  description: string;
  desc_en: string | null;
  category: string;
  price: number;
  stock: number;
  image_url: string;
  is_featured: boolean;
  is_starting_from: boolean;
  sort_order: number;
  is_active: boolean;
};

function fromProduct(p: Product, sortOrder = 0): ProductInsert {
  return {
    name: p.name,
    name_en: p.name_en ?? null,
    description: p.desc,
    desc_en: p.desc_en ?? null,
    category: p.category,
    price: p.price,
    stock: p.stock,
    image_url: p.image,
    is_featured: Boolean(p.featured),
    is_starting_from: Boolean(p.isStartingFrom),
    sort_order: sortOrder,
    // Preserve the current state instead of forcing true: Admin edits an
    // existing product through this same function, and hardcoding the live
    // value would silently publish a product the Admin had archived.
    is_active: !p.archived,
  };
}

/** Ordered list for the storefront. */
export async function fetchProducts(): Promise<Product[] | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  if (error) return null;
  return (data as ProductRow[] | null)?.map(toProduct) ?? null;
}

/** Admin view, including archived rows. */
export async function fetchProductsAdmin(): Promise<Product[] | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  if (error) return null;
  return (data as ProductRow[] | null)?.map(toProduct) ?? null;
}

/**
 * First run only: the repo's seed catalogue is pushed so the store has something
 * to sell. Keyed on the unique slug, so it is a no-op on a catalogue that is
 * already populated.
 *
 * It deliberately does not decide "is the table empty" by counting rows. The
 * count is taken through the select policy, which hides archived products, so
 * "every product archived" is indistinguishable from "empty" and a count-gated
 * seed would quietly re-publish the whole starter catalogue. Upserting on slug
 * with ignoreDuplicates cannot do that: a product that is already there is left
 * exactly as the Admin left it, archived or not.
 */
export async function seedProductsIfEmpty(seed: Product[]): Promise<boolean> {
  if (!isSupabaseConfigured || !seed.length) return false;
  const rows = seed.map((p, i) => ({ ...fromProduct(p, i), slug: p.id }));
  const { error } = await supabase
    .from('products')
    .upsert(rows, { onConflict: 'slug', ignoreDuplicates: true });
  return !error;
}

/** New products land at the end of the list instead of jumping to the front. */
export async function createProduct(p: Product): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data: last } = await supabase
    .from('products')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);
  const nextOrder = Number((last?.[0] as { sort_order?: number } | undefined)?.sort_order ?? 0) + 1;
  // No id: the column is a uuid and the database assigns it.
  const { error } = await supabase.from('products').insert(fromProduct(p, nextOrder));
  return !error;
}

/**
 * Only the columns the product form owns. sort_order and is_active are managed
 * elsewhere, so a full-row upsert here would reset the catalogue ordering and
 * republish anything the Admin had archived on every single save.
 */
export async function updateProduct(p: Product): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase
    .from('products')
    .update({
      name: p.name,
      name_en: p.name_en ?? null,
      description: p.desc,
      desc_en: p.desc_en ?? null,
      category: p.category,
      price: p.price,
      stock: p.stock,
      image_url: p.image,
      is_featured: Boolean(p.featured),
      is_starting_from: Boolean(p.isStartingFrom),
    })
    .eq('id', p.id);
  return !error;
}

export async function archiveProduct(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id);
  return !error;
}

export async function restoreProduct(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from('products').update({ is_active: true }).eq('id', id);
  return !error;
}

/* ── product images ──────────────────────────────────────────────────────────
 *
 * The admin form used to take a pasted URL, so every picture either had to live
 * somewhere public already or the admin typed a path that broke silently.
 * Pictures now go into the product-images bucket, created in migration 0004.
 *
 * Object names are random rather than derived from the slug. Slugs change when a
 * product is renamed, and a path built from the slug would strand the old file
 * on every rename.
 */

export const PRODUCT_IMAGE_BUCKET = 'product-images';

/** Kept in step with allowed_mime_types and file_size_limit in migration 0004.
 *  Checked here too, because the client gets a clearer message than the 400 the
 *  Storage API would return. */
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type ProductImageResult =
  | { ok: true; url: string; path: string }
  | { ok: false; reason: 'unconfigured' | 'bad-type' | 'too-large' | 'error'; message?: string };

const IMAGE_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

/** The public URL prefix for this bucket, used to recognise our own objects.
 *  getPublicUrl returns base + path, so an empty path gives the bare prefix and
 *  slicing exactly its length recovers the object name. */
function productImagePrefix(): string {
  return supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl('').data.publicUrl;
}

/** True when the URL points at an object this app uploaded, as opposed to a
 *  hand-typed /images/... path from the original catalogue. */
export function isUploadedProductImage(url: string): boolean {
  if (!url) return false;
  return url.startsWith(productImagePrefix());
}

export async function uploadProductImage(file: File): Promise<ProductImageResult> {
  if (!isSupabaseConfigured) return { ok: false, reason: 'unconfigured' };
  if (!IMAGE_MIME_TYPES.includes(file.type)) return { ok: false, reason: 'bad-type' };
  if (file.size > IMAGE_MAX_BYTES) return { ok: false, reason: 'too-large' };

  const ext = IMAGE_EXTENSION[file.type] || 'jpg';
  const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false,
  });
  if (error) return { ok: false, reason: 'error', message: error.message };

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl, path };
}

/**
 * Removes an object we uploaded. Refuses anything else on purpose: the original
 * 20 products point at /images/*.jpeg, which are static files and not storage
 * objects, and a delete built from a guessed name could take out a picture
 * another product is still using.
 */
export async function deleteProductImage(url: string): Promise<boolean> {
  if (!isSupabaseConfigured || !isUploadedProductImage(url)) return false;
  const path = url.slice(productImagePrefix().length);
  if (!path) return false;
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
  return !error;
}

/* ── settings (store details, appearance, CMS content) ────────────────────── */

export async function fetchSetting<T>(key: string): Promise<T | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.from('settings').select('value').eq('key', key).maybeSingle();
  if (error || !data) return null;
  return (data.value as T) ?? null;
}

export async function saveSetting(key: string, value: unknown): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  return !error;
}

export function subscribeToSetting(key: string, onChange: () => void): () => void {
  if (!isSupabaseConfigured) return () => {};
  const ch = supabase
    .channel(`setting:${key}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: `key=eq.${key}` }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(ch); };
}

export function subscribeToProducts(onChange: () => void): () => void {
  if (!isSupabaseConfigured) return () => {};
  const ch = supabase
    .channel('products')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(ch); };
}

/* ── reviews ──────────────────────────────────────────────────────────────── */

/** The review text lives in `body`; the moderation state lives in `status`. */
const REVIEW_COLUMNS = 'id,product_id,user_name,author_name,rating,body,created_at,status';

function toReview(r: Record<string, unknown>): ReviewRow {
  return {
    id: String(r.id),
    productId: String(r.product_id),
    // author_name is the column the table requires; user_name is the mirror the
    // trigger keeps in step. Prefer the original, fall back to the mirror.
    userName: String(r.author_name ?? r.user_name ?? ''),
    rating: Number(r.rating),
    comment: String(r.body ?? ''),
    date: String(r.created_at),
    status: (r.status as ReviewStatus) ?? 'approved',
    user_email: (r.user_email as string | null) ?? null,
  };
}

/** Approved reviews only — the RLS policy hides everything else from the public. */
export async function fetchApprovedReviews(): Promise<ReviewRow[] | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return null;
  return ((data as Record<string, unknown>[] | null) ?? []).map(toReview);
}

/** Admin moderation queue. */
export async function fetchReviewsAdmin(): Promise<ReviewRow[] | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('reviews')
    .select(`${REVIEW_COLUMNS},user_email`)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) return null;
  return ((data as Record<string, unknown>[] | null) ?? []).map(toReview);
}

/**
 * Submits a review. It always lands as 'pending' — the table trigger and the
 * insert policy both enforce that, so this cannot be bypassed from the client.
 * Resolves to false when Supabase is unavailable, in which case the caller
 * keeps the optimistic local copy.
 */
export async function submitReview(r: Review): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from('reviews').insert({
    // No id: the column is a uuid. The client generates an r-prefixed string
    // for its optimistic local copy, which the database would reject outright.
    product_id: r.productId,
    // author_name is NOT NULL on the existing table. Sending only user_name
    // failed with 23502 and the review was never stored.
    author_name: r.userName,
    rating: r.rating,
    body: r.comment,
    status: 'pending',
  });
  return !error;
}

export async function moderateReview(id: string, status: ReviewStatus): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase
    .from('reviews')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

export async function deleteReview(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from('reviews').delete().eq('id', id);
  return !error;
}

export function subscribeToReviews(onChange: () => void): () => void {
  if (!isSupabaseConfigured) return () => {};
  const ch = supabase
    .channel('reviews')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(ch); };
}

/* ── wishlist ─────────────────────────────────────────────────────────────── */

/** null means "no remote wishlist for this account" — the guest list stands. */
export async function fetchWishlist(userId: string): Promise<string[] | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('product_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return null;
  return ((data as { product_id: string }[] | null) ?? []).map(r => r.product_id);
}

export async function mergeWishlist(userId: string, ids: string[]): Promise<string[] | null> {
  if (!isSupabaseConfigured) return null;
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return fetchWishlist(userId);
  const { error } = await supabase
    .from('wishlist_items')
    .upsert(unique.map(product_id => ({ user_id: userId, product_id })), { onConflict: 'user_id,product_id', ignoreDuplicates: true });
  if (error) return fetchWishlist(userId);
  return unique;
}

/**
 * Single-row add for one toggle. Doing this as a full replace — delete every
 * row, then re-insert the whole list — means two quick clicks can interleave so
 * the second delete drops what the first insert wrote.
 */
export async function addWishlistItem(userId: string, productId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase
    .from('wishlist_items')
    .upsert({ user_id: userId, product_id: productId }, { onConflict: 'user_id,product_id', ignoreDuplicates: true });
  return !error;
}

export async function removeWishlistItem(userId: string, productId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase
    .from('wishlist_items')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);
  return !error;
}

/* ── coupons ──────────────────────────────────────────────────────────────── */

type CouponRow = {
  code: string; discount_type: 'percent' | 'fixed'; amount: number | string;
  min_order: number | string | null; usage_limit: number | null;
  used_count: number; expires_at: string | null; is_active: boolean;
};

function toCoupon(r: CouponRow): Coupon {
  return {
    id: r.code,
    code: r.code,
    discountType: r.discount_type,
    // amount / usage_limit / is_active are the columns the table actually has.
    discountValue: Number(r.amount),
    // The one genuinely new column; 0 means "no minimum".
    minOrder: Number(r.min_order ?? 0),
    maxUses: r.usage_limit ?? 0,
    usedCount: r.used_count,
    expiresAt: r.expires_at ?? '',
    active: r.is_active,
  };
}

/**
 * Admin only, enforced by RLS through is_admin(). The storefront never reads
 * this table — it validates a code through the validate_coupon RPC, which is
 * SECURITY DEFINER and so is unaffected by the table's policies.
 */
export async function fetchCoupons(): Promise<Coupon[] | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('coupons')
    .select('code,discount_type,amount,min_order,usage_limit,used_count,expires_at,is_active')
    .order('code', { ascending: true });
  if (error) return null;
  return ((data as CouponRow[] | null) ?? []).map(toCoupon);
}

export async function saveCoupon(c: Coupon): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from('coupons').upsert({
    // trim + upper: the table pins the format with a CHECK constraint, and
    // UNIQUE(code) only behaves case-insensitively while codes stay uppercase.
    code: c.code.trim().toUpperCase(),
    discount_type: c.discountType,
    amount: c.discountValue,
    min_order: c.minOrder,
    usage_limit: c.maxUses > 0 ? c.maxUses : null,
    expires_at: c.expiresAt ? new Date(c.expiresAt).toISOString() : null,
    is_active: c.active,
    // used_count is deliberately not written. It is a server-side counter that
    // redeem_coupon() increments, and the Admin form echoes back whatever it
    // last read, so saving it would undo redemptions made since that read.
  }, { onConflict: 'code' });
  return !error;
}

export async function deleteCoupon(code: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from('coupons').delete().eq('code', code.trim().toUpperCase());
  return !error;
}

/**
 * The discount is computed in Postgres, never in the browser. A null return
 * means the check could not run at all, which the UI must treat as "unknown"
 * rather than as a valid discount.
 */
export async function validateCouponRemote(code: string, subtotal: number): Promise<CouponCheck | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('validate_coupon', {
    p_code: code,
    p_subtotal: subtotal,
  });
  if (error || !data) return null;
  return data as CouponCheck;
}

/** Admin only. Increments the use counter; never called from the storefront. */
export async function redeemCoupon(code: string): Promise<{ ok: boolean; reason?: string } | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('redeem_coupon', { p_code: code });
  if (error || !data) return null;
  return data as { ok: boolean; reason?: string };
}

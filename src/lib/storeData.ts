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

type ProductRow = {
  id: string; name: string; name_en: string | null; category: string;
  price: number | string; stock: number; image: string; desc: string; desc_en: string | null;
  featured: boolean; is_starting_from: boolean; sort_order: number; archived: boolean;
};

function toProduct(r: ProductRow): Product {
  return {
    id: r.id,
    name: r.name,
    name_en: r.name_en ?? undefined,
    category: r.category,
    price: Number(r.price),
    stock: Number(r.stock),
    image: r.image,
    desc: r.desc,
    desc_en: r.desc_en ?? undefined,
    featured: r.featured,
    isStartingFrom: r.is_starting_from,
    // Carried through so Admin can show and restore archived rows. Dropping it
    // here would make an archived product indistinguishable from a live one.
    archived: r.archived,
  };
}

function fromProduct(p: Product, sortOrder = 0): ProductRow {
  return {
    id: p.id,
    name: p.name,
    name_en: p.name_en ?? null,
    category: p.category,
    price: p.price,
    stock: p.stock,
    image: p.image,
    desc: p.desc,
    desc_en: p.desc_en ?? null,
    featured: Boolean(p.featured),
    is_starting_from: Boolean(p.isStartingFrom),
    sort_order: sortOrder,
    // Preserve the current state instead of forcing false: Admin edits an
    // existing product through this same function, and hardcoding false would
    // silently publish a product the Admin had archived.
    archived: Boolean(p.archived),
  };
}

/** Ordered list for the storefront. */
export async function fetchProducts(): Promise<Product[] | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('products')
    .select('id,name,name_en,category,price,stock,image,desc,desc_en,featured,is_starting_from,sort_order,archived')
    .eq('archived', false)
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
    .select('id,name,name_en,category,price,stock,image,desc,desc_en,featured,is_starting_from,sort_order,archived')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  if (error) return null;
  return (data as ProductRow[] | null)?.map(toProduct) ?? null;
}

/**
 * First run only: the repo's seed catalogue is pushed to an empty table so the
 * store has something to sell.
 *
 * Plain insert, not upsert. An upsert here would resurrect the starter catalogue
 * if the Admin ever archived every product — the count is taken through the
 * `archived = false` select policy, so "all archived" is indistinguishable from
 * "empty" and would quietly un-archive rows the Admin had deliberately hidden.
 * A PK conflict is treated as "already seeded", which is the safe answer.
 */
export async function seedProductsIfEmpty(seed: Product[]): Promise<boolean> {
  if (!isSupabaseConfigured || !seed.length) return false;
  const { count, error } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true });
  if (error) return false;
  if ((count ?? 0) > 0) return false;

  const rows = seed.map((p, i) => fromProduct(p, i));
  const { error: insErr } = await supabase.from('products').insert(rows);
  return !insErr;
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
  const { error } = await supabase.from('products').insert(fromProduct(p, nextOrder));
  return !error;
}

/**
 * Only the columns the product form owns. sort_order and archived are managed
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
      category: p.category,
      price: p.price,
      stock: p.stock,
      image: p.image,
      desc: p.desc,
      desc_en: p.desc_en ?? null,
      featured: Boolean(p.featured),
      is_starting_from: Boolean(p.isStartingFrom),
    })
    .eq('id', p.id);
  return !error;
}

export async function archiveProduct(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from('products').update({ archived: true }).eq('id', id);
  return !error;
}

export async function restoreProduct(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from('products').update({ archived: false }).eq('id', id);
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

function toReview(r: Record<string, unknown>): ReviewRow {
  return {
    id: String(r.id),
    productId: String(r.product_id),
    userName: String(r.user_name),
    rating: Number(r.rating),
    comment: String(r.comment),
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
    .select('id,product_id,user_name,rating,comment,created_at,status')
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
    .select('id,product_id,user_name,rating,comment,created_at,status,user_email')
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
    id: r.id,
    product_id: r.productId,
    user_name: r.userName,
    rating: r.rating,
    comment: r.comment,
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
  code: string; discount_type: 'percent' | 'fixed'; discount_value: number | string;
  min_order: number | string; max_uses: number; used_count: number;
  expires_at: string | null; active: boolean;
};

function toCoupon(r: CouponRow): Coupon {
  return {
    id: r.code,
    code: r.code,
    discountType: r.discount_type,
    discountValue: Number(r.discount_value),
    minOrder: Number(r.min_order),
    maxUses: r.max_uses,
    usedCount: r.used_count,
    expiresAt: r.expires_at ?? '',
    active: r.active,
  };
}

/** Admin only — the storefront has no direct read access to coupons. */
export async function fetchCoupons(): Promise<Coupon[] | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('coupons')
    .select('code,discount_type,discount_value,min_order,max_uses,used_count,expires_at,active')
    .order('code', { ascending: true });
  if (error) return null;
  return ((data as CouponRow[] | null) ?? []).map(toCoupon);
}

export async function saveCoupon(c: Coupon): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from('coupons').upsert({
    code: c.code.toUpperCase(),
    discount_type: c.discountType,
    discount_value: c.discountValue,
    min_order: c.minOrder,
    max_uses: c.maxUses,
    used_count: c.usedCount,
    expires_at: c.expiresAt ? new Date(c.expiresAt).toISOString() : null,
    active: c.active,
  }, { onConflict: 'code' });
  return !error;
}

export async function deleteCoupon(code: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from('coupons').delete().eq('code', code.toUpperCase());
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

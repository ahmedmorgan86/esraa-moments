import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import { seed, type Product, type Review } from './data';
import {
  fetchProducts, seedProductsIfEmpty, fetchApprovedReviews, submitReview,
  fetchSetting, saveSetting, mergeWishlist, addWishlistItem, removeWishlistItem,
  subscribeToProducts, subscribeToReviews, subscribeToSetting,
  readLocal, writeLocal, type ReviewRow,
} from './lib/storeData';
import { supabase, isSupabaseConfigured } from './lib/supabase';

export function readJSON<T>(key: string, fallback: T): T {
  return readLocal(key, fallback);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * products
 * ═════════════════════════════════════════════════════════════════════════ */

export function useProducts(): [Product[], React.Dispatch<React.SetStateAction<Product[]>>] {
  // Paint from the local cache immediately, then reconcile with Supabase.
  const [products, setProducts] = useState<Product[]>(() => readJSON<Product[]>('em-products', seed));

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;
    (async () => {
      let remote = await fetchProducts();
      if (remote && remote.length === 0 && !readJSON('em-seeded', false)) {
        if (await seedProductsIfEmpty(seed)) writeLocal('em-seeded', true);
        remote = await fetchProducts();
      }
      if (!alive || !remote) return;
      setProducts(remote);
      writeLocal('em-products', remote);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    // Stock and prices change while someone is reading the shop page.
    return subscribeToProducts(() => { void fetchProducts().then(p => { if (p) { setProducts(p); writeLocal('em-products', p); } }); });
  }, []);

  return [products, setProducts];
}

/* ═══════════════════════════════════════════════════════════════════════════
 * localStorage
 * ═════════════════════════════════════════════════════════════════════════ */

export function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) as T : initial; }
    catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

export function useScrollShadow(threshold = 10) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, [threshold]);
  return scrolled;
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    m.addEventListener('change', handler);
    return () => m.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * wishlist — local for guests, synced once there is a session
 * ═════════════════════════════════════════════════════════════════════════ */

export function useWishlist(): [string[], (id: string) => void] {
  const [wishlist, setWishlist] = useState<string[]>(() => readJSON<string[]>('em-wishlist', []));
  // Which account the remote list belongs to. Kept in a ref so the toggle can
  // write the right row without re-subscribing or re-fetching the session.
  const userId = useRef<string | null>(null);

  // Merge the guest list into the account exactly once per sign-in, then keep
  // the two in step. A guest who never signs in keeps localStorage as before.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;

    const merge = async (id: string) => {
      userId.current = id;
      const local = readJSON<string[]>('em-wishlist', []);
      const union = await mergeWishlist(id, local);
      if (!alive || !union) return;
      setWishlist(union);
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user && alive) void merge(data.session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // TOKEN_REFRESHED fires every ~hour and must not rewrite the table.
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
          if (userId.current !== session.user.id) void merge(session.user.id);
        }
      } else {
        // Signed out: drop back to the local list, which is what a guest sees.
        userId.current = null;
      }
    });

    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    writeLocal('em-wishlist', wishlist);
  }, [wishlist]);

  // Single-row write per click. Re-sending the whole list would delete and
  // re-insert every row, and two quick toggles could interleave so the second
  // delete drops what the first insert wrote.
  const toggle = useCallback((id: string) => {
    setWishlist(prev => {
      const has = prev.includes(id);
      const uid = userId.current;
      if (uid) void (has ? removeWishlistItem(uid, id) : addWishlistItem(uid, id));
      return has ? prev.filter(x => x !== id) : [...prev, id];
    });
  }, []);

  return [wishlist, toggle];
}

/* ═══════════════════════════════════════════════════════════════════════════
 * reviews — moderated, so the public list only ever contains approved rows
 * ═════════════════════════════════════════════════════════════════════════ */

export type ReviewSubmitResult = { queued: boolean; shared: boolean };

export function useReviews(): [ReviewRow[], (review: Review) => Promise<ReviewSubmitResult>] {
  const [reviews, setReviews] = useState<ReviewRow[]>(() => readJSON<ReviewRow[]>('em-reviews', []));

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;
    void (async () => {
      const remote = await fetchApprovedReviews();
      if (!alive || !remote) return;
      setReviews(remote);
      writeLocal('em-reviews', remote);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    return subscribeToReviews(() => {
      void fetchApprovedReviews().then(r => { if (r) { setReviews(r); writeLocal('em-reviews', r); } });
    });
  }, []);

  /**
   * Resolves once the review is stored. With Supabase available it lands in the
   * moderation queue and is deliberately NOT appended to the visible list —
   * otherwise a visitor could see their own review before it was approved, and
   * the local cache would keep showing it.
   */
  const addReview = useCallback(async (review: Review): Promise<ReviewSubmitResult> => {
    const shared = await submitReview(review);
    if (!shared) {
      // Offline / table missing: keep the old local behaviour so the visitor is
      // not silently ignored, but the review will not reach other devices.
      setReviews(prev => {
        const next = [...prev, { ...review, status: 'pending' as const }];
        writeLocal('em-reviews', next);
        return next;
      });
    }
    return { queued: true, shared };
  }, []);

  return [reviews, addReview];
}

/* ═══════════════════════════════════════════════════════════════════════════
 * store settings
 * ═════════════════════════════════════════════════════════════════════════ */

export interface StoreSettings {
  name: string;
  whatsapp: string;
  email: string;
  address: string;
  shippingThreshold: string;
  shippingFee: string;
}

export const STORE_SETTINGS_DEFAULTS: StoreSettings = {
  name: 'ESRAA Moments',
  whatsapp: '201097905435',
  email: 'esraamomentsstore@gmail.com',
  address: 'شارع الجيش - عزبة النخل',
  shippingThreshold: '500',
  shippingFee: '60',
};

const SETTINGS_KEYS = {
  name: 'em-store-name',
  whatsapp: 'em-store-whatsapp',
  email: 'em-store-email',
  address: 'em-store-address',
  shippingThreshold: 'em-shipping-threshold',
  shippingFee: 'em-shipping-fee',
} as const satisfies Record<keyof StoreSettings, string>;

export const STORE_SETTING_KEY = 'store';

let settingsVersion = 0;
const settingsListeners = new Set<() => void>();

/** Values fetched from Supabase. These win over the local cache so that an
 *  Admin change reaches a visitor who has an outdated localStorage copy. */
let remoteSettings: Partial<StoreSettings> = {};

function emitSettingsChange() {
  settingsVersion += 1;
  settingsListeners.forEach(l => l());
}

function subscribeSettings(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key in SETTINGS_KEYS) onChange();
  };
  settingsListeners.add(onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    settingsListeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

function getSettingsVersion() {
  return settingsVersion;
}

function readStoreSettings(): StoreSettings {
  const read = (k: keyof StoreSettings, fallback: string) => {
    const v = remoteSettings[k] ?? (() => {
      try { return localStorage.getItem(SETTINGS_KEYS[k])?.trim() || fallback; }
      catch { return fallback; }
    })();
    return v || fallback;
  };
  return {
    name: read('name', STORE_SETTINGS_DEFAULTS.name),
    whatsapp: read('whatsapp', STORE_SETTINGS_DEFAULTS.whatsapp).replace(/\D/g, ''),
    email: read('email', STORE_SETTINGS_DEFAULTS.email),
    address: read('address', STORE_SETTINGS_DEFAULTS.address),
    shippingThreshold: read('shippingThreshold', STORE_SETTINGS_DEFAULTS.shippingThreshold),
    shippingFee: read('shippingFee', STORE_SETTINGS_DEFAULTS.shippingFee),
  };
}

function coerceSettings(raw: unknown): Partial<StoreSettings> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const r = raw as Record<string, unknown>;
  const out: Partial<StoreSettings> = {};
  (Object.keys(SETTINGS_KEYS) as (keyof StoreSettings)[]).forEach(k => {
    const v = r[k];
    if (typeof v === 'string' && v.trim()) out[k] = v.trim();
  });
  return out;
}

/** Adopt the shared copy and refresh the local cache. */
function applyRemoteSettings(raw: unknown) {
  const next = coerceSettings(raw);
  if (!Object.keys(next).length) return;
  remoteSettings = { ...remoteSettings, ...next };
  (Object.keys(next) as (keyof StoreSettings)[]).forEach(k => {
    try { localStorage.setItem(SETTINGS_KEYS[k], String(next[k])); } catch {}
  });
  emitSettingsChange();
}

/** Reactive store settings: re-renders every consumer the moment settings are
 *  saved, whether from this tab, another tab, or Supabase realtime. */
export function useStoreSettings(): StoreSettings {
  useSyncExternalStore(subscribeSettings, getSettingsVersion, getSettingsVersion);
  return readStoreSettings();
}

/**
 * Persist store settings to Supabase first, then to localStorage. Always
 * resolves; check the returned flag to tell the admin whether the change
 * actually reached everyone or only this browser.
 */
export async function saveStoreSettings(patch: Partial<StoreSettings>): Promise<boolean> {
  (Object.keys(SETTINGS_KEYS) as (keyof StoreSettings)[]).forEach(k => {
    if (patch[k] === undefined) return;
    remoteSettings = { ...remoteSettings, [k]: String(patch[k] ?? '') };
    try { localStorage.setItem(SETTINGS_KEYS[k], String(patch[k] ?? '')); } catch {}
  });
  emitSettingsChange();

  const current = readStoreSettings();
  return saveSetting(STORE_SETTING_KEY, current);
}

/** One-time hydration of the shared store. Called once from App. */
export function useSharedDataHydration() {
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;

    void (async () => {
      const remote = await fetchSetting<unknown>(STORE_SETTING_KEY);
      if (alive) applyRemoteSettings(remote);
    })();

    const offSettings = subscribeToSetting(STORE_SETTING_KEY, () => {
      void fetchSetting<unknown>(STORE_SETTING_KEY).then(v => { if (v) applyRemoteSettings(v); });
    });

    return () => { alive = false; offSettings(); };
  }, []);
}

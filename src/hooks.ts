import { useState, useEffect, useSyncExternalStore } from 'react';
import { seed, type Product, type Review } from './data';

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useProducts(): [Product[], React.Dispatch<React.SetStateAction<Product[]>>] {
  const [products, setProducts] = useState<Product[]>(() => readJSON<Product[]>('em-products', seed));
  useEffect(() => {
    try { localStorage.setItem('em-products', JSON.stringify(products)); } catch {}
  }, [products]);
  return [products, setProducts];
}

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

export function useWishlist(): [string[], (id: string) => void] {
  const [wishlist, setWishlist] = useState<string[]>(() => readJSON<string[]>('em-wishlist', []));
  useEffect(() => {
    try { localStorage.setItem('em-wishlist', JSON.stringify(wishlist)); } catch {}
  }, [wishlist]);
  const toggle = (id: string) => {
    setWishlist(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  return [wishlist, toggle];
}

export function useReviews(): [Review[], (review: Review) => void] {
  const [reviews, setReviews] = useState<Review[]>(() => readJSON<Review[]>('em-reviews', []));
  useEffect(() => {
    try { localStorage.setItem('em-reviews', JSON.stringify(reviews)); } catch {}
  }, [reviews]);
  const addReview = (review: Review) => {
    setReviews(prev => [...prev, review]);
  };
  return [reviews, addReview];
}

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

let settingsVersion = 0;
const settingsListeners = new Set<() => void>();

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
    try { return localStorage.getItem(SETTINGS_KEYS[k])?.trim() || fallback; }
    catch { return fallback; }
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

/** Reactive store settings: re-renders every consumer the moment settings are saved,
 *  including other open tabs (via the `storage` event). */
export function useStoreSettings(): StoreSettings {
  useSyncExternalStore(subscribeSettings, getSettingsVersion, getSettingsVersion);
  return readStoreSettings();
}

/** Persist store settings and notify all mounted consumers. */
export function saveStoreSettings(patch: Partial<StoreSettings>) {
  (Object.keys(SETTINGS_KEYS) as (keyof StoreSettings)[]).forEach(k => {
    if (patch[k] === undefined) return;
    try { localStorage.setItem(SETTINGS_KEYS[k], String(patch[k] ?? '')); } catch {}
  });
  emitSettingsChange();
}

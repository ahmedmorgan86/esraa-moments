import { useState, useEffect } from 'react';
import { seed, type Product } from './data';

export function useProducts(): [Product[], React.Dispatch<React.SetStateAction<Product[]>>] {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('em-products');
    return saved ? JSON.parse(saved) : seed;
  });
  useEffect(() => {
    localStorage.setItem('em-products', JSON.stringify(products));
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

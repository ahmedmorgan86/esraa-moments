import { useState, useEffect } from 'react';
import { seed, type Product, type Review } from './data';

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

export function useWishlist(): [string[], (id: string) => void] {
  const [wishlist, setWishlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('em-wishlist');
    return saved ? JSON.parse(saved) : [];
  });
  useEffect(() => {
    localStorage.setItem('em-wishlist', JSON.stringify(wishlist));
  }, [wishlist]);
  const toggle = (id: string) => {
    setWishlist(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  return [wishlist, toggle];
}

export function useReviews(): [Review[], (review: Review) => void] {
  const [reviews, setReviews] = useState<Review[]>(() => {
    const saved = localStorage.getItem('em-reviews');
    return saved ? JSON.parse(saved) : [];
  });
  useEffect(() => {
    localStorage.setItem('em-reviews', JSON.stringify(reviews));
  }, [reviews]);
  const addReview = (review: Review) => {
    setReviews(prev => [...prev, review]);
  };
  return [reviews, addReview];
}

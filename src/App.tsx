import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useLocalStorage, useScrollShadow, useProducts } from './hooks';
import { t, setUiLang } from './i18n';
import { useSite } from './lib/site';
import type { CartItem } from './data';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { AnnouncementBar } from './components/AnnouncementBar';
import { WhatsAppFloat } from './components/WhatsAppFloat';

const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const ProductPage = lazy(() => import('./pages/Product'));
const LoginPage = lazy(() => import('./pages/Login'));
const AccountPage = lazy(() => import('./pages/Account'));
const AdminPage = lazy(() => import('./pages/Admin'));
const CheckoutPage = lazy(() => import('./pages/Checkout'));
const TrackPage = lazy(() => import('./pages/Track'));

export function App() {
  const [cart, setCart] = useLocalStorage<CartItem[]>('em-cart', []);
  const [lang, setLang] = useLocalStorage<'ar' | 'en'>('em-lang', 'ar');
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [bannerClosed, setBannerClosed] = useState(false);
  const [products, setProducts] = useProducts();
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('em-dark');
    if (stored) return stored === '1';
    return false;
  });
  const scrolled = useScrollShadow();
  const location = useLocation();
  const { site } = useSite();

  // Sync lang/dir immediately (not in useEffect) so t() returns correct language on first render
  setUiLang(lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('em-dark', dark ? '1' : '0'); }, [dark]);
  useEffect(() => { setMenuOpen(false); setCartOpen(false); window.scrollTo(0, 0); }, [location.pathname]);

  const addToCart = (p: any, qty = 1) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === p.id);
      if (exists) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { ...p, qty }];
    });
    setCartOpen(true);
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) return removeFromCart(id);
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  };
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const toggleDark = () => setDark(v => !v);
  const toggleLang = () => setLang(l => l === 'ar' ? 'en' : 'ar');

  return (
    <div className="min-h-screen flex flex-col">
      {site?.announcement?.enabled && !bannerClosed && (
        <AnnouncementBar text={site.announcement.text} textEn={site.announcement.textEn} lang={lang} onClose={() => setBannerClosed(true)} />
      )}
      <div className="sticky top-0 z-50">
        <Header
          lang={lang}
          t={t()}
          scrolled={scrolled}
          cartCount={cartCount}
          dark={dark}
          menuOpen={menuOpen}
          onMenuToggle={() => setMenuOpen(v => !v)}
          onCartOpen={() => setCartOpen(true)}
          onDarkToggle={toggleDark}
          onLangToggle={toggleLang}
        />
      </div>

      {menuOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMenuOpen(false)} />
      )}

      <main className="flex-1">
        <Suspense fallback={<div className="section page flex items-center justify-center min-h-[50vh]"><div className="text-muted">...</div></div>}>
          <Routes>
            <Route path="/" element={<Home t={t()} lang={lang} addToCart={addToCart} products={products} />} />
            <Route path="/shop" element={<Shop t={t()} lang={lang} addToCart={addToCart} products={products} />} />
            <Route path="/product/:id" element={<ProductPage t={t()} lang={lang} addToCart={addToCart} products={products} />} />
            <Route path="/login" element={<LoginPage t={t()} />} />
            <Route path="/account" element={<AccountPage t={t()} />} />
            <Route path="/admin/*" element={<AdminPage t={t()} products={products} setProducts={setProducts} />} />
            <Route path="/checkout" element={<CheckoutPage t={t()} lang={lang} cart={cart} setCart={setCart} />} />
            <Route path="/track" element={<TrackPage t={t()} />} />
            <Route path="*" element={
              <div className="section page flex flex-col items-center justify-center min-h-[60vh] text-center">
                <h1 className="text-6xl font-black text-primary mb-4">404</h1>
                <p className="text-muted mb-6">{lang === 'en' ? 'Page not found' : 'الصفحة دي مش موجودة'}</p>
                <Link to="/" className="btn primary">{lang === 'en' ? 'Home' : 'الرئيسية'}</Link>
              </div>
            } />
          </Routes>
        </Suspense>
      </main>

      <Footer t={t()} lang={lang} />
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        t={t()}
        lang={lang}
        updateQty={updateQty}
        removeFromCart={removeFromCart}
      />
      <WhatsAppFloat />
    </div>
  );
}

export default App;

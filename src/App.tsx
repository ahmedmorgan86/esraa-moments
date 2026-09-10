import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useLocalStorage, useScrollShadow, useProducts, useWishlist, useReviews } from './hooks';
import { t, setUiLang } from './i18n';
import { useSite } from './lib/site';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AnnouncementBar } from './components/AnnouncementBar';
import { WhatsAppFloat } from './components/WhatsAppFloat';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductPage from './pages/Product';
import LoginPage from './pages/Login';
import AccountPage from './pages/Account';
import AdminPage from './pages/Admin';
import WishlistPage from './pages/Wishlist';
import AboutPage from './pages/About';
import ContactPage from './pages/Contact';
import FaqPage from './pages/Faq';

export function App() {
  const [lang, setLang] = useLocalStorage<'ar' | 'en'>('em-lang', 'ar');
  const [menuOpen, setMenuOpen] = useState(false);
  const [bannerClosed, setBannerClosed] = useState(false);
  const [products, setProducts] = useProducts();
  const [wishlist, toggleWishlist] = useWishlist();
  const [reviews, addReview] = useReviews();
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('em-dark');
    if (stored) return stored === '1';
    return false;
  });
  const scrolled = useScrollShadow();
  const location = useLocation();
  const { site } = useSite();

  setUiLang(lang);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('em-dark', dark ? '1' : '0'); }, [dark]);
  useEffect(() => { setMenuOpen(false); window.scrollTo(0, 0); }, [location.pathname]);

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
          wishlistCount={wishlist.length}
          dark={dark}
          menuOpen={menuOpen}
          onMenuToggle={() => setMenuOpen(v => !v)}
          onDarkToggle={toggleDark}
          onLangToggle={toggleLang}
        />
      </div>

      {menuOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMenuOpen(false)} />
      )}

      <main className="flex-1 public-page-shell">
        <Routes>
            <Route path="/" element={<Home t={t()} lang={lang} products={products} />} />
            <Route path="/shop" element={<Shop t={t()} lang={lang} products={products} />} />
            <Route path="/product/:id" element={<ProductPage t={t()} lang={lang} products={products} wishlist={wishlist} toggleWishlist={toggleWishlist} reviews={reviews} addReview={addReview} />} />
            <Route path="/wishlist" element={<WishlistPage t={t()} lang={lang} products={products} wishlist={wishlist} toggleWishlist={toggleWishlist} />} />
            <Route path="/about" element={<AboutPage t={t()} lang={lang} />} />
            <Route path="/contact" element={<ContactPage t={t()} lang={lang} />} />
            <Route path="/faq" element={<FaqPage t={t()} lang={lang} />} />
            <Route path="/login" element={<LoginPage t={t()} />} />
            <Route path="/account" element={<AccountPage t={t()} />} />
            <Route path="/admin/*" element={<AdminPage t={t()} products={products} setProducts={setProducts} />} />
            <Route path="*" element={
              <div className="section page flex flex-col items-center justify-center min-h-[60vh] text-center">
                <h1 className="text-6xl font-black text-primary mb-4">404</h1>
                <p className="text-muted mb-6">{t().pageNotFound}</p>
                <Link to="/" className="btn primary">{t().home}</Link>
              </div>
            } />
          </Routes>
      </main>

      <Footer t={t()} lang={lang} />
      <WhatsAppFloat />
    </div>
  );
}

export default App;

import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Globe, MessageCircle, Menu, X, Heart } from 'lucide-react';
import { useStoreSettings } from '../hooks';

type Props = {
  lang: string; t: any; scrolled: boolean; wishlistCount: number;
  dark: boolean; menuOpen: boolean;
  onMenuToggle: () => void;
  onDarkToggle: () => void; onLangToggle: () => void;
};

export function Header({ t, scrolled, wishlistCount, dark, menuOpen, onMenuToggle, onDarkToggle, onLangToggle }: Props) {
  const location = useLocation();
  const settings = useStoreSettings();
  const isActive = (path: string) => location.pathname === path ? 'text-primary bg-primary/8' : 'text-muted hover:text-ink hover:bg-primary/8';
  const navLinks = [
    { path: '/shop', label: t.shop },
    { path: '/about', label: t.about },
    { path: '/contact', label: t.contact },
  ];

  return (
    <header className={`site-header glass transition-all ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="header-ticker" aria-hidden="true"><span>ESRAA MOMENTS</span><span>•</span><span>صُنعت لتُحكى</span><span>•</span><span>CURATED CELEBRATIONS</span></div>
      <div className="header-main px-5 lg:px-12">
        <Link to="/" className="brand-lockup direction-ltr" aria-label="ESRAA Moments home">
          <span className="brand-mark"><img src="/images/logo.jpeg" alt="" /></span>
          <span className="brand-wordmark"><strong>ESRAA</strong><small>MOMENTS / 2024</small></span>
        </Link>

        <nav className="header-nav hidden lg:flex" aria-label="Primary navigation">
          {navLinks.map(l => (
            <Link key={l.path} to={l.path} className={`header-nav-link ${isActive(l.path)}`}>{l.label}<span>↗</span></Link>
          ))}
        </nav>

        <div className="header-actions">
          <button onClick={onDarkToggle} className="header-icon" aria-label="theme">{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
          <button onClick={onLangToggle} className="header-lang" aria-label="language"><Globe size={16} /><span>AR / EN</span></button>
          <Link to="/wishlist" className="header-icon relative" aria-label="wishlist"><Heart size={17} />{wishlistCount > 0 && <span className="wishlist-badge">{wishlistCount}</span>}</Link>
          <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noopener noreferrer" className="header-contact"><MessageCircle size={16} /><span>Talk to us</span></a>
          <button onClick={onMenuToggle} className="header-icon lg:hidden" aria-label="menu">{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
      </div>

      {menuOpen && (
        <div className="mobile-menu lg:hidden">
          <p className="eyebrow">Navigate / استكشف</p>
          {navLinks.map(l => <Link key={l.path} to={l.path} className={`mobile-menu-link ${isActive(l.path)}`}>{l.label}<span>↗</span></Link>)}
          <Link to="/account" className={`mobile-menu-link ${isActive('/account')}`}>{t.account}<span>↗</span></Link>
          <Link to="/login" className={`mobile-menu-link ${isActive('/login')}`}>{t.login}<span>↗</span></Link>
        </div>
      )}
    </header>
  );
}

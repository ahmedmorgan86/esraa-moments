import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Globe, ShoppingBag, Menu, X, User } from 'lucide-react';

type Props = {
  lang: string; t: any; scrolled: boolean; cartCount: number;
  dark: boolean; menuOpen: boolean;
  onMenuToggle: () => void; onCartOpen: () => void;
  onDarkToggle: () => void; onLangToggle: () => void;
};

export function Header({ lang, t, scrolled, cartCount, dark, menuOpen, onMenuToggle, onCartOpen, onDarkToggle, onLangToggle }: Props) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path ? 'text-primary bg-primary/8' : 'text-muted hover:text-ink hover:bg-primary/8';
  const navLinks = [
    { path: '/shop', label: t.shop },
    { path: '/about', label: t.about },
    { path: '/track', label: t.track },
  ];

  return (
    <header className={`glass h-[72px] border-b border-border transition-all ${scrolled ? 'shadow-sm' : ''}`}>
      <div className="h-full px-5 lg:px-12 flex items-center justify-between">
        {/* Right side (RTL) - Brand */}
        <Link to="/" className="flex items-center gap-3 direction-ltr">
          <img src="/images/logo.jpeg" alt="ESRAA" className="w-10 h-10 rounded-lg object-cover" />
          <span className="text-lg font-bold tracking-tight">ESRAA Moments</span>
        </Link>

        {/* Center - Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map(l => (
            <Link key={l.path} to={l.path} className={`px-4 py-2 rounded-full text-[13.5px] font-medium transition-all ${isActive(l.path)}`}>{l.label}</Link>
          ))}
        </nav>

        {/* Left side (RTL) - Actions */}
        <div className="flex items-center gap-2">
          <button onClick={onDarkToggle} className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-primary/8 transition-all text-ink" aria-label="theme">
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={onLangToggle} className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-primary/8 transition-all text-ink" aria-label="lang">
            <Globe size={20} />
          </button>
          <Link to="/account" className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-primary/8 transition-all text-ink">
            <User size={20} />
          </Link>
          <button onClick={onCartOpen} className="relative w-10 h-10 rounded-lg flex items-center justify-center hover:bg-primary/8 transition-all text-ink">
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -start-0.5 w-[17px] h-[17px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">{cartCount}</span>
            )}
          </button>
          <button onClick={onMenuToggle} className="lg:hidden w-10 h-10 rounded-lg flex items-center justify-center hover:bg-primary/8 transition-all text-ink">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden absolute top-[72px] inset-x-0 bg-surface border-b border-border shadow-lg z-50 p-4 flex flex-col gap-1">
          {navLinks.map(l => (
            <Link key={l.path} to={l.path} className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all ${isActive(l.path)}`}>{l.label}</Link>
          ))}
          <Link to="/login" className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all ${isActive('/login')}`}>{t.login}</Link>
        </div>
      )}
    </header>
  );
}

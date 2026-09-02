import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Link2, MessageCircle } from 'lucide-react';
import { occasionEn } from '../i18n';

export function Footer({ t, lang }: { t: any; lang?: string }) {
  const isEn = lang === 'en';
  const footerOccasions = ['سبوع', 'خطوبة', 'حنة', 'كتب كتاب', 'زفاف', 'عيد ميلاد'];

  return (
    <footer className="relative mt-10 bg-ink text-surface-alt overflow-hidden pt-14">
      <div className="max-w-6xl mx-auto px-5 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-10">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img src="/images/logo.jpeg" alt="ESRAA" className="w-11 h-11 rounded-lg object-cover" />
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-lg">ESRAA</span>
                <small className="text-[10.5px] text-white/50">MOMENTS</small>
              </div>
            </Link>
            <p className="text-white/55 text-[13.5px] leading-relaxed max-w-[300px] mb-5">{t.footerDesc}</p>
            <div className="flex gap-2">
              <a href="https://www.instagram.com/esraamoments" target="_blank" rel="noopener" className="w-10 h-10 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white hover:text-ink transition-all"><Link2 size={18} /></a>
              <a href="https://wa.me/201097905435" target="_blank" rel="noopener" className="w-10 h-10 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white hover:text-ink transition-all"><MessageCircle size={18} /></a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-[11.5px] font-bold text-white/50 uppercase tracking-widest mb-5">{t.quickLinks}</h4>
            <ul className="flex flex-col gap-3">
              <li><Link to="/shop" className="text-white/55 text-[13.5px] hover:text-white transition-colors">{t.shop}</Link></li>
              <li><Link to="/track" className="text-white/55 text-[13.5px] hover:text-white transition-colors">{t.track}</Link></li>
              <li><Link to="/account" className="text-white/55 text-[13.5px] hover:text-white transition-colors">{t.account}</Link></li>
              <li><Link to="/about" className="text-white/55 text-[13.5px] hover:text-white transition-colors">{t.about}</Link></li>
              <li><Link to="/faq" className="text-white/55 text-[13.5px] hover:text-white transition-colors">{t.faq}</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-[11.5px] font-bold text-white/50 uppercase tracking-widest mb-5">{t.shopByOccasion}</h4>
            <ul className="flex flex-col gap-3">
              {footerOccasions.map(c => (
                <li key={c}><Link to={`/shop?cat=${encodeURIComponent(c)}`} className="text-white/55 text-[13.5px] hover:text-white transition-colors">{isEn ? occasionEn[c] || c : c}</Link></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[11.5px] font-bold text-white/50 uppercase tracking-widest mb-5">{t.contactUs}</h4>
            <div className="flex flex-col gap-3">
              <a href="tel:01097905435" className="flex items-center gap-2 text-white/55 text-[13px] hover:text-white transition-colors"><Phone size={14} className="text-white/40" /> 01097905435</a>
              <a href="mailto:esraamomentsstore@gmail.com" className="flex items-center gap-2 text-white/55 text-[13px] hover:text-white transition-colors"><Mail size={14} className="text-white/40" /> esraamomentsstore@gmail.com</a>
              <span className="flex items-center gap-2 text-white/55 text-[13px]"><MapPin size={14} className="text-white/40" />{isEn ? 'El GEISH St. — Ezbet El Nakhel, Cairo' : 'شارع الجيش — عزبة النخل'}</span>
              <span className="flex items-center gap-2 text-white/55 text-[13px]"><Link2 size={14} className="text-white/40" /> @esraamoments</span>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/8 py-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-white/40 text-xs">© {new Date().getFullYear()} ESRAA Moments — {t.allRights}</p>
          <div className="flex gap-2">
            <span className="text-white/50 text-[10px] font-bold px-2 py-1 border border-white/15 rounded">Visa</span>
            <span className="text-white/50 text-[10px] font-bold px-2 py-1 border border-white/15 rounded">instaPay</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

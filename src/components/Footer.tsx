import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Link2, MessageCircle } from 'lucide-react';
import { occasionEn } from '../i18n';
import { useStoreSettings } from '../hooks';

export function Footer({ t, lang }: { t: any; lang?: string }) {
  const isEn = lang === 'en';
  const settings = useStoreSettings();
  const footerOccasions = ['سبوع', 'خطوبة', 'حنة', 'كتب كتاب', 'زفاف', 'عيد ميلاد'];

  return (
    <footer className="site-footer">
      <div className="footer-marquee" aria-hidden="true"><span>MAKE ROOM FOR THE MOMENT</span><span>✦</span><span>نصنع ذكرى</span><span>✦</span><span>ESRAA MOMENTS</span></div>
      <div className="footer-inner">
        <div className="footer-intro">
          <Link to="/" className="footer-brand"><span className="footer-brand-mark"><img src="/images/logo.jpeg" alt="" /></span><span><strong>ESRAA</strong><small>MOMENTS</small></span></Link>
          <p>{t.footerDesc}</p>
          <div className="footer-socials"><a href="https://www.instagram.com/esraamoments" target="_blank" rel="noopener" aria-label="Instagram"><Link2 size={17} /></a><a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noopener" aria-label="WhatsApp"><MessageCircle size={17} /></a></div>
        </div>
        <div className="footer-links"><div><p className="footer-kicker">Explore / استكشف</p><Link to="/shop">{t.shop}<span>↗</span></Link><Link to="/about">{t.about}<span>↗</span></Link><Link to="/contact">{t.contact}<span>↗</span></Link><Link to="/account">{t.account}<span>↗</span></Link></div><div><p className="footer-kicker">{t.shopByOccasion}</p>{footerOccasions.slice(0, 4).map(c => <Link key={c} to={`/shop?cat=${encodeURIComponent(c)}`}>{isEn ? occasionEn[c] || c : c}<span>↗</span></Link>)}</div></div>
        <div className="footer-contact"><p className="footer-kicker">{t.contactUs}</p><a href={`tel:${settings.whatsapp}`}><Phone size={14} />{settings.whatsapp}</a><a href={`mailto:${settings.email}`}><Mail size={14} />{settings.email}</a><span><MapPin size={14} />{settings.address}</span><strong>Let&apos;s make it memorable.</strong></div>
      </div>
      <div className="footer-bottom"><p>© {new Date().getFullYear()} ESRAA Moments — {t.allRights}</p><div><span>Visa</span><span>instaPay</span><span>Made with intention</span></div></div>
    </footer>
  );
}

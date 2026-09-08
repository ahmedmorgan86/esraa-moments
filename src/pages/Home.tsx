import { useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, type Variants } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronLeft, MoveUpRight, Plus } from 'lucide-react';
import { occasions } from '../data';
import { occasionEn } from '../i18n';
import { useHomepageContent } from '../lib/homepageContent';

const occasionIcons: Record<string, string> = { 'سبوع': '🍼', 'خطوبة': '💍', 'حنة': '🤲', 'كتب كتاب': '📖', 'زفاف': '💒', 'عيد ميلاد': '🎂', 'تخرج': '🎓', 'استقبال مولود': '👶', 'رمضان': '🌙', 'عيد': '🎉', 'توزيعات شركات': '🏢' };
const reveal: Variants = { hidden: { opacity: 0, y: 34 }, visible: { opacity: 1, y: 0, transition: { duration: .8, ease: [.22, 1, .36, 1] } } };
const stagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: .11 } } };

export default function Home({ t, lang, products }: { t: any; lang: string; products: any[] }) {
  const [content] = useHomepageContent(); const isEn = lang === 'en';
  const featured = products.filter(p => p.featured).slice(0, 8);
  const [email, setEmail] = useState(''); const [subscribed, setSubscribed] = useState(false);
  const px = useSpring(useMotionValue(0), { stiffness: 90, damping: 20 }); const py = useSpring(useMotionValue(0), { stiffness: 90, damping: 20 });
  const artX = useTransform(px, [-1, 1], [-22, 22]); const artY = useTransform(py, [-1, 1], [-18, 18]);
  const move = (event: React.PointerEvent<HTMLElement>) => { const r = event.currentTarget.getBoundingClientRect(); px.set((event.clientX - r.left) / r.width * 2 - 1); py.set((event.clientY - r.top) / r.height * 2 - 1); };
  return <>
    <section className="hero-shell signature-hero" onPointerMove={move} onPointerLeave={() => { px.set(0); py.set(0); }}>
      <div className="hero-grid-lines" /><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
      <div className="hero-crosshair crosshair-one" /><div className="hero-crosshair crosshair-two" /><span className="hero-index">01 / 05</span>
      <motion.div className="hero-copy" initial="hidden" animate="visible" variants={stagger}>
        <motion.span className="eyebrow" variants={reveal}>{isEn ? content.heroEyebrowEn : content.heroEyebrow}</motion.span>
        <motion.h1 variants={reveal}>{isEn ? content.heroTitle1En : content.heroTitle1}<br /><em>{isEn ? content.heroTitle2En : content.heroTitle2}</em></motion.h1>
        <motion.p variants={reveal}>{isEn ? content.heroDescEn : content.heroDesc}</motion.p>
        <motion.div variants={reveal} className="hero-actions"><Link to="/shop" className="btn primary">{isEn ? content.heroCtaEn : content.heroCta}<ArrowLeft size={18} /></Link><span className="hero-note">{isEn ? 'For the beautifully unforgettable' : 'لتلك اللحظات التي تستحق أن تُحفظ'}</span></motion.div>
      </motion.div>
      <motion.div className="hero-art signature-art" style={{ x: artX, y: artY }} initial={{ opacity: 0, scale: .8, rotate: -8 }} animate={{ opacity: 1, scale: 1, rotate: 3 }} transition={{ duration: 1.25, ease: [.22, 1, .36, 1] }}>
        <div className="art-label label-top"><span>ESRAA</span><small>{isEn ? 'THE MOMENT ARCHIVE' : 'أرشيف اللحظة'}</small></div>
        <div className="hero-ring ring-back" /><div className="hero-ring ring-front" />
        <motion.div className="hero-frame" animate={{ y: [0, -16, 0], rotate: [3, 1, 3] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}><img src="/images/Gemini_Generated_Image_wh7xokwh7xokwh7x.jpeg" alt="Curated celebration details" /><span className="frame-number">A / 24</span></motion.div>
        <motion.div className="hero-floating-card card-top"><span>01</span><strong>{isEn ? 'A moment, made' : 'لحظة صُنعت'}</strong></motion.div>
        <motion.div className="hero-floating-card card-bottom"><span className="card-dot" />{isEn ? 'Curated with feeling' : 'مختارة بإحساس'}</motion.div>
        <div className="hero-stamp"><span>{isEn ? 'Thoughtfully yours' : 'بكل حب'}</span></div>
      </motion.div>
      <div className="hero-scroll"><span>SCROLL TO DISCOVER</span><ChevronDown size={17} /></div>
    </section>

    <div className="marquee-bar"><div className="marquee-track">{Array.from({ length: 5 }).map((_, i) => <span key={i}>{isEn ? 'CELEBRATE THE ORDINARY' : 'نحتفل بالتفاصيل الصغيرة'} <b>✦</b></span>)}</div></div>

    <section className="section section-tight occasions-section"><motion.div className="section-intro" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={reveal}><span className="eyebrow">{t.occasionsEyebrow}</span><h2>{t.occasionsTitle}</h2><p className="text-muted mt-2">{t.occasionsSub}</p></motion.div><motion.div className="occasion-grid signature-occasion-grid" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>{occasions.map((occ, i) => <motion.div key={occ} variants={reveal}><Link to={`/shop?cat=${encodeURIComponent(occ)}`} className="occasion-card"><span className="occasion-number">0{i + 1}</span><span className="occasion-icon">{occasionIcons[occ] || '🎁'}</span><strong>{isEn ? occasionEn[occ] || occ : occ}</strong><MoveUpRight size={15} /></Link></motion.div>)}</motion.div></section>

    <section className="section feature-section"><motion.div className="section-heading" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={reveal}><div><span className="eyebrow">{t.featuredEyebrow}</span><h2>{t.featuredTitle}</h2></div><Link to="/shop" className="text-link">{t.viewDetails}<ArrowLeft size={16} /></Link></motion.div><motion.div className="product-grid signature-product-grid" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>{featured.map((p, i) => <motion.div key={p.id} variants={reveal}><Link to={`/product/${p.id}`} className="product-card"><div className="product-image"><img src={p.image} alt={p.name} /><span>{isEn ? 'VIEW PIECE' : 'اكتشفي القطعة'} <ArrowLeft size={13} /></span><b className="product-index">0{i + 1}</b></div><div className="product-meta"><h3>{isEn && p.name_en ? p.name_en : p.name}</h3><ArrowLeft size={17} /></div></Link></motion.div>)}</motion.div></section>

    <section className="section story-section"><motion.div className="story-panel signature-story" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={reveal}><div className="story-copy"><span className="eyebrow">{content.storyEyebrow}</span><h2>{isEn ? content.storyTitleEn : content.storyTitle}</h2><p className="story-quote">&quot;{isEn ? content.storyQuoteEn : content.storyQuote}&quot;</p><p className="text-muted leading-relaxed">{isEn ? content.storyTextEn : content.storyText}</p><Link to="/about" className="text-link mt-7">{t.about}<ArrowLeft size={16} /></Link></div><div className="story-images"><span className="story-vertical">MOMENTS</span><img src="/images/Gemini_Generated_Image_ehh0puehh0puehh0.jpeg" alt="Esraa Moments detail" /><img src="/images/Gemini_Generated_Image_sligebsligebslig.jpeg" alt="Gift wrapping detail" /></div></motion.div></section>

    <section className="section newsletter-section"><motion.div className="newsletter signature-newsletter" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={reveal}><span className="eyebrow">{t.newsEyebrow}</span><h2>{t.newsTitle}</h2><p className="text-muted">{t.newsDesc}</p>{subscribed ? <p className="success-message">{t.newsDone}</p> : <form onSubmit={e => { e.preventDefault(); setSubscribed(true); }}><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder={t.newsPlaceholder} /><button className="btn primary" type="submit">{t.newsBtn}</button></form>}<Plus className="newsletter-plus" size={28} /></motion.div></section>
    <section className="section faq-section"><div className="text-center"><span className="eyebrow">{t.faqEyebrow}</span><h2>{t.faqTitle}</h2></div><div className="faq-list">{content.faqs.map((faq, i) => <FaqItem key={i} q={isEn ? faq.q_en : faq.q} a={isEn ? faq.a_en : faq.a} />)}</div></section>
  </>;
}
function FaqItem({ q, a }: { q: string; a: string }) { const [open, setOpen] = useState(false); return <div className={`faq-item ${open ? 'open' : ''}`}><button onClick={() => setOpen(v => !v)} type="button"><span>{q}</span><ChevronLeft size={18} /></button>{open && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="faq-answer">{a}</motion.div>}</div>; }

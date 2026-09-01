import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronLeft, Star, Sparkles, Heart } from 'lucide-react';
import { occasions, seed } from '../data';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

const occasionIcons: Record<string, string> = {
  'سبوع': '🍼', 'خطوبة': '💍', 'حنة': '🤲', 'كتب كتاب': '📖',
  'زفاف': '💒', 'عيد ميلاد': '🎂', 'تخرج': '🎓',
  'استقبال مولود': '👶', 'رمضان': '🌙', 'عيد': '🎉', 'توزيعات شركات': '🏢',
};

const faqs = [
  { q: 'بتوصلوا لكل مصر؟', a: 'أيوه، بنوصلكم في كل المحافظات. التوصيل بيوصل خلال 2-5 أيام عمل حسب المحافظة.' },
  { q: 'ممكن أعمل تخصيص للتوزيعات؟', a: 'طبعاً! بنعمل تخصيص كامل — اسم، ألوان، تصميم خاص. تواصل معانا على الواتساب ونتفق.' },
  { q: 'إيه سياسة الإرجاع؟', a: 'لو المنتج وصل بعيب، بنستبدله أو برجعلك الفلوس خلال 7 أيام من الاستلام.' },
  { q: 'بتدفعوا إزاي؟', a: 'الدفع عند الاستلام، فودافون كاش، أو instaPay. ممكن كمان تحول على البنك.' },
  { q: 'إيه الحد الأدنى للطلبات؟', a: 'مفيش حد أدنى للطلبات الفردية. بس الطلبات الكبيرة (50 قطعة وفوق) عليها خصم خاص.' },
];

export default function Home({ t, addToCart }: { t: any; addToCart: (p: any, qty?: number) => void }) {
  const featured = seed.filter(p => p.featured).slice(0, 8);
  const bestSellers = seed.slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.08fr_.92fr] items-center gap-10 lg:gap-20 py-12 lg:py-20 px-5 lg:px-12 max-w-7xl mx-auto">
        <motion.div className="relative z-10 flex flex-col items-start" initial="hidden" animate="visible" variants={fadeUp}>
          <span className="inline-block text-primary text-[11.5px] font-extrabold tracking-widest mb-3">مُنتجة بدقة • تُصمم بكمال • تفاصيل تُنسى</span>
          <h1 className="text-[clamp(34px,4.5vw,56px)] leading-[1.2] font-black mb-5">
            {t.heroTitle1}<br />
            <span className="text-primary">{t.heroTitle2}</span>
          </h1>
          <p className="text-muted text-[clamp(15px,1.5vw,17px)] max-w-[50ch] leading-relaxed mb-7">{t.heroDesc}</p>
          <Link to="/shop" className="btn primary flex items-center gap-2">{t.heroCta} <ArrowLeft size={18} /></Link>
          <div className="mt-7 text-subtle"><ChevronDown size={22} /></div>
        </motion.div>
        <motion.div className="relative justify-self-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }}>
          <div className="absolute -top-[5%] -end-[7%] w-[55%] aspect-square bg-primary/12 rounded-full blur-[25px] opacity-80 pointer-events-none" />
          <div className="absolute top-[5%] bottom-[-12px] -start-3 w-[74%] border-2 border-primary/15 rounded-[190px_190px_14px_14px] pointer-events-none" />
          <img src="/images/Gemini_Generated_Image_wh7xokwh7xokwh7x.jpeg" alt="" className="relative z-10 w-[min(380px,100%)] aspect-[4/5] object-cover rounded-[190px_190px_14px_14px] shadow-2xl" />
          <div className="absolute bottom-5 start-5 z-20 bg-white/85 dark:bg-black/70 backdrop-blur-md border border-white/20 rounded-lg px-4 py-3 text-xs font-semibold shadow-lg">مُنتجة بدقة<br /><span className="text-muted">للحظات</span></div>
        </motion.div>
      </section>

      {/* Occasions */}
      <section className="section">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeUp}>
          <span className="eyebrow">الخطوة الأولى</span>
          <h2 className="text-[clamp(24px,3.2vw,38px)] font-black">{t.occasionsTitle}</h2>
        </motion.div>
        <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5 mt-9" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}>
          {occasions.map(occ => (
            <motion.div key={occ} variants={fadeUp}>
              <Link to={`/shop?cat=${encodeURIComponent(occ)}`} className="flex items-center gap-3 p-4 bg-surface border border-border rounded-xl hover:border-primary hover:-translate-y-0.5 hover:shadow-md transition-all">
                <div className="w-[42px] h-[42px] rounded-lg bg-primary/8 text-primary flex items-center justify-center text-xl flex-shrink-0">{occasionIcons[occ] || '✨'}</div>
                <span className="text-sm font-semibold text-ink">{occ}</span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Featured */}
      <section className="section">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeUp}>
          <span className="eyebrow">اختياراتنا</span>
          <h2 className="text-[clamp(24px,3.2vw,38px)] font-black">{t.featuredTitle}</h2>
          <p className="text-muted mt-2">{t.featuredSub}</p>
        </motion.div>
        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-9" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }}>
          {featured.map(p => (
            <motion.div key={p.id} variants={fadeUp}>
              <Link to={`/product/${p.id}`} className="group block bg-surface border border-border rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all">
                <div className="relative aspect-square overflow-hidden bg-surface-alt">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                </div>
                <div className="p-4">
                  <h3 className="text-[14px] font-bold line-clamp-2 mb-1">{p.name}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gradient font-extrabold text-lg">{p.price} ج.م</span>
                    <button onClick={(e) => { e.preventDefault(); addToCart(p); }} className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-primary-hover transition-all" type="button">{t.addToCart}</button>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Brand Story */}
      <section className="section">
        <div className="bg-surface border border-border rounded-2xl p-8 lg:p-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <span className="eyebrow">{t.storyTitle}</span>
            <h2 className="text-[clamp(24px,3.2vw,38px)] font-black mt-2 mb-5">{t.storyTitle}</h2>
            <p className="italic text-primary text-lg mb-5">"{t.storyQuote}"</p>
            <p className="text-muted text-sm leading-relaxed">مجرد تفاصيل صغيرة... لكنها تصنع فرق كبير في كل مناسبة. من القلب إلى إيدك.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <img src="/images/Gemini_Generated_Image_ehh0puehh0puehh0.jpeg" alt="" className="w-full aspect-[4/5] object-cover rounded-xl" />
            <img src="/images/Gemini_Generated_Image_sligebsligebslig.jpeg" alt="" className="w-full aspect-[4/5] object-cover rounded-xl mt-8" />
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      <section className="section">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeUp}>
          <span className="eyebrow">الأكثر طلباً</span>
          <h2 className="text-[clamp(24px,3.2vw,38px)] font-black">{t.bsTitle}</h2>
        </motion.div>
        <div className="flex gap-5 overflow-x-auto pb-4 mt-9 scroll-snap-x mandatory -mx-5 px-5 lg:-mx-12 lg:px-12" style={{ scrollPaddingInline: '20px' }}>
          {bestSellers.map((p, i) => (
            <Link key={p.id} to={`/product/${p.id}`} className="min-w-[260px] flex-shrink-0 bg-surface border border-border rounded-xl overflow-hidden scroll-snap-start hover:shadow-md transition-all">
              <img src={p.image} alt={p.name} className="w-full aspect-[4/3] object-cover" />
              <div className="p-3.5">
                <span className="text-primary text-[11px] font-extrabold">#{i + 1}</span>
                <h3 className="text-sm font-bold mt-1 line-clamp-1">{p.name}</h3>
                <span className="text-gradient font-extrabold mt-1 block">{p.price} ج.م</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="section">
        <div className="bg-surface border border-border rounded-2xl p-16 text-center relative overflow-hidden">
          <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl pointer-events-none opacity-50" />
          <div className="relative z-10 max-w-lg mx-auto">
            <span className="eyebrow">{t.newsTitle}</span>
            <h2 className="text-[clamp(24px,3.2vw,38px)] font-black mt-2 mb-3">{t.newsTitle}</h2>
            <p className="text-muted text-sm">{t.newsDesc}</p>
            <div className="flex gap-2.5 mt-7 max-w-md mx-auto">
              <input type="email" placeholder="بريدك الإلكتروني" className="flex-1 px-4 py-3.5 bg-surface-alt border border-border-strong rounded-lg text-sm placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all" />
              <button className="btn primary flex-shrink-0" type="button">{t.newsBtn}</button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="text-center">
          <span className="eyebrow">الأسئلة</span>
          <h2 className="text-[clamp(24px,3.2vw,38px)] font-black mt-2">{t.faqTitle}</h2>
        </div>
        <div className="max-w-[760px] mx-auto mt-9 flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <FaqItem key={i} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>
    </>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`bg-surface border rounded-lg overflow-hidden transition-colors ${open ? 'border-primary' : 'border-border'}`}>
      <button onClick={() => setOpen(v => !v)} className="w-full px-6 py-4.5 flex items-center justify-between font-bold text-start hover:bg-primary/4 transition-colors" type="button">
        <span className="text-sm">{q}</span>
        <ChevronLeft size={18} className={`text-muted transition-transform ${open ? '-rotate-90' : ''}`} />
      </button>
      {open && <div className="px-6 pb-4.5 text-muted text-[13.5px] leading-relaxed">{a}</div>}
    </div>
  );
}

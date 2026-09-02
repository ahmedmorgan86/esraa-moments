import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronLeft } from 'lucide-react';
import { occasions } from '../data';
import { occasionEn } from '../i18n';

const occasionIcons: Record<string, string> = {
  'سبوع': '🍼', 'خطوبة': '💍', 'حنة': '🤲', 'كتب كتاب': '📖',
  'زفاف': '💒', 'عيد ميلاد': '🎂', 'تخرج': '🎓',
  'استقبال مولود': '👶', 'رمضان': '🌙', 'عيد': '🎉', 'توزيعات شركات': '🏢',
};

const faqs = [
  { q: 'بتوصلوا لكل مصر؟', q_en: 'Do you ship all over Egypt?', a: 'أيوه، بنوصلكم في كل المحافظات. التوصيل بيوصل خلال 2-5 أيام عمل حسب المحافظة.', a_en: 'Yes, we deliver to all governorates. Delivery takes 2-5 business days depending on the governorate.' },
  { q: 'ممكن أعمل تخصيص للتوزيعات؟', q_en: 'Can I customize the favors?', a: 'طبعاً! بنعمل تخصيص كامل — اسم، ألوان، تصميم خاص. تواصل معانا على الواتساب ونتفق.', a_en: 'Of course! We offer full customization — name, colors, special design. Contact us on WhatsApp to agree.' },
  { q: 'إيه سياسة الإرجاع؟', q_en: 'What is the return policy?', a: 'لو المنتج وصل بعيب، بنستبدله أو برجعلك الفلوس خلال 7 أيام من الاستلام.', a_en: 'If the product arrives defective, we replace it or refund within 7 days of delivery.' },
  { q: 'بتدفعوا إزاي؟', q_en: 'What payment methods are available?', a: 'الدفع عند الاستلام، فودافون كاش، أو instaPay. ممكن كمان تحول على البنك.', a_en: 'Cash on delivery, Vodafone Cash, or InstaPay. You can also make a bank transfer.' },
  { q: 'إيه الحد الأدنى للطلبات؟', q_en: 'What is the minimum order quantity?', a: 'مفيش حد أدنى للطلبات الفردية. بس الطلبات الكبيرة (50 قطعة وفوق) عليها خصم خاص.', a_en: 'No minimum for individual orders. But large orders (50+ pieces) get a special discount.' },
];

export default function Home({ t, lang, addToCart, products }: { t: any; lang: string; addToCart: (p: any, qty?: number) => void; products: any[] }) {
  const featured = products.filter(p => p.featured).slice(0, 8);
  const bestSellers = products.slice(0, 6);
  const isEn = lang === 'en';
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  return (
    <>
      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.08fr_.92fr] items-center gap-10 lg:gap-20 py-12 lg:py-20 px-5 lg:px-12 max-w-7xl mx-auto">
        <div className="relative z-10 flex flex-col items-start animate-[fadeUp_0.6s_ease_both]">
          <span className="inline-block text-primary text-[11.5px] font-extrabold tracking-widest mb-3">{t.heroEyebrow}</span>
          <h1 className="text-[clamp(34px,4.5vw,56px)] leading-[1.2] font-black mb-5">
            {t.heroTitle1}<br />
            <span className="text-primary">{t.heroTitle2}</span>
          </h1>
          <p className="text-muted text-[clamp(15px,1.5vw,17px)] max-w-[50ch] leading-relaxed mb-7">{t.heroDesc}</p>
          <Link to="/shop" className="btn primary flex items-center gap-2">{t.heroCta} <ArrowLeft size={18} /></Link>
          <div className="mt-7 text-subtle"><ChevronDown size={22} /></div>
        </div>
        <div className="relative justify-self-center animate-[fadeUp_0.7s_ease_both_0.15s]">
          <div className="absolute -top-[5%] -end-[7%] w-[55%] aspect-square bg-primary/12 rounded-full blur-[25px] opacity-80 pointer-events-none" />
          <div className="absolute top-[5%] bottom-[-12px] -start-3 w-[74%] border-2 border-primary/15 rounded-[190px_190px_14px_14px] pointer-events-none" />
          <img src="/images/Gemini_Generated_Image_wh7xokwh7xokwh7x.jpeg" alt="" className="relative z-10 w-[min(380px,100%)] aspect-[4/5] object-cover rounded-[190px_190px_14px_14px] shadow-2xl" />
          <div className="absolute bottom-5 start-5 z-20 bg-surface/85 backdrop-blur-md border border-white/20 rounded-lg px-4 py-3 text-xs font-semibold shadow-lg">{t.heroOverlayLine1}<br /><span className="text-muted">{t.heroOverlayLine2}</span></div>
        </div>
      </section>

      {/* Occasions */}
      <section className="section">
        <div className="animate-[fadeUp_0.6s_ease_both]">
          <span className="eyebrow">{t.occasionsTitle}</span>
          <h2 className="text-[clamp(24px,3.2vw,38px)] font-black">{t.occasionsTitle}</h2>
          <p className="text-muted mt-2">{t.occasionsSub}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5 mt-9">
          {occasions.map((occ, i) => (
            <div key={occ} className="animate-[fadeUp_0.5s_ease_both]" style={{ animationDelay: `${i * 0.05}s` }}>
              <Link to={`/shop?cat=${encodeURIComponent(occ)}`} className="flex items-center gap-3 p-4 bg-surface border border-border rounded-xl hover:border-primary hover:-translate-y-0.5 hover:shadow-md transition-all">
                <div className="w-[42px] h-[42px] rounded-lg bg-primary/8 text-primary flex items-center justify-center text-xl flex-shrink-0">{occasionIcons[occ] || '✨'}</div>
                <span className="text-sm font-semibold text-ink">{isEn ? occasionEn[occ] || occ : occ}</span>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="section">
        <div className="animate-[fadeUp_0.6s_ease_both]">
          <span className="eyebrow">{t.featuredEyebrow}</span>
          <h2 className="text-[clamp(24px,3.2vw,38px)] font-black">{t.featuredTitle}</h2>
          <p className="text-muted mt-2">{t.featuredSub}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-9">
          {featured.map((p, i) => (
            <div key={p.id} className="animate-[fadeUp_0.5s_ease_both]" style={{ animationDelay: `${i * 0.06}s` }}>
              <Link to={`/product/${p.id}`} className="group block bg-surface border border-border rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all">
                <div className="relative aspect-square overflow-hidden bg-surface-alt">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                </div>
                <div className="p-4">
                  <h3 className="text-[14px] font-bold line-clamp-2 mb-1">{isEn && p.name_en ? p.name_en : p.name}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gradient font-extrabold text-lg">{p.price} {t.currency}</span>
                    <button onClick={(e) => { e.preventDefault(); addToCart(p); }} className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-primary-hover transition-all" type="button">{t.addToCart}</button>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Brand Story */}
      <section className="section">
        <div className="bg-surface border border-border rounded-2xl p-8 lg:p-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="animate-[fadeUp_0.6s_ease_both]">
            <span className="eyebrow">{t.storyEyebrow}</span>
            <h2 className="text-[clamp(24px,3.2vw,38px)] font-black mt-2 mb-5">{t.storyTitle}</h2>
            <p className="italic text-primary text-lg mb-5">"{t.storyQuote}"</p>
            <p className="text-muted text-sm leading-relaxed">{t.storyText}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img src="/images/Gemini_Generated_Image_ehh0puehh0puehh0.jpeg" alt="" className="w-full aspect-[4/5] object-cover rounded-xl" />
            <img src="/images/Gemini_Generated_Image_sligebsligebslig.jpeg" alt="" className="w-full aspect-[4/5] object-cover rounded-xl mt-8" />
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      <section className="section">
        <div className="animate-[fadeUp_0.6s_ease_both]">
          <span className="eyebrow">{t.bsEyebrow}</span>
          <h2 className="text-[clamp(24px,3.2vw,38px)] font-black">{t.bsTitle}</h2>
        </div>
        <div className="flex gap-5 overflow-x-auto pb-4 mt-9 scroll-snap-x mandatory -mx-5 px-5 lg:-mx-12 lg:px-12" style={{ scrollPaddingInline: '20px' }}>
          {bestSellers.map((p, i) => (
            <Link key={p.id} to={`/product/${p.id}`} className="min-w-[260px] flex-shrink-0 bg-surface border border-border rounded-xl overflow-hidden scroll-snap-start hover:shadow-md transition-all">
              <img src={p.image} alt={p.name} className="w-full aspect-[4/3] object-cover" />
              <div className="p-3.5">
                <span className="text-primary text-[11px] font-extrabold">#{i + 1}</span>
                <h3 className="text-sm font-bold mt-1 line-clamp-1">{isEn && p.name_en ? p.name_en : p.name}</h3>
                <span className="text-gradient font-extrabold mt-1 block">{p.price} {t.currency}</span>
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
            <span className="eyebrow">{t.newsEyebrow}</span>
            <h2 className="text-[clamp(24px,3.2vw,38px)] font-black mt-2 mb-3">{t.newsTitle}</h2>
            <p className="text-muted text-sm">{t.newsDesc}</p>
            {subscribed ? (
              <p className="mt-7 text-primary font-bold text-sm">{t.newsDone}</p>
            ) : (
              <form onSubmit={e => { e.preventDefault(); setSubscribed(true); }} className="flex gap-2.5 mt-7 max-w-md mx-auto">
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder={t.newsPlaceholder} className="flex-1 px-4 py-3.5 bg-surface-alt border border-border-strong rounded-lg text-sm placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all" />
                <button className="btn primary flex-shrink-0" type="submit">{t.newsBtn}</button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="text-center">
          <span className="eyebrow">{t.faqEyebrow}</span>
          <h2 className="text-[clamp(24px,3.2vw,38px)] font-black mt-2">{t.faqTitle}</h2>
        </div>
        <div className="max-w-[760px] mx-auto mt-9 flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <FaqItem key={i} q={isEn ? faq.q_en : faq.q} a={isEn ? faq.a_en : faq.a} />
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

import { MessageCircle } from 'lucide-react';
import { useHomepageContent } from '../lib/homepageContent';
import { useStoreSettings } from '../hooks';

export default function About({ t, lang }: { t: any; lang: string }) {
  const isEn = lang === 'en';
  const [content] = useHomepageContent();
  const settings = useStoreSettings();

  return (
    <>
      {/* Hero */}
      <section className="section page">
        <div className="text-center max-w-2xl mx-auto animate-[fadeUp_0.6s_ease_both]">
          <span className="eyebrow">{isEn ? content.storyEyebrowEn : content.storyEyebrow}</span>
          <h1 className="text-[clamp(28px,4vw,44px)] font-black mt-2 mb-4">{isEn ? content.storyTitleEn : content.storyTitle}</h1>
          <p className="italic text-primary text-xl mb-6">"{isEn ? content.storyQuoteEn : content.storyQuote}"</p>
          <p className="text-muted leading-relaxed">{isEn ? content.storyTextEn : content.storyText}</p>
        </div>
      </section>

      {/* Story images */}
      <section className="section">
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto list-none">
          {[
            { src: '/images/Gemini_Generated_Image_ehh0puehh0puehh0.jpeg', alt: isEn ? 'ESRAA Moments gift box being arranged' : 'صندوق هدايا من ESRAA Moments أثناء تجهيزه' },
            { src: '/images/Gemini_Generated_Image_sligebsligebslig.jpeg', alt: isEn ? 'A finished ESRAA Moments hamper' : 'باقة ESRAA Moments بعد التجهيز' },
          ].map(img => (
            <li key={img.src}>
              <img src={img.src} alt={img.alt} loading="lazy" decoding="async" className="w-full aspect-[4/5] object-cover rounded-2xl" />
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="max-w-2xl mx-auto bg-surface border border-border rounded-2xl p-10 text-center">
          <h2 className="text-xl font-black text-ink mb-3">{t.orderViaWhatsApp}</h2>
          <p className="text-muted text-sm mb-6">{t.orderViaWhatsAppHint}</p>
          {(() => {
            const wa = String(settings.whatsapp || '').replace(/[^\d]/g, '');
            if (!wa) return <span className="btn cursor-not-allowed opacity-70" aria-disabled="true">{t.priceOnContact}</span>;
            return (
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" aria-label={t.orderViaWhatsApp} className="btn primary inline-flex items-center gap-2">
                <MessageCircle size={18} aria-hidden="true" /> {t.orderViaWhatsApp}
              </a>
            );
          })()}
        </div>
      </section>
    </>
  );
}

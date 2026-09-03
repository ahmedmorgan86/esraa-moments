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
          <span className="eyebrow">{content.storyEyebrow}</span>
          <h1 className="text-[clamp(28px,4vw,44px)] font-black mt-2 mb-4">{isEn ? content.storyTitleEn : content.storyTitle}</h1>
          <p className="italic text-primary text-xl mb-6">"{isEn ? content.storyQuoteEn : content.storyQuote}"</p>
          <p className="text-muted leading-relaxed">{isEn ? content.storyTextEn : content.storyText}</p>
        </div>
      </section>

      {/* Story images */}
      <section className="section">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <img src="/images/Gemini_Generated_Image_ehh0puehh0puehh0.jpeg" alt="" className="w-full aspect-[4/5] object-cover rounded-2xl" />
          <img src="/images/Gemini_Generated_Image_sligebsligebslig.jpeg" alt="" className="w-full aspect-[4/5] object-cover rounded-2xl" />
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="max-w-2xl mx-auto bg-surface border border-border rounded-2xl p-10 text-center">
          <h2 className="text-xl font-black text-ink mb-3">{isEn ? 'Order through WhatsApp' : 'اطلب عبر واتساب'}</h2>
          <p className="text-muted text-sm mb-6">{isEn ? 'Contact us and agree on the details and price for your custom order.' : 'تواصل معنا ونتفق على التفاصيل والسعر للطلب الخاص بك.'}</p>
          <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noopener noreferrer" className="btn primary inline-flex items-center gap-2">
            <MessageCircle size={18} /> {t.orderViaWhatsApp}
          </a>
        </div>
      </section>
    </>
  );
}

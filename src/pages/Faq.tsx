import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useHomepageContent } from '../lib/homepageContent';

export default function Faq({ t, lang }: { t: any; lang: string }) {
  const isEn = lang === 'en';
  const [content] = useHomepageContent();

  return (
    <section className="section page">
      <div className="text-center max-w-2xl mx-auto mb-10 animate-[fadeUp_0.6s_ease_both]">
        <span className="eyebrow">{t.faqEyebrow}</span>
        <h1 className="text-[clamp(28px,4vw,44px)] font-black mt-2">{t.faqTitle}</h1>
        <p className="text-muted mt-3">{isEn ? 'Common questions and their answers.' : 'أسئلة شائعة وإجاباتها.'}</p>
      </div>

      <div className="max-w-[760px] mx-auto flex flex-col gap-3">
        {content.faqs.length === 0 && (
          <p className="text-muted text-center py-10">{isEn ? 'No FAQs yet.' : 'مفيش أسئلة شائعة بعد.'}</p>
        )}
        {content.faqs.map((faq, i) => (
          <FaqItem key={i} q={isEn ? faq.q_en : faq.q} a={isEn ? faq.a_en : faq.a} />
        ))}
      </div>
    </section>
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

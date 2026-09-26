import { useState, useId } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useHomepageContent } from '../lib/homepageContent';

export default function Faq({ t, lang }: { t: any; lang: string }) {
  const isEn = lang === 'en';
  const [content] = useHomepageContent();

  // Defensive: a row with no question in the active language rendered an
  // empty, focusable button.
  const faqs = (content.faqs || []).filter(f => String(isEn ? f.q_en : f.q || '').trim());

  return (
    <section className="section page">
      <div className="text-center max-w-2xl mx-auto mb-10 animate-[fadeUp_0.6s_ease_both]">
        <span className="eyebrow">{t.faqEyebrow}</span>
        <h1 className="text-[clamp(28px,4vw,44px)] font-black mt-2">{t.faqTitle}</h1>
        <p className="text-muted mt-3">{t.faqDesc}</p>
      </div>

      <div className="max-w-[760px] mx-auto flex flex-col gap-3">
        {faqs.length === 0 && (
          <p className="text-muted text-center py-10">{t.faqNone}</p>
        )}
        {faqs.map((faq, i) => (
          <FaqItem key={`${i}-${String(isEn ? faq.q_en : faq.q).slice(0, 24)}`} q={isEn ? faq.q_en : faq.q} a={isEn ? faq.a_en : faq.a} />
        ))}
      </div>
    </section>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className={`bg-surface border rounded-lg overflow-hidden transition-colors ${open ? 'border-primary' : 'border-border'}`}>
      <h3>
        <button
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="w-full px-6 py-4.5 flex items-center justify-between gap-4 text-start font-bold hover:bg-primary/4 transition-colors"
          type="button"
        >
          <span className="text-sm">{q}</span>
          <ChevronLeft size={18} aria-hidden="true" className={`text-muted flex-shrink-0 transition-transform ${open ? '-rotate-90' : ''}`} />
        </button>
      </h3>
      {open && (
        <div id={panelId} role="region" className="px-6 pb-4.5 text-muted text-[13.5px] leading-relaxed whitespace-pre-wrap break-words">
          {a}
        </div>
      )}
    </div>
  );
}

import { Phone, Mail, MapPin, MessageCircle, Link2 } from 'lucide-react';
import { useStoreSettings } from '../hooks';

export default function Contact({ t, lang }: { t: any; lang: string }) {
  const isEn = lang === 'en';
  const settings = useStoreSettings();
  const waNumber = String(settings.whatsapp || '').replace(/[^\d]/g, '');
  const email = String(settings.email || '').trim();
  const address = String(settings.address || '').trim();

  // Entries with nothing configured were still rendered as clickable cards,
  // producing tel:/mailto: links with an empty value.
  const items = [
    waNumber && { icon: Phone, label: isEn ? 'Phone / WhatsApp' : 'الهاتف / واتساب', value: settings.whatsapp, href: `tel:+${waNumber}` },
    waNumber && { icon: MessageCircle, label: isEn ? 'WhatsApp' : 'واتساب', value: settings.whatsapp, href: `https://wa.me/${waNumber}` },
    email && { icon: Mail, label: t.emailLabel, value: email, href: `mailto:${email}` },
    address && { icon: MapPin, label: t.addressLabelAdmin, value: address, href: null },
    { icon: Link2, label: 'Instagram', value: '@esraamoments', href: 'https://www.instagram.com/esraamoments' },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string; href: string | null }[];

  const card = 'bg-surface border border-border rounded-2xl p-6 transition-all flex flex-col items-start gap-3';
  const hover = 'hover:border-primary hover:-translate-y-0.5 hover:shadow-md';

  return (
    <section className="section page">
      <div className="text-center max-w-2xl mx-auto mb-10 animate-[fadeUp_0.6s_ease_both]">
        <span className="eyebrow">{t.contactUs}</span>
        <h1 className="text-[clamp(28px,4vw,44px)] font-black mt-2">{t.contactUs}</h1>
        <p className="text-muted mt-3">{t.contactDesc}</p>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto list-none">
        {items.map(({ icon: I, label, value, href }) => {
          const inner = (
            <>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <I size={22} className="text-primary" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-[12px] text-muted font-semibold">{label}</div>
                <div className="text-[15px] font-bold text-ink mt-0.5 break-words" dir="auto">{value}</div>
              </div>
            </>
          );
          return (
            <li key={label} className="contents">
              {/* The address card has no destination, so it must not be an
                  <a> without href: that is invalid HTML and is skipped by
                  keyboard and screen-reader users entirely. */}
              {href ? (
                <a
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className={`${card} ${hover}`}
                >
                  {inner}
                </a>
              ) : (
                <div className={card}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

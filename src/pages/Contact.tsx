import { Phone, Mail, MapPin, MessageCircle, Link2 } from 'lucide-react';
import { useStoreSettings } from '../hooks';

export default function Contact({ t, lang }: { t: any; lang: string }) {
  const isEn = lang === 'en';
  const settings = useStoreSettings();

  const items = [
    { icon: Phone, label: isEn ? 'Phone / WhatsApp' : 'الهاتف / واتساب', value: settings.whatsapp, href: `tel:${settings.whatsapp}` },
    { icon: MessageCircle, label: isEn ? 'WhatsApp' : 'واتساب', value: settings.whatsapp, href: `https://wa.me/${settings.whatsapp}` },
    { icon: Mail, label: t.emailLabel, value: settings.email, href: `mailto:${settings.email}` },
    { icon: MapPin, label: t.addressLabelAdmin, value: settings.address },
    { icon: Link2, label: 'Instagram', value: '@esraamoments', href: 'https://www.instagram.com/esraamoments' },
  ];

  return (
    <section className="section page">
      <div className="text-center max-w-2xl mx-auto mb-10 animate-[fadeUp_0.6s_ease_both]">
        <span className="eyebrow">{t.contactUs}</span>
        <h1 className="text-[clamp(28px,4vw,44px)] font-black mt-2">{t.contactUs}</h1>
        <p className="text-muted mt-3">{t.contactDesc}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
        {items.map(({ icon: I, label, value, href }) => (
          <a
            key={label}
            href={href}
            target={href?.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="bg-surface border border-border rounded-2xl p-6 hover:border-primary hover:-translate-y-0.5 hover:shadow-md transition-all flex flex-col items-start gap-3"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <I size={22} className="text-primary" />
            </div>
            <div>
              <div className="text-[12px] text-muted font-semibold">{label}</div>
              <div className="text-[15px] font-bold text-ink mt-0.5 break-all" dir="ltr" style={{ textAlign: isEn ? 'left' : 'right' }}>{value}</div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

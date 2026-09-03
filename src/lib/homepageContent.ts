import { useState, useEffect } from 'react';

export interface HomepageContent {
  heroEyebrow: string;
  heroTitle1: string;
  heroTitle1En: string;
  heroTitle2: string;
  heroTitle2En: string;
  heroDesc: string;
  heroDescEn: string;
  heroCta: string;
  heroCtaEn: string;
  heroOverlay1: string;
  heroOverlay1En: string;
  heroOverlay2: string;
  heroOverlay2En: string;

  storyEyebrow: string;
  storyEyebrowEn: string;
  storyTitle: string;
  storyTitleEn: string;
  storyQuote: string;
  storyQuoteEn: string;
  storyText: string;
  storyTextEn: string;

  faqs: { q: string; q_en: string; a: string; a_en: string }[];
}

export const defaultHomepageContent: HomepageContent = {
  heroEyebrow: 'تصاميم فريدة لكل مناسبة',
  heroTitle1: 'لحظاتكم المميزة',
  heroTitle1En: 'Your Special Moments',
  heroTitle2: 'تستحق أجمل تفاصيل',
  heroTitle2En: 'Deserve The Finest Details',
  heroDesc: 'من الفكرة للتنفيذ... نصنع توزيعات وهدايا تنطق بالمشاعر وتخلد أحدث الذكريات في خطوبة، زفاف، سبوع وكل مناسباتكم السعيدة.',
  heroDescEn: 'From concept to execution... We craft favors and gifts that speak emotion and immortalize memories for engagements, weddings, baby showers, and all your happy occasions.',
  heroCta: 'استعرض المتجر',
  heroCtaEn: 'Browse Shop',
  heroOverlay1: 'توزيعات مصممة خصيصاً',
  heroOverlay1En: 'Custom Designed Favors',
  heroOverlay2: 'جودة تليق بمناسبتكم',
  heroOverlay2En: 'Quality Worthy of Your Event',

  storyEyebrow: 'قصتنا',
  storyEyebrowEn: 'Our Story',
  storyTitle: 'من القلب... للتنفيذ',
  storyTitleEn: 'From The Heart... To Execution',
  storyQuote: 'كل تفصيلة صغيرة وراءها حكاية حب واهتمام تجعل لحظتكم لا تُنسى.',
  storyQuoteEn: 'Every small detail carries a story of love and care that makes your moment unforgettable.',
  storyText: 'إسرا مومنتس بدأت بشغف تحويل المناسبات البسيطة إلى لوحات فنية متكاملة. نؤمن أن الهدية أو التوزيعة ليست مجرد قطعة، بل رسالة حب وتقدير لكل ضيف يشارككم فرحتكم.',
  storyTextEn: 'Esraa Moments started with a passion to turn simple occasions into complete works of art. We believe a gift is not just an item, but a message of love and appreciation.',

  faqs: [
    { q: 'بتوصلوا لكل مصر؟', q_en: 'Do you ship all over Egypt?', a: 'أيوه، بنوصلكم في كل المحافظات. التوصيل بيوصل خلال 2-5 أيام عمل حسب المحافظة.', a_en: 'Yes, we deliver to all governorates. Delivery takes 2-5 business days depending on the governorate.' },
    { q: 'ممكن أعمل تخصيص للتوزيعات؟', q_en: 'Can I customize the favors?', a: 'طبعاً! بنعمل تخصيص كامل — اسم، ألوان، تصميم خاص. تواصل معانا على الواتساب ونتفق.', a_en: 'Of course! We offer full customization — name, colors, special design. Contact us on WhatsApp to agree.' },
    { q: 'إيه سياسة الإرجاع؟', q_en: 'What is the return policy?', a: 'لو المنتج وصل بعيب، بنستبدله أو برجعلك الفلوس خلال 7 أيام من الاستلام.', a_en: 'If the product arrives defective, we replace it or refund within 7 days of delivery.' },
    { q: 'بتدفعوا إزاي؟', q_en: 'What payment methods are available?', a: 'الدفع عند الاستلام، فودافون كاش، أو instaPay. ممكن كمان تحول على البنك.', a_en: 'Cash on delivery, Vodafone Cash, or InstaPay. You can also make a bank transfer.' },
    { q: 'إيه الحد الأدنى للطلبات؟', q_en: 'What is the minimum order quantity?', a: 'مفيش حد أدنى للطلبات الفردية. بس الطلبات الكبيرة (50 قطعة وفوق) عليها خصم خاص.', a_en: 'No minimum for individual orders. But large orders (50+ pieces) get a special discount.' },
  ],
};

export function useHomepageContent() {
  const [content, setContent] = useState<HomepageContent>(() => {
    try {
      const saved = localStorage.getItem('em-homepage-content');
      return saved ? { ...defaultHomepageContent, ...JSON.parse(saved) } : defaultHomepageContent;
    } catch {
      return defaultHomepageContent;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('em-homepage-content', JSON.stringify(content));
    } catch {}
  }, [content]);

  return [content, setContent] as const;
}

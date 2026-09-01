export type Product = {
  id: string; name: string; name_en?: string; category: string;
  price: number; stock: number; image: string;
  desc: string; desc_en?: string; featured?: boolean; isStartingFrom?: boolean;
};
export type CartItem = Product & { qty: number };
export type Design = {
  occasion: string; type: string; qty: number;
  color: string; name: string; date: string; extras: string;
};
export type Coupon = {
  id: string; code: string; discount: number; type: 'percent' | 'fixed';
  maxUsage: number; usageCount: number; minOrder: number;
  expiry: string; active: boolean;
};
export type Order = {
  id: string; order_number: string; customer_name: string; customer_phone: string;
  customer_email: string; city: string; address: string; occasion: string;
  notes: string; payment_method: string; subtotal: number; shipping_fee: number;
  total: number; status: string; payment_status: string;
  payment_proof?: string; created_at: string;
};
export type Customer = { name: string; email: string; phone: string; ordersCount: number; totalSpent: number };

export const occasions = [
  'سبوع', 'خطوبة', 'حنة', 'كتب كتاب', 'زفاف',
  'عيد ميلاد', 'تخرج', 'استقبال مولود', 'رمضان', 'عيد', 'توزيعات شركات'
];

export const PALETTES: Record<string, { bg: string; deep: string; soft: string }> = {
  'آيفوري وذهبي': { bg: '#fdfaf3', deep: '#a97c50', soft: '#efe2cb' },
  'وردي ذهبي': { bg: '#fdf3f1', deep: '#b96a60', soft: '#f4d9d3' },
  'أبيض وفضي': { bg: '#f9fafb', deep: '#8b95a1', soft: '#dfe3e8' },
  'كحلي وذهبي': { bg: '#eff2f8', deep: '#33415e', soft: '#d5dcec' }
};

export const seed: Product[] = [
  { id: 'p1', name: 'توزيعة سبوع الدبدوب الملكي', name_en: 'Royal Teddy Baby Shower Favor', category: 'سبوع', price: 35, stock: 120, image: '/images/Gemini_Generated_Image_wh7xokwh7xokwh7x.jpeg', desc: 'مجسم دبدوب فاخر مع زجاجة مسك أبيض وكرت ترحيب بالطفل.', desc_en: 'Luxury teddy bear figurine with white musk bottle and baby welcome card.', featured: true },
  { id: 'p2', name: 'توزيعة سبوع الحوت والسبحة', name_en: 'Whale & Tasbeeh Baby Shower Favor', category: 'سبوع', price: 30, stock: 150, image: '/images/Gemini_Generated_Image_sligebsligebslig.jpeg', desc: 'عداد تسبيح رقمي مع شوكولاتة مستوردة في علبة أنيقة.', desc_en: 'Digital prayer counter with imported chocolates in an elegant box.', featured: true },
  { id: 'p3', name: 'عقد اللؤلؤ والخطوبة الكلاسيكي', name_en: 'Classic Pearl Engagement Favor', category: 'خطوبة', price: 36, stock: 60, image: '/images/Gemini_Generated_Image_p97awfp97awfp97a.jpeg', desc: 'كرت عريض برسمة خاتم الخطوبة مع سوار أنيق من اللؤلؤ.', desc_en: 'Wide card featuring a ring illustration with an elegant pearl bracelet.', featured: true },
  { id: 'p4', name: 'بوكس الأكريليك المذهب للخطوبة', name_en: 'Gold-Acrylic Engagement Box', category: 'خطوبة', price: 42, stock: 40, image: '/images/Gemini_Generated_Image_p2yjpfp2yjpfp2yj.jpeg', desc: 'علبة أكريليك فاخرة بداخلها شوكولاتة ومسك مع شريطة ذهبية.', desc_en: 'Premium acrylic box with chocolates, musk and a golden ribbon.', featured: true },
  { id: 'p5', name: 'توزيعات حنة الورود المخملية', name_en: 'Velvet Rose Henna Favor', category: 'حنة', price: 28, stock: 80, image: '/images/Gemini_Generated_Image_wl5xnywl5xnywl5x.jpeg', desc: 'كرت فاخر بتصميم يدوي مع شوكولاتة قلب حمراء وزهور مجففة.', desc_en: 'Handcrafted luxury card with red heart chocolate and dried flowers.', featured: true },
  { id: 'p6', name: 'مانيكير وفراشة الحنة ثلاثية الأبعاد', name_en: '3D Butterfly & Manicure Henna Favor', category: 'حنة', price: 26, stock: 60, image: '/images/Gemini_Generated_Image_vh32ruvh32ruvh32.jpeg', desc: 'طلاء أظافر بألوان أنثوية مع أجنحة فراشة مفرغة يدوياً.', desc_en: 'Feminine-tone nail polish with hand-cut butterfly wings.', featured: true },
  { id: 'p7', name: 'مسك الختام والعود الملكي', name_en: 'Royal Oud & Musk Favor', category: 'كتب كتاب', price: 38, stock: 70, image: '/images/Gemini_Generated_Image_vkeew8vkeew8vkee.jpeg', desc: 'زجاجة عطرية كريستالية مع كرت شكر وتقدير لضيوف كتب الكتاب.', desc_en: 'Crystal fragrance bottle with a thank-you card for Katb Ktab guests.', featured: true },
  { id: 'p8', name: 'شموع الصويا الطبيعية باللؤلؤ', name_en: 'Pearl Soy Candles', category: 'كتب كتاب', price: 45, stock: 50, image: '/images/Gemini_Generated_Image_q2ritlq2ritlq2ri.jpeg', desc: 'شمعة صويا معطرة بعبير الياسمين مزينة بحبات لؤلؤ وشريط ساتان.', desc_en: 'Jasmine-scented soy candle adorned with pearls and satin ribbon.', featured: true },
  { id: 'p9', name: 'مروحة ورقية مذهبة للزفاف', name_en: 'Gilded Paper Wedding Fan', category: 'زفاف', price: 35, stock: 100, image: '/images/Gemini_Generated_Image_w92zqyw92zqyw92z.jpeg', desc: 'مروحة ورقية بتطريز وردي وطباعة أسماء العروسين بماء الذهب.', desc_en: "Paper fan with rose embroidery and the couple's names in gold ink.", featured: true },
  { id: 'p10', name: 'بوكس زفاف الورد والذهب', name_en: 'Rose & Gold Wedding Box', category: 'زفاف', price: 50, stock: 20, image: '/images/Gemini_Generated_Image_ehh0puehh0puehh0.jpeg', desc: 'بوكس هدية كبير بلمسات روز جولد وزهور طبيعية.', desc_en: 'Large gift box with rose-gold touches and natural flowers.', featured: true },
  { id: 'p11', name: 'توزيعات عيد الميلاد بالبالون والكرت', name_en: 'Balloon & Card Birthday Favor', category: 'عيد ميلاد', price: 25, stock: 90, image: '/images/Gemini_Generated_Image_o7uafio7uafio7ua.jpeg', desc: 'شوكولاتة مخصصة مع كرت عيد ميلاد مرح وملون.', desc_en: 'Custom chocolate with a cheerful colorful birthday card.', featured: true },
  { id: 'p12', name: 'توزيعات التخرج بقبعة الأكاديمية', name_en: 'Graduation Cap Favor', category: 'تخرج', price: 32, stock: 75, image: '/images/Gemini_Generated_Image_o2jvt3o2jvt3o2jv.jpeg', desc: 'مجسم قبعة تخرج مع بطاقة تهنئة وخريطة إنجاز.', desc_en: 'Graduation cap figurine with a congratulation card and achievement map.', featured: true },
  { id: 'p13', name: 'استقبال مولود زهور ولبان دكر', name_en: 'New Baby Flowers & Frankincense Favor', category: 'استقبال مولود', price: 30, stock: 110, image: '/images/Gemini_Generated_Image_pbsa2xpbsa2xpbsa.jpeg', desc: 'توزيعات أنيقة للمستشفى والتهنئة بالمولود الجديد.', desc_en: 'Elegant hospital-visit favors celebrating the newborn.', featured: true },
  { id: 'p14', name: 'فانوس رمضان والأذكار الفاخرة', name_en: 'Ramadan Lantern & Prayers Favor', category: 'رمضان', price: 40, stock: 130, image: '/images/Gemini_Generated_Image_i6nilyi6nilyi6ni.jpeg', desc: 'فانوس أكريليك مصغر مع بطاقة أدعية رمضانية.', desc_en: 'Miniature acrylic lantern with Ramadan prayers card.', featured: true },
  { id: 'p15', name: 'عيدية العيد الفاخرة في مغلف مذهب', name_en: 'Deluxe Eidi Gold Envelope', category: 'عيد', price: 20, stock: 200, image: '/images/Gemini_Generated_Image_hlt09bhlt09bhlt0.jpeg', desc: 'مغلف عيدية مطبوع بعبارات العيد السعيد وتصميم راقٍ.', desc_en: 'Eidi envelope printed with festive greetings in a refined design.', featured: true },
  { id: 'p16', name: 'توزيعات الشركات وهدايا العملاء', name_en: 'Corporate & Client Gifts', category: 'توزيعات شركات', price: 60, stock: 90, image: '/images/Gemini_Generated_Image_etc9loetc9loetc9.jpeg', desc: 'علبة هدايا رسمية بشعار الشركة ومنتجات عطرية فاخرة.', desc_en: 'Official gift box with company branding and premium fragrances.', featured: true },
];

const FREE_SHIPPING_OVER = 500;
const SHIPPING_FEE = 60;

export function calcShipping(subtotal: number) {
  return subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FEE;
}

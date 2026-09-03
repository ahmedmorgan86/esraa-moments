import { Link } from 'react-router-dom';
import { MessageCircle, Trash2, Heart } from 'lucide-react';
import { occasionEn } from '../i18n';
import { useStoreSettings } from '../hooks';

export default function WishlistPage({ t, lang, products, wishlist, toggleWishlist }: { t: any; lang: string; products: any[]; wishlist: string[]; toggleWishlist: (id: string) => void }) {
  const isEn = lang === 'en';
  const settings = useStoreSettings();
  const wishlistProducts = products.filter(p => wishlist.includes(p.id));

  if (wishlistProducts.length === 0) {
    return (
      <section className="section page flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="w-20 h-20 rounded-full bg-primary/8 flex items-center justify-center mb-5">
          <Heart size={32} className="text-primary" />
        </div>
        <h1 className="text-2xl font-black text-ink mb-2">{t.wishlistEmpty}</h1>
        <p className="text-muted text-sm mb-6">{t.wishlistEmptyDesc}</p>
        <Link to="/shop" className="btn primary">{t.continueShopping}</Link>
      </section>
    );
  }

  return (
    <section className="section page">
      <div className="mb-8 animate-[fadeUp_0.6s_ease_both]">
        <span className="eyebrow">{t.wishlist}</span>
        <h1 className="text-[clamp(24px,3.2vw,38px)] font-black">{t.wishlist}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {wishlistProducts.map((p, i) => (
          <div key={p.id} className="animate-[fadeUp_0.4s_ease_both]" style={{ animationDelay: `${i * 0.04}s` }}>
            <div className="group bg-surface border border-border rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all">
              <Link to={`/product/${p.id}`} className="block">
                <div className="relative aspect-square overflow-hidden bg-surface-alt">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                  <span className="absolute bottom-3 start-3 z-10 bg-surface/85 backdrop-blur-md border border-white/20 rounded-full px-3 py-1 text-[11px] font-bold">{isEn ? occasionEn[p.category] || p.category : p.category}</span>
                </div>
                <div className="p-4">
                  <h3 className="text-[14px] font-bold line-clamp-2 mb-1">{isEn && p.name_en ? p.name_en : p.name}</h3>
                </div>
              </Link>
                <div className="px-4 pb-4 flex gap-2">
                  <a
                    href={`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(`${isEn ? 'I want to order' : 'عايز أطلب'}: ${isEn && p.name_en ? p.name_en : p.name}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-[#25d366] text-white px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
                  >
                    <MessageCircle size={14} /> {t.orderViaWhatsApp}
                  </a>
                  <button onClick={() => toggleWishlist(p.id)} className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-all text-muted hover:text-red-500" type="button">
                    <Trash2 size={16} />
                  </button>
                </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

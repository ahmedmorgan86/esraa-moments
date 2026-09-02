import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, ArrowLeft, Star, Truck, Shield, RotateCcw } from 'lucide-react';
import { occasionEn } from '../i18n';

export default function ProductPage({ t, lang, addToCart, products }: { t: any; lang: string; addToCart: (p: any, qty?: number) => void; products: any[] }) {
  const { id } = useParams();
  const [qty, setQty] = useState(1);
  const product = products.find(p => p.id === id);
  const related = useMemo(() => products.filter(p => p.id !== id && p.category === product?.category).slice(0, 4), [id, product]);
  const isEn = lang === 'en';

  if (!product) {
    return (
      <div className="section page flex flex-col items-center justify-center min-h-[50vh] text-center">
        <h1 className="text-2xl font-bold text-ink mb-3">{isEn ? 'Product not found' : 'المنتج مش موجود'}</h1>
        <Link to="/shop" className="btn primary">{t.backToShop}</Link>
      </div>
    );
  }

  const name = isEn && product.name_en ? product.name_en : product.name;
  const desc = isEn && product.desc_en ? product.desc_en : product.desc;
  const catLabel = isEn ? occasionEn[product.category] || product.category : product.category;

  return (
    <>
      <section className="section page">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Image */}
          <div className="relative rounded-2xl overflow-hidden bg-surface-alt border border-border animate-[fadeUp_0.6s_ease_both]">
            <img src={product.image} alt={name} className="w-full aspect-square object-cover" />
            <span className="absolute top-4 end-4 bg-surface/85 backdrop-blur-md border border-white/20 rounded-full px-3 py-1 text-[11px] font-bold">{catLabel}</span>
          </div>

          {/* Details */}
          <div className="animate-[fadeUp_0.6s_ease_both_0.1s]">
            <Link to="/shop" className="inline-flex items-center gap-1.5 text-primary text-[13px] font-semibold hover:underline mb-4">
              <ArrowLeft size={14} /> {t.backToShop}
            </Link>

            <h1 className="text-[clamp(22px,3vw,32px)] font-black mb-2">{name}</h1>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-0.5 text-amber-500">
                {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="currentColor" />)}
              </div>
              <span className="text-muted text-[12px]">(47 {t.reviews})</span>
            </div>

            <span className="text-gradient font-extrabold text-3xl block mb-5">{product.price} {t.currency}</span>

            <p className="text-muted text-[15px] leading-relaxed mb-7">{desc}</p>

            <div className="flex items-center gap-3 mb-7">
              <div className="inline-flex items-center gap-2 bg-surface border border-border rounded-full px-3 py-1.5">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="p-1 hover:bg-primary/8 rounded-full transition-colors"><Minus size={18} /></button>
                <span className="min-w-[28px] text-center font-bold text-lg">{qty}</span>
                <button onClick={() => setQty(q => q + 1)} className="p-1 hover:bg-primary/8 rounded-full transition-colors"><Plus size={18} /></button>
              </div>
              <button onClick={() => addToCart(product, qty)} className="btn primary flex-1 flex items-center justify-center gap-2">
                <ShoppingCart size={18} /> {t.addToCart}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-7">
              {[
                { icon: Truck, label: t.shippingInfo, sub: t.shippingDays },
                { icon: Shield, label: t.guarantee, sub: t.guaranteePct },
                { icon: RotateCcw, label: t.returns, sub: t.returnsDays },
              ].map(({ icon: I, label, sub }) => (
                <div key={label} className="bg-surface border border-border rounded-xl p-3 text-center">
                  <I size={20} className="mx-auto text-primary mb-1.5" />
                  <div className="text-[11px] font-bold text-ink">{label}</div>
                  <div className="text-[10.5px] text-muted">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="section">
          <h2 className="text-[clamp(22px,3vw,30px)] font-black mb-7">{t.relatedTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map(p => (
              <Link key={p.id} to={`/product/${p.id}`} className="group block bg-surface border border-border rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all">
                <div className="aspect-square overflow-hidden bg-surface-alt">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                </div>
                <div className="p-4">
                  <h3 className="text-[14px] font-bold line-clamp-2 mb-1">{isEn && p.name_en ? p.name_en : p.name}</h3>
                  <span className="text-gradient font-extrabold text-lg">{p.price} {t.currency}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

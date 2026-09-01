import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Minus, Plus, ShoppingCart, ArrowLeft, Star, Truck, Shield, RotateCcw } from 'lucide-react';
import { seed } from '../data';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

export default function ProductPage({ t, addToCart }: { t: any; addToCart: (p: any, qty?: number) => void }) {
  const { id } = useParams();
  const [qty, setQty] = useState(1);
  const product = seed.find(p => p.id === id);
  const related = useMemo(() => seed.filter(p => p.id !== id && p.category === product?.category).slice(0, 4), [id, product]);

  if (!product) {
    return (
      <div className="section page flex flex-col items-center justify-center min-h-[50vh] text-center">
        <h1 className="text-2xl font-bold text-ink mb-3">المنتج مش موجود</h1>
        <Link to="/shop" className="btn primary">الرجوع للمتجر</Link>
      </div>
    );
  }

  return (
    <>
      <section className="section">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Image */}
          <motion.div className="relative rounded-2xl overflow-hidden bg-surface-alt border border-border" initial="hidden" animate="visible" variants={fadeUp}>
            <img src={product.image} alt={product.name} className="w-full aspect-square object-cover" />
            <span className="absolute top-4 end-4 bg-white/85 dark:bg-black/70 backdrop-blur-md border border-white/20 rounded-full px-3 py-1 text-[11px] font-bold">{product.category}</span>
          </motion.div>

          {/* Details */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <Link to="/shop" className="inline-flex items-center gap-1.5 text-primary text-[13px] font-semibold hover:underline mb-4">
              <ArrowLeft size={14} /> العودة للمتجر
            </Link>

            <h1 className="text-[clamp(22px,3vw,32px)] font-black mb-2">{product.name}</h1>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-0.5 text-amber-500">
                {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="currentColor" />)}
              </div>
              <span className="text-muted text-[12px]">(47 تقييم)</span>
            </div>

            <span className="text-gradient font-extrabold text-3xl block mb-5">{product.price} ج.م</span>

            <p className="text-muted text-[15px] leading-relaxed mb-7">{product.desc || product.shortDesc || 'تفاصيل المنتج...'}</p>

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
                { icon: Truck, label: t.shipping, sub: '2-5 أيام' },
                { icon: Shield, label: 'ضمان', sub: '100%' },
                { icon: RotateCcw, label: 'استبدال', sub: '7 أيام' },
              ].map(({ icon: I, label, sub }) => (
                <div key={label} className="bg-surface border border-border rounded-xl p-3 text-center">
                  <I size={20} className="mx-auto text-primary mb-1.5" />
                  <div className="text-[11px] font-bold text-ink">{label}</div>
                  <div className="text-[10.5px] text-muted">{sub}</div>
                </div>
              ))}
            </div>

            {product.priceMin && product.priceMax && (
              <div className="text-muted text-[13px]">
                <span className="font-semibold">نطاق السعر:</span> {product.priceMin} — {product.priceMax} ج.م (حسب الكمية)
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="section">
          <h2 className="text-[clamp(22px,3vw,30px)] font-black mb-7">منتجات مشابهة</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map(p => (
              <Link key={p.id} to={`/product/${p.id}`} className="group block bg-surface border border-border rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all">
                <div className="aspect-square overflow-hidden bg-surface-alt">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                </div>
                <div className="p-4">
                  <h3 className="text-[14px] font-bold line-clamp-2 mb-1">{p.name}</h3>
                  <span className="text-gradient font-extrabold text-lg">{p.price} ج.م</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

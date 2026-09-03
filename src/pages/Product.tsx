import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Minus, Plus, ArrowLeft, Star, Truck, Shield, RotateCcw, Heart, MessageCircle } from 'lucide-react';
import { occasionEn } from '../i18n';
import { useStoreSettings } from '../hooks';
import type { Review } from '../data';

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={i <= rating ? 'text-amber-400 fill-amber-400' : 'text-ink/20'} />
      ))}
    </div>
  );
}

export default function ProductPage({ t, lang, products, wishlist, toggleWishlist, reviews, addReview }: { t: any; lang: string; products: any[]; wishlist: string[]; toggleWishlist: (id: string) => void; reviews: Review[]; addReview: (review: Review) => void }) {
  const { id } = useParams();
  const [qty, setQty] = useState(1);
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const settings = useStoreSettings();
  const product = products.find(p => p.id === id);
  const related = useMemo(() => products.filter(p => p.id !== id && p.category === product?.category).slice(0, 4), [id, product]);
  const productReviews = useMemo(() => reviews.filter(r => r.productId === id), [reviews, id]);
  const avgRating = useMemo(() => {
    if (productReviews.length === 0) return 0;
    return productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
  }, [productReviews]);
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
            <button onClick={() => toggleWishlist(product.id)} className="absolute top-4 start-4 w-10 h-10 rounded-full bg-surface/85 backdrop-blur flex items-center justify-center hover:scale-110 transition-transform z-10 shadow-md" type="button">
              {wishlist.includes(product.id) ? <Heart size={20} className="text-red-500 fill-red-500" /> : <Heart size={20} className="text-ink/60" />}
            </button>
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

            <p className="text-muted text-[15px] leading-relaxed mb-7">{desc}</p>

            <div className="bg-surface border border-border rounded-2xl p-5 mb-6">
              <p className="text-[13px] font-bold text-ink mb-1">{t.priceOnContact}</p>
              <p className="text-[12px] text-muted">{t.orderViaWhatsAppHint}</p>
            </div>

            <div className="flex items-center gap-3 mb-7">
              <div className="inline-flex items-center gap-2 bg-surface border border-border rounded-full px-3 py-1.5">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="p-1 hover:bg-primary/8 rounded-full transition-colors"><Minus size={18} /></button>
                <span className="min-w-[28px] text-center font-bold text-lg">{qty}</span>
                <button onClick={() => setQty(q => q + 1)} className="p-1 hover:bg-primary/8 rounded-full transition-colors"><Plus size={18} /></button>
              </div>
              <a
                href={`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(`${isEn ? 'I want to order' : 'عايز أطلب'}: ${name}${isEn ? ' (Quantity: ' : ' (الكمية: '}${qty}${isEn ? ')' : ')'}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn primary flex-1 flex items-center justify-center gap-2"
              >
                <MessageCircle size={18} /> {t.orderViaWhatsApp}
              </a>
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

      {/* Reviews Section */}
      <section className="section border-t border-border pt-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black">{t.reviews || 'التقييمات'} ({productReviews.length})</h2>
            {productReviews.length > 0 && (
              <div className="flex items-center gap-2">
                <StarRating rating={Math.round(avgRating)} />
                <span className="font-bold text-sm">{avgRating.toFixed(1)} / 5</span>
              </div>
            )}
          </div>

          {/* Review List */}
          <div className="space-y-4 mb-8">
            {productReviews.length === 0 ? (
              <p className="text-muted text-sm">{t.noReviewsYet || 'مفيش تقييمات لسه. كن أول من يقيّم المنتج!'}</p>
            ) : (
              productReviews.map(r => (
                <div key={r.id} className="bg-surface border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm">{r.userName}</span>
                    <StarRating rating={r.rating} size={14} />
                  </div>
                  <p className="text-muted text-sm">{r.comment}</p>
                  <span className="text-[10px] text-subtle mt-2 block">{new Date(r.date).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </div>

          {/* Write Review Form */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h3 className="font-bold text-base mb-4">{t.writeReview || 'أضف تقييمك'}</h3>
            {reviewSubmitted ? (
              <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-xl text-center font-bold text-sm">
                {t.reviewSubmitted || 'شكراً لك! تم إرسال تقييمك بنجاح.'}
              </div>
            ) : (
              <form onSubmit={e => {
                e.preventDefault();
                if (!reviewName.trim() || !reviewComment.trim()) return;
                addReview({
                  id: `r${Date.now().toString(36)}`,
                  productId: id || '',
                  userName: reviewName,
                  rating: reviewRating,
                  comment: reviewComment,
                  date: new Date().toISOString(),
                });
                setReviewSubmitted(true);
                setReviewName('');
                setReviewComment('');
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">{t.yourName || 'الاسم'}</label>
                  <input type="text" value={reviewName} onChange={e => setReviewName(e.target.value)} required className="input-field w-full text-sm" placeholder="اسمك..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">{t.rating || 'التقييم'}</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button type="button" key={star} onClick={() => setReviewRating(star)} className="p-1">
                        <Star size={24} className={star <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-ink/20'} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">{t.yourReview || 'التعليق'}</label>
                  <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} required rows={3} className="input-field w-full text-sm" placeholder="اكتب رأيك في المنتج..." />
                </div>
                <button type="submit" className="btn primary">{t.submitReview || 'إرسال التقييم'}</button>
              </form>
            )}
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

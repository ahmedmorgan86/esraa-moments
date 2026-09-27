import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Minus, Plus, ArrowLeft, Star, Truck, Shield, RotateCcw, Heart, MessageCircle } from 'lucide-react';
import { occasionEn } from '../i18n';
import { useStoreSettings } from '../hooks';
import { validateCouponRemote } from '../lib/storeData';
import { Thumb } from '../components/Thumb';
import type { Review } from '../data';

/** Purely visual star row. The stars were announced individually as empty
 *  graphics, so the rating is now exposed as a single labelled image and the
 *  SVGs themselves are hidden. */
function StarRating({ rating, size = 16, label }: { rating: number; size?: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label || `${rating} / 5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} aria-hidden="true" className={i <= rating ? 'text-amber-400 fill-amber-400' : 'text-ink/20'} />
      ))}
    </span>
  );
}

export default function ProductPage({ t, lang, products, wishlist, toggleWishlist, reviews, addReview }: { t: any; lang: string; products: any[]; wishlist: string[]; toggleWishlist: (id: string) => void; reviews: Review[]; addReview: (review: Review) => void | Promise<any> }) {
  const { id } = useParams();
  const [qty, setQty] = useState(1);
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewShared, setReviewShared] = useState(true);
  // Coupon state. The discount itself is computed by Postgres; this box only
  // asks whether a code is usable and echoes back what the server said.
  const [couponInput, setCouponInput] = useState('');
  const [couponChecking, setCouponChecking] = useState(false);
  const [coupon, setCoupon] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [couponError, setCouponError] = useState('');
  const settings = useStoreSettings();
  const product = products.find(p => p.id === id);
  const related = useMemo(() => products.filter(p => p.id !== id && p.category === product?.category).slice(0, 4), [id, product, products]);
  const productReviews = useMemo(() => reviews.filter(r => r.productId === id), [reviews, id]);
  const avgRating = useMemo(() => {
    if (productReviews.length === 0) return 0;
    return productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
  }, [productReviews]);
  const isEn = lang === 'en';

  const stock = product ? (typeof product.stock === 'number' ? product.stock : (product.inStock === false ? 0 : null)) : null;
  const maxQty = stock && stock > 0 ? stock : 20;

  // Navigating straight from one product to a related one used to keep the
  // previous product's quantity in the WhatsApp message. Resetting during
  // render (rather than in an effect) avoids a wasted render pass.
  const [lastProductId, setLastProductId] = useState(id);
  if (lastProductId !== id) {
    setLastProductId(id);
    setQty(1);
    setReviewSubmitted(false);
    setReviewName('');
    setReviewComment('');
    setReviewRating(5);
  }
  if (qty > maxQty) setQty(maxQty);

  if (!product) {
    return (
      <div className="section page flex flex-col items-center justify-center min-h-[50vh] text-center">
        <h1 className="text-2xl font-bold text-ink mb-3">{t.productNotFound}</h1>
        <Link to="/shop" className="btn primary">{t.backToShop}</Link>
      </div>
    );
  }

  const desc = isEn && product.desc_en ? product.desc_en : product.desc;
  const catLabel = isEn ? occasionEn[product.category] || product.category : product.category;
  const soldOut = stock === 0;
  const wished = wishlist.includes(product.id);
  const waNumber = String(settings.whatsapp || '').replace(/[^\d]/g, '');

  // No product name is shown to customers. The catalogue is browsed as pictures
  // and the shop identifies the item from the slug when the enquiry arrives, so
  // the page heading is the occasion instead. The slug is the only stable
  // identifier the customer can quote back.
  const refCode = product.slug;

  // Estimate used only to price the coupon. Prices are never shown, but the
  // catalogue price still drives min_order, so it stays in the database and out
  // of sight rather than being removed.
  const estimate = (Number(product.price) || 0) * qty;

  // validate_coupon() returns a stable machine reason; it must never reach the
  // customer as-is, or the box would read "not_found" / "exhausted".
  const couponReasonText = (reason: string, minOrder?: number): string => {
    switch (reason) {
      case 'not_found': return t.couponNotFound;
      case 'inactive': return t.couponInactive;
      case 'expired': return t.couponExpired;
      case 'exhausted': return t.couponLimitReached;
      case 'min_order': return minOrder ? `${t.couponMinOrder} ${minOrder} ${isEn ? 'EGP' : 'ج.م'}` : t.couponMinOrder;
      case 'empty': return t.couponInvalid;
      default: return t.couponInvalid;
    }
  };

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponChecking(true);
    setCouponError('');
    const res = await validateCouponRemote(code, estimate);
    setCouponChecking(false);
    if (res === null) {
      setCouponError(t.couponUnavailable);
      return;
    }
    if (!res.valid) {
      setCoupon(null);
      setCouponError(couponReasonText(res.reason, res.min_order));
      return;
    }
    setCoupon({
      code: res.code,
      discount: res.discount,
      label: `${res.code} — ${res.discount} ${isEn ? 'EGP' : 'ج.م'}`,
    });
  };

  const waMessage = [
    `${isEn ? 'I want to order' : 'عايز أطلب'}: ${refCode} (${isEn ? 'Quantity' : 'الكمية'}: ${qty})`,
    coupon ? `${isEn ? 'Discount code' : 'كود الخصم'}: ${coupon.code} (${isEn ? 'discount' : 'خصم'}: ${coupon.discount} ${isEn ? 'EGP' : 'ج.م'})` : '',
  ].filter(Boolean).join('\n');
  const waHref = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`
    : '';

  // Product structured data. React renders <script> children raw, so any "<"
  // in the payload is escaped first to keep the JSON from terminating early.
  //
  // name is the occasion rather than the product name, since no name is
  // published. Google requires a non-empty name, and an empty string marks the
  // entity invalid. offers is kept but carries no price: a price is required
  // inside an Offer, and publishing one would contradict "price on contact".
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: String(catLabel || 'ESRAA Moments'),
    description: String(desc || ''),
    sku: String(product.id),
    image: product.image ? [String(product.image)] : undefined,
    category: catLabel,
    brand: { '@type': 'Brand', name: 'ESRAA Moments' },
    aggregateRating: productReviews.length ? {
      '@type': 'AggregateRating',
      ratingValue: Number(avgRating.toFixed(1)),
      reviewCount: productReviews.length,
    } : undefined,
    offers: {
      '@type': 'Offer',
      availability: soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      seller: { '@type': 'Organization', name: 'ESRAA Moments' },
    },
  };
  const jsonLdSafe = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe }} />

      <section className="section page">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Image */}
          <div className="relative rounded-2xl overflow-hidden bg-surface-alt border border-border animate-[fadeUp_0.6s_ease_both]">
            <Thumb src={product.image} alt="" loading="eager" fetchPriority="high" sizes="(min-width: 1024px) 46vw, 92vw" className="w-full aspect-square object-cover" />
            <span className="absolute top-4 end-4 bg-surface/85 backdrop-blur-md border border-white/20 rounded-full px-3 py-1 text-[11px] font-bold">{catLabel}</span>
            <button
              onClick={() => toggleWishlist(product.id)}
              className="absolute top-4 start-4 w-10 h-10 rounded-full bg-surface/85 backdrop-blur flex items-center justify-center hover:scale-110 transition-transform z-10 shadow-md"
              type="button"
              aria-pressed={wished}
              aria-label={wished ? t.removeFromWishlist : t.addToWishlist}
            >
              <Heart size={20} aria-hidden="true" className={wished ? 'text-red-500 fill-red-500' : 'text-ink/60'} />
            </button>
          </div>

          {/* Details */}
          <div className="animate-[fadeUp_0.6s_ease_both_0.1s]">
            <Link to="/shop" className="inline-flex items-center gap-1.5 text-primary text-[13px] font-semibold hover:underline mb-4">
              <ArrowLeft size={14} aria-hidden="true" className={isEn ? '' : 'rotate-180'} /> {t.backToShop}
            </Link>

            <h1 className="text-[clamp(22px,3vw,32px)] font-black mb-2">{catLabel}</h1>

            <div className="flex items-center gap-2 mb-4">
              {productReviews.length > 0 ? (
                <StarRating rating={avgRating} size={15} label={`${avgRating.toFixed(1)} / 5`} />
              ) : (
                <StarRating rating={0} size={15} label={t.noReviewsYetShort} />
              )}
              <span className="text-muted text-[12px]">({productReviews.length} {t.reviews})</span>
            </div>

            <p className="text-muted text-[15px] leading-relaxed mb-7">{desc}</p>

            <div className="bg-surface border border-border rounded-2xl p-5 mb-6">
              <p className="text-[13px] font-bold text-ink mb-1">{t.priceOnContact}</p>
              <p className="text-[12px] text-muted">{t.orderViaWhatsAppHint}</p>
            </div>

            {soldOut ? (
              <p className="btn w-full cursor-not-allowed opacity-70 mb-7" aria-disabled="true">{t.outOfStock}</p>
            ) : (
              <div className="flex items-center gap-3 mb-7">
                <div className="inline-flex items-center gap-2 bg-surface border border-border rounded-full px-3 py-1.5">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    type="button"
                    disabled={qty <= 1}
                    aria-label={t.decreaseQuantity}
                    className="p-1 hover:bg-primary/8 rounded-full transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    <Minus size={18} aria-hidden="true" />
                  </button>
                  <span className="min-w-[28px] text-center font-bold text-lg" aria-live="polite" aria-label={`${t.quantity}: ${qty}`}>{qty}</span>
                  <button
                    onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                    type="button"
                    disabled={qty >= maxQty}
                    aria-label={t.increaseQuantity}
                    className="p-1 hover:bg-primary/8 rounded-full transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    <Plus size={18} aria-hidden="true" />
                  </button>
                </div>
                {waHref ? (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${t.orderViaWhatsApp} ${refCode}`}
                    className="btn primary flex-1 flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={18} aria-hidden="true" /> {t.orderViaWhatsApp}
                  </a>
                ) : (
                  <span className="btn flex-1 cursor-not-allowed opacity-70" aria-disabled="true">{t.priceOnContact}</span>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 mb-7">
              {[
                { icon: Truck, label: t.shippingInfo, sub: t.shippingDays },
                { icon: Shield, label: t.guarantee, sub: t.guaranteePct },
                { icon: RotateCcw, label: t.returns, sub: t.returnsDays },
              ].map(({ icon: I, label, sub }) => (
                <div key={label} className="bg-surface border border-border rounded-xl p-3 text-center">
                  <I size={20} aria-hidden="true" className="mx-auto text-primary mb-1.5" />
                  <div className="text-[11px] font-bold text-ink">{label}</div>
                  <div className="text-[10.5px] text-muted">{sub}</div>
                </div>
              ))}
            </div>

            {/* Discount code. The box is optional and the amount shown comes
                from the server, never from a local calculation. */}
            <div className="border border-border rounded-xl p-4 mb-7 bg-surface">
              <label htmlFor="coupon-code" className="block text-xs font-semibold text-muted mb-2">
                {t.haveDiscountCode}
              </label>
              <div className="flex gap-2">
                <input
                  id="coupon-code"
                  type="text"
                  value={couponInput}
                  onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                  maxLength={24}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={t.discountCodePlaceholder}
                  className="input-field flex-1 text-sm uppercase"
                />
                {coupon ? (
                  <button type="button" onClick={() => { setCoupon(null); setCouponInput(''); setCouponError(''); }} className="btn text-xs">
                    {t.removeCode}
                  </button>
                ) : (
                  <button type="button" onClick={() => void applyCoupon()} disabled={couponChecking || !couponInput.trim()} className="btn primary text-xs">
                    {couponChecking ? t.checking : t.applyCode}
                  </button>
                )}
              </div>
              {couponError && <p role="alert" className="text-[12px] text-red-600 mt-2">{couponError}</p>}
              {coupon && (
                <p className="text-[12px] text-emerald-700 dark:text-emerald-400 mt-2">
                  {coupon.label} — {t.discountAddedToOrder}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="section border-t border-border pt-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-6">
            <h2 className="text-2xl font-black">{t.reviews} ({productReviews.length})</h2>
            {productReviews.length > 0 && (
              <div className="flex items-center gap-2">
                <StarRating rating={Math.round(avgRating)} label={`${avgRating.toFixed(1)} / 5`} />
                <span className="font-bold text-sm">{avgRating.toFixed(1)} / 5</span>
              </div>
            )}
          </div>

          {/* Review List */}
          <div className="space-y-4 mb-8">
            {productReviews.length === 0 ? (
              <p className="text-muted text-sm">{t.noReviewsYet}</p>
            ) : (
              productReviews.map(r => (
                <article key={r.id} className="bg-surface border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="font-bold text-sm">{r.userName}</span>
                    <StarRating rating={r.rating} size={14} label={`${r.rating} / 5`} />
                  </div>
                  <p className="text-muted text-sm whitespace-pre-wrap break-words">{r.comment}</p>
                  <time className="text-[10px] text-subtle mt-2 block" dateTime={r.date}>
                    {new Date(r.date).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </time>
                </article>
              ))
            )}
          </div>

          {/* Write Review Form */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h3 className="font-bold text-base mb-4">{t.writeReview}</h3>
            {reviewSubmitted ? (
              <div role="status" className="p-4 bg-emerald-500/10 text-emerald-600 rounded-xl text-center font-bold text-sm space-y-1">
                <p>{t.reviewSubmitted}</p>
                <p className="text-[12px] font-normal">{reviewShared ? t.reviewAwaitingApproval : t.reviewSavedLocally}</p>
              </div>
            ) : (
              <form onSubmit={e => {
                e.preventDefault();
                if (!reviewName.trim() || !reviewComment.trim()) return;
                const payload = {
                  id: `r${Date.now().toString(36)}`,
                  productId: id || '',
                  userName: reviewName,
                  rating: reviewRating,
                  comment: reviewComment,
                  date: new Date().toISOString(),
                };
                setReviewName('');
                setReviewComment('');
                setReviewSubmitted(true);
                // The review lands in the moderation queue, so it must not be
                // appended locally — a visitor must not see their own review
                // before an admin approves it.
                void Promise.resolve(addReview(payload)).then(res => {
                  if (res && res.shared === false) setReviewShared(false);
                });
              }} className="space-y-4">
                <div>
                  <label htmlFor="rev-name" className="block text-xs font-semibold text-muted mb-1">{t.yourName}</label>
                  <input id="rev-name" type="text" value={reviewName} onChange={e => setReviewName(e.target.value)} required maxLength={60} autoComplete="name" className="input-field w-full text-sm" placeholder={t.yourNamePlaceholder} />
                </div>
                <div>
                  <span id="rev-rating-label" className="block text-xs font-semibold text-muted mb-1">{t.rating}</span>
                  <div className="flex gap-1" role="radiogroup" aria-labelledby="rev-rating-label">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        type="button"
                        key={star}
                        role="radio"
                        aria-checked={reviewRating === star}
                        aria-label={`${star} / 5`}
                        onClick={() => setReviewRating(star)}
                        className="p-1 rounded transition-transform hover:scale-110"
                      >
                        <Star size={24} aria-hidden="true" className={star <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-ink/20'} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="rev-comment" className="block text-xs font-semibold text-muted mb-1">{t.yourReview}</label>
                  <textarea id="rev-comment" value={reviewComment} onChange={e => setReviewComment(e.target.value)} required maxLength={800} rows={3} className="input-field w-full text-sm" placeholder={t.yourReviewPlaceholder} />
                </div>
                <button type="submit" className="btn primary">{t.submitReview}</button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="section">
          <h2 className="text-[clamp(22px,3vw,30px)] font-black mb-7">{t.relatedTitle}</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 list-none">
            {related.map(p => (
              <li key={p.id}>
                <Link to={`/product/${p.id}`} className="group block h-full bg-surface border border-border rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all">
                  <div className="aspect-square overflow-hidden bg-surface-alt">
                    <Thumb src={p.image} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                  </div>
                  <div className="p-4">
                    <h3 className="text-[14px] font-bold line-clamp-2 mb-1">{isEn ? occasionEn[p.category] || p.category : p.category}</h3>
                    <span className="text-primary text-[12.5px] font-bold">{t.viewDetails} {isEn ? '→' : '←'}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

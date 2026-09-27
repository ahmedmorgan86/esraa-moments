import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, MessageCircle } from 'lucide-react';
import { occasions } from '../data';
import { occasionEn } from '../i18n';
import { useStoreSettings } from '../hooks';
import { Thumb } from '../components/Thumb';

const ALL = '__all__';

/** Accept either the Arabic occasion key (what our own links emit) or its
 *  English label, so a shared/bookmarked /shop?cat= link still filters. */
function resolveCat(raw: string | null): string {
  if (!raw || raw === ALL) return ALL;
  if (raw === 'الكل' || raw.toLowerCase() === 'all') return ALL;
  if (occasions.includes(raw)) return raw;
  const hit = occasions.find(o => (occasionEn[o] || '').toLowerCase() === raw.toLowerCase());
  return hit || ALL;
}

export default function Shop({ t, lang, products }: { t: any; lang: string; products: any[] }) {
  const [params, setParams] = useSearchParams();
  const [cat, setCat] = useState(() => resolveCat(params.get('cat')));
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('default');
  const settings = useStoreSettings();
  const isEn = lang === 'en';
  const locale = isEn ? 'en' : 'ar';

  // Keep the filter in sync when the header/footer links change ?cat= while
  // this page is already mounted (state was previously seeded once and never
  // updated, so the chips and the list could disagree with the URL).
  useEffect(() => { setCat(resolveCat(params.get('cat'))); }, [params]);

  const selectCat = (next: string) => {
    setCat(next);
    const p = new URLSearchParams(params);
    if (next === ALL) p.delete('cat');
    else p.set('cat', isEn ? (occasionEn[next] || next) : next);
    setParams(p, { replace: true });
  };

  const filtered = useMemo(() => {
    // `products` was missing from the dependency list, so the list stayed
    // stuck on the initial empty array until the visitor typed in the search
    // box — products are hydrated from storage after first paint.
    let list = products.filter(Boolean);
    if (cat !== ALL) list = list.filter(p => p.category === cat);
    const q = search.trim().toLowerCase();
    if (q) {
      // Names are not rendered anywhere, but matching on them still lets a
      // customer find a piece by a word they saw elsewhere.
      list = list.filter(p => [p.name, p.name_en, p.desc, p.desc_en, p.category, occasionEn[p.category]]
        .some(v => typeof v === 'string' && v.toLowerCase().includes(q)));
    }
    if (sort === 'name') {
      list.sort((a, b) => String(a.slug || '').localeCompare(String(b.slug || ''), locale, { sensitivity: 'base' }));
    } else if (sort === 'price') {
      list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    }
    return list;
  }, [products, cat, search, sort, isEn, locale]);

  const categories = [ALL, ...occasions];

  return (
    <section className="section page">
      <div className="mb-8 animate-[fadeUp_0.6s_ease_both]">
        <span className="eyebrow">{t.shop}</span>
        <h1 className="text-[clamp(24px,3.2vw,38px)] font-black">{t.shop} — {t.shopAllFavors}</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3.5 mb-7">
        <div className="flex-1 min-w-[260px] flex items-center gap-2.5 px-4 py-3 bg-surface border border-border rounded-lg">
          <Search size={16} className="text-muted flex-shrink-0" aria-hidden="true" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.searchProducts}
            aria-label={t.searchProducts}
            type="search"
            className="w-full text-[13.5px] outline-none bg-transparent"
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-3 bg-surface border border-border rounded-lg">
          <SlidersHorizontal size={14} className="text-muted" aria-hidden="true" />
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            aria-label={t.sortBy}
            className="text-[13.5px] cursor-pointer outline-none bg-transparent"
          >
            <option value="default">{t.sortBy}</option>
            <option value="name">{isEn ? 'Code: A-Z' : 'الكود: أ-ي'}</option>
            <option value="price">{isEn ? 'Price: low to high' : 'السعر: من الأقل للأعلى'}</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2.5 mb-7">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => selectCat(c)}
            aria-pressed={cat === c}
            className={`px-5 py-2.5 rounded-full text-[12.5px] font-bold whitespace-nowrap border transition-all ${cat === c ? 'bg-ink text-surface-alt border-ink' : 'bg-surface border-border text-muted hover:border-primary hover:text-primary'}`}
            type="button"
          >
            {c === ALL ? t.all : (isEn ? occasionEn[c] || c : c)}
          </button>
        ))}
      </div>

      <p className="text-muted text-[12.5px] mb-5" aria-live="polite">
        {isEn ? `${filtered.length} ${filtered.length === 1 ? 'product' : 'products'}` : filtered.length === 0 ? 'لا توجد منتجات' : filtered.length === 1 ? 'منتج واحد' : `${filtered.length} منتجات`}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <h3 className="text-ink font-bold text-lg mb-2">{t.noResults}</h3>
          <p className="text-sm">{t.tryDifferent}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 list-none">
          {filtered.map((p, i) => {
            const soldOut = p.inStock === false || p.stock === 0;
            // No name and no price on the card. The slug is what the customer
            // quotes back on WhatsApp, so it is what the enquiry carries.
            const refCode = String(p.slug || '');
            const waHref = settings.whatsapp
              ? `https://wa.me/${String(settings.whatsapp).replace(/[^\d]/g, '')}?text=${encodeURIComponent(`${isEn ? 'I want to order' : 'عايز أطلب'}: ${refCode}`)}`
              : null;
            return (
              <li key={p.id} className="animate-[fadeUp_0.4s_ease_both]" style={{ animationDelay: `${i * 0.04}s` }}>
                <article className="group h-full flex flex-col bg-surface border border-border rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all">
                  <Link to={`/product/${p.id}`} className="block focus-visible:outline-offset-4">
                    <div className="relative aspect-square overflow-hidden bg-surface-alt">
                      <Thumb
                        src={p.image}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                      <span className="absolute bottom-3 start-3 z-10 bg-surface/85 backdrop-blur-md border border-white/20 rounded-full px-3 py-1 text-[11px] font-bold">
                        {isEn ? occasionEn[p.category] || p.category : p.category}
                      </span>
                      {soldOut && (
                        <span className="absolute top-3 end-3 z-10 bg-ink/85 text-surface-alt backdrop-blur-md rounded-full px-3 py-1 text-[11px] font-bold">
                          {t.outOfStock}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-muted text-[12.5px] line-clamp-2">{isEn && p.desc_en ? p.desc_en : p.desc}</p>
                    </div>
                  </Link>
                  {/* The WhatsApp CTA used to be an <a> nested inside the
                      product <Link>, which is invalid HTML and made the whole
                      card ambiguous to screen readers and keyboard users. */}
                  <div className="flex items-center justify-between mt-auto p-4 pt-0 gap-2">
                    <Link
                      to={`/product/${p.id}`}
                      className="text-primary font-bold text-[12.5px] hover:underline focus-visible:outline-offset-4"
                    >
                      {t.viewDetails}
                    </Link>
                    {waHref ? (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${t.orderViaWhatsApp} ${refCode}`}
                        className="bg-[#25d366] text-white px-3 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-all inline-flex items-center gap-1.5"
                      >
                        <MessageCircle size={14} aria-hidden="true" /> {t.orderViaWhatsApp}
                      </a>
                    ) : (
                      <span className="text-muted text-[11px]">{t.priceOnContact}</span>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

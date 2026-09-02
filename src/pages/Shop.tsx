import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { seed, occasions } from '../data';
import { occasionEn } from '../i18n';

export default function Shop({ t, addToCart }: { t: any; addToCart: (p: any, qty?: number) => void }) {
  const [params] = useSearchParams();
  const initialCat = params.get('cat') || 'الكل';
  const [cat, setCat] = useState(initialCat);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('default');

  const filtered = useMemo(() => {
    let list = [...seed];
    if (cat !== 'الكل') list = list.filter(p => p.category === cat);
    if (search) list = list.filter(p => p.name.includes(search) || p.name_en?.toLowerCase().includes(search.toLowerCase()));
    if (sort === 'price-low') list.sort((a, b) => a.price - b.price);
    if (sort === 'price-high') list.sort((a, b) => b.price - a.price);
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    return list;
  }, [cat, search, sort]);

  const isEn = document.documentElement.lang === 'en';

  return (
    <section className="section page">
      <div className="mb-8 animate-[fadeUp_0.6s_ease_both]">
        <span className="eyebrow">{t.shop}</span>
        <h1 className="text-[clamp(24px,3.2vw,38px)] font-black">{t.shop} — {isEn ? 'All Favors' : 'كل التوزيعات'}</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3.5 mb-7">
        <div className="flex-1 min-w-[260px] flex items-center gap-2.5 px-4 py-3 bg-surface border border-border rounded-lg">
          <Search size={16} className="text-muted flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.searchProducts} className="w-full text-[13.5px] outline-none bg-transparent" />
        </div>
        <div className="flex items-center gap-2 px-4 py-3 bg-surface border border-border rounded-lg">
          <SlidersHorizontal size={14} className="text-muted" />
          <select value={sort} onChange={e => setSort(e.target.value)} className="text-[13.5px] cursor-pointer outline-none bg-transparent">
            <option value="default">{t.sortBy}</option>
            <option value="price-low">{t.price} ↑</option>
            <option value="price-high">{t.price} ↓</option>
            <option value="name">أ-ي</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2.5 mb-7">
        {['الكل', ...occasions].map(c => (
          <button key={c} onClick={() => setCat(c)} className={`px-5 py-2.5 rounded-full text-[12.5px] font-bold whitespace-nowrap border transition-all ${cat === c ? 'bg-ink text-surface-alt border-ink' : 'bg-surface border-border text-muted hover:border-primary hover:text-primary'}`} type="button">{c === 'الكل' ? t.all : (isEn ? occasionEn[c] || c : c)}</button>
        ))}
      </div>

      <p className="text-muted text-[12.5px] mb-5">{filtered.length} {t.productCount}</p>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <h3 className="text-ink font-bold text-lg mb-2">{t.noResults}</h3>
          <p className="text-sm">{t.tryDifferent}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filtered.map((p, i) => (
            <div key={p.id} className="animate-[fadeUp_0.4s_ease_both]" style={{ animationDelay: `${i * 0.04}s` }}>
              <Link to={`/product/${p.id}`} className="group block bg-surface border border-border rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all">
                <div className="relative aspect-square overflow-hidden bg-surface-alt">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                  <span className="absolute bottom-3 start-3 z-10 bg-white/85 backdrop-blur-md border border-white/20 rounded-full px-3 py-1 text-[11px] font-bold">{isEn ? occasionEn[p.category] || p.category : p.category}</span>
                </div>
                <div className="p-4">
                  <h3 className="text-[14px] font-bold line-clamp-2 mb-1">{isEn && p.name_en ? p.name_en : p.name}</h3>
                  <p className="text-muted text-[12.5px] line-clamp-2">{isEn && p.desc_en ? p.desc_en : p.desc}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-gradient font-extrabold text-lg">{p.price} ج.م</span>
                    <button onClick={(e) => { e.preventDefault(); addToCart(p); }} className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-primary-hover transition-all" type="button">{t.addToCart}</button>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

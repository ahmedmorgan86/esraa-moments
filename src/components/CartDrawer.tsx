import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, ArrowLeft } from 'lucide-react';
import type { CartItem } from '../data';
import { calcShipping } from '../data';

type Props = {
  open: boolean; onClose: () => void; items: CartItem[];
  t: any; lang?: string; updateQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
};

export function CartDrawer({ open, onClose, items, t, lang, updateQty, removeFromCart }: Props) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = calcShipping(subtotal);
  const total = subtotal + shipping;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 bg-black/35 backdrop-blur-sm z-[900]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="fixed top-0 bottom-0 end-0 w-full max-w-[420px] bg-surface-alt z-[1000] flex flex-col border-e border-border shadow-2xl"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="flex items-center gap-2 text-lg font-bold"><ShoppingBag size={20} /> {t.cartTitle} ({items.length})</h2>
              <button onClick={onClose} className="icon" aria-label={t.close}><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted text-center">
                  <ShoppingBag size={48} className="opacity-30" />
                  <h3 className="text-ink font-bold text-lg">{t.cartEmpty}</h3>
                  <Link to="/shop" onClick={onClose} className="btn primary mt-2">{t.continueShopping}</Link>
                </div>
              ) : items.map(item => (
                <div key={item.id} className="flex gap-3 items-center bg-surface border border-border rounded-lg p-3">
                  <img src={item.image} alt={item.name} className="w-[68px] h-[68px] rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${item.id}`} onClick={onClose} className="font-bold text-[13.5px] text-ink truncate block">{lang === 'en' && item.name_en ? item.name_en : item.name}</Link>
                    <span className="text-primary text-[12.5px] font-bold">{item.price} {t.currency}</span>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="inline-flex items-center gap-2 bg-surface-alt border border-border rounded-full px-2.5 py-0.5">
                        <button onClick={() => updateQty(item.id, item.qty - 1)} className="p-0.5"><Minus size={14} /></button>
                        <span className="min-w-[18px] text-center text-sm font-bold">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1)} className="p-0.5"><Plus size={14} /></button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="font-bold text-sm">{item.price * item.qty} {t.currency}</span>
                    <button onClick={() => removeFromCart(item.id)} className="text-muted hover:text-danger text-xs transition-colors">×</button>
                  </div>
                </div>
              ))}
            </div>

            {items.length > 0 && (
              <div className="p-5 border-t border-border bg-surface">
                <div className="flex flex-col gap-2 text-sm mb-4">
                  <div className="flex justify-between"><span className="text-muted">{t.subtotal}</span><span>{subtotal} {t.currency}</span></div>
                  <div className="flex justify-between"><span className="text-muted">{t.shipping}</span><span className={shipping === 0 ? 'text-success font-bold' : ''}>{shipping === 0 ? t.free : `${shipping} ${t.currency}`}</span></div>
                  {subtotal < 500 && subtotal > 0 && <p className="text-primary text-xs bg-primary/8 rounded-lg py-1.5 px-3 text-center">{t.freeShippingHint}</p>}
                  <div className="flex justify-between font-bold text-lg border-t border-border pt-2"><span>{t.total}</span><span>{total} {t.currency}</span></div>
                </div>
                <Link to="/checkout" onClick={onClose} className="btn primary full flex items-center justify-center gap-2">
                  {t.checkout} <ArrowLeft size={18} />
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

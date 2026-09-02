import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, MapPin, ArrowLeft, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { CartItem } from '../data';
import { calcShipping } from '../data';

type Props = { t: any; lang: string; cart: CartItem[]; setCart: (fn: any) => void };

export default function CheckoutPage({ t, lang, cart, setCart }: Props) {
  const [form, setForm] = useState({ name: '', phone: '', phone2: '', email: '', address: '', city: '', notes: '' });
  const [payMethod, setPayMethod] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);
  const [orderId, setOrderId] = useState('');
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = calcShipping(subtotal);
  const total = subtotal + shipping;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!/^01[0-9]{9}$/.test(form.phone)) {
      setFormError(t.phoneLabel + ': 01XXXXXXXXX');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const orderNum = `ORD-${Date.now().toString(36).toUpperCase()}`;
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id || null;

      const { error } = await supabase.from('orders').insert({
        order_number: orderNum,
        user_id: userId,
        customer_email: session?.session?.user?.email || form.email || null,
        customer_name: form.name,
        customer_phone: form.phone,
        customer_phone2: form.phone2 || null,
        address: form.address,
        city: form.city,
        notes: form.notes || null,
        payment_method: payMethod,
        subtotal,
        shipping,
        total,
        items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, image: i.image })),
        status: 'pending',
      });

      if (error) throw error;
      setOrderId(orderNum);
      setCart([]);
      setDone(true);
    } catch (err: any) {
      setFormError(t.orderError);
    }
    setLoading(false);
  };

  if (done) {
    return (
      <section className="section page flex items-center justify-center min-h-[60vh]">
        <motion.div className="text-center max-w-[420px]" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">✓</div>
          <h1 className="text-2xl font-black mb-2">{t.orderConfirmed}</h1>
          <p className="text-muted text-sm mb-4">{t.orderNumberLabel}: <strong className="text-ink">{orderId}</strong></p>
          <p className="text-muted text-[13px] mb-6">{t.confirmWhatsApp}</p>
          <Link to="/shop" className="btn primary">{t.continueShopping}</Link>
        </motion.div>
      </section>
    );
  }

  if (cart.length === 0) {
    return (
      <section className="section page flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ShoppingBag size={48} className="mx-auto text-muted mb-4 opacity-40" />
          <h1 className="text-xl font-bold mb-2">{t.cartEmpty}</h1>
          <Link to="/shop" className="btn primary mt-4">{t.continueShopping}</Link>
        </div>
      </section>
    );
  }

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  return (
    <section className="section page">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link to="/shop" className="text-primary text-[13px] font-semibold flex items-center gap-1 hover:underline mb-3"><ArrowLeft size={14} /> {t.backToStore}</Link>
          <h1 className="text-[clamp(24px,3.2vw,38px)] font-black">{t.completeOrder}</h1>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          {/* Shipping */}
          <div className="flex flex-col gap-5">
            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="flex items-center gap-2 font-bold text-lg mb-5"><MapPin size={18} className="text-primary" /> {t.shippingDetails}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-ink">{t.fullNameLabel} *</label>
                  <input type="text" value={form.name} onChange={e => update('name', e.target.value)} className="input-field" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-ink">{t.phoneLabel} *</label>
                  <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} className="input-field" placeholder="01XXXXXXXXX" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-ink">{t.email} ({t.optionalLabel})</label>
                  <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="input-field" placeholder="example@email.com" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-ink">{t.otherPhoneLabel}</label>
                  <input type="tel" value={form.phone2} onChange={e => update('phone2', e.target.value)} className="input-field" placeholder={t.optionalLabel} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-ink">{t.cityLabel} *</label>
                  <input type="text" value={form.city} onChange={e => update('city', e.target.value)} className="input-field" required />
                </div>
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-ink">{t.addressLabel} *</label>
                  <textarea value={form.address} onChange={e => update('address', e.target.value)} className="input-field min-h-[80px]" required />
                </div>
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-ink">{t.notesLabel}</label>
                  <textarea value={form.notes} onChange={e => update('notes', e.target.value)} className="input-field" placeholder={t.notesPlaceholderAr} />
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="flex items-center gap-2 font-bold text-lg mb-5"><CreditCard size={18} className="text-primary" /> {t.paymentMethod}</h2>
              <div className="flex flex-col gap-2.5">
                {[
                  { id: 'cod', label: t.payOnDelivery, icon: '💵' },
                  { id: 'wallet', label: t.mobileWallet, icon: '📱' },
                  { id: 'instapay', label: t.instaPay, icon: '🏦' },
                ].map(m => (
                  <label key={m.id} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${payMethod === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-border-strong'}`}>
                    <input type="radio" name="pay" value={m.id} checked={payMethod === m.id} onChange={e => setPayMethod(e.target.value)} className="accent-primary" />
                    <span className="text-lg">{m.icon}</span>
                    <span className="text-sm font-semibold">{m.label}</span>
                  </label>
                ))}
              </div>
              {payMethod === 'instapay' && (
                <div className="mt-4 bg-primary/5 border border-primary/20 rounded-lg p-4 text-[13px]">
                  <p className="font-bold text-primary mb-1">{t.transferInfo}</p>
                  <p className="text-ink">{t.bank}: {t.bankName}</p>
                  <p className="text-ink">{t.bankNameLabel}: {t.bankAccountName}</p>
                  <p className="text-ink">{t.bankNumber}: {t.bankAccountNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-surface border border-border rounded-xl p-6 h-fit sticky top-[88px]">
            <h2 className="font-bold text-lg mb-5">{t.orderSummary}</h2>
            <div className="flex flex-col gap-3 mb-5">
              {cart.map(i => (
                <div key={i.id} className="flex gap-3 items-center">
                  <img src={i.image} alt={i.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold line-clamp-1">{lang === 'en' && i.name_en ? i.name_en : i.name}</p>
                    <p className="text-muted text-[12px]">{t.quantityLabel}: {i.qty}</p>
                  </div>
                  <span className="font-bold text-sm">{i.price * i.qty} {t.currency}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 text-sm border-t border-border pt-4 mb-4">
              <div className="flex justify-between"><span className="text-muted">{t.subtotal}</span><span>{subtotal} {t.currency}</span></div>
              <div className="flex justify-between"><span className="text-muted">{t.shipping}</span><span>{shipping === 0 ? t.free : `${shipping} ${t.currency}`}</span></div>
              <div className="flex justify-between font-bold text-lg border-t border-border pt-2"><span>{t.total}</span><span className="text-gradient">{total} {t.currency}</span></div>
            </div>
            {formError && <div className="text-danger text-[12.5px] bg-danger/8 rounded-lg py-2 px-3 text-center mb-3">{formError}</div>}
            <button type="submit" disabled={loading} className="btn primary w-full py-3.5 text-[14px] font-bold">
              {loading ? '...' : `${t.confirmOrder} — ${total} ${t.currency}`}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

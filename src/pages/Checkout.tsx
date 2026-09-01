import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, User, CreditCard, MapPin, ArrowLeft, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { CartItem } from '../data';
import { calcShipping } from '../data';

type Props = { t: any; cart: CartItem[]; setCart: (fn: any) => void };

export default function CheckoutPage({ t, cart, setCart }: Props) {
  const [form, setForm] = useState({ name: '', phone: '', phone2: '', address: '', city: '', notes: '' });
  const [payMethod, setPayMethod] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [orderId, setOrderId] = useState('');
  const navigate = useNavigate();
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = calcShipping(subtotal);
  const total = subtotal + shipping;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const orderNum = `ORD-${Date.now().toString(36).toUpperCase()}`;
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id || null;

      const { error } = await supabase.from('orders').insert({
        order_number: orderNum,
        user_id: userId,
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
      alert('حصل خطأ: ' + (err.message || ''));
    }
    setLoading(false);
  };

  if (done) {
    return (
      <section className="section page flex items-center justify-center min-h-[60vh]">
        <motion.div className="text-center max-w-[420px]" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">✓</div>
          <h1 className="text-2xl font-black mb-2">تم الأوردر!</h1>
          <p className="text-muted text-sm mb-4">رقم الأوردر: <strong className="text-ink">{orderId}</strong></p>
          <p className="text-muted text-[13px] mb-6">هنتواصل معاك على الواتساب عشان نأكد الأوردر. لو عندك أي سؤال كلمنا على 01097905435.</p>
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
          <Link to="/shop" className="text-primary text-[13px] font-semibold flex items-center gap-1 hover:underline mb-3"><ArrowLeft size={14} /> العودة للمتجر</Link>
          <h1 className="text-[clamp(24px,3.2vw,38px)] font-black">إتمام الطلب</h1>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          {/* Shipping */}
          <div className="flex flex-col gap-5">
            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="flex items-center gap-2 font-bold text-lg mb-5"><MapPin size={18} className="text-primary" /> بيانات الشحن</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-ink">الاسم الكامل *</label>
                  <input type="text" value={form.name} onChange={e => update('name', e.target.value)} className="input-field" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-ink">رقم الموبايل *</label>
                  <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} className="input-field" placeholder="01XXXXXXXXX" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-ink">موبايل إضافي</label>
                  <input type="tel" value={form.phone2} onChange={e => update('phone2', e.target.value)} className="input-field" placeholder="اختياري" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-ink">المدينة *</label>
                  <input type="text" value={form.city} onChange={e => update('city', e.target.value)} className="input-field" required />
                </div>
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-ink">العنوان بالتفصيل *</label>
                  <textarea value={form.address} onChange={e => update('address', e.target.value)} className="input-field min-h-[80px]" required />
                </div>
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-ink">ملاحظات</label>
                  <textarea value={form.notes} onChange={e => update('notes', e.target.value)} className="input-field" placeholder="مثلاً: عايز تغليف خاص / رسالة معينة..." />
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="flex items-center gap-2 font-bold text-lg mb-5"><CreditCard size={18} className="text-primary" /> طريقة الدفع</h2>
              <div className="flex flex-col gap-2.5">
                {[
                  { id: 'cod', label: 'الدفع عند الاستلام', icon: '💵' },
                  { id: 'wallet', label: 'فودافون كاش / فوري', icon: '📱' },
                  { id: 'instapay', label: 'InstaPay / تحويل بنكي', icon: '🏦' },
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
                  <p className="font-bold text-primary mb-1">بيانات التحويل:</p>
                  <p className="text-ink">البنك: CIB</p>
                  <p className="text-ink">الاسم: Esraa Moments</p>
                  <p className="text-ink">الرقم: 100234567890</p>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-surface border border-border rounded-xl p-6 h-fit sticky top-[88px]">
            <h2 className="font-bold text-lg mb-5">ملخص الطلب</h2>
            <div className="flex flex-col gap-3 mb-5">
              {cart.map(i => (
                <div key={i.id} className="flex gap-3 items-center">
                  <img src={i.image} alt={i.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold line-clamp-1">{i.name}</p>
                    <p className="text-muted text-[12px]">الكمية: {i.qty}</p>
                  </div>
                  <span className="font-bold text-sm">{i.price * i.qty} ج.م</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 text-sm border-t border-border pt-4 mb-4">
              <div className="flex justify-between"><span className="text-muted">المجموع</span><span>{subtotal} ج.م</span></div>
              <div className="flex justify-between"><span className="text-muted">{t.shipping}</span><span>{shipping === 0 ? t.free : `${shipping} ج.م`}</span></div>
              <div className="flex justify-between font-bold text-lg border-t border-border pt-2"><span>{t.total}</span><span className="text-gradient">{total} ج.م</span></div>
            </div>
            <button type="submit" disabled={loading} className="btn primary w-full py-3.5 text-[14px] font-bold">
              {loading ? '...' : `تأكيد الأوردر — ${total} ج.م`}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

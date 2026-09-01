import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Package, Clock, CheckCircle, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

const statusMap: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: 'قيد المراجعة', icon: Clock, color: 'text-amber-500 bg-amber-500/10' },
  confirmed: { label: 'تم التأكيد', icon: CheckCircle, color: 'text-blue-500 bg-blue-500/10' },
  shipped: { label: 'تم الشحن', icon: Truck, color: 'text-primary bg-primary/10' },
  delivered: { label: 'تم التوصيل', icon: CheckCircle, color: 'text-success bg-success/10' },
  cancelled: { label: 'ملغي', icon: Package, color: 'text-danger bg-danger/10' },
};

export default function TrackPage({ t }: { t: any }) {
  const [orderNum, setOrderNum] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNum.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);
    const { data, error: fetchErr } = await supabase.from('orders').select('*').eq('order_number', orderNum.trim()).single();
    if (fetchErr || !data) setError('مفيش أوردر بالرقم ده. تأكد من الرقم وجرّب تاني.');
    else setOrder(data);
    setLoading(false);
  };

  const status = order ? statusMap[order.status] || statusMap.pending : null;

  return (
    <section className="section page">
      <div className="max-w-[560px] mx-auto">
        <motion.div className="text-center mb-10" initial="hidden" animate="visible" variants={fadeUp}>
          <span className="eyebrow">{t.track}</span>
          <h1 className="text-[clamp(24px,3.2vw,38px)] font-black mt-2">{t.trackOrder}</h1>
          <p className="text-muted text-sm mt-2">ادخل رقم الأوردر بتاعك عشان تعرف حالة الطلب</p>
        </motion.div>

        <motion.form onSubmit={handleSearch} className="flex gap-2.5 mb-8" initial="hidden" animate="visible" variants={fadeUp}>
          <div className="flex-1 flex items-center gap-2.5 px-4 py-3 bg-surface border border-border rounded-xl">
            <Search size={16} className="text-muted" />
            <input value={orderNum} onChange={e => setOrderNum(e.target.value)} placeholder="رقم الأوردر (مثلاً: ORD-XXXXX)" className="w-full text-[13.5px] outline-none bg-transparent" />
          </div>
          <button type="submit" disabled={loading} className="btn primary px-6">{loading ? '...' : 'تتبع'}</button>
        </motion.form>

        {error && <div className="text-danger text-[13px] bg-danger/8 rounded-xl py-3 px-4 text-center mb-6">{error}</div>}

        {order && status && (
          <motion.div className="bg-surface border border-border rounded-2xl overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">{order.order_number}</h2>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-bold ${status.color}`}>
                  <status.icon size={14} /> {status.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-[13px]">
                <div><span className="text-muted">الاسم:</span> <span className="font-semibold">{order.customer_name}</span></div>
                <div><span className="text-muted">الموبايل:</span> <span className="font-semibold">{order.customer_phone}</span></div>
                <div><span className="text-muted">المدينة:</span> <span className="font-semibold">{order.city}</span></div>
                <div><span className="text-muted">الدفع:</span> <span className="font-semibold">{order.payment_method === 'cod' ? 'عند الاستلام' : order.payment_method}</span></div>
              </div>
            </div>

            <div className="p-6">
              <h3 className="font-bold text-sm mb-3">المنتجات</h3>
              <div className="flex flex-col gap-3">
                {(order.items || []).map((item: any, i: number) => (
                  <div key={i} className="flex gap-3 items-center bg-surface-alt rounded-lg p-3">
                    {item.image && <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold line-clamp-1">{item.name}</p>
                      <p className="text-muted text-[12px]">الكمية: {item.qty}</p>
                    </div>
                    <span className="font-bold text-sm">{item.price * item.qty} ج.م</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold mt-4 pt-3 border-t border-border">
                <span>الإجمالي</span>
                <span className="text-gradient">{order.total} ج.م</span>
              </div>
            </div>
          </motion.div>
        )}

        <div className="text-center mt-8">
          <Link to="/shop" className="text-primary text-[13px] font-semibold hover:underline">الرجوع للمتجر ←</Link>
        </div>
      </div>
    </section>
  );
}

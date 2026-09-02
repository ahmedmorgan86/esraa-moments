import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Package, LogOut, ArrowRight, Mail, Phone, MapPin, Clock, CheckCircle, Truck, XCircle, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAllowedAdmin } from '../lib/adminAuth';

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } } };

const statusConfig: Record<string, { color: string; icon: any; bg: string }> = {
  pending: { color: 'text-amber-600', icon: Clock, bg: 'bg-amber-50 border-amber-200' },
  confirmed: { color: 'text-blue-600', icon: CheckCircle, bg: 'bg-blue-50 border-blue-200' },
  shipped: { color: 'text-primary', icon: Truck, bg: 'bg-primary/5 border-primary/20' },
  delivered: { color: 'text-emerald-600', icon: CheckCircle, bg: 'bg-emerald-50 border-emerald-200' },
  cancelled: { color: 'text-red-500', icon: XCircle, bg: 'bg-red-50 border-red-200' },
};

export default function AccountPage({ t }: { t: any }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setUser(u);
      setName(u?.user_metadata?.full_name || '');
      setLoading(false);
      if (u && isAllowedAdmin(u.email) && !window.location.hash.includes('recovery')) {
        navigate('/admin', { replace: true });
      }
      if (u) fetchOrders(u.email);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      const u = s?.user;
      setUser(u);
      if (u) { setName(u.user_metadata?.full_name || ''); fetchOrders(u.email); }
    });
    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  const fetchOrders = async (email: string | undefined) => {
    if (!email) return;
    setOrdersLoading(true);
    const { data } = await supabase.from('orders').select('*').eq('customer_email', email).order('created_at', { ascending: false });
    setOrders(data || []);
    setOrdersLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    setMsg(error ? 'حدث خطأ' : 'تم الحفظ بنجاح');
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) return (
    <div className="section page flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-muted text-sm">...</span>
      </div>
    </div>
  );

  if (!user) return (
    <section className="section page flex items-center justify-center min-h-[60vh]">
      <motion.div className="text-center max-w-[400px]" initial="hidden" animate="visible" variants={fadeUp}>
        <div className="w-24 h-24 bg-primary/8 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <User size={40} className="text-primary" />
        </div>
        <h1 className="text-2xl font-black mb-2">{t.login}</h1>
        <p className="text-muted text-sm mb-8 leading-relaxed">{t.loginDesc}</p>
        <Link to="/login" className="btn primary">{t.login}</Link>
      </motion.div>
    </section>
  );

  const stats = {
    total: orders.length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    pending: orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length,
  };

  return (
    <section className="section page">
      <motion.div className="max-w-[640px] mx-auto" initial="hidden" animate="visible" variants={fadeUp}>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="eyebrow">{t.account}</span>
            <h1 className="text-[clamp(24px,3.2vw,38px)] font-black mt-1">{t.profile}</h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-danger/80 text-[13px] font-semibold hover:text-danger transition-colors">
            <LogOut size={15} /> {t.logout}
          </button>
        </div>

        {/* User Info Card */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-6">
          <div className="bg-gradient-to-l from-primary/8 to-transparent px-6 py-5 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-black text-xl">{name ? name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-ink text-lg truncate">{name || user.email}</h2>
                <p className="text-muted text-[13px] flex items-center gap-1.5 mt-0.5"><Mail size={13} /> {user.email}</p>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="px-4 py-4 text-center">
              <p className="text-2xl font-black text-ink">{stats.total}</p>
              <p className="text-[11px] text-muted mt-1">{t.ordersWord}</p>
            </div>
            <div className="px-4 py-4 text-center">
              <p className="text-2xl font-black text-emerald-600">{stats.delivered}</p>
              <p className="text-[11px] text-muted mt-1">{t.delivered}</p>
            </div>
            <div className="px-4 py-4 text-center">
              <p className="text-2xl font-black text-amber-600">{stats.pending}</p>
              <p className="text-[11px] text-muted mt-1">{t.pending}</p>
            </div>
          </div>
        </div>

        {/* Profile Edit */}
        <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
          <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
            <User size={16} className="text-primary" /> {t.personalInfo}
          </h3>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">{t.fullName}</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">{t.email}</label>
              <input type="email" value={user.email} disabled className="input-field opacity-50 cursor-not-allowed" />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving} className="btn primary">{saving ? '...' : t.save}</button>
              {msg && <span className="text-success text-[13px] font-medium">{msg}</span>}
            </div>
          </form>
        </div>

        {/* Orders */}
        <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
          <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
            <Package size={16} className="text-primary" /> {t.myOrders}
          </h3>

          {ordersLoading ? (
            <div className="py-8 text-center text-muted text-sm">...</div>
          ) : orders.length === 0 ? (
            <div className="py-10 text-center">
              <ShoppingBag size={36} className="mx-auto mb-3 text-border" />
              <p className="text-muted text-sm mb-4">{t.ordersEmpty}</p>
              <Link to="/shop" className="btn primary">{t.actionOrder}</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {orders.map(o => {
                const st = statusConfig[o.status] || statusConfig.pending;
                const StatusIcon = st.icon;
                const isExpanded = expandedOrder === o.id;
                const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items || [];
                return (
                  <div key={o.id} className="border border-border rounded-xl overflow-hidden hover:border-border-strong transition-colors">
                    <button onClick={() => setExpandedOrder(isExpanded ? null : o.id)} className="w-full flex items-center justify-between p-4 text-start">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${st.bg} border`}>
                          <StatusIcon size={14} className={st.color} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-ink">{o.order_number}</p>
                          <p className="text-[11px] text-muted mt-0.5">{new Date(o.created_at).toLocaleDateString('ar-EG')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm text-gradient">{o.total} {t.currency}</span>
                        {isExpanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-border pt-3">
                        <div className="grid grid-cols-2 gap-3 text-[12.5px] mb-3">
                          <div className="flex items-center gap-1.5 text-muted"><User size={12} /> {o.customer_name}</div>
                          <div className="flex items-center gap-1.5 text-muted"><Phone size={12} /> {o.customer_phone}</div>
                          {o.city && <div className="flex items-center gap-1.5 text-muted"><MapPin size={12} /> {o.city}</div>}
                          <div className="flex items-center gap-1.5 text-muted"><Clock size={12} /> {o.payment_method === 'cod' ? t.cashOnDelivery : o.payment_method}</div>
                        </div>
                        {items.length > 0 && (
                          <div className="bg-surface-alt rounded-lg p-3 mb-3">
                            {items.map((item: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 py-1.5 text-[12px]">
                                <img src={item.image} alt="" className="w-8 h-8 rounded-md object-cover" />
                                <span className="flex-1 truncate text-ink">{item.name}</span>
                                <span className="text-muted">×{item.qty}</span>
                                <span className="font-bold text-primary">{item.price * item.qty} {t.currency}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {o.notes && <p className="text-[12px] text-muted italic">📝 {o.notes}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Back to store */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-primary text-[13px] font-semibold hover:underline">
          <ArrowRight size={14} /> {t.backToShop}
        </Link>
      </motion.div>
    </section>
  );
}

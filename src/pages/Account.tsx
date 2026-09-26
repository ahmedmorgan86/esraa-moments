import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Package, LogOut, ArrowRight, Mail, Phone, MapPin, Clock, CheckCircle, Truck, XCircle, ShoppingBag, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAllowedAdmin } from '../lib/adminAuth';

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } } };

const statusConfig: Record<string, { color: string; icon: any; bg: string }> = {
  pending: { color: 'text-amber-500', icon: Clock, bg: 'bg-amber-500/10 border-amber-500/20' },
  confirmed: { color: 'text-blue-500', icon: CheckCircle, bg: 'bg-blue-500/10 border-blue-500/20' },
  shipped: { color: 'text-primary', icon: Truck, bg: 'bg-primary/10 border-primary/20' },
  delivered: { color: 'text-emerald-500', icon: CheckCircle, bg: 'bg-emerald-500/10 border-emerald-500/20' },
  // Missing here meant a return request silently rendered as a pending order.
  return_requested: { color: 'text-orange-500', icon: RotateCcw, bg: 'bg-orange-500/10 border-orange-500/20' },
  cancelled: { color: 'text-red-500', icon: XCircle, bg: 'bg-red-500/10 border-red-500/20' },
};

/** o.items is a JSON string written by the checkout; a malformed value used to
 *  throw during render and take down the whole order list. */
function parseItems(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export default function AccountPage({ t, lang }: { t: any; lang: string }) {
  const isEn = lang === 'en';
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    // getSession() was unawaited for its failure path, so a network error left
    // the page on the spinner forever.
    supabase.auth.getSession()
      .then(({ data }) => {
        if (!active) return;
        const u = data.session?.user;
        setUser(u);
        setName(u?.user_metadata?.full_name || '');
        setLoading(false);
        if (u && isAllowedAdmin(u.email) && !window.location.hash.includes('recovery')) {
          navigate('/admin', { replace: true });
        }
        if (u) fetchOrders(u.email);
      })
      .catch(() => { if (active) setLoading(false); });

    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      const u = s?.user;
      setUser(u);
      setLoading(false);
      if (u) { setName(u.user_metadata?.full_name || ''); fetchOrders(u.email); }
      else { setOrders([]); setOrdersLoading(false); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [navigate]);

  const fetchOrders = async (email: string | undefined) => {
    if (!email) return;
    setOrdersLoading(true);
    setOrdersError(false);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_email', email)
      .order('created_at', { ascending: false });
    // A failed query was reported to the customer as "you have no orders".
    if (error) { setOrdersError(true); setOrders([]); }
    else setOrders(data || []);
    setOrdersLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    // The error branch used to render in text-success green, so a failed save
    // looked identical to a successful one.
    setMsg({ text: error ? t.saveError : t.saveSuccess, ok: !error });
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) return (
    <div className="section page flex items-center justify-center min-h-[60vh]" role="status" aria-busy="true" aria-label={t.loading}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-muted text-sm">…</span>
      </div>
    </div>
  );

  if (!user) return (
    <section className="section page flex items-center justify-center min-h-[60vh]">
      <motion.div className="text-center max-w-[400px]" initial="hidden" animate="visible" variants={fadeUp}>
        <div className="w-24 h-24 bg-primary/8 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <User size={40} className="text-primary" aria-hidden="true" />
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
        <div className="flex items-center justify-between gap-3 mb-8">
          <div>
            <span className="eyebrow">{t.account}</span>
            <h1 className="text-[clamp(24px,3.2vw,38px)] font-black mt-1">{t.profile}</h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-danger/80 text-[13px] font-semibold hover:text-danger transition-colors">
            <LogOut size={15} aria-hidden="true" /> {t.logout}
          </button>
        </div>

        {/* User Info Card */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-6">
          <div className="bg-gradient-to-l from-primary/8 to-transparent px-6 py-5 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                <span className="text-primary font-black text-xl">{name ? name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-ink text-lg truncate">{name || user.email}</h2>
                <p className="text-muted text-[13px] flex items-center gap-1.5 mt-0.5 break-all"><Mail size={13} aria-hidden="true" className="flex-shrink-0" /> {user.email}</p>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 divide-x divide-border rtl:divide-x-reverse">
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
            <User size={16} className="text-primary" aria-hidden="true" /> {t.personalInfo}
          </h3>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="acct-name" className="text-[12px] font-semibold text-muted">{t.fullName}</label>
              <input id="acct-name" type="text" value={name} onChange={e => setName(e.target.value)} autoComplete="name" className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="acct-email" className="text-[12px] font-semibold text-muted">{t.email}</label>
              <input id="acct-email" type="email" value={user.email} readOnly disabled className="input-field opacity-50 cursor-not-allowed" />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving} className="btn primary disabled:opacity-60 disabled:cursor-wait">{saving ? '…' : t.save}</button>
              {msg && (
                <span role="status" className={`text-[13px] font-medium ${msg.ok ? 'text-success' : 'text-danger'}`}>{msg.text}</span>
              )}
            </div>
          </form>
        </div>

        {/* Orders */}
        <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
          <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
            <Package size={16} className="text-primary" aria-hidden="true" /> {t.myOrders}
          </h3>

          {ordersLoading ? (
            <div className="py-8 text-center text-muted text-sm" role="status" aria-busy="true" aria-label={t.loading}>…</div>
          ) : ordersError ? (
            <div className="py-10 text-center">
              <XCircle size={36} className="mx-auto mb-3 text-danger/60" aria-hidden="true" />
              <p role="alert" className="text-muted text-sm mb-4">{t.dataLoadError}</p>
              <button onClick={() => fetchOrders(user.email)} className="btn primary">{t.retry}</button>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-10 text-center">
              <ShoppingBag size={36} className="mx-auto mb-3 text-border" aria-hidden="true" />
              <p className="text-muted text-sm mb-4">{t.ordersEmpty}</p>
              <Link to="/shop" className="btn primary">{t.actionOrder}</Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-2 list-none">
              {orders.map(o => {
                const st = statusConfig[o.status] || statusConfig.pending;
                const StatusIcon = st.icon;
                const isExpanded = expandedOrder === o.id;
                const items = parseItems(o.items);
                return (
                  <li key={o.id} className="border border-border rounded-xl overflow-hidden hover:border-border-strong transition-colors">
                    <button
                      onClick={() => setExpandedOrder(isExpanded ? null : o.id)}
                      aria-expanded={isExpanded}
                      className="w-full flex items-center justify-between gap-3 p-4 text-start"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${st.bg} border`}>
                          <StatusIcon size={14} className={st.color} aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-ink truncate">{o.order_number}</p>
                          <p className="text-[11px] text-muted mt-0.5">{new Date(o.created_at).toLocaleDateString(isEn ? 'en-GB' : 'ar-EG')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-bold text-sm text-gradient">{o.total} {t.currency}</span>
                        {isExpanded ? <ChevronUp size={16} className="text-muted" aria-hidden="true" /> : <ChevronDown size={16} className="text-muted" aria-hidden="true" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-border pt-3">
                        <div className="grid grid-cols-2 gap-3 text-[12.5px] mb-3">
                          <div className="flex items-center gap-1.5 text-muted"><User size={12} aria-hidden="true" className="flex-shrink-0" /> {o.customer_name}</div>
                          <div className="flex items-center gap-1.5 text-muted break-all"><Phone size={12} aria-hidden="true" className="flex-shrink-0" /> {o.customer_phone}</div>
                          {o.city && <div className="flex items-center gap-1.5 text-muted"><MapPin size={12} aria-hidden="true" className="flex-shrink-0" /> {o.city}</div>}
                          <div className="flex items-center gap-1.5 text-muted"><Clock size={12} aria-hidden="true" className="flex-shrink-0" /> {o.payment_method === 'cod' ? t.cashOnDelivery : o.payment_method}</div>
                        </div>
                        {items.length > 0 && (
                          <ul className="bg-surface-alt rounded-lg p-3 mb-3 list-none">
                            {items.map((item: any, i: number) => (
                              <li key={i} className="flex items-center gap-2 py-1.5 text-[12px]">
                                <img src={item.image} alt="" loading="lazy" className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
                                <span className="flex-1 truncate text-ink">{item.name}</span>
                                <span className="text-muted">×{item.qty}</span>
                                <span className="font-bold text-primary">{Number(item.price || 0) * Number(item.qty || 0)} {t.currency}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {o.notes && <p className="text-[12px] text-muted italic whitespace-pre-wrap break-words">📝 {o.notes}</p>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Back to store */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-primary text-[13px] font-semibold hover:underline">
          <ArrowRight size={14} aria-hidden="true" className={isEn ? 'rotate-180' : ''} /> {t.backToShop}
        </Link>
      </motion.div>
    </section>
  );
}

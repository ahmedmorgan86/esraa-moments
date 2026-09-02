import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, ClipboardList, Users, Settings, LogOut, TrendingUp,
  ShoppingBag, Search, ChevronDown, ChevronUp, Truck, CheckCircle,
  Clock, XCircle, ArrowUpRight, BarChart3, Store, Bell, Menu
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAllowedAdmin } from '../lib/adminAuth';
import { seed } from '../data';

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const navItems = (t: any) => [
  { key: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
  { key: 'products', label: t.products, icon: Package },
  { key: 'orders', label: t.allOrders, icon: ClipboardList },
  { key: 'customers', label: t.customers, icon: Users },
  { key: 'settings', label: t.settings, icon: Settings },
];

const statusStyles: Record<string, { color: string; icon: any; bg: string; border: string }> = {
  pending: { color: 'text-amber-600', icon: Clock, bg: 'bg-amber-50', border: 'border-amber-200' },
  confirmed: { color: 'text-blue-600', icon: CheckCircle, bg: 'bg-blue-50', border: 'border-blue-200' },
  shipped: { color: 'text-primary', icon: Truck, bg: 'bg-primary/5', border: 'border-primary/20' },
  delivered: { color: 'text-emerald-600', icon: CheckCircle, bg: 'bg-emerald-50', border: 'border-emerald-200' },
  cancelled: { color: 'text-red-500', icon: XCircle, bg: 'bg-red-50', border: 'border-red-200' },
};

export default function AdminPage({ t }: { t: any }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (!u || !isAllowedAdmin(u.email)) { navigate('/login', { replace: true }); return; }
      setUser(u);
      setLoading(false);
    });
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface-alt">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-muted text-sm">...</span>
      </div>
    </div>
  );

  const nav = navItems(t);

  return (
    <div className="min-h-screen bg-surface-alt flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 start-0 z-50 h-screen w-[260px] bg-surface border-e border-border flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Brand */}
        <div className="p-5 border-b border-border">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
              <img src="/images/logo.jpeg" alt="ESRAA" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-black text-sm text-ink block leading-tight">ESRAA Moments</span>
              <span className="text-[10.5px] text-primary font-semibold">{t.adminPanel}</span>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
          {nav.map(n => {
            const active = tab === n.key;
            return (
              <button key={n.key} onClick={() => { setTab(n.key); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${active ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-muted hover:bg-primary/5 hover:text-ink'}`}>
                <n.icon size={17} strokeWidth={active ? 2.2 : 1.8} /> {n.label}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-xs">{user.email?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-ink truncate">{user.email}</p>
              <p className="text-[10.5px] text-primary font-medium">{t.managerLabel}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold text-danger/70 hover:text-danger hover:bg-danger/5 transition-all">
            <LogOut size={16} /> {t.logoutLabel}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-surface-alt/80 backdrop-blur-md border-b border-border px-4 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-primary/5 text-ink">
              <Menu size={20} />
            </button>
            <h2 className="font-bold text-ink text-sm">{nav.find(n => n.key === tab)?.label}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-primary/5 text-ink transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-primary" />
            </button>
            <Link to="/" className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-primary/5 text-ink transition-colors">
              <Store size={18} />
            </Link>
          </div>
        </header>

        {/* Tab Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <AnimatePresence mode="wait">
            {tab === 'dashboard' && <Dashboard key="d" t={t} />}
            {tab === 'products' && <ProductsTab key="p" t={t} />}
            {tab === 'orders' && <OrdersTab key="o" t={t} />}
            {tab === 'customers' && <CustomersTab key="c" t={t} />}
            {tab === 'settings' && <SettingsTab key="s" t={t} />}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ */
/*                       DASHBOARD                       */
/* ══════════════════════════════════════════════════════ */
function Dashboard({ t }: { t: any }) {
  const [stats, setStats] = useState({ products: seed.length, orders: 0, revenue: 0, customers: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('total'),
      supabase.from('orders').select('customer_phone', { count: 'exact', head: true }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
    ]).then(([ordersCount, ordersRevenue, customersCount, recent]) => {
      setStats({
        products: seed.length,
        orders: ordersCount.count || 0,
        revenue: (ordersRevenue.data || []).reduce((s: number, o: any) => s + (o.total || 0), 0),
        customers: customersCount.count || 0,
      });
      setRecentOrders(recent.data || []);
    });
  }, []);

  const cards = [
    { label: t.totalProducts, value: stats.products, icon: Package, gradient: 'from-primary/10 to-primary/5', iconColor: 'text-primary' },
    { label: t.totalOrders, value: stats.orders, icon: ClipboardList, gradient: 'from-blue-500/10 to-blue-500/5', iconColor: 'text-blue-600' },
    { label: t.totalRevenue, value: `${stats.revenue.toLocaleString()} ${t.currency}`, icon: TrendingUp, gradient: 'from-emerald-500/10 to-emerald-500/5', iconColor: 'text-emerald-600' },
    { label: t.totalCustomers, value: stats.customers, icon: Users, gradient: 'from-violet-500/10 to-violet-500/5', iconColor: 'text-violet-600' },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn}>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-surface border border-border rounded-2xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center`}>
                <c.icon size={20} className={c.iconColor} />
              </div>
              <ArrowUpRight size={14} className="text-border mt-1" />
            </div>
            <p className="text-[12px] text-muted font-medium">{c.label}</p>
            <p className="text-2xl font-black text-ink mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-bold text-ink">{t.allOrders} ({t.dashboardTitle})</h3>
        </div>
        {recentOrders.length === 0 ? (
          <div className="py-16 text-center">
            <BarChart3 size={40} className="mx-auto mb-3 text-border" />
            <p className="text-muted text-sm">{t.startAdding}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentOrders.map((o: any) => {
              const st = statusStyles[o.status] || statusStyles.pending;
              const StIcon = st.icon;
              return (
                <div key={o.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-surface-alt/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${st.bg} border ${st.border}`}>
                      <StIcon size={14} className={st.color} />
                    </div>
                    <div>
                      <p className="font-bold text-[13px] text-ink">{o.order_number}</p>
                      <p className="text-[11px] text-muted">{o.customer_name} — {o.city}</p>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="font-bold text-[13px] text-gradient">{o.total} {t.currency}</p>
                    <p className="text-[11px] text-muted">{new Date(o.created_at).toLocaleDateString('ar-EG')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════ */
/*                     PRODUCTS TAB                      */
/* ══════════════════════════════════════════════════════ */
function ProductsTab({ t }: { t: any }) {
  const [products] = useState(seed);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const filtered = products.filter(p => !search || p.name.includes(search) || p.name_en?.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-black text-ink">{t.products}</h1>
          <p className="text-muted text-[13px] mt-0.5">{filtered.length} {t.productCount}</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:flex-none flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-xl">
            <Search size={14} className="text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.searchPlaceholder} className="w-full sm:w-[180px] text-[13px] outline-none bg-transparent" />
          </div>
          <button onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')} className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-surface-alt transition-colors text-muted">
            {view === 'grid' ? <BarChart3 size={16} /> : <ShoppingBag size={16} />}
          </button>
        </div>
      </div>

      {/* Grid View */}
      {view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="bg-surface border border-border rounded-2xl overflow-hidden hover:shadow-md transition-all group">
              <div className="relative aspect-square overflow-hidden">
                <img src={p.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 start-3">
                  {p.featured && <span className="bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-md">{t.featuredLabel}</span>}
                </div>
                <div className="absolute top-3 end-3">
                  <span className="bg-white/85 backdrop-blur-sm text-[10px] font-bold px-2 py-1 rounded-md text-ink">{p.stock} {t.qty}</span>
                </div>
              </div>
              <div className="p-4">
                <p className="text-[11px] text-primary font-semibold mb-1">{p.category}</p>
                <h3 className="font-bold text-[13px] text-ink line-clamp-1 mb-2">{p.name}</h3>
                <div className="flex items-center justify-between">
                  <span className="font-black text-primary">{p.price} {t.currency}</span>
                  <span className="text-[11px] text-muted">ID: {p.id}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-alt/50">
                  <th className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.productLabel}</th>
                  <th className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.sectionLabel}</th>
                  <th className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.priceLabel}</th>
                  <th className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.qty}</th>
                  <th className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.featuredLabel}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-surface-alt/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="font-semibold text-ink block truncate">{p.name}</span>
                          {p.name_en && <span className="text-[11px] text-muted block truncate">{p.name_en}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted">{p.category}</td>
                    <td className="px-5 py-3 font-bold text-gradient">{p.price} {t.currency}</td>
                    <td className="px-5 py-3 text-muted">{p.stock}</td>
                    <td className="px-5 py-3">{p.featured ? <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-md">★</span> : <span className="text-border">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════ */
/*                      ORDERS TAB                       */
/* ══════════════════════════════════════════════════════ */
function OrdersTab({ t }: { t: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data } = await q;
    setOrders(data || []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', id);
    fetchOrders();
  };

  const statusOpts = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  const statusLabels: Record<string, string> = { all: t.allStatuses, pending: t.pending, confirmed: t.confirmed, shipped: t.shipped, delivered: t.delivered, cancelled: t.cancelled };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn}>
      <h1 className="text-xl font-black text-ink mb-5">{t.allOrders}</h1>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2">
        {statusOpts.map(s => {
          const active = statusFilter === s;
          return (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-xl text-[12px] font-bold whitespace-nowrap border transition-all ${active ? 'bg-ink text-surface-alt border-ink shadow-sm' : 'bg-surface border-border text-muted hover:border-primary/40'}`}>
              {statusLabels[s]}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-16 text-center"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div>
      ) : orders.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl py-16 text-center">
          <ClipboardList size={40} className="mx-auto mb-3 text-border" />
          <p className="text-muted text-sm">{t.noOrders}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map(o => {
            const st = statusStyles[o.status] || statusStyles.pending;
            const StIcon = st.icon;
            const isExpanded = expandedOrder === o.id;
            const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items || [];
            return (
              <motion.div key={o.id} layout className="bg-surface border border-border rounded-2xl overflow-hidden hover:border-border-strong transition-colors">
                {/* Order Header */}
                <button onClick={() => setExpandedOrder(isExpanded ? null : o.id)} className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-5 text-start gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${st.bg} border ${st.border}`}>
                      <StIcon size={16} className={st.color} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink">{o.order_number}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${st.color} ${st.bg}`}>{statusLabels[o.status]}</span>
                      </div>
                      <p className="text-[12px] text-muted mt-0.5">{o.customer_name} — {o.customer_phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-lg text-gradient">{o.total} {t.currency}</span>
                    {isExpanded ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
                  </div>
                </button>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      <div className="px-5 pb-5 border-t border-border pt-4">
                        {/* Customer Info */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                          <div className="bg-surface-alt rounded-xl p-3">
                            <p className="text-[10px] text-muted font-semibold mb-1">{t.nameLabel}</p>
                            <p className="text-[13px] font-bold text-ink">{o.customer_name}</p>
                          </div>
                          <div className="bg-surface-alt rounded-xl p-3">
                            <p className="text-[10px] text-muted font-semibold mb-1">{t.phoneLabelShort}</p>
                            <p className="text-[13px] font-bold text-ink">{o.customer_phone}</p>
                          </div>
                          <div className="bg-surface-alt rounded-xl p-3">
                            <p className="text-[10px] text-muted font-semibold mb-1">{t.cityLabelShort}</p>
                            <p className="text-[13px] font-bold text-ink">{o.city || '—'}</p>
                          </div>
                          <div className="bg-surface-alt rounded-xl p-3">
                            <p className="text-[10px] text-muted font-semibold mb-1">{t.paymentLabel}</p>
                            <p className="text-[13px] font-bold text-ink">{o.payment_method === 'cod' ? t.cashOnDelivery : o.payment_method}</p>
                          </div>
                        </div>

                        {/* Items */}
                        {items.length > 0 && (
                          <div className="bg-surface-alt rounded-xl p-4 mb-4">
                            <p className="text-[11px] font-bold text-muted mb-2">{t.productsLabel}</p>
                            <div className="space-y-2">
                              {items.map((item: any, i: number) => (
                                <div key={i} className="flex items-center gap-3">
                                  <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                  <span className="flex-1 text-[13px] font-semibold text-ink truncate">{item.name}</span>
                                  <span className="text-[12px] text-muted">×{item.qty}</span>
                                  <span className="text-[13px] font-bold text-primary">{item.price * item.qty} {t.currency}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {o.notes && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                            <p className="text-[11px] font-bold text-amber-700 mb-1">📝 {t.notesLabel}</p>
                            <p className="text-[13px] text-amber-800">{o.notes}</p>
                          </div>
                        )}

                        {/* Address */}
                        {o.address && (
                          <div className="bg-surface-alt rounded-xl p-3 mb-4">
                            <p className="text-[10px] text-muted font-semibold mb-1">{t.addressLabel}</p>
                            <p className="text-[13px] text-ink">{o.address}</p>
                          </div>
                        )}

                        {/* Status Actions */}
                        <div>
                          <p className="text-[11px] font-bold text-muted mb-2">{t.status}</p>
                          <div className="flex flex-wrap gap-2">
                            {['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(s => {
                              const sSt = statusStyles[s];
                              const SIcon = sSt.icon;
                              const isActive = o.status === s;
                              return (
                                <button key={s} onClick={() => updateStatus(o.id, s)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold border transition-all ${isActive ? `${sSt.bg} ${sSt.border} ${sSt.color} shadow-sm` : 'border-border text-muted hover:border-primary/40'}`}>
                                  <SIcon size={12} /> {statusLabels[s]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════ */
/*                    CUSTOMERS TAB                      */
/* ══════════════════════════════════════════════════════ */
function CustomersTab({ t }: { t: any }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('orders').select('customer_name, customer_phone, city, created_at, total').order('created_at', { ascending: false }).then(({ data }) => {
      const map = new Map<string, any>();
      (data || []).forEach((o: any) => {
        const key = o.customer_phone;
        if (!map.has(key)) map.set(key, { ...o, orders: 1, totalSpent: o.total || 0 });
        else { map.get(key).orders++; map.get(key).totalSpent += o.total || 0; }
      });
      setCustomers(Array.from(map.values()));
      setLoading(false);
    });
  }, []);

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn}>
      <h1 className="text-xl font-black text-ink mb-5">{t.customersTitle} ({customers.length})</h1>
      {loading ? (
        <div className="py-16 text-center"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div>
      ) : customers.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl py-16 text-center">
          <Users size={40} className="mx-auto mb-3 text-border" />
          <p className="text-muted text-sm">{t.noCustomers}</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-alt/50">
                  <th className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.nameLabelFull}</th>
                  <th className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.phoneLabelFull}</th>
                  <th className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.cityLabelFull}</th>
                  <th className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.ordersLabel}</th>
                  <th className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.totalRevenue}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((c, i) => (
                  <tr key={i} className="hover:bg-surface-alt/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold text-[11px]">{c.customer_name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <span className="font-semibold text-ink">{c.customer_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted">{c.customer_phone}</td>
                    <td className="px-5 py-3.5 text-muted">{c.city || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-lg text-[11px] font-bold">{c.orders}</span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-gradient">{c.totalSpent} {t.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════ */
/*                    SETTINGS TAB                       */
/* ══════════════════════════════════════════════════════ */
function SettingsTab({ t }: { t: any }) {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn}>
      <h1 className="text-xl font-black text-ink mb-6">{t.settings}</h1>

      <div className="max-w-[600px]">
        {/* Store Info */}
        <div className="bg-surface border border-border rounded-2xl p-6 mb-5">
          <h3 className="font-bold text-ink mb-5 flex items-center gap-2">
            <Store size={16} className="text-primary" /> {t.storeInfo}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">{t.storeNameLabel}</label>
              <input type="text" defaultValue="ESRAA Moments" className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">{t.whatsappLabel}</label>
              <input type="tel" defaultValue="201097905435" className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">{t.emailLabel}</label>
              <input type="email" defaultValue="esraamomentsstore@gmail.com" className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">{t.addressLabelAdmin}</label>
              <input type="text" defaultValue="شارع الجيش - عزبة النخل" className="input-field" />
            </div>
          </div>
        </div>

        {/* Shipping Rules */}
        <div className="bg-surface border border-border rounded-2xl p-6 mb-5">
          <h3 className="font-bold text-ink mb-5 flex items-center gap-2">
            <Truck size={16} className="text-primary" /> {t.shippingInfo}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">{t.freeShippingHint}</label>
              <input type="number" defaultValue="500" className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">{t.shipping} ({t.currency})</label>
              <input type="number" defaultValue="60" className="input-field" />
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button onClick={handleSave} className="btn primary">
            {saved ? '✓ ' + t.profileSaved : t.saveChangesLabel}
          </button>
          {saved && <span className="text-success text-[13px] font-medium">{t.profileSaved}</span>}
        </div>
      </div>
    </motion.div>
  );
}

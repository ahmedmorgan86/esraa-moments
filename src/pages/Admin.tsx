import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, ClipboardList, Users, Settings, LogOut, TrendingUp,
  Search, ChevronDown, ChevronUp, Truck, CheckCircle,
  Clock, XCircle, ArrowUpRight, BarChart3, Store, Bell, Menu, Ticket, Plus, Edit3, Trash2, X, Grid, List, FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAllowedAdmin } from '../lib/adminAuth';
import type { Product, Coupon } from '../data';
import { occasions } from '../data';
import { useHomepageContent, type HomepageContent } from '../lib/homepageContent';

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const navItems = (t: any) => [
  { key: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
  { key: 'products', label: t.products, icon: Package },
  { key: 'orders', label: t.allOrders, icon: ClipboardList },
  { key: 'coupons', label: t.coupons, icon: Ticket },
  { key: 'content', label: 'محتوى الموقع (CMS)', icon: FileText },
  { key: 'customers', label: t.customers, icon: Users },
  { key: 'settings', label: t.settings, icon: Settings },
];

const statusStyles: Record<string, { color: string; icon: any; bg: string; border: string }> = {
  pending: { color: 'text-amber-500', icon: Clock, bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  confirmed: { color: 'text-blue-500', icon: CheckCircle, bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  shipped: { color: 'text-primary', icon: Truck, bg: 'bg-primary/10', border: 'border-primary/20' },
  delivered: { color: 'text-emerald-500', icon: CheckCircle, bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  cancelled: { color: 'text-red-500', icon: XCircle, bg: 'bg-red-500/10', border: 'border-red-500/20' },
  return_requested: { color: 'text-orange-500', icon: Package, bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
};

export default function AdminPage({ t, products, setProducts }: { t: any; products: Product[]; setProducts: React.Dispatch<React.SetStateAction<Product[]>> }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (!u || !isAllowedAdmin(u.email)) { navigate('/login', { replace: true }); return; }
      setUser(u);
      setLoading(false);
    });
  }, [navigate]);

  useEffect(() => {
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setNotifications(data);
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { setSidebarOpen(false); setNotifOpen(false); }, [tab]);

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
            <div className="relative">
              <button onClick={() => setNotifOpen(v => !v)} className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-primary/5 text-ink transition-colors">
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="absolute top-1 end-1 min-w-[16px] h-4 px-0.5 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">{notifications.length}</span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setNotifOpen(false)} />
                  <div className="absolute end-0 top-11 z-30 w-80 bg-surface border border-border rounded-2xl shadow-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                      <span className="text-[13px] font-bold text-ink">{t.notifications}</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.map(o => (
                        <button key={o.id} onClick={() => { setTab('orders'); }} className="w-full text-start px-4 py-3 hover:bg-primary/5 transition-colors border-b border-border/50 last:border-0 flex items-start gap-3">
                          <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                          <div>
                            <p className="text-[12px] font-bold text-ink">{o.customer_name || o.order_number}</p>
                            <p className="text-[11px] text-muted">{o.order_number}</p>
                            <span className="text-[10.5px] text-muted">{new Date(o.created_at).toLocaleString()}</span>
                          </div>
                        </button>
                      ))}
                      {notifications.length === 0 && (
                        <div className="px-4 py-10 text-center text-muted text-[12px]">{t.noOrders}</div>
                      )}
                    </div>
                    <button onClick={() => setTab('orders')} className="w-full px-4 py-2.5 bg-primary/5 text-primary text-[12px] font-bold">{t.allOrders}</button>
                  </div>
                </>
              )}
            </div>
            <Link to="/" className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-primary/5 text-ink transition-colors">
              <Store size={18} />
            </Link>
          </div>
        </header>

        {/* Tab Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <AnimatePresence mode="wait">
            {tab === 'dashboard' && <Dashboard key="d" t={t} products={products} />}
            {tab === 'products' && <ProductsTab key="p" t={t} products={products} setProducts={setProducts} />}
            {tab === 'orders' && <OrdersTab key="o" t={t} />}
            {tab === 'coupons' && <CouponsTab key="cp" t={t} />}
            {tab === 'content' && <ContentTab key="ct" t={t} />}
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
function Dashboard({ t, products }: { t: any; products: Product[] }) {
  const [stats, setStats] = useState({ products: products.length, orders: 0, revenue: 0, customers: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<{ date: string; amount: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; total: number }[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const lowStockProducts = products.filter(p => p.stock < 5);

  useEffect(() => {
    Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('total, items, status, created_at'),
      supabase.from('orders').select('customer_phone', { count: 'exact', head: true }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
    ]).then(([ordersCount, allOrders, customersCount, recent]) => {
      const rows = allOrders.data || [];
      const totalRevenue = rows.reduce((s: number, o: any) => s + (o.total || 0), 0);

      // Revenue by day (last 7 days)
      const days: { date: string; amount: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days.push({ date: key, amount: 0 });
      }
      rows.forEach((o: any) => {
        const key = new Date(o.created_at).toISOString().slice(0, 10);
        const slot = days.find(d => d.date === key);
        if (slot) slot.amount += o.total || 0;
      });
      setDailyRevenue(days);

      // Top products
      const productMap = new Map<string, number>();
      rows.forEach((o: any) => {
        const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items || [];
        items.forEach((item: any) => {
          productMap.set(item.name, (productMap.get(item.name) || 0) + (item.qty || 1));
        });
      });
      const top = Array.from(productMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, total]) => ({ name, total }));
      setTopProducts(top);

      // Status counts
      const sc: Record<string, number> = { pending: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0 };
      rows.forEach((o: any) => { if (sc[o.status] !== undefined) sc[o.status]++; });
      setStatusCounts(sc);

      setStats({
        products: products.length,
        orders: ordersCount.count || 0,
        revenue: totalRevenue,
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

  const maxRevenue = Math.max(...dailyRevenue.map(d => d.amount), 1);
  const totalStatusCount = Object.values(statusCounts).reduce((a, b) => a + b, 0) || 1;
  const statusColorMap: Record<string, string> = {
    pending: 'bg-amber-500', confirmed: 'bg-blue-500', shipped: 'bg-primary', delivered: 'bg-emerald-500', cancelled: 'bg-red-500',
  };
  const statusLabelMap: Record<string, string> = {
    pending: t.pending, confirmed: t.confirmed, shipped: t.shipped, delivered: t.delivered, cancelled: t.cancelled,
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn}>
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 mb-8">
          <h3 className="font-bold text-amber-600 mb-2">{t.lowStock || 'مخزون منخفض'} ({lowStockProducts.length})</h3>
          <div className="flex flex-wrap gap-2">
            {lowStockProducts.map(p => (
              <span key={p.id} className="bg-surface px-3 py-1 rounded-lg text-xs font-semibold border border-amber-500/30">
                {p.name}: <strong className="text-red-500">{p.stock}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-8">
        {/* Revenue Chart - spans 2 cols */}
        <div className="xl:col-span-2 bg-surface border border-border rounded-2xl p-6">
          <h3 className="font-bold text-ink mb-5 flex items-center gap-2"><BarChart3 size={16} className="text-primary" /> {t.revenueChart}</h3>
          <div className="flex items-end gap-2 h-48">
            {dailyRevenue.map(d => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted font-semibold">{d.amount > 0 ? d.amount.toLocaleString() : ''}</span>
                <div className="w-full rounded-t-lg bg-primary/20 relative" style={{ height: `${(d.amount / maxRevenue) * 100}%`, minHeight: d.amount > 0 ? '4px' : '2px' }}>
                  <div className="absolute inset-0 rounded-t-lg bg-primary/60" />
                </div>
                <span className="text-[10px] text-muted font-medium">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h3 className="font-bold text-ink mb-5 flex items-center gap-2"><TrendingUp size={16} className="text-primary" /> {t.topProducts}</h3>
          {topProducts.length === 0 ? (
            <p className="text-muted text-[13px] text-center py-8">{t.noOrders}</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-ink truncate">{p.name}</p>
                    <p className="text-[11px] text-muted">{p.total} {t.totalSold}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Orders by Status */}
      <div className="bg-surface border border-border rounded-2xl p-6 mb-8">
        <h3 className="font-bold text-ink mb-5 flex items-center gap-2"><ClipboardList size={16} className="text-primary" /> {t.ordersByStatus}</h3>
        <div className="space-y-3">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="flex items-center gap-3">
              <span className="w-28 text-[12px] font-semibold text-muted truncate">{statusLabelMap[status]}</span>
              <div className="flex-1 h-7 bg-surface-alt rounded-lg overflow-hidden">
                <div className={`h-full rounded-lg ${statusColorMap[status]} transition-all duration-500`} style={{ width: `${(count / totalStatusCount) * 100}%`, minWidth: count > 0 ? '8px' : '0' }} />
              </div>
              <span className="w-10 text-end text-[12px] font-bold text-ink">{count}</span>
            </div>
          ))}
        </div>
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
                    <p className="text-[11px] text-muted">{new Date(o.created_at).toLocaleDateString(document.documentElement.lang === 'en' ? 'en-US' : 'ar-EG')}</p>
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
function ProductsTab({ t, products, setProducts }: { t: any; products: Product[]; setProducts: React.Dispatch<React.SetStateAction<Product[]>> }) {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: '', name_en: '', desc: '', desc_en: '', category: occasions[0], price: 0, stock: 0, image: '', featured: false,
  });

  const filtered = products.filter(p => !search || p.name.includes(search) || p.name_en?.toLowerCase().includes(search.toLowerCase()));

  const resetForm = () => {
    setForm({ name: '', name_en: '', desc: '', desc_en: '', category: occasions[0], price: 0, stock: 0, image: '', featured: false });
    setEditing(null);
    setShowModal(false);
  };

  const openAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (product: Product) => {
    setForm({
      name: product.name, name_en: product.name_en || '', desc: product.desc, desc_en: product.desc_en || '',
      category: product.category, price: product.price, stock: product.stock, image: product.image, featured: product.featured || false,
    });
    setEditing(product);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name || form.price <= 0) return;
    if (editing) {
      setProducts(prev => prev.map(p => p.id === editing.id ? { ...p, ...form } : p));
    } else {
      const newProduct: Product = {
        id: `p${Date.now().toString(36)}`,
        name: form.name, name_en: form.name_en, desc: form.desc, desc_en: form.desc_en,
        category: form.category, price: form.price, stock: form.stock, image: form.image, featured: form.featured,
      };
      setProducts(prev => [...prev, newProduct]);
    }
    resetForm();
  };

  const handleDelete = (product: Product) => {
    setDeleteConfirm(product);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      setProducts(prev => prev.filter(p => p.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    }
  };

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
            {view === 'grid' ? <List size={16} /> : <Grid size={16} />}
          </button>
          <button onClick={openAdd} className="btn primary flex items-center gap-2 text-[13px]">
            <Plus size={16} /> {t.addNewProduct}
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
                  <span className="bg-surface/85 backdrop-blur-sm text-[10px] font-bold px-2 py-1 rounded-md text-ink">{p.stock} {t.qty}</span>
                </div>
                <div className="absolute bottom-3 end-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg bg-surface/90 backdrop-blur-sm flex items-center justify-center hover:bg-primary/10 text-muted hover:text-primary transition-colors border border-white/20">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => handleDelete(p)} className="w-8 h-8 rounded-lg bg-surface/90 backdrop-blur-sm flex items-center justify-center hover:bg-danger/10 text-muted hover:text-danger transition-colors border border-white/20">
                    <Trash2 size={14} />
                  </button>
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
                  <th className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.edit}</th>
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
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/5 text-muted hover:text-primary transition-colors">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleDelete(p)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-danger/5 text-muted hover:text-danger transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={resetForm}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-surface border border-border rounded-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h3 className="font-bold text-ink">{editing ? t.editProductTitle : t.addNewProduct}</h3>
                <button onClick={resetForm} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-alt text-muted"><X size={18} /></button>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-muted">{t.productNameAr}</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-muted">{t.productNameEn}</label>
                  <input type="text" value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} className="input-field" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-muted">{t.descAr}</label>
                  <textarea value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} className="input-field resize-none" rows={2} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-muted">{t.descEn}</label>
                  <textarea value={form.desc_en} onChange={e => setForm(f => ({ ...f, desc_en: e.target.value }))} className="input-field resize-none" rows={2} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-muted">{t.categoryLabel}</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-field">
                    {occasions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-muted">{t.priceLabel}</label>
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} className="input-field" min="0" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-muted">{t.stockLabel}</label>
                  <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: +e.target.value }))} className="input-field" min="0" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-muted">{t.imageUrl}</label>
                  <input type="text" value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} className="input-field" placeholder="/images/..." />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} className="w-4 h-4 accent-primary rounded" />
                    <span className="text-[13px] font-semibold text-ink">{t.featuredLabel}</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 px-6 pb-6 pt-2">
                <button onClick={handleSave} className="btn primary">{t.saveProduct}</button>
                <button onClick={resetForm} className="btn border">{t.cancelLabel}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-surface border border-border rounded-2xl w-full max-w-[400px] p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-danger" />
              </div>
              <h3 className="font-bold text-ink mb-2">{t.confirmDelete}</h3>
              <p className="text-muted text-[13px] mb-6">{deleteConfirm.name}</p>
              <div className="flex gap-2 justify-center">
                <button onClick={confirmDelete} className="px-5 py-2.5 rounded-xl text-[13px] font-bold bg-danger text-white hover:bg-danger/90 transition-colors">{t.delete}</button>
                <button onClick={() => setDeleteConfirm(null)} className="btn border">{t.cancelLabel}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('em-admin-order-notes') || '{}'); } catch { return {}; }
  });

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

  const saveAdminNote = (orderId: string, note: string) => {
    const updated = { ...adminNotes, [orderId]: note };
    setAdminNotes(updated);
    localStorage.setItem('em-admin-order-notes', JSON.stringify(updated));
  };

  const filteredOrders = orders.filter(o => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || o.order_number?.toLowerCase().includes(q) || o.customer_name?.toLowerCase().includes(q) || o.customer_phone?.includes(q);
    const orderDate = new Date(o.created_at);
    const matchesStart = !startDate || orderDate >= new Date(startDate);
    const matchesEnd = !endDate || orderDate <= new Date(endDate + 'T23:59:59');
    return matchesSearch && matchesStart && matchesEnd;
  });

  const exportCsv = () => {
    const header = 'Order Number,Customer Name,Phone,Email,Items,Total,Status,Date';
    const rows = filteredOrders.map(o => {
      const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items || [];
      const itemsStr = items.map((i: any) => `${i.name} x${i.qty}`).join('; ');
      const date = new Date(o.created_at).toLocaleDateString(document.documentElement.lang === 'en' ? 'en-US' : 'ar-EG');
      return `${o.order_number},"${(o.customer_name||'').replace(/"/g,'""')}",${o.customer_phone||''},${o.customer_email||''},"${itemsStr.replace(/"/g,'""')}",${o.total||0},${o.status},${date}`;
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openWhatsApp = (phone: string, orderNumber: string) => {
    const msg = encodeURIComponent(`مرحباً، بخصوص أوردر رقم ${orderNumber}`);
    window.open(`https://wa.me/${phone?.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
  };

  const printOrder = (o: any) => {
    const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items || [];
    const itemsHtml = items.map((i: any) => `<tr><td>${i.name}</td><td>${i.qty}</td><td>${i.price * i.qty} ${t.currency}</td></tr>`).join('');
    const html = `<html><head><title>${o.order_number}</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style></head><body><h2>${o.order_number}</h2><p><b>${t.nameLabel}</b> ${o.customer_name}</p><p><b>${t.phoneLabelShort}</b> ${o.customer_phone}</p><p><b>${t.cityLabelShort}</b> ${o.city||'-'}</p><p><b>${t.status}</b> ${o.status}</p><table><thead><tr><th>${t.productsLabel}</th><th>${t.qty}</th><th>${t.totalPrice}</th></tr></thead><tbody>${itemsHtml}</tbody></table><p style="font-size:18px"><b>${t.totalPrice}: ${o.total} ${t.currency}</b></p>${o.notes?`<p><b>${t.notesLabel}:</b> ${o.notes}</p>`:''}</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  const statusOpts = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  const statusLabelsMap: Record<string, string> = { all: t.allStatuses, pending: t.pending, confirmed: t.confirmed, shipped: t.shipped, delivered: t.delivered, cancelled: t.cancelled };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-black text-ink">{t.allOrders} <span className="text-sm font-semibold text-muted">({filteredOrders.length} {t.filteredCount})</span></h1>
        <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold bg-primary text-white hover:bg-primary/90 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          {t.exportCsv}
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-xl">
          <Search size={14} className="text-muted" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t.searchOrders} className="w-full text-[13px] outline-none bg-transparent" />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-xl">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-[12px] outline-none bg-transparent text-muted" title={t.startDate} />
          <span className="text-border text-[11px]">—</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-[12px] outline-none bg-transparent text-muted" title={t.endDate} />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2">
        {statusOpts.map(s => {
          const active = statusFilter === s;
          return (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-xl text-[12px] font-bold whitespace-nowrap border transition-all ${active ? 'bg-ink text-surface-alt border-ink shadow-sm' : 'bg-surface border-border text-muted hover:border-primary/40'}`}>
              {statusLabelsMap[s]}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-16 text-center"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl py-16 text-center">
          <ClipboardList size={40} className="mx-auto mb-3 text-border" />
          <p className="text-muted text-sm">{t.noOrdersFound}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredOrders.map(o => {
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
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${st.color} ${st.bg}`}>{statusLabelsMap[o.status]}</span>
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

                        {/* Admin Notes */}
                        <div className="mb-4">
                          <p className="text-[11px] font-bold text-muted mb-2">{t.adminNotes}</p>
                          <textarea value={adminNotes[o.id] || ''} onChange={e => saveAdminNote(o.id, e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl border border-border bg-surface-alt text-[13px] outline-none focus:border-primary/40 transition-colors resize-none" placeholder={t.adminNotes + '...'} />
                        </div>

                        {/* Status Actions */}
                        <div className="mb-4">
                          <p className="text-[11px] font-bold text-muted mb-2">{t.status}</p>
                          <div className="flex flex-wrap gap-2">
                            {['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(s => {
                              const sSt = statusStyles[s];
                              const SIcon = sSt.icon;
                              const isActive = o.status === s;
                              return (
                                <button key={s} onClick={() => updateStatus(o.id, s)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold border transition-all ${isActive ? `${sSt.bg} ${sSt.border} ${sSt.color} shadow-sm` : 'border-border text-muted hover:border-primary/40'}`}>
                                  <SIcon size={12} /> {statusLabelsMap[s]}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => openWhatsApp(o.customer_phone, o.order_number)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            {t.contactWhatsApp}
                          </button>
                          <button onClick={() => printOrder(o)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold bg-surface-alt text-muted border border-border hover:border-primary/40 transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                            {t.printOrder}
                          </button>
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
/*                    COUPONS TAB                        */
/* ══════════════════════════════════════════════════════ */
function CouponsTab({ t }: { t: any }) {
  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    const saved = localStorage.getItem('em-coupons');
    return saved ? JSON.parse(saved) : [];
  });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState({
    code: '', discountType: 'percent' as 'percent' | 'fixed', discountValue: 0,
    minOrder: 0, maxUses: 100, expiresAt: '', active: true,
  });

  useEffect(() => {
    localStorage.setItem('em-coupons', JSON.stringify(coupons));
  }, [coupons]);

  const resetForm = () => {
    setForm({ code: '', discountType: 'percent', discountValue: 0, minOrder: 0, maxUses: 100, expiresAt: '', active: true });
    setEditing(null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!form.code || form.discountValue <= 0) return;
    if (editing) {
      setCoupons(prev => prev.map(c => c.id === editing.id ? { ...c, ...form, code: form.code.toUpperCase() } : c));
    } else {
      const newCoupon: Coupon = {
        id: `cp-${Date.now()}`,
        code: form.code.toUpperCase(),
        discountType: form.discountType,
        discountValue: form.discountValue,
        minOrder: form.minOrder,
        maxUses: form.maxUses,
        usedCount: 0,
        expiresAt: form.expiresAt,
        active: form.active,
      };
      setCoupons(prev => [...prev, newCoupon]);
    }
    resetForm();
  };

  const handleEdit = (coupon: Coupon) => {
    setForm({
      code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue,
      minOrder: coupon.minOrder, maxUses: coupon.maxUses, expiresAt: coupon.expiresAt, active: coupon.active,
    });
    setEditing(coupon);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setCoupons(prev => prev.filter(c => c.id !== id));
  };

  const toggleActive = (id: string) => {
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-black text-ink">{t.coupons}</h1>
          <p className="text-muted text-[13px] mt-0.5">{coupons.length} {t.coupons}</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn primary flex items-center gap-2">
          <span className="text-lg">+</span> {t.addCoupon}
        </button>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h3 className="font-bold text-ink mb-4">{editing ? t.editCoupon : t.addCoupon}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-muted">{t.couponCode}</label>
                  <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="input-field" placeholder="SAVE10" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-muted">{t.discountType}</label>
                  <select value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value as 'percent' | 'fixed' }))} className="input-field">
                    <option value="percent">{t.percent}</option>
                    <option value="fixed">{t.fixed}</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-muted">{form.discountType === 'percent' ? '%' : t.currency}</label>
                  <input type="number" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: +e.target.value }))} className="input-field" min="0" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-muted">{t.minOrder} ({t.currency})</label>
                  <input type="number" value={form.minOrder} onChange={e => setForm(f => ({ ...f, minOrder: +e.target.value }))} className="input-field" min="0" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-muted">{t.maxUses}</label>
                  <input type="number" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: +e.target.value }))} className="input-field" min="1" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-muted">{t.expiresAt}</label>
                  <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className="input-field" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-muted">{t.active}</label>
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-primary rounded" />
                    <span className="text-sm font-medium">{form.active ? t.active : t.inactive}</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={handleSave} className="btn primary">{editing ? t.saveChangesLabel : t.addCoupon}</button>
                <button onClick={resetForm} className="btn border">{t.cancel}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coupons List */}
      {coupons.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl py-16 text-center">
          <Ticket size={40} className="mx-auto mb-3 text-border" />
          <p className="text-muted text-sm">{t.noResults}</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-alt/50">
                  <th className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.couponCode}</th>
                  <th className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.discountType}</th>
                   <th className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.discountValueLabel}</th>
                  <th className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.minOrder}</th>
                  <th className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.usedCount}/{t.maxUses}</th>
                  <th className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.expiresAt}</th>
                  <th className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.active}</th>
                  <th className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.edit}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons.map(c => (
                  <tr key={c.id} className="hover:bg-surface-alt/50 transition-colors">
                    <td className="px-5 py-3 font-bold text-primary">{c.code}</td>
                    <td className="px-5 py-3 text-muted">{c.discountType === 'percent' ? t.percent : t.fixed}</td>
                    <td className="px-5 py-3 font-bold text-ink">{c.discountValue}{c.discountType === 'percent' ? '%' : ` ${t.currency}`}</td>
                    <td className="px-5 py-3 text-muted">{c.minOrder} {t.currency}</td>
                    <td className="px-5 py-3 text-muted">{c.usedCount}/{c.maxUses}</td>
                    <td className="px-5 py-3 text-muted">{c.expiresAt || '—'}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => toggleActive(c.id)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${c.active ? 'bg-success/10 text-success' : 'bg-muted/10 text-muted'}`}>
                        {c.active ? t.active : t.inactive}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleEdit(c)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/5 text-muted hover:text-primary transition-colors">
                          <span className="text-sm">{t.edit}</span>
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-danger/5 text-muted hover:text-danger transition-colors">
                          <span className="text-sm">{t.delete}</span>
                        </button>
                      </div>
                    </td>
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
  const [name, setName] = useState(() => localStorage.getItem('em-store-name') || 'ESRAA Moments');
  const [whatsapp, setWhatsapp] = useState(() => localStorage.getItem('em-store-whatsapp') || '201097905435');
  const [email, setEmail] = useState(() => localStorage.getItem('em-store-email') || 'esraamomentsstore@gmail.com');
  const [address, setAddress] = useState(() => localStorage.getItem('em-store-address') || 'شارع الجيش - عزبة النخل');
  const [shippingThreshold, setShippingThreshold] = useState(() => localStorage.getItem('em-shipping-threshold') || '500');
  const [shippingFee, setShippingFee] = useState(() => localStorage.getItem('em-shipping-fee') || '60');

  const handleSave = () => {
    localStorage.setItem('em-store-name', name);
    localStorage.setItem('em-store-whatsapp', whatsapp);
    localStorage.setItem('em-store-email', email);
    localStorage.setItem('em-store-address', address);
    localStorage.setItem('em-shipping-threshold', shippingThreshold);
    localStorage.setItem('em-shipping-fee', shippingFee);
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
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">{t.whatsappLabel}</label>
              <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">{t.emailLabel}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">{t.addressLabelAdmin}</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="input-field" />
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
              <input type="number" value={shippingThreshold} onChange={e => setShippingThreshold(e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">{t.shipping} ({t.currency})</label>
              <input type="number" value={shippingFee} onChange={e => setShippingFee(e.target.value)} className="input-field" />
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

/* ══════════════════════════════════════════════════════ */
/*                    CONTENT CMS TAB                    */
/* ══════════════════════════════════════════════════════ */
function ContentTab({ t: _t }: { t: any }) {
  const [content, setContent] = useHomepageContent();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const updateField = (field: keyof HomepageContent, val: any) => {
    setContent(prev => ({ ...prev, [field]: val }));
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn}>
      <div className="max-w-4xl">
        <h2 className="text-xl font-black text-ink mb-6">إدارة محتوى الموقع (CMS)</h2>

        {/* Hero Section CMS */}
        <div className="bg-surface border border-border rounded-2xl p-6 mb-5 space-y-4">
          <h3 className="font-bold text-ink text-base flex items-center gap-2"><FileText size={16} className="text-primary" /> قسم الواجهة (Hero)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">عنوان العرض الرئيسي (عربي)</label>
              <input type="text" value={content.heroEyebrow} onChange={e => updateField('heroEyebrow', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">Eyebrow (English)</label>
              <input type="text" value={content.heroEyebrowEn} onChange={e => updateField('heroEyebrowEn', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">العنوان الأول (عربي)</label>
              <input type="text" value={content.heroTitle1} onChange={e => updateField('heroTitle1', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">Title 1 (English)</label>
              <input type="text" value={content.heroTitle1En} onChange={e => updateField('heroTitle1En', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">العنوان الثاني (عربي)</label>
              <input type="text" value={content.heroTitle2} onChange={e => updateField('heroTitle2', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">Title 2 (English)</label>
              <input type="text" value={content.heroTitle2En} onChange={e => updateField('heroTitle2En', e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-muted">الوصف (عربي)</label>
            <textarea rows={3} value={content.heroDesc} onChange={e => updateField('heroDesc', e.target.value)} className="input-field w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-muted">Description (English)</label>
            <textarea rows={3} value={content.heroDescEn} onChange={e => updateField('heroDescEn', e.target.value)} className="input-field w-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">نص الزر (عربي)</label>
              <input type="text" value={content.heroCta} onChange={e => updateField('heroCta', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">CTA (English)</label>
              <input type="text" value={content.heroCtaEn} onChange={e => updateField('heroCtaEn', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">بطاقة تغطية 1 (عربي)</label>
              <input type="text" value={content.heroOverlay1} onChange={e => updateField('heroOverlay1', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">Overlay 1 (English)</label>
              <input type="text" value={content.heroOverlay1En} onChange={e => updateField('heroOverlay1En', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">بطاقة تغطية 2 (عربي)</label>
              <input type="text" value={content.heroOverlay2} onChange={e => updateField('heroOverlay2', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">Overlay 2 (English)</label>
              <input type="text" value={content.heroOverlay2En} onChange={e => updateField('heroOverlay2En', e.target.value)} className="input-field" />
            </div>
          </div>
        </div>

        {/* Brand Story CMS */}
        <div className="bg-surface border border-border rounded-2xl p-6 mb-5 space-y-4">
          <h3 className="font-bold text-ink text-base flex items-center gap-2"><FileText size={16} className="text-primary" /> قسم قصتنا (Brand Story)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">عنوان القسم (عربي)</label>
              <input type="text" value={content.storyTitle} onChange={e => updateField('storyTitle', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">Story Title (English)</label>
              <input type="text" value={content.storyTitleEn} onChange={e => updateField('storyTitleEn', e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">المقولة (عربي)</label>
              <input type="text" value={content.storyQuote} onChange={e => updateField('storyQuote', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted">Quote (English)</label>
              <input type="text" value={content.storyQuoteEn} onChange={e => updateField('storyQuoteEn', e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-muted">نص القصة (عربي)</label>
            <textarea rows={3} value={content.storyText} onChange={e => updateField('storyText', e.target.value)} className="input-field w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-muted">Story Text (English)</label>
            <textarea rows={3} value={content.storyTextEn} onChange={e => updateField('storyTextEn', e.target.value)} className="input-field w-full" />
          </div>
        </div>

        {/* FAQs CMS */}
        <div className="bg-surface border border-border rounded-2xl p-6 mb-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-ink text-base flex items-center gap-2"><FileText size={16} className="text-primary" /> الأسئلة الشائعة (FAQ)</h3>
            <button type="button" onClick={() => updateField('faqs', [...content.faqs, { q: '', q_en: '', a: '', a_en: '' }])} className="btn primary text-xs py-1.5 px-3 flex items-center gap-1"><Plus size={14} /> إضافة سؤال</button>
          </div>
          <div className="space-y-4">
            {content.faqs.map((faq, idx) => (
              <div key={idx} className="bg-surface-alt border border-border rounded-xl p-4 space-y-3 relative">
                <button type="button" onClick={() => updateField('faqs', content.faqs.filter((_, i) => i !== idx))} className="absolute top-3 end-3 w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-colors"><Trash2 size={14} /></button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-muted">السؤال (عربي)</label>
                    <input type="text" value={faq.q} onChange={e => { const f = [...content.faqs]; f[idx] = { ...f[idx], q: e.target.value }; updateField('faqs', f); }} className="input-field text-xs" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-muted">Question (English)</label>
                    <input type="text" value={faq.q_en} onChange={e => { const f = [...content.faqs]; f[idx] = { ...f[idx], q_en: e.target.value }; updateField('faqs', f); }} className="input-field text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-muted">الإجابة (عربي)</label>
                    <textarea rows={2} value={faq.a} onChange={e => { const f = [...content.faqs]; f[idx] = { ...f[idx], a: e.target.value }; updateField('faqs', f); }} className="input-field text-xs w-full" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-muted">Answer (English)</label>
                    <textarea rows={2} value={faq.a_en} onChange={e => { const f = [...content.faqs]; f[idx] = { ...f[idx], a_en: e.target.value }; updateField('faqs', f); }} className="input-field text-xs w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button onClick={handleSave} className="btn primary">
            {saved ? '✓ تم الحفظ' : 'حفظ محتوى الموقع'}
          </button>
          {saved && <span className="text-success text-[13px] font-medium">تم الحفظ بنجاح!</span>}
        </div>
      </div>
    </motion.div>
  );
}

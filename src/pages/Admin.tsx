import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, ClipboardList, Users, Settings, LogOut, TrendingUp,
  Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Truck, CheckCircle,
  Clock, XCircle, BarChart3, Store, Bell, Menu, Ticket, Plus, Edit3, Trash2, X, Grid, List, FileText,
  Star, MessageSquare, RotateCcw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAllowedAdmin } from '../lib/adminAuth';
import type { Product, Coupon } from '../data';
import { occasions } from '../data';
import { useStoreSettings, saveStoreSettings, readJSON, type StoreSettings } from '../hooks';
import {
  createProduct, updateProduct, archiveProduct, restoreProduct, fetchProductsAdmin,
  fetchCoupons as fetchRemoteCoupons, saveCoupon as saveRemoteCoupon,
  deleteCoupon as deleteRemoteCoupon, fetchReviewsAdmin, moderateReview, deleteReview,
  type ReviewRow, type ReviewStatus,
} from '../lib/storeData';
import { useSite } from '../lib/site';
import {
  useHomepageContent, saveHomepageContent, resetHomepageContent,
  defaultHomepageContent, HOMEPAGE_SETTING_KEY, type HomepageContent,
} from '../lib/homepageContent';
import { saveSetting } from '../lib/storeData';

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

/** Orders.items is a JSONB column that may arrive as a string. Never let a malformed
 *  value throw inside render — that unmounts the whole app without an ErrorBoundary. */
function parseOrderItems(raw: unknown): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; }
    catch { return []; }
  }
  return [];
}

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));

/** Escape untrusted values before injecting them into a document. Order fields such as
 *  `notes` and `customer_name` come straight from the customer. */
function escapeHtml(v: unknown): string {
  return str(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** RFC-4180 cell + spreadsheet formula-injection guard (=, +, -, @, tab, CR). */
function csvCell(v: unknown): string {
  let s = str(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Local (not UTC) YYYY-MM-DD so charts line up with the store's timezone. */
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const navItems = (t: any) => [
  { key: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
  { key: 'products', label: t.products, icon: Package },
  { key: 'orders', label: t.allOrders, icon: ClipboardList },
  { key: 'coupons', label: t.coupons, icon: Ticket },
  { key: 'reviews', label: t.reviews, icon: MessageSquare },
  { key: 'content', label: t.cms, icon: FileText },
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [authError, setAuthError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => {
        const u = data.session?.user;
        if (!u || !isAllowedAdmin(u.email)) { navigate('/login', { replace: true }); return; }
        setUser(u);
        setLoading(false);
      })
      .catch(() => { setAuthError(true); setLoading(false); });
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      if (!u || !isAllowedAdmin(u.email)) { navigate('/login', { replace: true }); return; }
      setUser(u);
    });
    return () => sub.subscription.unsubscribe();
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const fetchNotifs = async () => {
      if (document.hidden) return;
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(8);
      if (cancelled || error || !data) return;
      setNotifications(data);
      if (data.length >= 8) {
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        if (!cancelled && typeof count === 'number') setPendingCount(count);
      } else if (!cancelled) {
        // Fewer than 8 rows already means that is the exact number; leaving
        // the counter at 0 hid the badge while pending orders existed.
        setPendingCount(data.length);
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user]);

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

  if (authError) return (
    <div className="min-h-screen flex items-center justify-center bg-surface-alt px-4">
      <div className="text-center max-w-sm">
        <p className="font-bold text-ink mb-2">{t.error}</p>
        <p className="text-muted text-sm mb-5">{t.unexpectedError}</p>
        <a href="/login" className="btn primary">{t.login}</a>
      </div>
    </div>
  );

  const nav = navItems(t);

  return (
    <div className="admin-shell min-h-screen bg-surface-alt flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 start-0 z-50 h-screen ${sidebarCollapsed ? 'lg:w-[76px]' : 'lg:w-[260px]'} w-[260px] bg-surface border-e border-border flex flex-col transition-[width,transform] duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'}`}>
        <button
          type="button"
          aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          onClick={() => setSidebarCollapsed(value => !value)}
          className="hidden lg:flex absolute -end-3 top-16 z-10 w-6 h-6 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-sm hover:text-primary hover:border-primary transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Brand */}
        <div className={`p-5 border-b border-border ${sidebarCollapsed ? 'lg:px-3' : ''}`}>
          <Link to="/" className={`flex items-center gap-3 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              <img src="/images/logo.jpeg" alt="ESRAA" className="w-full h-full object-cover" />
            </div>
            <div className={sidebarCollapsed ? 'lg:hidden' : ''}>
              <span className="font-black text-sm text-ink block leading-tight">ESRAA Moments</span>
              <span className="text-[10.5px] text-primary font-semibold">{t.adminPanel}</span>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className={`flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto ${sidebarCollapsed ? 'lg:px-2' : ''}`}>
          {nav.map(n => {
            const active = tab === n.key;
            return (
              <button key={n.key} title={sidebarCollapsed ? n.label : undefined} onClick={() => { setTab(n.key); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''} ${active ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-muted hover:bg-primary/5 hover:text-ink'}`}>
                <n.icon size={17} strokeWidth={active ? 2.2 : 1.8} /> <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{n.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className={`p-3 border-t border-border ${sidebarCollapsed ? 'lg:px-2' : ''}`}>
          <div className={`flex items-center gap-3 px-3 py-2.5 mb-1 ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-xs">{user.email?.charAt(0).toUpperCase()}</span>
            </div>
            <div className={`min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <p className="text-[12px] font-bold text-ink truncate">{user.email}</p>
              <p className="text-[10.5px] text-primary font-medium">{t.managerLabel}</p>
            </div>
          </div>
          <button title={sidebarCollapsed ? t.logoutLabel : undefined} onClick={handleLogout} className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold text-danger/70 hover:text-danger hover:bg-danger/5 transition-all ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}>
            <LogOut size={16} /> <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{t.logoutLabel}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-surface-alt/80 backdrop-blur-md border-b border-border px-4 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} aria-label={t.openMenu} title={t.openMenu} className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-primary/5 text-ink">
              <Menu size={20} />
            </button>
            <h1 className="font-bold text-ink text-sm">{nav.find(n => n.key === tab)?.label}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setNotifOpen(v => !v)} aria-label={t.notifications} aria-expanded={notifOpen} className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-primary/5 text-ink transition-colors">
                <Bell size={18} />
                {pendingCount > 0 && (
                  <span className="absolute top-1 end-1 min-w-[16px] h-4 px-0.5 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">{pendingCount > 99 ? '99+' : pendingCount}</span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setNotifOpen(false)} />
                  <div role="dialog" aria-label={t.notifications} className="absolute end-0 top-11 z-30 w-80 bg-surface border border-border rounded-2xl shadow-xl overflow-hidden">
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
            <Link to="/" aria-label={t.viewStore} title={t.viewStore} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-primary/5 text-ink transition-colors">
              <Store size={18} />
            </Link>
          </div>
        </header>

        {/* Tab Content */}
        <div className="admin-main flex-1 p-4 lg:p-8 overflow-auto">
          <AnimatePresence mode="wait">
            {tab === 'dashboard' && <Dashboard key="d" t={t} products={products} />}
            {tab === 'products' && <ProductsTab key="p" t={t} products={products} setProducts={setProducts} />}
            {tab === 'orders' && <OrdersTab key="o" t={t} />}
            {tab === 'coupons' && <CouponsTab key="cp" t={t} />}
            {tab === 'reviews' && <ReviewsTab key="rv" t={t} products={products} />}
            {tab === 'content' && <ContentTab key="ct" t={t} />}
            {tab === 'customers' && <CustomersTab key="c" t={t} />}
            {tab === 'settings' && <SettingsTab key="s" t={t} />}
          </AnimatePresence>
        </div>
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
  const [loadError, setLoadError] = useState(false);
  const lowStockProducts = products.filter(p => p.stock < 5);
  const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('total, items, status, created_at, customer_phone, customer_email'),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
    ])
      .then(([ordersCount, allOrders, recent]) => {
        if (cancelled) return;
        if (allOrders.error) { setLoadError(true); return; }
        const rows = allOrders.data || [];

        // Cancelled orders are not revenue.
        const paid = rows.filter((o: any) => o.status !== 'cancelled');
        const totalRevenue = paid.reduce((s: number, o: any) => s + (o.total || 0), 0);

        // Distinct customers, matching what CustomersTab shows.
        const people = new Set<string>();
        rows.forEach((o: any) => {
          const key = str(o.customer_phone || o.customer_email).trim();
          if (key) people.add(key);
        });

        // Revenue by day (last 7 days, local time)
        const days: { date: string; amount: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          days.push({ date: localDateKey(d), amount: 0 });
        }
        paid.forEach((o: any) => {
          const key = localDateKey(new Date(o.created_at));
          const slot = days.find(d => d.date === key);
          if (slot) slot.amount += o.total || 0;
        });
        setDailyRevenue(days);

        // Top products
        const productMap = new Map<string, number>();
        paid.forEach((o: any) => {
          parseOrderItems(o.items).forEach((item: any) => {
            const name = str(item.name).trim();
            if (!name) return;
            productMap.set(name, (productMap.get(name) || 0) + (item.qty || 1));
          });
        });
        const top = Array.from(productMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, total]) => ({ name, total }));
        setTopProducts(top);

        // Status counts
        const sc: Record<string, number> = { pending: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0, return_requested: 0 };
        rows.forEach((o: any) => { if (sc[o.status] !== undefined) sc[o.status]++; });
        setStatusCounts(sc);

        setStats({
          products: products.length,
          orders: ordersCount.count || 0,
          revenue: totalRevenue,
          customers: people.size,
        });
        setRecentOrders(recent.data || []);
      })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [products.length]);

  const cards = [
    { label: t.totalProducts, value: stats.products, icon: Package, gradient: 'from-primary/10 to-primary/5', iconColor: 'text-primary' },
    { label: t.totalOrders, value: stats.orders, icon: ClipboardList, gradient: 'from-blue-500/10 to-blue-500/5', iconColor: 'text-blue-600' },
    { label: t.totalRevenue, value: `${stats.revenue.toLocaleString()} ${t.currency}`, icon: TrendingUp, gradient: 'from-emerald-500/10 to-emerald-500/5', iconColor: 'text-emerald-600' },
    { label: t.totalCustomers, value: stats.customers, icon: Users, gradient: 'from-violet-500/10 to-violet-500/5', iconColor: 'text-violet-600' },
  ];

  const maxRevenue = Math.max(...dailyRevenue.map(d => d.amount), 1);
  const totalStatusCount = Object.values(statusCounts).reduce((a, b) => a + b, 0) || 1;
  const statusColorMap: Record<string, string> = {
    pending: 'bg-amber-500', confirmed: 'bg-blue-500', shipped: 'bg-primary', delivered: 'bg-emerald-500', cancelled: 'bg-red-500', return_requested: 'bg-orange-500',
  };
  const statusLabelMap: Record<string, string> = {
    pending: t.pending, confirmed: t.confirmed, shipped: t.shipped, delivered: t.delivered, cancelled: t.cancelled, return_requested: t.returnRequested,
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn}>
      {loadError && (
        <div role="alert" className="bg-danger/10 border border-danger/20 rounded-2xl p-4 mb-8 flex items-center justify-between gap-4">
          <p className="text-danger text-sm font-semibold">{t.dataLoadError}</p>
          <button type="button" onClick={() => window.location.reload()} className="btn ghost sm">{t.retry}</button>
        </div>
      )}

      {lowStockProducts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 mb-8">
          <h3 className="font-bold text-amber-600 mb-2">{t.lowStock} ({lowStockProducts.length})</h3>
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
          <div role="img" aria-label={t.revenueChart} className="flex items-end gap-2 h-48">
            {dailyRevenue.map(d => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted font-semibold">{d.amount > 0 ? d.amount.toLocaleString() : ''}</span>
                <div title={`${d.date}: ${d.amount.toLocaleString()} ${t.currency}`} className="w-full rounded-t-lg bg-primary/20 relative" style={{ height: `${(d.amount / maxRevenue) * 100}%`, minHeight: d.amount > 0 ? '4px' : '2px' }}>
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
              <span className="w-28 text-[12px] font-semibold text-muted truncate">{statusLabelMap[status] || status}</span>
              <div className="flex-1 h-7 bg-surface-alt rounded-lg overflow-hidden">
                <div className={`h-full rounded-lg ${statusColorMap[status] || 'bg-muted'} transition-all duration-500`} style={{ width: `${(count / totalStatusCount) * 100}%`, minWidth: count > 0 ? '8px' : '0' }} />
              </div>
              <span className="w-10 text-end text-[12px] font-bold text-ink">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-bold text-ink">{t.recentOrders}</h3>
        </div>
        {recentOrders.length === 0 ? (
          <div className="py-16 text-center">
            <BarChart3 size={40} className="mx-auto mb-3 text-border" />
            <p className="text-muted text-sm">{t.noOrders}</p>
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
                    <p className="font-bold text-[13px]">{Number(o.total || 0).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {t.currency}</p>
                    <p className="text-[11px] text-muted">{new Date(o.created_at).toLocaleDateString(isEn ? 'en-US' : 'ar-EG')}</p>
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
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);
  // null = nothing attempted yet, true = written to Supabase, false = only this browser.
  const [synced, setSynced] = useState<boolean | null>(null);
  const [form, setForm] = useState({
    name: '', name_en: '', desc: '', desc_en: '', category: occasions[0], price: 0, stock: 0, image: '', featured: false,
  });

  const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';
  const [showArchived, setShowArchived] = useState(false);

  // The storefront list filters archived rows out, so without this the Admin
  // would have no way to see — let alone restore — anything it archived.
  const [all, setAll] = useState<Product[]>(products);
  useEffect(() => {
    let alive = true;
    void fetchProductsAdmin().then(remote => { if (alive && remote) setAll(remote); });
    return () => { alive = false; };
  }, []);

  const live = all.length ? all : products;
  const archivedCount = live.filter(p => p.archived).length;
  const q = search.trim().toLowerCase();
  const filtered = live.filter(p => {
    if (p.archived && !showArchived) return false;
    return !q
      || p.name.toLowerCase().includes(q)
      || (p.name_en || '').toLowerCase().includes(q)
      || (p.desc || '').toLowerCase().includes(q)
      || (p.desc_en || '').toLowerCase().includes(q);
  });

  /** Apply a product change to both lists so the grid and the archive agree. */
  const applyLocally = (next: Product) => {
    setAll(prev => (prev.some(p => p.id === next.id)
      ? prev.map(p => p.id === next.id ? { ...p, ...next } : p)
      : [...prev, next]));
    setProducts(prev => (prev.some(p => p.id === next.id)
      ? prev.map(p => p.id === next.id ? { ...p, ...next } : p)
      : [...prev, next]));
  };

  const resetForm = () => {
    setForm({ name: '', name_en: '', desc: '', desc_en: '', category: occasions[0], price: 0, stock: 0, image: '', featured: false });
    setEditing(null);
    setShowModal(false);
    setFormError('');
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
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError(t.requiredField); return; }
    if (!(form.price > 0)) { setFormError(t.invalidPrice); return; }
    if (form.stock < 0) { setFormError(t.invalidStock); return; }

    const next: Product = editing
      ? { ...editing, ...form }
      : {
          id: `p${Date.now().toString(36)}`,
          name: form.name, name_en: form.name_en, desc: form.desc, desc_en: form.desc_en,
          category: form.category, price: form.price, stock: form.stock, image: form.image, featured: form.featured,
        };

    // Paint first, then push. The remote write is the one that can fail, and the
    // admin has to be told which of the two actually happened.
    applyLocally(next);
    setSynced(await (editing ? updateProduct(next) : createProduct(next)));
    setSaved(true);
    setFormError('');
    resetForm();
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDelete = (product: Product) => {
    setDeleteConfirm(product);
  };

  // Archive instead of delete: orders and reviews reference product ids, and a
  // hard delete would take the row out from under a past order.
  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm.id;
    setAll(prev => prev.map(p => p.id === id ? { ...p, archived: true } : p));
    setProducts(prev => prev.map(p => p.id === id ? { ...p, archived: true } : p));
    setSynced(await archiveProduct(id));
    setDeleteConfirm(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const confirmRestore = async (product: Product) => {
    applyLocally({ ...product, archived: false });
    setSynced(await restoreProduct(product.id));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
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
            <Search size={14} className="text-muted shrink-0" />
            <input type="search" value={search} onChange={e => setSearch(e.target.value)} aria-label={t.searchPlaceholder} placeholder={t.searchPlaceholder} className="w-full sm:w-[180px] text-[13px] outline-none bg-transparent" />
          </div>
          <button onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')} aria-label={view === 'grid' ? t.listView : t.gridView} title={view === 'grid' ? t.listView : t.gridView} className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-surface-alt transition-colors text-muted">
            {view === 'grid' ? <List size={16} /> : <Grid size={16} />}
          </button>
          <button onClick={openAdd} className="btn primary flex items-center gap-2 text-[13px]">
            <Plus size={16} /> {t.addNewProduct}
          </button>
        </div>
      </div>

      {archivedCount > 0 && (
        <label className="flex items-center gap-2 mb-5 text-[13px] text-muted cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={e => setShowArchived(e.target.checked)}
            className="accent-primary w-4 h-4"
          />
          {t.showArchived} ({archivedCount})
        </label>
      )}

      {saved && (
        <div role="status" className={`border rounded-xl px-4 py-3 mb-5 text-[13px] font-semibold ${synced === false ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>
          {t.savedSuccessfully}
          {synced === false && <span className="block font-normal text-[12px] mt-0.5">{t.savedLocallyOnly}</span>}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl py-16 text-center">
          <Package size={40} className="mx-auto mb-3 text-border" />
          <p className="text-muted text-sm mb-4">{q ? t.noSearchResults : t.noProductsYet}</p>
          {!q && <button onClick={openAdd} className="btn primary text-[13px]"><Plus size={16} /> {t.addNewProduct}</button>}
        </div>
      ) : view === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="bg-surface border border-border rounded-2xl overflow-hidden hover:shadow-md transition-all group">
              <div className="relative aspect-square overflow-hidden">
                {p.image ? (
                  <img src={p.image} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2'; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-border"><Package size={32} /></div>
                )}
                <div className="absolute top-3 start-3 flex flex-col items-start gap-1">
                  {p.featured && <span className="bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-md">{t.featuredLabel}</span>}
                  {p.archived && <span className="bg-slate-700 text-white text-[10px] font-bold px-2 py-1 rounded-md">{t.archivedLabel}</span>}
                </div>
                <div className="absolute top-3 end-3">
                  <span className="bg-surface/85 backdrop-blur-sm text-[10px] font-bold px-2 py-1 rounded-md text-ink">{p.stock} {t.qty}</span>
                </div>
                <div className="absolute bottom-3 end-3 flex items-center gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                  {p.archived ? (
                    <button onClick={() => void confirmRestore(p)} aria-label={`${t.restore} ${p.name}`} title={t.restore} className="w-8 h-8 rounded-lg bg-surface/90 backdrop-blur-sm flex items-center justify-center hover:bg-emerald-500/10 text-muted hover:text-emerald-600 transition-colors border border-white/20">
                      <RotateCcw size={14} />
                    </button>
                  ) : (
                    <>
                      <button onClick={() => openEdit(p)} aria-label={`${t.edit} ${p.name}`} title={t.edit} className="w-8 h-8 rounded-lg bg-surface/90 backdrop-blur-sm flex items-center justify-center hover:bg-primary/10 text-muted hover:text-primary transition-colors border border-white/20">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDelete(p)} aria-label={`${t.delete} ${p.name}`} title={t.delete} className="w-8 h-8 rounded-lg bg-surface/90 backdrop-blur-sm flex items-center justify-center hover:bg-danger/10 text-muted hover:text-danger transition-colors border border-white/20">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="p-4">
                <p className="text-[11px] text-primary font-semibold mb-1">{p.category}</p>
                <h3 className="font-bold text-[13px] text-ink line-clamp-1 mb-2">{p.name}</h3>
                <div className="flex items-center justify-between">
                  <span className="font-black text-primary">{Number(p.price || 0).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {t.currency}</span>
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
                        {p.image ? <img src={p.image} alt="" loading="lazy" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-surface-alt flex items-center justify-center text-border shrink-0"><Package size={16} /></div>}
                        <div className="min-w-0">
                          <span className="font-semibold text-ink block truncate">{p.name}</span>
                          {p.name_en && <span className="text-[11px] text-muted block truncate">{p.name_en}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted">{p.category}</td>
                    <td className="px-5 py-3 font-bold text-primary">{Number(p.price || 0).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {t.currency}</td>
                    <td className="px-5 py-3 text-muted">{p.stock}</td>
                    <td className="px-5 py-3">{p.featured ? <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-md">★</span> : <span className="text-border">—</span>}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        {p.archived ? (
                          <>
                            <span className="bg-slate-700 text-white text-[10px] font-bold px-2 py-1 rounded-md">{t.archivedLabel}</span>
                            <button onClick={() => void confirmRestore(p)} aria-label={`${t.restore} ${p.name}`} title={t.restore} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-emerald-500/5 text-muted hover:text-emerald-600 transition-colors">
                              <RotateCcw size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => openEdit(p)} aria-label={`${t.edit} ${p.name}`} title={t.edit} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/5 text-muted hover:text-primary transition-colors">
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => handleDelete(p)} aria-label={`${t.delete} ${p.name}`} title={t.delete} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-danger/5 text-muted hover:text-danger transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
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
            <motion.div role="dialog" aria-modal="true" aria-label={editing ? t.editProductTitle : t.addNewProduct} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-surface border border-border rounded-2xl w-full max-w-[560px] max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                <h3 className="font-bold text-ink">{editing ? t.editProductTitle : t.addNewProduct}</h3>
                <button onClick={resetForm} aria-label={t.cancelLabel} title={t.cancelLabel} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-alt text-muted"><X size={18} /></button>
              </div>
              <form className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto" onSubmit={e => { e.preventDefault(); handleSave(); }}>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="pf-name" className="text-[12px] font-semibold text-muted">{t.productNameAr}</label>
                  <input id="pf-name" type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="pf-name-en" className="text-[12px] font-semibold text-muted">{t.productNameEn}</label>
                  <input id="pf-name-en" type="text" value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} className="input-field" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="pf-desc" className="text-[12px] font-semibold text-muted">{t.descAr}</label>
                  <textarea id="pf-desc" value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} className="input-field resize-none" rows={2} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="pf-desc-en" className="text-[12px] font-semibold text-muted">{t.descEn}</label>
                  <textarea id="pf-desc-en" value={form.desc_en} onChange={e => setForm(f => ({ ...f, desc_en: e.target.value }))} className="input-field resize-none" rows={2} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="pf-cat" className="text-[12px] font-semibold text-muted">{t.categoryLabel}</label>
                  <select id="pf-cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-field">
                    {occasions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="pf-price" className="text-[12px] font-semibold text-muted">{t.priceLabel}</label>
                  <input id="pf-price" type="number" required min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} className="input-field" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="pf-stock" className="text-[12px] font-semibold text-muted">{t.stockLabel}</label>
                  <input id="pf-stock" type="number" required min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Math.max(0, +e.target.value) }))} className="input-field" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="pf-img" className="text-[12px] font-semibold text-muted">{t.imageUrl}</label>
                  <input id="pf-img" type="text" value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} className="input-field" placeholder="/images/..." />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-[12px] font-semibold text-muted">{t.imagePreview}</span>
                  <div className="w-20 h-20 rounded-xl border border-border overflow-hidden bg-surface-alt flex items-center justify-center">
                    {form.image
                      ? <img src={form.image} alt="" className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      : <Package size={20} className="text-border" />}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} className="w-4 h-4 accent-primary rounded" />
                    <span className="text-[13px] font-semibold text-ink">{t.featuredLabel}</span>
                  </label>
                </div>
                {formError && <p role="alert" className="sm:col-span-2 text-danger text-[12px] font-semibold">{formError}</p>}
                <div className="sm:col-span-2 flex gap-2 pt-2">
                  <button type="submit" className="btn primary">{t.saveProduct}</button>
                  <button type="button" onClick={resetForm} className="btn border">{t.cancelLabel}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div role="alertdialog" aria-modal="true" aria-label={t.confirmDelete} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-surface border border-border rounded-2xl w-full max-w-[400px] p-6 text-center">
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
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    let q = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(500);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data, error } = await q;
    if (error) { setLoadError(t.dataLoadError); setOrders([]); }
    else setOrders(data || []);
    setLoading(false);
  }, [statusFilter, t]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (id: string, status: string) => {
    if (status === 'cancelled' && !window.confirm(t.confirmCancel)) return;
    setSavingId(id);
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) { setActionError(t.saveFailed); setSavingId(null); setTimeout(() => setActionError(''), 4000); return; }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    setSavingId(null);
  };

  const saveAdminNote = (orderId: string, note: string) => {
    setAdminNotes(prev => {
      const updated = { ...prev, [orderId]: note };
      try { localStorage.setItem('em-admin-order-notes', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const filteredOrders = orders.filter(o => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || o.order_number?.toLowerCase().includes(q) || o.customer_name?.toLowerCase().includes(q) || o.customer_phone?.includes(q);
    const orderDate = new Date(o.created_at);
    const matchesStart = !startDate || localDateKey(orderDate) >= startDate;
    const matchesEnd = !endDate || localDateKey(orderDate) <= endDate;
    return matchesSearch && matchesStart && matchesEnd;
  });

  const exportCsv = () => {
    const isEn = document.documentElement.lang === 'en';
    const header = [
      t.orderNumber, t.nameLabel, t.phoneLabelShort, t.emailLabel, t.productsLabel,
      t.totalPrice, t.status, t.date,
    ].map(csvCell).join(',');
    const rows = filteredOrders.map(o => {
      const itemsStr = parseOrderItems(o.items).map((i: any) => `${str(i.name)} x${str(i.qty)}`).join('; ');
      const date = new Date(o.created_at).toLocaleDateString(isEn ? 'en-US' : 'ar-EG');
      return [
        o.order_number, o.customer_name, o.customer_phone, o.customer_email, itemsStr,
        o.total, statusLabelsMap[o.status] || o.status, date,
      ].map(csvCell).join(',');
    });
    const csv = [header, ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${localDateKey(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openWhatsApp = (phone: string, orderNumber: string) => {
    const msg = encodeURIComponent(t.whatsappOrderMsg.replace('{order}', orderNumber));
    window.open(`https://wa.me/${str(phone).replace(/\D/g, '')}?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  const printOrder = (o: any) => {
    const isEn = document.documentElement.lang === 'en';
    const items = parseOrderItems(o.items);
    const rowsHtml = items.map((i: any) =>
      `<tr><td>${escapeHtml(i.name)}</td><td>${escapeHtml(i.qty)}</td><td>${escapeHtml(Number(i.price || 0) * Number(i.qty || 0))} ${escapeHtml(t.currency)}</td></tr>`
    ).join('');
    const subtotal = items.reduce((s: number, i: any) => s + Number(i.price || 0) * Number(i.qty || 0), 0);
    const shipping = Number(o.shipping_fee || 0);
    const align = isEn ? 'left' : 'right';
    const cells = [
      [t.nameLabel, o.customer_name],
      [t.phoneLabelShort, o.customer_phone],
      [t.emailLabel, o.customer_email],
      [t.cityLabelShort, o.city],
      [t.addressLabel, o.address],
      [t.paymentLabel, o.payment_method === 'cod' ? t.cashOnDelivery : o.payment_method],
      [t.status, statusLabelsMap[o.status] || o.status],
    ].filter(([, v]) => v).map(([k, v]) => `<p style="margin:4px 0"><b>${escapeHtml(k)}:</b> ${escapeHtml(v)}</p>`).join('');

    // Every interpolated value is customer-supplied and must be escaped: this document is
    // same-origin, so injected markup would be able to read the admin's Supabase session.
    const html = `<!doctype html><html lang="${isEn ? 'en' : 'ar'}" dir="${isEn ? 'ltr' : 'rtl'}"><head><meta charset="utf-8"><title>${escapeHtml(o.order_number)}</title><style>body{font-family:sans-serif;padding:20px;text-align:${align}}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:${align}}th{background:#f5f5f5}</style></head><body><h2 style="text-align:${align}">${escapeHtml(o.order_number)}</h2>${cells}<table><thead><tr><th>${escapeHtml(t.productsLabel)}</th><th>${escapeHtml(t.qty)}</th><th>${escapeHtml(t.totalPrice)}</th></tr></thead><tbody>${rowsHtml}</tbody></table><p style="font-size:15px"><b>${escapeHtml(t.subtotal)}: ${escapeHtml(subtotal)} ${escapeHtml(t.currency)}</b></p>${shipping ? `<p><b>${escapeHtml(t.shippingFee)}: ${escapeHtml(shipping)} ${escapeHtml(t.currency)}</b></p>` : ''}<p style="font-size:18px"><b>${escapeHtml(t.totalPrice)}: ${escapeHtml(Number(o.total || 0))} ${escapeHtml(t.currency)}</b></p>${o.notes ? `<p style="white-space:pre-wrap"><b>${escapeHtml(t.notesLabel)}:</b> ${escapeHtml(o.notes)}</p>` : ''}</body></html>`;

    // noopener must NOT be passed here: per spec it makes window.open return
    // null, so the print path could never run. The handle is needed to write
    // the document, and the back-reference is severed manually instead.
    const w = window.open('', '_blank');
    if (!w) { setActionError(t.popupBlocked); setTimeout(() => setActionError(''), 4000); return; }
    try { w.opener = null; } catch { /* cross-origin guard */ }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const statusOpts = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'return_requested'];
  const statusLabelsMap: Record<string, string> = { all: t.allStatuses, pending: t.pending, confirmed: t.confirmed, shipped: t.shipped, delivered: t.delivered, cancelled: t.cancelled, return_requested: t.returnRequested };

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
          <Search size={14} className="text-muted shrink-0" />
          <input type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} aria-label={t.searchOrders} placeholder={t.searchOrders} className="w-full text-[13px] outline-none bg-transparent" />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-xl">
          <label htmlFor="of-start" className="sr-only">{t.startDate}</label>
          <input id="of-start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-[12px] outline-none bg-transparent text-muted" title={t.startDate} />
          <span className="text-border text-[11px]">—</span>
          <label htmlFor="of-end" className="sr-only">{t.endDate}</label>
          <input id="of-end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-[12px] outline-none bg-transparent text-muted" title={t.endDate} />
        </div>
      </div>

      {actionError && <p role="alert" className="text-danger text-[12px] font-semibold mb-3">{actionError}</p>}
      {loadError && <p role="alert" className="text-danger text-[12px] font-semibold mb-3">{loadError}</p>}

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2">
        {statusOpts.map(s => {
          const active = statusFilter === s;
          return (
            <button key={s} aria-pressed={active} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-xl text-[12px] font-bold whitespace-nowrap border transition-all ${active ? 'bg-ink text-surface-alt border-ink shadow-sm' : 'bg-surface border-border text-muted hover:border-primary/40'}`}>
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
            const items = parseOrderItems(o.items);
            return (
              <motion.div key={o.id} layout className="bg-surface border border-border rounded-2xl overflow-hidden hover:border-border-strong transition-colors">
                {/* Order Header */}
                <button aria-expanded={isExpanded} aria-controls={`order-panel-${o.id}`} onClick={() => setExpandedOrder(isExpanded ? null : o.id)} className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-5 text-start gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${st.bg} border ${st.border}`}>
                      <StIcon size={16} className={st.color} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink">{o.order_number}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${st.color} ${st.bg}`}>{statusLabelsMap[o.status] || o.status}</span>
                      </div>
                      <p className="text-[12px] text-muted mt-0.5">{o.customer_name} — {o.customer_phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-lg text-primary">{Number(o.total || 0).toLocaleString()} {t.currency}</span>
                    {isExpanded ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
                  </div>
                </button>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div id={`order-panel-${o.id}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
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
                          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 mb-4">
                            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 mb-1">📝 {t.notesLabel}</p>
                            <p className="text-[13px] text-amber-800 dark:text-amber-200 whitespace-pre-wrap break-words">{o.notes}</p>
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
                          <label htmlFor={`note-${o.id}`} className="text-[11px] font-bold text-muted mb-2 block">{t.adminNotes}</label>
                          <textarea id={`note-${o.id}`} maxLength={2000} value={adminNotes[o.id] || ''} onChange={e => saveAdminNote(o.id, e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl border border-border bg-surface-alt text-[13px] outline-none focus:border-primary/40 transition-colors resize-none" placeholder={t.adminNotes + '...'} />
                        </div>

                        {/* Status Actions */}
                        <div className="mb-4">
                          <p className="text-[11px] font-bold text-muted mb-2">{t.status}</p>
                          <div className="flex flex-wrap gap-2">
                            {['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'return_requested'].map(s => {
                              const sSt = statusStyles[s];
                              const SIcon = sSt.icon;
                              const isActive = o.status === s;
                              return (
                                <button key={s} disabled={savingId === o.id} aria-pressed={isActive} onClick={() => updateStatus(o.id, s)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold border transition-all disabled:opacity-50 ${isActive ? `${sSt.bg} ${sSt.border} ${sSt.color} shadow-sm` : 'border-border text-muted hover:border-primary/40'}`}>
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
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('customer_name, customer_phone, customer_email, city, created_at, total, status')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (cancelled) return;
      if (error) { setError(t.dataLoadError); setLoading(false); return; }
      const map = new Map<string, any>();
      (data || []).forEach((o: any) => {
        const key = str(o.customer_phone || o.customer_email).trim();
        if (!key) return;
        const spent = o.status === 'cancelled' ? 0 : Number(o.total || 0);
        if (!map.has(key)) map.set(key, { ...o, customer_phone: key, orders: 1, totalSpent: spent });
        else { const c = map.get(key); c.orders++; c.totalSpent += spent; }
      });
      setCustomers(Array.from(map.values()));
      setLoading(false);
    })().catch(() => { if (!cancelled) { setError(t.dataLoadError); setLoading(false); } });
    return () => { cancelled = true; };
  }, [t]);

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn}>
      <h1 className="text-xl font-black text-ink mb-5">{t.customersTitle} ({customers.length})</h1>
      {error && <p role="alert" className="text-danger text-[12px] font-semibold mb-4">{error}</p>}
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
                  <th scope="col" className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.nameLabelFull}</th>
                  <th scope="col" className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.phoneLabelFull}</th>
                  <th scope="col" className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.cityLabelFull}</th>
                  <th scope="col" className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.ordersLabel}</th>
                  <th scope="col" className="text-start px-5 py-3.5 font-semibold text-muted text-[12px]">{t.totalRevenue}</th>
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
/*                    REVIEWS TAB                        */
/* ══════════════════════════════════════════════════════ */
const reviewStatusMeta: Record<ReviewStatus, { label: string; cls: string }> = {
  pending:   { label: 'pendingLabel',   cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  approved:  { label: 'approvedLabel',  cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  rejected:  { label: 'rejectedLabel',  cls: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

function ReviewsTab({ t, products }: { t: any; products: Product[] }) {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [filter, setFilter] = useState<'all' | ReviewStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [synced, setSynced] = useState<boolean | null>(null);

  // No setState before the await: the tab mounts with the spinner already on,
  // so re-rendering just to start loading is wasted work.
  const load = useCallback(async () => {
    const remote = await fetchReviewsAdmin();
    if (remote) setReviews(remote);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    rejected: reviews.filter(r => r.status === 'rejected').length,
    all: reviews.length,
  }), [reviews]);

  const shown = useMemo(
    () => (filter === 'all' ? reviews : reviews.filter(r => r.status === filter)),
    [reviews, filter],
  );

  const productName = (id: string) => {
    const p = products.find(x => x.id === id);
    return p ? (p.name_en || p.name) : id;
  };

  const act = async (id: string, run: () => Promise<boolean>) => {
    setBusy(id);
    setSynced(await run());
    await load();
    setBusy(null);
  };

  const filters: ('all' | ReviewStatus)[] = ['pending', 'approved', 'rejected', 'all'];

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-black text-ink">{t.reviews}</h1>
          <p className="text-muted text-[13px] mt-0.5">
            {counts.pending} {t.pendingReviews} · {counts.approved} {t.approvedReviews}
          </p>
        </div>
        <button onClick={() => { setLoading(true); void load(); }} className="btn text-[13px]">{t.refresh}</button>
      </div>

      {synced === false && (
        <div role="alert" className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-5 text-amber-600 text-[13px]">
          {t.savedLocallyOnly}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-5">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors ${
              filter === f ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-muted hover:text-ink'
            }`}
          >
            {f === 'all' ? `${t.all} (${counts.all})` : `${t[reviewStatusMeta[f].label]} (${counts[f]})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-surface border border-border rounded-2xl py-16 text-center text-muted text-sm">{t.loading}</div>
      ) : shown.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl py-16 text-center">
          <MessageSquare size={40} className="mx-auto mb-3 text-border" />
          <p className="text-muted text-sm">{t.noReviewsYet}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map(r => (
            <article key={r.id} className="bg-surface border border-border rounded-2xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-ink">{r.userName}</span>
                    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${r.rating} / 5`}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} size={13} aria-hidden="true" className={i <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-ink/20'} />
                      ))}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${reviewStatusMeta[r.status].cls}`}>
                      {t[reviewStatusMeta[r.status].label]}
                    </span>
                  </div>
                  <p className="text-[11px] text-subtle">
                    {productName(r.productId)} · {new Date(r.date).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.status !== 'approved' && (
                    <button
                      onClick={() => void act(r.id, () => moderateReview(r.id, 'approved'))}
                      disabled={busy === r.id}
                      className="btn text-[12px] text-emerald-600 border-emerald-500/30"
                    >
                      <CheckCircle size={14} aria-hidden="true" /> {t.approve}
                    </button>
                  )}
                  {r.status !== 'rejected' && (
                    <button
                      onClick={() => void act(r.id, () => moderateReview(r.id, 'rejected'))}
                      disabled={busy === r.id}
                      className="btn text-[12px] text-amber-600 border-amber-500/30"
                    >
                      <XCircle size={14} aria-hidden="true" /> {t.reject}
                    </button>
                  )}
                  <button
                    onClick={() => void act(r.id, () => deleteReview(r.id))}
                    disabled={busy === r.id}
                    aria-label={`${t.delete} ${r.userName}`}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <p className="text-muted text-sm whitespace-pre-wrap break-words">{r.comment}</p>
            </article>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════ */
/*                    COUPONS TAB                        */
/* ══════════════════════════════════════════════════════ */
function CouponsTab({ t }: { t: any }) {
  const [coupons, setCoupons] = useState<Coupon[]>(() => readJSON<Coupon[]>('em-coupons', []));
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Coupon | null>(null);
  const [form, setForm] = useState({
    code: '', discountType: 'percent' as 'percent' | 'fixed', discountValue: 0,
    minOrder: 0, maxUses: 100, expiresAt: '', active: true,
  });

  useEffect(() => {
    try { localStorage.setItem('em-coupons', JSON.stringify(coupons)); } catch {}
  }, [coupons]);

  // Pull the shared coupon list. The storefront has no direct read access to
  // this table, so this is the only place the codes live for anyone to see.
  useEffect(() => {
    let alive = true;
    void fetchRemoteCoupons().then(remote => {
      if (!alive || !remote) return;
      setCoupons(remote);
      try { localStorage.setItem('em-coupons', JSON.stringify(remote)); } catch {}
    });
    return () => { alive = false; };
  }, []);

  const [synced, setSynced] = useState<boolean | null>(null);

  const resetForm = () => {
    setForm({ code: '', discountType: 'percent', discountValue: 0, minOrder: 0, maxUses: 100, expiresAt: '', active: true });
    setEditing(null);
    setShowForm(false);
    setFormError('');
  };

  const handleSave = async () => {
    const code = form.code.trim().toUpperCase();
    if (!code) { setFormError(t.requiredField); return; }
    if (!(form.discountValue > 0)) { setFormError(t.invalidDiscount); return; }
    if (form.discountType === 'percent' && form.discountValue > 100) { setFormError(t.percentOutOfRange); return; }
    if (coupons.some(c => c.code === code && c.id !== editing?.id)) { setFormError(t.duplicateCouponCode); return; }

    const next: Coupon = editing
      ? { ...editing, ...form, code }
      : {
          id: code,
          code,
          discountType: form.discountType,
          discountValue: form.discountValue,
          minOrder: form.minOrder,
          maxUses: form.maxUses,
          usedCount: 0,
          expiresAt: form.expiresAt,
          active: form.active,
        };

    setCoupons(prev => (editing ? prev.map(c => c.id === editing.id ? next : c) : [...prev, next]));
    setSynced(await saveRemoteCoupon(next));
    resetForm();
  };

  const handleEdit = (coupon: Coupon) => {
    setForm({
      code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue,
      minOrder: coupon.minOrder, maxUses: coupon.maxUses, expiresAt: coupon.expiresAt, active: coupon.active,
    });
    setEditing(coupon);
    setFormError('');
    setShowForm(true);
  };

  const handleDelete = (coupon: Coupon) => {
    setDeleteConfirm(coupon);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const code = deleteConfirm.code;
    setCoupons(prev => prev.filter(c => c.id !== code));
    setSynced(await deleteRemoteCoupon(code));
    setDeleteConfirm(null);
  };

  const toggleActive = async (id: string) => {
    const target = coupons.find(c => c.id === id);
    if (!target) return;
    const next = { ...target, active: !target.active };
    setCoupons(prev => prev.map(c => c.id === id ? next : c));
    setSynced(await saveRemoteCoupon(next));
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

      {synced === false && (
        <div role="alert" className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-5 text-amber-600 text-[13px]">
          {t.savedLocallyOnly}
        </div>
      )}

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h3 className="font-bold text-ink mb-4">{editing ? t.editCoupon : t.addCoupon}</h3>
              <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" onSubmit={e => { e.preventDefault(); handleSave(); }}>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cf-code" className="text-[12px] font-semibold text-muted">{t.couponCode}</label>
                  <input id="cf-code" type="text" required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="input-field" placeholder="SAVE10" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cf-type" className="text-[12px] font-semibold text-muted">{t.discountType}</label>
                  <select id="cf-type" value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value as 'percent' | 'fixed' }))} className="input-field">
                    <option value="percent">{t.percent}</option>
                    <option value="fixed">{t.fixed}</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cf-value" className="text-[12px] font-semibold text-muted">{t.discountValueLabel} ({form.discountType === 'percent' ? '%' : t.currency})</label>
                  <input id="cf-value" type="number" required min="1" max={form.discountType === 'percent' ? 100 : undefined} value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: +e.target.value }))} className="input-field" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cf-min" className="text-[12px] font-semibold text-muted">{t.minOrder} ({t.currency})</label>
                  <input id="cf-min" type="number" min="0" value={form.minOrder} onChange={e => setForm(f => ({ ...f, minOrder: +e.target.value }))} className="input-field" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cf-max" className="text-[12px] font-semibold text-muted">{t.maxUses}</label>
                  <input id="cf-max" type="number" min="1" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: Math.max(1, +e.target.value) }))} className="input-field" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cf-exp" className="text-[12px] font-semibold text-muted">{t.expiresAt}</label>
                  <input id="cf-exp" type="date" min={localDateKey(new Date())} value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className="input-field" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-muted">{t.active}</span>
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-primary rounded" />
                    <span className="text-sm font-medium">{form.active ? t.active : t.inactive}</span>
                  </label>
                </div>
                {formError && <p role="alert" className="lg:col-span-3 text-danger text-[12px] font-semibold">{formError}</p>}
                <div className="lg:col-span-3 flex gap-2 mt-1">
                  <button type="submit" className="btn primary">{editing ? t.saveChangesLabel : t.addCoupon}</button>
                  <button type="button" onClick={resetForm} className="btn border">{t.cancel}</button>
                </div>
              </form>
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
                {coupons.map(c => {
                  const expired = !!c.expiresAt && c.expiresAt < localDateKey(new Date());
                  return (
                  <tr key={c.id} className="hover:bg-surface-alt/50 transition-colors">
                    <td className="px-5 py-3 font-bold text-primary">{c.code}</td>
                    <td className="px-5 py-3 text-muted">{c.discountType === 'percent' ? t.percent : t.fixed}</td>
                    <td className="px-5 py-3 font-bold text-ink">{c.discountValue}{c.discountType === 'percent' ? '%' : ` ${t.currency}`}</td>
                    <td className="px-5 py-3 text-muted">{c.minOrder} {t.currency}</td>
                    <td className="px-5 py-3 text-muted">{c.usedCount}/{c.maxUses}</td>
                    <td className="px-5 py-3">
                      {c.expiresAt
                        ? <span className={expired ? 'text-danger font-semibold' : 'text-muted'}>{c.expiresAt}{expired ? ` (${t.expired})` : ''}</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <button aria-pressed={c.active} onClick={() => toggleActive(c.id)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${c.active && !expired ? 'bg-success/10 text-success' : 'bg-muted/10 text-muted'}`}>
                        {expired ? t.expired : c.active ? t.active : t.inactive}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleEdit(c)} aria-label={`${t.edit} ${c.code}`} title={t.edit} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/5 text-muted hover:text-primary transition-colors">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleDelete(c)} aria-label={`${t.delete} ${c.code}`} title={t.delete} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-danger/5 text-muted hover:text-danger transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div role="alertdialog" aria-modal="true" aria-label={t.confirmDelete} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-surface border border-border rounded-2xl w-full max-w-[400px] p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-danger" />
              </div>
              <h3 className="font-bold text-ink mb-2">{t.confirmDelete}</h3>
              <p className="text-muted text-[13px] mb-6">{deleteConfirm.code}</p>
              <div className="flex gap-2 justify-center">
                <button onClick={confirmDelete} className="px-5 py-2.5 rounded-xl text-[13px] font-bold bg-danger text-white hover:bg-danger/90 transition-colors">{t.delete}</button>
                <button onClick={() => setDeleteConfirm(null)} className="btn border">{t.cancel}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════ */
/*                    SETTINGS TAB                       */
/* ══════════════════════════════════════════════════════ */
function SettingsTab({ t }: { t: any }) {
  const current = useStoreSettings();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [synced, setSynced] = useState<boolean | null>(null);
  const [form, setForm] = useState(current);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const set = <K extends keyof StoreSettings>(k: K, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = form.whatsapp.replace(/\D/g, '');
    if (!form.name.trim()) { setError(t.requiredField); return; }
    if (digits.length < 8) { setError(t.invalidWhatsApp); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setError(t.invalidEmail); return; }
    if (!(Number(form.shippingThreshold) >= 0) || !(Number(form.shippingFee) >= 0)) { setError(t.invalidShipping); return; }
    setError('');
    const ok = await saveStoreSettings({ ...form, name: form.name.trim(), whatsapp: digits, email: form.email.trim() });
    setSynced(ok);
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 3000);
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn}>
      <h1 className="text-xl font-black text-ink mb-6">{t.settings}</h1>

      <form onSubmit={handleSave} className="max-w-[600px]">
        {/* Store Info */}
        <div className="bg-surface border border-border rounded-2xl p-6 mb-5">
          <h3 className="font-bold text-ink mb-5 flex items-center gap-2">
            <Store size={16} className="text-primary" /> {t.storeInfo}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="st-name" className="text-[12px] font-semibold text-muted">{t.storeNameLabel}</label>
              <input id="st-name" type="text" required value={form.name} onChange={e => set('name', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="st-wa" className="text-[12px] font-semibold text-muted">{t.whatsappLabel}</label>
              <input id="st-wa" type="tel" dir="ltr" required value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} className="input-field direction-ltr" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="st-email" className="text-[12px] font-semibold text-muted">{t.emailLabel}</label>
              <input id="st-email" type="email" dir="ltr" required value={form.email} onChange={e => set('email', e.target.value)} className="input-field direction-ltr" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="st-address" className="text-[12px] font-semibold text-muted">{t.addressLabelAdmin}</label>
              <input id="st-address" type="text" value={form.address} onChange={e => set('address', e.target.value)} className="input-field" />
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
              <label htmlFor="st-th" className="text-[12px] font-semibold text-muted">{t.freeShippingHint}</label>
              <input id="st-th" type="number" min="0" value={form.shippingThreshold} onChange={e => set('shippingThreshold', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="st-fee" className="text-[12px] font-semibold text-muted">{t.shipping} ({t.currency})</label>
              <input id="st-fee" type="number" min="0" value={form.shippingFee} onChange={e => set('shippingFee', e.target.value)} className="input-field" />
            </div>
          </div>
        </div>

        {error && <p role="alert" className="text-danger text-[12px] font-semibold mb-3">{error}</p>}

        {/* Save */}
        <div className="flex items-center gap-3">
          <button type="submit" className="btn primary">
            {t.saveChangesLabel}
          </button>
          {saved && <span role="status" className="text-success text-[13px] font-medium">{t.settingsSaved}</span>}
          {synced === false && <span role="alert" className="text-amber-600 text-[12px]">{t.savedLocallyOnly}</span>}
        </div>
      </form>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════ */
/*                    CONTENT CMS TAB                    */
/* ══════════════════════════════════════════════════════ */
function ContentTab({ t }: { t: any }) {
  const [content, setContent] = useHomepageContent();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [synced, setSynced] = useState<boolean | null>(null);
  const [deleteFaqIdx, setDeleteFaqIdx] = useState<number | null>(null);
  const { site, setSite } = useSite();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const flash = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setSaved(false); setSaveError(false); }, 2500);
  };

  const handleSave = async () => {
    if (saveHomepageContent(content)) { setSaved(true); setSaveError(false); }
    else { setSaved(false); setSaveError(true); }
    setSynced(await saveSetting(HOMEPAGE_SETTING_KEY, content));
    flash();
  };

  const handleReset = async () => {
    if (!window.confirm(t.cmsResetConfirm)) return;
    resetHomepageContent();
    const next = { ...defaultHomepageContent, faqs: [...defaultHomepageContent.faqs] };
    setContent(next);
    setSynced(await saveSetting(HOMEPAGE_SETTING_KEY, next));
    setSaved(true);
    setSaveError(false);
    flash();
  };

  const confirmDeleteFaq = () => {
    if (deleteFaqIdx === null) return;
    updateField('faqs', content.faqs.filter((_, i) => i !== deleteFaqIdx));
    setDeleteFaqIdx(null);
  };

  const updateField = (field: keyof HomepageContent, val: any) => {
    setContent(prev => ({ ...prev, [field]: val }));
  };

  const setFaq = (idx: number, patch: Partial<HomepageContent['faqs'][number]>) => {
    updateField('faqs', content.faqs.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn}>
      <div className="max-w-4xl">
        <h1 className="text-xl font-black text-ink mb-1">{t.cms}</h1>
        <p className="text-muted text-[12px] mb-6">{t.cmsAutosave}</p>

        {/* Announcement Bar CMS */}
        <div className="bg-surface border border-border rounded-2xl p-6 mb-5 space-y-4">
          <h3 className="font-bold text-ink text-base flex items-center gap-2"><FileText size={16} className="text-primary" /> {t.announcement}</h3>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ann-ar" className="text-[12px] font-semibold text-muted">{t.announcementText} (عربي)</label>
            <input id="ann-ar" type="text" value={site.announcement.text} onChange={e => setSite({ ...site, announcement: { ...site.announcement, text: e.target.value } })} className="input-field" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ann-en" className="text-[12px] font-semibold text-muted">{t.announcementText} (English)</label>
            <input id="ann-en" type="text" dir="ltr" value={site.announcement.textEn} onChange={e => setSite({ ...site, announcement: { ...site.announcement, textEn: e.target.value } })} className="input-field direction-ltr" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={site.announcement.enabled} onChange={e => setSite({ ...site, announcement: { ...site.announcement, enabled: e.target.checked } })} className="w-4 h-4 accent-primary rounded" />
            <span className="text-[13px] font-semibold text-ink">{t.announcementEnabled}</span>
          </label>
        </div>

        {/* Hero Section CMS */}
        <div className="bg-surface border border-border rounded-2xl p-6 mb-5 space-y-4">
          <h3 className="font-bold text-ink text-base flex items-center gap-2"><FileText size={16} className="text-primary" /> {t.cmsHero}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cms-heroEyebrow" className="text-[12px] font-semibold text-muted">{t.cmsEyebrowLabel}</label>
              <input id="cms-heroEyebrow" type="text" maxLength={80} value={content.heroEyebrow} onChange={e => updateField('heroEyebrow', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cms-heroEyebrowEn" className="text-[12px] font-semibold text-muted">{t.cmsEyebrowLabelEn}</label>
              <input id="cms-heroEyebrowEn" type="text" maxLength={80} value={content.heroEyebrowEn} onChange={e => updateField('heroEyebrowEn', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cms-heroTitle1" className="text-[12px] font-semibold text-muted">{t.cmsTitle1Label}</label>
              <input id="cms-heroTitle1" type="text" maxLength={90} value={content.heroTitle1} onChange={e => updateField('heroTitle1', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cms-heroTitle1En" className="text-[12px] font-semibold text-muted">{t.cmsTitle1LabelEn}</label>
              <input id="cms-heroTitle1En" type="text" maxLength={90} value={content.heroTitle1En} onChange={e => updateField('heroTitle1En', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cms-heroTitle2" className="text-[12px] font-semibold text-muted">{t.cmsTitle2Label}</label>
              <input id="cms-heroTitle2" type="text" maxLength={90} value={content.heroTitle2} onChange={e => updateField('heroTitle2', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cms-heroTitle2En" className="text-[12px] font-semibold text-muted">{t.cmsTitle2LabelEn}</label>
              <input id="cms-heroTitle2En" type="text" maxLength={90} value={content.heroTitle2En} onChange={e => updateField('heroTitle2En', e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
    <label htmlFor="cms-heroDesc" className="text-[12px] font-semibold text-muted">{t.cmsDescLabel}</label>
    <textarea id="cms-heroDesc" rows={3} maxLength={600} value={content.heroDesc} onChange={e => updateField('heroDesc', e.target.value)} className="input-field w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
    <label htmlFor="cms-heroDescEn" className="text-[12px] font-semibold text-muted">{t.cmsDescLabelEn}</label>
    <textarea id="cms-heroDescEn" rows={3} maxLength={600} value={content.heroDescEn} onChange={e => updateField('heroDescEn', e.target.value)} className="input-field w-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cms-heroCta" className="text-[12px] font-semibold text-muted">{t.cmsCtaLabel}</label>
              <input id="cms-heroCta" type="text" maxLength={80} value={content.heroCta} onChange={e => updateField('heroCta', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cms-heroCtaEn" className="text-[12px] font-semibold text-muted">{t.cmsCtaLabelEn}</label>
              <input id="cms-heroCtaEn" type="text" maxLength={80} value={content.heroCtaEn} onChange={e => updateField('heroCtaEn', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cms-heroOverlay1" className="text-[12px] font-semibold text-muted">{t.cmsOverlay1Label}</label>
              <input id="cms-heroOverlay1" type="text" maxLength={80} value={content.heroOverlay1} onChange={e => updateField('heroOverlay1', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cms-heroOverlay1En" className="text-[12px] font-semibold text-muted">{t.cmsOverlay1LabelEn}</label>
              <input id="cms-heroOverlay1En" type="text" maxLength={80} value={content.heroOverlay1En} onChange={e => updateField('heroOverlay1En', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cms-heroOverlay2" className="text-[12px] font-semibold text-muted">{t.cmsOverlay2Label}</label>
              <input id="cms-heroOverlay2" type="text" maxLength={80} value={content.heroOverlay2} onChange={e => updateField('heroOverlay2', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cms-heroOverlay2En" className="text-[12px] font-semibold text-muted">{t.cmsOverlay2LabelEn}</label>
              <input id="cms-heroOverlay2En" type="text" maxLength={80} value={content.heroOverlay2En} onChange={e => updateField('heroOverlay2En', e.target.value)} className="input-field" />
            </div>
          </div>
        </div>

        {/* Brand Story CMS */}
        <div className="bg-surface border border-border rounded-2xl p-6 mb-5 space-y-4">
          <h3 className="font-bold text-ink text-base flex items-center gap-2"><FileText size={16} className="text-primary" /> {t.cmsStory}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="st-eyebrow-ar" className="text-[12px] font-semibold text-muted">عنوان القسم الفرعي (عربي)</label>
              <input id="st-eyebrow-ar" type="text" value={content.storyEyebrow} onChange={e => updateField('storyEyebrow', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="st-eyebrow-en" className="text-[12px] font-semibold text-muted">Section Eyebrow (English)</label>
              <input id="st-eyebrow-en" type="text" dir="ltr" value={content.storyEyebrowEn} onChange={e => updateField('storyEyebrowEn', e.target.value)} className="input-field direction-ltr" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="st-title-ar" className="text-[12px] font-semibold text-muted">عنوان القسم (عربي)</label>
              <input id="st-title-ar" type="text" value={content.storyTitle} onChange={e => updateField('storyTitle', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="st-title-en" className="text-[12px] font-semibold text-muted">Story Title (English)</label>
              <input id="st-title-en" type="text" dir="ltr" value={content.storyTitleEn} onChange={e => updateField('storyTitleEn', e.target.value)} className="input-field direction-ltr" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="st-quote-ar" className="text-[12px] font-semibold text-muted">المقولة (عربي)</label>
              <input id="st-quote-ar" type="text" value={content.storyQuote} onChange={e => updateField('storyQuote', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="st-quote-en" className="text-[12px] font-semibold text-muted">Quote (English)</label>
              <input id="st-quote-en" type="text" dir="ltr" value={content.storyQuoteEn} onChange={e => updateField('storyQuoteEn', e.target.value)} className="input-field direction-ltr" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="st-text-ar" className="text-[12px] font-semibold text-muted">نص القصة (عربي)</label>
            <textarea id="st-text-ar" rows={3} value={content.storyText} onChange={e => updateField('storyText', e.target.value)} className="input-field w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="st-text-en" className="text-[12px] font-semibold text-muted">Story Text (English)</label>
            <textarea id="st-text-en" rows={3} dir="ltr" value={content.storyTextEn} onChange={e => updateField('storyTextEn', e.target.value)} className="input-field w-full direction-ltr" />
          </div>
        </div>

        {/* FAQs CMS */}
        <div className="bg-surface border border-border rounded-2xl p-6 mb-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-ink text-base flex items-center gap-2"><FileText size={16} className="text-primary" /> {t.cmsFaq}</h3>
            <button type="button" onClick={() => updateField('faqs', [...content.faqs, { q: '', q_en: '', a: '', a_en: '' }])} className="btn primary text-xs py-1.5 px-3 flex items-center gap-1"><Plus size={14} /> {t.addFaq}</button>
          </div>
          <div className="space-y-4">
            {content.faqs.map((faq, idx) => (
              <div key={idx} className="bg-surface-alt border border-border rounded-xl p-4 space-y-3 relative">
                <button type="button" aria-label={t.deleteFaq} title={t.deleteFaq} onClick={() => setDeleteFaqIdx(idx)} className="absolute top-3 end-3 w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-colors"><Trash2 size={14} /></button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor={`faq-q-ar-${idx}`} className="text-[10px] font-semibold text-muted">{t.faqQuestionAr}</label>
                    <input id={`faq-q-ar-${idx}`} type="text" value={faq.q} onChange={e => setFaq(idx, { q: e.target.value })} className="input-field text-xs" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor={`faq-q-en-${idx}`} className="text-[10px] font-semibold text-muted">{t.faqQuestionEn}</label>
                    <input id={`faq-q-en-${idx}`} type="text" dir="ltr" value={faq.q_en} onChange={e => setFaq(idx, { q_en: e.target.value })} className="input-field text-xs direction-ltr" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor={`faq-a-ar-${idx}`} className="text-[10px] font-semibold text-muted">{t.faqAnswerAr}</label>
                    <textarea id={`faq-a-ar-${idx}`} rows={2} value={faq.a} onChange={e => setFaq(idx, { a: e.target.value })} className="input-field text-xs w-full" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor={`faq-a-en-${idx}`} className="text-[10px] font-semibold text-muted">{t.faqAnswerEn}</label>
                    <textarea id={`faq-a-en-${idx}`} rows={2} dir="ltr" value={faq.a_en} onChange={e => setFaq(idx, { a_en: e.target.value })} className="input-field text-xs w-full direction-ltr" />
                  </div>
                </div>
              </div>
            ))}
            {content.faqs.length === 0 && <p className="text-muted text-[13px] text-center py-6">{t.noResults}</p>}
          </div>
        </div>

        {/* Save */}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleSave} className="btn primary">{t.cmsSave}</button>
          <button type="button" onClick={handleReset} className="btn border">{t.cmsReset}</button>
          {saved && <span role="status" className="text-success text-[13px] font-medium">{t.cmsSaved}</span>}
          {saveError && <span role="alert" className="text-danger text-[13px] font-medium">{t.saveFailed}</span>}
          {synced === false && <span role="alert" className="text-amber-600 text-[12px]">{t.savedLocallyOnly}</span>}
        </div>
      </div>

      <AnimatePresence>
        {deleteFaqIdx !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteFaqIdx(null)}>
            <motion.div role="alertdialog" aria-modal="true" aria-label={t.confirmDelete} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-surface border border-border rounded-2xl w-full max-w-[400px] p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-danger" />
              </div>
              <h3 className="font-bold text-ink mb-2">{t.confirmDelete}</h3>
              <p className="text-muted text-[13px] mb-6">{content.faqs[deleteFaqIdx]?.q || content.faqs[deleteFaqIdx]?.q_en || '—'}</p>
              <div className="flex gap-2 justify-center">
                <button type="button" onClick={confirmDeleteFaq} className="px-5 py-2.5 rounded-xl text-[13px] font-bold bg-danger text-white hover:bg-danger/90 transition-colors">{t.delete}</button>
                <button type="button" onClick={() => setDeleteFaqIdx(null)} className="btn border">{t.cancelLabel}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

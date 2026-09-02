import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Package, ClipboardList, Users, Settings, LogOut, TrendingUp, ShoppingBag, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAllowedAdmin } from '../lib/adminAuth';
import { seed } from '../data';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const getSidebarNav = (t: any) => [
  { key: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
  { key: 'products', label: t.products, icon: Package },
  { key: 'orders', label: t.allOrders, icon: ClipboardList },
  { key: 'customers', label: t.customers, icon: Users },
  { key: 'settings', label: t.settings, icon: Settings },
];

export default function AdminPage({ t }: { t: any }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dashboard');
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-muted">...</div></div>;

  return (
    <div className="min-h-screen bg-surface-alt flex">
      {/* Sidebar */}
      <aside className="w-[240px] bg-surface border-e border-border flex flex-col flex-shrink-0 sticky top-0 h-screen">
        <div className="p-5 border-b border-border">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/images/logo.jpeg" alt="ESRAA" className="w-9 h-9 rounded-lg object-cover" />
            <div>
              <span className="font-bold text-sm">ESRAA</span>
              <span className="text-[10px] text-muted block">Admin Panel</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          {getSidebarNav(t).map(n => (
            <button key={n.key} onClick={() => setTab(n.key)} className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${tab === n.key ? 'bg-primary text-white' : 'text-muted hover:bg-primary/8 hover:text-ink'}`}>
              <n.icon size={17} /> {n.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="px-3 py-2 mb-2">
            <p className="text-[12px] font-bold text-ink truncate">{user.email}</p>
            <p className="text-[11px] text-muted">{t.managerLabel}</p>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[13px] font-semibold text-danger hover:bg-danger/8 transition-all">
            <LogOut size={17} /> {t.logoutLabel}
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-h-screen p-6 lg:p-10 overflow-auto">
        {tab === 'dashboard' && <Dashboard t={t} />}
        {tab === 'products' && <ProductsTab t={t} />}
        {tab === 'orders' && <OrdersTab t={t} />}
        {tab === 'customers' && <CustomersTab t={t} />}
        {tab === 'settings' && <SettingsTab t={t} />}
      </main>
    </div>
  );
}

/* ── Dashboard ── */
function Dashboard({ t }: { t: any }) {
  const [stats, setStats] = useState({ products: seed.length, orders: 0, revenue: 0, customers: 0 });

  useEffect(() => {
    Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('total'),
      supabase.from('orders').select('customer_phone', { count: 'exact', head: true }),
    ]).then(([ordersCount, ordersRevenue, customersCount]) => {
      setStats({
        products: seed.length,
        orders: ordersCount.count || 0,
        revenue: (ordersRevenue.data || []).reduce((s: number, o: any) => s + (o.total || 0), 0),
        customers: customersCount.count || 0,
      });
    });
  }, []);

  const cards = [
    { label: t.totalProducts, value: stats.products, icon: Package, color: 'text-primary bg-primary/10' },
    { label: t.totalOrders, value: stats.orders, icon: ClipboardList, color: 'text-blue-500 bg-blue-500/10' },
    { label: t.totalRevenue, value: `${stats.revenue} ${t.currency}`, icon: TrendingUp, color: 'text-success bg-success/10' },
    { label: t.totalCustomers, value: stats.customers, icon: Users, color: 'text-purple-500 bg-purple-500/10' },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp}>
      <h1 className="text-2xl font-black mb-6">{t.dashboardTitle}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-surface border border-border rounded-xl p-5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.color}`}><c.icon size={20} /></div>
            <p className="text-muted text-[12px]">{c.label}</p>
            <p className="text-2xl font-black mt-1">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-surface border border-border rounded-xl p-6 text-center text-muted">
        <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">{t.startAdding}</p>
      </div>
    </motion.div>
  );
}

/* ── Products Tab ── */
function ProductsTab({ t }: { t: any }) {
  const [products] = useState(seed);
  const [search, setSearch] = useState('');

  const filtered = products.filter(p => !search || p.name.includes(search) || p.name_en?.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">{t.products} ({filtered.length})</h1>
      </div>
      <div className="flex gap-2.5 mb-5">
        <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-lg">
          <Search size={15} className="text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.searchPlaceholder} className="w-full text-[13px] outline-none bg-transparent" />
        </div>
      </div>
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-surface-alt">
                <th className="text-start px-4 py-3 font-semibold text-muted">{t.productLabel}</th>
                <th className="text-start px-4 py-3 font-semibold text-muted">{t.sectionLabel}</th>
                <th className="text-start px-4 py-3 font-semibold text-muted">{t.priceLabel}</th>
                <th className="text-start px-4 py-3 font-semibold text-muted">{t.featuredLabel}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-border last:border-b-0 hover:bg-surface-alt transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      <span className="font-semibold text-ink line-clamp-1">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{p.category}</td>
                  <td className="px-4 py-3 font-bold text-gradient">{p.price} {t.currency}</td>
                  <td className="px-4 py-3">{p.featured ? <span className="text-primary font-bold">★</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Orders Tab ── */
function OrdersTab({ t }: { t: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

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
  const statusColors: Record<string, string> = { pending: 'text-amber-500 bg-amber-500/10', confirmed: 'text-blue-500 bg-blue-500/10', shipped: 'text-primary bg-primary/10', delivered: 'text-success bg-success/10', cancelled: 'text-danger bg-danger/10' };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp}>
      <h1 className="text-2xl font-black mb-6">{t.allOrders}</h1>
      <div className="flex gap-2 overflow-x-auto mb-5">
        {statusOpts.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-full text-[12px] font-bold whitespace-nowrap border transition-all ${statusFilter === s ? 'bg-ink text-surface-alt border-ink' : 'bg-surface border-border text-muted hover:border-primary'}`}>{statusLabels[s]}</button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted">...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t.noOrders} {statusFilter !== 'all' ? t.withStatus : ''}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map(o => (
            <div key={o.id} className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-ink">{o.order_number}</span>
                  <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold ${statusColors[o.status] || ''}`}>{statusLabels[o.status] || o.status}</span>
                </div>
                <span className="font-bold text-gradient">{o.total} {t.currency}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12.5px] mb-3">
                <div><span className="text-muted">{t.nameLabel}</span> {o.customer_name}</div>
                <div><span className="text-muted">{t.phoneLabelShort}</span> {o.customer_phone}</div>
                <div><span className="text-muted">{t.cityLabelShort}</span> {o.city}</div>
                <div><span className="text-muted">{t.paymentLabel}</span> {o.payment_method === 'cod' ? t.cashOnDelivery : o.payment_method}</div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-border">
                {['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(s => (
                  <button key={s} onClick={() => updateStatus(o.id, s)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${o.status === s ? 'bg-primary text-white border-primary' : 'border-border text-muted hover:border-primary hover:text-primary'}`}>{statusLabels[s]}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ── Customers Tab ── */
function CustomersTab({ t }: { t: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('orders').select('customer_name, customer_phone, city, created_at').order('created_at', { ascending: false }).then(({ data }) => {
      const map = new Map<string, any>();
      (data || []).forEach((o: any) => {
        const key = o.customer_phone;
        if (!map.has(key)) map.set(key, { ...o, orders: 1 });
        else map.get(key).orders++;
      });
      setOrders(Array.from(map.values()));
      setLoading(false);
    });
  }, []);

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp}>
      <h1 className="text-2xl font-black mb-6">{t.customersTitle} ({orders.length})</h1>
      {loading ? (
        <div className="text-center py-12 text-muted">...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t.noCustomers}</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-surface-alt">
                <th className="text-start px-4 py-3 font-semibold text-muted">{t.nameLabelFull}</th>
                <th className="text-start px-4 py-3 font-semibold text-muted">{t.phoneLabelFull}</th>
                <th className="text-start px-4 py-3 font-semibold text-muted">{t.cityLabelFull}</th>
                <th className="text-start px-4 py-3 font-semibold text-muted">{t.ordersLabel}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((c, i) => (
                <tr key={i} className="border-b border-border last:border-b-0 hover:bg-surface-alt transition-colors">
                  <td className="px-4 py-3 font-semibold">{c.customer_name}</td>
                  <td className="px-4 py-3 text-muted">{c.customer_phone}</td>
                  <td className="px-4 py-3 text-muted">{c.city}</td>
                  <td className="px-4 py-3"><span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-[11px] font-bold">{c.orders}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

/* ── Settings Tab ── */
function SettingsTab({ t }: { t: any }) {
  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp}>
      <h1 className="text-2xl font-black mb-6">{t.settings}</h1>
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="font-bold text-lg mb-4">{t.storeInfo}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-ink">{t.storeNameLabel}</label>
            <input type="text" defaultValue="ESRAA Moments" className="input-field" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-ink">{t.whatsappLabel}</label>
            <input type="tel" defaultValue="201097905435" className="input-field" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-ink">{t.emailLabel}</label>
            <input type="email" defaultValue="esraamomentsstore@gmail.com" className="input-field" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-ink">{t.addressLabelAdmin}</label>
            <input type="text" defaultValue="شارع الجيش - عزبة النخل" className="input-field" />
          </div>
        </div>
        <button className="btn primary mt-5">{t.saveChangesLabel}</button>
      </div>
    </motion.div>
  );
}

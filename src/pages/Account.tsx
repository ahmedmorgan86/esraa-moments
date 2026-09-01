import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Package, LogOut, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAllowedAdmin } from '../lib/adminAuth';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

export default function AccountPage({ t }: { t: any }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
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
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      const u = s?.user;
      setUser(u);
      if (u) setName(u.user_metadata?.full_name || '');
    });
    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    setMsg(error ? 'حصل خطأ' : 'تم الحفظ ✓');
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) return <div className="section page flex items-center justify-center min-h-[50vh]"><div className="text-muted">...</div></div>;

  if (!user) {
    return (
      <section className="section page flex items-center justify-center min-h-[60vh]">
        <motion.div className="text-center max-w-[380px]" initial="hidden" animate="visible" variants={fadeUp}>
          <div className="w-20 h-20 bg-surface border border-border rounded-2xl flex items-center justify-center mx-auto mb-6">
            <User size={32} className="text-primary" />
          </div>
          <h1 className="text-xl font-black mb-2">{t.login}</h1>
          <p className="text-muted text-sm mb-6">{t.loginDesc}</p>
          <Link to="/login" className="btn primary">{t.login}</Link>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="section page">
      <motion.div className="max-w-[560px] mx-auto" initial="hidden" animate="visible" variants={fadeUp}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="eyebrow">{t.account}</span>
            <h1 className="text-[clamp(24px,3.2vw,38px)] font-black">{t.profile}</h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-danger text-[13px] font-semibold hover:underline"><LogOut size={16} /> {t.logout}</button>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 mb-6">
          <h2 className="flex items-center gap-2 font-bold text-lg mb-5"><User size={18} className="text-primary" /> {t.profile}</h2>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-ink">{t.fullName}</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-ink">{t.email}</label>
              <input type="email" value={user.email} disabled className="input-field opacity-60 cursor-not-allowed" />
            </div>
            {msg && <div className="text-success text-[12.5px] text-center">{msg}</div>}
            <button type="submit" disabled={saving} className="btn primary self-start">{saving ? '...' : t.save}</button>
          </form>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="flex items-center gap-2 font-bold text-lg mb-4"><Package size={18} className="text-primary" /> {t.orders}</h2>
          <p className="text-muted text-sm">طلباتك هتظهر هنا بعد ما تعمل أوردر.</p>
        </div>

        <div className="mt-5">
          <Link to="/" className="text-primary text-[13px] font-semibold flex items-center gap-1 hover:underline"><ArrowLeft size={14} /> العودة للمتجر</Link>
        </div>
      </motion.div>
    </section>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAllowedAdmin } from '../lib/adminAuth';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

export default function LoginPage({ t }: { t: any }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mode, setMode] = useState<'login' | 'recover'>('login');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message.includes('Invalid') ? 'البريد أو كلمة المرور غلط' : error.message);
    } else {
      if (isAllowedAdmin(email)) {
        window.location.href = '/admin';
      } else {
        window.location.href = '/account';
      }
    }
    setLoading(false);
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/account#type=recovery' });
    if (error) setError(error.message);
    else setSuccess('تم إرسال رابط إعادة تعيين كلمة المرور على بريدك');
    setLoading(false);
  };

  return (
    <section className="section page flex items-center justify-center min-h-[70vh]">
      <motion.div className="w-full max-w-[480px]" initial="hidden" animate="visible" variants={fadeUp}>
        <div className="bg-surface border border-border rounded-2xl shadow-lg overflow-hidden">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-primary/8 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✨</span>
            </div>
            <h1 className="text-xl font-black mb-1">{mode === 'login' ? 'أهلاً بيك' : 'نسيت كلمة المرور؟'}</h1>
            <p className="text-muted text-sm">{mode === 'login' ? 'ادخل بياناتك عشان تكمل' : 'ادخل بريدك ونبعتلك رابط إعادة التعيين'}</p>
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRecover} className="px-8 pb-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-ink">البريد الإلكتروني</label>
              <div className="flex items-center gap-2 bg-surface-alt border border-border rounded-lg px-3 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                <Mail size={16} className="text-muted" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" className="flex-1 text-[13.5px] outline-none bg-transparent" required />
              </div>
            </div>

            {mode === 'login' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-ink">كلمة المرور</label>
                <div className="flex items-center gap-2 bg-surface-alt border border-border rounded-lg px-3 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                  <Lock size={16} className="text-muted" />
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="flex-1 text-[13.5px] outline-none bg-transparent" required />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="text-muted hover:text-ink transition-colors">{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
            )}

            {error && <div className="text-danger text-[12.5px] bg-danger/8 rounded-lg py-2 px-3 text-center">{error}</div>}
            {success && <div className="text-success text-[12.5px] bg-success/8 rounded-lg py-2 px-3 text-center">{success}</div>}

            <button type="submit" disabled={loading} className="btn primary w-full py-3.5 text-[14.5px]">{loading ? '...' : mode === 'login' ? 'تسجيل الدخول' : 'إرسال الرابط'}</button>

            <div className="text-center mt-1">
              {mode === 'login' ? (
                <button type="button" onClick={() => setMode('recover')} className="text-primary text-[13px] font-semibold hover:underline">نسيت كلمة المرور؟</button>
              ) : (
                <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="text-primary text-[13px] font-semibold hover:underline">الرجوع لتسجيل الدخول</button>
              )}
            </div>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] text-muted font-semibold">أو</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <a href="https://wa.me/201097905435" target="_blank" rel="noopener" className="btn w-full border border-border flex items-center justify-center gap-2 text-sm bg-[#25d366] text-white border-[#25d366] hover:bg-[#128c7e]">
              <MessageCircle size={16} /> كلمينا على الواتساب
            </a>
          </form>
        </div>

        <div className="auth-footer mt-5">
          <Link to="/" className="text-primary text-[13px] font-semibold flex items-center gap-1 hover:underline"><ArrowLeft size={14} /> العودة للمتجر</Link>
        </div>
      </motion.div>
    </section>
  );
}

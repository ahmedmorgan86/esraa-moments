import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, MessageCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isAllowedAdmin } from '../lib/adminAuth';
import { useStoreSettings } from '../hooks';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

export default function LoginPage({ t, lang }: { t: any; lang: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mode, setMode] = useState<'login' | 'recover'>('login');
  const settings = useStoreSettings();
  const isEn = lang === 'en';
  const waNumber = String(settings.whatsapp || '').replace(/[^\d]/g, '');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    if (!isSupabaseConfigured) {
      setError(t.notConfigured || t.loginFailed);
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Supabase returns English, internal-flavoured messages. Matching on the
      // word "Invalid" broke the moment that copy changed, and anything else
      // was shown to the visitor verbatim.
      setError(/invalid|credential/i.test(error.message) ? t.invalidCredentials : t.loginFailed);
    } else {
      window.location.href = isAllowedAdmin(email) ? '/admin' : '/account';
    }
    setLoading(false);
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    if (!isSupabaseConfigured) {
      setError(t.notConfigured || t.resetFailed);
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/account#type=recovery` });
    if (error) setError(t.resetFailed);
    else setSuccess(t.resetSent);
    setLoading(false);
  };

  return (
    <section className="section page flex items-center justify-center min-h-[70vh]">
      <motion.div className="w-full max-w-[480px]" initial="hidden" animate="visible" variants={fadeUp}>
        <div className="bg-surface border border-border rounded-2xl shadow-lg overflow-hidden">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-primary/8 rounded-2xl flex items-center justify-center mx-auto mb-4" aria-hidden="true">
              <span className="text-3xl">✨</span>
            </div>
            <h1 className="text-xl font-black mb-1">{mode === 'login' ? t.loginWelcome : t.forgotTitle}</h1>
            <p className="text-muted text-sm">{mode === 'login' ? t.loginDesc : t.forgotDesc}</p>
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRecover} className="px-8 pb-8 flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-email" className="text-[12.5px] font-semibold text-ink">{t.email}</label>
              <div className="flex items-center gap-2 bg-surface-alt border border-border rounded-lg px-3 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                <Mail size={16} className="text-muted flex-shrink-0" aria-hidden="true" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  dir="ltr"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="flex-1 text-[13.5px] outline-none bg-transparent min-w-0"
                  required
                />
              </div>
            </div>

            {mode === 'login' && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-password" className="text-[12.5px] font-semibold text-ink">{t.password}</label>
                <div className="flex items-center gap-2 bg-surface-alt border border-border rounded-lg px-3 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                  <Lock size={16} className="text-muted flex-shrink-0" aria-hidden="true" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    dir="ltr"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="flex-1 text-[13.5px] outline-none bg-transparent min-w-0"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    aria-pressed={showPw}
                    aria-label={showPw ? t.hidePassword : t.showPassword}
                    className="text-muted hover:text-ink transition-colors flex-shrink-0"
                  >
                    {showPw ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
              </div>
            )}

            {error && <div role="alert" className="text-danger text-[12.5px] bg-danger/8 rounded-lg py-2 px-3 text-center">{error}</div>}
            {success && <div role="status" className="text-success text-[12.5px] bg-success/8 rounded-lg py-2 px-3 text-center">{success}</div>}

            <button type="submit" disabled={loading} className="btn primary w-full py-3.5 text-[14.5px] disabled:opacity-60 disabled:cursor-wait">
              {loading ? '…' : mode === 'login' ? t.signIn : t.sendResetLink}
            </button>

            <div className="text-center mt-1">
              {mode === 'login' ? (
                <button type="button" onClick={() => { setMode('recover'); setError(''); setSuccess(''); }} className="text-primary text-[13px] font-semibold hover:underline">{t.forgot}</button>
              ) : (
                <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="text-primary text-[13px] font-semibold hover:underline">{t.backToLogin}</button>
              )}
            </div>

            {waNumber ? (
              <>
                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] text-muted font-semibold">{t.or}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <a
                  href={`https://wa.me/${waNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t.contactWhatsApp}
                  className="btn w-full border border-border flex items-center justify-center gap-2 text-sm bg-[#25d366] text-white border-[#25d366] hover:bg-[#128c7e]"
                >
                  <MessageCircle size={16} aria-hidden="true" /> {t.contactWhatsApp}
                </a>
              </>
            ) : null}
          </form>
        </div>

        <div className="auth-footer mt-5">
          <Link to="/" className="text-primary text-[13px] font-semibold flex items-center gap-1 hover:underline">
            <ArrowLeft size={14} aria-hidden="true" className={isEn ? '' : 'rotate-180'} /> {t.backToShop}
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

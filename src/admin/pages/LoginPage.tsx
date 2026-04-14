import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { LogIn, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function normalizeLogin(input: string) {
  return input.trim().toLowerCase();
}

export const LoginPage: React.FC = () => {
  const [view, setView] = useState<'login' | 'forgot'>('login');

  // ── Login state ────────────────────────────────────────────────────────────
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // ── Forgot password state ──────────────────────────────────────────────────
  const [resetEmail,   setResetEmail]   = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError,   setResetError]   = useState<string | null>(null);
  const [resetSent,    setResetSent]    = useState(false);

  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || '/admin/dashboard';

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const email = normalizeLogin(username);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (
          error.message?.toLowerCase().includes('invalid login credentials') ||
          error.message?.toLowerCase().includes('invalid_credentials')
        ) {
          setError('Usuario o contraseña incorrectos.');
        } else {
          setError(error.message || 'Error al iniciar sesión.');
        }
        setLoading(false);
        return;
      }

      if (!data?.session || !data?.user) {
        setError('No se pudo crear la sesión del usuario.');
        setLoading(false);
        return;
      }

      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Error al conectar con el servidor de autenticación.');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetLoading) return;

    setResetLoading(true);
    setResetError(null);

    try {
      const email = normalizeLogin(resetEmail);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/acepta-invitacion`,
      });

      if (error) {
        setResetError(error.message || 'Error al enviar el email.');
        setResetLoading(false);
        return;
      }

      setResetSent(true);
    } catch (err: any) {
      setResetError(err?.message || 'Error al conectar con el servidor.');
      setResetLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <AnimatePresence mode="wait">
        {/* ─── Vista Login ─── */}
        {view === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-md space-y-8 rounded-2xl border border-slate-200 bg-white p-10 shadow-xl"
          >
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white">
                <LogIn size={32} />
              </div>
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
                Panel de administración
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Acceso exclusivo para administradores
              </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
              {error && (
                <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                  <AlertCircle size={18} className="shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Email
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="relative flex w-full justify-center rounded-xl bg-brand-600 px-4 py-4 text-sm font-bold text-white transition-all hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Iniciar sesión'
                )}
              </button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setView('forgot'); setError(null); }}
                className="text-xs text-slate-400 hover:text-brand-600 transition-colors underline underline-offset-2"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── Vista Recuperar contraseña ─── */}
        {view === 'forgot' && (
          <motion.div
            key="forgot"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-md space-y-8 rounded-2xl border border-slate-200 bg-white p-10 shadow-xl"
          >
            {resetSent ? (
              <div className="text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Email enviado</h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Si esa dirección existe en nuestro sistema, recibirás un email con el enlace para crear nueva contraseña. Revisa también la carpeta de spam.
                </p>
                <button
                  onClick={() => { setView('login'); setResetSent(false); setResetEmail(''); }}
                  className="mt-4 flex items-center gap-1.5 mx-auto text-xs text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <ArrowLeft size={13} /> Volver al login
                </button>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-900">Recuperar acceso</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Introduce tu email y te enviaremos un enlace para crear una nueva contraseña.
                  </p>
                </div>

                <form className="space-y-5" onSubmit={handleResetPassword}>
                  {resetError && (
                    <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                      <AlertCircle size={18} className="shrink-0" />
                      <p>{resetError}</p>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      autoFocus
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      placeholder="tu@email.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading || !resetEmail.trim()}
                    className="flex w-full justify-center rounded-xl bg-brand-600 px-4 py-4 text-sm font-bold text-white transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {resetLoading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      'Enviar enlace de recuperación'
                    )}
                  </button>
                </form>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setView('login'); setResetError(null); }}
                    className="flex items-center gap-1.5 mx-auto text-xs text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <ArrowLeft size={13} /> Volver al login
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

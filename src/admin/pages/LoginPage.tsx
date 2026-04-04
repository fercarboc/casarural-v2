import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { LogIn, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

function normalizeLogin(input: string) {
  const value = input.trim().toLowerCase();

  if (value === 'admin') {
    return 'fercarboc@gmail.com';
  }

  return value;
}

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/admin/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const email = normalizeLogin(username);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError('Credenciales inválidas. Por favor, inténtalo de nuevo.');
        setLoading(false);
        return;
      }

      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Error al conectar con el servidor de autenticación.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 rounded-2xl border border-slate-200 bg-white p-10 shadow-xl"
      >
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white">
            <LogIn size={32} />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
            La Rasilla Admin
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Acceso exclusivo para administradores
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-100">
              <AlertCircle size={18} />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Usuario o email
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="admin o email"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
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
            className="group relative flex w-full justify-center rounded-xl bg-brand-600 px-4 py-4 text-sm font-bold text-white transition-all hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          <p>Prueba local: usuario <strong>admin</strong></p>
        </div>
      </motion.div>
    </div>
  );
};
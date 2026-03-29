import React from 'react';
import { Settings, ExternalLink, Key } from 'lucide-react';

export const SupabaseSetup: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-6 font-sans">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-stone-200 bg-white p-10 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-800 text-white">
            <Settings size={32} />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-stone-900">Configuración Requerida</h2>
          <p className="mt-2 text-sm text-stone-500">
            Para que el sistema de reservas y el panel de administración funcionen, debes conectar tu proyecto de Supabase.
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-stone-50 p-6 border border-stone-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 mb-4 flex items-center gap-2">
              <Key size={14} /> Pasos para configurar
            </h3>
            <ol className="space-y-4 text-sm text-stone-600">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">1</span>
                <div>
                  <p className="font-semibold text-stone-900">Obtén tus credenciales</p>
                  <p className="mt-1">Ve a tu proyecto en <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline inline-flex items-center gap-1">Supabase Dashboard <ExternalLink size={12} /></a></p>
                  <p className="mt-1 text-xs text-stone-400">Settings → API → Project URL & anon key</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">2</span>
                <div>
                  <p className="font-semibold text-stone-900">Añade los Secretos</p>
                  <p className="mt-1">Abre el panel de <strong>Settings</strong> (⚙️ arriba a la derecha) → <strong>Secrets</strong>.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">3</span>
                <div>
                  <p className="font-semibold text-stone-900">Nombres de las variables</p>
                  <div className="mt-2 space-y-2">
                    <code className="block rounded bg-stone-200 px-2 py-1 text-xs font-mono">VITE_SUPABASE_URL</code>
                    <code className="block rounded bg-stone-200 px-2 py-1 text-xs font-mono">VITE_SUPABASE_ANON_KEY</code>
                  </div>
                </div>
              </li>
            </ol>
          </div>

          <div className="text-center text-xs text-stone-400">
            <p>La aplicación se reiniciará automáticamente una vez guardes los secretos.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

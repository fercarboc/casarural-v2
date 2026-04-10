// src/admin/components/CreateUserModal.tsx
import { useState } from 'react'
import { X, UserPlus, Loader2, Check, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { createUser } from '../../services/users.service'

interface Props {
  onClose: () => void
  onCreated: (user: { id: string; email: string; rol: string }) => void
}

const ROLES = [
  { value: 'ADMIN', label: 'Administrador' },
  // Preparado para más roles: { value: 'VIEWER', label: 'Solo lectura' }
]

export function CreateUserModal({ onClose, onCreated }: Props) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol]           = useState('ADMIN')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)

  const emailOk    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const passwordOk = password.length >= 6
  const canSubmit  = emailOk && passwordOk && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setError('')

    try {
      const user = await createUser({ email: email.trim().toLowerCase(), password, rol })
      setDone(true)
      setTimeout(() => onCreated(user), 1000)
    } catch (err: any) {
      setError(err.message ?? 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-sidebar-border bg-sidebar-bg shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600/20">
              <UserPlus size={16} className="text-brand-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Crear usuario</h2>
              <p className="text-[11px] text-slate-500">Nuevo acceso al panel de administración</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading || done}
              autoFocus
              placeholder="usuario@ejemplo.com"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Contraseña * <span className="font-normal text-slate-500">(mínimo 6 caracteres)</span>
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading || done}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 pr-11 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password.length > 0 && !passwordOk && (
              <p className="mt-1 text-xs text-amber-400">Mínimo 6 caracteres</p>
            )}
          </div>

          {/* Rol */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Rol
            </label>
            <select
              value={rol}
              onChange={e => setRol(e.target.value)}
              disabled={loading || done}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-600 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-50 ${
                done
                  ? 'bg-emerald-600 text-white'
                  : 'bg-brand-600 text-white hover:bg-brand-700'
              }`}
            >
              {done ? (
                <><Check size={15} /> Usuario creado</>
              ) : loading ? (
                <><Loader2 size={15} className="animate-spin" /> Creando…</>
              ) : (
                <><UserPlus size={15} /> Crear usuario</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

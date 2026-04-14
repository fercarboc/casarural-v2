// src/admin/pages/AcceptInvitePage.tsx
// Página de primer acceso para clientes invitados desde NexCore.
// El enlace del email lleva aquí con el token en el hash (#access_token=…&type=invite).
// Supabase procesa el hash automáticamente → el usuario queda autenticado.
// Aquí puede crear su contraseña para futuros accesos, luego va a /admin → onboarding.

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../context/AuthContext'

// ─── Comprobación de fortaleza de contraseña ──────────────────────────────────

function passwordStrength(pwd: string): { score: number; label: string; color: string } {
  if (pwd.length === 0) return { score: 0, label: '', color: '' }
  let score = 0
  if (pwd.length >= 8)  score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return { score, label: 'Muy débil',  color: 'bg-red-500' }
  if (score === 2) return { score, label: 'Débil',      color: 'bg-orange-400' }
  if (score === 3) return { score, label: 'Aceptable',  color: 'bg-yellow-400' }
  if (score === 4) return { score, label: 'Buena',      color: 'bg-emerald-400' }
  return              { score, label: 'Excelente',  color: 'bg-emerald-500' }
}

// ─── Estado de sesión al cargar ───────────────────────────────────────────────

type PageState = 'loading' | 'set-password' | 'success' | 'expired'

export function AcceptInvitePage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()

  const [pageState, setPageState] = useState<PageState>('loading')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPwd,   setShowPwd]   = useState(false)
  const [showCfm,   setShowCfm]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  const strength = passwordStrength(password)

  // Detectar si el hash de la URL contiene un token de invitación
  const hashHasToken = typeof window !== 'undefined' &&
    (window.location.hash.includes('access_token') || window.location.hash.includes('type=invite'))

  useEffect(() => {
    if (loading) return

    if (session) {
      // Usuario autenticado (token procesado por Supabase) → mostrar formulario de contraseña
      setPageState('set-password')
    } else if (!hashHasToken) {
      // Sin sesión y sin hash de token → enlace inválido o expirado
      setPageState('expired')
    } else {
      // Hay hash pero aún no hay sesión → esperar un ciclo más (Supabase aún procesa)
      const timeout = setTimeout(() => {
        if (!session) setPageState('expired')
      }, 3000)
      return () => clearTimeout(timeout)
    }
  }, [session, loading, hashHasToken])

  // Si ya tenía sesión activa (no viene de invitación) → ir directo al panel
  useEffect(() => {
    if (!loading && session && !hashHasToken && pageState !== 'set-password') {
      navigate('/admin', { replace: true })
    }
  }, [loading, session, hashHasToken, pageState, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password || password !== confirm) return
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw new Error(updateError.message)

      setPageState('success')
      // Pequeña pausa para que el usuario vea el mensaje de éxito
      setTimeout(() => navigate('/admin', { replace: true }), 1800)
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar la contraseña.')
      setSaving(false)
    }
  }

  // ── Pantalla de carga ───────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-3 border-slate-700 border-t-indigo-400" />
          <p className="text-sm text-slate-500">Verificando invitación…</p>
        </div>
      </div>
    )
  }

  // ── Enlace expirado / inválido ──────────────────────────────────────────────
  if (pageState === 'expired') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
            <AlertCircle size={28} />
          </div>
          <h1 className="mb-2 text-xl font-bold text-white">Enlace expirado o inválido</h1>
          <p className="mb-6 text-sm text-slate-400 leading-relaxed">
            Este enlace de invitación ya no es válido. Puede que haya caducado o ya fue utilizado.
          </p>
          <p className="text-xs text-slate-600">
            Contacta con el administrador de StayNexApp para recibir un nuevo acceso.
          </p>
        </div>
      </div>
    )
  }

  // ── Éxito ───────────────────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md rounded-2xl border border-emerald-500/20 bg-slate-900 p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 size={28} />
          </div>
          <h1 className="mb-2 text-xl font-bold text-white">¡Contraseña creada!</h1>
          <p className="text-sm text-slate-400">Accediendo a tu panel…</p>
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full animate-[progress_1.8s_linear_forwards] rounded-full bg-emerald-500" />
          </div>
        </div>
        <style>{`@keyframes progress { from { width: 0 } to { width: 100% } }`}</style>
      </div>
    )
  }

  // ── Formulario de contraseña ────────────────────────────────────────────────
  const userEmail = session?.user?.email ?? ''
  const passwordsMatch = password === confirm
  const canSubmit = password.length >= 8 && confirm.length > 0 && passwordsMatch

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <KeyRound size={26} />
          </div>
          <h1 className="text-2xl font-bold text-white">Bienvenido a StayNexApp</h1>
          <p className="mt-2 text-sm text-slate-400">
            Crea tu contraseña para acceder a tu panel de gestión.
          </p>
          {userEmail && (
            <p className="mt-1 text-xs text-slate-500">
              Cuenta: <span className="font-mono text-slate-400">{userEmail}</span>
            </p>
          )}
        </div>

        {/* Tarjeta */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl space-y-5"
        >
          {/* Contraseña */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-4 pr-10 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Indicador de fortaleza */}
            {password.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        i <= strength.score ? strength.color : 'bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-[10px] font-bold ${
                  strength.score <= 2 ? 'text-orange-400' :
                  strength.score === 3 ? 'text-yellow-400' : 'text-emerald-400'
                }`}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                type={showCfm ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
                required
                className={`w-full rounded-xl border py-3 pl-4 pr-10 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all bg-slate-950/70 ${
                  confirm.length > 0 && !passwordsMatch
                    ? 'border-red-500/50 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
                    : confirm.length > 0 && passwordsMatch
                    ? 'border-emerald-500/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20'
                    : 'border-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowCfm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showCfm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirm.length > 0 && !passwordsMatch && (
              <p className="mt-1.5 text-xs text-red-400">Las contraseñas no coinciden.</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving
              ? <><Loader2 size={15} className="animate-spin" /> Guardando…</>
              : <><CheckCircle2 size={15} /> Crear contraseña y acceder</>
            }
          </button>

          {/* Info */}
          <p className="text-center text-[11px] text-slate-600">
            Recuerda esta contraseña para futuros accesos a{' '}
            <span className="text-slate-500">clientes.staynexapp.com</span>
          </p>
        </form>
      </div>
    </div>
  )
}

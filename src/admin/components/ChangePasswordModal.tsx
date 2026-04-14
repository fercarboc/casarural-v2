import React, { useState } from 'react'
import { AlertCircle, CheckCircle2, KeyRound, Loader2, X } from 'lucide-react'
import { supabase } from '../../integrations/supabase/client'

type Props = {
  onClose: () => void
}

type Status = 'idle' | 'saving' | 'saved' | 'error'

export function ChangePasswordModal({ onClose }: Props) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!currentPassword || !newPassword || !repeatPassword) {
      setStatus('error')
      setErrorMsg('Debes completar todos los campos.')
      return
    }

    if (newPassword.length < 8) {
      setStatus('error')
      setErrorMsg('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (newPassword !== repeatPassword) {
      setStatus('error')
      setErrorMsg('La nueva contraseña y la repetición no coinciden.')
      return
    }

    if (currentPassword === newPassword) {
      setStatus('error')
      setErrorMsg('La nueva contraseña no puede ser igual a la actual.')
      return
    }

    setStatus('saving')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user?.email) {
      setStatus('error')
      setErrorMsg('No se pudo obtener el usuario autenticado.')
      return
    }

    // 1) Reautenticación con contraseña actual
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (signInError) {
      setStatus('error')
      setErrorMsg('La contraseña actual no es correcta.')
      return
    }

    // 2) Cambio de contraseña
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      setStatus('error')
      setErrorMsg(updateError.message)
      return
    }

    setStatus('saved')
    setTimeout(() => {
      onClose()
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-slate-300" />
            <h2 className="text-base font-semibold text-white">Cambiar contraseña</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <Field label="Contraseña actual">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputCls}
              autoComplete="current-password"
            />
          </Field>

          <Field label="Nueva contraseña">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputCls}
              autoComplete="new-password"
            />
          </Field>

          <Field label="Repetir nueva contraseña">
            <input
              type="password"
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
              className={inputCls}
              autoComplete="new-password"
            />
          </Field>

          {status === 'error' && errorMsg && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={16} />
              {errorMsg}
            </div>
          )}

          {status === 'saved' && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              <CheckCircle2 size={16} />
              Contraseña actualizada correctamente.
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={status === 'saving'}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-70"
            >
              {status === 'saving' && <Loader2 size={16} className="animate-spin" />}
              Guardar contraseña
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-300">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20'
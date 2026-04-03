// src/admin/components/ModalSolicitudPago.tsx
import { useState } from 'react'
import { Loader2, X, CreditCard, Check, AlertCircle } from 'lucide-react'
import { supabase } from '../../integrations/supabase/client'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface Reserva {
  id: string
  codigo: string
  nombre: string
  apellidos: string
  email: string
  total: number
  importe_pagado: number | null
  fecha_entrada: string
  fecha_salida: string
  noches: number
  num_huespedes: number
}

interface Props {
  reserva: Reserva
  onClose: () => void
  onSuccess: () => void
}

function fmtDate(d: string) {
  return format(parseISO(d), "d 'de' MMMM yyyy", { locale: es })
}

export function ModalSolicitudPago({ reserva, onClose, onSuccess }: Props) {
  const pendiente = reserva.total - (reserva.importe_pagado ?? 0)
  const [importe, setImporte] = useState(pendiente.toFixed(2))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSend() {
    const importeNum = parseFloat(importe)
    if (isNaN(importeNum) || importeNum <= 0) {
      setError('El importe debe ser un número positivo')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const authHeader = { Authorization: `Bearer ${session?.access_token}` }

      // 1 — Crear sesión Stripe
      const { data: checkout, error: checkoutError } = await supabase.functions.invoke(
        'create-stripe-checkout',
        { body: { reservaId: reserva.id }, headers: authHeader }
      )
      if (checkoutError) throw new Error((checkout as any)?.error ?? checkoutError.message)
      if (!checkout?.checkout_url) throw new Error('No se recibió enlace de pago de Stripe')

      // 2 — Enviar email
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          template_key: 'admin_payment_request',
          to_email: reserva.email,
          to_name: `${reserva.nombre} ${reserva.apellidos}`,
          reservation_id: reserva.id,
          extra_vars: {
            importe_pago: importeNum.toFixed(2),
            checkout_url: checkout.checkout_url,
          },
        },
        headers: authHeader,
      })
      if (emailError) throw new Error(emailError.message)

      setSent(true)
      setTimeout(() => { onSuccess(); onClose() }, 1500)
    } catch (err: any) {
      setError(err.message ?? 'Error al enviar el enlace de pago')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-100">
              <CreditCard size={18} className="text-slate-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Solicitud de pago Stripe</h2>
              <p className="text-xs text-slate-400">{reserva.nombre} {reserva.apellidos}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Resumen */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Reserva</span>
              <span className="font-mono font-bold text-slate-700">{reserva.codigo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Entrada</span>
              <span className="text-slate-700">{fmtDate(reserva.fecha_entrada)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total reserva</span>
              <span className="font-bold text-slate-900">{reserva.total.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5">
              <span className="text-slate-500">Pendiente de pago</span>
              <span className="font-bold text-amber-700">{pendiente.toFixed(2)} €</span>
            </div>
          </div>

          {/* Importe */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Importe del enlace de pago (€)
            </label>
            <div className="relative">
              <input
                type="number"
                value={importe}
                onChange={e => setImporte(e.target.value)}
                step="0.01"
                min="0.01"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-right text-lg font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              Se generará un enlace de pago Stripe por este importe y se enviará a <strong>{reserva.email}</strong>
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} disabled={loading}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSend} disabled={loading || sent}
            className="flex-1 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {sent
              ? <><Check size={15} /> Enviado</>
              : loading
                ? <><Loader2 size={15} className="animate-spin" /> Generando...</>
                : 'Generar y enviar enlace'}
          </button>
        </div>
      </div>
    </div>
  )
}

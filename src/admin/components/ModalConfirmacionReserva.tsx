// src/admin/components/ModalConfirmacionReserva.tsx
import { useState } from 'react'
import { Loader2, X, Mail, Check, AlertCircle } from 'lucide-react'
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
  noches: number
  num_huespedes: number
  fecha_entrada: string
  fecha_salida: string
  token_cliente: string | null
}

interface Props {
  reserva: Reserva
  onClose: () => void
  onSuccess: () => void
}

type TipoPago = 'STRIPE' | 'TRANSFERENCIA' | 'EFECTIVO_BIZUM'

function fmtDate(d: string) {
  return format(parseISO(d), "d 'de' MMMM yyyy", { locale: es })
}

const APP_URL = (import.meta as any).env.VITE_APP_URL ?? window.location.origin

export function ModalConfirmacionReserva({ reserva, onClose, onSuccess }: Props) {
  const pendiente = reserva.total - (reserva.importe_pagado ?? 0)

  const [tipoPago, setTipoPago]           = useState<TipoPago>('STRIPE')
  const [titularCuenta, setTitularCuenta] = useState('La Rasilla')
  const [iban, setIban]                   = useState('')
  const [importeTransferencia, setImporteTransferencia] = useState(pendiente.toFixed(2))
  const [notasCliente, setNotasCliente]   = useState('')
  const [incluirCheckin, setIncluirCheckin] = useState(false)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [sent, setSent]                   = useState(false)

  async function handleSend() {
    setLoading(true)
    setError(null)

    try {
      const reservaUrl = `${APP_URL}/reserva/${reserva.token_cliente}`
      const checkinUrl = reserva.token_cliente ? `${APP_URL}/reserva/${reserva.token_cliente}` : ''

      // Construir bloques HTML opcionales
      const bloqueTransferencia = tipoPago === 'TRANSFERENCIA'
        ? `<div style="background:#FFF8E7;border:1px solid #F0D080;border-radius:12px;padding:20px 24px;margin-bottom:0;">
            <div style="font-size:14px;font-weight:700;color:#5D4037;margin-bottom:12px;">🏦 Datos para la transferencia bancaria</div>
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
              <tr><td style="padding:4px 0;color:#666;">Titular:</td><td style="padding:4px 0;font-weight:600;text-align:right;">${titularCuenta}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">IBAN:</td><td style="padding:4px 0;font-weight:700;font-family:monospace;text-align:right;letter-spacing:1px;">${iban}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Importe:</td><td style="padding:4px 0;font-weight:700;color:#2D4A3E;text-align:right;">${parseFloat(importeTransferencia).toFixed(2)} €</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Concepto:</td><td style="padding:4px 0;font-weight:600;text-align:right;">Reserva ${reserva.codigo}</td></tr>
            </table>
            <p style="margin:12px 0 0;font-size:12px;color:#888;">Una vez recibida la transferencia, te confirmaremos el pago por email.</p>
          </div>`
        : ''

      const bloqueNotas = notasCliente
        ? `<div style="background:#F0F7F4;border-left:3px solid #2D4A3E;padding:16px 20px;border-radius:0 8px 8px 0;font-size:13px;color:#444;line-height:1.8;">${notasCliente}</div>`
        : ''

      const bloqueCheckin = incluirCheckin && reserva.token_cliente
        ? `<div style="background:#EFF6F4;border:1px solid #A5C8BE;border-radius:12px;padding:20px 24px;text-align:center;margin-bottom:0;">
            <div style="font-size:14px;font-weight:700;color:#1C2B25;margin-bottom:8px;">📋 Registro de viajeros</div>
            <p style="margin:0 0 14px;font-size:13px;color:#666;">Por favor, añade los datos de todos los huéspedes antes de tu llegada.</p>
            <a href="${checkinUrl}" style="display:inline-block;background:#2D4A3E;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;">
              Completar registro →
            </a>
          </div>`
        : ''

      // Combinar bloques opcionales
      const bloqueOpcionales = [bloqueTransferencia, bloqueNotas, bloqueCheckin]
        .filter(Boolean)
        .map(b => `<tr><td style="padding:0 40px 24px;">${b}</td></tr>`)
        .join('\n')

      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          template_key: 'admin_reservation_confirmed_manual',
          to_email: reserva.email,
          to_name: `${reserva.nombre} ${reserva.apellidos}`,
          reservation_id: reserva.id,
          extra_vars: {
            reserva_url: reservaUrl,
            bloque_transferencia: bloqueOpcionales,
            bloque_notas: '',  // incluido en bloqueOpcionales
          },
        },
      })
      if (emailError) throw new Error(emailError.message)

      setSent(true)
      setTimeout(() => { onSuccess(); onClose() }, 1500)
    } catch (err: any) {
      setError(err.message ?? 'Error al enviar el email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-zinc-100">
              <Mail size={18} className="text-zinc-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">Enviar confirmación</h2>
              <p className="text-xs text-zinc-400">{reserva.nombre} {reserva.apellidos} · {reserva.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Tipo de pago */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Método de pago del cliente
            </label>
            <div className="space-y-2">
              {[
                { value: 'STRIPE',         label: '💳 Stripe',          desc: 'Incluye enlace al área de cliente' },
                { value: 'TRANSFERENCIA',  label: '🏦 Transferencia',   desc: 'Se muestran datos bancarios en el email' },
                { value: 'EFECTIVO_BIZUM', label: '💵 Efectivo / Bizum', desc: 'Confirmación simple sin datos de pago' },
              ].map(opt => (
                <label key={opt.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${tipoPago === opt.value ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'}`}>
                  <input type="radio" checked={tipoPago === opt.value}
                    onChange={() => setTipoPago(opt.value as TipoPago)}
                    className="accent-zinc-900" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{opt.label}</p>
                    <p className="text-xs text-zinc-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Datos bancarios (solo si TRANSFERENCIA) */}
          {tipoPago === 'TRANSFERENCIA' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Datos bancarios para el email</p>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Titular de la cuenta</label>
                <input type="text" value={titularCuenta} onChange={e => setTitularCuenta(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">IBAN</label>
                <input type="text" value={iban} onChange={e => setIban(e.target.value)}
                  placeholder="ES00 0000 0000 0000 0000 0000"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Importe a transferir (€)</label>
                <input type="number" value={importeTransferencia} onChange={e => setImporteTransferencia(e.target.value)}
                  step="0.01" min="0"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-400" />
              </div>
            </div>
          )}

          {/* Notas para el cliente */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Nota adicional para el cliente <span className="font-normal text-zinc-400">(opcional)</span>
            </label>
            <textarea value={notasCliente} onChange={e => setNotasCliente(e.target.value)}
              rows={3} placeholder="Texto que se incluirá en el email..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none resize-none" />
          </div>

          {/* Incluir check-in */}
          {reserva.token_cliente && (
            <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-50">
              <input type="checkbox" checked={incluirCheckin} onChange={e => setIncluirCheckin(e.target.checked)}
                className="w-4 h-4 rounded accent-zinc-900" />
              <div>
                <p className="text-sm font-medium text-zinc-800">Incluir enlace de check-in</p>
                <p className="text-xs text-zinc-500">El cliente podrá añadir los datos de los huéspedes desde el email</p>
              </div>
            </label>
          )}

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
            className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm font-bold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSend} disabled={loading || sent}
            className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50 flex items-center justify-center gap-2">
            {sent
              ? <><Check size={15} /> Enviado</>
              : loading
                ? <><Loader2 size={15} className="animate-spin" /> Enviando...</>
                : <><Mail size={15} /> Enviar confirmación</>}
          </button>
        </div>
      </div>
    </div>
  )
}

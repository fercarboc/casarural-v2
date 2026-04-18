// src/admin/components/EmitirFacturaModal.tsx
// Modal to emit a fiscal invoice for a paid reservation from IncomePage.

import React, { useState, useEffect } from 'react'
import { X, FileText, Loader2, AlertCircle, CheckCircle2, Lock } from 'lucide-react'
import { supabase } from '../../integrations/supabase/client'
import { invoiceService, type FacturaDetalle } from '../../services/invoice.service'
import { useAdminTenant } from '../context/AdminTenantContext'

interface Props {
  reservaId: string
  onClose: () => void
  onEmitida: (factura: FacturaDetalle) => void
}

interface ReservaData {
  codigo: string
  nombre_cliente: string
  apellidos_cliente: string
  email_cliente: string | null
  nif_factura: string | null
  razon_social: string | null
  direccion_factura: string | null
  importe_total: number
  estado_pago: string
}

const inputCls =
  'w-full rounded-lg border border-sidebar-border bg-admin-card px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

function fmtEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export function EmitirFacturaModal({ reservaId, onClose, onEmitida }: Props) {
  const { property_id } = useAdminTenant()
  const [reserva, setReserva] = useState<ReservaData | null>(null)
  const [loadingReserva, setLoadingReserva] = useState(true)

  const [nombre, setNombre] = useState('')
  const [nif, setNif] = useState('')
  const [direccion, setDireccion] = useState('')
  const [emailCliente, setEmailCliente] = useState('')

  const [emitting, setEmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<FacturaDetalle | null>(null)

  useEffect(() => {
    supabase
      .from('reservas')
      .select('codigo, nombre_cliente, apellidos_cliente, email_cliente, nif_factura, razon_social, direccion_factura, importe_total, estado_pago')
      .eq('id', reservaId)
      .single()
      .then(({ data, error: e }) => {
        if (e || !data) { setError('No se pudo cargar la reserva'); return }
        const r = data as ReservaData
        setReserva(r)
        setNombre(r.razon_social || `${r.nombre_cliente} ${r.apellidos_cliente}`.trim())
        setNif(r.nif_factura ?? '')
        setDireccion(r.direccion_factura ?? '')
        setEmailCliente(r.email_cliente ?? '')
      })
      .finally(() => setLoadingReserva(false))
  }, [reservaId])

  async function handleEmitir() {
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return }
    setEmitting(true)
    setError('')
    try {
      const factura = await invoiceService.emitirFacturaFiscal({
        reservaId,
        propertyId: property_id,
        nombre: nombre.trim(),
        nif: nif.trim() || null,
        direccion: direccion.trim() || null,
        email_cliente: emailCliente.trim() || null,
      })
      setDone(factura)
    } catch (e: any) {
      setError(e.message ?? 'Error al emitir la factura')
    } finally {
      setEmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg rounded-2xl border border-sidebar-border bg-sidebar-bg shadow-2xl">
        <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-brand-400" />
            <h2 className="text-lg font-bold text-white">Emitir factura fiscal</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-sidebar-hover">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {done ? (
          <div className="space-y-4 p-6">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-8 text-center">
              <CheckCircle2 size={36} className="text-emerald-400" />
              <p className="text-lg font-bold text-emerald-300">Factura emitida</p>
              <p className="text-2xl font-bold text-white">{done.numero}</p>
              <p className="text-sm text-emerald-200">
                {fmtEur(done.total)} · {done.nombre}
              </p>
              <div className="mt-2 flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300">
                <Lock size={11} />
                Factura bloqueada e inmutable (VeriFactu)
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => onEmitida(done)}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : loadingReserva ? (
          <div className="flex h-40 items-center justify-center gap-2 text-slate-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Cargando reserva…</span>
          </div>
        ) : (
          <>
            <div className="space-y-4 p-6">
              {reserva && (
                <div className="rounded-xl border border-sidebar-border bg-admin-card px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Reserva</p>
                  <p className="mt-1 font-bold text-white">{reserva.codigo}</p>
                  <p className="text-sm text-slate-400">
                    {reserva.nombre_cliente} {reserva.apellidos_cliente}
                    {' · '}
                    <span className="font-semibold text-white">{fmtEur(reserva.importe_total)}</span>
                  </p>
                </div>
              )}

              <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
                <Lock size={13} className="mt-0.5 shrink-0" />
                <span>
                  Esta factura quedará <strong>bloqueada e inmutable</strong> tras la emisión conforme al
                  reglamento VeriFactu. Para anular, deberás emitir una factura rectificativa.
                </span>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Nombre / Razón social *
                </label>
                <input
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Nombre completo o razón social"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    NIF / DNI
                  </label>
                  <input
                    value={nif}
                    onChange={e => setNif(e.target.value)}
                    placeholder="12345678A"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Email cliente
                  </label>
                  <input
                    value={emailCliente}
                    onChange={e => setEmailCliente(e.target.value)}
                    placeholder="cliente@email.com"
                    type="email"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Dirección fiscal
                </label>
                <input
                  value={direccion}
                  onChange={e => setDireccion(e.target.value)}
                  placeholder="Calle, CP, Ciudad"
                  className={inputCls}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <AlertCircle size={15} className="shrink-0" />
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-sidebar-border px-6 py-4">
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-sidebar-hover"
              >
                Cancelar
              </button>
              <button
                onClick={handleEmitir}
                disabled={!nombre.trim() || emitting}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 disabled:opacity-50"
              >
                {emitting && <Loader2 size={14} className="animate-spin" />}
                <FileText size={14} />
                Emitir factura
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// src/admin/components/EmitirRectificativaModal.tsx
// Modal to emit a RECTIFICATIVA invoice, cancelling the original fiscal invoice.

import React, { useState } from 'react'
import { X, RotateCcw, Loader2, AlertCircle, CheckCircle2, Lock } from 'lucide-react'
import { invoiceService, type FacturaDetalle } from '../../services/invoice.service'
import { useAdminTenant } from '../context/AdminTenantContext'

interface Props {
  factura: FacturaDetalle
  onClose: () => void
  onEmitida: (rectificativa: FacturaDetalle) => void
}

const inputCls =
  'w-full rounded-lg border border-sidebar-border bg-admin-card px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

function fmtEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

const MOTIVOS_FRECUENTES = [
  'Anulación por cancelación de reserva',
  'Error en los datos del cliente',
  'Error en el importe facturado',
  'Devolución por reclamación',
  'Otro motivo',
]

export function EmitirRectificativaModal({ factura, onClose, onEmitida }: Props) {
  const { property_id } = useAdminTenant()
  const [motivo, setMotivo] = useState('')
  const [emitting, setEmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ rectificativa: FacturaDetalle; original_numero: string } | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  async function handleEmitir() {
    if (!motivo.trim()) { setError('El motivo es obligatorio'); return }
    if (!confirmed) { setError('Debes confirmar que la acción es irreversible'); return }
    setEmitting(true)
    setError('')
    try {
      const result = await invoiceService.emitirRectificativa({
        facturaId: factura.id,
        propertyId: property_id,
        motivo: motivo.trim(),
      })
      setDone(result)
    } catch (e: any) {
      setError(e.message ?? 'Error al emitir la rectificativa')
    } finally {
      setEmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg rounded-2xl border border-sidebar-border bg-sidebar-bg shadow-2xl">
        <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-4">
          <div className="flex items-center gap-2">
            <RotateCcw size={18} className="text-amber-400" />
            <h2 className="text-lg font-bold text-white">Emitir factura rectificativa</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-sidebar-hover">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {done ? (
          <div className="space-y-4 p-6">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-6 py-8 text-center">
              <CheckCircle2 size={36} className="text-amber-400" />
              <p className="text-base font-bold text-amber-300">Rectificativa emitida</p>
              <p className="text-2xl font-bold text-white">{done.rectificativa.numero}</p>
              <p className="text-sm text-amber-200">
                {fmtEur(done.rectificativa.total)} · Rectifica {done.original_numero}
              </p>
              <div className="mt-1 flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/20 px-3 py-1 text-xs text-amber-300">
                <Lock size={11} />
                Factura original marcada como RECTIFICADA
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => onEmitida(done.rectificativa)}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 p-6">
              <div className="rounded-xl border border-sidebar-border bg-admin-card px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Factura a rectificar</p>
                <p className="mt-1 font-bold text-white">{factura.numero}</p>
                <p className="text-sm text-slate-400">
                  {factura.nombre}
                  {factura.nif && <span className="ml-2 text-slate-500">· {factura.nif}</span>}
                  {' · '}
                  <span className="font-semibold text-white">{fmtEur(factura.total)}</span>
                </p>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                <Lock size={13} className="mt-0.5 shrink-0" />
                <span>
                  Esta acción es <strong>irreversible</strong>. Se emitirá una nueva factura rectificativa
                  con importes negativos y la factura original quedará marcada como <strong>RECTIFICADA</strong>.
                  No se puede volver a emitir otra ordinaria para la misma reserva sin crear una nueva.
                </span>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Motivo de la rectificación *
                </label>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {MOTIVOS_FRECUENTES.map(m => (
                    <button
                      key={m}
                      onClick={() => setMotivo(m)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        motivo === m
                          ? 'border-brand-500 bg-brand-600/20 text-brand-300'
                          : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <input
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder="Describe el motivo de la rectificación…"
                  className={inputCls}
                />
              </div>

              <label className="flex items-start gap-2.5 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={e => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-600 accent-brand-600"
                />
                <span>
                  Entiendo que esta acción es <strong>irreversible</strong> y que la factura original
                  quedará cancelada sin posibilidad de revertir.
                </span>
              </label>

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
                disabled={!motivo.trim() || !confirmed || emitting}
                className="flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-amber-700 disabled:opacity-50"
              >
                {emitting && <Loader2 size={14} className="animate-spin" />}
                <RotateCcw size={14} />
                Emitir rectificativa
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

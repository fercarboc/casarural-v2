// src/admin/components/AEATModal.tsx
// Modal to prepare an AEAT/VeriFactu batch from bloqueada invoices with estado_aeat=PENDIENTE.

import { useState, useEffect } from 'react'
import { X, Building2, Loader2, AlertCircle, CheckCircle2, ChevronRight, Square, CheckSquare } from 'lucide-react'
import { supabase } from '../../integrations/supabase/client'
import { invoiceService, type FacturaDetalle } from '../../services/invoice.service'
import { useAdminTenant } from '../context/AdminTenantContext'

interface Props {
  onClose: () => void
  onLoteCreado: (loteId: string, numFacturas: number) => void
}

function fmtEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export function AEATModal({ onClose, onLoteCreado }: Props) {
  const { property_id } = useAdminTenant()
  const [facturas, setFacturas] = useState<FacturaDetalle[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ lote_id: string; num_facturas: number } | null>(null)

  useEffect(() => {
    supabase
      .from('facturas')
      .select('*, reservas(codigo, fecha_entrada, fecha_salida)')
      .eq('property_id', property_id)
      .not('estado', 'in', '(ANULADA,RECTIFICADA)')
      .not('estado_aeat', 'in', '(PREPARADA,ENVIADA)')
      .order('fecha_emision', { ascending: true })
      .then(({ data, error: e }: { data: any[] | null; error: any }) => {
        if (e) { setError(e.message); return }
        const mapped = (data ?? []).map((f: any) => ({
          ...f,
          // normalize DB column names → FacturaDetalle field names
          numero:                 f.numero_factura,
          nombre:                 f.nombre_cliente,
          nif:                    f.nif_cliente,
          tipo_factura:           f.tipo_factura   ?? 'ORDINARIA',
          bloqueada:              f.bloqueada      ?? false,
          hash_actual:            f.hash_actual    ?? null,
          hash_anterior:          f.hash_anterior  ?? null,
          factura_rectificada_id: f.factura_rectificada_id ?? null,
          motivo_rectificacion:   f.motivo_rectificacion   ?? null,
          estado_aeat:            f.estado_aeat    ?? 'PENDIENTE',
          email_cliente:          f.email_cliente  ?? null,
          fecha_operacion:        f.fecha_operacion ?? null,
          reserva_codigo:         f.reservas?.codigo,
        })) as FacturaDetalle[]
        setFacturas(mapped)
        setSelected(new Set(mapped.map(f => f.id)))
      })
      .finally(() => setLoading(false))
  }, [property_id])

  function toggleAll() {
    if (selected.size === facturas.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(facturas.map(f => f.id)))
    }
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handlePreparar() {
    if (selected.size === 0) { setError('Selecciona al menos una factura'); return }
    setPreparing(true)
    setError('')
    try {
      const result = await invoiceService.prepararLoteAeat(property_id, [...selected])
      setDone(result)
    } catch (e: any) {
      setError(e.message ?? 'Error al preparar el lote AEAT')
    } finally {
      setPreparing(false)
    }
  }

  const totalSeleccionado = facturas
    .filter(f => selected.has(f.id))
    .reduce((s, f) => s + Math.abs(f.total), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-2xl rounded-2xl border border-sidebar-border bg-sidebar-bg shadow-2xl">
        <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-violet-400" />
            <h2 className="text-lg font-bold text-white">Preparar lote AEAT / VeriFactu</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-sidebar-hover">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {done ? (
          <div className="space-y-4 p-6">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/10 px-6 py-8 text-center">
              <CheckCircle2 size={36} className="text-violet-400" />
              <p className="text-base font-bold text-violet-300">Lote preparado correctamente</p>
              <p className="text-sm text-slate-300">
                <span className="font-bold text-white">{done.num_facturas} facturas</span> marcadas como PREPARADA
              </p>
              <p className="text-xs text-slate-400">ID del lote: {done.lote_id}</p>
              <div className="mt-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-xs text-violet-300">
                La integración real con AEAT/VeriFactu (envío al registro) está pendiente de implementación (Fase 2).
                El payload VeriFactu se ha generado y almacenado en la tabla <code>lotes_aeat</code>.
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => onLoteCreado(done.lote_id, done.num_facturas)}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex h-48 items-center justify-center gap-2 text-slate-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Cargando facturas pendientes…</span>
          </div>
        ) : facturas.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-500">
            <CheckCircle2 size={28} className="text-emerald-400" />
            <p className="text-sm font-medium">No hay facturas pendientes de enviar a AEAT.</p>
            <p className="text-xs">Todas las facturas bloqueadas ya están PREPARADAS o ENVIADAS.</p>
          </div>
        ) : (
          <>
            <div className="p-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Selecciona las facturas para incluir en el lote VeriFactu.
                </p>
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-1.5 text-xs font-medium text-brand-400 hover:text-brand-300"
                >
                  {selected.size === facturas.length ? <CheckSquare size={14} /> : <Square size={14} />}
                  {selected.size === facturas.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-xl border border-sidebar-border">
                <table className="w-full text-sm">
                  <thead className="border-b border-sidebar-border bg-admin-card/70">
                    <tr>
                      <th className="w-10 px-3 py-2.5" />
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Número</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tipo</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Fecha</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Cliente</th>
                      <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sidebar-border">
                    {facturas.map(f => (
                      <tr
                        key={f.id}
                        onClick={() => toggle(f.id)}
                        className={`cursor-pointer transition-colors ${selected.has(f.id) ? 'bg-brand-600/10' : 'hover:bg-sidebar-hover/60'}`}
                      >
                        <td className="px-3 py-2.5">
                          {selected.has(f.id)
                            ? <CheckSquare size={15} className="text-brand-400" />
                            : <Square size={15} className="text-slate-600" />
                          }
                        </td>
                        <td className="px-3 py-2.5 font-bold text-white">{f.numero}</td>
                        <td className="px-3 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            f.tipo_factura === 'ORDINARIA'
                              ? 'bg-blue-500/10 text-blue-300'
                              : 'bg-amber-500/10 text-amber-300'
                          }`}>
                            {f.tipo_factura === 'ORDINARIA' ? 'Ordinaria' : 'Rectif.'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-400">{fmtDate(f.fecha_emision)}</td>
                        <td className="max-w-[160px] truncate px-3 py-2.5 text-slate-300">{f.nombre}</td>
                        <td className={`px-3 py-2.5 text-right font-semibold ${f.total < 0 ? 'text-red-300' : 'text-white'}`}>
                          {fmtEur(f.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selected.size > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-sidebar-border bg-admin-card px-4 py-3 text-sm">
                  <span className="text-slate-400">{selected.size} facturas seleccionadas</span>
                  <span className="font-bold text-white">{fmtEur(totalSeleccionado)}</span>
                </div>
              )}

              {error && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
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
                onClick={handlePreparar}
                disabled={selected.size === 0 || preparing}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-violet-700 disabled:opacity-50"
              >
                {preparing ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                Preparar lote ({selected.size})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

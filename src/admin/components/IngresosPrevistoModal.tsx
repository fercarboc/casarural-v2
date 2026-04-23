import React, { useState, useEffect, useMemo } from 'react'
import { X, TrendingUp, CalendarClock, Loader2, Plus, CheckCircle2 } from 'lucide-react'
import { format, parseISO, addMonths, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAdminTenant } from '../context/AdminTenantContext'
import { rentalService, type Rental, type RentalPayment } from '../../services/rental.service'

interface ProjectedSlot {
  mes: string            // 'yyyy-MM'
  label: string          // 'Mayo 2026'
  fecha_vencimiento: string
  importe: number
  payment: RentalPayment | null
}

interface RentalForecast {
  rental: Rental
  slots: ProjectedSlot[]
}

function buildForecast(rental: Rental, payments: RentalPayment[]): RentalForecast {
  const start = parseISO(rental.fecha_inicio)
  let end: Date
  if (rental.fecha_fin) {
    end = parseISO(rental.fecha_fin)
  } else if (rental.duracion_meses) {
    end = addMonths(start, rental.duracion_meses - 1)
  } else {
    end = addMonths(new Date(), 11)
  }

  const byMonth = new Map(payments.map(p => [p.fecha_vencimiento.substring(0, 7), p]))

  const slots: ProjectedSlot[] = []
  let cur = start
  while (!isAfter(cur, end)) {
    const mes = format(cur, 'yyyy-MM')
    slots.push({
      mes,
      label: format(cur, 'MMMM yyyy', { locale: es }),
      fecha_vencimiento: format(cur, 'yyyy-MM-dd'),
      importe: rental.precio_mensual,
      payment: byMonth.get(mes) ?? null,
    })
    cur = addMonths(cur, 1)
  }
  return { rental, slots }
}

function fmt(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export const IngresosPrevistoModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { property_id } = useAdminTenant()

  const [forecasts, setForecasts] = useState<RentalForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState<string | null>(null) // 'rentalId-mes'

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await rentalService.getActiveRentalsForForecast(property_id)
        if (!cancelled) {
          setForecasts(data.map(({ rental, payments }) => buildForecast(rental, payments)))
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Error cargando previsiones')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [property_id])

  async function handleCrearRecibo(forecast: RentalForecast, slot: ProjectedSlot) {
    const key = `${forecast.rental.id}-${slot.mes}`
    setCreating(key)
    try {
      const payment = await rentalService.createMonthlyPayment({
        property_id: forecast.rental.property_id,
        rental_id: forecast.rental.id,
        concepto: `Mensualidad ${slot.label}`,
        importe: slot.importe,
        fecha_vencimiento: slot.fecha_vencimiento,
      })
      setForecasts(prev => prev.map(f =>
        f.rental.id !== forecast.rental.id ? f :
        { ...f, slots: f.slots.map(s => s.mes === slot.mes ? { ...s, payment } : s) }
      ))
    } catch (e: any) {
      alert(e?.message ?? 'Error creando recibo')
    } finally {
      setCreating(null)
    }
  }

  // Summary stats
  const { totalPrevisto, totalPendiente, totalCreado, proximoPago } = useMemo(() => {
    const today = new Date()
    let totalPrevisto = 0
    let totalPendiente = 0
    let totalCreado = 0
    let proximoPago: { fecha: string; importe: number; cliente: string } | null = null

    for (const f of forecasts) {
      for (const s of f.slots) {
        totalPrevisto += s.importe
        if (s.payment) {
          totalCreado += s.importe
          if (s.payment.estado !== 'PAGADO') totalPendiente += s.importe
        }
        if (!s.payment && !proximoPago) {
          const d = parseISO(s.fecha_vencimiento)
          if (!isAfter(today, d)) {
            proximoPago = { fecha: s.label, importe: s.importe, cliente: f.rental.cliente_nombre }
          }
        }
      }
    }
    return { totalPrevisto, totalPendiente, totalCreado, proximoPago }
  }, [forecasts])

  // Group all slots by month across all rentals
  const byMonth = useMemo(() => {
    const map = new Map<string, { label: string; rows: { forecast: RentalForecast; slot: ProjectedSlot }[] }>()
    for (const f of forecasts) {
      for (const s of f.slots) {
        if (!map.has(s.mes)) map.set(s.mes, { label: s.label, rows: [] })
        map.get(s.mes)!.rows.push({ forecast: f, slot: s })
      }
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [forecasts])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-sidebar-border bg-sidebar-bg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-500/10 p-2 text-teal-300">
              <CalendarClock size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Ingresos Previstos</h2>
              <p className="text-xs text-slate-400">Proyección de mensualidades de contratos activos</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-sidebar-hover hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm text-red-300">{error}</div>
          ) : forecasts.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-slate-500">
              No hay contratos activos o aprobados con previsiones de pago.
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SummaryCard label="Total previsto" value={fmt(totalPrevisto)} color="teal" />
                <SummaryCard label="Recibos creados" value={fmt(totalCreado)} color="violet" />
                <SummaryCard label="Pendiente cobro" value={fmt(totalPendiente)} color="amber" />
                <SummaryCard
                  label="Próximo recibo"
                  value={proximoPago ? fmt(proximoPago.importe) : '—'}
                  sub={proximoPago ? `${proximoPago.cliente.split(' ')[0]} · ${proximoPago.fecha}` : undefined}
                  color="blue"
                />
              </div>

              {/* Timeline by month */}
              <div className="space-y-4">
                {byMonth.map(([mes, { label, rows }]) => {
                  const monthTotal = rows.reduce((s, r) => s + r.slot.importe, 0)
                  return (
                    <div key={mes} className="overflow-hidden rounded-2xl border border-sidebar-border bg-admin-card/40">
                      <div className="flex items-center justify-between border-b border-sidebar-border bg-admin-card/70 px-4 py-3">
                        <span className="text-sm font-semibold capitalize text-white">{label}</span>
                        <span className="text-xs font-medium text-slate-400">{fmt(monthTotal)}</span>
                      </div>
                      <div className="divide-y divide-sidebar-border">
                        {rows.map(({ forecast, slot }) => {
                          const key = `${forecast.rental.id}-${slot.mes}`
                          const isCreating = creating === key
                          const p = slot.payment

                          return (
                            <div key={key} className="flex items-center justify-between gap-4 px-4 py-3">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-100">{forecast.rental.cliente_nombre}</p>
                                <p className="truncate text-xs text-slate-500">{forecast.rental.unidad_nombre ?? '—'} · vence {format(parseISO(slot.fecha_vencimiento), 'd MMM', { locale: es })}</p>
                              </div>
                              <span className="whitespace-nowrap text-sm font-semibold text-white">{fmt(slot.importe)}</span>
                              <div className="flex items-center gap-2">
                                {p ? (
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                    p.estado === 'PAGADO'
                                      ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                                      : p.estado === 'VENCIDO'
                                        ? 'border border-red-500/20 bg-red-500/10 text-red-300'
                                        : 'border border-amber-500/20 bg-amber-500/10 text-amber-300'
                                  }`}>
                                    {p.estado === 'PAGADO' ? <CheckCircle2 size={9} /> : null}
                                    {p.estado === 'PAGADO' ? 'Pagado' : p.estado === 'VENCIDO' ? 'Vencido' : 'Pendiente'}
                                  </span>
                                ) : (
                                  <button
                                    disabled={isCreating}
                                    onClick={() => handleCrearRecibo(forecast, slot)}
                                    className="flex items-center gap-1 rounded-lg border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-[10px] font-bold text-teal-300 transition-colors hover:bg-teal-500/20 disabled:opacity-40"
                                  >
                                    {isCreating ? <Loader2 size={9} className="animate-spin" /> : <Plus size={9} />}
                                    Crear recibo
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div className="border-t border-sidebar-border px-6 py-4 text-right">
          <button onClick={onClose} className="rounded-xl border border-sidebar-border bg-admin-card px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-sidebar-hover">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  const cls: Record<string, string> = {
    teal: 'bg-teal-500/10 text-teal-300',
    amber: 'bg-amber-500/10 text-amber-300',
    violet: 'bg-violet-500/10 text-violet-300',
    blue: 'bg-blue-500/10 text-blue-300',
  }
  return (
    <div className="rounded-2xl border border-sidebar-border bg-admin-card/60 p-4">
      <div className={`mb-2 w-fit rounded-lg p-1.5 ${cls[color] ?? 'bg-slate-500/10 text-slate-400'}`}>
        <TrendingUp size={13} />
      </div>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 truncate text-[10px] text-slate-400">{sub}</p>}
    </div>
  )
}

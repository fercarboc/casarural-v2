import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Download, TrendingUp, CreditCard, Users, Loader2 } from 'lucide-react'
import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../integrations/supabase/client'

// ─── Tipos ─────────────────────────────────────────────────────────────────────
type Periodo = 'mes' | 'anio' | 'custom'

interface ReservaIngreso {
  id: string; codigo: string
  nombre: string; apellidos: string
  fecha_entrada: string; fecha_salida: string
  noches: number; num_huespedes: number
  origen: string; tarifa: string
  total: number; importe_pagado: number | null; importe_senal: number | null
  comision_plataforma: number
  estado: string; estado_pago: string
  descuento: number
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const ORIGEN_SHORT: Record<string, string> = {
  DIRECT_WEB: 'Web', BOOKING_ICAL: 'Booking', AIRBNB_ICAL: 'Airbnb',
  ESCAPADARURAL_ICAL: 'Escapada', ADMIN: 'Admin',
}
const PAGO_LABEL: Record<string, string> = {
  UNPAID: 'Sin pagar', PARTIAL: 'Señal pagada', PAID: 'Pagado', REFUNDED: 'Devuelto',
}
const PAGO_STYLE: Record<string, string> = {
  UNPAID: 'bg-zinc-100 text-zinc-500',
  PARTIAL: 'bg-blue-50 text-blue-700',
  PAID: 'bg-emerald-50 text-emerald-700',
  REFUNDED: 'bg-violet-50 text-violet-700',
}

const today = new Date()

function fmt(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
function fmtDate(d: string) {
  return format(parseISO(d), 'd MMM yyyy', { locale: es })
}
function getRangeForPeriodo(periodo: Periodo, customFrom: string, customTo: string): [Date, Date] {
  if (periodo === 'mes') return [startOfMonth(today), endOfMonth(today)]
  if (periodo === 'anio') return [startOfYear(today), endOfYear(today)]
  return [
    customFrom ? new Date(customFrom) : startOfMonth(today),
    customTo   ? new Date(customTo)   : endOfMonth(today),
  ]
}

// ─── Componente principal ──────────────────────────────────────────────────────
export const IncomePage: React.FC = () => {
  const [periodo, setPeriodo]       = useState<Periodo>('mes')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')
  const [applied, setApplied]       = useState<{ periodo: Periodo; customFrom: string; customTo: string }>(
    { periodo: 'mes', customFrom: '', customTo: '' }
  )
  const [reservas, setReservas]     = useState<ReservaIngreso[]>([])
  const [loading, setLoading]       = useState(true)

  // ── Carga de datos ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    const [from, to] = getRangeForPeriodo(applied.periodo, applied.customFrom, applied.customTo)
    const fromStr = from.toISOString().substring(0, 10)
    const toStr   = to.toISOString().substring(0, 10)

    const { data } = await supabase
      .from('reservas')
      .select('id,codigo,nombre,apellidos,fecha_entrada,fecha_salida,noches,num_huespedes,origen,tarifa,total,importe_pagado,importe_senal,comision_plataforma,estado,estado_pago,descuento')
      .gte('fecha_entrada', fromStr)
      .lte('fecha_entrada', toStr)
      .neq('estado', 'CANCELLED')
      .neq('estado', 'EXPIRED')
      .order('fecha_entrada', { ascending: true })

    setReservas(data ?? [])
    setLoading(false)
  }, [applied])

  useEffect(() => { load() }, [load])

  // ── Cálculos de resumen ───────────────────────────────────────────────────
  const totalCobrado      = reservas.reduce((s, r) => s + (r.importe_pagado ?? 0), 0)
  const totalFacturado    = reservas.reduce((s, r) => s + r.total, 0)
  const totalPendiente    = reservas.reduce((s, r) => s + Math.max(0, r.total - (r.importe_pagado ?? 0)), 0)
  const totalComisiones   = reservas.reduce((s, r) => s + (r.comision_plataforma ?? 0), 0)
  const totalNeto         = totalFacturado - totalComisiones
  const totalNoches       = reservas.reduce((s, r) => s + r.noches, 0)
  const precioMedioNoche  = totalNoches > 0 ? totalFacturado / totalNoches : 0

  // ── Desglose mensual (solo vista año) ────────────────────────────────────
  const monthlyGroups = useMemo(() => {
    if (applied.periodo !== 'anio') return null
    const groups: Record<string, { label: string; count: number; total: number; cobrado: number }> = {}
    reservas.forEach(r => {
      const key = r.fecha_entrada.substring(0, 7)
      if (!groups[key]) {
        const [y, m] = key.split('-').map(Number)
        groups[key] = { label: format(new Date(y, m - 1, 1), 'MMMM yyyy', { locale: es }), count: 0, total: 0, cobrado: 0 }
      }
      groups[key].count++
      groups[key].total   += r.total
      groups[key].cobrado += r.importe_pagado ?? 0
    })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [reservas, applied.periodo])

  // ── Etiqueta de período ───────────────────────────────────────────────────
  const periodoLabel =
    applied.periodo === 'mes'  ? format(today, 'MMMM yyyy', { locale: es })
    : applied.periodo === 'anio' ? `Año ${today.getFullYear()}`
    : `${applied.customFrom} — ${applied.customTo}`

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handlePeriodo(p: Periodo) {
    setPeriodo(p)
    if (p !== 'custom') setApplied({ periodo: p, customFrom: '', customTo: '' })
  }
  function applyCustom() {
    if (!customFrom || !customTo) return
    setApplied({ periodo: 'custom', customFrom, customTo })
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Estilos de impresión ────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #income-report {
            display: block !important;
            visibility: visible;
            position: absolute; left: 0; top: 0; right: 0;
            background: white; padding: 1.5cm 2cm; box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: #18181b;
          }
          #income-report * { visibility: visible; }
          #income-report h1 { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
          #income-report .print-meta { font-size: 10px; color: #71717a; margin-bottom: 20px; }
          #income-report .stat-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 20px; }
          #income-report .stat-box { border: 1px solid #e4e4e7; border-radius: 8px; padding: 10px 14px; }
          #income-report .stat-lbl { font-size: 8px; color: #71717a; text-transform: uppercase; letter-spacing: .06em; font-weight: 700; }
          #income-report .stat-val { font-size: 18px; font-weight: 700; margin-top: 4px; }
          #income-report table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 16px; }
          #income-report th { background: #f4f4f5; padding: 5px 8px; text-align: left; font-weight: 700; color: #71717a; text-transform: uppercase; font-size: 8px; letter-spacing: .05em; }
          #income-report td { padding: 5px 8px; border-bottom: 1px solid #f4f4f5; }
          #income-report .tr { text-align: right; }
          #income-report .tc { text-align: center; }
          #income-report .tfoot-row td { font-weight: 700; border-top: 2px solid #18181b; }
          #income-report .section-title { font-size: 11px; font-weight: 700; margin: 18px 0 8px; color: #3f3f46; }
        }
      `}</style>

      {/* ── Zona de impresión (oculta en pantalla) ─────────────────────── */}
      <div id="income-report" style={{ display: 'none' }}>
        <h1>Informe de Ingresos — La Rasilla</h1>
        <p className="print-meta">
          Castillo Pedroso, 39699 · Corvera de Toranzo, Cantabria · contacto@casarurallarasilla.com
          <br />
          Período: <strong style={{ textTransform: 'capitalize' }}>{periodoLabel}</strong>
          &nbsp;·&nbsp;Generado: {format(today, "d 'de' MMMM yyyy", { locale: es })}
        </p>

        <div className="stat-grid">
          {[
            { lbl: 'Total facturado',       val: fmt(totalFacturado) },
            { lbl: 'Cobrado',               val: fmt(totalCobrado) },
            { lbl: 'Pendiente de cobro',    val: fmt(totalPendiente) },
            { lbl: 'Precio medio / noche',  val: fmt(precioMedioNoche) },
          ].map(s => (
            <div key={s.lbl} className="stat-box">
              <div className="stat-lbl">{s.lbl}</div>
              <div className="stat-val">{s.val}</div>
            </div>
          ))}
        </div>

        {/* Desglose mensual en informe anual */}
        {monthlyGroups && monthlyGroups.length > 0 && (
          <>
            <p className="section-title">Desglose mensual</p>
            <table>
              <thead>
                <tr>
                  <th>Mes</th><th className="tc">Reservas</th>
                  <th className="tr">Total facturado</th><th className="tr">Cobrado</th>
                </tr>
              </thead>
              <tbody>
                {monthlyGroups.map(([key, g]) => (
                  <tr key={key}>
                    <td style={{ textTransform: 'capitalize' }}>{g.label}</td>
                    <td className="tc">{g.count}</td>
                    <td className="tr">{fmt(g.total)}</td>
                    <td className="tr">{fmt(g.cobrado)}</td>
                  </tr>
                ))}
                <tr className="tfoot-row">
                  <td>Total</td>
                  <td className="tc">{reservas.length}</td>
                  <td className="tr">{fmt(totalFacturado)}</td>
                  <td className="tr">{fmt(totalCobrado)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        <p className="section-title">Detalle de reservas</p>
        <table>
          <thead>
            <tr>
              <th>Código</th><th>Cliente</th><th>Entrada</th><th>Salida</th>
              <th className="tc">Noch.</th><th>Origen</th><th>Tarifa</th>
              <th className="tr">Total</th><th className="tr">Cobrado</th><th>Estado pago</th>
            </tr>
          </thead>
          <tbody>
            {reservas.map(r => (
              <tr key={r.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 9 }}>{r.codigo}</td>
                <td>{r.nombre} {r.apellidos}</td>
                <td>{fmtDate(r.fecha_entrada)}</td>
                <td>{fmtDate(r.fecha_salida)}</td>
                <td className="tc">{r.noches}</td>
                <td>{ORIGEN_SHORT[r.origen] ?? r.origen}</td>
                <td>{r.tarifa === 'FLEXIBLE' ? 'Flexible' : 'No reemb.'}</td>
                <td className="tr" style={{ fontWeight: 700 }}>{fmt(r.total)}</td>
                <td className="tr">{fmt(r.importe_pagado ?? 0)}</td>
                <td>{PAGO_LABEL[r.estado_pago] ?? r.estado_pago}</td>
              </tr>
            ))}
            <tr className="tfoot-row">
              <td colSpan={7}>TOTAL PERÍODO</td>
              <td className="tr">{fmt(totalFacturado)}</td>
              <td className="tr">{fmt(totalCobrado)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── UI normal ──────────────────────────────────────────────────────── */}
      <div className="space-y-6">

        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Ingresos</h1>
            <p className="text-sm text-zinc-500 mt-0.5 capitalize">{periodoLabel}</p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all shadow-sm"
          >
            <Download size={16} /> Descargar PDF
          </button>
        </header>

        {/* Filtros de período */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
            {([
              { v: 'mes'    as Periodo, label: 'Este mes' },
              { v: 'anio'   as Periodo, label: 'Este año' },
              { v: 'custom' as Periodo, label: 'Personalizado' },
            ]).map(({ v, label }) => (
              <button
                key={v}
                onClick={() => handlePeriodo(v)}
                className={`px-4 py-2.5 text-sm font-semibold transition-all border-r border-zinc-200 last:border-r-0 ${
                  periodo === v ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {periodo === 'custom' && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-500">Desde</span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 shadow-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-500">Hasta</span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  onChange={e => setCustomTo(e.target.value)}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 shadow-sm"
                />
              </div>
              <button
                onClick={applyCustom}
                disabled={!customFrom || !customTo}
                className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-40 transition-all"
              >
                Aplicar
              </button>
            </>
          )}
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : (
          <>
            {/* Tarjetas de resumen */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Bruto facturado"
                value={fmt(totalFacturado)}
                icon={<TrendingUp size={16} />}
                color="violet"
                sub={`${reservas.length} reservas`}
              />
              <StatCard
                label="Comisiones plataforma"
                value={fmt(totalComisiones)}
                icon={<CreditCard size={16} />}
                color="amber"
                sub={totalFacturado > 0 && totalComisiones > 0
                  ? `${Math.round(totalComisiones / totalFacturado * 100)}% del bruto`
                  : 'Sin comisiones registradas'}
              />
              <StatCard
                label="Neto (bruto − comis.)"
                value={fmt(totalNeto)}
                icon={<TrendingUp size={16} />}
                color="emerald"
                sub={totalPendiente > 0 ? `Pendiente: ${fmt(totalPendiente)}` : 'Todo cobrado'}
              />
              <StatCard
                label="Precio medio / noche"
                value={fmt(precioMedioNoche)}
                icon={<Users size={16} />}
                color="blue"
                sub={`${totalNoches} noches en total`}
              />
            </div>

            {/* Desglose mensual (solo vista año) */}
            {monthlyGroups && monthlyGroups.length > 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-zinc-50 border-b border-zinc-100 px-6 py-4">
                  <h3 className="text-sm font-bold text-zinc-700">Desglose mensual {today.getFullYear()}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100">
                        <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Mes</th>
                        <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">Reservas</th>
                        <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total facturado</th>
                        <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">Cobrado</th>
                        <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">Pendiente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {monthlyGroups.map(([key, g]) => (
                        <tr key={key} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-6 py-3 font-semibold text-zinc-900 capitalize">{g.label}</td>
                          <td className="px-6 py-3 text-right text-zinc-500">{g.count}</td>
                          <td className="px-6 py-3 text-right font-bold text-zinc-900">{fmt(g.total)}</td>
                          <td className="px-6 py-3 text-right font-semibold text-emerald-700">{fmt(g.cobrado)}</td>
                          <td className="px-6 py-3 text-right text-amber-700">{fmt(Math.max(0, g.total - g.cobrado))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-zinc-200 bg-zinc-50">
                        <td className="px-6 py-3 text-sm font-bold text-zinc-900">Total año</td>
                        <td className="px-6 py-3 text-right text-sm font-bold text-zinc-900">{reservas.length}</td>
                        <td className="px-6 py-3 text-right text-sm font-bold text-zinc-900">{fmt(totalFacturado)}</td>
                        <td className="px-6 py-3 text-right text-sm font-bold text-emerald-700">{fmt(totalCobrado)}</td>
                        <td className="px-6 py-3 text-right text-sm font-bold text-amber-700">{fmt(totalPendiente)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Tabla de reservas */}
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-zinc-50 border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-700">Detalle de reservas</h3>
                <span className="text-xs text-zinc-400">{reservas.length} reservas · {totalNoches} noches</span>
              </div>

              {reservas.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-zinc-400">
                  No hay reservas en el período seleccionado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100">
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Código</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Cliente</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Entrada</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Salida</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-400">Noch.</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Origen</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tarifa</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">Bruto</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">Comisión</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">Neto</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Estado pago</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {reservas.map(r => (
                        <tr key={r.id} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono text-[11px] text-zinc-400">{r.codigo}</td>
                          <td className="px-4 py-3 font-medium text-zinc-900 whitespace-nowrap">{r.nombre} {r.apellidos}</td>
                          <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">{fmtDate(r.fecha_entrada)}</td>
                          <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">{fmtDate(r.fecha_salida)}</td>
                          <td className="px-4 py-3 text-center text-zinc-500">{r.noches}</td>
                          <td className="px-4 py-3 text-zinc-500">{ORIGEN_SHORT[r.origen] ?? r.origen}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold ${r.tarifa === 'FLEXIBLE' ? 'text-emerald-600' : 'text-amber-700'}`}>
                              {r.tarifa === 'FLEXIBLE' ? 'Flexible' : 'No reemb.'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-zinc-900 whitespace-nowrap">{fmt(r.total)}</td>
                          <td className="px-4 py-3 text-right text-red-600 whitespace-nowrap">
                            {r.comision_plataforma > 0 ? fmt(r.comision_plataforma) : <span className="text-zinc-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                            {fmt(r.total - (r.comision_plataforma ?? 0))}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${PAGO_STYLE[r.estado_pago] ?? 'bg-zinc-100 text-zinc-500'}`}>
                              {PAGO_LABEL[r.estado_pago] ?? r.estado_pago}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-zinc-200 bg-zinc-50">
                        <td colSpan={7} className="px-4 py-3 text-sm font-bold text-zinc-900">Total período</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-zinc-900 whitespace-nowrap">{fmt(totalFacturado)}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-red-600 whitespace-nowrap">{totalComisiones > 0 ? fmt(totalComisiones) : '—'}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700 whitespace-nowrap">{fmt(totalNeto)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────
const COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700',
  amber:   'bg-amber-50   text-amber-700',
  blue:    'bg-blue-50    text-blue-700',
  violet:  'bg-violet-50  text-violet-700',
}

function StatCard({ label, value, icon, color, sub }: {
  label: string; value: string; icon: React.ReactNode; color: string; sub?: string
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className={`w-fit rounded-xl p-2 mb-3 ${COLOR_MAP[color] ?? 'bg-zinc-50 text-zinc-500'}`}>
        {icon}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-400">{sub}</p>}
    </div>
  )
}

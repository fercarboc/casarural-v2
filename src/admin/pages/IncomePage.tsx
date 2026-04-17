import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Download,
  TrendingUp,
  CreditCard,
  Users,
  Loader2,
} from 'lucide-react'
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../integrations/supabase/client'

// ─── Tipos ─────────────────────────────────────────────────────────────────────
type Periodo = 'mes' | 'anio' | 'custom'

interface ReservaIngreso {
  id: string
  nombre_cliente: string
  apellidos_cliente: string
  fecha_entrada: string
  fecha_salida: string
  noches: number
  num_huespedes: number
  origen: string
  tarifa: string
  importe_total: number
  estado: string
  estado_pago: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const ORIGEN_SHORT: Record<string, string> = {
  DIRECT_WEB: 'Web',
  BOOKING_ICAL: 'Booking',
  AIRBNB_ICAL: 'Airbnb',
  ESCAPADARURAL_ICAL: 'Escapada',
  ADMIN: 'Admin',
}

const PAGO_LABEL: Record<string, string> = {
  UNPAID: 'Sin pagar',
  PARTIAL: 'Señal pagada',
  PAID: 'Pagado',
  REFUNDED: 'Devuelto',
}

const PAGO_STYLE: Record<string, string> = {
  UNPAID: 'bg-slate-500/10 text-slate-300 border border-slate-500/20',
  PARTIAL: 'bg-blue-500/10 text-blue-300 border border-blue-500/20',
  PAID: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
  REFUNDED: 'bg-violet-500/10 text-violet-300 border border-violet-500/20',
}

const today = new Date()

// Comisión Stripe: 1.5% + 0.25€ por transacción (reservas DIRECT_WEB pagadas)
const STRIPE_PCT = 0.015
const STRIPE_FIXED = 0.25

function stripeComision(importe: number): number {
  return Math.round((importe * STRIPE_PCT + STRIPE_FIXED) * 100) / 100
}

function fmt(n: number) {
  return (
    n.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' €'
  )
}

function fmtDate(d: string) {
  return format(parseISO(d), 'd MMM yyyy', { locale: es })
}

function getRangeForPeriodo(
  periodo: Periodo,
  customFrom: string,
  customTo: string
): [Date, Date] {
  if (periodo === 'mes') return [startOfMonth(today), endOfMonth(today)]
  if (periodo === 'anio') return [startOfYear(today), endOfYear(today)]

  return [
    customFrom ? new Date(customFrom) : startOfMonth(today),
    customTo ? new Date(customTo) : endOfMonth(today),
  ]
}

// ─── Componente principal ──────────────────────────────────────────────────────
export const IncomePage: React.FC = () => {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [applied, setApplied] = useState<{
    periodo: Periodo
    customFrom: string
    customTo: string
  }>({
    periodo: 'mes',
    customFrom: '',
    customTo: '',
  })
  const [reservas, setReservas] = useState<ReservaIngreso[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    const [from, to] = getRangeForPeriodo(
      applied.periodo,
      applied.customFrom,
      applied.customTo
    )
    const fromStr = from.toISOString().substring(0, 10)
    const toStr = to.toISOString().substring(0, 10)

    const { data } = await supabase
      .from('reservas')
      .select(
        'id,nombre_cliente,apellidos_cliente,fecha_entrada,fecha_salida,noches,num_huespedes,origen,tarifa,importe_total,estado,estado_pago'
      )
      .gte('fecha_entrada', fromStr)
      .lte('fecha_entrada', toStr)
      .neq('estado', 'CANCELLED')
      .neq('estado', 'EXPIRED')
      .order('fecha_entrada', { ascending: true })

    setReservas(data ?? [])
    setLoading(false)
  }, [applied])

  useEffect(() => {
    load()
  }, [load])

  const totalFacturado = reservas.reduce((s, r) => s + r.importe_total, 0)
  const totalCobrado = reservas
    .filter((r) => r.estado_pago === 'PAID')
    .reduce((s, r) => s + r.importe_total, 0)

  const totalPendiente = reservas
    .filter((r) => r.estado_pago !== 'PAID' && r.estado_pago !== 'REFUNDED')
    .reduce((s, r) => s + r.importe_total, 0)

  const totalNoches = reservas.reduce((s, r) => s + r.noches, 0)
  const precioMedioNoche = totalNoches > 0 ? totalFacturado / totalNoches : 0

  // Comisiones Stripe solo sobre reservas web directas pagadas
  const totalComisionStripe = reservas
    .filter((r) => r.estado_pago === 'PAID' && r.origen === 'DIRECT_WEB')
    .reduce((s, r) => s + stripeComision(r.importe_total), 0)

  const totalLiquidoNeto = Math.round((totalCobrado - totalComisionStripe) * 100) / 100

  const monthlyGroups = useMemo(() => {
    if (applied.periodo !== 'anio') return null

    const groups: Record<
      string,
      { label: string; count: number; total: number; cobrado: number }
    > = {}

    reservas.forEach((r) => {
      const key = r.fecha_entrada.substring(0, 7)
      if (!groups[key]) {
        const [y, m] = key.split('-').map(Number)
        groups[key] = {
          label: format(new Date(y, m - 1, 1), 'MMMM yyyy', { locale: es }),
          count: 0,
          total: 0,
          cobrado: 0,
        }
      }
      groups[key].count++
      groups[key].total += r.importe_total
      groups[key].cobrado += r.estado_pago === 'PAID' ? r.importe_total : 0
    })

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [reservas, applied.periodo])

  const periodoLabel =
    applied.periodo === 'mes'
      ? format(today, 'MMMM yyyy', { locale: es })
      : applied.periodo === 'anio'
        ? `Año ${today.getFullYear()}`
        : `${applied.customFrom} — ${applied.customTo}`

  function handlePeriodo(p: Periodo) {
    setPeriodo(p)
    if (p !== 'custom') {
      setApplied({ periodo: p, customFrom: '', customTo: '' })
    }
  }

  function applyCustom() {
    if (!customFrom || !customTo) return
    setApplied({ periodo: 'custom', customFrom, customTo })
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #income-report {
            display: block !important;
            visibility: visible;
            position: absolute;
            left: 0;
            top: 0;
            right: 0;
            background: white;
            padding: 1.5cm 2cm;
            box-sizing: border-box;
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

      <div id="income-report" style={{ display: 'none' }}>
        <h1>Informe de Ingresos — La Rasilla</h1>
        <p className="print-meta">
          Castillo Pedroso, 39699 · Corvera de Toranzo, Cantabria ·
          contacto@casarurallarasilla.com
          <br />
          Período: <strong style={{ textTransform: 'capitalize' }}>{periodoLabel}</strong>
          &nbsp;·&nbsp;Generado:{' '}
          {format(today, "d 'de' MMMM yyyy", { locale: es })}
        </p>

        <div className="stat-grid">
          {[
            { lbl: 'Total facturado', val: fmt(totalFacturado) },
            { lbl: 'Cobrado', val: fmt(totalCobrado) },
            { lbl: 'Pendiente de cobro', val: fmt(totalPendiente) },
            { lbl: 'Precio medio / noche', val: fmt(precioMedioNoche) },
          ].map((s) => (
            <div key={s.lbl} className="stat-box">
              <div className="stat-lbl">{s.lbl}</div>
              <div className="stat-val">{s.val}</div>
            </div>
          ))}
        </div>

        {monthlyGroups && monthlyGroups.length > 0 && (
          <>
            <p className="section-title">Desglose mensual</p>
            <table>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th className="tc">Reservas</th>
                  <th className="tr">Total facturado</th>
                  <th className="tr">Cobrado</th>
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
              <th>Cliente</th>
              <th>Entrada</th>
              <th>Salida</th>
              <th className="tc">Noch.</th>
              <th>Origen</th>
              <th>Tarifa</th>
              <th className="tr">Total</th>
              <th>Estado pago</th>
            </tr>
          </thead>
          <tbody>
            {reservas.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.nombre_cliente} {r.apellidos_cliente}
                </td>
                <td>{fmtDate(r.fecha_entrada)}</td>
                <td>{fmtDate(r.fecha_salida)}</td>
                <td className="tc">{r.noches}</td>
                <td>{ORIGEN_SHORT[r.origen] ?? r.origen}</td>
                <td>{r.tarifa === 'FLEXIBLE' ? 'Flexible' : 'No reemb.'}</td>
                <td className="tr" style={{ fontWeight: 700 }}>
                  {fmt(r.importe_total)}
                </td>
                <td>{PAGO_LABEL[r.estado_pago] ?? r.estado_pago}</td>
              </tr>
            ))}
            <tr className="tfoot-row">
              <td colSpan={6}>TOTAL PERÍODO</td>
              <td className="tr">{fmt(totalFacturado)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="space-y-6">
        <header className="rounded-3xl border border-sidebar-border bg-sidebar-bg px-6 py-6 shadow-[0_10px_40px_rgba(0,0,0,0.20)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Ingresos</h1>
              <p className="mt-1 text-sm capitalize text-slate-400">{periodoLabel}</p>
            </div>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-xl border border-sidebar-border bg-admin-card px-4 py-3 text-sm font-medium text-slate-200 transition-all hover:bg-sidebar-hover"
            >
              <Download size={15} />
              Descargar PDF
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-sidebar-border bg-sidebar-bg p-4 shadow-[0_10px_40px_rgba(0,0,0,0.15)]">
          <div className="flex overflow-hidden rounded-xl border border-sidebar-border bg-admin-card">
            {[
              { v: 'mes' as Periodo, label: 'Este mes' },
              { v: 'anio' as Periodo, label: 'Este año' },
              { v: 'custom' as Periodo, label: 'Personalizado' },
            ].map(({ v, label }) => (
              <button
                key={v}
                onClick={() => handlePeriodo(v)}
                className={`border-r border-sidebar-border px-4 py-3 text-sm font-medium transition-all last:border-r-0 ${
                  periodo === v
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-300 hover:bg-sidebar-hover'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {periodo === 'custom' && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">Desde</span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className={darkInputCls}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">Hasta</span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className={darkInputCls}
                />
              </div>

              <button
                onClick={applyCustom}
                disabled={!customFrom || !customTo}
                className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-700 disabled:opacity-40"
              >
                Aplicar
              </button>
            </>
          )}
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center rounded-3xl border border-sidebar-border bg-sidebar-bg">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <StatCard
                label="BRUTO FACTURADO"
                value={fmt(totalFacturado)}
                icon={<TrendingUp size={16} />}
                color="violet"
                sub={`${reservas.length} reservas`}
              />
              <StatCard
                label="COBRADO (PAGADO)"
                value={fmt(totalCobrado)}
                icon={<CreditCard size={16} />}
                color="emerald"
                sub={
                  totalFacturado > 0
                    ? `${Math.round((totalCobrado / totalFacturado) * 100)}% del total`
                    : '—'
                }
              />
              <StatCard
                label="PENDIENTE DE COBRO"
                value={fmt(totalPendiente)}
                icon={<TrendingUp size={16} />}
                color="amber"
                sub={
                  totalPendiente > 0
                    ? `${reservas.filter((r) => r.estado_pago !== 'PAID' && r.estado_pago !== 'REFUNDED').length} reservas`
                    : 'Todo cobrado'
                }
              />
              <StatCard
                label="CARGOS STRIPE"
                value={fmt(totalComisionStripe)}
                icon={<CreditCard size={16} />}
                color="rose"
                sub="1,5% + 0,25 € / transacción"
              />
              <StatCard
                label="LÍQUIDO NETO"
                value={fmt(totalLiquidoNeto)}
                icon={<Users size={16} />}
                color="blue"
                sub={`Precio medio ${fmt(precioMedioNoche)}/noche`}
              />
            </div>

            {monthlyGroups && monthlyGroups.length > 0 && (
              <div className="overflow-hidden rounded-3xl border border-sidebar-border bg-sidebar-bg shadow-[0_10px_40px_rgba(0,0,0,0.15)]">
                <div className="border-b border-sidebar-border bg-admin-card/70 px-6 py-4">
                  <h3 className="text-sm font-semibold text-white">
                    Desglose mensual {today.getFullYear()}
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-sidebar-border bg-admin-card/70">
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Mes
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Reservas
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Total facturado
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Cobrado
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Pendiente
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-sidebar-border">
                      {monthlyGroups.map(([key, g]) => (
                        <tr key={key} className="transition-colors hover:bg-sidebar-hover/60">
                          <td className="px-6 py-3 font-medium capitalize text-slate-100">
                            {g.label}
                          </td>
                          <td className="px-6 py-3 text-right text-slate-400">
                            {g.count}
                          </td>
                          <td className="px-6 py-3 text-right font-semibold text-white">
                            {fmt(g.total)}
                          </td>
                          <td className="px-6 py-3 text-right font-medium text-emerald-300">
                            {fmt(g.cobrado)}
                          </td>
                          <td className="px-6 py-3 text-right text-amber-300">
                            {fmt(Math.max(0, g.total - g.cobrado))}
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    <tfoot>
                      <tr className="border-t-2 border-sidebar-border bg-admin-card/70">
                        <td className="px-6 py-3 text-sm font-semibold text-white">
                          Total año
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-semibold text-white">
                          {reservas.length}
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-semibold text-white">
                          {fmt(totalFacturado)}
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-semibold text-emerald-300">
                          {fmt(totalCobrado)}
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-semibold text-amber-300">
                          {fmt(totalPendiente)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-3xl border border-sidebar-border bg-sidebar-bg shadow-[0_10px_40px_rgba(0,0,0,0.15)]">
              <div className="flex items-center justify-between border-b border-sidebar-border bg-admin-card/70 px-6 py-4">
                <h3 className="text-sm font-semibold text-white">
                  Detalle de reservas
                </h3>
                <span className="text-xs text-slate-500">
                  {reservas.length} reservas · {totalNoches} noches
                </span>
              </div>

              {reservas.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-500">
                  No hay reservas en el período seleccionado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-sidebar-border bg-admin-card/70">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Cliente
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Entrada
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Salida
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Noch.
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Origen
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Tarifa
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Total
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Com. Stripe
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Líquido
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Estado pago
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-sidebar-border">
                      {reservas.map((r) => {
                        const comision = r.origen === 'DIRECT_WEB' && r.estado_pago === 'PAID'
                          ? stripeComision(r.importe_total)
                          : null
                        const neto = comision !== null
                          ? Math.round((r.importe_total - comision) * 100) / 100
                          : null
                        return (
                        <tr
                          key={r.id}
                          className="transition-colors hover:bg-sidebar-hover/60"
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-100">
                            {r.nombre_cliente} {r.apellidos_cliente}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                            {fmtDate(r.fecha_entrada)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                            {fmtDate(r.fecha_salida)}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-400">
                            {r.noches}
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {ORIGEN_SHORT[r.origen] ?? r.origen}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-medium ${
                                r.tarifa === 'FLEXIBLE'
                                  ? 'text-emerald-300'
                                  : 'text-amber-300'
                              }`}
                            >
                              {r.tarifa === 'FLEXIBLE' ? 'Flexible' : 'No reemb.'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-white">
                            {fmt(r.importe_total)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-rose-300">
                            {comision !== null ? `−${fmt(comision)}` : '—'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-300">
                            {neto !== null ? fmt(neto) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                PAGO_STYLE[r.estado_pago] ??
                                'border border-slate-500/20 bg-slate-500/10 text-slate-300'
                              }`}
                            >
                              {PAGO_LABEL[r.estado_pago] ?? r.estado_pago}
                            </span>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>

                    <tfoot>
                      <tr className="border-t-2 border-sidebar-border bg-admin-card/70">
                        <td
                          colSpan={6}
                          className="px-4 py-3 text-sm font-semibold text-white"
                        >
                          Total período
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-white">
                          {fmt(totalFacturado)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-rose-300">
                          {totalComisionStripe > 0 ? `−${fmt(totalComisionStripe)}` : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-emerald-300">
                          {fmt(totalLiquidoNeto)}
                        </td>
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
  emerald: 'bg-emerald-500/10 text-emerald-300',
  amber: 'bg-amber-500/10 text-amber-300',
  blue: 'bg-blue-500/10 text-blue-300',
  violet: 'bg-violet-500/10 text-violet-300',
  rose: 'bg-rose-500/10 text-rose-300',
}

function StatCard({
  label,
  value,
  icon,
  color,
  sub,
}: {
  label: string
  value: string
  icon: React.ReactNode
  color: string
  sub?: string
}) {
  return (
    <div className="rounded-3xl border border-sidebar-border bg-sidebar-bg p-5 shadow-[0_10px_40px_rgba(0,0,0,0.15)]">
      <div
        className={`mb-3 w-fit rounded-xl p-2 ${
          COLOR_MAP[color] ?? 'bg-slate-500/10 text-slate-400'
        }`}
      >
        {icon}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

const darkInputCls =
  'rounded-xl border border-sidebar-border bg-admin-card px-3 py-3 text-sm text-slate-100 focus:outline-none focus:border-brand-400'
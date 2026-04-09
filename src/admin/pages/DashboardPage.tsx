import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Users,
  Calendar,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Home,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  LogIn,
  LogOut,
  MessageSquare,
  Euro,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import {
  format,
  parseISO,
  formatDistanceToNow,
  addMonths,
  isSameMonth,
  startOfMonth,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { dashboardService } from '../../services/dashboard.service'

type DashboardStats = {
  monthlyReservations?: number
  cancellations?: number
  monthlyRevenue?: number
  yearlyRevenue?: number
  ocupacionMes?: number
  pendingPayments?: number
  consultasNuevas?: number
  upcomingCheckins?: any[]
  actividadReciente?: any[]
  checkinHoy?: any[]
  checkoutHoy?: any[]
  enCasaAhora?: any[]
}

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()))

  const isCurrentMonth = useMemo(
    () => isSameMonth(selectedMonth, new Date()),
    [selectedMonth]
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await dashboardService.getStats({
        year: selectedMonth.getFullYear(),
        month: selectedMonth.getMonth() + 1,
      })
      setStats(data)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => {
    load()
  }, [load])

  const goPrevMonth = () => setSelectedMonth(prev => addMonths(prev, -1))
  const goNextMonth = () => setSelectedMonth(prev => addMonths(prev, 1))
  const goCurrentMonth = () => setSelectedMonth(startOfMonth(new Date()))

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center rounded-3xl border border-slate-800/80 bg-[#08111f] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="rounded-3xl border border-slate-800/80 bg-[#08111f] p-8 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-3 text-amber-400" size={34} />
          <h2 className="text-lg font-bold text-slate-50">No se pudo cargar el dashboard</h2>
          <p className="mt-2 text-sm text-slate-400">
            Revisa el servicio de estadísticas o vuelve a intentarlo.
          </p>
          <button
            onClick={load}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-[#0b1728] px-4 py-2.5 text-sm font-semibold text-slate-100 transition-all hover:border-slate-500 hover:bg-[#102039]"
          >
            <RefreshCw size={15} />
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const hayEventosHoy =
    (stats.checkinHoy?.length ?? 0) > 0 ||
    (stats.checkoutHoy?.length ?? 0) > 0 ||
    (stats.enCasaAhora?.length ?? 0) > 0

  const monthLabel = format(selectedMonth, 'MMMM yyyy', { locale: es })
  const todayLabel = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-8 text-slate-100">
      {/* Header */}
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-800/80 bg-[#08111f] px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-50">Dashboard</h1>
            <p className="mt-1.5 text-sm capitalize text-slate-300">{todayLabel}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={goPrevMonth}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-[#08111f] text-slate-100 transition-all hover:border-slate-500 hover:bg-[#0b1728]"
              title="Mes anterior"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="min-w-[180px] rounded-2xl border border-slate-700 bg-[#0b1728] px-4 py-2.5 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Mes analizado
              </p>
              <p className="mt-0.5 text-sm font-bold capitalize text-slate-50">{monthLabel}</p>
            </div>

            <button
              onClick={goNextMonth}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-[#08111f] text-slate-100 transition-all hover:border-slate-500 hover:bg-[#0b1728]"
              title="Mes siguiente"
            >
              <ChevronRight size={18} />
            </button>

            <button
              onClick={goCurrentMonth}
              disabled={isCurrentMonth}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-[#08111f] px-4 py-2.5 text-sm font-semibold text-slate-100 transition-all hover:border-slate-500 hover:bg-[#0b1728] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Calendar size={15} />
              Este mes
            </button>

            <button
              onClick={load}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-[#08111f] px-4 py-2.5 text-sm font-semibold text-slate-100 transition-all hover:border-slate-500 hover:bg-[#0b1728]"
            >
              <RefreshCw size={15} />
              Actualizar
            </button>
          </div>
        </div>
      </header>

      {/* Alertas de hoy */}
      {hayEventosHoy && (
        <div className="grid gap-4 sm:grid-cols-3">
          {(stats.enCasaAhora?.length ?? 0) > 0 && (
            <div className="rounded-3xl border border-emerald-500/20 bg-[#08111f] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-xl bg-emerald-500/10 p-2.5">
                  <Home size={16} className="text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    En casa ahora
                  </p>
                  {stats.enCasaAhora?.map((r: any) => (
                    <p key={r.id} className="truncate text-sm font-medium text-slate-100">
                      {safeGuestName(r)} · {safeNumber(r.guests)} pax
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(stats.checkinHoy?.length ?? 0) > 0 && (
            <div className="rounded-3xl border border-sky-500/20 bg-[#08111f] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-xl bg-sky-500/10 p-2.5">
                  <LogIn size={16} className="text-sky-300" />
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">
                    Check-in hoy
                  </p>
                  {stats.checkinHoy?.map((r: any) => (
                    <p key={r.id} className="truncate text-sm font-medium text-slate-100">
                      {safeGuestName(r)} · {safeNumber(r.guests)} pax
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(stats.checkoutHoy?.length ?? 0) > 0 && (
            <div className="rounded-3xl border border-amber-500/20 bg-[#08111f] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-xl bg-amber-500/10 p-2.5">
                  <LogOut size={16} className="text-amber-300" />
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                    Check-out hoy
                  </p>
                  {stats.checkoutHoy?.map((r: any) => (
                    <p key={r.id} className="truncate text-sm font-medium text-slate-100">
                      {safeGuestName(r)} · {safeNumber(r.guests)} pax
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={`Reservas ${format(selectedMonth, 'MMMM', { locale: es })}`}
          value={safeNumber(stats.monthlyReservations)}
          sub={`${safeNumber(stats.cancellations)} cancelada${safeNumber(stats.cancellations) !== 1 ? 's' : ''}`}
          icon={<Calendar className="text-sky-300" size={18} />}
          accent="blue"
        />
        <StatCard
          label={`Ingresos ${format(selectedMonth, 'MMMM', { locale: es })}`}
          value={formatEuros(stats.monthlyRevenue)}
          sub={`${formatEuros(stats.yearlyRevenue)} este año`}
          icon={<TrendingUp className="text-emerald-300" size={18} />}
          accent="emerald"
        />
        <StatCard
          label={`Ocupación ${format(selectedMonth, 'MMMM', { locale: es })}`}
          value={`${safeNumber(stats.ocupacionMes)}%`}
          sub={
            safeNumber(stats.ocupacionMes) >= 80
              ? 'Alta demanda'
              : safeNumber(stats.ocupacionMes) >= 50
                ? 'Buena ocupación'
                : 'Disponible'
          }
          icon={<Euro className="text-violet-300" size={18} />}
          accent="violet"
        />
        <StatCard
          label="Requieren atención"
          value={safeNumber(stats.pendingPayments) + safeNumber(stats.consultasNuevas)}
          sub={`${safeNumber(stats.pendingPayments)} pagos · ${safeNumber(stats.consultasNuevas)} consultas`}
          icon={<AlertCircle className="text-amber-300" size={18} />}
          accent="amber"
          urgent={safeNumber(stats.pendingPayments) + safeNumber(stats.consultasNuevas) > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Próximas llegadas */}
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-50">
                Próximas llegadas
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-300">
                Próximos 14 días
              </p>
            </div>

            <Link
              to="/admin/reservas"
              className="inline-flex items-center gap-1 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-sm font-semibold text-sky-300 transition-all hover:border-sky-400/30 hover:bg-sky-500/15 hover:text-sky-200"
            >
              Ver todas <ArrowRight size={13} />
            </Link>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-700 bg-[#08111f] shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
            {(stats.upcomingCheckins?.length ?? 0) > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-700 bg-[#0b1728]">
                  <tr>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Cliente
                    </th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Check-in
                    </th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Pax
                    </th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {stats.upcomingCheckins?.map((res: any) => (
                    <ArrivalRow key={res.id} res={res} />
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-14 text-center">
                <Calendar className="mx-auto mb-3 text-slate-600" size={32} />
                <p className="text-sm text-slate-300">Sin llegadas en los próximos 14 días</p>
              </div>
            )}
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-50">
                Actividad reciente
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-300">
                Últimas reservas
              </p>
            </div>

            {safeNumber(stats.consultasNuevas) > 0 && (
              <Link
                to="/admin/clientes"
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-300 transition-colors hover:bg-amber-500/15"
              >
                <MessageSquare size={9} />
                {safeNumber(stats.consultasNuevas)} nueva{safeNumber(stats.consultasNuevas) !== 1 ? 's' : ''}
              </Link>
            )}
          </div>

          <div className="divide-y divide-slate-800 rounded-3xl border border-slate-700 bg-[#08111f] shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
            {(stats.actividadReciente?.length ?? 0) > 0 ? (
              stats.actividadReciente?.map((r: any) => <RecentItem key={r.id} r={r} />)
            ) : (
              <div className="py-12 text-center">
                <Clock className="mx-auto mb-3 text-slate-600" size={28} />
                <p className="text-sm text-slate-300">Sin actividad reciente</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helpers
function safeNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function formatEuros(value: unknown): string {
  return `${safeNumber(value).toLocaleString('es-ES')} €`
}

function safeGuestName(r: any): string {
  return (
    r?.guestName ||
    r?.nombre_cliente ||
    r?.nombre ||
    r?.email_cliente?.split?.('@')?.[0] ||
    'Cliente sin nombre'
  )
}

// Stat Card
const ACCENT_BG: Record<string, string> = {
  blue: 'bg-sky-500/10',
  emerald: 'bg-emerald-500/10',
  violet: 'bg-violet-500/10',
  amber: 'bg-amber-500/10',
}

const ACCENT_BORDER: Record<string, string> = {
  blue: 'border-l-sky-400',
  emerald: 'border-l-emerald-400',
  violet: 'border-l-violet-400',
  amber: 'border-l-amber-400',
}

const StatCard = ({
  label,
  value,
  sub,
  icon,
  accent,
  urgent,
}: {
  label: string
  value: string | number
  sub: string
  icon: React.ReactNode
  accent: string
  urgent?: boolean
}) => (
  <motion.div
    whileHover={{ y: -2 }}
    className={`rounded-3xl border border-slate-700 border-l-4 bg-[#08111f] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] transition-all ${
      urgent ? 'border-l-amber-400' : (ACCENT_BORDER[accent] ?? 'border-l-slate-500')
    }`}
  >
    <div className="mb-3 flex items-start justify-between">
      <div className={`rounded-2xl p-2.5 ${ACCENT_BG[accent] ?? 'bg-slate-500/10'}`}>{icon}</div>
      {urgent && <span className="mt-1 h-2 w-2 animate-pulse rounded-full bg-amber-400" />}
    </div>

    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
      {label}
    </p>
    <p className="mt-1 text-3xl font-bold leading-none text-slate-50">{value}</p>
    <p className="mt-2 text-xs text-slate-400">{sub}</p>
  </motion.div>
)

// Fila próxima llegada
const ORIGEN_SHORT: Record<string, string> = {
  DIRECT_WEB: 'Web',
  BOOKING_ICAL: 'BK',
  AIRBNB_ICAL: 'AB',
  ESCAPADARURAL_ICAL: 'ER',
  ADMIN: 'ADM',
}

const ArrivalRow = ({ res }: { res: any }) => {
  const entrada = parseISO(res.checkIn)
  const diasRestantes = Math.ceil((entrada.getTime() - Date.now()) / 86_400_000)

  return (
    <tr className="transition-colors hover:bg-[#0b1728]">
      <td className="px-5 py-3.5">
        <p className="text-sm font-semibold text-slate-50">{safeGuestName(res)}</p>
        {res.origen && (
          <span className="text-[10px] font-medium text-slate-400">
            {ORIGEN_SHORT[res.origen] ?? res.origen}
          </span>
        )}
      </td>

      <td className="px-5 py-3.5">
        <p className="text-sm font-medium text-slate-200">
          {format(entrada, 'd MMM', { locale: es })}
        </p>
        <p className="text-[10px] text-slate-400">
          {diasRestantes === 0 ? '¡Hoy!' : diasRestantes === 1 ? 'Mañana' : `En ${diasRestantes} días`}
        </p>
      </td>

      <td className="px-5 py-3.5 text-sm text-slate-300">
        <div className="flex items-center gap-1">
          <Users size={12} className="text-slate-500" />
          {safeNumber(res.guests)}
        </div>
      </td>

      <td className="px-5 py-3.5">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            res.status === 'CONFIRMED'
              ? 'bg-emerald-500/10 text-emerald-300'
              : 'bg-amber-500/10 text-amber-300'
          }`}
        >
          {res.status === 'CONFIRMED' ? 'Confirmada' : 'Pdte. pago'}
        </span>
      </td>
    </tr>
  )
}

// Ítem actividad reciente
const ESTADO_ICON: Record<string, React.ReactNode> = {
  CONFIRMED: <CheckCircle2 size={14} className="text-emerald-400" />,
  PENDING_PAYMENT: <AlertCircle size={14} className="text-amber-400" />,
  CANCELLED: <AlertCircle size={14} className="text-red-400" />,
  EXPIRED: <Clock size={14} className="text-slate-500" />,
}

const ESTADO_LABEL: Record<string, string> = {
  CONFIRMED: 'Confirmada',
  PENDING_PAYMENT: 'Pdte. pago',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
}

const RecentItem = ({ r }: { r: any }) => (
  <div className="flex items-start gap-3 px-5 py-4">
    <div className="mt-0.5 shrink-0">
      {ESTADO_ICON[r.estado] ?? <Clock size={14} className="text-slate-500" />}
    </div>

    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-semibold text-slate-50">{safeGuestName(r)}</p>
        <span className="shrink-0 text-xs font-bold text-slate-100">
          {formatEuros(r.total)}
        </span>
      </div>

      <p className="text-xs text-slate-400">
        {ESTADO_LABEL[r.estado] ?? r.estado} ·{' '}
        {format(parseISO(r.checkIn), 'd MMM', { locale: es })} →{' '}
        {format(parseISO(r.checkOut), 'd MMM', { locale: es })}
      </p>

      <p className="mt-0.5 text-[10px] text-slate-500">
        {formatDistanceToNow(parseISO(r.createdAt), { addSuffix: true, locale: es })}
      </p>
    </div>
  </div>
)
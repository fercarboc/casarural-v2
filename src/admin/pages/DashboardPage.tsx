import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { dashboardService } from '../../services/dashboard.service'

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const data = await dashboardService.getStats()
      setStats(data)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center rounded-3xl border border-slate-800/80 bg-[#08111f] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
      </div>
    )
  }

  if (!stats) return null

  const hayEventosHoy =
    (stats.checkinHoy?.length > 0) ||
    (stats.checkoutHoy?.length > 0) ||
    (stats.enCasaAhora?.length > 0)

  return (
    <div className="space-y-8 text-slate-100">
      {/* Header */}
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-800/80 bg-[#08111f] px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-50">Dashboard</h1>
          <p className="mt-1.5 text-sm capitalize text-slate-300">
            {new Date().toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        <button
          onClick={load}
          className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-[#08111f] px-4 py-2.5 text-sm font-semibold text-slate-100 transition-all hover:border-slate-500 hover:bg-[#0b1728]"
        >
          <RefreshCw size={15} />
          Actualizar
        </button>
      </header>

      {/* ── Alertas de hoy ─────────────────────────────────────────────────── */}
      {hayEventosHoy && (
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.enCasaAhora?.length > 0 && (
            <div className="rounded-3xl border border-emerald-500/20 bg-[#08111f] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-xl bg-emerald-500/10 p-2.5">
                  <Home size={16} className="text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    En casa ahora
                  </p>
                  {stats.enCasaAhora.map((r: any) => (
                    <p key={r.id} className="truncate text-sm font-medium text-slate-100">
                      {r.guestName} · {r.guests} pax
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {stats.checkinHoy?.length > 0 && (
            <div className="rounded-3xl border border-sky-500/20 bg-[#08111f] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-xl bg-sky-500/10 p-2.5">
                  <LogIn size={16} className="text-sky-300" />
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">
                    Check-in hoy
                  </p>
                  {stats.checkinHoy.map((r: any) => (
                    <p key={r.id} className="truncate text-sm font-medium text-slate-100">
                      {r.guestName} · {r.guests} pax
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {stats.checkoutHoy?.length > 0 && (
            <div className="rounded-3xl border border-amber-500/20 bg-[#08111f] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-xl bg-amber-500/10 p-2.5">
                  <LogOut size={16} className="text-amber-300" />
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                    Check-out hoy
                  </p>
                  {stats.checkoutHoy.map((r: any) => (
                    <p key={r.id} className="truncate text-sm font-medium text-slate-100">
                      {r.guestName} · {r.guests} pax
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Stats grid ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Reservas este mes"
          value={stats.monthlyReservations ?? 0}
          sub={`${stats.cancellations ?? 0} cancelada${stats.cancellations !== 1 ? 's' : ''}`}
          icon={<Calendar className="text-sky-300" size={18} />}
          accent="blue"
        />
        <StatCard
          label="Ingresos del mes"
          value={`${(stats.monthlyRevenue ?? 0).toLocaleString('es-ES')} €`}
          sub={`${(stats.yearlyRevenue ?? 0).toLocaleString('es-ES')} € este año`}
          icon={<TrendingUp className="text-emerald-300" size={18} />}
          accent="emerald"
        />
        <StatCard
          label="Ocupación del mes"
          value={`${stats.ocupacionMes ?? 0}%`}
          sub={
            stats.ocupacionMes >= 80
              ? 'Alta demanda'
              : stats.ocupacionMes >= 50
                ? 'Buena ocupación'
                : 'Disponible'
          }
          icon={<Euro className="text-violet-300" size={18} />}
          accent="violet"
        />
        <StatCard
          label="Requieren atención"
          value={(stats.pendingPayments ?? 0) + (stats.consultasNuevas ?? 0)}
          sub={`${stats.pendingPayments ?? 0} pagos · ${stats.consultasNuevas ?? 0} consultas`}
          icon={<AlertCircle className="text-amber-300" size={18} />}
          accent="amber"
          urgent={(stats.pendingPayments ?? 0) + (stats.consultasNuevas ?? 0) > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Próximas llegadas ───────────────────────────────────────────── */}
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
            {stats.upcomingCheckins?.length > 0 ? (
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
                  {stats.upcomingCheckins.map((res: any) => (
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

        {/* ── Actividad reciente ──────────────────────────────────────────── */}
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

            {stats.consultasNuevas > 0 && (
              <Link
                to="/admin/clientes"
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-300 transition-colors hover:bg-amber-500/15"
              >
                <MessageSquare size={9} />
                {stats.consultasNuevas} nueva{stats.consultasNuevas !== 1 ? 's' : ''}
              </Link>
            )}
          </div>

          <div className="divide-y divide-slate-800 rounded-3xl border border-slate-700 bg-[#08111f] shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
            {stats.actividadReciente?.length > 0 ? (
              stats.actividadReciente.map((r: any) => <RecentItem key={r.id} r={r} />)
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

// ─── Stat Card ─────────────────────────────────────────────────────────────────
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

// ─── Fila próxima llegada ──────────────────────────────────────────────────────
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
        <p className="text-sm font-semibold text-slate-50">{res.guestName}</p>
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
          {res.guests}
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

// ─── Ítem actividad reciente ───────────────────────────────────────────────────
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
        <p className="truncate text-sm font-semibold text-slate-50">{r.guestName}</p>
        <span className="shrink-0 text-xs font-bold text-slate-100">
          {Number(r.total).toLocaleString('es-ES')} €
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
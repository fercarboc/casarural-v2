import React, { useState, useEffect } from 'react';
import {
  Users, Calendar, TrendingUp, AlertCircle, ArrowRight,
  Home, CheckCircle2, Clock, Loader2, RefreshCw,
  LogIn, LogOut, MessageSquare, Euro
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { dashboardService } from '../../services/dashboard.service';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!stats) return null;

  const hayEventosHoy = (stats.checkinHoy?.length > 0) || (stats.checkoutHoy?.length > 0) || (stats.enCasaAhora?.length > 0);

  return (
    <div className="space-y-8">

      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Dashboard</h1>
          <p className="text-zinc-500 capitalize">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-500 hover:bg-zinc-50 transition-all"
        >
          <RefreshCw size={15} /> Actualizar
        </button>
      </header>

      {/* ── Alertas de hoy ─────────────────────────────────────────────────── */}
      {hayEventosHoy && (
        <div className="grid gap-3 sm:grid-cols-3">
          {/* En casa ahora */}
          {stats.enCasaAhora?.length > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="p-2 rounded-xl bg-emerald-100 shrink-0">
                <Home size={16} className="text-emerald-700" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">En casa ahora</p>
                {stats.enCasaAhora.map((r: any) => (
                  <p key={r.id} className="text-sm font-medium text-emerald-900 truncate">
                    {r.guestName} · {r.guests} pax
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Check-in hoy */}
          {stats.checkinHoy?.length > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="p-2 rounded-xl bg-blue-100 shrink-0">
                <LogIn size={16} className="text-blue-700" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Check-in hoy</p>
                {stats.checkinHoy.map((r: any) => (
                  <p key={r.id} className="text-sm font-medium text-blue-900 truncate">
                    {r.guestName} · {r.guests} pax
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Check-out hoy */}
          {stats.checkoutHoy?.length > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="p-2 rounded-xl bg-amber-100 shrink-0">
                <LogOut size={16} className="text-amber-700" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Check-out hoy</p>
                {stats.checkoutHoy.map((r: any) => (
                  <p key={r.id} className="text-sm font-medium text-amber-900 truncate">
                    {r.guestName} · {r.guests} pax
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Stats grid ─────────────────────────────────────────────────────── */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Reservas este mes"
          value={stats.monthlyReservations ?? 0}
          sub={`${stats.cancellations ?? 0} cancelada${stats.cancellations !== 1 ? 's' : ''}`}
          icon={<Calendar className="text-blue-600" size={20} />}
          color="blue"
        />
        <StatCard
          label="Ingresos del mes"
          value={`${(stats.monthlyRevenue ?? 0).toLocaleString('es-ES')} €`}
          sub={`${(stats.yearlyRevenue ?? 0).toLocaleString('es-ES')} € este año`}
          icon={<TrendingUp className="text-emerald-600" size={20} />}
          color="emerald"
        />
        <StatCard
          label="Ocupación del mes"
          value={`${stats.ocupacionMes ?? 0} %`}
          sub={stats.ocupacionMes >= 80 ? '🔥 Alta demanda' : stats.ocupacionMes >= 50 ? 'Buena ocupación' : 'Disponible'}
          icon={<Euro className="text-violet-600" size={20} />}
          color="violet"
        />
        <StatCard
          label="Requieren atención"
          value={(stats.pendingPayments ?? 0) + (stats.consultasNuevas ?? 0)}
          sub={`${stats.pendingPayments ?? 0} pagos · ${stats.consultasNuevas ?? 0} consultas`}
          icon={<AlertCircle className="text-amber-600" size={20} />}
          color="amber"
          urgent={(stats.pendingPayments ?? 0) + (stats.consultasNuevas ?? 0) > 0}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">

        {/* ── Próximas llegadas ───────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-900">Próximas llegadas <span className="text-sm font-normal text-zinc-400">(14 días)</span></h3>
            <Link to="/admin/reservas" className="text-xs font-bold text-zinc-400 hover:text-zinc-900 flex items-center gap-1 transition-colors">
              Ver todas <ArrowRight size={13} />
            </Link>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
            {stats.upcomingCheckins?.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-5 py-3.5 font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Cliente</th>
                    <th className="px-5 py-3.5 font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Check-in</th>
                    <th className="px-5 py-3.5 font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Pax</th>
                    <th className="px-5 py-3.5 font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {stats.upcomingCheckins.map((res: any) => (
                    <ArrivalRow key={res.id} res={res} />
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-16 text-center">
                <Calendar className="mx-auto text-zinc-200 mb-3" size={36} />
                <p className="text-sm text-zinc-400">No hay llegadas en los próximos 14 días</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Actividad reciente ──────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-900">Actividad reciente</h3>
            {stats.consultasNuevas > 0 && (
              <Link to="/admin/clientes" className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-200 transition-colors">
                <MessageSquare size={10} /> {stats.consultasNuevas} nueva{stats.consultasNuevas !== 1 ? 's' : ''}
              </Link>
            )}
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm divide-y divide-zinc-100">
            {stats.actividadReciente?.length > 0 ? (
              stats.actividadReciente.map((r: any) => (
                <RecentItem key={r.id} r={r} />
              ))
            ) : (
              <div className="py-12 text-center">
                <Clock className="mx-auto text-zinc-200 mb-3" size={32} />
                <p className="text-sm text-zinc-400">Sin actividad reciente</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon, color, urgent }: {
  label: string; value: string | number; sub: string;
  icon: React.ReactNode; color: string; urgent?: boolean;
}) => (
  <motion.div
    whileHover={{ y: -3 }}
    className={`rounded-2xl border bg-white p-6 shadow-sm ${urgent ? 'border-amber-200' : 'border-zinc-200'}`}
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`p-2 rounded-xl bg-${color}-50`}>{icon}</div>
      {urgent && <span className="h-2 w-2 rounded-full bg-amber-500 mt-1" />}
    </div>
    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">{label}</p>
    <p className="mt-1 text-3xl font-bold text-zinc-900">{value}</p>
    <p className="mt-1 text-xs text-zinc-400">{sub}</p>
  </motion.div>
);

// ─── Fila próxima llegada ──────────────────────────────────────────────────────
const ORIGEN_SHORT: Record<string, string> = {
  DIRECT_WEB: 'Web', BOOKING_ICAL: 'BK', AIRBNB_ICAL: 'AB',
  ESCAPADARURAL_ICAL: 'ER', ADMIN: 'ADM',
};

const ArrivalRow = ({ res }: { res: any }) => {
  const entrada = parseISO(res.checkIn);
  const diasRestantes = Math.ceil((entrada.getTime() - Date.now()) / 86_400_000);

  return (
    <tr className="hover:bg-zinc-50 transition-colors">
      <td className="px-5 py-3.5">
        <p className="font-semibold text-zinc-900 text-sm">{res.guestName}</p>
        {res.origen && (
          <span className="text-[10px] font-bold text-zinc-400">{ORIGEN_SHORT[res.origen] ?? res.origen}</span>
        )}
      </td>
      <td className="px-5 py-3.5">
        <p className="text-sm text-zinc-700 font-medium">
          {format(entrada, 'd MMM', { locale: es })}
        </p>
        <p className="text-[10px] text-zinc-400">
          {diasRestantes === 0 ? '¡Hoy!' : diasRestantes === 1 ? 'Mañana' : `En ${diasRestantes} días`}
        </p>
      </td>
      <td className="px-5 py-3.5 text-sm text-zinc-500 font-medium">
        <div className="flex items-center gap-1">
          <Users size={12} className="text-zinc-300" />
          {res.guests}
        </div>
      </td>
      <td className="px-5 py-3.5">
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
          res.status === 'CONFIRMED'
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-amber-50 text-amber-700'
        }`}>
          {res.status === 'CONFIRMED' ? 'Confirmada' : 'Pdte. pago'}
        </span>
      </td>
    </tr>
  );
};

// ─── Ítem actividad reciente ───────────────────────────────────────────────────
const ESTADO_ICON: Record<string, React.ReactNode> = {
  CONFIRMED:       <CheckCircle2 size={15} className="text-emerald-500" />,
  PENDING_PAYMENT: <AlertCircle  size={15} className="text-amber-500" />,
  CANCELLED:       <AlertCircle  size={15} className="text-red-400" />,
  EXPIRED:         <Clock        size={15} className="text-zinc-400" />,
};
const ESTADO_LABEL: Record<string, string> = {
  CONFIRMED: 'Confirmada', PENDING_PAYMENT: 'Pdte. pago',
  CANCELLED: 'Cancelada', EXPIRED: 'Expirada',
};

const RecentItem = ({ r }: { r: any }) => (
  <div className="flex items-start gap-3 px-5 py-4">
    <div className="mt-0.5 shrink-0">{ESTADO_ICON[r.estado] ?? <Clock size={15} className="text-zinc-400" />}</div>
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-900 truncate">{r.guestName}</p>
        <span className="text-xs font-bold text-zinc-900 shrink-0">{Number(r.total).toLocaleString('es-ES')} €</span>
      </div>
      <p className="text-xs text-zinc-400">
        {ESTADO_LABEL[r.estado] ?? r.estado} ·{' '}
        {format(parseISO(r.checkIn), 'd MMM', { locale: es })} → {format(parseISO(r.checkOut), 'd MMM', { locale: es })}
      </p>
      <p className="text-[10px] text-zinc-300 mt-0.5">
        {formatDistanceToNow(parseISO(r.createdAt), { addSuffix: true, locale: es })}
      </p>
    </div>
  </div>
);

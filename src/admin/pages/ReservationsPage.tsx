import React, { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Eye,
  Send,
  Copy,
  Check,
  X,
  Calendar,
  Users,
  Home,
  Clock,
  ChevronDown,
  Filter,
  RefreshCw,
  Loader2,
  Edit2,
  Ban,
  AlertTriangle,
  Save,
  Plus,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../integrations/supabase/client'
import { format, parseISO, isAfter, isBefore, startOfDay, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ReservaAdmin {
  id: string
  nombre_cliente: string
  apellidos_cliente: string
  email_cliente: string
  telefono_cliente: string | null
  fecha_entrada: string
  fecha_salida: string
  num_huespedes: number
  noches: number
  tarifa: 'FLEXIBLE' | 'NO_REEMBOLSABLE'
  estado: string
  estado_pago: string
  origen: string
  importe_total: number
  importe_senal: number | null
  token_cliente: string | null
  notas_admin: string | null
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const today = startOfDay(new Date())

function getTabForReserva(r: ReservaAdmin): 'en_casa' | 'proximas' | 'historial' {
  const entrada = parseISO(r.fecha_entrada)
  const salida = parseISO(r.fecha_salida)
  if (!isBefore(salida, today) && !isAfter(entrada, today)) return 'en_casa'
  if (isAfter(entrada, today)) return 'proximas'
  return 'historial'
}

function formatFecha(d: string) {
  return format(parseISO(d), 'd MMM', { locale: es })
}

const ESTADO_LABEL: Record<string, string> = {
  CONFIRMED: 'Confirmada',
  PENDING_PAYMENT: 'Pdte. pago',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
  NO_SHOW: 'No presentado',
}

const ESTADO_STYLE: Record<string, string> = {
  CONFIRMED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  PENDING_PAYMENT: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  CANCELLED: 'bg-red-500/10 text-red-300 border-red-500/20',
  EXPIRED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  NO_SHOW: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

const PAGO_LABEL: Record<string, string> = {
  UNPAID: 'Sin pagar',
  PARTIAL: 'Señal',
  PAID: 'Pagado',
  REFUNDED: 'Devuelto',
}

const PAGO_STYLE: Record<string, string> = {
  UNPAID: 'bg-slate-500/10 text-slate-400',
  PARTIAL: 'bg-sky-500/10 text-sky-300',
  PAID: 'bg-emerald-500/10 text-emerald-300',
  REFUNDED: 'bg-violet-500/10 text-violet-300',
}

const ORIGEN_LABEL: Record<string, string> = {
  DIRECT_WEB: 'Web directa',
  BOOKING_ICAL: 'Booking',
  AIRBNB_ICAL: 'Airbnb',
  ESCAPADARURAL_ICAL: 'Escapada Rural',
  ADMIN: 'Admin',
}

// ─── Componente principal ─────────────────────────────────────────────────────
export const ReservationsPage: React.FC = () => {
  const navigate = useNavigate()
  const [all, setAll] = useState<ReservaAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'proximas' | 'en_casa' | 'historial' | 'canceladas' | 'todas'>('proximas')
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('ALL')
  const [filterOrigen, setFilterOrigen] = useState('ALL')
  const [checkinModal, setCheckinModal] = useState<ReservaAdmin | null>(null)
  const [editModal, setEditModal] = useState<ReservaAdmin | null>(null)
  const [cancelModal, setCancelModal] = useState<ReservaAdmin | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('reservas')
      .select(
        'id,nombre_cliente,apellidos_cliente,email_cliente,telefono_cliente,fecha_entrada,fecha_salida,num_huespedes,noches,tarifa,estado,estado_pago,origen,importe_total,importe_senal,token_cliente,notas_admin,created_at'
      )
      .order('fecha_entrada', { ascending: false })

    if (!error) setAll(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const isInactiva = (r: ReservaAdmin) => r.estado === 'CANCELLED' || r.estado === 'EXPIRED'

  const visible = all.filter((r) => {
    if (tab === 'canceladas') {
      if (!isInactiva(r)) return false
    } else if (tab === 'todas') {
      // all
    } else {
      if (getTabForReserva(r) !== tab) return false
      if (isInactiva(r)) return false
    }
    if (filterEstado !== 'ALL' && r.estado !== filterEstado) return false
    if (filterOrigen !== 'ALL' && r.origen !== filterOrigen) return false
    const q = search.toLowerCase()
    if (q && !`${r.nombre_cliente} ${r.apellidos_cliente} ${r.email_cliente}`.toLowerCase().includes(q)) return false
    return true
  })

  const proximas = all.filter((r) => getTabForReserva(r) === 'proximas' && !isInactiva(r))
  const enCasa = all.filter((r) => getTabForReserva(r) === 'en_casa' && r.estado === 'CONFIRMED')
  const historial = all.filter((r) => getTabForReserva(r) === 'historial' && !isInactiva(r))
  const canceladas = all.filter((r) => isInactiva(r))

  const handleUpdated = (updated: ReservaAdmin) => {
    setAll((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
  }

  const handleCancelled = (id: string) => {
    setAll((prev) =>
      prev.map((r) => (r.id === id ? { ...r, estado: 'CANCELLED', estado_pago: 'UNPAID' } : r))
    )
  }

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header */}
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-800/80 bg-[#08111f] px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-50">Reservas</h1>
          <p className="mt-1.5 text-sm text-slate-300">Gestión completa de reservas</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-[#08111f] px-4 py-2.5 text-sm font-semibold text-slate-100 transition-all hover:border-slate-500 hover:bg-[#0b1728]"
          >
            <RefreshCw size={15} />
            Actualizar
          </button>

          <button
            onClick={() => navigate('/admin/reservas/nueva')}
            className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-[#07111f] shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400"
          >
            <Plus size={15} />
            Nueva reserva
          </button>
        </div>
      </header>

      {/* Stats rápidas */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          icon={<Home size={16} className="text-emerald-300" />}
          label="En casa ahora"
          value={enCasa.length.toString()}
          color="emerald"
        />
        <StatCard
          icon={<Calendar size={16} className="text-sky-300" />}
          label="Próximas llegadas"
          value={proximas.length.toString()}
          color="blue"
        />
        <StatCard
          icon={<Clock size={16} className="text-slate-300" />}
          label="Total histórico"
          value={all.length.toString()}
          color="slate"
        />
      </div>

      {/* Pestañas */}
      <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-slate-700 bg-[#08111f] p-1 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
        {([
          { key: 'proximas', label: 'Próximas', count: proximas.length },
          { key: 'en_casa', label: 'En casa', count: enCasa.length },
          { key: 'historial', label: 'Historial', count: historial.length },
          { key: 'canceladas', label: 'Canceladas', count: canceladas.length },
          { key: 'todas', label: 'Todas', count: all.length },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all ${
              tab === t.key
                ? 'bg-[#0f1b2d] text-slate-50'
                : 'text-slate-400 hover:bg-[#0b1728] hover:text-slate-200'
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                tab === t.key
                  ? t.key === 'canceladas'
                    ? 'bg-red-500 text-white'
                    : 'bg-sky-500 text-[#07111f]'
                  : t.key === 'canceladas' && t.count > 0
                    ? 'bg-red-500/10 text-red-300'
                    : 'bg-slate-700 text-slate-300'
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Búsqueda y filtros */}
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-700 bg-[#08111f] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Nombre, email o código de reserva…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-600 bg-[#0f1b2d] py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-400 transition-all focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-slate-600 bg-[#0f1b2d] px-3 py-2.5">
          <Filter size={13} className="text-slate-400" />
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="bg-transparent text-sm font-medium text-slate-200 focus:outline-none"
          >
            <option value="ALL">Todos los estados</option>
            <option value="CONFIRMED">Confirmadas</option>
            <option value="PENDING_PAYMENT">Pdte. de pago</option>
            <option value="CANCELLED">Canceladas</option>
            <option value="EXPIRED">Expiradas</option>
          </select>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-slate-600 bg-[#0f1b2d] px-3 py-2.5">
          <ChevronDown size={13} className="text-slate-400" />
          <select
            value={filterOrigen}
            onChange={(e) => setFilterOrigen(e.target.value)}
            className="bg-transparent text-sm font-medium text-slate-200 focus:outline-none"
          >
            <option value="ALL">Todos los orígenes</option>
            <option value="DIRECT_WEB">Web directa</option>
            <option value="BOOKING_ICAL">Booking</option>
            <option value="AIRBNB_ICAL">Airbnb</option>
            <option value="ESCAPADARURAL_ICAL">Escapada Rural</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        {(search || filterEstado !== 'ALL' || filterOrigen !== 'ALL') && (
          <button
            onClick={() => {
              setSearch('')
              setFilterEstado('ALL')
              setFilterOrigen('ALL')
            }}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-[#0b1728] hover:text-slate-200"
          >
            <X size={13} />
            Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-3xl border border-slate-700 bg-[#08111f] shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="animate-spin text-slate-500" size={28} />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-24 text-center">
            <Calendar className="mx-auto mb-4 text-slate-600" size={40} />
            <p className="text-sm font-medium text-slate-400">
              {search || filterEstado !== 'ALL' || filterOrigen !== 'ALL'
                ? 'No hay reservas con esos criterios.'
                : tab === 'proximas'
                  ? 'No hay reservas próximas.'
                  : tab === 'en_casa'
                    ? 'Nadie en casa en este momento.'
                    : tab === 'historial'
                      ? 'Sin historial de reservas.'
                      : tab === 'canceladas'
                        ? 'No hay reservas canceladas ni expiradas.'
                        : 'No hay reservas.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-700 bg-[#0b1728]">
              <tr>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Código / Cliente
                </th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Fechas
                </th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Pax
                </th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Estado
                </th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Pago
                </th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Origen
                </th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Total
                </th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {visible.map((r) => (
                <ReservaRow
                  key={r.id}
                  r={r}
                  onSendCheckin={() => setCheckinModal(r)}
                  onEdit={() => setEditModal(r)}
                  onCancel={() => setCancelModal(r)}
                  onNameUpdated={(id, nombre) =>
                    setAll((prev) => prev.map((x) => (x.id === id ? { ...x, nombre_cliente: nombre } : x)))
                  }
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {checkinModal && (
        <CheckinLinkModal reserva={checkinModal} onClose={() => setCheckinModal(null)} />
      )}
      {editModal && (
        <EditReservaModal
          reserva={editModal}
          onClose={() => setEditModal(null)}
          onSaved={(r) => {
            handleUpdated(r)
            setEditModal(null)
          }}
        />
      )}
      {cancelModal && (
        <CancelReservaModal
          reserva={cancelModal}
          onClose={() => setCancelModal(null)}
          onCancelled={(id) => {
            handleCancelled(id)
            setCancelModal(null)
          }}
        />
      )}
    </div>
  )
}

// ─── Fila ──────────────────────────────────────────────────────────────────────
function ReservaRow({
  r,
  onSendCheckin,
  onEdit,
  onCancel,
  onNameUpdated,
}: {
  key?: React.Key
  r: ReservaAdmin
  onSendCheckin: () => void
  onEdit: () => void
  onCancel: () => void
  onNameUpdated: (id: string, nombre: string) => void
}) {
  const isEnCasa = getTabForReserva(r) === 'en_casa' && r.estado === 'CONFIRMED'
  const canCancel = r.estado !== 'CANCELLED' && r.estado !== 'EXPIRED'
  const isInactiva = r.estado === 'CANCELLED' || r.estado === 'EXPIRED'

  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(r.nombre_cliente)
  const [savingName, setSavingName] = useState(false)

  const saveName = async () => {
    const trimmed = nameVal.trim()
    if (!trimmed || trimmed === r.nombre_cliente) {
      setEditingName(false)
      setNameVal(r.nombre_cliente)
      return
    }

    setSavingName(true)
    const { error } = await supabase
      .from('reservas')
      .update({ nombre_cliente: trimmed, updated_at: new Date().toISOString() })
      .eq('id', r.id)

    setSavingName(false)

    if (!error) {
      onNameUpdated(r.id, trimmed)
      setEditingName(false)
    } else {
      setNameVal(r.nombre_cliente)
    }
  }

  return (
    <tr className={`transition-colors ${isInactiva ? 'bg-[#0b1728]/60 opacity-70' : 'hover:bg-[#0b1728]'}`}>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          {isEnCasa && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />}
          <div className="min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveName()
                    if (e.key === 'Escape') {
                      setEditingName(false)
                      setNameVal(r.nombre_cliente)
                    }
                  }}
                  onBlur={saveName}
                  className="w-40 rounded-xl border border-emerald-400 bg-[#0f1b2d] px-2 py-1 text-sm font-bold text-slate-100 outline-none focus:ring-1 focus:ring-emerald-400"
                />
                {savingName && <Loader2 size={12} className="shrink-0 animate-spin text-slate-400" />}
              </div>
            ) : (
              <div className="group flex items-center gap-1">
                <p className="truncate font-bold text-slate-50">
                  {r.nombre_cliente} {r.apellidos_cliente ?? ''}
                </p>
                <button
                  onClick={() => {
                    setNameVal(r.nombre_cliente)
                    setEditingName(true)
                  }}
                  className="text-slate-500 opacity-0 transition-opacity hover:text-sky-300 group-hover:opacity-100"
                  title="Editar nombre"
                >
                  <Edit2 size={11} />
                </button>
              </div>
            )}
            <p className="font-mono text-[10px] text-slate-400">{r.email_cliente}</p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <p className="font-medium text-slate-200">
          {formatFecha(r.fecha_entrada)} → {formatFecha(r.fecha_salida)}
        </p>
        <p className="text-[10px] text-slate-400">{r.noches} noches</p>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Users size={13} className="text-slate-500" />
          <span className="font-medium">{r.num_huespedes}</span>
        </div>
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
            ESTADO_STYLE[r.estado] ?? 'border-slate-500/20 bg-slate-500/10 text-slate-400'
          }`}
        >
          {ESTADO_LABEL[r.estado] ?? r.estado}
        </span>
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
            PAGO_STYLE[r.estado_pago] ?? 'bg-slate-500/10 text-slate-400'
          }`}
        >
          {PAGO_LABEL[r.estado_pago] ?? r.estado_pago}
        </span>
        {r.importe_senal && (
          <p className="mt-0.5 text-[10px] text-slate-400">
            Señal: {Number(r.importe_senal).toLocaleString('es-ES')} €
          </p>
        )}
      </td>

      <td className="px-5 py-4">
        <span className="text-xs font-semibold text-slate-400">
          {ORIGEN_LABEL[r.origen] ?? r.origen}
        </span>
      </td>

      <td className="px-5 py-4">
        <p className="font-bold text-slate-50">
          {Number(r.importe_total ?? 0).toLocaleString('es-ES')} €
        </p>
        <p className="text-[10px] text-slate-400">
          {r.tarifa === 'FLEXIBLE' ? 'Flexible' : 'No reembolsable'}
        </p>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-0.5">
          <Link
            to={`/admin/reservas/${r.id}`}
            className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-[#0f1b2d] hover:text-slate-200"
            title="Ver detalle"
          >
            <Eye size={16} />
          </Link>

          <button
            onClick={onEdit}
            className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-[#0f1b2d] hover:text-slate-200"
            title="Editar reserva"
          >
            <Edit2 size={16} />
          </button>

          {r.token_cliente && r.estado === 'CONFIRMED' && (
            <button
              onClick={onSendCheckin}
              className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-sky-500/10 hover:text-sky-300"
              title="Enviar enlace de check-in"
            >
              <Send size={16} />
            </button>
          )}

          {canCancel && (
            <button
              onClick={onCancel}
              className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-300"
              title="Cancelar reserva"
            >
              <Ban size={16} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Modal Editar ─────────────────────────────────────────────────────────────
function EditReservaModal({
  reserva,
  onClose,
  onSaved,
}: {
  reserva: ReservaAdmin
  onClose: () => void
  onSaved: (r: ReservaAdmin) => void
}) {
  const [form, setForm] = useState({
    fecha_entrada: reserva.fecha_entrada,
    fecha_salida: reserva.fecha_salida,
    num_huespedes: reserva.num_huespedes,
    email: reserva.email_cliente,
    telefono: reserva.telefono_cliente ?? '',
    total: reserva.importe_total,
    importe_senal: reserva.importe_senal ?? 0,
    notas_admin: reserva.notas_admin ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const noches = differenceInDays(parseISO(form.fecha_salida), parseISO(form.fecha_entrada))

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function save() {
    if (!form.fecha_entrada || !form.fecha_salida || noches <= 0) {
      setError('Las fechas no son válidas.')
      return
    }
    if (!form.email.trim()) {
      setError('El email es obligatorio.')
      return
    }

    setSaving(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('reservas')
      .update({
        fecha_entrada: form.fecha_entrada,
        fecha_salida: form.fecha_salida,
        noches,
        num_huespedes: form.num_huespedes,
        email_cliente: form.email.trim().toLowerCase(),
        telefono_cliente: form.telefono.trim() || null,
        importe_total: form.total,
        importe_senal: form.importe_senal > 0 ? form.importe_senal : null,
        notas_admin: form.notas_admin.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reserva.id)
      .select(
        'id,nombre_cliente,apellidos_cliente,email_cliente,telefono_cliente,fecha_entrada,fecha_salida,num_huespedes,noches,tarifa,estado,estado_pago,origen,importe_total,importe_senal,token_cliente,notas_admin,created_at'
      )
      .single()

    setSaving(false)

    if (err) {
      setError(err.message)
      return
    }

    onSaved(data as ReservaAdmin)
  }

  return (
    <Modal
      title="Editar reserva"
      subtitle={`${reserva.nombre_cliente} ${reserva.apellidos_cliente ?? ''}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha entrada">
            <input
              type="date"
              value={form.fecha_entrada}
              onChange={(e) => set('fecha_entrada', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Fecha salida">
            <input
              type="date"
              value={form.fecha_salida}
              onChange={(e) => set('fecha_salida', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        {noches > 0 && <p className="text-xs text-slate-400">{noches} noches</p>}
        {noches <= 0 && form.fecha_entrada && form.fecha_salida && (
          <p className="text-xs text-red-300">
            La fecha de salida debe ser posterior a la entrada.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Núm. huéspedes">
            <input
              type="number"
              min={1}
              max={11}
              value={form.num_huespedes}
              onChange={(e) => set('num_huespedes', parseInt(e.target.value) || 1)}
              className={inputCls}
            />
          </Field>
          <Field label="Total (€)">
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.total}
              onChange={(e) => set('total', parseFloat(e.target.value) || 0)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Señal cobrada (€)">
          <input
            type="number"
            min={0}
            step={0.01}
            value={form.importe_senal}
            onChange={(e) => set('importe_senal', parseFloat(e.target.value) || 0)}
            placeholder="0"
            className={inputCls}
          />
        </Field>

        {form.importe_senal > 0 && (
          <div className="space-y-1 rounded-2xl border border-slate-700 bg-[#0f1b2d] px-4 py-3 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Pendiente al check-in</span>
              <span className="font-bold text-amber-300">
                {Math.max(0, form.total - form.importe_senal).toLocaleString('es-ES', {
                  minimumFractionDigits: 2,
                })}{' '}
                €
              </span>
            </div>
          </div>
        )}

        <Field label="Email del cliente">
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Teléfono">
          <input
            type="tel"
            value={form.telefono}
            onChange={(e) => set('telefono', e.target.value)}
            placeholder="+34 600 000 000"
            className={inputCls}
          />
        </Field>

        <Field label="Notas internas (opcionales)">
          <textarea
            value={form.notas_admin}
            onChange={(e) => set('notas_admin', e.target.value)}
            rows={2}
            placeholder="Cambio de fechas solicitado por el cliente…"
            className={`${inputCls} resize-none`}
          />
        </Field>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-600 py-3 text-sm font-bold text-slate-300 transition-all hover:bg-[#0f1b2d]"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-500 py-3 text-sm font-bold text-[#07111f] transition-all hover:bg-sky-400 disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Modal Cancelar ───────────────────────────────────────────────────────────
const MOTIVOS_PRESET = [
  'Obras o reparaciones en la propiedad',
  'Avería grave en la casa',
  'Causa de fuerza mayor',
  'Solicitud del cliente',
  'Error en la reserva',
  'Otro motivo',
]

function CancelReservaModal({
  reserva,
  onClose,
  onCancelled,
}: {
  reserva: ReservaAdmin
  onClose: () => void
  onCancelled: (id: string) => void
}) {
  const [motivo, setMotivo] = useState('')
  const [devolver, setDevolver] = useState(false)
  const [importe, setImporte] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  async function cancel() {
    if (!motivo.trim()) {
      setError('Indica un motivo para la cancelación.')
      return
    }

    setSaving(true)
    setError(null)

    const nota = `CANCELACIÓN: ${motivo.trim()}${devolver ? ` | Devolución: ${importe} €` : ''}`

    const { error: err } = await supabase
      .from('reservas')
      .update({
        estado: 'CANCELLED',
        estado_pago: devolver && importe > 0 ? 'REFUNDED' : reserva.estado_pago,
        notas_admin: reserva.notas_admin ? `${reserva.notas_admin}\n${nota}` : nota,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reserva.id)

    setSaving(false)

    if (err) {
      setError(err.message)
      return
    }

    onCancelled(reserva.id)
  }

  return (
    <Modal
      title="Cancelar reserva"
      subtitle={`${reserva.nombre_cliente} ${reserva.apellidos_cliente ?? ''}`}
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="space-y-1.5 rounded-2xl border border-slate-700 bg-[#0f1b2d] p-4 text-sm">
          <Row
            label="Fechas"
            value={`${formatFecha(reserva.fecha_entrada)} → ${formatFecha(reserva.fecha_salida)} · ${reserva.noches} noches`}
          />
          <Row label="Huéspedes" value={`${reserva.num_huespedes} personas`} />
          <Row
            label="Total"
            value={`${Number(reserva.importe_total ?? 0).toLocaleString('es-ES')} €`}
          />
          {reserva.importe_senal && (
            <Row
              label="Señal"
              value={`${Number(reserva.importe_senal).toLocaleString('es-ES')} €`}
              highlight
            />
          )}
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" />
          <p className="text-sm text-amber-200">
            Esta acción cancela la reserva y libera las fechas en el calendario. La operación queda registrada en las notas internas.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Motivo de cancelación *
          </label>
          <div className="mb-3 flex flex-wrap gap-2">
            {MOTIVOS_PRESET.map((m) => (
              <button
                key={m}
                onClick={() => setMotivo(m)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  motivo === m
                    ? 'border-sky-500 bg-sky-500 text-[#07111f]'
                    : 'border-slate-600 bg-[#0f1b2d] text-slate-300 hover:border-slate-500'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            placeholder="Describe el motivo de la cancelación…"
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-700 bg-[#0f1b2d] p-4">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={devolver}
              onChange={(e) => setDevolver(e.target.checked)}
              className="rounded border-slate-600 bg-[#08111f] text-sky-500 focus:ring-sky-500"
            />
            <span className="text-sm font-semibold text-slate-200">
              Registrar devolución de importe
            </span>
          </label>

          {devolver && (
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Importe a devolver (€)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={importe}
                onChange={(e) => setImporte(parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
              <p className="text-[11px] text-slate-500">
                La devolución real en Stripe debes gestionarla desde el panel de Stripe.
              </p>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        {!confirmed ? (
          <button
            onClick={() => setConfirmed(true)}
            className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 py-3 text-sm font-bold text-red-300 transition-all hover:bg-red-500/15"
          >
            Continuar con la cancelación →
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-center text-sm font-bold text-red-300">
              ¿Confirmas la cancelación?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmed(false)}
                className="flex-1 rounded-2xl border border-slate-600 py-3 text-sm font-bold text-slate-300 transition-all hover:bg-[#0f1b2d]"
              >
                Atrás
              </button>
              <button
                onClick={cancel}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 py-3 text-sm font-bold text-white transition-all hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}
                {saving ? 'Cancelando…' : 'Sí, cancelar reserva'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── Modal Enviar enlace check-in ─────────────────────────────────────────────
function CheckinLinkModal({
  reserva,
  onClose,
}: {
  reserva: ReservaAdmin
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const link = `${window.location.origin}/reserva/${reserva.token_cliente}`

  function copyLink() {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function sendByEmail() {
    setSending(true)
    setSendError(null)
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          template_key: 'checkin_link',
          to_email: reserva.email_cliente,
          to_name: `${reserva.nombre_cliente} ${reserva.apellidos_cliente ?? ''}`,
          reservation_id: reserva.id,
        },
      })
      if (error) throw error
      setSent(true)
    } catch (err: any) {
      setSendError(err.message ?? 'Error al enviar')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      title="Enlace de check-in"
      subtitle={`${reserva.nombre_cliente} ${reserva.apellidos_cliente ?? ''}`}
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="space-y-1.5 rounded-2xl border border-slate-700 bg-[#0f1b2d] p-4 text-sm">
          <Row
            label="Estancia"
            value={`${formatFecha(reserva.fecha_entrada)} → ${formatFecha(reserva.fecha_salida)} · ${reserva.noches} noches`}
          />
          <Row label="Huéspedes" value={`${reserva.num_huespedes} personas`} />
          <Row label="Email" value={reserva.email_cliente} />
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Enlace de acceso
          </p>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-[#0f1b2d] p-3">
            <span className="flex-1 truncate font-mono text-xs text-slate-300">{link}</span>
            <button
              onClick={copyLink}
              className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                copied
                  ? 'bg-emerald-500 text-[#07111f]'
                  : 'bg-[#08111f] text-slate-200 hover:bg-[#16263a]'
              }`}
            >
              {copied ? (
                <>
                  <Check size={12} /> Copiado
                </>
              ) : (
                <>
                  <Copy size={12} /> Copiar
                </>
              )}
            </button>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-4">
          {sent ? (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-300">
              <Check size={16} /> Email enviado a {reserva.email_cliente}
            </div>
          ) : (
            <>
              {sendError && <p className="mb-2 text-xs text-red-300">{sendError}</p>}
              <button
                onClick={sendByEmail}
                disabled={sending}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 py-3 text-sm font-bold text-[#07111f] transition-all hover:bg-sky-400 disabled:opacity-50"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {sending ? 'Enviando…' : 'Enviar enlace por email'}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── Primitivas compartidas ───────────────────────────────────────────────────
const inputCls =
  'w-full rounded-2xl border border-slate-600 bg-[#0f1b2d] px-3 py-2.5 text-sm text-slate-100 placeholder-slate-400 transition-all focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-400">{label}</label>
      {children}
    </div>
  )
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span
        className={`max-w-[240px] truncate text-right font-medium ${
          highlight ? 'text-amber-300' : 'text-slate-200'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="my-4 w-full max-w-md rounded-3xl border border-slate-700 bg-[#08111f] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div>
            <h3 className="font-semibold text-slate-50">{title}</h3>
            <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#0f1b2d]"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  const colorStyles: Record<string, string> = {
    emerald: 'border-l-emerald-400 bg-emerald-500/10',
    blue: 'border-l-sky-400 bg-sky-500/10',
    slate: 'border-l-slate-500 bg-slate-500/10',
  }

  return (
    <div className="flex items-center gap-4 rounded-3xl border border-slate-700 bg-[#08111f] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
      <div className={`rounded-2xl border-l-4 p-2.5 ${colorStyles[color] ?? 'border-l-slate-500 bg-slate-500/10'}`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {label}
        </p>
        <p className="text-2xl font-bold text-slate-50">{value}</p>
      </div>
    </div>
  )
}
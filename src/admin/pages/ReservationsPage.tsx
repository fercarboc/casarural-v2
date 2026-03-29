import React, { useState, useEffect, useCallback } from 'react'
import {
  Search, Eye, Send, Copy, Check, X, Calendar,
  Users, Home, Clock, ChevronDown, Filter, RefreshCw, Loader2,
  Edit2, Ban, AlertTriangle, Save, Plus
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../integrations/supabase/client'
import { format, parseISO, isAfter, isBefore, startOfDay, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ReservaAdmin {
  id: string
  codigo: string
  nombre: string
  apellidos: string
  email: string
  telefono: string | null
  fecha_entrada: string
  fecha_salida: string
  num_huespedes: number
  noches: number
  tarifa: 'FLEXIBLE' | 'NO_REEMBOLSABLE'
  estado: string
  estado_pago: string
  origen: string
  total: number
  importe_pagado: number | null
  importe_senal: number | null
  comision_plataforma: number
  fianza: number
  token_cliente: string | null
  notas_admin: string | null
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const today = startOfDay(new Date())

function getTabForReserva(r: ReservaAdmin): 'en_casa' | 'proximas' | 'historial' {
  const entrada = parseISO(r.fecha_entrada)
  const salida  = parseISO(r.fecha_salida)
  if (!isBefore(salida, today) && !isAfter(entrada, today)) return 'en_casa'
  if (isAfter(entrada, today)) return 'proximas'
  return 'historial'
}

function formatFecha(d: string) {
  return format(parseISO(d), 'd MMM', { locale: es })
}

const ESTADO_LABEL: Record<string, string> = {
  CONFIRMED:       'Confirmada',
  PENDING_PAYMENT: 'Pdte. pago',
  CANCELLED:       'Cancelada',
  EXPIRED:         'Expirada',
  NO_SHOW:         'No presentado',
}
const ESTADO_STYLE: Record<string, string> = {
  CONFIRMED:       'bg-emerald-50 text-emerald-700 border-emerald-100',
  PENDING_PAYMENT: 'bg-amber-50 text-amber-700 border-amber-100',
  CANCELLED:       'bg-red-50 text-red-700 border-red-100',
  EXPIRED:         'bg-zinc-100 text-zinc-500 border-zinc-200',
  NO_SHOW:         'bg-zinc-100 text-zinc-500 border-zinc-200',
}
const PAGO_LABEL: Record<string, string> = {
  UNPAID:   'Sin pagar',
  PARTIAL:  'Señal',
  PAID:     'Pagado',
  REFUNDED: 'Devuelto',
}
const PAGO_STYLE: Record<string, string> = {
  UNPAID:   'bg-zinc-100 text-zinc-500',
  PARTIAL:  'bg-blue-50 text-blue-700',
  PAID:     'bg-emerald-50 text-emerald-700',
  REFUNDED: 'bg-violet-50 text-violet-700',
}
const ORIGEN_LABEL: Record<string, string> = {
  DIRECT_WEB:         'Web directa',
  BOOKING_ICAL:       'Booking',
  AIRBNB_ICAL:        'Airbnb',
  ESCAPADARURAL_ICAL: 'Escapada Rural',
  ADMIN:              'Admin',
}

// ─── Componente principal ─────────────────────────────────────────────────────
export const ReservationsPage: React.FC = () => {
  const navigate = useNavigate()
  const [all, setAll]             = useState<ReservaAdmin[]>([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState<'proximas' | 'en_casa' | 'historial' | 'canceladas' | 'todas'>('proximas')
  const [search, setSearch]       = useState('')
  const [filterEstado, setFilterEstado] = useState('ALL')
  const [filterOrigen, setFilterOrigen] = useState('ALL')
  const [checkinModal, setCheckinModal] = useState<ReservaAdmin | null>(null)
  const [editModal, setEditModal]       = useState<ReservaAdmin | null>(null)
  const [cancelModal, setCancelModal]   = useState<ReservaAdmin | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('reservas')
      .select('id,codigo,nombre,apellidos,email,telefono,fecha_entrada,fecha_salida,num_huespedes,noches,tarifa,estado,estado_pago,origen,total,importe_pagado,importe_senal,comision_plataforma,fianza,token_cliente,notas_admin,created_at')
      .order('fecha_entrada', { ascending: false })
    if (!error) setAll(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const isInactiva = (r: ReservaAdmin) => r.estado === 'CANCELLED' || r.estado === 'EXPIRED'

  const visible = all.filter(r => {
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
    if (q && !`${r.nombre} ${r.apellidos} ${r.email} ${r.codigo}`.toLowerCase().includes(q)) return false
    return true
  })

  const proximas   = all.filter(r => getTabForReserva(r) === 'proximas'  && !isInactiva(r))
  const enCasa     = all.filter(r => getTabForReserva(r) === 'en_casa'   && r.estado === 'CONFIRMED')
  const historial  = all.filter(r => getTabForReserva(r) === 'historial' && !isInactiva(r))
  const canceladas = all.filter(r => isInactiva(r))

  const handleUpdated = (updated: ReservaAdmin) => {
    setAll(prev => prev.map(r => r.id === updated.id ? updated : r))
  }
  const handleCancelled = (id: string) => {
    setAll(prev => prev.map(r => r.id === id ? { ...r, estado: 'CANCELLED', estado_pago: r.importe_pagado ? 'REFUNDED' : 'UNPAID' } : r))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Reservas</h1>
          <p className="text-zinc-500">Gestión completa de reservas</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all">
            <RefreshCw size={15} /> Actualizar
          </button>
          <button onClick={() => navigate('/admin/reservas/nueva')}
            className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all">
            <Plus size={15} /> Nueva reserva
          </button>
        </div>
      </header>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<Home size={18} className="text-emerald-600" />} label="En casa ahora" value={enCasa.length.toString()} color="emerald" />
        <StatCard icon={<Calendar size={18} className="text-blue-600" />} label="Próximas llegadas" value={proximas.length.toString()} color="blue" />
        <StatCard icon={<Clock size={18} className="text-zinc-500" />} label="Total histórico" value={all.length.toString()} color="zinc" />
      </div>

      {/* Pestañas */}
      <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 w-fit">
        {([
          { key: 'proximas',   label: 'Próximas',   count: proximas.length },
          { key: 'en_casa',    label: 'En casa',    count: enCasa.length },
          { key: 'historial',  label: 'Historial',  count: historial.length },
          { key: 'canceladas', label: 'Canceladas', count: canceladas.length },
          { key: 'todas',      label: 'Todas',      count: all.length },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              tab === t.key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {t.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              tab === t.key
                ? t.key === 'canceladas' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-white'
                : t.key === 'canceladas' && t.count > 0 ? 'bg-red-100 text-red-600' : 'bg-zinc-200 text-zinc-500'
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Búsqueda y filtros */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="Nombre, email o código de reserva…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-100 bg-zinc-50 pl-10 pr-4 py-2.5 text-sm text-zinc-900 focus:border-zinc-300 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
          <Filter size={14} className="text-zinc-400" />
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="bg-transparent text-sm font-semibold text-zinc-600 focus:outline-none">
            <option value="ALL">Todos los estados</option>
            <option value="CONFIRMED">Confirmadas</option>
            <option value="PENDING_PAYMENT">Pdte. de pago</option>
            <option value="CANCELLED">Canceladas</option>
            <option value="EXPIRED">Expiradas</option>
          </select>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
          <ChevronDown size={14} className="text-zinc-400" />
          <select value={filterOrigen} onChange={e => setFilterOrigen(e.target.value)} className="bg-transparent text-sm font-semibold text-zinc-600 focus:outline-none">
            <option value="ALL">Todos los orígenes</option>
            <option value="DIRECT_WEB">Web directa</option>
            <option value="BOOKING_ICAL">Booking</option>
            <option value="AIRBNB_ICAL">Airbnb</option>
            <option value="ESCAPADARURAL_ICAL">Escapada Rural</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        {(search || filterEstado !== 'ALL' || filterOrigen !== 'ALL') && (
          <button onClick={() => { setSearch(''); setFilterEstado('ALL'); setFilterOrigen('ALL') }}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-400 hover:text-zinc-700 transition-colors">
            <X size={14} /> Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="animate-spin text-zinc-400" size={32} />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-24 text-center">
            <Calendar className="mx-auto text-zinc-200 mb-4" size={48} />
            <p className="text-sm font-medium text-zinc-400">
              {search || filterEstado !== 'ALL' || filterOrigen !== 'ALL'
                ? 'No hay reservas con esos criterios.'
                : tab === 'proximas'   ? 'No hay reservas próximas.'
                : tab === 'en_casa'   ? 'Nadie en casa en este momento.'
                : tab === 'historial' ? 'Sin historial de reservas.'
                : tab === 'canceladas'? 'No hay reservas canceladas ni expiradas.'
                : 'No hay reservas.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-5 py-4 font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Código / Cliente</th>
                <th className="px-5 py-4 font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Fechas</th>
                <th className="px-5 py-4 font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Pax</th>
                <th className="px-5 py-4 font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Estado</th>
                <th className="px-5 py-4 font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Pago</th>
                <th className="px-5 py-4 font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Origen</th>
                <th className="px-5 py-4 font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Total</th>
                <th className="px-5 py-4 font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {visible.map(r => (
                <ReservaRow
                  key={r.id}
                  r={r}
                  onSendCheckin={() => setCheckinModal(r)}
                  onEdit={() => setEditModal(r)}
                  onCancel={() => setCancelModal(r)}
                  onNameUpdated={(id, nombre) => setAll(prev => prev.map(x => x.id === id ? { ...x, nombre } : x))}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {checkinModal && <CheckinLinkModal reserva={checkinModal} onClose={() => setCheckinModal(null)} />}
      {editModal    && <EditReservaModal   reserva={editModal}   onClose={() => setEditModal(null)}   onSaved={r => { handleUpdated(r); setEditModal(null) }} />}
      {cancelModal  && <CancelReservaModal reserva={cancelModal} onClose={() => setCancelModal(null)} onCancelled={id => { handleCancelled(id); setCancelModal(null) }} />}
    </div>
  )
}

// ─── Fila ──────────────────────────────────────────────────────────────────────
function ReservaRow({ r, onSendCheckin, onEdit, onCancel, onNameUpdated }: {
  key?: React.Key
  r: ReservaAdmin
  onSendCheckin: () => void
  onEdit: () => void
  onCancel: () => void
  onNameUpdated: (id: string, nombre: string) => void
}) {
  const isEnCasa   = getTabForReserva(r) === 'en_casa' && r.estado === 'CONFIRMED'
  const canCancel  = r.estado !== 'CANCELLED' && r.estado !== 'EXPIRED'
  const isInactiva = r.estado === 'CANCELLED' || r.estado === 'EXPIRED'

  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal]         = useState(r.nombre)
  const [savingName, setSavingName]   = useState(false)

  const saveName = async () => {
    const trimmed = nameVal.trim()
    if (!trimmed || trimmed === r.nombre) { setEditingName(false); setNameVal(r.nombre); return }
    setSavingName(true)
    const { error } = await supabase.from('reservas').update({ nombre: trimmed, updated_at: new Date().toISOString() }).eq('id', r.id)
    setSavingName(false)
    if (!error) { onNameUpdated(r.id, trimmed); setEditingName(false) }
    else setNameVal(r.nombre)
  }

  return (
    <tr className={`transition-colors ${isInactiva ? 'opacity-50 bg-zinc-50/60' : 'hover:bg-zinc-50'}`}>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          {isEnCasa && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
          <div className="min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={nameVal}
                  onChange={e => setNameVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditingName(false); setNameVal(r.nombre) } }}
                  onBlur={saveName}
                  className="w-36 rounded border border-emerald-400 px-2 py-0.5 text-sm font-bold text-zinc-900 outline-none focus:ring-1 focus:ring-emerald-500"
                />
                {savingName && <Loader2 size={12} className="animate-spin text-zinc-400 shrink-0" />}
              </div>
            ) : (
              <div className="group flex items-center gap-1">
                <p className="font-bold text-zinc-900 truncate">{r.nombre} {r.apellidos}</p>
                <button
                  onClick={() => { setNameVal(r.nombre); setEditingName(true) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-emerald-600"
                  title="Editar nombre"
                >
                  <Edit2 size={11} />
                </button>
              </div>
            )}
            <p className="text-[10px] text-zinc-400 font-mono">{r.codigo}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <p className="font-medium text-zinc-800">{formatFecha(r.fecha_entrada)} → {formatFecha(r.fecha_salida)}</p>
        <p className="text-[10px] text-zinc-400">{r.noches} noches</p>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5 text-zinc-600">
          <Users size={13} className="text-zinc-400" /><span className="font-medium">{r.num_huespedes}</span>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${ESTADO_STYLE[r.estado] ?? 'bg-zinc-50 text-zinc-500'}`}>
          {ESTADO_LABEL[r.estado] ?? r.estado}
        </span>
      </td>
      <td className="px-5 py-4">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${PAGO_STYLE[r.estado_pago] ?? 'bg-zinc-50 text-zinc-500'}`}>
          {PAGO_LABEL[r.estado_pago] ?? r.estado_pago}
        </span>
        {(r.importe_pagado ?? 0) > 0 && (
          <p className="text-[10px] text-zinc-400 mt-0.5">{r.importe_pagado!.toLocaleString('es-ES')} €</p>
        )}
      </td>
      <td className="px-5 py-4">
        <span className="text-xs font-semibold text-zinc-400">{ORIGEN_LABEL[r.origen] ?? r.origen}</span>
      </td>
      <td className="px-5 py-4">
        <p className="font-bold text-zinc-900">{r.total.toLocaleString('es-ES')} €</p>
        <p className="text-[10px] text-zinc-400">{r.tarifa === 'FLEXIBLE' ? 'Flexible' : 'No reembolsable'}</p>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-0.5">
          <Link to={`/admin/reservas/${r.id}`}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-all" title="Ver detalle">
            <Eye size={16} />
          </Link>
          <button onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-all" title="Editar reserva">
            <Edit2 size={16} />
          </button>
          {r.token_cliente && r.estado === 'CONFIRMED' && (
            <button onClick={onSendCheckin}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-zinc-400 hover:text-blue-600 transition-all" title="Enviar enlace de check-in">
              <Send size={16} />
            </button>
          )}
          {canCancel && (
            <button onClick={onCancel}
              className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-all" title="Cancelar reserva">
              <Ban size={16} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Modal Editar ─────────────────────────────────────────────────────────────
function EditReservaModal({ reserva, onClose, onSaved }: {
  reserva: ReservaAdmin
  onClose: () => void
  onSaved: (r: ReservaAdmin) => void
}) {
  const [form, setForm] = useState({
    fecha_entrada:       reserva.fecha_entrada,
    fecha_salida:        reserva.fecha_salida,
    num_huespedes:       reserva.num_huespedes,
    email:               reserva.email,
    telefono:            reserva.telefono ?? '',
    total:               reserva.total,
    importe_senal:       reserva.importe_senal ?? 0,
    comision_plataforma: reserva.comision_plataforma ?? 0,
    fianza:              reserva.fianza ?? 0,
    notas_admin:         reserva.notas_admin ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const noches = differenceInDays(parseISO(form.fecha_salida), parseISO(form.fecha_entrada))

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function save() {
    if (!form.fecha_entrada || !form.fecha_salida || noches <= 0) {
      setError('Las fechas no son válidas.'); return
    }
    if (!form.email.trim()) { setError('El email es obligatorio.'); return }
    setSaving(true); setError(null)
    const { data, error: err } = await supabase
      .from('reservas')
      .update({
        fecha_entrada:       form.fecha_entrada,
        fecha_salida:        form.fecha_salida,
        noches,
        num_huespedes:       form.num_huespedes,
        email:               form.email.trim().toLowerCase(),
        telefono:            form.telefono.trim() || null,
        total:               form.total,
        importe_senal:       form.importe_senal > 0 ? form.importe_senal : null,
        comision_plataforma: form.comision_plataforma,
        fianza:              form.fianza,
        notas_admin:         form.notas_admin.trim() || null,
        updated_at:          new Date().toISOString(),
      })
      .eq('id', reserva.id)
      .select('id,codigo,nombre,apellidos,email,telefono,fecha_entrada,fecha_salida,num_huespedes,noches,tarifa,estado,estado_pago,origen,total,importe_pagado,importe_senal,comision_plataforma,fianza,token_cliente,notas_admin,created_at')
      .single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(data as ReservaAdmin)
  }

  return (
    <Modal title="Editar reserva" subtitle={`${reserva.nombre} ${reserva.apellidos} · ${reserva.codigo}`} onClose={onClose}>
      <div className="space-y-4">
        {/* Fechas */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha entrada">
            <input type="date" value={form.fecha_entrada}
              onChange={e => set('fecha_entrada', e.target.value)}
              className={inputCls} />
          </Field>
          <Field label="Fecha salida">
            <input type="date" value={form.fecha_salida}
              onChange={e => set('fecha_salida', e.target.value)}
              className={inputCls} />
          </Field>
        </div>
        {noches > 0 && (
          <p className="text-xs text-zinc-400">{noches} noches</p>
        )}
        {noches <= 0 && form.fecha_entrada && form.fecha_salida && (
          <p className="text-xs text-red-500">La fecha de salida debe ser posterior a la entrada.</p>
        )}

        {/* Huéspedes + Total */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Núm. huéspedes">
            <input type="number" min={1} max={11} value={form.num_huespedes}
              onChange={e => set('num_huespedes', parseInt(e.target.value) || 1)}
              className={inputCls} />
          </Field>
          <Field label="Total (€)">
            <input type="number" min={0} step={0.01} value={form.total}
              onChange={e => set('total', parseFloat(e.target.value) || 0)}
              className={inputCls} />
          </Field>
        </div>

        {/* Financiero — señal + comisión + pendiente */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Señal cobrada (€)">
            <input type="number" min={0} step={0.01} value={form.importe_senal}
              onChange={e => set('importe_senal', parseFloat(e.target.value) || 0)}
              placeholder="0"
              className={inputCls} />
          </Field>
          <Field label="Comisión plataforma (€)">
            <input type="number" min={0} step={0.01} value={form.comision_plataforma}
              onChange={e => set('comision_plataforma', parseFloat(e.target.value) || 0)}
              placeholder="0"
              className={inputCls} />
          </Field>
        </div>

        {/* Fianza — solo reservas directas/manuales */}
        {(reserva.origen === 'DIRECT_WEB' || reserva.origen === 'ADMIN') && (
          <Field label="Fianza de daños (€)">
            <input type="number" min={0} step={0.01} value={form.fianza}
              onChange={e => set('fianza', parseFloat(e.target.value) || 0)}
              placeholder="0 — se devuelve a la salida"
              className={inputCls} />
            {form.fianza > 0 && (
              <p className="mt-1 text-[11px] text-blue-600">
                💡 Fianza reembolsable · devolver {form.fianza.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € al check-out si no hay incidencias
              </p>
            )}
          </Field>
        )}
        {(form.comision_plataforma > 0 || form.importe_senal > 0) && (
          <div className="rounded-xl bg-zinc-50 px-4 py-3 text-xs text-zinc-500 space-y-1">
            {form.comision_plataforma > 0 && (
              <div className="flex justify-between">
                <span>Neto (bruto − comisión)</span>
                <span className="font-bold text-zinc-700">{(form.total - form.comision_plataforma).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
              </div>
            )}
            {form.importe_senal > 0 && (
              <div className="flex justify-between">
                <span>Pendiente al check-in</span>
                <span className="font-bold text-amber-600">{Math.max(0, form.total - form.importe_senal).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
              </div>
            )}
          </div>
        )}

        {/* Contacto */}
        <Field label="Email del cliente">
          <input type="email" value={form.email}
            onChange={e => set('email', e.target.value)}
            className={inputCls} />
        </Field>
        <Field label="Teléfono">
          <input type="tel" value={form.telefono}
            onChange={e => set('telefono', e.target.value)}
            placeholder="+34 600 000 000"
            className={inputCls} />
        </Field>

        {/* Notas */}
        <Field label="Notas internas (opcionales)">
          <textarea value={form.notas_admin} onChange={e => set('notas_admin', e.target.value)}
            rows={2} placeholder="Cambio de fechas solicitado por el cliente…"
            className={`${inputCls} resize-none`} />
        </Field>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all">
            Cancelar
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-bold text-white hover:bg-zinc-700 disabled:opacity-50 transition-all">
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

function CancelReservaModal({ reserva, onClose, onCancelled }: {
  reserva: ReservaAdmin
  onClose: () => void
  onCancelled: (id: string) => void
}) {
  const [motivo, setMotivo]       = useState('')
  const [devolver, setDevolver]   = useState(false)
  const [importe, setImporte]     = useState(reserva.importe_pagado ?? 0)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  async function cancel() {
    if (!motivo.trim()) { setError('Indica un motivo para la cancelación.'); return }
    setSaving(true); setError(null)
    const nota = `CANCELACIÓN: ${motivo.trim()}${devolver ? ` | Devolución: ${importe} €` : ''}`
    const { error: err } = await supabase
      .from('reservas')
      .update({
        estado:       'CANCELLED',
        estado_pago:  devolver && importe > 0 ? 'REFUNDED' : reserva.estado_pago,
        notas_admin:  reserva.notas_admin ? `${reserva.notas_admin}\n${nota}` : nota,
        updated_at:   new Date().toISOString(),
      })
      .eq('id', reserva.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    onCancelled(reserva.id)
  }

  return (
    <Modal title="Cancelar reserva" subtitle={`${reserva.nombre} ${reserva.apellidos} · ${reserva.codigo}`} onClose={onClose}>
      <div className="space-y-5">
        {/* Resumen reserva */}
        <div className="rounded-xl bg-zinc-50 p-4 text-sm space-y-1.5">
          <Row label="Fechas" value={`${formatFecha(reserva.fecha_entrada)} → ${formatFecha(reserva.fecha_salida)} · ${reserva.noches} noches`} />
          <Row label="Huéspedes" value={`${reserva.num_huespedes} personas`} />
          <Row label="Total" value={`${reserva.total.toLocaleString('es-ES')} €`} />
          {(reserva.importe_pagado ?? 0) > 0 && (
            <Row label="Pagado" value={`${reserva.importe_pagado!.toLocaleString('es-ES')} €`} highlight />
          )}
        </div>

        {/* Aviso */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Esta acción cancela la reserva y libera las fechas en el calendario. La operación queda registrada en las notas internas.
          </p>
        </div>

        {/* Motivo */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-2">Motivo de cancelación *</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {MOTIVOS_PRESET.map(m => (
              <button key={m} onClick={() => setMotivo(m)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  motivo === m ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                }`}>
                {m}
              </button>
            ))}
          </div>
          <textarea value={motivo} onChange={e => setMotivo(e.target.value)}
            rows={2} placeholder="Describe el motivo de la cancelación…"
            className={`${inputCls} resize-none`} />
        </div>

        {/* Devolución */}
        {(reserva.importe_pagado ?? 0) > 0 && (
          <div className="rounded-xl border border-zinc-200 p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={devolver} onChange={e => setDevolver(e.target.checked)}
                className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900" />
              <span className="text-sm font-semibold text-zinc-800">Registrar devolución de importe</span>
            </label>
            {devolver && (
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">Importe a devolver (€)</label>
                <input type="number" min={0} max={reserva.importe_pagado ?? 0} step={0.01}
                  value={importe} onChange={e => setImporte(parseFloat(e.target.value) || 0)}
                  className={inputCls} />
                <p className="text-[11px] text-zinc-400">Máx. pagado: {(reserva.importe_pagado ?? 0).toLocaleString('es-ES')} €. La devolución real en Stripe debes gestionarla desde el panel de Stripe.</p>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Confirmación doble */}
        {!confirmed ? (
          <button onClick={() => setConfirmed(true)}
            className="w-full rounded-xl border-2 border-red-200 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-all">
            Continuar con la cancelación →
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-center text-sm font-bold text-red-600">¿Confirmas la cancelación?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmed(false)}
                className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all">
                Atrás
              </button>
              <button onClick={cancel} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-all">
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
function CheckinLinkModal({ reserva, onClose }: { reserva: ReservaAdmin; onClose: () => void }) {
  const [copied, setCopied]     = useState(false)
  const [sending, setSending]   = useState(false)
  const [sent, setSent]         = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const link = `${window.location.origin}/reserva/${reserva.token_cliente}`

  function copyLink() {
    navigator.clipboard.writeText(link)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  async function sendByEmail() {
    setSending(true); setSendError(null)
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: { template_key: 'checkin_link', to_email: reserva.email, to_name: `${reserva.nombre} ${reserva.apellidos}`, reservation_id: reserva.id },
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
    <Modal title="Enlace de check-in" subtitle={`${reserva.nombre} ${reserva.apellidos} · ${reserva.codigo}`} onClose={onClose}>
      <div className="space-y-5">
        <div className="rounded-xl bg-zinc-50 p-4 text-sm space-y-1.5">
          <Row label="Estancia" value={`${formatFecha(reserva.fecha_entrada)} → ${formatFecha(reserva.fecha_salida)} · ${reserva.noches} noches`} />
          <Row label="Huéspedes" value={`${reserva.num_huespedes} personas`} />
          <Row label="Email" value={reserva.email} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Enlace de acceso</p>
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <span className="flex-1 text-xs text-zinc-600 truncate font-mono">{link}</span>
            <button onClick={copyLink}
              className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                copied ? 'bg-emerald-500 text-white' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
              }`}>
              {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
            </button>
          </div>
        </div>
        <div className="border-t border-zinc-100 pt-4">
          {sent ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 font-medium">
              <Check size={16} /> Email enviado a {reserva.email}
            </div>
          ) : (
            <>
              {sendError && <p className="text-xs text-red-500 mb-2">{sendError}</p>}
              <button onClick={sendByEmail} disabled={sending}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-bold text-white hover:bg-zinc-700 disabled:opacity-50 transition-all">
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
const inputCls = 'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300 transition-all'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-zinc-500">{label}</label>
      {children}
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-zinc-400">{label}</span>
      <span className={`font-medium ${highlight ? 'text-amber-700' : 'text-zinc-800'} truncate max-w-[240px] text-right`}>{value}</span>
    </div>
  )
}

function Modal({ title, subtitle, onClose, children }: {
  title: string; subtitle: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl my-4">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5">
          <div>
            <h3 className="font-bold text-zinc-900">{title}</h3>
            <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex items-center gap-4">
      <div className={`p-2.5 rounded-xl bg-${color}-50`}>{icon}</div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">{label}</p>
        <p className="text-2xl font-bold text-zinc-900">{value}</p>
      </div>
    </div>
  )
}

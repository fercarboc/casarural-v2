import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameMonth, isSameDay, startOfToday,
  parseISO, startOfWeek, endOfWeek, getDay, addDays, differenceInDays,
  getDaysInMonth, isBefore, isAfter
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, Plus, Loader2, RefreshCw,
  Calendar, X, ExternalLink, Lock, Wifi
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../integrations/supabase/client'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Reserva {
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
  tarifa: string
  estado: string
  estado_pago: string
  total: number
  importe_pagado: number | null
  origen: string
}

interface Bloqueo {
  id: string
  fecha_inicio: string
  fecha_fin: string
  motivo: string | null
  origen: string | null
  feed_id: string | null
}

type CalEvent =
  | { kind: 'reserva'; data: Reserva }
  | { kind: 'bloqueo'; data: Bloqueo }

// ─── Colores por tipo/origen ──────────────────────────────────────────────────
function eventColor(ev: CalEvent): { bg: string; text: string; border: string; dot: string } {
  if (ev.kind === 'reserva') {
    if (ev.data.estado === 'CONFIRMED')       return { bg: 'bg-emerald-500', text: 'text-white',      border: 'border-emerald-600', dot: 'bg-emerald-500' }
    if (ev.data.estado === 'PENDING_PAYMENT') return { bg: 'bg-amber-400',   text: 'text-amber-900',  border: 'border-amber-500',   dot: 'bg-amber-400' }
    return { bg: 'bg-zinc-300', text: 'text-zinc-700', border: 'border-zinc-400', dot: 'bg-zinc-400' }
  }
  // bloqueo
  const o = ev.data.origen ?? ''
  if (o.includes('BOOKING'))         return { bg: 'bg-blue-500',   text: 'text-white',     border: 'border-blue-600',   dot: 'bg-blue-500' }
  if (o.includes('AIRBNB'))          return { bg: 'bg-rose-500',   text: 'text-white',     border: 'border-rose-600',   dot: 'bg-rose-500' }
  if (o.includes('ESCAPADARURAL'))   return { bg: 'bg-orange-500', text: 'text-white',     border: 'border-orange-600', dot: 'bg-orange-500' }
  return { bg: 'bg-zinc-400',        text: 'text-white',           border: 'border-zinc-500',  dot: 'bg-zinc-400' }
}

function eventLabel(ev: CalEvent): string {
  if (ev.kind === 'reserva') return `${ev.data.nombre} ${ev.data.apellidos}`
  const o = ev.data.origen ?? ''
  if (o.includes('BOOKING'))       return 'Booking'
  if (o.includes('AIRBNB'))        return 'Airbnb'
  if (o.includes('ESCAPADARURAL')) return 'Escapada Rural'
  return ev.data.motivo ?? 'Bloqueo'
}

function eventStart(ev: CalEvent): string {
  return ev.kind === 'reserva' ? ev.data.fecha_entrada : ev.data.fecha_inicio
}
function eventEnd(ev: CalEvent): string {
  return ev.kind === 'reserva' ? ev.data.fecha_salida : ev.data.fecha_fin
}

// Un evento ocupa un día si: inicio <= día < fin  (checkout day = libre)
function occupiesDay(ev: CalEvent, day: Date): boolean {
  const start = parseISO(eventStart(ev))
  const end   = parseISO(eventEnd(ev))
  return !isBefore(day, start) && isBefore(day, end)
}

// ─── Componente principal ─────────────────────────────────────────────────────
export const CalendarPage: React.FC = () => {
  const [month, setMonth]           = useState(new Date())
  const [selected, setSelected]     = useState<Date | null>(null)
  const [reservas, setReservas]     = useState<Reserva[]>([])
  const [bloqueos, setBloqueos]     = useState<Bloqueo[]>([])
  const [loading, setLoading]       = useState(true)
  const [blockModal, setBlockModal] = useState(false)

  const today = startOfToday()

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: r }, { data: b }] = await Promise.all([
      supabase
        .from('reservas')
        .select('id,codigo,nombre,apellidos,email,telefono,fecha_entrada,fecha_salida,num_huespedes,noches,tarifa,estado,estado_pago,total,importe_pagado,origen')
        .in('estado', ['CONFIRMED', 'PENDING_PAYMENT']),
      supabase
        .from('bloqueos')
        .select('id,fecha_inicio,fecha_fin,motivo,origen,feed_id'),
    ])
    setReservas(r ?? [])
    setBloqueos(b ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ─── Días de la cuadrícula ──────────────────────────────────────────────────
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end   = endOfWeek(endOfMonth(month),     { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [month])

  // ─── Todos los eventos combinados ──────────────────────────────────────────
  const events: CalEvent[] = useMemo(() => [
    ...reservas.map(r => ({ kind: 'reserva' as const, data: r })),
    ...bloqueos.map(b => ({ kind: 'bloqueo' as const, data: b })),
  ], [reservas, bloqueos])

  function getEventsForDay(day: Date): CalEvent[] {
    return events.filter(ev => occupiesDay(ev, day))
  }

  // ─── Ocupación del mes actual ───────────────────────────────────────────────
  const ocupacion = useMemo(() => {
    const diasMes = getDaysInMonth(month)
    const set = new Set<string>()
    const mStart = startOfMonth(month)
    const mEnd   = endOfMonth(month)
    for (const ev of events) {
      let d = parseISO(eventStart(ev))
      const fin = parseISO(eventEnd(ev))
      while (isBefore(d, fin)) {
        if (!isBefore(d, mStart) && !isAfter(d, mEnd)) set.add(format(d, 'yyyy-MM-dd'))
        d = addDays(d, 1)
      }
    }
    return Math.round((set.size / diasMes) * 100)
  }, [events, month])

  // ─── Selección del día ──────────────────────────────────────────────────────
  const selectedEvents = selected ? getEventsForDay(selected) : []

  return (
    <div className="space-y-6">

      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Calendario</h1>
          <p className="text-zinc-500">Reservas y bloqueos de disponibilidad</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setBlockModal(true)}
            className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all">
            <Plus size={16} /> Bloqueo manual
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-4">

        {/* ── Calendario ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          {/* Nav del mes */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
            <h3 className="text-lg font-bold text-zinc-900 capitalize">
              {format(month, 'MMMM yyyy', { locale: es })}
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setMonth(new Date())}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-all">
                Hoy
              </button>
              <button onClick={() => setMonth(m => subMonths(m, 1))}
                className="rounded-full p-1.5 hover:bg-zinc-100 transition-colors">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => setMonth(m => addMonths(m, 1))}
                className="rounded-full p-1.5 hover:bg-zinc-100 transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-40">
              <Loader2 className="animate-spin text-zinc-300" size={32} />
            </div>
          ) : (
            <div className="p-4">
              {/* Cabecera días */}
              <div className="grid grid-cols-7 mb-1">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                  <div key={d} className="py-2 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{d}</div>
                ))}
              </div>

              {/* Celdas */}
              <div className="grid grid-cols-7 gap-px bg-zinc-100 rounded-xl overflow-hidden border border-zinc-100">
                {days.map(day => {
                  const evs       = getEventsForDay(day)
                  const inMonth   = isSameMonth(day, month)
                  const isToday   = isSameDay(day, today)
                  const isSel     = selected ? isSameDay(day, selected) : false
                  const isPast    = isBefore(day, today) && !isToday
                  const isWeekEnd = getDay(day) === 0  // domingo

                  return (
                    <button key={day.toISOString()}
                      onClick={() => setSelected(d => d && isSameDay(d, day) ? null : day)}
                      className={`
                        relative bg-white text-left transition-all min-h-[80px] p-1.5 flex flex-col
                        ${!inMonth ? 'opacity-25 pointer-events-none' : ''}
                        ${isSel ? 'ring-2 ring-inset ring-zinc-900 z-10' : 'hover:bg-zinc-50'}
                        ${isPast && inMonth ? 'bg-zinc-50/60' : ''}
                      `}
                    >
                      {/* Número del día */}
                      <span className={`text-xs font-bold self-start mb-1 flex items-center justify-center ${
                        isToday
                          ? 'h-5 w-5 rounded-full bg-zinc-900 text-white text-[10px]'
                          : isPast ? 'text-zinc-300' : isWeekEnd ? 'text-rose-500' : 'text-zinc-600'
                      }`}>
                        {format(day, 'd')}
                      </span>

                      {/* Eventos */}
                      <div className="flex flex-col gap-0.5 w-full">
                        {evs.slice(0, 2).map(ev => {
                          const c = eventColor(ev)
                          const start = parseISO(eventStart(ev))
                          const isStart = isSameDay(day, start)
                          // primer día visible de la semana (lunes) aunque el evento haya empezado antes
                          const isFirstOfWeek = getDay(day) === 1 || isSameDay(day, startOfMonth(month))
                          const showLabel = isStart || isFirstOfWeek

                          return (
                            <div key={`${ev.kind}-${ev.kind === 'reserva' ? ev.data.id : ev.data.id}`}
                              className={`w-full rounded-sm px-1 py-0.5 text-[9px] font-bold leading-tight truncate ${c.bg} ${c.text} ${
                                !isStart && !isFirstOfWeek ? 'opacity-80' : ''
                              }`}
                            >
                              {showLabel ? eventLabel(ev) : ''}
                            </div>
                          )
                        })}
                        {evs.length > 2 && (
                          <div className="text-[9px] text-zinc-400 font-bold pl-1">+{evs.length - 2}</div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Leyenda */}
              <div className="mt-4 flex flex-wrap gap-4 border-t border-zinc-100 pt-4">
                {[
                  { color: 'bg-emerald-500', label: 'Confirmada (web)' },
                  { color: 'bg-amber-400',   label: 'Pdte. de pago' },
                  { color: 'bg-blue-500',    label: 'Booking.com' },
                  { color: 'bg-rose-500',    label: 'Airbnb' },
                  { color: 'bg-orange-500',  label: 'Escapada Rural' },
                  { color: 'bg-zinc-400',    label: 'Bloqueo manual' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className={`h-2.5 w-2.5 rounded-sm ${l.color}`} />
                    <span className="text-[10px] font-semibold text-zinc-400">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Panel del día seleccionado */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 text-sm">
                {selected
                  ? format(selected, "EEEE d 'de' MMMM", { locale: es })
                  : 'Selecciona un día'}
              </h3>
              {selected && (
                <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="p-4">
              {!selected ? (
                <p className="text-sm text-zinc-400 text-center py-8">Pulsa cualquier día del calendario para ver sus eventos.</p>
              ) : selectedEvents.length === 0 ? (
                <div className="text-center py-6 space-y-3">
                  <Calendar className="mx-auto text-zinc-200" size={36} />
                  <p className="text-sm text-zinc-400">Día libre</p>
                  <button onClick={() => setBlockModal(true)}
                    className="w-full rounded-xl bg-zinc-900 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 transition-all">
                    + Crear bloqueo manual
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedEvents.map(ev => (
                    <EventCard key={`${ev.kind}-${ev.kind === 'reserva' ? ev.data.id : ev.data.id}`} ev={ev} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ocupación del mes */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Ocupación · {format(month, 'MMMM', { locale: es })}
            </h4>
            <div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-bold text-zinc-900">{ocupacion}%</span>
                <span className="text-xs text-zinc-400 mb-1">
                  {ocupacion >= 80 ? '🔥 Alta' : ocupacion >= 50 ? '✅ Media' : '📅 Baja'}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${
                  ocupacion >= 80 ? 'bg-emerald-500' : ocupacion >= 50 ? 'bg-amber-400' : 'bg-zinc-300'
                }`} style={{ width: `${ocupacion}%` }} />
              </div>
            </div>
            <div className="pt-2 space-y-1.5 border-t border-zinc-100">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Reservas confirmadas</span>
                <span className="font-bold text-zinc-700">{reservas.filter(r => r.estado === 'CONFIRMED').length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Pdte. de pago</span>
                <span className="font-bold text-zinc-700">{reservas.filter(r => r.estado === 'PENDING_PAYMENT').length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Bloqueos iCal</span>
                <span className="font-bold text-zinc-700">{bloqueos.filter(b => b.feed_id).length}</span>
              </div>
            </div>
          </div>

          {/* Ir a reservas */}
          <Link to="/admin/reservas"
            className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-300 hover:bg-zinc-50 transition-all group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-zinc-100 group-hover:bg-zinc-200 transition-colors">
                <Calendar size={16} className="text-zinc-600" />
              </div>
              <span className="text-sm font-bold text-zinc-700">Gestionar reservas</span>
            </div>
            <ExternalLink size={14} className="text-zinc-300 group-hover:text-zinc-500" />
          </Link>

          <Link to="/admin/ical"
            className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-300 hover:bg-zinc-50 transition-all group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
                <Wifi size={16} className="text-blue-600" />
              </div>
              <span className="text-sm font-bold text-zinc-700">iCal / Sincronización</span>
            </div>
            <ExternalLink size={14} className="text-zinc-300 group-hover:text-zinc-500" />
          </Link>
        </div>
      </div>

      {/* Modal bloqueo manual */}
      {blockModal && <BlockModal onClose={() => setBlockModal(false)} onSaved={() => { setBlockModal(false); load() }} />}
    </div>
  )
}

// ─── Tarjeta de evento en el sidebar ──────────────────────────────────────────
function EventCard({ ev }: { ev: CalEvent }) {
  const c = eventColor(ev)

  if (ev.kind === 'reserva') {
    const r = ev.data
    return (
      <div className="rounded-xl border border-zinc-100 overflow-hidden">
        <div className={`px-4 py-2 flex items-center justify-between ${c.bg}`}>
          <span className={`text-xs font-bold ${c.text}`}>{eventLabel(ev)}</span>
          <span className={`text-[10px] font-semibold ${c.text} opacity-80`}>{r.codigo}</span>
        </div>
        <div className="px-4 py-3 space-y-2 text-xs">
          <InfoRow label="Fechas" value={`${fmtDate(r.fecha_entrada)} → ${fmtDate(r.fecha_salida)} · ${r.noches} noches`} />
          <InfoRow label="Huéspedes" value={`${r.num_huespedes} personas`} />
          <InfoRow label="Total" value={`${r.total.toLocaleString('es-ES')} €`} />
          <InfoRow label="Estado" value={
            r.estado === 'CONFIRMED' ? '✅ Confirmada' :
            r.estado === 'PENDING_PAYMENT' ? '⏳ Pdte. pago' : r.estado
          } />
          {r.email && <InfoRow label="Email" value={r.email} />}
          {r.telefono && <InfoRow label="Tel." value={r.telefono} />}
        </div>
        <div className="px-4 pb-3">
          <Link to={`/admin/reservas/${r.id}`}
            className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-zinc-900 py-2 text-xs font-bold text-white hover:bg-zinc-700 transition-all">
            Ver reserva completa <ExternalLink size={11} />
          </Link>
        </div>
      </div>
    )
  }

  // Bloqueo
  const b = ev.data
  const origenLabel =
    b.origen?.includes('BOOKING')       ? 'Booking.com' :
    b.origen?.includes('AIRBNB')        ? 'Airbnb' :
    b.origen?.includes('ESCAPADARURAL') ? 'Escapada Rural' : 'Bloqueo manual'

  return (
    <div className="rounded-xl border border-zinc-100 overflow-hidden">
      <div className={`px-4 py-2 flex items-center gap-2 ${c.bg}`}>
        <Lock size={11} className={c.text} />
        <span className={`text-xs font-bold ${c.text}`}>{origenLabel}</span>
      </div>
      <div className="px-4 py-3 space-y-2 text-xs">
        <InfoRow label="Desde" value={fmtDate(b.fecha_inicio)} />
        <InfoRow label="Hasta" value={fmtDate(b.fecha_fin)} />
        {b.motivo && <InfoRow label="Motivo" value={b.motivo} />}
        {b.feed_id && (
          <div className="flex items-center gap-1 text-zinc-400 pt-1">
            <Wifi size={10} /><span>Importado por iCal</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal bloqueo manual ─────────────────────────────────────────────────────
function BlockModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ fecha_inicio: '', fecha_fin: '', motivo: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm(p => ({ ...p, [k]: v }))
  }

  const noches = form.fecha_inicio && form.fecha_fin
    ? differenceInDays(parseISO(form.fecha_fin), parseISO(form.fecha_inicio))
    : 0

  async function save() {
    if (!form.fecha_inicio || !form.fecha_fin || noches <= 0) {
      setError('Las fechas no son válidas.'); return
    }
    setSaving(true); setError(null)
    const { error: err } = await supabase.from('bloqueos').insert({
      fecha_inicio: form.fecha_inicio,
      fecha_fin:    form.fecha_fin,
      motivo:       form.motivo.trim() || null,
      origen:       'ADMIN',
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5">
          <h3 className="font-bold text-zinc-900">Bloqueo manual</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500">Desde</label>
              <input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500">Hasta</label>
              <input type="date" value={form.fecha_fin} onChange={e => set('fecha_fin', e.target.value)} className={inputCls} />
            </div>
          </div>
          {noches > 0 && <p className="text-xs text-zinc-400">{noches} noches bloqueadas</p>}
          {noches <= 0 && form.fecha_inicio && form.fecha_fin && (
            <p className="text-xs text-red-500">La fecha fin debe ser posterior a la de inicio.</p>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500">Motivo (opcional)</label>
            <input type="text" value={form.motivo} onChange={e => set('motivo', e.target.value)}
              placeholder="Obras, mantenimiento…" className={inputCls} />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all">
              Cancelar
            </button>
            <button onClick={save} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50 transition-all">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
              {saving ? 'Guardando…' : 'Bloquear fechas'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const inputCls = 'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300 transition-all'

function fmtDate(d: string) {
  return format(parseISO(d), 'd MMM yyyy', { locale: es })
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-zinc-400 shrink-0">{label}</span>
      <span className="text-zinc-700 font-medium text-right">{value}</span>
    </div>
  )
}

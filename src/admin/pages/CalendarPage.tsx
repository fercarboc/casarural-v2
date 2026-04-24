import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfToday,
  parseISO,
  startOfWeek,
  endOfWeek,
  getDay,
  addDays,
  differenceInDays,
  getDaysInMonth,
  isBefore,
  isAfter,
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  RefreshCw,
  Calendar,
  X,
  ExternalLink,
  Lock,
  Wifi,
  Unlock,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../integrations/supabase/client'
import { configService } from '../../services/config.service'
import { useAdminTenant } from '../context/AdminTenantContext'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Reserva {
  id: string
  unidad_id?: string | null
  nombre_cliente: string
  apellidos_cliente: string
  email_cliente: string
  telefono_cliente: string | null
  fecha_entrada: string
  fecha_salida: string
  num_huespedes: number
  noches: number
  tarifa: string
  estado: string
  estado_pago: string
  importe_total: number
  origen: string
}

interface Bloqueo {
  id: string
  unidad_id?: string | null
  fecha_inicio: string
  fecha_fin: string
  motivo: string | null
  origen: string | null
  uid_ical: string | null
  linkedReservation?: Reserva | null
  linkedRental?: { cliente_nombre: string; numero_contrato: string | null } | null
}

interface UnidadOption {
  id: string
  nombre: string
}

type CalEvent =
  | { kind: 'reserva'; data: Reserva }
  | { kind: 'bloqueo'; data: Bloqueo }

type ViewMode = 'property' | 'global'
type BlockAction = 'block' | 'unblock'
type BlockScope = 'global' | 'individual'

// ─── Helpers de negocio ───────────────────────────────────────────────────────
function safeGuestName(reserva: Reserva): string {
  return `${reserva.nombre_cliente ?? ''} ${reserva.apellidos_cliente ?? ''}`.trim() || 'Cliente sin nombre'
}

function extractReservationIdFromMotivo(motivo?: string | null): string | null {
  if (!motivo) return null

  const match = motivo.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i)
  return match?.[0]?.trim().toLowerCase() ?? null
}

function getReservationDisplayCode(reserva: Reserva): string {
  const raw = (reserva.id ?? '').trim()
  return `R-${raw.slice(0, 8).toUpperCase()}`
}

function enrichBloqueosWithReservations(
  bloqueos: Bloqueo[],
  reservas: Reserva[]
): Bloqueo[] {
  const reservationMap = new Map<string, Reserva>()
  for (const reserva of reservas) {
    reservationMap.set((reserva.id ?? '').trim().toLowerCase(), reserva)
  }
  return bloqueos.map((bloqueo) => {
    const reservationId = extractReservationIdFromMotivo(bloqueo.motivo)
    return {
      ...bloqueo,
      linkedReservation: reservationId ? reservationMap.get(reservationId) ?? null : null,
    }
  })
}

function enrichBloqueosWithRentals(
  bloqueos: Bloqueo[],
  rentals: Array<{ id: string; cliente_nombre: string; numero_contrato: string | null }>
): Bloqueo[] {
  const rentalMap = new Map(rentals.map(r => [r.id.trim().toLowerCase(), r]))
  return bloqueos.map(b => {
    if (b.origen !== 'RENTAL') return b
    const rentalId = extractReservationIdFromMotivo(b.motivo)
    const rental = rentalId ? rentalMap.get(rentalId) ?? null : null
    return {
      ...b,
      linkedRental: rental
        ? { cliente_nombre: rental.cliente_nombre, numero_contrato: rental.numero_contrato }
        : null,
    }
  })
}

// ─── Colores por tipo/origen ──────────────────────────────────────────────────
// Verde  → reserva corta estancia (directa o iCal)
// Naranja → bloqueo media/larga estancia (RENTAL)
// Gris   → bloqueo manual / avería
function eventColor(ev: CalEvent): { bg: string; text: string; border: string; dot: string } {
  if (ev.kind === 'reserva') {
    if (ev.data.estado === 'CONFIRMED') {
      return { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-600', dot: 'bg-emerald-500' }
    }
    if (ev.data.estado === 'PENDING_PAYMENT') {
      return { bg: 'bg-amber-400', text: 'text-amber-950', border: 'border-amber-500', dot: 'bg-amber-400' }
    }
    return { bg: 'bg-slate-500', text: 'text-white', border: 'border-slate-600', dot: 'bg-slate-500' }
  }

  if (ev.data.linkedReservation) {
    return { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-600', dot: 'bg-emerald-500' }
  }

  const o = ev.data.origen ?? ''

  // Media/larga estancia → naranja
  if (o === 'RENTAL') {
    return { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600', dot: 'bg-orange-500' }
  }

  // iCal (Booking, Airbnb, Escapada) → verde
  if (o.includes('BOOKING') || o.includes('AIRBNB') || o.includes('ESCAPADARURAL')) {
    return { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-700', dot: 'bg-emerald-600' }
  }

  // Manual / avería → gris
  return { bg: 'bg-slate-400', text: 'text-white', border: 'border-slate-500', dot: 'bg-slate-400' }
}

function eventLabel(
  ev: CalEvent,
  unidadesMap?: Record<string, string>
): string {
  if (ev.kind === 'reserva') {
    const code = getReservationDisplayCode(ev.data)
    const guest = safeGuestName(ev.data)
    return `${code} · ${guest}`
  }

  if (ev.data.linkedReservation) {
    const code = getReservationDisplayCode(ev.data.linkedReservation)
    const guest = safeGuestName(ev.data.linkedReservation)
    return `${code} · ${guest}`
  }

  const o = ev.data.origen ?? ''

  if (o === 'RENTAL') {
    const nombre = ev.data.linkedRental?.cliente_nombre
    return nombre ? `ML Estancia · ${nombre}` : 'ML Estancia'
  }

  if (o.includes('BOOKING')) return 'Bloqueo Booking'
  if (o.includes('AIRBNB')) return 'Bloqueo Airbnb'
  if (o.includes('ESCAPADARURAL')) return 'Bloqueo Escapada Rural'

  const motivo = ev.data.motivo
  if (motivo && !motivo.startsWith('RENTAL:')) return motivo
  if (ev.data.unidad_id && unidadesMap?.[ev.data.unidad_id]) {
    return `Bloqueo manual · ${unidadesMap[ev.data.unidad_id]}`
  }
  return 'Bloqueo manual'
}

function eventStart(ev: CalEvent): string {
  return ev.kind === 'reserva' ? ev.data.fecha_entrada : ev.data.fecha_inicio
}

function eventEnd(ev: CalEvent): string {
  return ev.kind === 'reserva' ? ev.data.fecha_salida : ev.data.fecha_fin
}

// Un evento ocupa un día si: inicio <= día < fin
function occupiesDay(ev: CalEvent, day: Date): boolean {
  const start = parseISO(eventStart(ev))
  const end = parseISO(eventEnd(ev))
  return !isBefore(day, start) && isBefore(day, end)
}

function belongsToMonth(ev: CalEvent, month: Date): boolean {
  const mStart = startOfMonth(month)
  const mEnd = endOfMonth(month)
  const start = parseISO(eventStart(ev))
  const endExclusive = parseISO(eventEnd(ev))
  const lastOccupiedDay = addDays(endExclusive, -1)

  return !isAfter(start, mEnd) && !isBefore(lastOccupiedDay, mStart)
}

function fmtDate(d: string) {
  return format(parseISO(d), 'd MMM yyyy', { locale: es })
}

function monthEventStats(events: CalEvent[], month: Date) {
  const monthEvents = events.filter((ev) => belongsToMonth(ev, month))

  return {
    confirmedReservations: monthEvents.filter(
      (ev) =>
        (ev.kind === 'reserva' && ev.data.estado === 'CONFIRMED') ||
        (ev.kind === 'bloqueo' && !!ev.data.linkedReservation)
    ).length,
    pendingReservations: monthEvents.filter(
      (ev) => ev.kind === 'reserva' && ev.data.estado === 'PENDING_PAYMENT'
    ).length,
    icalBlocks: monthEvents.filter((ev) => ev.kind === 'bloqueo' && !!ev.data.uid_ical).length,
  }
}

function monthOccupation(events: CalEvent[], month: Date) {
  const diasMes = getDaysInMonth(month)
  const set = new Set<string>()
  const mStart = startOfMonth(month)
  const mEnd = endOfMonth(month)

  for (const ev of events) {
    let d = parseISO(eventStart(ev))
    const fin = parseISO(eventEnd(ev))

    while (isBefore(d, fin)) {
      if (!isBefore(d, mStart) && !isAfter(d, mEnd)) {
        set.add(format(d, 'yyyy-MM-dd'))
      }
      d = addDays(d, 1)
    }
  }

  return diasMes > 0 ? Math.round((set.size / diasMes) * 100) : 0
}

function getEventsForDay(events: CalEvent[], day: Date): CalEvent[] {
  return events.filter((ev) => occupiesDay(ev, day))
}

function getGlobalEventsForDay(
  day: Date,
  unidades: UnidadOption[],
  reservas: Reserva[],
  bloqueos: Bloqueo[]
): Array<{ unidad: UnidadOption; events: CalEvent[] }> {
  return unidades
    .map((unidad) => {
      const unitEvents: CalEvent[] = [
        ...reservas
          .filter((r) => r.unidad_id === unidad.id)
          .map((r) => ({ kind: 'reserva' as const, data: r })),
        ...bloqueos
          .filter((b) => b.unidad_id === unidad.id)
          .map((b) => ({ kind: 'bloqueo' as const, data: b })),
      ]

      return {
        unidad,
        events: getEventsForDay(unitEvents, day),
      }
    })
    .filter((item) => item.events.length > 0)
}

// ─── Componente principal ─────────────────────────────────────────────────────
export const CalendarPage: React.FC = () => {
  const { property_id } = useAdminTenant()
  const [month, setMonth] = useState(new Date())
  const [selected, setSelected] = useState<Date | null>(null)
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([])
  const [loading, setLoading] = useState(true)
  const [blockModal, setBlockModal] = useState(false)

  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [unidadId, setUnidadId] = useState<string | null>(null)

  const [unidades, setUnidades] = useState<UnidadOption[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('property')
  const [selectedUnidadId, setSelectedUnidadId] = useState<string>('GLOBAL')

  const today = startOfToday()

  const unidadesMap = useMemo(
    () =>
      unidades.reduce<Record<string, string>>((acc, u) => {
        acc[u.id] = u.nombre
        return acc
      }, {}),
    [unidades]
  )

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const cfg = await configService.getConfig(property_id)
      setPropertyId(cfg.property.id)

      const mappedUnidades = (cfg.unidades ?? []).map((u: any) => ({
        id: u.id,
        nombre: u.nombre,
      }))

      setUnidades(mappedUnidades)

      const firstUnidadId = mappedUnidades[0]?.id ?? null
      setUnidadId(firstUnidadId)

      if (selectedUnidadId === 'GLOBAL' && viewMode === 'global') {
        // mantener global
      } else if (!selectedUnidadId || selectedUnidadId === 'GLOBAL') {
        setSelectedUnidadId(firstUnidadId ?? 'GLOBAL')
      }
    } catch {
      // no-op
    }

    const [{ data: r }, { data: b }, { data: rents }] = await Promise.all([
      supabase
        .from('reservas')
        .select(
          'id,reserva_unidades(unidad_id),nombre_cliente,apellidos_cliente,email_cliente,telefono_cliente,fecha_entrada,fecha_salida,num_huespedes,noches,tarifa,estado,estado_pago,importe_total,origen'
        )
        .in('estado', ['CONFIRMED', 'PENDING_PAYMENT']),
      supabase
        .from('bloqueos')
        .select('id,unidad_id,fecha_inicio,fecha_fin,motivo,origen,uid_ical'),
      supabase
        .from('rentals')
        .select('id,cliente_nombre,numero_contrato')
        .in('estado', ['ACTIVO', 'RENOVADO', 'APROBADO']),
    ])

    const typedReservas = (r ?? []).map((res: any) => ({
      ...res,
      unidad_id: res.reserva_unidades?.[0]?.unidad_id ?? null,
    })) as Reserva[]
    const typedBloqueos = (b ?? []) as Bloqueo[]
    const enrichedBloqueos = enrichBloqueosWithRentals(
      enrichBloqueosWithReservations(typedBloqueos, typedReservas),
      (rents ?? []) as Array<{ id: string; cliente_nombre: string; numero_contrato: string | null }>
    )

    setReservas(typedReservas)
    setBloqueos(enrichedBloqueos)
    setLoading(false)
  }, [selectedUnidadId, viewMode])

  useEffect(() => {
    load()
  }, [load])

  // ─── Filtro por unidad / vista ─────────────────────────────────────────────
  const filteredReservas = useMemo(() => {
    if (viewMode === 'global' || selectedUnidadId === 'GLOBAL') return reservas
    return reservas.filter((r) => r.unidad_id === selectedUnidadId)
  }, [reservas, viewMode, selectedUnidadId])

  const filteredBloqueos = useMemo(() => {
    if (viewMode === 'global' || selectedUnidadId === 'GLOBAL') return bloqueos
    return bloqueos.filter((b) => b.unidad_id === selectedUnidadId)
  }, [bloqueos, viewMode, selectedUnidadId])

  // ─── Días de la cuadrícula mensual ─────────────────────────────────────────
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [month])

  // ─── Eventos combinados ────────────────────────────────────────────────────
  const events: CalEvent[] = useMemo(
    () => [
      ...filteredReservas.map((r) => ({ kind: 'reserva' as const, data: r })),
      ...filteredBloqueos.map((b) => ({ kind: 'bloqueo' as const, data: b })),
    ],
    [filteredReservas, filteredBloqueos]
  )

  // ─── Ocupación y métricas del mes ──────────────────────────────────────────
  const ocupacion = useMemo(() => monthOccupation(events, month), [events, month])
  const monthStats = useMemo(() => monthEventStats(events, month), [events, month])

  const selectedEvents = selected ? getEventsForDay(events, selected) : []

  const selectedGlobalDayEvents = useMemo(() => {
    if (!selected || viewMode !== 'global') return []
    return getGlobalEventsForDay(selected, unidades, reservas, bloqueos)
  }, [selected, viewMode, unidades, reservas, bloqueos])

  const selectedHeaderLabel = selected
    ? format(selected, "EEEE d 'de' MMMM", { locale: es })
    : 'Selecciona un día'

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header */}
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-800/80 bg-[#08111f] px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-50">Calendario</h1>
          <p className="mt-1.5 text-sm text-slate-300">
            Reservas y bloqueos de disponibilidad
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-[#08111f] px-4 py-2.5 text-sm font-semibold text-slate-100 transition-all hover:border-slate-500 hover:bg-[#0b1728]"
          >
            <RefreshCw size={14} />
          </button>

          <button
            onClick={() => setBlockModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-[#07111f] transition-all hover:bg-emerald-400"
          >
            <Plus size={14} />
            Bloqueo manual
          </button>
        </div>
      </header>

      {/* Selector vista / unidad */}
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-700 bg-[#08111f] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.22)] md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setViewMode('property')
              setSelected(null)
              if (selectedUnidadId === 'GLOBAL' && unidades[0]?.id) {
                setSelectedUnidadId(unidades[0].id)
              }
            }}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${
              viewMode === 'property'
                ? 'bg-sky-500 text-[#07111f]'
                : 'bg-[#0f1b2d] text-slate-300 hover:bg-[#16263a]'
            }`}
          >
            Por unidad
          </button>

          <button
            onClick={() => {
              setViewMode('global')
              setSelectedUnidadId('GLOBAL')
              setSelected(null)
            }}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${
              viewMode === 'global'
                ? 'bg-sky-500 text-[#07111f]'
                : 'bg-[#0f1b2d] text-slate-300 hover:bg-[#16263a]'
            }`}
          >
            Vista global
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Unidad
          </label>

          <select
            value={viewMode === 'global' ? 'GLOBAL' : selectedUnidadId}
            onChange={(e) => {
              const value = e.target.value
              setSelected(null)

              if (value === 'GLOBAL') {
                setViewMode('global')
                setSelectedUnidadId('GLOBAL')
              } else {
                setViewMode('property')
                setSelectedUnidadId(value)
              }
            }}
            className="rounded-2xl border border-slate-600 bg-[#0f1b2d] px-3 py-2.5 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="GLOBAL">Global</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* ── Calendario / vista global ───────────────────────────────────── */}
        <div className="overflow-hidden rounded-3xl border border-slate-700 bg-[#08111f] shadow-[0_20px_60px_rgba(0,0,0,0.22)] lg:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-700 bg-[#0b1728] px-6 py-4">
            <div>
              <h3 className="text-base font-semibold capitalize text-slate-50">
                {viewMode === 'global' ? 'Vista global · ' : ''}
                {format(month, 'MMMM yyyy', { locale: es })}
              </h3>
              {viewMode === 'global' && (
                <p className="mt-1 text-xs text-slate-400">
                  Todas las unidades en una sola rejilla
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setMonth(new Date())
                  setSelected(null)
                }}
                className="rounded-xl border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:bg-[#0f1b2d]"
              >
                Hoy
              </button>

              <button
                onClick={() => {
                  setMonth((m) => subMonths(m, 1))
                  setSelected(null)
                }}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-[#0f1b2d] hover:text-slate-200"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                onClick={() => {
                  setMonth((m) => addMonths(m, 1))
                  setSelected(null)
                }}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-[#0f1b2d] hover:text-slate-200"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-40">
              <Loader2 className="animate-spin text-slate-500" size={32} />
            </div>
          ) : viewMode === 'property' ? (
            <div className="p-4">
              <div className="mb-1 grid grid-cols-7">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                  <div
                    key={d}
                    className="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400"
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
                {days.map((day) => {
                  const evs = getEventsForDay(events, day)
                  const inMonth = isSameMonth(day, month)
                  const isToday = isSameDay(day, today)
                  const isSel = selected ? isSameDay(day, selected) : false
                  const isPast = isBefore(day, today) && !isToday
                  const isWeekEnd = getDay(day) === 0

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() =>
                        setSelected((d) => (d && isSameDay(d, day) ? null : day))
                      }
                      className={`
                        relative flex min-h-[88px] flex-col bg-[#08111f] p-1.5 text-left transition-all
                        ${!inMonth ? 'pointer-events-none opacity-20' : ''}
                        ${isSel ? 'z-10 ring-2 ring-inset ring-sky-400' : 'hover:bg-[#0b1728]'}
                        ${isPast && inMonth ? 'bg-[#0a1322]' : ''}
                      `}
                    >
                      <span
                        className={`mb-1 flex h-5 w-5 items-center justify-center self-start text-xs font-bold ${
                          isToday
                            ? 'rounded-full bg-sky-500 text-[#07111f] text-[10px]'
                            : isPast
                              ? 'text-slate-500'
                              : isWeekEnd
                                ? 'text-rose-400'
                                : 'text-slate-300'
                        }`}
                      >
                        {format(day, 'd')}
                      </span>

                      <div className="flex w-full flex-col gap-0.5">
                        {evs.slice(0, 2).map((ev) => {
                          const c = eventColor(ev)
                          const start = parseISO(eventStart(ev))
                          const isStart = isSameDay(day, start)
                          const isFirstOfWeek =
                            getDay(day) === 1 || isSameDay(day, startOfMonth(month))
                          const showLabel = isStart || isFirstOfWeek

                          return (
                            <div
                              key={`${ev.kind}-${ev.data.id}`}
                              title={eventLabel(ev, unidadesMap)}
                              className={`w-full truncate rounded-sm px-1 py-0.5 text-[9px] font-bold leading-tight ${c.bg} ${c.text} ${
                                !isStart && !isFirstOfWeek ? 'opacity-80' : ''
                              }`}
                            >
                              {showLabel ? eventLabel(ev, unidadesMap) : ''}
                            </div>
                          )
                        })}

                        {evs.length > 2 && (
                          <div className="pl-1 text-[9px] font-bold text-slate-400">
                            +{evs.length - 2}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-700 pt-4">
                {[
                  { color: 'bg-emerald-500', label: 'Reserva confirmada' },
                  { color: 'bg-amber-400', label: 'Pdte. de pago' },
                  { color: 'bg-emerald-600', label: 'Booking / Airbnb / Escapada (iCal)' },
                  { color: 'bg-orange-500', label: 'Media / Larga estancia' },
                  { color: 'bg-slate-400', label: 'Bloqueo manual / Avería' },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className={`h-2.5 w-2.5 rounded-sm ${l.color}`} />
                    <span className="text-[10px] font-semibold text-slate-400">
                      {l.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <GlobalCalendarGrid
              month={month}
              selected={selected}
              onSelectDay={setSelected}
              unidades={unidades}
              reservas={reservas}
              bloqueos={bloqueos}
              unidadesMap={unidadesMap}
            />
          )}
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-slate-700 bg-[#08111f] shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
            <div className="flex items-center justify-between border-b border-slate-700 bg-[#0b1728] px-5 py-4">
              <h3 className="text-sm font-semibold capitalize text-slate-50">
                {selectedHeaderLabel}
              </h3>

              {selected && (
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-[#0f1b2d] hover:text-slate-200"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="p-4">
              {!selected ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  Pulsa cualquier día del calendario para ver sus eventos.
                </p>
              ) : viewMode === 'property' ? (
                selectedEvents.length === 0 ? (
                  <div className="space-y-3 py-6 text-center">
                    <Calendar className="mx-auto text-slate-600" size={32} />
                    <p className="text-sm text-slate-400">Día libre</p>
                    <button
                      onClick={() => setBlockModal(true)}
                      className="w-full rounded-2xl bg-emerald-500 py-2.5 text-xs font-bold text-[#07111f] transition-all hover:bg-emerald-400"
                    >
                      + Crear bloqueo manual
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedEvents.map((ev) => (
                      <EventCard
                        key={`${ev.kind}-${ev.data.id}`}
                        ev={ev}
                        unidadNombre={unidadesMap[ev.data.unidad_id ?? '']}
                      />
                    ))}
                  </div>
                )
              ) : selectedGlobalDayEvents.length === 0 ? (
                <div className="space-y-3 py-6 text-center">
                  <Calendar className="mx-auto text-slate-600" size={32} />
                  <p className="text-sm text-slate-400">Día libre en todas las unidades</p>
                  <button
                    onClick={() => setBlockModal(true)}
                    className="w-full rounded-2xl bg-emerald-500 py-2.5 text-xs font-bold text-[#07111f] transition-all hover:bg-emerald-400"
                  >
                    + Crear bloqueo manual
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedGlobalDayEvents.map((item) => (
                    <div key={item.unidad.id} className="space-y-2">
                      <div className="rounded-xl border border-slate-700 bg-[#0f1b2d] px-3 py-2">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">
                          {item.unidad.nombre}
                        </p>
                      </div>

                      <div className="space-y-3">
                        {item.events.map((ev) => (
                          <EventCard
                            key={`${item.unidad.id}-${ev.kind}-${ev.data.id}`}
                            ev={ev}
                            unidadNombre={item.unidad.nombre}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-3xl border border-slate-700 bg-[#08111f] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Ocupación · {format(month, 'MMMM', { locale: es })}
            </h4>

            <div>
              <div className="mb-2 flex items-end justify-between">
                <span className="text-2xl font-bold text-slate-50">{ocupacion}%</span>
                <span className="mb-1 text-xs text-slate-400">
                  {ocupacion >= 80 ? 'Alta' : ocupacion >= 50 ? 'Media' : 'Baja'}
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-[#0f1b2d]">
                <div
                  className={`h-full rounded-full transition-all ${
                    ocupacion >= 80
                      ? 'bg-emerald-500'
                      : ocupacion >= 50
                        ? 'bg-amber-400'
                        : 'bg-slate-500'
                  }`}
                  style={{ width: `${ocupacion}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5 border-t border-slate-700 pt-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Reservas confirmadas</span>
                <span className="font-semibold text-slate-200">
                  {monthStats.confirmedReservations}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Pdte. de pago</span>
                <span className="font-semibold text-slate-200">
                  {monthStats.pendingReservations}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Bloqueos iCal</span>
                <span className="font-semibold text-slate-200">
                  {monthStats.icalBlocks}
                </span>
              </div>
            </div>
          </div>

          <Link
            to="/admin/reservas"
            className="group flex items-center justify-between gap-3 rounded-3xl border border-slate-700 bg-[#08111f] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.22)] transition-all hover:border-slate-500 hover:bg-[#0b1728]"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#0f1b2d] p-2 transition-colors group-hover:bg-[#16263a]">
                <Calendar size={15} className="text-slate-300" />
              </div>
              <span className="text-sm font-semibold text-slate-200">
                Gestionar reservas
              </span>
            </div>
            <ExternalLink size={13} className="text-slate-500 group-hover:text-slate-300" />
          </Link>

          <Link
            to="/admin/ical"
            className="group flex items-center justify-between gap-3 rounded-3xl border border-slate-700 bg-[#08111f] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.22)] transition-all hover:border-slate-500 hover:bg-[#0b1728]"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-500/10 p-2 transition-colors group-hover:bg-sky-500/15">
                <Wifi size={16} className="text-sky-300" />
              </div>
              <span className="text-sm font-bold text-slate-200">
                iCal / Sincronización
              </span>
            </div>
            <ExternalLink size={14} className="text-slate-500 group-hover:text-slate-300" />
          </Link>
        </div>
      </div>

      {/* Modal bloqueo manual */}
      {blockModal && (
        <BlockModal
          propertyId={propertyId}
          unidadId={selectedUnidadId !== 'GLOBAL' ? selectedUnidadId : unidadId}
          unidades={unidades}
          viewMode={viewMode}
          onClose={() => setBlockModal(false)}
          onSaved={() => {
            setBlockModal(false)
            load()
          }}
        />
      )}
    </div>
  )
}

// ─── Vista global ─────────────────────────────────────────────────────────────
function GlobalCalendarGrid({
  month,
  selected,
  onSelectDay,
  unidades,
  reservas,
  bloqueos,
  unidadesMap,
}: {
  month: Date
  selected: Date | null
  onSelectDay: (date: Date | null) => void
  unidades: UnidadOption[]
  reservas: Reserva[]
  bloqueos: Bloqueo[]
  unidadesMap: Record<string, string>
}) {
  const days = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  })

  const unitEvents = (unidadId: string): CalEvent[] => [
    ...reservas
      .filter((r) => r.unidad_id === unidadId)
      .map((r) => ({ kind: 'reserva' as const, data: r })),
    ...bloqueos
      .filter((b) => b.unidad_id === unidadId)
      .map((b) => ({ kind: 'bloqueo' as const, data: b })),
  ]

  return (
    <div className="overflow-auto">
      <div className="min-w-[1200px]">
        <div
          className="grid border-b border-slate-700 bg-[#0b1728]"
          style={{
            gridTemplateColumns: `240px repeat(${days.length}, minmax(44px, 1fr))`,
          }}
        >
          <div className="border-r border-slate-700 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Unidad
          </div>

          {days.map((day) => {
            const isSel = selected ? isSameDay(selected, day) : false
            const isToday = isSameDay(day, startOfToday())

            return (
              <button
                key={day.toISOString()}
                onClick={() => onSelectDay(selected && isSameDay(selected, day) ? null : day)}
                className={`border-r border-slate-800 px-1 py-3 text-center text-[10px] font-bold transition-all ${
                  isSel ? 'bg-sky-500/15 text-sky-200' : 'text-slate-400 hover:bg-[#0f1b2d]'
                }`}
              >
                <div className={isToday ? 'text-sky-300' : ''}>{format(day, 'd')}</div>
                <div className="text-[9px] opacity-70">
                  {format(day, 'EEE', { locale: es })}
                </div>
              </button>
            )
          })}
        </div>

        {unidades.map((u) => {
          const events = unitEvents(u.id)

          return (
            <div
              key={u.id}
              className="grid border-b border-slate-800"
              style={{
                gridTemplateColumns: `240px repeat(${days.length}, minmax(44px, 1fr))`,
              }}
            >
              <div className="border-r border-slate-700 px-4 py-4">
                <div className="text-sm font-semibold text-slate-200">{u.nombre}</div>
              </div>

              {days.map((day) => {
                const ev = events.find((e) => occupiesDay(e, day))
                const c = ev ? eventColor(ev) : null
                const showLabel = ev && isSameDay(day, parseISO(eventStart(ev)))
                const isSel = selected ? isSameDay(selected, day) : false

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => onSelectDay(selected && isSameDay(selected, day) ? null : day)}
                    className={`h-14 border-r border-slate-800 text-left transition-all ${
                      ev ? `${c?.bg} ${c?.text}` : 'bg-[#08111f] hover:bg-[#0b1728]'
                    } ${isSel ? 'ring-2 ring-inset ring-sky-400' : ''}`}
                    title={ev ? eventLabel(ev, unidadesMap) : ''}
                  >
                    {ev && (
                      <div className="truncate px-1 py-1 text-[9px] font-bold">
                        {showLabel ? eventLabel(ev, unidadesMap) : ''}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tarjeta de evento en el sidebar ──────────────────────────────────────────
function EventCard({
  ev,
  unidadNombre,
}: {
  ev: CalEvent
  unidadNombre?: string
}) {
  const c = eventColor(ev)

  if (ev.kind === 'reserva') {
    const r = ev.data

    return (
      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-[#0f1b2d]">
        <div className={`flex items-center justify-between px-4 py-2 ${c.bg}`}>
          <span className={`text-xs font-bold ${c.text}`}>
            {getReservationDisplayCode(r)} · {safeGuestName(r)}
          </span>
          {unidadNombre && (
            <span className={`text-[10px] font-semibold ${c.text} opacity-90`}>
              {unidadNombre}
            </span>
          )}
        </div>

        <div className="space-y-2 px-4 py-3 text-xs">
          {unidadNombre && <InfoRow label="Unidad" value={unidadNombre} />}
          <InfoRow
            label="Fechas"
            value={`${fmtDate(r.fecha_entrada)} → ${fmtDate(r.fecha_salida)} · ${r.noches ?? ''} noches`}
          />
          <InfoRow label="Huéspedes" value={`${r.num_huespedes} personas`} />
          <InfoRow
            label="Total"
            value={`${Number(r.importe_total ?? 0).toLocaleString('es-ES')} €`}
          />
          <InfoRow
            label="Estado"
            value={
              r.estado === 'CONFIRMED'
                ? 'Confirmada'
                : r.estado === 'PENDING_PAYMENT'
                  ? 'Pdte. pago'
                  : r.estado
            }
          />
          {r.email_cliente && <InfoRow label="Email" value={r.email_cliente} />}
          {r.telefono_cliente && <InfoRow label="Tel." value={r.telefono_cliente} />}
        </div>

        <div className="px-4 pb-3">
          <Link
            to={`/admin/reservas/${r.id}`}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-500 py-2 text-xs font-bold text-[#07111f] transition-all hover:bg-sky-400"
          >
            Ver reserva completa <ExternalLink size={11} />
          </Link>
        </div>
      </div>
    )
  }

  const b = ev.data
  const linkedReservation = b.linkedReservation
  const isRental = b.origen === 'RENTAL'

  const origenLabel =
    linkedReservation
      ? 'Reserva confirmada'
      : isRental
        ? 'Media / Larga estancia'
        : b.origen?.includes('BOOKING')
          ? 'Bloqueo Booking.com (iCal)'
          : b.origen?.includes('AIRBNB')
            ? 'Bloqueo Airbnb (iCal)'
            : b.origen?.includes('ESCAPADARURAL')
              ? 'Bloqueo Escapada Rural (iCal)'
              : 'Bloqueo manual'

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700 bg-[#0f1b2d]">
      <div className={`flex items-center gap-2 px-4 py-2 ${c.bg}`}>
        <Lock size={11} className={c.text} />
        <span className={`text-xs font-bold ${c.text}`}>{origenLabel}</span>
      </div>

      <div className="space-y-2 px-4 py-3 text-xs">
        {unidadNombre && <InfoRow label="Unidad" value={unidadNombre} />}
        <InfoRow label="Desde" value={fmtDate(b.fecha_inicio)} />
        <InfoRow label="Hasta" value={fmtDate(b.fecha_fin)} />

        {linkedReservation ? (
          <>
            <InfoRow label="Código" value={getReservationDisplayCode(linkedReservation)} />
            <InfoRow label="Cliente" value={safeGuestName(linkedReservation)} />
          </>
        ) : isRental ? (
          <>
            {b.linkedRental?.cliente_nombre && (
              <InfoRow label="Inquilino" value={b.linkedRental.cliente_nombre} />
            )}
            {b.linkedRental?.numero_contrato && (
              <InfoRow label="Contrato" value={b.linkedRental.numero_contrato} />
            )}
          </>
        ) : (
          b.motivo && !b.motivo.startsWith('RENTAL:') && (
            <InfoRow label="Motivo" value={b.motivo} />
          )
        )}

        {b.uid_ical && (
          <div className="flex items-center gap-1 pt-1 text-slate-400">
            <Wifi size={10} />
            <span>Importado por iCal</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal bloqueo manual ─────────────────────────────────────────────────────
function BlockModal({
  propertyId,
  unidadId,
  unidades,
  viewMode,
  onClose,
  onSaved,
}: {
  propertyId: string | null
  unidadId: string | null
  unidades: UnidadOption[]
  viewMode: ViewMode
  onClose: () => void
  onSaved: () => void
}) {
  const defaultScope: BlockScope = viewMode === 'global' ? 'global' : 'individual'
  const [action, setAction] = useState<BlockAction>('block')
  const [scope, setScope] = useState<BlockScope>(defaultScope)
  const [selectedUnitId, setSelectedUnitId] = useState<string>(unidadId ?? unidades[0]?.id ?? '')
  const [form, setForm] = useState({ fecha_inicio: '', fecha_fin: '', motivo: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  useEffect(() => {
    if (!selectedUnitId && unidades[0]?.id) {
      setSelectedUnitId(unidades[0].id)
    }
  }, [selectedUnitId, unidades])

  const noches =
    form.fecha_inicio && form.fecha_fin
      ? differenceInDays(parseISO(form.fecha_fin), parseISO(form.fecha_inicio))
      : 0

  async function save() {
    if (!form.fecha_inicio || !form.fecha_fin || noches <= 0) {
      setError('Las fechas no son válidas.')
      return
    }

    if (!propertyId) {
      setError('Configuración no cargada, recarga la página.')
      return
    }

    if (scope === 'individual' && !selectedUnitId) {
      setError('Selecciona una unidad.')
      return
    }

    setSaving(true)
    setError(null)
    setInfo(null)

    try {
      if (action === 'block') {
        const targetUnitIds =
          scope === 'global'
            ? unidades.map((u) => u.id)
            : selectedUnitId
              ? [selectedUnitId]
              : []

        if (targetUnitIds.length === 0) {
          throw new Error('No hay unidades disponibles para aplicar el bloqueo.')
        }

        const rows = targetUnitIds.map((targetUnitId) => ({
          property_id: propertyId,
          unidad_id: targetUnitId,
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin,
          motivo: form.motivo.trim() || null,
          origen: 'ADMIN',
        }))

        const { error: err } = await supabase.from('bloqueos').insert(rows)

        if (err) throw err

        onSaved()
        return
      }

      const targetUnitIds =
        scope === 'global'
          ? unidades.map((u) => u.id)
          : selectedUnitId
            ? [selectedUnitId]
            : []

      if (targetUnitIds.length === 0) {
        throw new Error('No hay unidades seleccionadas para desbloquear.')
      }

      const { data: matches, error: searchError } = await supabase
        .from('bloqueos')
        .select('id,unidad_id,fecha_inicio,fecha_fin,origen')
        .eq('property_id', propertyId)
        .eq('origen', 'ADMIN')
        .in('unidad_id', targetUnitIds)
        .lt('fecha_inicio', form.fecha_fin)
        .gt('fecha_fin', form.fecha_inicio)

      if (searchError) throw searchError

      const typedMatches = (matches ?? []) as Array<{
        id: string
        unidad_id: string | null
        fecha_inicio: string
        fecha_fin: string
        origen: string | null
      }>

      const idsToDelete = typedMatches.map((m) => m.id)

      if (idsToDelete.length === 0) {
        setInfo('No se han encontrado bloqueos manuales que coincidan con ese rango.')
        setSaving(false)
        return
      }

      const { error: deleteError } = await supabase
        .from('bloqueos')
        .delete()
        .in('id', idsToDelete)

      if (deleteError) throw deleteError

      onSaved()
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo completar la operación.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-[#08111f] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-5">
          <h3 className="font-bold text-slate-50">Bloqueo manual</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#0f1b2d]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Acción
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAction('block')}
                className={`rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                  action === 'block'
                    ? 'bg-emerald-500 text-[#07111f]'
                    : 'bg-[#0f1b2d] text-slate-300 hover:bg-[#16263a]'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Lock size={14} />
                  Bloquear
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAction('unblock')}
                className={`rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                  action === 'unblock'
                    ? 'bg-amber-400 text-[#07111f]'
                    : 'bg-[#0f1b2d] text-slate-300 hover:bg-[#16263a]'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Unlock size={14} />
                  Desbloquear
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Alcance
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope('global')}
                className={`rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                  scope === 'global'
                    ? 'bg-sky-500 text-[#07111f]'
                    : 'bg-[#0f1b2d] text-slate-300 hover:bg-[#16263a]'
                }`}
              >
                Global · todas
              </button>

              <button
                type="button"
                onClick={() => setScope('individual')}
                className={`rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                  scope === 'individual'
                    ? 'bg-sky-500 text-[#07111f]'
                    : 'bg-[#0f1b2d] text-slate-300 hover:bg-[#16263a]'
                }`}
              >
                Individual
              </button>
            </div>
          </div>

          {scope === 'individual' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Unidad</label>
              <select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className={inputCls}
              >
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Desde</label>
              <input
                type="date"
                value={form.fecha_inicio}
                onChange={(e) => set('fecha_inicio', e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Hasta</label>
              <input
                type="date"
                value={form.fecha_fin}
                onChange={(e) => set('fecha_fin', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {noches > 0 && (
            <p className="text-xs text-slate-400">
              {scope === 'global'
                ? `${noches} noches · ${action === 'block' ? 'afectará a todas las unidades visibles' : 'buscará bloqueos manuales en todas las unidades'}`
                : `${noches} noches`}
            </p>
          )}

          {noches <= 0 && form.fecha_inicio && form.fecha_fin && (
            <p className="text-xs text-red-300">
              La fecha fin debe ser posterior a la de inicio.
            </p>
          )}

          {action === 'block' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Motivo (opcional)</label>
              <input
                type="text"
                value={form.motivo}
                onChange={(e) => set('motivo', e.target.value)}
                placeholder="Obras, mantenimiento…"
                className={inputCls}
              />
            </div>
          )}

          {action === 'unblock' && (
            <div className="rounded-2xl border border-slate-700 bg-[#0f1b2d] px-4 py-3 text-xs text-slate-300">
              Solo se eliminarán bloqueos con origen <span className="font-bold text-slate-100">ADMIN</span>.
              Los bloqueos importados por iCal no se tocan.
            </div>
          )}

          {error && <p className="text-xs text-red-300">{error}</p>}
          {info && <p className="text-xs text-amber-300">{info}</p>}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-600 py-3 text-sm font-bold text-slate-300 transition-all hover:bg-[#0f1b2d]"
            >
              Cancelar
            </button>

            <button
              onClick={save}
              disabled={saving}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-all disabled:opacity-50 ${
                action === 'block'
                  ? 'bg-emerald-500 text-[#07111f] hover:bg-emerald-400'
                  : 'bg-amber-400 text-[#07111f] hover:bg-amber-300'
              }`}
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : action === 'block' ? (
                <Lock size={14} />
              ) : (
                <Unlock size={14} />
              )}

              {saving
                ? 'Guardando…'
                : action === 'block'
                  ? 'Bloquear fechas'
                  : 'Desbloquear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────
const inputCls =
  'w-full rounded-2xl border border-slate-600 bg-[#0f1b2d] px-3 py-2.5 text-sm text-slate-100 placeholder-slate-400 transition-all focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20'

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="shrink-0 text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-200">{value}</span>
    </div>
  )
}
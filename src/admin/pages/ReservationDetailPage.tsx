import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Calendar, CalendarDays, Users, Mail, Phone, FileText,
  AlertCircle, Loader2, Copy, Check, Send, Edit2, Ban,
  CreditCard, ClipboardList, UserCheck, RefreshCw,
  ArrowRight, TrendingUp, TrendingDown, Minus
} from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../integrations/supabase/client'
import { bookingService } from '../../services/booking.service'
import { configService, PricingConfig, getPricingForDate } from '../../services/config.service'
import { useAdminTenant } from '../context/AdminTenantContext'
import { PriceBreakdown } from '../../shared/types/booking'
import { ManualPaymentModal } from '../components/ManualPaymentModal'
import { ModalSolicitudPago } from '../components/ModalSolicitudPago'
import { ModalConfirmacionReserva } from '../components/ModalConfirmacionReserva'

// ─── Tipo ──────────────────────────────────────────────────────────────────────
interface Reserva {
  id: string
  codigo: string | null
  nombre_cliente: string | null
  apellidos_cliente: string | null
  email_cliente: string | null
  telefono_cliente: string | null
  nif_cliente: string | null
  fecha_entrada: string
  fecha_salida: string
  num_huespedes: number | null
  noches: number | null
  tarifa: string | null
  importe_alojamiento: number | null
  importe_extras: number | null
  importe_limpieza: number | null
  descuento_aplicado: number | null
  importe_total: number | null
  importe_senal: number | null
  estado: string
  estado_pago: string
  origen: string | null
  stripe_session_id: string | null
  stripe_payment_intent: string | null
  notas_admin: string | null
  solicitud_cambio: string | null
  token_cliente: string | null
  created_at: string
  updated_at: string | null

  // legacy v1
  nombre: string | null
  apellidos: string | null
  email: string | null
  telefono: string | null
  dni: string | null
  menores: number | null
  temporada: string | null
  precio_noche: number | null
  importe_extra: number | null
  descuento: number | null
  total: number | null
  importe_pagado: number | null
}

interface Huesped {
  id: string
  nombre: string
  apellidos: string
  tipo_documento: string
  numero_documento: string
  fecha_nacimiento: string
  sexo: string
  nacionalidad: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const ESTADO_STYLE: Record<string, string> = {
  CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING_PAYMENT: 'bg-amber-50 text-amber-700 border-amber-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  EXPIRED: 'bg-slate-100 text-slate-500 border-slate-200',
  NO_SHOW: 'bg-slate-100 text-slate-500 border-slate-200',
}

const ESTADO_LABEL: Record<string, string> = {
  CONFIRMED: 'Confirmada',
  PENDING_PAYMENT: 'Pdte. de pago',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
  NO_SHOW: 'No presentado',
}

const PAGO_LABEL: Record<string, string> = {
  UNPAID: 'Sin pagar',
  PARTIAL: 'Señal pagada',
  PAID: 'Pagado completo',
  REFUNDED: 'Devuelto',
}

const PAGO_STYLE: Record<string, string> = {
  UNPAID: 'bg-slate-100 text-slate-500',
  PARTIAL: 'bg-blue-50 text-blue-700',
  PAID: 'bg-emerald-50 text-emerald-700',
  REFUNDED: 'bg-violet-50 text-violet-700',
}

const ORIGEN_LABEL: Record<string, string> = {
  DIRECT_WEB: 'Web directa',
  BOOKING_ICAL: 'Booking.com',
  AIRBNB_ICAL: 'Airbnb',
  ESCAPADARURAL_ICAL: 'Escapada Rural',
  ADMIN: 'Admin',
}

function fmtDate(d: string) {
  return format(parseISO(d), "d 'de' MMMM yyyy", { locale: es })
}

function fmtShort(d: string) {
  return format(parseISO(d), 'd MMM yyyy', { locale: es })
}

function n(value: unknown): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function s(value: unknown, fallback = '—'): string {
  if (typeof value === 'string' && value.trim()) return value
  return fallback
}

function fmtMoney(value: unknown): string {
  return `${n(value).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`
}

function fallbackCodigo(id: string, codigo: string | null | undefined) {
  if (codigo && codigo.trim()) return codigo
  return `R-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

// ─── Componente principal ─────────────────────────────────────────────────────
export const ReservationDetailPage: React.FC = () => {
  const { property_id } = useAdminTenant()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [r, setR] = useState<Reserva | null>(null)
  const [huespedes, setHuespedes] = useState<Huesped[]>([])
  const [loading, setLoading] = useState(true)
  const [notasEdit, setNotasEdit] = useState('')
  const [savingNotas, setSavingNotas] = useState(false)
  const [notasSaved, setNotasSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null)
  const [sendingCheckin, setSendingCheckin] = useState(false)
  const [checkinSent, setCheckinSent] = useState(false)
  const [showManualPayment, setShowManualPayment] = useState(false)
  const [showSolicitudPago, setShowSolicitudPago] = useState(false)
  const [showConfirmacion, setShowConfirmacion] = useState(false)
  const [sendingConfirmacion, setSendingConfirmacion] = useState(false)
  const [confirmacionSent, setConfirmacionSent] = useState(false)

  useEffect(() => {
    configService
      .getConfig(property_id)
      .then((cfg) => setPricingConfig(getPricingForDate(new Date(), cfg)))
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)

    const [{ data: res }, { data: hues }] = await Promise.all([
      supabase.from('reservas').select('*').eq('id', id).single(),
      supabase.from('huespedes').select('*').eq('reserva_id', id),
    ])

    if (res) {
      setR(res as Reserva)
      setNotasEdit((res as Reserva).notas_admin ?? '')
    }

    setHuespedes((hues as Huesped[]) ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function saveNotas() {
    if (!r) return
    setSavingNotas(true)

    await supabase
      .from('reservas')
      .update({ notas_admin: notasEdit || null })
      .eq('id', r.id)

    setSavingNotas(false)
    setNotasSaved(true)
    setTimeout(() => setNotasSaved(false), 2000)

    setR((prev) => (prev ? { ...prev, notas_admin: notasEdit || null } : prev))
  }

  async function cancelar() {
    if (!r || !window.confirm('¿Confirmas la cancelación de esta reserva?')) return
    setCancelling(true)

    const { data, error: err } = await supabase.functions.invoke('cancel-reservation', {
      body: {
        reservaId:   r.id,
        cancelledBy: 'admin',
        reason:      'Cancelado desde el panel de administración',
        importeReembolsoOverride: 0,
      },
    })

    setCancelling(false)

    if (err) {
      alert(`Error al cancelar: ${err.message}`)
      return
    }

    if (data?.stripe_refund_error) {
      alert(data.message ?? 'Reserva cancelada. El reembolso en Stripe debe gestionarse manualmente.')
    }

    setR((prev) => (prev ? { ...prev, estado: 'CANCELLED' } : prev))
  }

  function copyLink() {
    if (!r?.token_cliente) return
    navigator.clipboard.writeText(`${window.location.origin}/reserva/${r.token_cliente}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function sendCheckinEmail() {
    if (!r?.token_cliente) return
    setSendingCheckin(true)

    const checkinUrl = `${window.location.origin}/reserva/${r.token_cliente}`
    const toEmail = s(r.email_cliente ?? r.email, '')
    const toNombre = `${s(r.nombre_cliente ?? r.nombre, '')} ${s(r.apellidos_cliente ?? r.apellidos, '')}`.trim()

    await supabase.functions.invoke('send-email', {
      body: {
        template_key: 'checkin_link',
        to_email: toEmail,
        to_name: toNombre,
        reservation_id: r.id,
        extra_vars: { checkin_url: checkinUrl },
      },
    })

    setSendingCheckin(false)
    setCheckinSent(true)
    setTimeout(() => setCheckinSent(false), 3000)
  }

  async function sendConfirmacionEmail() {
    if (!r) return
    setSendingConfirmacion(true)

    const toEmail = s(r.email_cliente ?? r.email, '')
    const toNombre = `${s(r.nombre_cliente ?? r.nombre, '')} ${s(r.apellidos_cliente ?? r.apellidos, '')}`.trim()

    await supabase.functions.invoke('send-email', {
      body: {
        template_key: 'reservation_confirmed',
        to_email: toEmail,
        to_name: toNombre,
        reservation_id: r.id,
      },
    })

    setSendingConfirmacion(false)
    setConfirmacionSent(true)
    setTimeout(() => setConfirmacionSent(false), 3000)
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!r) {
    return (
      <div className="space-y-4 py-20 text-center">
        <AlertCircle className="mx-auto text-red-400" size={48} />
        <h2 className="text-2xl font-bold text-slate-900">Reserva no encontrada</h2>
        <p className="text-slate-500">El ID no existe o no tienes acceso.</p>
        <button
          onClick={() => navigate('/admin/reservas')}
          className="mt-4 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white"
        >
          Volver a reservas
        </button>
      </div>
    )
  }

  const isFlexible = r.tarifa === 'FLEXIBLE'
  const isActive = r.estado === 'CONFIRMED' || (r.estado === 'PENDING_PAYMENT' && r.estado_pago !== 'UNPAID')

  const nombre = s(r.nombre_cliente ?? r.nombre, '')
  const apellidos = s(r.apellidos_cliente ?? r.apellidos, '')
  const email = s(r.email_cliente ?? r.email, '')
  const telefono = r.telefono_cliente ?? r.telefono ?? null
  const dni = r.nif_cliente ?? r.dni ?? null
  const origenStr = r.origen ?? ''

  const noches = n(r.noches)
  const numHuespedes = n(r.num_huespedes)
  const menores = n(r.menores)
  const precioNoche =
    n(r.precio_noche) > 0
      ? n(r.precio_noche)
      : noches > 0
        ? n(r.importe_alojamiento) / noches
        : 0

  const importeAlojamiento = n(r.importe_alojamiento)
  const importeExtra = n(r.importe_extras ?? r.importe_extra)
  const importeLimpieza = n(r.importe_limpieza)
  const descuento = n(r.descuento_aplicado ?? r.descuento)
  const total = n(r.importe_total ?? r.total)
  const importeSenal = n(r.importe_senal)
  const importePagado = Math.max(n(r.importe_pagado), importeSenal)
  const codigoReserva = fallbackCodigo(r.id, r.codigo)

  const restoPendiente =
    isFlexible && total > 0
      ? Math.max(0, total - importePagado)
      : 0

  const iniciales = `${(nombre[0] ?? '?')}${(apellidos[0] ?? '?')}`

  const modalReserva = {
    id: r.id,
    codigo: codigoReserva,
    nombre,
    apellidos,
    email,
    total,
    importe_pagado: importePagado,
    estado_pago: r.estado_pago,
    tarifa: r.tarifa ?? '',
    noches,
    num_huespedes: numHuespedes,
    fecha_entrada: r.fecha_entrada,
    fecha_salida: r.fecha_salida,
    token_cliente: r.token_cliente ?? null,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/reservas')}
            className="rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {nombre} {apellidos}
              </h1>

              <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-500">
                {codigoReserva}
              </span>

              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  ESTADO_STYLE[r.estado] ?? 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                {ESTADO_LABEL[r.estado] ?? r.estado}
              </span>
            </div>

            <p className="mt-0.5 text-xs text-slate-400">
              Creada el {fmtShort(r.created_at)} · Origen: {ORIGEN_LABEL[origenStr] ?? origenStr}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={load}
            className="rounded-lg border border-slate-300 p-2 text-slate-400 transition-all hover:bg-slate-50"
          >
            <RefreshCw size={14} />
          </button>

          {isActive && (
            <button
              onClick={sendConfirmacionEmail}
              disabled={sendingConfirmacion || confirmacionSent}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-all ${
                confirmacionSent
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50'
              }`}
            >
              {confirmacionSent ? (
                <><Check size={14} /> Enviada</>
              ) : sendingConfirmacion ? (
                <><Loader2 size={14} className="animate-spin" /> Enviando...</>
              ) : (
                <><Mail size={14} /> Enviar confirmación</>
              )}
            </button>
          )}

          {isActive && (
            <button
              onClick={sendCheckinEmail}
              disabled={sendingCheckin || checkinSent}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-all ${
                checkinSent
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50'
              }`}
            >
              {checkinSent ? (
                <><Check size={14} /> Email enviado</>
              ) : sendingCheckin ? (
                <><Loader2 size={14} className="animate-spin" /> Enviando...</>
              ) : (
                <><Send size={14} /> Enviar check-in</>
              )}
            </button>
          )}

          {isActive && (
            <button
              onClick={() => setShowConfirmacion(true)}
              disabled={r.estado_pago === 'PAID'}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CreditCard size={14} />
              {r.estado_pago === 'PAID' ? 'Reserva pagada' : 'Enviar solicitud de pago'}
            </button>
          )}

          {r.estado !== 'CANCELLED' && r.estado !== 'EXPIRED' && (
            <button
              onClick={cancelar}
              disabled={cancelling}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 shadow-sm transition-all hover:bg-red-50 disabled:opacity-50"
            >
              {cancelling ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
              Cancelar
            </button>
          )}

          <Link
            to="/admin/reservas"
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700"
          >
            <Edit2 size={14} />
            Editar desde lista
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Columna principal ─────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Fechas */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-6 py-4">
              <Calendar size={15} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Estancia</h3>
            </div>

            <div className="grid grid-cols-3 gap-4 p-6">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Check-in
                </p>
                <p className="font-bold text-slate-900">{fmtDate(r.fecha_entrada)}</p>
                <p className="mt-0.5 text-xs text-slate-400">A partir de las 16:00 h</p>
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
                  {noches} noches
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Check-out
                </p>
                <p className="font-bold text-slate-900">{fmtDate(r.fecha_salida)}</p>
                <p className="mt-0.5 text-xs text-slate-400">Antes de las 12:00 h</p>
              </div>
            </div>

            <div className="flex items-center gap-6 border-t border-slate-100 px-6 py-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Users size={14} className="text-slate-400" />
                <span>
                  <strong>{numHuespedes}</strong> huéspedes
                </span>
                {menores > 0 && (
                  <span className="text-slate-400">
                    ({menores} menor{menores > 1 ? 'es' : ''})
                  </span>
                )}
              </div>

              <div className="text-slate-400">·</div>

              <span className="text-slate-600">
                Temporada <strong>{r.temporada === 'ALTA' ? 'Alta' : 'Base'}</strong>
              </span>

              <div className="text-slate-400">·</div>

              <span
                className={`font-semibold ${
                  isFlexible ? 'text-emerald-600' : 'text-amber-700'
                }`}
              >
                {isFlexible ? 'Tarifa flexible' : 'No reembolsable'}
              </span>
            </div>
          </div>

          {/* Desglose de precios */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <CreditCard size={15} className="text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-700">Desglose económico</h3>
              </div>

              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  PAGO_STYLE[r.estado_pago] ?? 'bg-slate-100 text-slate-500'
                }`}
              >
                {PAGO_LABEL[r.estado_pago] ?? r.estado_pago}
              </span>
            </div>

            <div className="space-y-3 p-6">
              <PriceRow
                label={`Alojamiento (${noches} noches × ${precioNoche.toLocaleString('es-ES', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} €)`}
                value={importeAlojamiento}
              />

              {importeExtra > 0 && (
                <PriceRow label="Suplemento huésped extra" value={importeExtra} />
              )}

              <PriceRow label="Tarifa de limpieza" value={importeLimpieza} />

              {descuento > 0 && (
                <PriceRow
                  label="Descuento no reembolsable (−10%)"
                  value={-descuento}
                  negative
                />
              )}

              <div className="flex items-baseline justify-between border-t border-slate-100 pt-3">
                <span className="font-bold text-slate-900">Total reserva</span>
                <span className="text-2xl font-bold text-slate-900">
                  {total.toLocaleString('es-ES', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  €
                </span>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                {isFlexible && importePagado > 0 ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-slate-600">
                          {importeSenal > 0 ? 'Señal pagada' : 'Importe cobrado'}
                        </span>
                      </div>
                      <span className="font-bold text-emerald-700">
                        {importePagado.toLocaleString('es-ES', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        €
                      </span>
                    </div>

                    {restoPendiente > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-400" />
                          <span className="text-slate-600">Resto pendiente</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-bold text-amber-700">
                            {restoPendiente.toLocaleString('es-ES', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            €
                          </span>

                          <button
                            onClick={() => setShowManualPayment(true)}
                            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-brand-700"
                          >
                            <CreditCard size={12} />
                            Cobrar
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : importePagado > 0 ? (
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-slate-600">Importe cobrado</span>
                    </div>
                    <span className="font-bold text-emerald-700">
                      {importePagado.toLocaleString('es-ES', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      €
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Huéspedes registrados */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <UserCheck size={15} className="text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-700">
                  Huéspedes registrados (RD 933/2021)
                </h3>
              </div>

              <span className="text-xs text-slate-400">
                {huespedes.length} / {numHuespedes}
              </span>
            </div>

            {huespedes.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <ClipboardList className="mx-auto mb-3 text-slate-200" size={32} />
                <p className="text-sm text-slate-400">
                  Aún no se han registrado los huéspedes.
                </p>

                {r.token_cliente && r.estado === 'CONFIRMED' && (
                  <button
                    onClick={copyLink}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50"
                  >
                    <Send size={12} />
                    Enviar enlace al cliente
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {huespedes.map((h, i) => (
                  <div
                    key={h.id}
                    className="flex items-start justify-between gap-4 px-6 py-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {s(h.nombre, '')} {s(h.apellidos, '')}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {s(h.tipo_documento)} {s(h.numero_documento)} ·{' '}
                        {h.fecha_nacimiento
                          ? format(parseISO(h.fecha_nacimiento), 'd MMM yyyy', {
                              locale: es,
                            })
                          : '—'}{' '}
                        · {s(h.sexo)} · {s(h.nacionalidad)}
                      </p>
                    </div>

                    <span className="shrink-0 text-[10px] text-slate-400">#{i + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Solicitud de cambio */}
          {r.solicitud_cambio && (
            <CambioFechasPanel reserva={r} config={pricingConfig} onApplied={load} />
          )}

          {/* Notas internas */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-6 py-4">
              <FileText size={15} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Notas internas</h3>
            </div>

            <div className="space-y-3 p-6">
              <textarea
                value={notasEdit}
                onChange={(e) => setNotasEdit(e.target.value)}
                rows={3}
                placeholder="Añade notas privadas sobre esta reserva…"
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-brand-400 focus:outline-none"
              />

              <button
                onClick={saveNotas}
                disabled={savingNotas}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  notasSaved
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'bg-brand-600 text-white hover:bg-brand-700'
                } disabled:opacity-50`}
              >
                {savingNotas ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : notasSaved ? (
                  <Check size={12} />
                ) : null}

                {notasSaved ? 'Guardado' : savingNotas ? 'Guardando…' : 'Guardar notas'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Datos del titular */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-4">
              <Users size={14} className="text-slate-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Titular
              </h3>
            </div>

            <div className="space-y-3 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-base font-bold text-slate-500">
                  {iniciales}
                </div>

                <div>
                  <p className="font-bold text-slate-900">
                    {nombre} {apellidos}
                  </p>
                  {dni && <p className="text-xs text-slate-400">{dni}</p>}
                </div>
              </div>

              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-slate-900"
                >
                  <Mail size={14} className="shrink-0 text-slate-400" />
                  <span className="truncate">{email}</span>
                </a>
              )}

              {telefono && (
                <a
                  href={`tel:${telefono}`}
                  className="flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-slate-900"
                >
                  <Phone size={14} className="shrink-0 text-slate-400" />
                  {telefono}
                </a>
              )}
            </div>
          </div>

          {/* Pago e identificadores */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-4">
              <CreditCard size={14} className="text-slate-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pago
              </h3>
            </div>

            <div className="space-y-2 p-5 text-xs">
              <SideRow label="Estado" value={PAGO_LABEL[r.estado_pago] ?? r.estado_pago} />

              {importePagado > 0 && (
                <SideRow label="Cobrado" value={fmtMoney(importePagado)} bold />
              )}

              {isFlexible && importeSenal > 0 && (
                <SideRow label="Señal" value={fmtMoney(importeSenal)} />
              )}

              {r.stripe_payment_intent && (
                <div className="border-t border-slate-100 pt-2">
                  <p className="mb-1 text-slate-400">Payment Intent</p>
                  <p className="break-all font-mono text-[10px] text-slate-600">
                    {r.stripe_payment_intent}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Acciones
              </h3>
            </div>

            <div className="space-y-1 p-3">
              {r.token_cliente && (
                <button
                  onClick={copyLink}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50"
                >
                  {copied ? (
                    <Check size={16} className="text-emerald-500" />
                  ) : (
                    <Copy size={16} className="text-slate-400" />
                  )}
                  Copiar enlace del cliente
                </button>
              )}

              <Link
                to="/admin/reservas"
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50"
              >
                <Edit2 size={16} className="text-slate-400" />
                Editar reserva
              </Link>

              {r.estado !== 'CANCELLED' && r.estado !== 'EXPIRED' && (
                <button
                  onClick={cancelar}
                  disabled={cancelling}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 disabled:opacity-50"
                >
                  <Ban size={16} />
                  Cancelar reserva
                </button>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 text-xs shadow-sm">
            <SideRow label="Creada" value={fmtShort(r.created_at)} />
            {r.updated_at && <SideRow label="Modificada" value={fmtShort(r.updated_at)} />}
            <SideRow label="Código" value={codigoReserva} mono />
          </div>
        </div>
      </div>

      {showManualPayment && (
        <ManualPaymentModal
          reserva={modalReserva}
          onClose={() => setShowManualPayment(false)}
          onSuccess={() => {
            setShowManualPayment(false)
            load()
          }}
        />
      )}

      {showSolicitudPago && (
        <ModalSolicitudPago
          reserva={modalReserva}
          onClose={() => setShowSolicitudPago(false)}
          onSuccess={() => {
            setShowSolicitudPago(false)
            load()
          }}
        />
      )}

      {showConfirmacion && (
        <ModalConfirmacionReserva
          reserva={modalReserva}
          onClose={() => setShowConfirmacion(false)}
          onSuccess={() => {
            setShowConfirmacion(false)
            load()
          }}
        />
      )}
    </div>
  )
}

// ─── Helper: parsea el campo solicitud_cambio ──────────────────────────────────
function parseSolicitudCambio(solicitud: string) {
  const parts = solicitud.split('|')
  if (parts.length < 3) return null

  const nuevaEntrada = parts[0]
  const nuevaSalida = parts[1]
  const timestamp = parts[parts.length - 1]
  const mensaje = parts.slice(2, -1).join('|') || ''

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(nuevaEntrada) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(nuevaSalida)
  ) {
    return null
  }

  return { nuevaEntrada, nuevaSalida, mensaje, timestamp }
}

// ─── CambioFechasPanel ────────────────────────────────────────────────────────
interface CambioFechasPanelProps {
  reserva: Reserva
  config: PricingConfig | null
  onApplied: () => void
}

function CambioFechasPanel({ reserva, config, onApplied }: CambioFechasPanelProps) {
  const parsed = parseSolicitudCambio(reserva.solicitud_cambio ?? '')

  const [nuevaEntrada, setNuevaEntrada] = useState(parsed?.nuevaEntrada ?? '')
  const [nuevaSalida, setNuevaSalida] = useState(parsed?.nuevaSalida ?? '')
  const [useNewPrice, setUseNewPrice] = useState(true)
  const [nota, setNota] = useState('')
  const [applying, setApplying] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [done, setDone] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  const newBreakdown = useMemo<PriceBreakdown | null>(() => {
    if (!nuevaEntrada || !nuevaSalida || nuevaSalida <= nuevaEntrada) return null
    try {
      const checkIn = parseISO(nuevaEntrada)
      const checkOut = parseISO(nuevaSalida)
      const rateType = reserva.tarifa === 'FLEXIBLE' ? 'FLEXIBLE' : 'NON_REFUNDABLE'
      return bookingService.calculatePrice(
        checkIn,
        checkOut,
        n(reserva.num_huespedes),
        rateType as any,
        config
      )
    } catch {
      return null
    }
  }, [nuevaEntrada, nuevaSalida, reserva.num_huespedes, reserva.tarifa, config])

  const nuevasNoches =
    nuevaEntrada && nuevaSalida && nuevaSalida > nuevaEntrada
      ? differenceInDays(parseISO(nuevaSalida), parseISO(nuevaEntrada))
      : 0

  const newIsHighSeason = nuevaEntrada
    ? [6, 7].includes(parseISO(nuevaEntrada).getMonth())
    : false

  const importe_pagado = Math.max(n(reserva.importe_pagado), n(reserva.importe_senal))
  const oldTotal = n(reserva.importe_total ?? reserva.total)
  const newTotal = n(newBreakdown?.total)
  const priceDiff = Math.round((newTotal - oldTotal) * 100) / 100
  const effectiveTotal = useNewPrice ? newTotal : oldTotal
  const saldo = importe_pagado - effectiveTotal
  const pendienteNuevo = Math.max(0, -saldo)
  const reembolsoNuevo = Math.max(0, saldo)
  const pendienteActual = Math.max(0, oldTotal - importe_pagado)

  const fmtEur = (value: number) =>
    value.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' €'

  const fmtFechaLarga = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  const handleDiscard = async () => {
    if (!window.confirm('¿Descartar esta solicitud sin aplicarla ni notificar al cliente?')) return
    setDiscarding(true)
    await supabase.from('reservas').update({ solicitud_cambio: null }).eq('id', reserva.id)
    setDiscarding(false)
    onApplied()
  }

  const handleApply = async () => {
    if (!newBreakdown || !nuevaEntrada || !nuevaSalida || nuevasNoches < 2) return

    setApplying(true)
    setApplyError(null)

    try {
      const updateData: Record<string, any> = {
        fecha_entrada: nuevaEntrada,
        fecha_salida: nuevaSalida,
        noches: nuevasNoches,
        solicitud_cambio: null,
        updated_at: new Date().toISOString(),
      }

      if (useNewPrice) {
        updateData.importe_alojamiento = newBreakdown.accommodationTotal
        updateData.importe_extras = newBreakdown.extraGuestsTotal
        updateData.descuento_aplicado = newBreakdown.discount
        updateData.importe_total = newBreakdown.total

        if (importe_pagado >= newBreakdown.total) updateData.estado_pago = 'PAID'
        else if (importe_pagado > 0) updateData.estado_pago = 'PARTIAL'
      }

      const { error: dbError } = await supabase
        .from('reservas')
        .update(updateData)
        .eq('id', reserva.id)

      if (dbError) throw dbError

      const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string
      const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string

      await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          template_key: 'date_change_confirmed',
          to_email: s(reserva.email_cliente ?? reserva.email, ''),
          to_name: `${s(reserva.nombre_cliente ?? reserva.nombre, '')} ${s(reserva.apellidos_cliente ?? reserva.apellidos, '')}`.trim(),
          reservation_id: reserva.id,
          extra_vars: {
            reserva_codigo: fallbackCodigo(reserva.id, reserva.codigo),
            old_check_in: fmtFechaLarga(reserva.fecha_entrada),
            old_check_out: fmtFechaLarga(reserva.fecha_salida),
            new_check_in: fmtFechaLarga(nuevaEntrada),
            new_check_out: fmtFechaLarga(nuevaSalida),
            new_noches: `${nuevasNoches}`,
            temporada_nueva: newIsHighSeason ? 'Alta' : 'Base',
            nuevo_total: fmtEur(effectiveTotal),
            importe_ya_pagado: fmtEur(importe_pagado),
            importe_pendiente: pendienteNuevo > 0 ? fmtEur(pendienteNuevo) : 'Ninguno',
            importe_reembolso: reembolsoNuevo > 0 ? fmtEur(reembolsoNuevo) : 'Ninguno',
            diferencia_precio: !useNewPrice
              ? 'Sin coste adicional — precio mantenido sin cambios'
              : priceDiff > 0
                ? `+${fmtEur(priceDiff)} (cambio de temporada o más noches)`
                : priceDiff < 0
                  ? `${fmtEur(priceDiff)} (fechas más económicas)`
                  : 'Sin diferencia de precio',
            nota_admin: nota.trim() || '',
          },
        }),
      }).catch(() => {})

      setDone(true)
      setTimeout(() => onApplied(), 2000)
    } catch {
      setApplyError('Error al guardar el cambio. Inténtalo de nuevo.')
    } finally {
      setApplying(false)
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
          <Check size={20} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-800">
            Cambio aplicado y email enviado al cliente
          </p>
          <p className="mt-0.5 text-xs text-emerald-600">
            Las fechas han sido actualizadas y se ha enviado la confirmación.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-amber-300 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays size={16} className="text-amber-600" />
          <h3 className="text-sm font-bold text-amber-800">Solicitud de cambio de fechas</h3>
          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
            Pendiente de gestionar
          </span>
        </div>

        <button
          onClick={handleDiscard}
          disabled={discarding || applying}
          className="text-xs text-slate-400 transition-colors hover:text-red-500 disabled:opacity-40"
        >
          {discarding ? 'Descartando…' : 'Descartar solicitud'}
        </button>
      </div>

      <div className="space-y-6 p-6">
        {parsed?.mensaje && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Mensaje del cliente
              {parsed.timestamp && (
                <span className="ml-2 font-normal normal-case">
                  ·{' '}
                  {new Date(parsed.timestamp).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </p>

            <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm italic text-slate-600">
              "{parsed.mensaje}"
            </p>
          </div>
        )}

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Fechas
          </p>

          <div className="grid grid-cols-[1fr_32px_1fr] items-start gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Actuales
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {fmtDate(reserva.fecha_entrada)}
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {fmtDate(reserva.fecha_salida)}
              </p>
              <p className="mt-1.5 text-xs text-slate-400">
                {n(reserva.noches)} noches ·{' '}
                {reserva.temporada === 'ALTA' ? 'Temp. alta' : 'Temp. base'}
              </p>
            </div>

            <div className="flex items-center justify-center pt-5">
              <ArrowRight size={16} className="text-slate-300" />
            </div>

            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Nuevas fechas
              </p>

              <div>
                <label className="mb-1 block text-xs text-slate-400">Check-in</label>
                <input
                  type="date"
                  value={nuevaEntrada}
                  onChange={(e) => {
                    setNuevaEntrada(e.target.value)
                    setApplyError(null)
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">Check-out</label>
                <input
                  type="date"
                  value={nuevaSalida}
                  min={nuevaEntrada || undefined}
                  onChange={(e) => {
                    setNuevaSalida(e.target.value)
                    setApplyError(null)
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-400 focus:outline-none"
                />
              </div>

              {nuevasNoches > 0 && (
                <p className="text-xs font-semibold text-amber-700">
                  {nuevasNoches} noches · {newIsHighSeason ? '☀️ Temp. alta' : '🍂 Temp. base'}
                  {newIsHighSeason !== (reserva.temporada === 'ALTA') && (
                    <span className="ml-1 text-amber-600">← cambia!</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {newBreakdown && (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Recálculo de precio
              </p>

              {priceDiff > 0 && (
                <span className="flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
                  <TrendingUp size={11} /> +{fmtEur(priceDiff)}
                </span>
              )}

              {priceDiff < 0 && (
                <span className="flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">
                  <TrendingDown size={11} /> {fmtEur(priceDiff)}
                </span>
              )}

              {priceDiff === 0 && (
                <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                  <Minus size={11} /> Sin diferencia
                </span>
              )}
            </div>

            <div className="space-y-2 p-4 text-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-slate-500">Precio anterior</span>
                <span className="text-slate-400 line-through">{fmtEur(oldTotal)}</span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="font-medium text-slate-700">Nuevo precio calculado</span>
                <span
                  className={`text-base font-bold ${
                    priceDiff > 0
                      ? 'text-red-600'
                      : priceDiff < 0
                        ? 'text-emerald-600'
                        : 'text-slate-900'
                  }`}
                >
                  {fmtEur(newTotal)}
                </span>
              </div>

              <div className="mt-1 space-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>
                    {nuevasNoches} noches × {fmtEur(newBreakdown.nightlyPrice)}
                  </span>
                  <span>{fmtEur(newBreakdown.accommodationTotal)}</span>
                </div>

                {newBreakdown.extraGuestsTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Suplemento extra</span>
                    <span>{fmtEur(newBreakdown.extraGuestsTotal)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Limpieza</span>
                  <span>{fmtEur(newBreakdown.cleaningFee)}</span>
                </div>

                {newBreakdown.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Descuento no reembolsable</span>
                    <span>−{fmtEur(newBreakdown.discount)}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <span className="text-slate-600">Ya cobrado</span>
                  </div>
                  <span className="font-semibold text-emerald-700">{fmtEur(importe_pagado)}</span>
                </div>

                {pendienteNuevo > 0 && (
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                      <span className="text-slate-600">Pendiente con nuevas fechas</span>
                    </div>
                    <span className="font-bold text-amber-700">{fmtEur(pendienteNuevo)}</span>
                  </div>
                )}

                {reembolsoNuevo > 0 && (
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-blue-400" />
                      <span className="text-slate-600">Reembolso a gestionar</span>
                    </div>
                    <span className="font-bold text-blue-700">−{fmtEur(reembolsoNuevo)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {newBreakdown && priceDiff !== 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              ¿Cómo aplicar el cambio?
            </p>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all hover:bg-slate-50 ${
                useNewPrice ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200'
              }`}
            >
              <input
                type="radio"
                name="price-option"
                checked={useNewPrice}
                onChange={() => setUseNewPrice(true)}
                className="mt-0.5 accent-amber-600"
              />
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Aplicar nuevo precio — {fmtEur(newTotal)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {priceDiff > 0
                    ? `El cliente deberá abonar ${fmtEur(
                        pendienteNuevo
                      )} al check-in (incluye la diferencia de ${fmtEur(
                        priceDiff
                      )} por el cambio de tarifa)`
                    : reembolsoNuevo > 0
                      ? `Precio más económico. Pendiente de gestionar reembolso de ${fmtEur(
                          reembolsoNuevo
                        )}`
                      : `Pendiente: ${fmtEur(pendienteNuevo)}`}
                </p>
              </div>
            </label>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all hover:bg-slate-50 ${
                !useNewPrice ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200'
              }`}
            >
              <input
                type="radio"
                name="price-option"
                checked={!useNewPrice}
                onChange={() => setUseNewPrice(false)}
                className="mt-0.5 accent-emerald-600"
              />
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Sin cargo adicional — mantener precio {fmtEur(oldTotal)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Cambio de fechas sin ajustar precio. Pendiente: {fmtEur(pendienteActual)}
                </p>
              </div>
            </label>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Nota adicional para el email{' '}
            <span className="font-normal normal-case">(opcional)</span>
          </label>

          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
            placeholder="Ej: El importe pendiente se abonará en efectivo al hacer el check-in…"
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-brand-400 focus:outline-none"
          />
        </div>

        {applyError && <p className="text-sm text-red-600">{applyError}</p>}

        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-2">
          <button
            onClick={handleDiscard}
            disabled={discarding || applying}
            className="text-sm text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-40"
          >
            {discarding ? 'Descartando…' : 'Descartar sin aplicar'}
          </button>

          <button
            onClick={handleApply}
            disabled={applying || !newBreakdown || nuevasNoches < 2}
            className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applying ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Aplicando…
              </>
            ) : (
              <>
                <Check size={14} />
                Aplicar cambio y enviar email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Primitivas ────────────────────────────────────────────────────────────────
function PriceRow({
  label,
  value,
  negative,
}: {
  label: string
  value: number
  negative?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`shrink-0 font-medium ${negative ? 'text-emerald-600' : 'text-slate-800'}`}>
        {negative ? '−' : ''}
        {Math.abs(n(value)).toLocaleString('es-ES', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{' '}
        €
      </span>
    </div>
  )
}

function SideRow({
  label,
  value,
  bold,
  mono,
}: {
  label: string
  value: string
  bold?: boolean
  mono?: boolean
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-400">{label}</span>
      <span
        className={`text-right ${
          bold ? 'font-bold text-slate-900' : 'text-slate-600'
        } ${mono ? 'font-mono text-[10px]' : ''}`}
      >
        {value}
      </span>
    </div>
  )
}
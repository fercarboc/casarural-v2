import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Calendar, CalendarDays, Users, Mail, Phone, FileText,
  AlertCircle, Loader2, Copy, Check, Send, Edit2, Ban,
  CreditCard, ClipboardList, UserCheck, MessageSquare, RefreshCw,
  ArrowRight, TrendingUp, TrendingDown, Minus
} from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../integrations/supabase/client'
import { bookingService } from '../../services/booking.service'
import { configService, PricingConfig, getPricingForDate } from '../../services/config.service'
import { PriceBreakdown } from '../../shared/types/booking'
import { ManualPaymentModal } from '../components/ManualPaymentModal'
import { ModalSolicitudPago } from '../components/ModalSolicitudPago'
import { ModalConfirmacionReserva } from '../components/ModalConfirmacionReserva'

// ─── Tipo ──────────────────────────────────────────────────────────────────────
interface Reserva {
  id: string; codigo: string
  nombre: string; apellidos: string; email: string; telefono: string | null; dni: string | null
  fecha_entrada: string; fecha_salida: string; num_huespedes: number; menores: number; noches: number
  temporada: string; tarifa: string; precio_noche: number
  importe_alojamiento: number; importe_extra: number; importe_limpieza: number
  descuento: number; total: number; importe_senal: number | null; importe_pagado: number | null
  estado: string; estado_pago: string; origen: string
  stripe_session_id: string | null; stripe_payment_intent: string | null
  notas_admin: string | null; solicitud_cambio: string | null; token_cliente: string | null
  created_at: string; updated_at: string | null
}

interface Huesped {
  id: string; nombre: string; apellidos: string
  tipo_documento: string; numero_documento: string
  fecha_nacimiento: string; sexo: string; nacionalidad: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const ESTADO_STYLE: Record<string, string> = {
  CONFIRMED:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING_PAYMENT: 'bg-amber-50 text-amber-700 border-amber-200',
  CANCELLED:       'bg-red-50 text-red-700 border-red-200',
  EXPIRED:         'bg-slate-100 text-slate-500 border-slate-200',
}
const ESTADO_LABEL: Record<string, string> = {
  CONFIRMED: 'Confirmada', PENDING_PAYMENT: 'Pdte. de pago',
  CANCELLED: 'Cancelada', EXPIRED: 'Expirada', NO_SHOW: 'No presentado',
}
const PAGO_LABEL: Record<string, string> = {
  UNPAID: 'Sin pagar', PARTIAL: 'Señal pagada', PAID: 'Pagado completo', REFUNDED: 'Devuelto',
}
const PAGO_STYLE: Record<string, string> = {
  UNPAID: 'bg-slate-100 text-slate-500', PARTIAL: 'bg-blue-50 text-blue-700',
  PAID: 'bg-emerald-50 text-emerald-700', REFUNDED: 'bg-violet-50 text-violet-700',
}
const ORIGEN_LABEL: Record<string, string> = {
  DIRECT_WEB: 'Web directa', BOOKING_ICAL: 'Booking.com',
  AIRBNB_ICAL: 'Airbnb', ESCAPADARURAL_ICAL: 'Escapada Rural', ADMIN: 'Admin',
}

function fmtDate(d: string) {
  return format(parseISO(d), "d 'de' MMMM yyyy", { locale: es })
}
function fmtShort(d: string) {
  return format(parseISO(d), 'd MMM yyyy', { locale: es })
}

// ─── Componente principal ─────────────────────────────────────────────────────
export const ReservationDetailPage: React.FC = () => {
  const { id }       = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const [r, setR]    = useState<Reserva | null>(null)
  const [huespedes, setHuespedes]   = useState<Huesped[]>([])
  const [loading, setLoading]       = useState(true)
  const [notasEdit, setNotasEdit]   = useState('')
  const [savingNotas, setSavingNotas] = useState(false)
  const [notasSaved, setNotasSaved] = useState(false)
  const [copied, setCopied]         = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null)
  const [sendingCheckin, setSendingCheckin]       = useState(false)
  const [checkinSent, setCheckinSent]             = useState(false)
  const [showManualPayment, setShowManualPayment] = useState(false)
  const [showSolicitudPago, setShowSolicitudPago] = useState(false)
  const [showConfirmacion, setShowConfirmacion]   = useState(false)

  useEffect(() => {
    configService.getConfig().then(cfg => setPricingConfig(getPricingForDate(new Date(), cfg))).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [{ data: res }, { data: hues }] = await Promise.all([
      supabase.from('reservas').select('*').eq('id', id).single(),
      supabase.from('huespedes').select('*').eq('reserva_id', id),
    ])
    if (res) { setR(res); setNotasEdit(res.notas_admin ?? '') }
    setHuespedes(hues ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function saveNotas() {
    if (!r) return
    setSavingNotas(true)
    await supabase.from('reservas').update({ notas_admin: notasEdit || null }).eq('id', r.id)
    setSavingNotas(false)
    setNotasSaved(true)
    setTimeout(() => setNotasSaved(false), 2000)
    setR(prev => prev ? { ...prev, notas_admin: notasEdit || null } : prev)
  }

  async function cancelar() {
    if (!r || !window.confirm('¿Confirmas la cancelación de esta reserva?')) return
    setCancelling(true)
    await supabase.from('reservas').update({
      estado: 'CANCELLED',
      updated_at: new Date().toISOString(),
    }).eq('id', r.id)
    setCancelling(false)
    setR(prev => prev ? { ...prev, estado: 'CANCELLED' } : prev)
  }

  function copyLink() {
    if (!r?.token_cliente) return
    navigator.clipboard.writeText(`${window.location.origin}/reserva/${r.token_cliente}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  async function sendCheckinEmail() {
    if (!r?.token_cliente) return
    setSendingCheckin(true)
    const checkinUrl = `${window.location.origin}/reserva/${r.token_cliente}`
    await supabase.functions.invoke('send-email', {
      body: {
        template_key:   'checkin_link',
        to_email:       r.email,
        to_name:        `${r.nombre} ${r.apellidos}`,
        reservation_id: r.id,
        extra_vars:     { checkin_url: checkinUrl },
      },
    })
    setSendingCheckin(false)
    setCheckinSent(true)
    setTimeout(() => setCheckinSent(false), 3000)
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!r) {
    return (
      <div className="text-center py-20 space-y-4">
        <AlertCircle className="mx-auto text-red-400" size={48} />
        <h2 className="text-2xl font-bold text-slate-900">Reserva no encontrada</h2>
        <p className="text-slate-500">El ID no existe o no tienes acceso.</p>
        <button onClick={() => navigate('/admin/reservas')}
          className="mt-4 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white">
          Volver a reservas
        </button>
      </div>
    )
  }

  const isFlexible = r.tarifa === 'FLEXIBLE'
  const restoPendiente = isFlexible && r.importe_senal
    ? Math.max(0, r.total - (r.importe_pagado ?? 0))
    : 0

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/reservas')}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{r.nombre} {r.apellidos}</h1>
              <span className="font-mono text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{r.codigo}</span>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ESTADO_STYLE[r.estado] ?? 'bg-slate-50 text-slate-500'}`}>
                {ESTADO_LABEL[r.estado] ?? r.estado}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Creada el {fmtShort(r.created_at)} · Origen: {ORIGEN_LABEL[r.origen] ?? r.origen}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={load} className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-400 transition-all">
            <RefreshCw size={14} />
          </button>
          {r.estado === 'CONFIRMED' && r.estado_pago !== 'PAID' && (
            <button onClick={() => setShowSolicitudPago(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
              <CreditCard size={14} /> Solicitud de pago
            </button>
          )}
          {r.estado === 'CONFIRMED' && (
            <button onClick={() => setShowConfirmacion(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
              <Mail size={14} /> Enviar confirmación
            </button>
          )}
          {r.token_cliente && r.estado === 'CONFIRMED' && (
            <>
              <button onClick={copyLink}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all shadow-sm ${
                  copied ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}>
                {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Enlace check-in</>}
              </button>
              <button onClick={sendCheckinEmail} disabled={sendingCheckin || checkinSent}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all shadow-sm ${
                  checkinSent ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50'
                }`}>
                {checkinSent
                  ? <><Check size={14} /> Email enviado</>
                  : sendingCheckin
                    ? <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                    : <><Send size={14} /> Enviar check-in</>}
              </button>
            </>
          )}
          {r.estado !== 'CANCELLED' && r.estado !== 'EXPIRED' && (
            <button onClick={cancelar} disabled={cancelling}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-all shadow-sm">
              {cancelling ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
              Cancelar
            </button>
          )}
          <Link to={`/admin/reservas`}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-all shadow-sm">
            <Edit2 size={14} /> Editar desde lista
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Columna principal ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Fechas */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center gap-2">
              <Calendar size={15} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Estancia</h3>
            </div>
            <div className="p-6 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Check-in</p>
                <p className="font-bold text-slate-900">{fmtDate(r.fecha_entrada)}</p>
                <p className="text-xs text-slate-400 mt-0.5">A partir de las 16:00 h</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
                  {r.noches} noches
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Check-out</p>
                <p className="font-bold text-slate-900">{fmtDate(r.fecha_salida)}</p>
                <p className="text-xs text-slate-400 mt-0.5">Antes de las 12:00 h</p>
              </div>
            </div>
            <div className="border-t border-slate-100 px-6 py-3 flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Users size={14} className="text-slate-400" />
                <span><strong>{r.num_huespedes}</strong> huéspedes</span>
                {r.menores > 0 && <span className="text-slate-400">({r.menores} menor{r.menores > 1 ? 'es' : ''})</span>}
              </div>
              <div className="text-slate-400">·</div>
              <span className="text-slate-600">Temporada <strong>{r.temporada === 'ALTA' ? 'Alta' : 'Base'}</strong></span>
              <div className="text-slate-400">·</div>
              <span className={`font-semibold ${isFlexible ? 'text-emerald-600' : 'text-amber-700'}`}>
                {isFlexible ? 'Tarifa flexible' : 'No reembolsable'}
              </span>
            </div>
          </div>

          {/* Desglose de precios */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={15} className="text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-700">Desglose económico</h3>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${PAGO_STYLE[r.estado_pago] ?? 'bg-slate-100 text-slate-500'}`}>
                {PAGO_LABEL[r.estado_pago] ?? r.estado_pago}
              </span>
            </div>
            <div className="p-6 space-y-3">
              <PriceRow label={`Alojamiento (${r.noches} noches × ${r.precio_noche.toLocaleString('es-ES')} €)`} value={r.importe_alojamiento} />
              {r.importe_extra > 0 && <PriceRow label="Suplemento huésped extra" value={r.importe_extra} />}
              <PriceRow label="Tarifa de limpieza" value={r.importe_limpieza} />
              {r.descuento > 0 && <PriceRow label="Descuento no reembolsable (−10%)" value={-r.descuento} negative />}
              <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                <span className="font-bold text-slate-900">Total reserva</span>
                <span className="text-2xl font-bold text-slate-900">{r.total.toLocaleString('es-ES')} €</span>
              </div>

              {/* Estado de pago */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                {isFlexible && r.importe_senal ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-slate-600">Señal pagada</span>
                      </div>
                      <span className="font-bold text-emerald-700">{r.importe_senal.toLocaleString('es-ES')} €</span>
                    </div>
                    {restoPendiente > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-400" />
                          <span className="text-slate-600">Resto pendiente</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-amber-700">{restoPendiente.toLocaleString('es-ES')} €</span>
                          <button
                            onClick={() => setShowManualPayment(true)}
                            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700 transition-all"
                          >
                            <CreditCard size={12} /> Cobrar
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (r.importe_pagado ?? 0) > 0 ? (
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-slate-600">Importe cobrado</span>
                    </div>
                    <span className="font-bold text-emerald-700">{r.importe_pagado!.toLocaleString('es-ES')} €</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Huéspedes registrados */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck size={15} className="text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-700">Huéspedes registrados (RD 933/2021)</h3>
              </div>
              <span className="text-xs text-slate-400">{huespedes.length} / {r.num_huespedes}</span>
            </div>
            {huespedes.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <ClipboardList className="mx-auto text-slate-200 mb-3" size={32} />
                <p className="text-sm text-slate-400">Aún no se han registrado los huéspedes.</p>
                {r.token_cliente && r.estado === 'CONFIRMED' && (
                  <button onClick={copyLink}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all">
                    <Send size={12} /> Enviar enlace al cliente
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {huespedes.map((h, i) => (
                  <div key={h.id} className="px-6 py-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{h.nombre} {h.apellidos}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {h.tipo_documento} {h.numero_documento} ·{' '}
                        {h.fecha_nacimiento ? format(parseISO(h.fecha_nacimiento), 'd MMM yyyy', { locale: es }) : '—'} ·{' '}
                        {h.sexo} · {h.nacionalidad}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">#{i + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Solicitud de cambio */}
          {r.solicitud_cambio && (
            <CambioFechasPanel
              reserva={r}
              config={pricingConfig}
              onApplied={load}
            />
          )}

          {/* Notas internas */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center gap-2">
              <FileText size={15} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Notas internas</h3>
            </div>
            <div className="p-6 space-y-3">
              <textarea
                value={notasEdit}
                onChange={e => setNotasEdit(e.target.value)}
                rows={3}
                placeholder="Añade notas privadas sobre esta reserva…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-brand-400 focus:outline-none resize-none"
              />
              <button onClick={saveNotas} disabled={savingNotas}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  notasSaved
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-brand-600 text-white hover:bg-brand-700'
                } disabled:opacity-50`}>
                {savingNotas ? <Loader2 size={12} className="animate-spin" /> : notasSaved ? <Check size={12} /> : null}
                {notasSaved ? 'Guardado' : savingNotas ? 'Guardando…' : 'Guardar notas'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Datos del titular */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-5 py-4 flex items-center gap-2">
              <Users size={14} className="text-slate-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Titular</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-base font-bold text-slate-500 shrink-0">
                  {r.nombre[0]}{r.apellidos[0]}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{r.nombre} {r.apellidos}</p>
                  {r.dni && <p className="text-xs text-slate-400">{r.dni}</p>}
                </div>
              </div>
              <a href={`mailto:${r.email}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
                <Mail size={14} className="text-slate-400 shrink-0" />
                <span className="truncate">{r.email}</span>
              </a>
              {r.telefono && (
                <a href={`tel:${r.telefono}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  <Phone size={14} className="text-slate-400 shrink-0" />{r.telefono}
                </a>
              )}
            </div>
          </div>

          {/* Pago e identificadores */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-5 py-4 flex items-center gap-2">
              <CreditCard size={14} className="text-slate-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Pago</h3>
            </div>
            <div className="p-5 space-y-2 text-xs">
              <SideRow label="Estado" value={PAGO_LABEL[r.estado_pago] ?? r.estado_pago} />
              {(r.importe_pagado ?? 0) > 0 && <SideRow label="Cobrado" value={`${r.importe_pagado!.toLocaleString('es-ES')} €`} bold />}
              {isFlexible && r.importe_senal && <SideRow label="Señal" value={`${r.importe_senal.toLocaleString('es-ES')} €`} />}
              {r.stripe_payment_intent && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-slate-400 mb-1">Payment Intent</p>
                  <p className="font-mono text-[10px] text-slate-600 break-all">{r.stripe_payment_intent}</p>
                </div>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-5 py-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Acciones</h3>
            </div>
            <div className="p-3 space-y-1">
              {r.token_cliente && (
                <button onClick={copyLink}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
                  {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-slate-400" />}
                  Copiar enlace del cliente
                </button>
              )}
              <Link to="/admin/reservas"
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
                <Edit2 size={16} className="text-slate-400" /> Editar reserva
              </Link>
              {r.estado !== 'CANCELLED' && r.estado !== 'EXPIRED' && (
                <button onClick={cancelar} disabled={cancelling}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-all">
                  <Ban size={16} /> Cancelar reserva
                </button>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2 text-xs">
            <SideRow label="Creada" value={fmtShort(r.created_at)} />
            {r.updated_at && <SideRow label="Modificada" value={fmtShort(r.updated_at)} />}
            <SideRow label="Código" value={r.codigo} mono />
          </div>
        </div>
      </div>

      {showManualPayment && (
        <ManualPaymentModal
          reserva={r}
          onClose={() => setShowManualPayment(false)}
          onSuccess={() => { setShowManualPayment(false); load() }}
        />
      )}
      {showSolicitudPago && (
        <ModalSolicitudPago
          reserva={r}
          onClose={() => setShowSolicitudPago(false)}
          onSuccess={() => { setShowSolicitudPago(false); load() }}
        />
      )}
      {showConfirmacion && (
        <ModalConfirmacionReserva
          reserva={r}
          onClose={() => setShowConfirmacion(false)}
          onSuccess={() => { setShowConfirmacion(false); load() }}
        />
      )}
    </div>
  )
}



// ─── Helper: parsea el campo solicitud_cambio ──────────────────────────────────
function parseSolicitudCambio(s: string) {
  const parts = s.split('|')
  if (parts.length < 3) return null
  const nuevaEntrada = parts[0]
  const nuevaSalida = parts[1]
  const timestamp = parts[parts.length - 1]
  const mensaje = parts.slice(2, -1).join('|') || ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nuevaEntrada) || !/^\d{4}-\d{2}-\d{2}$/.test(nuevaSalida)) return null
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
      return bookingService.calculatePrice(checkIn, checkOut, reserva.num_huespedes, rateType as any, config)
    } catch {
      return null
    }
  }, [nuevaEntrada, nuevaSalida, reserva.num_huespedes, reserva.tarifa, config])

  const nuevasNoches = (nuevaEntrada && nuevaSalida && nuevaSalida > nuevaEntrada)
    ? differenceInDays(parseISO(nuevaSalida), parseISO(nuevaEntrada))
    : 0

  const newIsHighSeason = nuevaEntrada
    ? [6, 7].includes(parseISO(nuevaEntrada).getMonth())
    : false

  const importe_pagado = reserva.importe_pagado ?? 0
  const oldTotal = reserva.total
  const newTotal = newBreakdown?.total ?? oldTotal
  const priceDiff = Math.round((newTotal - oldTotal) * 100) / 100
  const effectiveTotal = useNewPrice ? newTotal : oldTotal
  const saldo = importe_pagado - effectiveTotal          // positivo = sobrante (refund), negativo = debe
  const pendienteNuevo = Math.max(0, -saldo)
  const reembolsoNuevo = Math.max(0, saldo)
  const pendienteActual = Math.max(0, oldTotal - importe_pagado)

  const fmtEur = (n: number) =>
    n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

  const fmtFechaLarga = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
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
      // 1. Construir update para la reserva
      const updateData: Record<string, any> = {
        fecha_entrada: nuevaEntrada,
        fecha_salida: nuevaSalida,
        noches: nuevasNoches,
        solicitud_cambio: null,
        updated_at: new Date().toISOString(),
      }

      if (useNewPrice) {
        updateData.temporada = newIsHighSeason ? 'ALTA' : 'BASE'
        updateData.precio_noche = newBreakdown.nightlyPrice
        updateData.importe_alojamiento = newBreakdown.accommodationTotal
        updateData.importe_extra = newBreakdown.extraGuestsTotal
        updateData.descuento = newBreakdown.discount
        updateData.total = newBreakdown.total
        // Ajustar estado_pago automáticamente
        if (importe_pagado >= newBreakdown.total) updateData.estado_pago = 'PAID'
        else if (importe_pagado > 0) updateData.estado_pago = 'PARTIAL'
      }

      const { error: dbError } = await supabase.from('reservas').update(updateData).eq('id', reserva.id)
      if (dbError) throw dbError

      // 2. Enviar email de confirmación al cliente
      const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string
      const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string

      await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          template_key: 'date_change_confirmed',
          to_email: reserva.email,
          to_name: `${reserva.nombre} ${reserva.apellidos}`,
          reservation_id: reserva.id,
          extra_vars: {
            reserva_codigo: reserva.codigo,
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
      }).catch(() => { /* email best-effort */ })

      setDone(true)
      setTimeout(() => onApplied(), 2000)
    } catch {
      setApplyError('Error al guardar el cambio. Inténtalo de nuevo.')
    } finally {
      setApplying(false)
    }
  }

  // ── Estado final: cambio aplicado ─────────────────────────────────────────
  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
          <Check size={20} className="text-emerald-600" />
        </div>
        <div>
          <p className="font-bold text-emerald-800 text-sm">Cambio aplicado y email enviado al cliente</p>
          <p className="text-xs text-emerald-600 mt-0.5">Las fechas han sido actualizadas y se ha enviado la confirmación.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-white shadow-sm overflow-hidden">

      {/* Header */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarDays size={16} className="text-amber-600" />
          <h3 className="text-sm font-bold text-amber-800">Solicitud de cambio de fechas</h3>
          <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-xs font-bold text-amber-700">
            Pendiente de gestionar
          </span>
        </div>
        <button
          onClick={handleDiscard}
          disabled={discarding || applying}
          className="text-xs text-slate-400 hover:text-red-500 disabled:opacity-40 transition-colors"
        >
          {discarding ? 'Descartando…' : 'Descartar solicitud'}
        </button>
      </div>

      <div className="p-6 space-y-6">

        {/* Mensaje del cliente */}
        {parsed?.mensaje && (
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
              Mensaje del cliente
              {parsed.timestamp && (
                <span className="ml-2 font-normal normal-case">
                  · {new Date(parsed.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
            <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 italic">
              "{parsed.mensaje}"
            </p>
          </div>
        )}

        {/* Comparativa de fechas */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Fechas</p>
          <div className="grid grid-cols-[1fr_32px_1fr] gap-3 items-start">

            {/* Fechas actuales (solo lectura) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Actuales</p>
              <p className="font-semibold text-slate-800 text-sm">{fmtDate(reserva.fecha_entrada)}</p>
              <p className="font-semibold text-slate-800 text-sm">{fmtDate(reserva.fecha_salida)}</p>
              <p className="text-xs text-slate-400 mt-1.5">
                {reserva.noches} noches · {reserva.temporada === 'ALTA' ? 'Temp. alta' : 'Temp. base'}
              </p>
            </div>

            <div className="flex items-center justify-center pt-5">
              <ArrowRight size={16} className="text-slate-300" />
            </div>

            {/* Nuevas fechas (editables) */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Nuevas fechas</p>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Check-in</label>
                <input
                  type="date"
                  value={nuevaEntrada}
                  onChange={e => { setNuevaEntrada(e.target.value); setApplyError(null) }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Check-out</label>
                <input
                  type="date"
                  value={nuevaSalida}
                  min={nuevaEntrada || undefined}
                  onChange={e => { setNuevaSalida(e.target.value); setApplyError(null) }}
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

        {/* Recálculo de precio */}
        {newBreakdown && (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Recálculo de precio</p>
              {priceDiff > 0 && (
                <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">
                  <TrendingUp size={11} /> +{fmtEur(priceDiff)}
                </span>
              )}
              {priceDiff < 0 && (
                <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <TrendingDown size={11} /> {fmtEur(priceDiff)}
                </span>
              )}
              {priceDiff === 0 && (
                <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                  <Minus size={11} /> Sin diferencia
                </span>
              )}
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between items-baseline">
                <span className="text-slate-500">Precio anterior</span>
                <span className="text-slate-400 line-through">{fmtEur(oldTotal)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-slate-700 font-medium">Nuevo precio calculado</span>
                <span className={`font-bold text-base ${priceDiff > 0 ? 'text-red-600' : priceDiff < 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {fmtEur(newTotal)}
                </span>
              </div>

              {/* Breakdown nuevo */}
              <div className="bg-slate-50 rounded-lg p-3 mt-1 space-y-1 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>{nuevasNoches} noches × {fmtEur(newBreakdown.nightlyPrice)}</span>
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

              {/* Estado de cobro */}
              <div className="border-t border-slate-100 pt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-slate-600">Ya cobrado</span>
                  </div>
                  <span className="font-semibold text-emerald-700">{fmtEur(importe_pagado)}</span>
                </div>
                {pendienteNuevo > 0 && (
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-slate-600">Pendiente con nuevas fechas</span>
                    </div>
                    <span className="font-bold text-amber-700">{fmtEur(pendienteNuevo)}</span>
                  </div>
                )}
                {reembolsoNuevo > 0 && (
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
                      <span className="text-slate-600">Reembolso a gestionar</span>
                    </div>
                    <span className="font-bold text-blue-700">−{fmtEur(reembolsoNuevo)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Opción de precio (solo si hay diferencia) */}
        {newBreakdown && priceDiff !== 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">¿Cómo aplicar el cambio?</p>
            <label className={`flex items-start gap-3 cursor-pointer rounded-xl border p-4 transition-all hover:bg-slate-50 ${useNewPrice ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200'}`}>
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
                <p className="text-xs text-slate-500 mt-0.5">
                  {priceDiff > 0
                    ? `El cliente deberá abonar ${fmtEur(pendienteNuevo)} al check-in (incluye la diferencia de ${fmtEur(priceDiff)} por el cambio de tarifa)`
                    : reembolsoNuevo > 0
                      ? `Precio más económico. Pendiente de gestionar reembolso de ${fmtEur(reembolsoNuevo)}`
                      : `Pendiente: ${fmtEur(pendienteNuevo)}`
                  }
                </p>
              </div>
            </label>
            <label className={`flex items-start gap-3 cursor-pointer rounded-xl border p-4 transition-all hover:bg-slate-50 ${!useNewPrice ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200'}`}>
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
                <p className="text-xs text-slate-500 mt-0.5">
                  Cambio de fechas sin ajustar precio. Pendiente: {fmtEur(pendienteActual)}
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Nota para el email */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Nota adicional para el email <span className="font-normal normal-case">(opcional)</span>
          </label>
          <textarea
            value={nota}
            onChange={e => setNota(e.target.value)}
            rows={2}
            placeholder="Ej: El importe pendiente se abonará en efectivo al hacer el check-in…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-brand-400 focus:outline-none resize-none"
          />
        </div>

        {applyError && <p className="text-sm text-red-600">{applyError}</p>}

        {/* Acciones */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <button
            onClick={handleDiscard}
            disabled={discarding || applying}
            className="text-sm text-slate-400 hover:text-slate-600 disabled:opacity-40 transition-colors"
          >
            {discarding ? 'Descartando…' : 'Descartar sin aplicar'}
          </button>
          <button
            onClick={handleApply}
            disabled={applying || !newBreakdown || nuevasNoches < 2}
            className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {applying
              ? <><Loader2 size={14} className="animate-spin" /> Aplicando…</>
              : <><Check size={14} /> Aplicar cambio y enviar email</>
            }
          </button>
        </div>

      </div>
    </div>
  )
}

// ─── Primitivas ────────────────────────────────────────────────────────────────
function PriceRow({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`font-medium shrink-0 ${negative ? 'text-emerald-600' : 'text-slate-800'}`}>
        {negative ? '−' : ''}{Math.abs(value).toLocaleString('es-ES')} €
      </span>
    </div>
  )
}

function SideRow({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-400">{label}</span>
      <span className={`text-right ${bold ? 'font-bold text-slate-900' : 'text-slate-600'} ${mono ? 'font-mono text-[10px]' : ''}`}>
        {value}
      </span>
    </div>
  )
}

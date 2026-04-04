// src/admin/pages/NewReservationPage.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  Check,
  Eye,
  Plus,
  Send,
  CreditCard,
  Mail,
} from 'lucide-react'
import { supabase } from '../../integrations/supabase/client'
import { ModalSolicitudPago } from '../components/ModalSolicitudPago'
import { ModalConfirmacionReserva } from '../components/ModalConfirmacionReserva'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface PriceResult {
  nights: number
  guests: number
  extra_guests: number
  season_type: 'BASE' | 'ALTA'
  rate_type: string
  precio_noche: number
  extra_huesped: number
  importe_alojamiento: number
  importe_extra: number
  limpieza: number
  descuento: number
  total: number
  importe_senal: number | null
}

interface CreatedReserva {
  id: string
  codigo: string
  token_cliente: string
  email: string
  nombre: string
  apellidos: string
  total: number
  importe_pagado: number | null
  noches: number
  num_huespedes: number
  fecha_entrada: string
  fecha_salida: string
  metodo_pago_previsto: string
  tarifa: string
}

const today = new Date().toISOString().split('T')[0]

// ─── Clases UI ────────────────────────────────────────────────────────────────
const darkInputCls =
  'w-full rounded-2xl border border-sidebar-border bg-admin-card px-4 py-3 text-sm font-medium text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors'

const darkTextareaCls =
  'w-full rounded-2xl border border-sidebar-border bg-admin-card px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none transition-colors'

// ─── Field helper ─────────────────────────────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  required = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={darkInputCls}
      />
    </div>
  )
}

// ─── Card section helper ──────────────────────────────────────────────────────
function SectionCard({
  title,
  children,
  right,
}: {
  title: string
  children: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <section className="rounded-3xl border border-sidebar-border bg-sidebar-bg shadow-[0_10px_40px_rgba(0,0,0,0.15)] overflow-hidden">
      <div className="bg-admin-card/60 border-b border-sidebar-border px-6 py-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {right}
      </div>
      <div className="p-6">{children}</div>
    </section>
  )
}

// ─── SuccessScreen ────────────────────────────────────────────────────────────
function SuccessScreen({
  reserva,
  onNew,
}: {
  reserva: CreatedReserva
  onNew: () => void
}) {
  const navigate = useNavigate()
  const [showPago, setShowPago] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [checkinSent, setCheckinSent] = useState(false)
  const [sendingCheckin, setSendingCheckin] = useState(false)

  async function sendCheckin() {
    setSendingCheckin(true)
    const checkinUrl = `${window.location.origin}/reserva/${reserva.token_cliente}`

    await supabase.functions.invoke('send-email', {
      body: {
        template_key: 'checkin_link',
        to_email: reserva.email,
        to_name: `${reserva.nombre} ${reserva.apellidos}`,
        reservation_id: reserva.id,
        extra_vars: { checkin_url: checkinUrl },
      },
    })

    setSendingCheckin(false)
    setCheckinSent(true)
  }

  return (
    <div className="max-w-2xl mx-auto py-16">
      <div className="rounded-3xl border border-sidebar-border bg-sidebar-bg shadow-[0_10px_40px_rgba(0,0,0,0.15)] p-8 text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
          <Check size={36} className="text-emerald-300" />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white">¡Reserva creada!</h1>
          <p className="mt-2 text-slate-400">
            <span className="font-mono font-bold text-slate-200">{reserva.codigo}</span>
            {' · '}
            {reserva.nombre} {reserva.apellidos}
          </p>
          <p className="mt-2 text-3xl font-bold text-white">{reserva.total.toFixed(2)} €</p>
        </div>

        <div className="rounded-3xl border border-sidebar-border bg-admin-card p-5 text-left space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Acciones
          </p>

          {reserva.metodo_pago_previsto === 'STRIPE' && (
            <button
              onClick={() => setShowPago(true)}
              className="w-full flex items-center gap-3 rounded-2xl border border-sidebar-border px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-sidebar-hover transition-all"
            >
              <CreditCard size={16} className="text-slate-400 shrink-0" />
              Enviar enlace de pago por Stripe
            </button>
          )}

          <button
            onClick={() => setShowConfirm(true)}
            className="w-full flex items-center gap-3 rounded-2xl border border-sidebar-border px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-sidebar-hover transition-all"
          >
            <Mail size={16} className="text-slate-400 shrink-0" />
            {reserva.metodo_pago_previsto === 'TRANSFERENCIA'
              ? 'Enviar confirmación con instrucciones de transferencia'
              : 'Enviar confirmación de reserva'}
          </button>

          <button
            onClick={sendCheckin}
            disabled={sendingCheckin || checkinSent}
            className="w-full flex items-center gap-3 rounded-2xl border border-sidebar-border px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-sidebar-hover disabled:opacity-50 transition-all"
          >
            {checkinSent ? (
              <>
                <Check size={16} className="text-emerald-300 shrink-0" />
                Email check-in enviado
              </>
            ) : sendingCheckin ? (
              <>
                <Loader2 size={16} className="animate-spin text-slate-400 shrink-0" />
                Enviando...
              </>
            ) : (
              <>
                <Send size={16} className="text-slate-400 shrink-0" />
                Enviar enlace de check-in
              </>
            )}
          </button>

          <button
            onClick={() => navigate(`/admin/reservas/${reserva.id}`)}
            className="w-full flex items-center gap-3 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700 transition-all"
          >
            <Eye size={16} className="shrink-0" />
            Ver reserva
          </button>

          <button
            onClick={onNew}
            className="w-full flex items-center gap-3 rounded-2xl border border-dashed border-slate-600 px-4 py-3 text-sm font-semibold text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-all"
          >
            <Plus size={16} className="shrink-0" />
            Crear otra reserva
          </button>
        </div>
      </div>

      {showPago && (
        <ModalSolicitudPago
          reserva={reserva}
          onClose={() => setShowPago(false)}
          onSuccess={() => setShowPago(false)}
        />
      )}

      {showConfirm && (
        <ModalConfirmacionReserva
          reserva={reserva}
          onClose={() => setShowConfirm(false)}
          onSuccess={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export function NewReservationPage() {
  const navigate = useNavigate()

  // Cliente
  const [nombre, setNombre] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [dni, setDni] = useState('')
  const [razon_social, setRazonSocial] = useState('')
  const [nif_factura, setNifFactura] = useState('')
  const [direccion_factura, setDireccionFactura] = useState('')

  // Estancia
  const [fecha_entrada, setFechaEntrada] = useState('')
  const [fecha_salida, setFechaSalida] = useState('')
  const [num_huespedes, setNumHuespedes] = useState(10)
  const [menores, setMenores] = useState(0)
  const [tarifa, setTarifa] = useState<'FLEXIBLE' | 'NO_REEMBOLSABLE'>('FLEXIBLE')

  // Precio
  const [priceResult, setPriceResult] = useState<PriceResult | null>(null)
  const [descuento_manual, setDescuentoManual] = useState('')
  const [calculating, setCalculating] = useState(false)
  const [priceError, setPriceError] = useState<string | null>(null)

  // Pago
  const [estado_pago, setEstadoPago] = useState<'UNPAID' | 'PARTIAL' | 'PAID'>('UNPAID')
  const [metodo_pago_previsto, setMetodoPago] = useState<
    'STRIPE' | 'TRANSFERENCIA' | 'EFECTIVO' | 'BIZUM'
  >('STRIPE')
  const [importe_pagado, setImportePagado] = useState('')

  // Notas
  const [notas_admin, setNotasAdmin] = useState('')
  const [notas_cliente, setNotasCliente] = useState('')

  // UI
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [createdReserva, setCreatedReserva] = useState<CreatedReserva | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // ── Derivados ────────────────────────────────────────────────────────────────
  const descuentoNum = parseFloat(descuento_manual) || 0
  const totalFinal = priceResult ? Math.max(0, priceResult.total - descuentoNum) : 0

  const importeSenalFinal =
    priceResult?.importe_senal != null && priceResult.total > 0
      ? Math.round((priceResult.importe_senal / priceResult.total) * totalFinal * 100) / 100
      : null

  // ── Calcular precio (debounced 500ms) ───────────────────────────────────────
  const calcularPrecio = useCallback(
    async (entrada: string, salida: string, huespedes: number, t: string) => {
      if (!entrada || !salida || salida <= entrada) return

      setCalculating(true)
      setPriceError(null)

      try {
        const { data, error } = await supabase.functions.invoke('calculate-price', {
          body: { checkIn: entrada, checkOut: salida, guests: huespedes, rateType: t },
        })

        if (error) throw new Error(error.message)
        if (data?.error) throw new Error(data.error)

        setPriceResult(data as PriceResult)
      } catch (err: any) {
        setPriceError(err.message ?? 'Error al calcular el precio')
        setPriceResult(null)
      } finally {
        setCalculating(false)
      }
    },
    []
  )

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      calcularPrecio(fecha_entrada, fecha_salida, num_huespedes, tarifa)
    }, 500)

    return () => clearTimeout(debounceRef.current)
  }, [fecha_entrada, fecha_salida, num_huespedes, tarifa, calcularPrecio])

  // ── Guardar reserva ──────────────────────────────────────────────────────────
  async function handleSave() {
    if (!nombre || !apellidos || !email || !fecha_entrada || !fecha_salida || !priceResult) {
      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      const importePagadoNum = parseFloat(importe_pagado) || null

      const { data, error } = await supabase
        .from('reservas')
        .insert({
          nombre,
          apellidos,
          email,
          telefono: telefono || null,
          dni: dni || null,
          razon_social: razon_social || null,
          nif_factura: nif_factura || null,
          direccion_factura: direccion_factura || null,
          fecha_entrada,
          fecha_salida,
          num_huespedes: Number(num_huespedes) || 1,
          menores: Number(menores) || 0,
          temporada: priceResult.season_type,
          tarifa,
          precio_noche: priceResult.precio_noche,
          noches: priceResult.nights,
          importe_alojamiento: priceResult.importe_alojamiento,
          importe_extra: Number(priceResult.importe_extra) || 0,
          importe_limpieza: Number(priceResult.limpieza) || 60,
          descuento: Number(priceResult.descuento || 0) + descuentoNum,
          total: totalFinal,
          importe_senal: tarifa === 'FLEXIBLE' ? importeSenalFinal : null,
          estado: 'CONFIRMED',
          estado_pago,
          importe_pagado: Number(importe_pagado) || 0,
          origen: 'ADMIN',
          notas_admin: notas_admin || null,
          stripe_session_id: null,
          stripe_payment_intent: null,
          expires_at: null,
        })
        .select('id, codigo, token_cliente')
        .single()

      if (error) throw error

      setCreatedReserva({
        id: data.id,
        codigo: data.codigo,
        token_cliente: data.token_cliente,
        email,
        nombre,
        apellidos,
        total: totalFinal,
        importe_pagado: importePagadoNum,
        noches: priceResult.nights,
        num_huespedes,
        fecha_entrada,
        fecha_salida,
        metodo_pago_previsto,
        tarifa,
      })
    } catch (err: any) {
      setSaveError(err.message ?? 'Error al crear la reserva')
    } finally {
      setSaving(false)
    }
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (createdReserva) {
    return <SuccessScreen reserva={createdReserva} onNew={() => setCreatedReserva(null)} />
  }

  const canSave = !!(
    nombre &&
    apellidos &&
    email &&
    fecha_entrada &&
    fecha_salida &&
    priceResult &&
    !calculating
  )

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <header className="rounded-3xl border border-sidebar-border bg-sidebar-bg shadow-[0_10px_40px_rgba(0,0,0,0.15)] px-6 py-5 flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/reservas')}
          className="p-2 rounded-2xl hover:bg-sidebar-hover text-slate-400 hover:text-white transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">Nueva reserva manual</h1>
          <p className="text-sm text-slate-400 mt-1">
            Confirmada directamente por el administrador
          </p>
        </div>
      </header>

      {/* ── SECCIÓN 1: CLIENTE ────────────────────────────────────────────────── */}
      <SectionCard title="1 · Datos del cliente (titular)">
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Nombre *"
            value={nombre}
            onChange={setNombre}
            placeholder="Fernando"
            required
          />
          <Field
            label="Apellidos *"
            value={apellidos}
            onChange={setApellidos}
            placeholder="García López"
            required
          />
          <Field
            label="Email *"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="cliente@email.com"
            required
          />
          <Field
            label="Teléfono"
            value={telefono}
            onChange={setTelefono}
            placeholder="+34 600 000 000"
          />
          <Field
            label="DNI / NIE / Pasaporte"
            value={dni}
            onChange={setDni}
            placeholder="12345678A"
          />
          <Field
            label="Razón social (empresa, opcional)"
            value={razon_social}
            onChange={setRazonSocial}
            placeholder="Empresa S.L."
          />
          <Field
            label="NIF factura (opcional)"
            value={nif_factura}
            onChange={setNifFactura}
            placeholder="B12345678"
          />

          <div className="col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Dirección factura (opcional)
            </label>
            <textarea
              value={direccion_factura}
              onChange={(e) => setDireccionFactura(e.target.value)}
              rows={2}
              placeholder="Calle, número, ciudad, CP..."
              className={darkTextareaCls}
            />
          </div>
        </div>
      </SectionCard>

      {/* ── SECCIÓN 2: ESTANCIA ───────────────────────────────────────────────── */}
      <SectionCard title="2 · Datos de la estancia">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Fecha entrada *
              </label>
              <input
                type="date"
                value={fecha_entrada}
                min={today}
                onChange={(e) => setFechaEntrada(e.target.value)}
                className={darkInputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Fecha salida *
              </label>
              <input
                type="date"
                value={fecha_salida}
                min={fecha_entrada || today}
                onChange={(e) => setFechaSalida(e.target.value)}
                className={darkInputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Nº huéspedes (1-11) *
              </label>
              <input
                type="number"
                value={num_huespedes}
                min={1}
                max={11}
                onChange={(e) =>
                  setNumHuespedes(Math.min(11, Math.max(1, parseInt(e.target.value) || 1)))
                }
                className={darkInputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Menores (informativo)
              </label>
              <input
                type="number"
                value={menores}
                min={0}
                max={5}
                onChange={(e) =>
                  setMenores(Math.min(5, Math.max(0, parseInt(e.target.value) || 0)))
                }
                className={darkInputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Tarifa *
            </label>

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  value: 'FLEXIBLE',
                  label: 'Flexible',
                  desc: 'Señal del 50% · política de cancelación flexible',
                },
                {
                  value: 'NO_REEMBOLSABLE',
                  label: 'No reembolsable',
                  desc: '−10% sobre alojamiento · pago completo al reservar',
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTarifa(opt.value as any)}
                  className={`rounded-2xl border-2 p-4 text-left transition-all ${
                    tarifa === opt.value
                      ? 'border-brand-500 bg-sidebar-hover/60 ring-2 ring-brand-500/10'
                      : 'border-sidebar-border bg-admin-card hover:border-slate-600'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-white">{opt.label}</p>
                    {tarifa === opt.value && <Check size={14} className="text-brand-400" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── SECCIÓN 3: PRECIO ─────────────────────────────────────────────────── */}
      <SectionCard
        title="3 · Desglose de precio"
        right={
          calculating ? (
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Loader2 size={12} className="animate-spin" />
              Calculando...
            </span>
          ) : undefined
        }
      >
        {!fecha_entrada || !fecha_salida || fecha_salida <= fecha_entrada ? (
          <p className="text-sm text-slate-500 text-center py-4">
            Introduce las fechas para ver el precio
          </p>
        ) : priceError ? (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
            {priceError}
          </p>
        ) : priceResult && !calculating ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-sidebar-border overflow-hidden text-sm bg-admin-card">
              <div className="flex justify-between items-center px-4 py-3 bg-sidebar-bg/70">
                <span className="text-slate-400">Temporada</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-full text-xs border ${
                    priceResult.season_type === 'ALTA'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  }`}
                >
                  {priceResult.season_type}
                </span>
              </div>

              <div className="flex justify-between px-4 py-2.5 border-t border-sidebar-border">
                <span className="text-slate-400">
                  {priceResult.nights} noches × {priceResult.precio_noche} €/noche
                </span>
                <span className="font-medium text-slate-100">
                  {priceResult.importe_alojamiento.toFixed(2)} €
                </span>
              </div>

              {priceResult.importe_extra > 0 && (
                <div className="flex justify-between px-4 py-2.5 border-t border-sidebar-border">
                  <span className="text-slate-400">
                    Suplemento huésped extra ({priceResult.extra_guests} ×{' '}
                    {priceResult.extra_huesped} € × {priceResult.nights} noches)
                  </span>
                  <span className="font-medium text-slate-100">
                    {priceResult.importe_extra.toFixed(2)} €
                  </span>
                </div>
              )}

              <div className="flex justify-between px-4 py-2.5 border-t border-sidebar-border">
                <span className="text-slate-400">Gastos de limpieza</span>
                <span className="font-medium text-slate-100">
                  {priceResult.limpieza.toFixed(2)} €
                </span>
              </div>

              {priceResult.descuento > 0 && (
                <div className="flex justify-between px-4 py-2.5 border-t border-sidebar-border text-emerald-300">
                  <span>Descuento no reembolsable (−10%)</span>
                  <span className="font-medium">−{priceResult.descuento.toFixed(2)} €</span>
                </div>
              )}

              <div className="flex justify-between px-4 py-3 border-t-2 border-sidebar-border font-bold text-white">
                <span>Subtotal calculado</span>
                <span>{priceResult.total.toFixed(2)} €</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Descuento adicional negociado (€)
              </label>
              <input
                type="number"
                value={descuento_manual}
                onChange={(e) => setDescuentoManual(e.target.value)}
                placeholder="0.00"
                min="0"
                max={priceResult.total}
                step="0.01"
                className={darkInputCls}
              />
            </div>

            <div
              className={`rounded-2xl p-5 border ${
                descuentoNum > 0
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-admin-card border-sidebar-border'
              }`}
            >
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  Total final
                </span>
                <span className="text-3xl font-bold text-white">{totalFinal.toFixed(2)} €</span>
              </div>

              {descuentoNum > 0 && (
                <p className="text-xs text-emerald-300 mt-1">
                  Descuento negociado: −{descuentoNum.toFixed(2)} € sobre{' '}
                  {priceResult.total.toFixed(2)} €
                </p>
              )}

              {tarifa === 'FLEXIBLE' && importeSenalFinal != null && (
                <div className="flex justify-between mt-2 pt-2 border-t border-sidebar-border text-sm">
                  <span className="text-slate-400">Señal (50%)</span>
                  <span className="font-bold text-emerald-300">
                    {importeSenalFinal.toFixed(2)} €
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : calculating ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-slate-500" />
          </div>
        ) : null}
      </SectionCard>

      {/* ── SECCIÓN 4: PAGO ───────────────────────────────────────────────────── */}
      <SectionCard title="4 · Estado del pago">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Estado del pago
            </label>

            <div className="space-y-2">
              {[
                {
                  value: 'UNPAID',
                  label: 'Pendiente',
                  desc: 'Se enviará solicitud de pago',
                },
                {
                  value: 'PARTIAL',
                  label: 'Señal recibida',
                  desc: 'Ha pagado la señal por otro medio',
                },
                {
                  value: 'PAID',
                  label: 'Pagado completo',
                  desc: 'Ya está todo cobrado',
                },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                    estado_pago === opt.value
                      ? 'border-brand-500 bg-sidebar-hover/60'
                      : 'border-sidebar-border bg-admin-card hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    checked={estado_pago === opt.value}
                    onChange={() => setEstadoPago(opt.value as any)}
                    className="accent-brand-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{opt.label}</p>
                    <p className="text-xs text-slate-400">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Método previsto
              </label>
              <select
                value={metodo_pago_previsto}
                onChange={(e) => setMetodoPago(e.target.value as any)}
                className={darkInputCls}
              >
                <option value="STRIPE">💳 Stripe (enlace online)</option>
                <option value="TRANSFERENCIA">🏦 Transferencia bancaria</option>
                <option value="EFECTIVO">💵 Efectivo al llegar</option>
                <option value="BIZUM">📱 Bizum</option>
              </select>
            </div>

            {estado_pago !== 'UNPAID' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Importe ya cobrado (€)
                </label>
                <input
                  type="number"
                  value={importe_pagado}
                  onChange={(e) => setImportePagado(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className={darkInputCls}
                />
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ── SECCIÓN 5: NOTAS ──────────────────────────────────────────────────── */}
      <SectionCard title="5 · Notas">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Notas internas (admin)
            </label>
            <textarea
              value={notas_admin}
              onChange={(e) => setNotasAdmin(e.target.value)}
              rows={3}
              placeholder="Acuerdos especiales, condiciones, recordatorios..."
              className={darkTextareaCls}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Notas para el cliente (email)
            </label>
            <textarea
              value={notas_cliente}
              onChange={(e) => setNotasCliente(e.target.value)}
              rows={3}
              placeholder="Aparecerá en el email de confirmación..."
              className={darkTextareaCls}
            />
          </div>
        </div>
      </SectionCard>

      {/* ── FOOTER ────────────────────────────────────────────────────────────── */}
      {saveError && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
          {saveError}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => navigate('/admin/reservas')}
          className="rounded-2xl border border-sidebar-border px-6 py-3 text-sm font-bold text-slate-300 hover:bg-sidebar-hover transition-all"
        >
          Cancelar
        </button>

        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="flex-1 rounded-2xl bg-brand-600 px-6 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-40 flex items-center justify-center gap-2 transition-all"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creando reserva...
            </>
          ) : (
            <>
              <Check size={16} />
              Crear reserva confirmada
            </>
          )}
        </button>
      </div>
    </div>
  )
}
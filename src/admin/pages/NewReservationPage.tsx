// src/admin/pages/NewReservationPage.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Check, Eye, Plus, Send, CreditCard, Mail } from 'lucide-react'
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

// ─── Field helper ─────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, type = 'text', placeholder = '', required = false
}: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-900 focus:border-zinc-400 focus:outline-none focus:bg-white transition-colors"
      />
    </div>
  )
}

// ─── SuccessScreen ────────────────────────────────────────────────────────────
function SuccessScreen({ reserva, onNew }: { reserva: CreatedReserva; onNew: () => void }) {
  const navigate = useNavigate()
  const [showPago, setShowPago]           = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [checkinSent, setCheckinSent]     = useState(false)
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
    <div className="max-w-lg mx-auto py-16 text-center space-y-6">
      <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
        <Check size={36} className="text-emerald-600" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">¡Reserva creada!</h1>
        <p className="mt-2 text-zinc-500">
          <span className="font-mono font-bold text-zinc-700">{reserva.codigo}</span>
          {' · '}{reserva.nombre} {reserva.apellidos}
        </p>
        <p className="mt-1 text-lg font-bold text-zinc-900">{reserva.total.toFixed(2)} €</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-left space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Acciones</p>

        {/* Solicitud de pago Stripe */}
        {reserva.metodo_pago_previsto === 'STRIPE' && (
          <button onClick={() => setShowPago(true)}
            className="w-full flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-all">
            <CreditCard size={16} className="text-zinc-400 shrink-0" />
            Enviar enlace de pago por Stripe
          </button>
        )}

        {/* Confirmación (transferencia / efectivo / bizum) */}
        <button onClick={() => setShowConfirm(true)}
          className="w-full flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-all">
          <Mail size={16} className="text-zinc-400 shrink-0" />
          {reserva.metodo_pago_previsto === 'TRANSFERENCIA'
            ? 'Enviar confirmación con instrucciones de transferencia'
            : 'Enviar confirmación de reserva'}
        </button>

        {/* Enlace check-in */}
        <button onClick={sendCheckin} disabled={sendingCheckin || checkinSent}
          className="w-full flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition-all">
          {checkinSent
            ? <><Check size={16} className="text-emerald-600 shrink-0" /> Email check-in enviado</>
            : sendingCheckin
              ? <><Loader2 size={16} className="animate-spin text-zinc-400 shrink-0" /> Enviando...</>
              : <><Send size={16} className="text-zinc-400 shrink-0" /> Enviar enlace de check-in</>}
        </button>

        {/* Ver reserva */}
        <button onClick={() => navigate(`/admin/reservas/${reserva.id}`)}
          className="w-full flex items-center gap-3 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition-all">
          <Eye size={16} className="shrink-0" /> Ver reserva
        </button>

        {/* Crear otra */}
        <button onClick={onNew}
          className="w-full flex items-center gap-3 rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-all">
          <Plus size={16} className="shrink-0" /> Crear otra reserva
        </button>
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
  const [nombre,             setNombre]            = useState('')
  const [apellidos,          setApellidos]         = useState('')
  const [email,              setEmail]             = useState('')
  const [telefono,           setTelefono]          = useState('')
  const [dni,                setDni]               = useState('')
  const [razon_social,       setRazonSocial]       = useState('')
  const [nif_factura,        setNifFactura]        = useState('')
  const [direccion_factura,  setDireccionFactura]  = useState('')

  // Estancia
  const [fecha_entrada,  setFechaEntrada]  = useState('')
  const [fecha_salida,   setFechaSalida]   = useState('')
  const [num_huespedes,  setNumHuespedes]  = useState(10)
  const [menores,        setMenores]       = useState(0)
  const [tarifa, setTarifa] = useState<'FLEXIBLE' | 'NO_REEMBOLSABLE'>('FLEXIBLE')

  // Precio
  const [priceResult,      setPriceResult]      = useState<PriceResult | null>(null)
  const [descuento_manual, setDescuentoManual]  = useState('')
  const [calculating,      setCalculating]      = useState(false)
  const [priceError,       setPriceError]       = useState<string | null>(null)

  // Pago
  const [estado_pago,           setEstadoPago]       = useState<'UNPAID' | 'PARTIAL' | 'PAID'>('UNPAID')
  const [metodo_pago_previsto,  setMetodoPago]       = useState<'STRIPE' | 'TRANSFERENCIA' | 'EFECTIVO' | 'BIZUM'>('STRIPE')
  const [importe_pagado,        setImportePagado]    = useState('')

  // Notas
  const [notas_admin,   setNotasAdmin]   = useState('')
  const [notas_cliente, setNotasCliente] = useState('')

  // UI
  const [saving,        setSaving]        = useState(false)
  const [saveError,     setSaveError]     = useState<string | null>(null)
  const [createdReserva, setCreatedReserva] = useState<CreatedReserva | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // ── Derivados ────────────────────────────────────────────────────────────────
  const descuentoNum = parseFloat(descuento_manual) || 0
  const totalFinal   = priceResult ? Math.max(0, priceResult.total - descuentoNum) : 0
  const importeSenalFinal = priceResult?.importe_senal != null && priceResult.total > 0
    ? Math.round((priceResult.importe_senal / priceResult.total) * totalFinal * 100) / 100
    : null

  // ── Calcular precio (debounced 500ms) ────────────────────────────────────────
  const calcularPrecio = useCallback(async (
    entrada: string, salida: string, huespedes: number, t: string
  ) => {
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
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      calcularPrecio(fecha_entrada, fecha_salida, num_huespedes, tarifa)
    }, 500)
    return () => clearTimeout(debounceRef.current)
  }, [fecha_entrada, fecha_salida, num_huespedes, tarifa, calcularPrecio])

  // ── Guardar reserva ───────────────────────────────────────────────────────────
  async function handleSave() {
    if (!nombre || !apellidos || !email || !fecha_entrada || !fecha_salida || !priceResult) return
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
          telefono:           telefono || null,
          dni:                dni || null,
          razon_social:       razon_social || null,
          nif_factura:        nif_factura || null,
          direccion_factura:  direccion_factura || null,
          fecha_entrada,
          fecha_salida,
          num_huespedes:       Number(num_huespedes) || 1,
          menores:             Number(menores) || 0,
          temporada:           priceResult.season_type,
          tarifa,
          precio_noche:        priceResult.precio_noche,
          noches:              priceResult.nights,
          importe_alojamiento: priceResult.importe_alojamiento,
          importe_extra:       Number(priceResult.importe_extra) || 0,
          importe_limpieza:    Number(priceResult.limpieza) || 60,
          descuento:           Number(priceResult.descuento || 0) + descuentoNum,
          total:               totalFinal,
          importe_senal:       tarifa === 'FLEXIBLE' ? importeSenalFinal : null,
          estado:              'CONFIRMED',
          estado_pago,
          importe_pagado:      Number(importe_pagado) || 0,
          origen:              'ADMIN',
          notas_admin:         notas_admin || null,
          stripe_session_id:   null,
          stripe_payment_intent: null,
          expires_at:          null,
        })
        .select('id, codigo, token_cliente')
        .single()

      if (error) throw error

      setCreatedReserva({
        id:                  data.id,
        codigo:              data.codigo,
        token_cliente:       data.token_cliente,
        email,
        nombre,
        apellidos,
        total:               totalFinal,
        importe_pagado:      importePagadoNum,
        noches:              priceResult.nights,
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

  // ── Success ───────────────────────────────────────────────────────────────────
  if (createdReserva) {
    return <SuccessScreen reserva={createdReserva} onNew={() => setCreatedReserva(null)} />
  }

  const canSave = !!(nombre && apellidos && email && fecha_entrada && fecha_salida && priceResult && !calculating)

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">

      {/* Header */}
      <header className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/reservas')}
          className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Nueva reserva manual</h1>
          <p className="text-sm text-zinc-500">Confirmada directamente por el administrador</p>
        </div>
      </header>

      {/* ── SECCIÓN 1: CLIENTE ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-zinc-50 border-b border-zinc-100 px-6 py-4">
          <h2 className="text-sm font-bold text-zinc-700">1 · Datos del cliente (titular)</h2>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <Field label="Nombre *"    value={nombre}    onChange={setNombre}    placeholder="Fernando" required />
          <Field label="Apellidos *" value={apellidos} onChange={setApellidos} placeholder="García López" required />
          <Field label="Email *" type="email" value={email} onChange={setEmail} placeholder="cliente@email.com" required />
          <Field label="Teléfono" value={telefono} onChange={setTelefono} placeholder="+34 600 000 000" />
          <Field label="DNI / NIE / Pasaporte" value={dni} onChange={setDni} placeholder="12345678A" />
          <Field label="Razón social (empresa, opcional)" value={razon_social} onChange={setRazonSocial} placeholder="Empresa S.L." />
          <Field label="NIF factura (opcional)" value={nif_factura} onChange={setNifFactura} placeholder="B12345678" />
          <div className="col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Dirección factura (opcional)
            </label>
            <textarea value={direccion_factura} onChange={e => setDireccionFactura(e.target.value)}
              rows={2} placeholder="Calle, número, ciudad, CP..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none resize-none" />
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 2: ESTANCIA ────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-zinc-50 border-b border-zinc-100 px-6 py-4">
          <h2 className="text-sm font-bold text-zinc-700">2 · Datos de la estancia</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Fecha entrada *</label>
              <input type="date" value={fecha_entrada} min={today}
                onChange={e => setFechaEntrada(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-900 focus:border-zinc-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Fecha salida *</label>
              <input type="date" value={fecha_salida} min={fecha_entrada || today}
                onChange={e => setFechaSalida(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-900 focus:border-zinc-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Nº huéspedes (1-11) *</label>
              <input type="number" value={num_huespedes} min={1} max={11}
                onChange={e => setNumHuespedes(Math.min(11, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-900 focus:border-zinc-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Menores (informativo)</label>
              <input type="number" value={menores} min={0} max={5}
                onChange={e => setMenores(Math.min(5, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-900 focus:border-zinc-400 focus:outline-none" />
            </div>
          </div>

          {/* Tarifa */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Tarifa *</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'FLEXIBLE',        label: 'Flexible',        desc: 'Señal del 50% · política de cancelación flexible' },
                { value: 'NO_REEMBOLSABLE', label: 'No reembolsable', desc: '−10% sobre alojamiento · pago completo al reservar' },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => setTarifa(opt.value as any)}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${tarifa === opt.value ? 'border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900/10' : 'border-zinc-200 hover:border-zinc-300'}`}>
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-zinc-900">{opt.label}</p>
                    {tarifa === opt.value && <Check size={14} className="text-zinc-900" />}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 3: PRECIO ──────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-zinc-50 border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-700">3 · Desglose de precio</h2>
          {calculating && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Loader2 size={12} className="animate-spin" /> Calculando...
            </span>
          )}
        </div>
        <div className="p-6">
          {!fecha_entrada || !fecha_salida || fecha_salida <= fecha_entrada
            ? <p className="text-sm text-zinc-400 text-center py-4">Introduce las fechas para ver el precio</p>
            : priceError
              ? <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{priceError}</p>
              : priceResult && !calculating
                ? (
                  <div className="space-y-4">
                    {/* Desglose */}
                    <div className="rounded-xl border border-zinc-200 overflow-hidden text-sm">
                      <div className="flex justify-between items-center px-4 py-3 bg-zinc-50">
                        <span className="text-zinc-500">Temporada</span>
                        <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${priceResult.season_type === 'ALTA' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {priceResult.season_type}
                        </span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5 border-t border-zinc-100">
                        <span className="text-zinc-500">{priceResult.nights} noches × {priceResult.precio_noche} €/noche</span>
                        <span className="font-medium">{priceResult.importe_alojamiento.toFixed(2)} €</span>
                      </div>
                      {priceResult.importe_extra > 0 && (
                        <div className="flex justify-between px-4 py-2.5 border-t border-zinc-100">
                          <span className="text-zinc-500">Suplemento huésped extra ({priceResult.extra_guests} × {priceResult.extra_huesped} € × {priceResult.nights} noches)</span>
                          <span className="font-medium">{priceResult.importe_extra.toFixed(2)} €</span>
                        </div>
                      )}
                      <div className="flex justify-between px-4 py-2.5 border-t border-zinc-100">
                        <span className="text-zinc-500">Gastos de limpieza</span>
                        <span className="font-medium">{priceResult.limpieza.toFixed(2)} €</span>
                      </div>
                      {priceResult.descuento > 0 && (
                        <div className="flex justify-between px-4 py-2.5 border-t border-zinc-100 text-emerald-700">
                          <span>Descuento no reembolsable (−10%)</span>
                          <span className="font-medium">−{priceResult.descuento.toFixed(2)} €</span>
                        </div>
                      )}
                      <div className="flex justify-between px-4 py-3 border-t-2 border-zinc-200 font-bold text-zinc-700">
                        <span>Subtotal calculado</span>
                        <span>{priceResult.total.toFixed(2)} €</span>
                      </div>
                    </div>

                    {/* Descuento manual */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Descuento adicional negociado (€)
                      </label>
                      <input type="number" value={descuento_manual}
                        onChange={e => setDescuentoManual(e.target.value)}
                        placeholder="0.00" min="0" max={priceResult.total} step="0.01"
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-900 focus:border-zinc-400 focus:outline-none" />
                    </div>

                    {/* Total final */}
                    <div className={`rounded-xl p-5 border ${descuentoNum > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-200'}`}>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-bold text-zinc-700 uppercase tracking-wider">Total final</span>
                        <span className="text-3xl font-bold text-zinc-900">{totalFinal.toFixed(2)} €</span>
                      </div>
                      {descuentoNum > 0 && (
                        <p className="text-xs text-emerald-700 mt-1">
                          Descuento negociado: −{descuentoNum.toFixed(2)} € sobre {priceResult.total.toFixed(2)} €
                        </p>
                      )}
                      {tarifa === 'FLEXIBLE' && importeSenalFinal != null && (
                        <div className="flex justify-between mt-2 pt-2 border-t border-zinc-200 text-sm">
                          <span className="text-zinc-500">Señal (50%)</span>
                          <span className="font-bold text-emerald-700">{importeSenalFinal.toFixed(2)} €</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
                : calculating
                  ? <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-zinc-300" /></div>
                  : null
          }
        </div>
      </section>

      {/* ── SECCIÓN 4: PAGO ────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-zinc-50 border-b border-zinc-100 px-6 py-4">
          <h2 className="text-sm font-bold text-zinc-700">4 · Estado del pago</h2>
        </div>
        <div className="p-6 grid grid-cols-2 gap-6">
          {/* Estado */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Estado del pago</label>
            <div className="space-y-2">
              {[
                { value: 'UNPAID',  label: 'Pendiente',        desc: 'Se enviará solicitud de pago' },
                { value: 'PARTIAL', label: 'Señal recibida',   desc: 'Ha pagado la señal por otro medio' },
                { value: 'PAID',    label: 'Pagado completo',  desc: 'Ya está todo cobrado' },
              ].map(opt => (
                <label key={opt.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${estado_pago === opt.value ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'}`}>
                  <input type="radio" checked={estado_pago === opt.value}
                    onChange={() => setEstadoPago(opt.value as any)}
                    className="accent-zinc-900" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{opt.label}</p>
                    <p className="text-xs text-zinc-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Método + importe */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Método previsto</label>
              <select value={metodo_pago_previsto} onChange={e => setMetodoPago(e.target.value as any)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-900 focus:border-zinc-400 focus:outline-none">
                <option value="STRIPE">💳 Stripe (enlace online)</option>
                <option value="TRANSFERENCIA">🏦 Transferencia bancaria</option>
                <option value="EFECTIVO">💵 Efectivo al llegar</option>
                <option value="BIZUM">📱 Bizum</option>
              </select>
            </div>
            {estado_pago !== 'UNPAID' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Importe ya cobrado (€)
                </label>
                <input type="number" value={importe_pagado}
                  onChange={e => setImportePagado(e.target.value)}
                  placeholder="0.00" min="0" step="0.01"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-900 focus:border-zinc-400 focus:outline-none" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 5: NOTAS ───────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-zinc-50 border-b border-zinc-100 px-6 py-4">
          <h2 className="text-sm font-bold text-zinc-700">5 · Notas</h2>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Notas internas (admin)</label>
            <textarea value={notas_admin} onChange={e => setNotasAdmin(e.target.value)}
              rows={3} placeholder="Acuerdos especiales, condiciones, recordatorios..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none resize-none" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Notas para el cliente (email)</label>
            <textarea value={notas_cliente} onChange={e => setNotasCliente(e.target.value)}
              rows={3} placeholder="Aparecerá en el email de confirmación..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none resize-none" />
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────────── */}
      {saveError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={() => navigate('/admin/reservas')}
          className="rounded-xl border border-zinc-200 px-6 py-3 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={!canSave || saving}
          className="flex-1 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-40 flex items-center justify-center gap-2 transition-all">
          {saving
            ? <><Loader2 size={16} className="animate-spin" /> Creando reserva...</>
            : <><Check size={16} /> Crear reserva confirmada</>}
        </button>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ArrowLeft, User, Users, Calendar, Shield, CheckCircle2,
  Loader2, Info, Phone, Mail, FileText, Hash, Lock, ChevronDown
} from 'lucide-react'
import { RateType } from '../../shared/types'
import { PriceBreakdown } from '../../shared/types/booking'

export interface CustomerFormData {
  nombre: string
  apellidos: string
  tipo_documento: 'DNI' | 'NIE' | 'PASAPORTE'
  numero_documento: string
  telefono: string
  email: string
  email_confirm: string
  menores: number
}

interface Props {
  checkIn: Date
  checkOut: Date
  guests: number
  rateType: RateType
  flexibleBreakdown: PriceBreakdown
  nonRefundableBreakdown: PriceBreakdown
  onRateChange: (rate: RateType) => void
  onPay: (form: CustomerFormData) => Promise<void>
  onBack: () => void
  isProcessing: boolean
}

const EMPTY_FORM: CustomerFormData = {
  nombre: '',
  apellidos: '',
  tipo_documento: 'DNI',
  numero_documento: '',
  telefono: '',
  email: '',
  email_confirm: '',
  menores: 0,
}

export const BookingCheckoutSection: React.FC<Props> = ({
  checkIn, checkOut, guests, rateType, flexibleBreakdown, nonRefundableBreakdown,
  onRateChange, onPay, onBack, isProcessing
}) => {
  const [form, setForm] = useState<CustomerFormData>({ ...EMPTY_FORM, menores: 0 })
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormData | 'general', string>>>({})

  const bd = rateType === 'FLEXIBLE' ? flexibleBreakdown : nonRefundableBreakdown
  const nights = differenceInDays(checkOut, checkIn)

  const set = (field: keyof CustomerFormData, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const validate = (): boolean => {
    const e: typeof errors = {}
    if (!form.nombre.trim()) e.nombre = 'Obligatorio'
    if (!form.apellidos.trim()) e.apellidos = 'Obligatorio'
    if (!form.numero_documento.trim()) e.numero_documento = 'Obligatorio'
    if (!form.telefono.trim()) e.telefono = 'Obligatorio'
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email no válido'
    if (form.email !== form.email_confirm) e.email_confirm = 'Los emails no coinciden'
    if (form.menores < 0 || form.menores > guests) e.menores = `Entre 0 y ${guests}`
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    await onPay(form)
  }

  const fmtDate = (d: Date) =>
    format(d, "EEE d 'de' MMMM yyyy", { locale: es })
      .replace(/^\w/, c => c.toUpperCase())

  return (
    <div className="space-y-6 pt-2">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800 transition-colors"
      >
        <ArrowLeft size={16} />
        Volver a las tarifas
      </button>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">

        {/* ── IZQUIERDA: Formulario ─────────────────────── */}
        <div className="space-y-6">

          {/* Datos del titular */}
          <FormCard title="Datos del titular de la reserva" icon={<User size={18} />}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nombre" error={errors.nombre}>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => set('nombre', e.target.value)}
                  placeholder="Pedro"
                  className={inputCls(!!errors.nombre)}
                />
              </Field>
              <Field label="Apellidos" error={errors.apellidos}>
                <input
                  type="text"
                  value={form.apellidos}
                  onChange={e => set('apellidos', e.target.value)}
                  placeholder="García López"
                  className={inputCls(!!errors.apellidos)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Tipo de documento" error={undefined}>
                <select
                  value={form.tipo_documento}
                  onChange={e => set('tipo_documento', e.target.value)}
                  className={inputCls(false)}
                >
                  <option value="DNI">DNI</option>
                  <option value="NIE">NIE</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
              </Field>
              <Field label="Número de documento" error={errors.numero_documento}>
                <div className="relative">
                  <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={form.numero_documento}
                    onChange={e => set('numero_documento', e.target.value.toUpperCase())}
                    placeholder="12345678A"
                    className={`${inputCls(!!errors.numero_documento)} pl-8`}
                  />
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Teléfono" error={errors.telefono}>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={e => set('telefono', e.target.value)}
                    placeholder="+34 600 000 000"
                    className={`${inputCls(!!errors.telefono)} pl-8`}
                  />
                </div>
              </Field>
              <Field label="Número de huéspedes" error={undefined}>
                <div className="flex items-center gap-3 h-11">
                  <span className="text-sm font-semibold text-stone-800 flex items-center gap-1.5">
                    <Users size={16} className="text-stone-400" />
                    {guests} {guests === 1 ? 'huésped' : 'huéspedes'}
                  </span>
                  <span className="text-xs text-stone-400">(seleccionados en la búsqueda)</span>
                </div>
              </Field>
            </div>

            <Field label="Menores de edad incluidos" error={errors.menores}>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => set('menores', Math.max(0, form.menores - 1))}
                  className="w-9 h-9 rounded-lg border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 text-lg font-bold"
                >−</button>
                <span className="w-8 text-center font-semibold text-stone-800">{form.menores}</span>
                <button
                  type="button"
                  onClick={() => set('menores', Math.min(guests, form.menores + 1))}
                  className="w-9 h-9 rounded-lg border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 text-lg font-bold"
                >+</button>
                <span className="text-xs text-stone-400 ml-1">
                  ({guests - form.menores} adultos · {form.menores} menores)
                </span>
              </div>
            </Field>
          </FormCard>

          {/* Contacto */}
          <FormCard title="Correo electrónico" icon={<Mail size={18} />}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email" error={errors.email}>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => set('email', e.target.value.toLowerCase())}
                    placeholder="pedro@email.com"
                    className={`${inputCls(!!errors.email)} pl-8`}
                  />
                </div>
              </Field>
              <Field label="Confirmar email" error={errors.email_confirm}>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="email"
                    value={form.email_confirm}
                    onChange={e => set('email_confirm', e.target.value.toLowerCase())}
                    placeholder="pedro@email.com"
                    className={`${inputCls(!!errors.email_confirm)} pl-8`}
                  />
                </div>
              </Field>
            </div>
            <div className="flex items-start gap-2 bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>
                Recibirás la <strong>confirmación de reserva</strong> y el <strong>enlace para registrar a los huéspedes</strong> en este correo.
              </span>
            </div>
          </FormCard>

          {/* Info registro huéspedes */}
          <FormCard title="Registro de viajeros (normativa española)" icon={<FileText size={18} />}>
            <div className="space-y-3 text-sm text-stone-600">
              <p>
                Conforme al <strong>RD 933/2021</strong> del Ministerio del Interior, estamos obligados a registrar los datos de todos los viajeros mayores de 14 años.
              </p>
              <p>
                Tras confirmar tu reserva, recibirás un enlace para <strong>completar el registro</strong> de todos los huéspedes antes del check-in. Puedes hacerlo desde el móvil el mismo día de llegada.
              </p>
              <div className="flex items-center gap-2 bg-amber-50 rounded-lg p-3 text-xs text-amber-700">
                <Info size={13} className="shrink-0" />
                Los datos de registro son obligatorios para la confirmación final del check-in.
              </div>
            </div>
          </FormCard>

          {/* Tarifa elegida */}
          <FormCard title="Selección de tarifa" icon={<Shield size={18} />}>
            <div className="grid grid-cols-2 gap-3">
              {/* Flexible */}
              <button
                onClick={() => onRateChange('FLEXIBLE')}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  rateType === 'FLEXIBLE'
                    ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/10'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Flexible</p>
                  {rateType === 'FLEXIBLE' && <CheckCircle2 size={16} className="text-emerald-600" />}
                </div>
                <p className="text-xl font-serif font-bold text-stone-900">{flexibleBreakdown.total.toFixed(2)}€</p>
                <p className="text-xs text-stone-400 mt-1">Señal {flexibleBreakdown.depositRequired.toFixed(0)}€ · Resto 30 días antes</p>
                <p className="text-[10px] text-emerald-700 mt-1 font-medium">Cancelación gratuita hasta 60 días</p>
              </button>

              {/* No Reembolsable */}
              <button
                onClick={() => onRateChange('NON_REFUNDABLE')}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  rateType === 'NON_REFUNDABLE'
                    ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/10'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-500">No Reembolsable</p>
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">−10%</span>
                  </div>
                  {rateType === 'NON_REFUNDABLE' && <CheckCircle2 size={16} className="text-emerald-600" />}
                </div>
                <p className="text-xl font-serif font-bold text-stone-900">{nonRefundableBreakdown.total.toFixed(2)}€</p>
                <p className="text-xs text-stone-400 mt-1">Pago completo al reservar</p>
                <p className="text-[10px] text-red-600 mt-1 font-medium">Sin cancelación ni cambios</p>
              </button>
            </div>
          </FormCard>

          {/* Aviso RGPD */}
          <p className="text-xs text-stone-400 leading-relaxed">
            Al confirmar aceptas nuestra{' '}
            <a href="/politica-privacidad" target="_blank" className="underline hover:text-stone-600">política de privacidad</a>{' '}
            y las{' '}
            <a href="/condiciones-reserva" target="_blank" className="underline hover:text-stone-600">condiciones de reserva</a>.
            Tus datos se tratarán según el RGPD y no serán cedidos a terceros salvo obligación legal.
          </p>
        </div>

        {/* ── DERECHA: Resumen reserva (sticky) ────────── */}
        <div className="lg:sticky lg:top-6 space-y-4 h-fit">

          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-stone-900 px-6 py-4 text-white">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Resumen de reserva</p>
              <p className="font-serif font-bold text-lg">La Rasilla · Valles Pasiegos</p>
            </div>

            {/* Fechas */}
            <div className="px-6 py-4 border-b border-stone-100 space-y-3">
              <div className="flex items-start gap-3">
                <Calendar size={16} className="text-stone-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-stone-400 uppercase font-bold tracking-wider">Entrada</p>
                      <p className="font-semibold text-stone-800 mt-0.5">{fmtDate(checkIn)}</p>
                      <p className="text-xs text-stone-500">A partir de las 16:00 h</p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 uppercase font-bold tracking-wider">Salida</p>
                      <p className="font-semibold text-stone-800 mt-0.5">{fmtDate(checkOut)}</p>
                      <p className="text-xs text-stone-500">Antes de las 11:00 h</p>
                    </div>
                  </div>
                  <div className="mt-2 bg-stone-50 rounded-lg px-3 py-2 text-center">
                    <span className="text-sm font-bold text-stone-800">{nights} {nights === 1 ? 'noche' : 'noches'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Users size={16} className="text-stone-400 shrink-0" />
                <span className="text-stone-700">
                  <strong>{guests}</strong> huéspedes
                  {form.menores > 0 && (
                    <span className="text-stone-400"> ({guests - form.menores} adultos · {form.menores} menores)</span>
                  )}
                </span>
              </div>
            </div>

            {/* Desglose precios */}
            <div className="px-6 py-4 border-b border-stone-100 space-y-2 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>{nights} noches × {bd.nightlyPrice.toFixed(0)}€</span>
                <span>{bd.accommodationTotal.toFixed(2)}€</span>
              </div>
              {bd.extraGuestsTotal > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>Suplemento huésped {guests}º</span>
                  <span>{bd.extraGuestsTotal.toFixed(2)}€</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>Gastos de limpieza</span>
                <span>{bd.cleaningFee.toFixed(2)}€</span>
              </div>
              {bd.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Descuento no reembolsable (10%)</span>
                  <span>−{bd.discount.toFixed(2)}€</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-stone-900 text-base pt-2 border-t border-stone-200">
                <span>Total</span>
                <span>{bd.total.toFixed(2)}€</span>
              </div>
            </div>

            {/* Tarifa y pago */}
            <div className="px-6 py-4 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Tarifa</span>
                <span className={`font-semibold ${rateType === 'FLEXIBLE' ? 'text-emerald-700' : 'text-stone-800'}`}>
                  {rateType === 'FLEXIBLE' ? 'Flexible' : 'No Reembolsable'}
                </span>
              </div>
              {rateType === 'FLEXIBLE' ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500">Señal ahora ({Math.round(bd.depositRequired / bd.total * 100)}%)</span>
                    <span className="font-bold text-emerald-700">{bd.depositRequired.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500">Resto (30 días antes)</span>
                    <span className="font-semibold text-stone-700">{(bd.total - bd.depositRequired).toFixed(2)}€</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-stone-500">Pago completo</span>
                  <span className="font-bold text-stone-800">{bd.total.toFixed(2)}€</span>
                </div>
              )}
            </div>
          </div>

          {/* Botón pagar */}
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="w-full rounded-xl bg-emerald-700 py-5 text-base font-bold text-white shadow-xl
              transition-all hover:bg-emerald-800 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50
              flex items-center justify-center gap-3"
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Procesando reserva...
              </>
            ) : (
              <>
                <Lock size={18} />
                Pagar {rateType === 'FLEXIBLE'
                  ? `${bd.depositRequired.toFixed(2)}€ de señal`
                  : `${bd.total.toFixed(2)}€`}
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-xs text-stone-400">
            <Shield size={13} />
            Pago 100% seguro · Datos cifrados SSL
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Helpers UI ────────────────────────────────────────────

function FormCard({ title, icon, children }: {
  title: string; icon: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-800">
        <span className="text-stone-400">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  )
}

function Field({ label, error, children }: {
  label: string; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function inputCls(hasError: boolean) {
  return `w-full border rounded-lg px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 transition-colors ${
    hasError
      ? 'border-red-300 bg-red-50 focus:ring-red-400'
      : 'border-stone-200 focus:ring-emerald-500 focus:border-transparent'
  }`
}

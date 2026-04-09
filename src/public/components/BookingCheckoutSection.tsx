import React, { useState } from 'react'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ArrowLeft,
  User,
  Users,
  Calendar,
  Shield,
  CheckCircle2,
  Loader2,
  Info,
  Phone,
  Mail,
  FileText,
  Hash,
  Lock,
  Home,
} from 'lucide-react'
import { RemotePriceBreakdown } from '../booking/BookingFlowContext'

export type RateType = 'FLEXIBLE' | 'NON_REFUNDABLE'

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
  breakdown: RemotePriceBreakdown
  propertyName?: string
  selectedCombinationLabel?: string
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
  checkIn,
  checkOut,
  guests,
  rateType,
  breakdown,
  propertyName = 'Reserva directa',
  selectedCombinationLabel,
  onRateChange,
  onPay,
  onBack,
  isProcessing,
}) => {
  const [form, setForm] = useState<CustomerFormData>({ ...EMPTY_FORM })
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormData | 'general', string>>>({})

  const nights = differenceInDays(checkOut, checkIn)
  const hasDeposit = rateType === 'FLEXIBLE' && (breakdown.importe_senal ?? 0) > 0

  const set = (field: keyof CustomerFormData, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const validate = (): boolean => {
    const e: typeof errors = {}
    if (!form.nombre.trim()) e.nombre = 'Obligatorio'
    if (!form.apellidos.trim()) e.apellidos = 'Obligatorio'
    if (!form.numero_documento.trim()) e.numero_documento = 'Obligatorio'
    if (!form.telefono.trim()) e.telefono = 'Obligatorio'
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Email no válido'
    }
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
    format(d, "EEE d 'de' MMMM yyyy", { locale: es }).replace(/^\w/, (c) => c.toUpperCase())

  // Totales con fallback a 0 para evitar crashes si algún campo es undefined
  const importeAloj     = breakdown.importe_alojamiento_total ?? 0
  const importeExtras   = breakdown.importe_extras_total ?? 0
  const importeLimp     = breakdown.importe_limpieza_total ?? 0
  const importeDesc     = breakdown.descuento_aplicado ?? 0
  const importeTotal    = breakdown.importe_total ?? 0
  const importeSenal    = breakdown.importe_senal ?? 0
  const importeResto    = breakdown.importe_resto ?? 0

  return (
    <div className="space-y-4 pt-1">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-stone-500 transition-colors hover:text-stone-800"
      >
        <ArrowLeft size={15} />
        Volver a las tarifas
      </button>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <SectionCard title="Datos del titular" icon={<User size={16} />}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nombre" error={errors.nombre}>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => set('nombre', e.target.value)}
                  placeholder="Pedro"
                  className={inputCls(!!errors.nombre)}
                />
              </Field>

              <Field label="Apellidos" error={errors.apellidos}>
                <input
                  type="text"
                  value={form.apellidos}
                  onChange={(e) => set('apellidos', e.target.value)}
                  placeholder="García López"
                  className={inputCls(!!errors.apellidos)}
                />
              </Field>

              <Field label="Tipo de documento">
                <select
                  value={form.tipo_documento}
                  onChange={(e) =>
                    set('tipo_documento', e.target.value as CustomerFormData['tipo_documento'])
                  }
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
                    onChange={(e) => set('numero_documento', e.target.value.toUpperCase())}
                    placeholder="12345678A"
                    className={`${inputCls(!!errors.numero_documento)} pl-8`}
                  />
                </div>
              </Field>

              <Field label="Teléfono" error={errors.telefono}>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={(e) => set('telefono', e.target.value)}
                    placeholder="+34 600 000 000"
                    className={`${inputCls(!!errors.telefono)} pl-8`}
                  />
                </div>
              </Field>

              <Field label="Huéspedes">
                <div className="flex h-11 items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-700">
                  <Users size={15} className="text-stone-400" />
                  <span className="font-medium">
                    {guests} {guests === 1 ? 'huésped' : 'huéspedes'}
                  </span>
                </div>
              </Field>
            </div>

            <Field label="Menores incluidos" error={errors.menores}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => set('menores', Math.max(0, form.menores - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-semibold text-stone-800">{form.menores}</span>
                  <button
                    type="button"
                    onClick={() => set('menores', Math.min(guests, form.menores + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-stone-400">
                  {guests - form.menores} adultos · {form.menores} menores
                </span>
              </div>
            </Field>
          </SectionCard>

          <SectionCard title="Correo electrónico" icon={<Mail size={16} />}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Email" error={errors.email}>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value.toLowerCase())}
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
                    onChange={(e) => set('email_confirm', e.target.value.toLowerCase())}
                    placeholder="pedro@email.com"
                    className={`${inputCls(!!errors.email_confirm)} pl-8`}
                  />
                </div>
              </Field>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              <Info size={13} className="mt-0.5 shrink-0" />
              <span>
                En este correo recibirás la confirmación de la reserva y las instrucciones posteriores.
              </span>
            </div>
          </SectionCard>

          <SectionCard title="Tarifa" icon={<Shield size={16} />}>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                onClick={() => onRateChange('FLEXIBLE')}
                className={`rounded-xl border p-4 text-left transition ${
                  rateType === 'FLEXIBLE'
                    ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/10'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    Flexible
                  </p>
                  {rateType === 'FLEXIBLE' && <CheckCircle2 size={16} className="text-emerald-600" />}
                </div>
                <p className="text-lg font-bold text-stone-900">{importeTotal.toFixed(2)} €</p>
                <p className="mt-1 text-xs text-stone-500">
                  {hasDeposit
                    ? `Señal ${importeSenal.toFixed(2)} € · resto ${importeResto.toFixed(2)} €`
                    : 'Pago completo'}
                </p>
                <p className="mt-1 text-[11px] font-medium text-emerald-700">
                  Cancelación según condiciones
                </p>
              </button>

              <button
                onClick={() => onRateChange('NON_REFUNDABLE')}
                className={`rounded-xl border p-4 text-left transition ${
                  rateType === 'NON_REFUNDABLE'
                    ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/10'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                      No reembolsable
                    </p>
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                      −10%
                    </span>
                  </div>
                  {rateType === 'NON_REFUNDABLE' && (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  )}
                </div>
                <p className="text-lg font-bold text-stone-900">{importeTotal.toFixed(2)} €</p>
                <p className="mt-1 text-xs text-stone-500">Pago completo al reservar</p>
                <p className="mt-1 text-[11px] font-medium text-red-600">Sin cancelación ni cambios</p>
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Registro de viajeros" icon={<FileText size={16} />}>
            <div className="space-y-2 text-sm text-stone-600">
              <p>
                Según el <strong>RD 933/2021</strong>, los viajeros mayores de 14 años deben completar
                el registro antes del check-in.
              </p>
              <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <Info size={13} className="mt-0.5 shrink-0" />
                <span>Recibirás el enlace para completar el registro tras confirmar la reserva.</span>
              </div>
            </div>
          </SectionCard>

          <p className="text-xs leading-relaxed text-stone-400">
            Al confirmar aceptas nuestra{' '}
            <a href="/politica-privacidad" target="_blank" className="underline hover:text-stone-600" rel="noreferrer">
              política de privacidad
            </a>{' '}
            y las{' '}
            <a href="/condiciones-reserva" target="_blank" className="underline hover:text-stone-600" rel="noreferrer">
              condiciones de reserva
            </a>
            .
          </p>
        </div>

        {/* Sidebar resumen */}
        <aside className="h-fit space-y-4 xl:sticky xl:top-6">
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="bg-stone-900 px-5 py-4 text-white">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Resumen de reserva
              </p>
              <p className="text-lg font-bold">{propertyName}</p>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="grid gap-3 text-sm text-stone-600">
                <div className="flex items-start gap-3">
                  <Calendar size={16} className="mt-0.5 shrink-0 text-stone-400" />
                  <div className="grid flex-1 grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Entrada</p>
                      <p className="mt-0.5 font-semibold text-stone-800">{fmtDate(checkIn)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Salida</p>
                      <p className="mt-0.5 font-semibold text-stone-800">{fmtDate(checkOut)}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-stone-50 px-3 py-2 text-center text-sm font-semibold text-stone-800">
                  {nights} {nights === 1 ? 'noche' : 'noches'}
                </div>

                <div className="flex items-center gap-2">
                  <Users size={15} className="text-stone-400" />
                  <span className="text-stone-700">
                    <strong>{guests}</strong> huéspedes
                    {form.menores > 0 && (
                      <span className="text-stone-400">
                        {' '}({guests - form.menores} adultos · {form.menores} menores)
                      </span>
                    )}
                  </span>
                </div>

                {selectedCombinationLabel && (
                  <div className="flex items-start gap-2">
                    <Home size={15} className="mt-0.5 text-stone-400" />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Combinación</p>
                      <p className="mt-0.5 font-medium text-stone-800">{selectedCombinationLabel}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Desglose por unidad — campos del nuevo calculate-price */}
              {(breakdown.unidades?.length ?? 0) > 0 && (
                <div className="space-y-2 border-t border-stone-100 pt-4">
                  {breakdown.unidades.map((u) => {
                    // Campos reales de calculate-price: nombre, importe_alojamiento,
                    // importe_extras, importe_limpieza, importe_subtotal, noches,
                    // num_huespedes_asignados, extras_asignados
                    const uTotal = (u.importe_alojamiento ?? 0) + (u.importe_extras ?? 0) + (u.importe_limpieza ?? 0)
                    return (
                      <div key={u.unidad_id} className="rounded-lg bg-stone-50 px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-stone-800">{u.nombre}</p>
                            <p className="mt-0.5 text-xs text-stone-500">
                              {u.num_huespedes_asignados} huésp. · {u.noches} noche{u.noches !== 1 ? 's' : ''}
                              {u.extras_asignados > 0 && (
                                <span className="ml-1 text-amber-600">+{u.extras_asignados} extra</span>
                              )}
                            </p>
                          </div>
                          <p className="font-bold text-stone-900">{uTotal.toFixed(2)} €</p>
                        </div>

                        <div className="mt-2 space-y-1 text-xs text-stone-500">
                          <div className="flex justify-between">
                            <span>Alojamiento</span>
                            <span>{(u.importe_alojamiento ?? 0).toFixed(2)} €</span>
                          </div>
                          {(u.importe_extras ?? 0) > 0 && (
                            <div className="flex justify-between">
                              <span>Extras</span>
                              <span>{(u.importe_extras ?? 0).toFixed(2)} €</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Limpieza</span>
                            <span>{(u.importe_limpieza ?? 0).toFixed(2)} €</span>
                          </div>
                          {u.es_especial && (
                            <div className="text-amber-600">Tarifa: {u.temporada_nombre}</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Totales globales */}
              <div className="space-y-2 border-t border-stone-100 pt-4 text-sm">
                <div className="flex justify-between text-stone-600">
                  <span>Alojamiento</span>
                  <span>{importeAloj.toFixed(2)} €</span>
                </div>
                {importeExtras > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span>Extras</span>
                    <span>{importeExtras.toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600">
                  <span>Limpieza</span>
                  <span>{importeLimp.toFixed(2)} €</span>
                </div>
                {importeDesc > 0 && (
                  <div className="flex justify-between font-medium text-emerald-700">
                    <span>Descuento no reembolsable</span>
                    <span>-{importeDesc.toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-stone-200 pt-3 text-base font-bold text-stone-900">
                  <span>Total</span>
                  <span>{importeTotal.toFixed(2)} €</span>
                </div>
              </div>

              {/* Señal / pago */}
              <div className="space-y-2 border-t border-stone-100 pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Tarifa</span>
                  <span className={`font-semibold ${rateType === 'FLEXIBLE' ? 'text-emerald-700' : 'text-stone-800'}`}>
                    {rateType === 'FLEXIBLE' ? 'Flexible' : 'No reembolsable'}
                  </span>
                </div>

                {hasDeposit ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Señal ahora ({breakdown.porcentaje_senal ?? 30}%)</span>
                      <span className="font-bold text-emerald-700">{importeSenal.toFixed(2)} €</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Resto</span>
                      <span className="font-semibold text-stone-700">{importeResto.toFixed(2)} €</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Pago ahora</span>
                    <span className="font-bold text-stone-800">{importeTotal.toFixed(2)} €</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-700 py-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Procesando reserva...
              </>
            ) : (
              <>
                <Lock size={16} />
                Pagar{' '}
                {hasDeposit
                  ? `${importeSenal.toFixed(2)} € de señal`
                  : `${importeTotal.toFixed(2)} €`}
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-[11px] text-stone-400">
            <Shield size={12} />
            Pago seguro · SSL
          </div>
        </aside>
      </div>
    </div>
  )
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-800">
        <span className="text-stone-400">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-stone-500">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function inputCls(hasError: boolean) {
  return `h-11 w-full rounded-lg border px-3 text-sm text-stone-800 transition-colors focus:outline-none focus:ring-2 ${
    hasError
      ? 'border-red-300 bg-red-50 focus:ring-red-400'
      : 'border-stone-200 bg-white focus:border-transparent focus:ring-emerald-500'
  }`
}
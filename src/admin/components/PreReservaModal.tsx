// src/admin/components/PreReservaModal.tsx
// Modal de Pre-Reserva / Presupuesto para consultas comerciales.
// No crea reserva real ni bloquea fechas.

import { useState, useEffect, useCallback } from 'react'
import {
  X, Calculator, Send, Loader2, Check, AlertCircle,
  CalendarDays, Euro, Users, ChevronDown,
} from 'lucide-react'
import { supabase } from '../../integrations/supabase/client'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Unidad {
  id: string
  nombre: string
  capacidad_base: number
  capacidad_maxima: number
}

interface PrecioResult {
  importe_total: number
  importe_alojamiento_total: number
  importe_limpieza_total: number
  importe_extras_total: number
  descuento_aplicado: number
  noches: number
  warnings: string[]
}

interface Props {
  onClose: () => void
  onSent: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcNoches(entrada: string, salida: string): number {
  if (!entrada || !salida) return 0
  const ms = new Date(salida + 'T00:00:00Z').getTime() - new Date(entrada + 'T00:00:00Z').getTime()
  return Math.round(ms / 86400000)
}

function fmt(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Componente ────────────────────────────────────────────────────────────────

export function PreReservaModal({ onClose, onSent }: Props) {
  // Datos cliente
  const [nombre, setNombre]       = useState('')
  const [apellidos, setApellidos] = useState('')
  const [email, setEmail]         = useState('')
  const [telefono, setTelefono]   = useState('')

  // Estancia
  const [fechaEntrada, setFechaEntrada] = useState('')
  const [fechaSalida,  setFechaSalida]  = useState('')
  const [numHuespedes, setNumHuespedes] = useState(2)
  const [tarifa, setTarifa]             = useState<'FLEXIBLE' | 'NO_REEMBOLSABLE'>('FLEXIBLE')

  // Unidades
  const [unidades,       setUnidades]       = useState<Unidad[]>([])
  const [unidadSel,      setUnidadSel]      = useState<string>('')
  const [loadingUnits,   setLoadingUnits]   = useState(false)
  const [propertyId,     setPropertyId]     = useState<string | null>(null)

  // Precio
  const [calculando,       setCalculando]       = useState(false)
  const [precioResult,     setPrecioResult]     = useState<PrecioResult | null>(null)
  const [precioError,      setPrecioError]      = useState('')
  const [descuento,        setDescuento]        = useState(0)
  const [comentarios,      setComentarios]      = useState('')

  // Submit
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  // ── Cargar property_id y unidades activas ──────────────────────────────────
  useEffect(() => {
    async function loadUnits() {
      setLoadingUnits(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: membership } = await supabase
          .from('property_users')
          .select('property_id')
          .eq('user_id', user.id)
          .single()

        if (!membership) return
        setPropertyId(membership.property_id)

        const { data } = await supabase
          .from('unidades')
          .select('id, nombre, capacidad_base, capacidad_maxima')
          .eq('property_id', membership.property_id)
          .eq('activa', true)
          .order('nombre')

        const lista = data ?? []
        setUnidades(lista)
        if (lista.length > 0) setUnidadSel(lista[0].id)
      } catch (e) {
        console.error('PreReservaModal loadUnits:', e)
      } finally {
        setLoadingUnits(false)
      }
    }
    loadUnits()
  }, [])

  // ── Calcular precio automáticamente cuando cambian fechas/huéspedes/unidad ─
  const calcularPrecio = useCallback(async () => {
    if (!propertyId || !fechaEntrada || !fechaSalida) {
      setPrecioResult(null)
      return
    }
    const noches = calcNoches(fechaEntrada, fechaSalida)
    if (noches <= 0) {
      setPrecioError('La fecha de salida debe ser posterior a la de entrada')
      setPrecioResult(null)
      return
    }

    if (!unidadSel) return

    const unidadesParam = [{ unidad_id: unidadSel }]

    setCalculando(true)
    setPrecioError('')
    setPrecioResult(null)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('calculate-price', {
        body: {
          property_id:   propertyId,
          fecha_entrada: fechaEntrada,
          fecha_salida:  fechaSalida,
          num_huespedes: numHuespedes,
          tarifa,
          unidades:      unidadesParam,
        },
      })

      if (fnError) throw new Error(fnError.message)
      if (data?.error) throw new Error(data.error)

      setPrecioResult({
        importe_total:             Number(data.importe_total ?? 0),
        importe_alojamiento_total: Number(data.importe_alojamiento_total ?? 0),
        importe_limpieza_total:    Number(data.importe_limpieza_total ?? 0),
        importe_extras_total:      Number(data.importe_extras_total ?? 0),
        descuento_aplicado:        Number(data.descuento_aplicado ?? 0),
        noches:                    Number(data.noches ?? noches),
        warnings:                  data.warnings ?? [],
      })
    } catch (e: any) {
      setPrecioError(e.message ?? 'Error al calcular precio')
    } finally {
      setCalculando(false)
    }
  }, [propertyId, fechaEntrada, fechaSalida, numHuespedes, tarifa, unidadSel, unidades])

  useEffect(() => {
    const t = setTimeout(calcularPrecio, 400)
    return () => clearTimeout(t)
  }, [calcularPrecio])

  // ── Valores derivados ─────────────────────────────────────────────────────
  const precioCalculado = precioResult?.importe_total ?? 0
  const precioFinal     = Math.max(0, precioCalculado - descuento)
  const noches          = calcNoches(fechaEntrada, fechaSalida)

  const unidadNombres = unidades.find(u => u.id === unidadSel)?.nombre ?? ''

  // ── Validación ─────────────────────────────────────────────────────────────
  const emailOk    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSubmit  =
    nombre.trim() &&
    emailOk &&
    fechaEntrada &&
    fechaSalida &&
    noches > 0 &&
    unidadSel &&
    precioResult !== null &&
    !calculando &&
    !sending

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setSending(true)
    setError('')

    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-presupuesto', {
        body: {
          nombre,
          apellidos,
          email: email.trim().toLowerCase(),
          telefono,
          fecha_entrada:    fechaEntrada,
          fecha_salida:     fechaSalida,
          num_huespedes:    numHuespedes,
          noches,
          precio_calculado: precioCalculado,
          descuento,
          precio_final:     precioFinal,
          comentarios,
          unidad_nombres:   unidadNombres,
          app_url:          window.location.origin,
        },
      })

      if (fnError) throw new Error(fnError.message)
      if (!data?.ok) throw new Error(data?.error ?? 'Error desconocido')

      setSent(true)
      setTimeout(() => {
        onSent()
        onClose()
      }, 1500)
    } catch (e: any) {
      setError(e.message ?? 'Error al enviar el presupuesto')
    } finally {
      setSending(false)
    }
  }

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl my-4 rounded-2xl border border-sidebar-border bg-sidebar-bg shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600/20">
              <Calculator size={16} className="text-brand-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Pre-Reserva / Presupuesto</h2>
              <p className="text-[11px] text-slate-500">No bloquea fechas · Queda registrado como consulta</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={sending}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            {/* ── Columna izquierda: Cliente ── */}
            <div className="space-y-4">
              <SectionLabel icon={<Users size={13} />} text="Datos del cliente" />

              <Field label="Nombre *">
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  disabled={sending || sent}
                  autoFocus
                  placeholder="Nombre"
                  className={inputCls}
                />
              </Field>

              <Field label="Apellidos">
                <input
                  type="text"
                  value={apellidos}
                  onChange={e => setApellidos(e.target.value)}
                  disabled={sending || sent}
                  placeholder="Apellidos"
                  className={inputCls}
                />
              </Field>

              <Field label="Email *">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={sending || sent}
                  placeholder="cliente@ejemplo.com"
                  className={inputCls}
                />
                {email && !emailOk && (
                  <p className="mt-1 text-xs text-amber-400">Email no válido</p>
                )}
              </Field>

              <Field label="Teléfono">
                <input
                  type="tel"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  disabled={sending || sent}
                  placeholder="+34 600 000 000"
                  className={inputCls}
                />
              </Field>
            </div>

            {/* ── Columna derecha: Estancia ── */}
            <div className="space-y-4">
              <SectionLabel icon={<CalendarDays size={13} />} text="Datos de la estancia" />

              <Field label="Fecha entrada *">
                <input
                  type="date"
                  value={fechaEntrada}
                  onChange={e => {
                    setFechaEntrada(e.target.value)
                    if (fechaSalida && e.target.value >= fechaSalida) setFechaSalida('')
                  }}
                  disabled={sending || sent}
                  className={inputCls}
                />
              </Field>

              <Field label="Fecha salida *">
                <input
                  type="date"
                  value={fechaSalida}
                  min={fechaEntrada || undefined}
                  onChange={e => setFechaSalida(e.target.value)}
                  disabled={sending || sent}
                  className={inputCls}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Huéspedes">
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={numHuespedes}
                      onChange={e => setNumHuespedes(Math.max(1, Number(e.target.value)))}
                      disabled={sending || sent}
                      className={inputCls}
                    />
                  </div>
                </Field>

                <Field label="Tarifa">
                  <div className="relative">
                    <select
                      value={tarifa}
                      onChange={e => setTarifa(e.target.value as any)}
                      disabled={sending || sent}
                      className={inputCls + ' appearance-none pr-8'}
                    >
                      <option value="FLEXIBLE">Flexible</option>
                      <option value="NO_REEMBOLSABLE">No reemb.</option>
                    </select>
                    <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </Field>
              </div>

              <Field label="Alojamiento">
                <div className="relative">
                  {loadingUnits ? (
                    <div className={inputCls + ' flex items-center gap-2 text-slate-500'}>
                      <Loader2 size={13} className="animate-spin" /> Cargando…
                    </div>
                  ) : (
                    <>
                      <select
                        value={unidadSel}
                        onChange={e => setUnidadSel(e.target.value)}
                        disabled={sending || sent || unidades.length === 0}
                        className={inputCls + ' appearance-none pr-8'}
                      >
                        {unidades.length === 0 && (
                          <option value="">Sin unidades</option>
                        )}
                        {unidades.map(u => (
                          <option key={u.id} value={u.id}>{u.nombre}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </>
                  )}
                </div>
              </Field>
            </div>
          </div>

          {/* ── Bloque de precio ─────────────────────────────────────────────── */}
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <SectionLabel icon={<Euro size={13} />} text="Desglose económico" />

            {calculando && (
              <div className="flex items-center gap-2 text-sm text-slate-400 mt-3">
                <Loader2 size={14} className="animate-spin" /> Calculando precio…
              </div>
            )}

            {precioError && !calculando && (
              <p className="mt-2 text-xs text-amber-400">{precioError}</p>
            )}

            {precioResult && !calculando && (
              <div className="mt-3 space-y-2 text-sm">
                <PriceRow label="Alojamiento" value={precioResult.importe_alojamiento_total} />
                {precioResult.importe_extras_total > 0 && (
                  <PriceRow label="Extras huéspedes" value={precioResult.importe_extras_total} />
                )}
                {precioResult.importe_limpieza_total > 0 && (
                  <PriceRow label="Limpieza" value={precioResult.importe_limpieza_total} />
                )}
                {precioResult.descuento_aplicado > 0 && (
                  <PriceRow label="Dto. tarifa" value={-precioResult.descuento_aplicado} color="text-amber-400" />
                )}
                <div className="border-t border-slate-700 pt-2">
                  <PriceRow label={`Precio calculado (${noches} noche${noches !== 1 ? 's' : ''})`} value={precioCalculado} bold />
                </div>

                {/* Descuento manual */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-slate-400 w-32 shrink-0 text-xs">Descuento manual (€)</span>
                  <input
                    type="number"
                    min={0}
                    max={precioCalculado}
                    step={0.01}
                    value={descuento}
                    onChange={e => setDescuento(Math.max(0, Math.min(precioCalculado, Number(e.target.value))))}
                    disabled={sending || sent}
                    className="w-28 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-500/20"
                  />
                  {descuento > 0 && (
                    <span className="text-amber-400 text-xs">- {fmt(descuento)} €</span>
                  )}
                </div>

                <div className="border-t border-slate-600 pt-2">
                  <PriceRow label="💰 Total ofertado" value={precioFinal} bold accent />
                </div>

                {precioResult.warnings.length > 0 && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-300">
                    {precioResult.warnings.join(' · ')}
                  </div>
                )}
              </div>
            )}

            {!precioResult && !calculando && !precioError && (
              <p className="mt-3 text-xs text-slate-500">Introduce las fechas para calcular el precio</p>
            )}
          </div>

          {/* ── Comentarios ──────────────────────────────────────────────────── */}
          <div className="mt-4">
            <Field label="Comentarios para el cliente (opcional)">
              <textarea
                value={comentarios}
                onChange={e => setComentarios(e.target.value)}
                disabled={sending || sent}
                placeholder="Condiciones especiales, notas, etc."
                rows={3}
                className={inputCls + ' resize-none'}
              />
            </Field>
          </div>

          {/* ── Error ─────────────────────────────────────────────────────────── */}
          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* ── Botones ───────────────────────────────────────────────────────── */}
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="flex-1 rounded-xl border border-slate-600 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-50 ${
                sent
                  ? 'bg-emerald-600 text-white'
                  : 'bg-brand-600 text-white hover:bg-brand-700'
              }`}
            >
              {sent ? (
                <><Check size={15} /> Presupuesto enviado</>
              ) : sending ? (
                <><Loader2 size={15} className="animate-spin" /> Enviando…</>
              ) : (
                <><Send size={15} /> Enviar presupuesto</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50'

function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
      {icon} {text}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-400">{label}</label>
      {children}
    </div>
  )
}

function PriceRow({
  label, value, bold, accent, color,
}: {
  label: string; value: number; bold?: boolean; accent?: boolean; color?: string
}) {
  const valStr = (value < 0 ? '- ' : '') + fmt(Math.abs(value)) + ' €'
  return (
    <div className="flex justify-between items-center">
      <span className={`${bold ? 'font-semibold text-slate-200' : 'text-slate-400'} text-xs`}>{label}</span>
      <span className={`text-sm ${accent ? 'font-bold text-brand-400 text-base' : bold ? 'font-semibold text-slate-100' : color ?? 'text-slate-300'}`}>
        {valStr}
      </span>
    </div>
  )
}

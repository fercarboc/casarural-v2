// src/admin/components/PreReservaModal.tsx
// Modal de Pre-Reserva / Presupuesto.
// Usa suggest-combinations para mostrar opciones disponibles con precio real,
// igual que el motor de reservas público.

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X, Calculator, Send, Loader2, Check, AlertCircle,
  CalendarDays, Users, ChevronDown, Home, CheckCircle2,
} from 'lucide-react'
import { supabase } from '../../integrations/supabase/client'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Combinacion {
  unidades: { unidad_id: string; nombre: string; capacidad_base: number; capacidad_maxima: number; extras_asignados: number }[]
  suma_capacidades_base: number
  suma_capacidades_maximas: number
  extras_total: number
  exceso_capacidad: number
  importe_alojamiento: number
  importe_extras: number
  importe_limpieza: number
  importe_base: number
  descuento: number
  importe_neto: number
  importe_total: number
  importe_senal: number
  importe_resto: number
  precio_por_persona: number
  num_unidades: number
  es_sin_extras: boolean
  es_capacidad_exacta: boolean
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
  const [fechaEntrada,  setFechaEntrada]  = useState('')
  const [fechaSalida,   setFechaSalida]   = useState('')
  const [numHuespedes,  setNumHuespedes]  = useState(2)
  const [tarifa,        setTarifa]        = useState<'FLEXIBLE' | 'NO_REEMBOLSABLE'>('FLEXIBLE')
  const [comentarios,   setComentarios]   = useState('')

  // Combinaciones
  const [buscando,       setBuscando]       = useState(false)
  const [combinaciones,  setCombinaciones]  = useState<Combinacion[]>([])
  const [combError,      setCombError]      = useState('')
  const [combSelIdx,     setCombSelIdx]     = useState<number | null>(null)
  const [propertyId,     setPropertyId]     = useState<string | null>(null)

  // Descuento
  const [descuento, setDescuento] = useState(0)

  // Submit
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  // Cargamos property_id al montar
  useEffect(() => {
    async function init() {
      const res = await supabase.auth.getUser()
      const user = res.data.user
      if (!user) return
      const { data } = await supabase
        .from('property_users')
        .select('property_id')
        .eq('user_id', user.id)
        .single()
      if (data) setPropertyId((data as any).property_id)
    }
    init()
  }, [])

  // ── Buscar combinaciones disponibles ─────────────────────────────────────
  const buscarRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buscarCombinaciones = useCallback(async () => {
    if (!propertyId || !fechaEntrada || !fechaSalida) {
      setCombinaciones([])
      setCombError('')
      setCombSelIdx(null)
      return
    }
    if (calcNoches(fechaEntrada, fechaSalida) <= 0) {
      setCombError('La fecha de salida debe ser posterior a la de entrada')
      setCombinaciones([])
      setCombSelIdx(null)
      return
    }

    setBuscando(true)
    setCombError('')
    setCombinaciones([])
    setCombSelIdx(null)
    setDescuento(0)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('suggest-combinations', {
        body: {
          property_id:   propertyId,
          fecha_entrada: fechaEntrada,
          fecha_salida:  fechaSalida,
          num_huespedes: numHuespedes,
          tarifa,
        },
      })

      if (fnError) throw new Error(fnError.message)
      if (data?.error) throw new Error(data.error)

      const lista: Combinacion[] = data?.combinaciones ?? []

      if (lista.length === 0) {
        setCombError('No hay combinaciones disponibles para esas fechas y número de huéspedes')
      } else {
        setCombinaciones(lista)
        setCombSelIdx(0) // primera = recomendada
      }
    } catch (e: any) {
      setCombError(e.message ?? 'Error al buscar disponibilidad')
    } finally {
      setBuscando(false)
    }
  }, [propertyId, fechaEntrada, fechaSalida, numHuespedes, tarifa])

  useEffect(() => {
    if (buscarRef.current) clearTimeout(buscarRef.current)
    buscarRef.current = setTimeout(buscarCombinaciones, 500)
    return () => { if (buscarRef.current) clearTimeout(buscarRef.current) }
  }, [buscarCombinaciones])

  // ── Valores derivados ─────────────────────────────────────────────────────
  const combSel      = combSelIdx !== null ? combinaciones[combSelIdx] : null
  const precioBase   = combSel?.importe_total ?? 0
  const precioFinal  = Math.max(0, precioBase - descuento)
  const noches       = calcNoches(fechaEntrada, fechaSalida)
  const unidadNombres = combSel ? combSel.unidades.map(u => u.nombre).join(' + ') : ''

  // ── Validación ─────────────────────────────────────────────────────────────
  const emailOk   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSubmit =
    nombre.trim() &&
    emailOk &&
    fechaEntrada &&
    fechaSalida &&
    noches > 0 &&
    combSel !== null &&
    !buscando &&
    !sending

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || !combSel) return

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
          precio_calculado: precioBase,
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
      setTimeout(() => { onSent(); onClose() }, 1500)
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600/20">
              <Calculator size={16} className="text-amber-400" />
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* ── Fila 1: datos cliente ── */}
          <div>
            <SectionLabel icon={<Users size={13} />} text="Datos del cliente" />
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Field label="Nombre *">
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                  disabled={sending || sent} autoFocus placeholder="Nombre" className={inputCls} />
              </Field>
              <Field label="Apellidos">
                <input type="text" value={apellidos} onChange={e => setApellidos(e.target.value)}
                  disabled={sending || sent} placeholder="Apellidos" className={inputCls} />
              </Field>
              <Field label="Email *">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  disabled={sending || sent} placeholder="cliente@ejemplo.com" className={inputCls} />
                {email && !emailOk && <p className="mt-1 text-xs text-amber-400">Email no válido</p>}
              </Field>
              <Field label="Teléfono">
                <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
                  disabled={sending || sent} placeholder="+34 600 000 000" className={inputCls} />
              </Field>
            </div>
          </div>

          {/* ── Fila 2: fechas + huéspedes + tarifa ── */}
          <div>
            <SectionLabel icon={<CalendarDays size={13} />} text="Fechas y grupo" />
            <div className="grid grid-cols-2 gap-3 mt-2 sm:grid-cols-4">
              <Field label="Entrada *">
                <input type="date" value={fechaEntrada}
                  onChange={e => { setFechaEntrada(e.target.value); if (fechaSalida && e.target.value >= fechaSalida) setFechaSalida('') }}
                  disabled={sending || sent} className={inputCls} />
              </Field>
              <Field label="Salida *">
                <input type="date" value={fechaSalida} min={fechaEntrada || undefined}
                  onChange={e => setFechaSalida(e.target.value)}
                  disabled={sending || sent} className={inputCls} />
              </Field>
              <Field label="Huéspedes">
                <input type="number" min={1} max={50} value={numHuespedes}
                  onChange={e => setNumHuespedes(Math.max(1, Number(e.target.value)))}
                  disabled={sending || sent} className={inputCls} />
              </Field>
              <Field label="Tarifa">
                <div className="relative">
                  <select value={tarifa} onChange={e => setTarifa(e.target.value as any)}
                    disabled={sending || sent} className={inputCls + ' appearance-none pr-7'}>
                    <option value="FLEXIBLE">Flexible</option>
                    <option value="NO_REEMBOLSABLE">No reemb.</option>
                  </select>
                  <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </Field>
            </div>
          </div>

          {/* ── Combinaciones disponibles ── */}
          <div>
            <SectionLabel icon={<Home size={13} />} text="Opciones disponibles" />

            {buscando && (
              <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
                <Loader2 size={14} className="animate-spin" /> Buscando disponibilidad…
              </div>
            )}

            {combError && !buscando && (
              <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {combError}
              </div>
            )}

            {!buscando && !combError && combinaciones.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">Introduce fechas y número de huéspedes para ver opciones disponibles</p>
            )}

            {!buscando && combinaciones.length > 0 && (
              <div className="mt-2 space-y-2">
                {combinaciones.map((c, i) => {
                  const sel = combSelIdx === i
                  const nombreCombo = c.unidades.map(u => u.nombre).join(' + ')
                  const etiqueta = c.es_capacidad_exacta
                    ? { text: 'Capacidad exacta', cls: 'bg-emerald-500/20 text-emerald-300' }
                    : c.es_sin_extras
                    ? { text: 'Sin extras', cls: 'bg-blue-500/20 text-blue-300' }
                    : { text: 'Con extras', cls: 'bg-amber-500/20 text-amber-300' }

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setCombSelIdx(i); setDescuento(0) }}
                      disabled={sending || sent}
                      className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                        sel
                          ? 'border-brand-500 bg-brand-600/10 ring-1 ring-brand-500/40'
                          : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {sel && <CheckCircle2 size={14} className="text-brand-400 shrink-0" />}
                            <span className="text-sm font-semibold text-slate-100 truncate">{nombreCombo}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${etiqueta.cls}`}>
                              {etiqueta.text}
                            </span>
                            {i === 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-600/30 text-brand-300">
                                Recomendada
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {c.suma_capacidades_base} huéspedes base · {c.num_unidades} unidad{c.num_unidades > 1 ? 'es' : ''}
                            {c.extras_total > 0 ? ` · ${c.extras_total} extra${c.extras_total > 1 ? 's' : ''}` : ''}
                          </p>
                          {c.unidades.length > 1 && (
                            <p className="mt-1 text-xs text-slate-600">
                              {c.unidades.map(u => `${u.nombre} (${u.capacidad_base + u.extras_asignados} pers.)`).join(' + ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-bold text-white">{fmt(c.importe_total)} €</p>
                          <p className="text-[11px] text-slate-500">{fmt(c.precio_por_persona)} €/pers.</p>
                        </div>
                      </div>

                      {/* Desglose inline si está seleccionada */}
                      {sel && (
                        <div className="mt-3 border-t border-slate-700 pt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                          <PriceRow label="Alojamiento" value={c.importe_alojamiento} />
                          {c.importe_extras > 0 && <PriceRow label="Extras" value={c.importe_extras} />}
                          {c.importe_limpieza > 0 && <PriceRow label="Limpieza" value={c.importe_limpieza} />}
                          {c.descuento > 0 && <PriceRow label="Dto. tarifa" value={-c.descuento} color="text-amber-400" />}
                          <div className="col-span-2 border-t border-slate-700 mt-1 pt-1">
                            <PriceRow label={`Total (${c.noches} noche${c.noches > 1 ? 's' : ''})`} value={c.importe_total} bold />
                          </div>
                          {c.warnings.length > 0 && (
                            <p className="col-span-2 text-amber-400 mt-1">{c.warnings.join(' · ')}</p>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Descuento manual ── */}
          {combSel && (
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-400">Descuento manual (€)</label>
                  <input
                    type="number" min={0} max={precioBase} step={0.01}
                    value={descuento}
                    onChange={e => setDescuento(Math.max(0, Math.min(precioBase, Number(e.target.value))))}
                    disabled={sending || sent}
                    className="w-28 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-brand-400"
                  />
                  {descuento > 0 && (
                    <span className="text-amber-400 text-xs">- {fmt(descuento)} €</span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Total ofertado</p>
                  <p className="text-lg font-bold text-brand-400">{fmt(precioFinal)} €</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Comentarios ── */}
          <Field label="Comentarios para el cliente (opcional)">
            <textarea value={comentarios} onChange={e => setComentarios(e.target.value)}
              disabled={sending || sent} placeholder="Condiciones especiales, notas, etc."
              rows={3} className={inputCls + ' resize-none'} />
          </Field>

          {/* ── Error ── */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* ── Botones ── */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={sending}
              className="flex-1 rounded-xl border border-slate-600 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={!canSubmit}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-50 ${
                sent ? 'bg-emerald-600 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'
              }`}>
              {sent ? <><Check size={15} /> Presupuesto enviado</>
               : sending ? <><Loader2 size={15} className="animate-spin" /> Enviando…</>
               : <><Send size={15} /> Enviar presupuesto</>}
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
    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
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

function PriceRow({ label, value, bold, color }: { label: string; value: number; bold?: boolean; color?: string }) {
  const abs = Math.abs(value)
  const neg = value < 0
  return (
    <div className="flex justify-between items-center">
      <span className={bold ? 'font-semibold text-slate-200' : 'text-slate-500'}>{label}</span>
      <span className={`${bold ? 'font-bold text-slate-100' : color ?? 'text-slate-300'}`}>
        {neg ? '- ' : ''}{fmt(abs)} €
      </span>
    </div>
  )
}

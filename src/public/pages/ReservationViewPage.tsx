import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  CheckCircle2, Calendar, Users, Euro, FileText, AlertCircle,
  ChevronDown, ChevronUp, Loader2, Send, ArrowRight, Home,
  MessageSquare, User, Hash, Phone, Mail, Globe, Baby
} from 'lucide-react'
import { supabase } from '../../integrations/supabase/client'
import { MetaTags } from '../components/MetaTags'
import { usePublicProperty } from '../../shared/hooks/usePublicProperty'

interface Reserva {
  id: string; codigo: string; nombre: string; apellidos: string
  email: string; telefono: string
  fecha_entrada: string; fecha_salida: string
  num_huespedes: number; menores: number
  tarifa: string; temporada: string
  noches: number; precio_noche: number
  importe_alojamiento: number; importe_extra: number
  importe_limpieza: number; descuento: number; total: number
  importe_senal: number | null
  estado: string; estado_pago: string; importe_pagado: number
  created_at: string
}

/** Normaliza fila DB (esquema v2) al interface local */
function normalizeReserva(r: any): Reserva {
  return {
    ...r,
    codigo:    r.codigo || `R-${(r.id ?? '').replace(/-/g, '').slice(0, 8).toUpperCase()}`,
    nombre:    r.nombre_cliente    ?? r.nombre    ?? '',
    apellidos: r.apellidos_cliente ?? r.apellidos ?? '',
    email:     r.email_cliente     ?? r.email     ?? '',
    telefono:  r.telefono_cliente  ?? r.telefono  ?? '',
    importe_extra:  Number(r.importe_extras       ?? r.importe_extra  ?? 0),
    descuento:      Number(r.descuento_aplicado   ?? r.descuento      ?? 0),
    total:          Number(r.importe_total         ?? r.total          ?? 0),
    importe_pagado: Number(r.importe_pagado ?? 0),
  }
}

interface Huesped {
  id: string
  titular: boolean
  nombre: string; primer_apellido: string; segundo_apellido?: string
  tipo_documento: string; numero_documento: string
  fecha_nacimiento?: string; sexo?: string
  nacionalidad: string
  completado: boolean
}

type View = 'detalle' | 'huespedes' | 'cambio'

export const ReservationViewPage: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const { property } = usePublicProperty()
  const propNombre = property?.nombre ?? 'Casa Rural'
  const [reserva, setReserva] = useState<Reserva | null>(null)
  const [huespedes, setHuespedes] = useState<Huesped[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<View>('detalle')

  useEffect(() => {
    if (!token) { setError('Enlace no válido'); setLoading(false); return }
    const load = async () => {
      const { data, error: err } = await supabase
        .from('reservas')
        .select('*')
        .eq('token_cliente', token)
        .single()
      if (err || !data) { setError('Reserva no encontrada o enlace caducado'); setLoading(false); return }
      setReserva(normalizeReserva(data))
      const { data: hData } = await supabase
        .from('huespedes')
        .select('*')
        .eq('reserva_id', data.id)
        .order('titular', { ascending: false })
      setHuespedes(hData ?? [])
      setLoading(false)
    }
    load()
  }, [token])

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="animate-spin text-stone-400" size={32} />
    </div>
  )

  if (error || !reserva) return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-stone-800 mb-2">Reserva no encontrada</h2>
      <p className="text-stone-500 mb-6">{error}</p>
      <Link to="/" className="inline-flex items-center gap-2 text-emerald-700 hover:underline font-medium">
        <Home size={16} /> Volver al inicio
      </Link>
    </div>
  )

  const checkIn = parseISO(reserva.fecha_entrada)
  const checkOut = parseISO(reserva.fecha_salida)
  const fmtDate = (d: Date) => format(d, "EEEE d 'de' MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())
  const huespedesCompletos = huespedes.filter(h => h.completado).length
  const huespedesPendientes = reserva.num_huespedes - huespedesCompletos

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <MetaTags
        title={`Reserva ${reserva.codigo} · ${propNombre}`}
        description={`Detalle de tu reserva en ${propNombre}`}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <CheckCircle2 className="text-emerald-600" size={28} />
            <h1 className="text-2xl font-serif font-bold text-stone-800">Tu reserva está confirmada</h1>
          </div>
          <p className="text-stone-500 text-sm ml-10">
            Código: <strong className="text-stone-800 font-mono">{reserva.codigo}</strong>
            &nbsp;·&nbsp;Confirmada el {format(parseISO(reserva.created_at), "d MMM yyyy", { locale: es })}
          </p>
        </div>
        <Link to="/" className="text-sm text-stone-400 hover:text-stone-600 flex items-center gap-1">
          <Home size={14} /> Inicio
        </Link>
      </div>

      {/* Aviso huéspedes pendientes */}
      {huespedesPendientes > 0 && (
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Registro de huéspedes pendiente</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Faltan por registrar <strong>{huespedesPendientes}</strong> huésped{huespedesPendientes > 1 ? 'es' : ''}.
              Es obligatorio completarlo antes del check-in.
            </p>
            <button
              onClick={() => setView('huespedes')}
              className="mt-2 text-sm font-bold text-amber-800 underline flex items-center gap-1 hover:text-amber-900"
            >
              Completar registro ahora <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-stone-200">
        {([['detalle', 'Detalle de la reserva'], ['huespedes', `Huéspedes (${huespedesCompletos}/${reserva.num_huespedes})`], ['cambio', 'Solicitar cambio']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              view === key
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >{label}</button>
        ))}
      </div>

      {/* VISTA: Detalle */}
      {view === 'detalle' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-white overflow-hidden shadow-sm">
            <div className="px-6 py-4 text-white" style={{ backgroundColor: '#2D4A3E' }}>
              <p className="font-serif font-bold text-lg">{propNombre}{property?.localidad ? ` · ${property.localidad}` : ''}</p>
            </div>
            <div className="p-6 space-y-4 bg-emerald-50/30">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-stone-400 uppercase font-bold tracking-wider mb-1">Entrada</p>
                  <p className="font-semibold text-stone-800">{fmtDate(checkIn)}</p>
                  <p className="text-xs text-stone-500 mt-0.5">A partir de las 16:00 h</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 uppercase font-bold tracking-wider mb-1">Salida</p>
                  <p className="font-semibold text-stone-800">{fmtDate(checkOut)}</p>
                  <p className="text-xs text-stone-500 mt-0.5">Antes de las 11:00 h</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-stone-600 pt-2 border-t border-stone-100">
                <Calendar size={15} className="text-stone-400" />
                <strong>{reserva.noches}</strong>&nbsp;{reserva.noches === 1 ? 'noche' : 'noches'}
                &nbsp;·&nbsp;
                <Users size={15} className="text-stone-400" />
                <strong>{reserva.num_huespedes}</strong>&nbsp;huéspedes
                {reserva.menores > 0 && <span className="text-stone-400">({reserva.num_huespedes - reserva.menores} adultos · {reserva.menores} menores)</span>}
              </div>
            </div>
          </div>

          {/* Titular */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm border-l-4 border-l-emerald-500">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-700 mb-4">
              <User size={16} className="text-emerald-600" /> Titular de la reserva
            </h3>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <span className="text-stone-500">Nombre</span>
              <span className="font-medium text-stone-800">{reserva.nombre} {reserva.apellidos}</span>
              <span className="text-stone-500">Email</span>
              <span className="font-medium text-stone-800">{reserva.email}</span>
              {reserva.telefono && <>
                <span className="text-stone-500">Teléfono</span>
                <span className="font-medium text-stone-800">{reserva.telefono}</span>
              </>}
            </div>
          </div>

          {/* Desglose precios */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm border-l-4 border-l-stone-300">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-700 mb-4">
              <Euro size={16} className="text-emerald-600" /> Desglose del importe
            </h3>
            <div className="space-y-2 text-sm">
              <Row label={`${reserva.noches} noches × ${Number(reserva.precio_noche).toFixed(0)}€`} value={`${Number(reserva.importe_alojamiento).toFixed(2)}€`} />
              {Number(reserva.importe_extra) > 0 && <Row label="Suplemento huésped adicional" value={`${Number(reserva.importe_extra).toFixed(2)}€`} />}
              <Row label="Gastos de limpieza" value={`${Number(reserva.importe_limpieza).toFixed(2)}€`} />
              {Number(reserva.descuento) > 0 && <Row label="Descuento no reembolsable (10%)" value={`−${Number(reserva.descuento).toFixed(2)}€`} className="text-emerald-700" />}
              <div className="flex justify-between font-bold text-stone-900 text-base pt-2 border-t border-stone-200">
                <span>Total</span><span>{Number(reserva.total).toFixed(2)}€</span>
              </div>
              <div className="pt-2 space-y-1.5">
                <div className="flex justify-between text-xs text-stone-500">
                  <span>Tarifa</span>
                  <span className="font-medium text-stone-700">{reserva.tarifa === 'FLEXIBLE' ? 'Flexible' : 'No Reembolsable'}</span>
                </div>
                {reserva.tarifa === 'FLEXIBLE' && reserva.importe_senal && (
                  <div className="flex justify-between text-xs text-stone-500">
                    <span>Señal abonada (30%)</span>
                    <span className="font-medium text-emerald-700">{Number(reserva.importe_senal).toFixed(2)}€</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-stone-500">
                  <span>Estado pago</span>
                  <StatusBadge status={reserva.estado_pago} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA: Huéspedes */}
      {view === 'huespedes' && (
        <GuestRegistrationView
          reserva={reserva}
          huespedes={huespedes}
          onUpdate={setHuespedes}
        />
      )}

      {/* VISTA: Solicitud de cambio */}
      {view === 'cambio' && (
        <ChangeRequestForm reserva={reserva} />
      )}
    </div>
  )
}

// ── Registro huéspedes ─────────────────────────────────────

function GuestRegistrationView({ reserva, huespedes, onUpdate }: {
  reserva: Reserva
  huespedes: Huesped[]
  onUpdate: (h: Huesped[]) => void
}) {
  const [open, setOpen] = useState<string | null>(null)
  const total = reserva.num_huespedes
  const slots = Array.from({ length: total }, (_, i) => {
    const h = huespedes[i]
    return h ?? {
      id: `new-${i}`,
      titular: i === 0,
      nombre: '', primer_apellido: '', segundo_apellido: '',
      tipo_documento: 'DNI', numero_documento: '',
      fecha_nacimiento: '', sexo: '', nacionalidad: 'ESP',
      completado: false,
      reserva_id: reserva.id,
      fecha_entrada: reserva.fecha_entrada,
      fecha_salida: reserva.fecha_salida,
    }
  })

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600">
        Completa los datos de los <strong>{total} huéspedes</strong> antes del check-in.
        Los datos se envían al Ministerio del Interior (RD 933/2021).
      </p>

      {slots.map((h, i) => (
        <GuestSlot
          key={h.id}
          index={i}
          guest={h as any}
          reserva={reserva}
          isOpen={open === h.id || open === `new-${i}`}
          onToggle={() => setOpen(open === (h.id) ? null : h.id)}
          onSaved={(saved) => {
            const updated = [...huespedes]
            const idx = updated.findIndex(x => x.id === saved.id)
            if (idx >= 0) updated[idx] = saved
            else updated.push(saved)
            onUpdate(updated)
            setOpen(null)
          }}
        />
      ))}
    </div>
  )
}

function GuestSlot({ index, guest, reserva, isOpen, onToggle, onSaved }: {
  index: number
  guest: Huesped & { reserva_id?: string; fecha_entrada?: string; fecha_salida?: string }
  reserva: Reserva
  isOpen: boolean
  onToggle: () => void
  onSaved: (h: Huesped) => void
}) {
  const isNew = guest.id.startsWith('new-')
  const [form, setForm] = useState({
    nombre: guest.nombre || '',
    primer_apellido: guest.primer_apellido || '',
    segundo_apellido: guest.segundo_apellido || '',
    tipo_documento: guest.tipo_documento || 'DNI',
    numero_documento: guest.numero_documento || '',
    fecha_nacimiento: guest.fecha_nacimiento || '',
    sexo: guest.sexo || '',
    nacionalidad: guest.nacionalidad || 'ESP',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.nombre.trim()) e.nombre = 'Obligatorio'
    if (!form.primer_apellido.trim()) e.primer_apellido = 'Obligatorio'
    if (!form.numero_documento.trim()) e.numero_documento = 'Obligatorio'
    if (!form.fecha_nacimiento) e.fecha_nacimiento = 'Obligatorio'
    if (!form.sexo) e.sexo = 'Obligatorio'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    const payload = {
      reserva_id: reserva.id,
      titular: index === 0,
      fecha_entrada: reserva.fecha_entrada,
      fecha_salida: reserva.fecha_salida,
      completado: true,
      ...form,
    }
    if (isNew) {
      const { data, error } = await supabase.from('huespedes').insert(payload).select().single()
      if (!error && data) onSaved(data)
    } else {
      const { data, error } = await supabase.from('huespedes').update({ ...payload, completado: true }).eq('id', guest.id).select().single()
      if (!error && data) onSaved(data)
    }
    setSaving(false)
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${guest.completado ? 'border-emerald-200 bg-emerald-50/30' : 'border-stone-200 bg-white'}`}>
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 text-left hover:bg-stone-50 transition-colors">
        <div className="flex items-center gap-3">
          {guest.completado
            ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            : <div className="w-[18px] h-[18px] rounded-full border-2 border-stone-300 shrink-0" />
          }
          <div>
            <p className="text-sm font-semibold text-stone-800">
              {index === 0 ? 'Titular · ' : ''}
              {guest.completado && guest.nombre
                ? `${guest.nombre} ${guest.primer_apellido}`
                : `Huésped ${index + 1}`}
            </p>
            {!guest.completado && <p className="text-xs text-stone-400">Datos pendientes</p>}
          </div>
        </div>
        {isOpen ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-stone-100 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <GField label="Nombre *" error={errors.nombre}>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} className={gInputCls(!!errors.nombre)} placeholder="Pedro" />
            </GField>
            <GField label="Primer apellido *" error={errors.primer_apellido}>
              <input value={form.primer_apellido} onChange={e => set('primer_apellido', e.target.value)} className={gInputCls(!!errors.primer_apellido)} placeholder="García" />
            </GField>
            <GField label="Segundo apellido">
              <input value={form.segundo_apellido} onChange={e => set('segundo_apellido', e.target.value)} className={gInputCls(false)} placeholder="López" />
            </GField>
            <GField label="Tipo documento">
              <select value={form.tipo_documento} onChange={e => set('tipo_documento', e.target.value)} className={gInputCls(false)}>
                <option value="DNI">DNI</option>
                <option value="NIE">NIE</option>
                <option value="PASAPORTE">Pasaporte</option>
                <option value="TIE">TIE</option>
                <option value="OTRA">Otra</option>
              </select>
            </GField>
            <GField label="Número documento *" error={errors.numero_documento}>
              <input value={form.numero_documento} onChange={e => set('numero_documento', e.target.value.toUpperCase())} className={gInputCls(!!errors.numero_documento)} placeholder="12345678A" />
            </GField>
            <GField label="Fecha de nacimiento *" error={errors.fecha_nacimiento}>
              <input type="date" value={form.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} className={gInputCls(!!errors.fecha_nacimiento)} />
            </GField>
            <GField label="Sexo *" error={errors.sexo}>
              <select value={form.sexo} onChange={e => set('sexo', e.target.value)} className={gInputCls(!!errors.sexo)}>
                <option value="">Seleccionar</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </GField>
            <GField label="Nacionalidad">
              <input value={form.nacionalidad} onChange={e => set('nacionalidad', e.target.value.toUpperCase())} className={gInputCls(false)} placeholder="ESP" maxLength={3} />
            </GField>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            Guardar huésped
          </button>
        </div>
      )}
    </div>
  )
}

// ── Solicitud de cambio ────────────────────────────────────

function ChangeRequestForm({ reserva }: { reserva: Reserva }) {
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!msg.trim()) return
    setSending(true)
    await supabase.from('reservas').update({ solicitud_cambio: msg }).eq('id', reserva.id)
    setSent(true)
    setSending(false)
  }

  if (sent) return (
    <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-8 text-center">
      <CheckCircle2 size={40} className="text-emerald-600 mx-auto mb-3" />
      <h3 className="font-semibold text-emerald-800 text-lg">Solicitud enviada</h3>
      <p className="text-sm text-emerald-700 mt-1">Revisaremos tu solicitud y te contactaremos en 24-48 horas.</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-700 mb-3">
          <MessageSquare size={16} className="text-stone-400" />
          Solicitud de cambio de reserva
        </h3>
        <p className="text-sm text-stone-500 mb-4">
          No podemos garantizar que el cambio sea posible, pero lo estudiaremos. Puedes solicitar cambio de fechas u otras modificaciones.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 mb-4">
          <strong>Tarifa {reserva.tarifa === 'FLEXIBLE' ? 'flexible' : 'no reembolsable'}:</strong>{' '}
          {reserva.tarifa === 'FLEXIBLE'
            ? 'Los cambios están sujetos a disponibilidad y posible diferencia de precio.'
            : 'Esta tarifa no permite cancelaciones ni reembolsos. Los cambios quedan a criterio del establecimiento.'}
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1.5">Describe tu solicitud</label>
          <textarea
            value={msg}
            onChange={e => setMsg(e.target.value)}
            rows={4}
            placeholder="Ej: Querríamos cambiar la fecha de entrada al 15 de agosto en lugar del 12..."
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={sending || !msg.trim()}
          className="mt-3 flex items-center gap-2 px-5 py-2.5 bg-emerald-800 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          Enviar solicitud
        </button>
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex justify-between text-stone-600 ${className ?? ''}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    UNPAID:    { label: 'Pendiente',   cls: 'bg-amber-100 text-amber-700' },
    PARTIAL:   { label: 'Señal pagada',cls: 'bg-blue-100 text-blue-700' },
    PAID:      { label: 'Pagado',      cls: 'bg-emerald-100 text-emerald-700' },
    REFUNDED:  { label: 'Reembolsado', cls: 'bg-stone-100 text-stone-600' },
  }
  const s = map[status] ?? { label: status, cls: 'bg-stone-100 text-stone-600' }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
}

function GField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}

function gInputCls(hasError: boolean) {
  return `w-full border rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 transition-colors ${
    hasError ? 'border-red-300 bg-red-50 focus:ring-red-400' : 'border-stone-200 focus:ring-emerald-500'
  }`
}

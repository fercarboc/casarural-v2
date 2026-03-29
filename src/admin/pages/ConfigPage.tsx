import React, { useState, useEffect, useCallback } from 'react'
import {
  Save, Plus, Trash2, AlertCircle, CheckCircle2,
  Euro, Users, Tag, Calendar, Clock,
  ChevronDown, ChevronUp, Loader2
} from 'lucide-react'
import { supabase } from '../../integrations/supabase/client'

// ── Tipos exactos según tu schema de Supabase ─────────────
interface Configuracion {
  id: string
  nombre: string
  descripcion: string | null
  capacidad_base: number
  capacidad_max: number
  estancia_minima: number
  precio_noche_base: number
  precio_noche_alta: number
  extra_huesped_base: number
  extra_huesped_alta: number
  limpieza: number
  descuento_no_reembolsable: number
  porcentaje_senal: number
  telefono: string | null
  email: string | null
  whatsapp: string | null
  direccion: string | null
}

interface Temporada {
  id: string
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  tipo: 'ALTA' | 'BASE'
  estancia_minima: number
  activa: boolean
  created_at?: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// ── Componente principal ───────────────────────────────────
export function ConfigPage() {
  const [config, setConfig] = useState<Configuracion | null>(null)
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [activeSection, setActiveSection] = useState<string | null>('precios')

  // ── Carga inicial ────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: cfg, error: cfgErr }, { data: temps, error: tempErr }] =
        await Promise.all([
          supabase.from('configuracion').select('*').single(),
          supabase.from('temporadas').select('*').order('fecha_inicio', { ascending: true })
        ])

      if (cfgErr) throw cfgErr
      if (tempErr) throw tempErr

      setConfig(cfg)
      setTemporadas(temps ?? [])
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Guardar configuración ────────────────────────────────
  const handleSaveConfig = async () => {
    if (!config) return
    setSaveStatus('saving')
    setErrorMsg('')

    const { error } = await supabase
      .from('configuracion')
      .update({
        capacidad_base: config.capacidad_base,
        capacidad_max: config.capacidad_max,
        estancia_minima: config.estancia_minima,
        precio_noche_base: config.precio_noche_base,
        precio_noche_alta: config.precio_noche_alta,
        extra_huesped_base: config.extra_huesped_base,
        extra_huesped_alta: config.extra_huesped_alta,
        limpieza: config.limpieza,
        descuento_no_reembolsable: config.descuento_no_reembolsable,
        porcentaje_senal: config.porcentaje_senal,
        telefono: config.telefono,
        email: config.email,
        whatsapp: config.whatsapp,
        updated_at: new Date().toISOString()
      })
      .eq('id', config.id)

    if (error) {
      setSaveStatus('error')
      setErrorMsg(error.message)
    } else {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  // ── Temporadas ───────────────────────────────────────────
  const addTemporada = () => {
    const nueva: Temporada = {
      id: `new-${Date.now()}`,
      nombre: '',
      fecha_inicio: '',
      fecha_fin: '',
      tipo: 'ALTA',
      estancia_minima: 2,
      activa: true
    }
    setTemporadas(prev => [...prev, nueva])
  }

  const updateTemporada = (id: string, field: keyof Temporada, value: any) => {
    setTemporadas(prev =>
      prev.map(t => t.id === id ? { ...t, [field]: value } : t)
    )
  }

  const saveTemporada = async (temp: Temporada) => {
    const isNew = temp.id.startsWith('new-')
    const payload = {
      nombre: temp.nombre,
      fecha_inicio: temp.fecha_inicio,
      fecha_fin: temp.fecha_fin,
      tipo: temp.tipo,
      estancia_minima: temp.estancia_minima,
      activa: temp.activa
    }

    if (isNew) {
      const { data, error } = await supabase
        .from('temporadas')
        .insert(payload)
        .select()
        .single()

      if (error) { setErrorMsg(error.message); return }
      setTemporadas(prev => prev.map(t => t.id === temp.id ? data : t))
    } else {
      const { error } = await supabase
        .from('temporadas')
        .update(payload)
        .eq('id', temp.id)

      if (error) { setErrorMsg(error.message); return }
    }
  }

  const deleteTemporada = async (id: string) => {
    if (id.startsWith('new-')) {
      setTemporadas(prev => prev.filter(t => t.id !== id))
      return
    }
    const { error } = await supabase.from('temporadas').delete().eq('id', id)
    if (error) { setErrorMsg(error.message); return }
    setTemporadas(prev => prev.filter(t => t.id !== id))
  }

  // ── UI helpers ───────────────────────────────────────────
  const updateConfig = (field: keyof Configuracion, value: any) => {
    setConfig(prev => prev ? { ...prev, [field]: value } : prev)
  }

  const toggleSection = (key: string) =>
    setActiveSection(prev => prev === key ? null : key)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={20} />
        Cargando configuración...
      </div>
    )
  }

  if (!config) {
    return (
      <div className="p-6 text-red-600 bg-red-50 rounded-lg">
        Error cargando configuración: {errorMsg}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Configuración</h1>
          <p className="text-sm text-gray-500 mt-1">
            Precios, temporadas, capacidad y políticas de La Rasilla
          </p>
        </div>
        <button
          onClick={handleSaveConfig}
          disabled={saveStatus === 'saving'}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${saveStatus === 'saved'
              ? 'bg-green-600 text-white'
              : saveStatus === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-gray-900 text-white hover:bg-gray-700'
            }`}
        >
          {saveStatus === 'saving' && <Loader2 className="animate-spin" size={16} />}
          {saveStatus === 'saved' && <CheckCircle2 size={16} />}
          {saveStatus === 'error' && <AlertCircle size={16} />}
          {saveStatus === 'idle' && <Save size={16} />}
          {saveStatus === 'saving' ? 'Guardando…'
            : saveStatus === 'saved' ? '¡Guardado!'
            : saveStatus === 'error' ? 'Error'
            : 'Guardar cambios'}
        </button>
      </div>

      {errorMsg && saveStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {/* ── SECCIÓN: Precios por temporada ─────────────── */}
      <Section
        id="precios"
        title="Precios por temporada"
        icon={<Euro size={18} />}
        active={activeSection === 'precios'}
        onToggle={() => toggleSection('precios')}
      >
        <div className="grid grid-cols-2 gap-6">
          {/* Temporada BASE */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              Temporada Base
            </h3>
            <InputField
              label="Precio por noche"
              value={config.precio_noche_base}
              onChange={v => updateConfig('precio_noche_base', v)}
              suffix="€"
              hint="Precio casa completa"
            />
            <InputField
              label="Suplemento cama supletoria"
              value={config.extra_huesped_base}
              onChange={v => updateConfig('extra_huesped_base', v)}
              suffix="€/noche"
              hint="Solo para el 11.º huésped"
            />
          </div>

          {/* Temporada ALTA */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Temporada Alta
            </h3>
            <InputField
              label="Precio por noche"
              value={config.precio_noche_alta}
              onChange={v => updateConfig('precio_noche_alta', v)}
              suffix="€"
              hint="Julio, agosto, puentes, Navidades"
            />
            <InputField
              label="Suplemento cama supletoria"
              value={config.extra_huesped_alta}
              onChange={v => updateConfig('extra_huesped_alta', v)}
              suffix="€/noche"
              hint="Solo para el 11.º huésped"
            />
          </div>
        </div>

        {/* Limpieza */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Gastos fijos
          </h3>
          <div className="max-w-xs">
            <InputField
              label="Gastos de limpieza"
              value={config.limpieza}
              onChange={v => updateConfig('limpieza', v)}
              suffix="€"
              hint="Fijo por estancia, cualquier temporada"
            />
          </div>
        </div>

        {/* Preview fórmula */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-1">
          <p className="font-medium text-gray-700 mb-2">Vista previa del cálculo (3 noches, 10 huéspedes, base)</p>
          <FormulaPreview config={config} nights={3} guests={10} season="BASE" />
          <FormulaPreview config={config} nights={3} guests={11} season="BASE" extra />
        </div>
      </Section>

      {/* ── SECCIÓN: Tarifas y descuentos ─────────────── */}
      <Section
        id="tarifas"
        title="Tarifas y descuentos"
        icon={<Tag size={18} />}
        active={activeSection === 'tarifas'}
        onToggle={() => toggleSection('tarifas')}
      >
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Tarifa No Reembolsable
            </h3>
            <InputField
              label="Descuento sobre alojamiento"
              value={config.descuento_no_reembolsable}
              onChange={v => updateConfig('descuento_no_reembolsable', v)}
              suffix="%"
              hint="La limpieza nunca se descuenta"
              min={0} max={50}
            />
            <InfoBox>
              Pago 100% al reservar · Sin reembolso en cancelación
            </InfoBox>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Tarifa Flexible
            </h3>
            <InputField
              label="Señal al reservar"
              value={config.porcentaje_senal}
              onChange={v => updateConfig('porcentaje_senal', v)}
              suffix="%"
              hint="Del total de la reserva"
              min={10} max={100}
            />
            <InfoBox>
              Resto se cobra 30 días antes · Cancelación con reembolso escalonado
            </InfoBox>
          </div>
        </div>

        {/* Política de cancelación — solo informativa, los % son fijos en la Edge Function */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Política de cancelación (tarifa flexible)
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: '≥ 60 días', value: '100% reembolso' },
              { label: '45–59 días', value: '50% reembolso' },
              { label: '30–44 días', value: '25% reembolso' },
              { label: '< 30 días', value: 'Sin reembolso' },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="text-sm font-medium text-gray-800 mt-1">{item.value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Estos porcentajes están configurados en la Edge Function <code className="bg-gray-100 px-1 rounded">cancel-reservation</code>. Para modificarlos, edita el código de la función.
          </p>
        </div>
      </Section>

      {/* ── SECCIÓN: Capacidad y estancia ─────────────── */}
      <Section
        id="capacidad"
        title="Capacidad y estancia mínima"
        icon={<Users size={18} />}
        active={activeSection === 'capacidad'}
        onToggle={() => toggleSection('capacidad')}
      >
        <div className="grid grid-cols-3 gap-6">
          <InputField
            label="Huéspedes incluidos"
            value={config.capacidad_base}
            onChange={v => updateConfig('capacidad_base', Math.min(v, config.capacidad_max))}
            suffix="pax"
            hint="Sin suplemento"
            min={1} max={11} isInt
          />
          <InputField
            label="Máximo huéspedes"
            value={config.capacidad_max}
            onChange={v => updateConfig('capacidad_max', Math.max(v, config.capacidad_base))}
            suffix="pax"
            hint="Con cama supletoria"
            min={1} max={20} isInt
          />
          <InputField
            label="Estancia mínima (defecto)"
            value={config.estancia_minima}
            onChange={v => updateConfig('estancia_minima', v)}
            suffix="noches"
            hint="Las temporadas pueden sobreescribir"
            min={1} max={14} isInt
          />
        </div>

        <div className="mt-4 bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
          <strong>La casa tiene 5 habitaciones dobles</strong> (capacidad base: {config.capacidad_base} pax).
          El huésped {config.capacidad_max} paga suplemento de cama supletoria:{' '}
          <strong>{config.extra_huesped_base}€/noche</strong> (base) ·{' '}
          <strong>{config.extra_huesped_alta}€/noche</strong> (alta).
        </div>
      </Section>

      {/* ── SECCIÓN: Temporadas ────────────────────────── */}
      <Section
        id="temporadas"
        title="Temporadas"
        icon={<Calendar size={18} />}
        active={activeSection === 'temporadas'}
        onToggle={() => toggleSection('temporadas')}
        count={temporadas.length}
      >
        <div className="space-y-3">
          {temporadas.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              No hay temporadas definidas. Añade periodos de temporada alta.
            </p>
          )}

          {temporadas.map(temp => (
            <TemporadaRow
              key={temp.id}
              temp={temp}
              onUpdate={updateTemporada}
              onSave={saveTemporada}
              onDelete={deleteTemporada}
            />
          ))}

          <button
            onClick={addTemporada}
            className="w-full border-2 border-dashed border-gray-200 rounded-lg py-3 text-sm text-gray-400
              hover:border-gray-300 hover:text-gray-500 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Añadir temporada
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-400 space-y-1">
          <p>• <strong>Tipo ALTA</strong>: se aplica <strong>{config.precio_noche_alta}€/noche</strong> y suplemento <strong>{config.extra_huesped_alta}€</strong></p>
          <p>• <strong>Tipo BASE</strong>: se aplica <strong>{config.precio_noche_base}€/noche</strong> y suplemento <strong>{config.extra_huesped_base}€</strong></p>
          <p>• Si la reserva toca aunque sea 1 noche en temporada ALTA, toda la reserva es ALTA</p>
        </div>
      </Section>

      {/* ── SECCIÓN: Check-in / Check-out ─────────────── */}
      <Section
        id="horarios"
        title="Horarios y contacto"
        icon={<Clock size={18} />}
        active={activeSection === 'horarios'}
        onToggle={() => toggleSection('horarios')}
      >
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacto</h3>
            <TextField
              label="Email"
              value={config.email ?? ''}
              onChange={v => updateConfig('email', v)}
              placeholder="info@casarurallarasilla.com"
            />
            <TextField
              label="Teléfono"
              value={config.telefono ?? ''}
              onChange={v => updateConfig('telefono', v)}
              placeholder="+34 600 000 000"
            />
            <TextField
              label="WhatsApp"
              value={config.whatsapp ?? ''}
              onChange={v => updateConfig('whatsapp', v)}
              placeholder="+34 600 000 000"
            />
          </div>
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dirección</h3>
            <TextField
              label="Dirección completa"
              value={config.direccion ?? ''}
              onChange={v => updateConfig('direccion', v)}
              placeholder="Castillo Pedroso, 39699, Corvera de Toranzo"
            />
          </div>
        </div>
      </Section>

    </div>
  )
}

// ── Componentes auxiliares ─────────────────────────────────

function Section({
  id, title, icon, active, onToggle, children, count
}: {
  id: string
  title: string
  icon: React.ReactNode
  active: boolean
  onToggle: () => void
  children: React.ReactNode
  count?: number
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-gray-400">{icon}</span>
          <span className="text-sm font-medium text-gray-800">{title}</span>
          {count !== undefined && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        {active ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {active && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  )
}

function InputField({
  label, value, onChange, suffix, hint, min, max, isInt = false
}: {
  label: string
  value: number
  onChange: (v: number) => void
  suffix?: string
  hint?: string
  min?: number
  max?: number
  isInt?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={isInt ? 1 : 0.01}
          onChange={e => {
            const v = isInt ? parseInt(e.target.value) : parseFloat(e.target.value)
            if (!isNaN(v)) onChange(v)
          }}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900
            focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
        {suffix && (
          <span className="text-sm text-gray-400 whitespace-nowrap">{suffix}</span>
        )}
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function TextField({
  label, value, onChange, placeholder
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900
          placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
      />
    </div>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
      {children}
    </div>
  )
}

function FormulaPreview({
  config, nights, guests, season, extra = false
}: {
  config: Configuracion
  nights: number
  guests: number
  season: 'BASE' | 'ALTA'
  extra?: boolean
}) {
  const priceNight = season === 'BASE' ? config.precio_noche_base : config.precio_noche_alta
  const extraRate = season === 'BASE' ? config.extra_huesped_base : config.extra_huesped_alta
  const extraGuests = Math.max(0, guests - config.capacidad_base)
  const alojamiento = priceNight * nights
  const suplemento = extraGuests * extraRate * nights
  const total = alojamiento + suplemento + config.limpieza

  return (
    <p>
      {extra ? `Con ${guests} huéspedes (+1 cama supletoria): ` : `${guests} huéspedes: `}
      <span className="font-medium text-gray-800">
        {nights}n × {priceNight}€
        {extraGuests > 0 ? ` + ${extraGuests > 1 ? extraGuests + '×' : ''}${extraRate}€/n supl.` : ''}
        {` + ${config.limpieza}€ limpieza = `}
        <strong>{total.toFixed(0)}€</strong>
      </span>
    </p>
  )
}

// ── Fila de temporada ──────────────────────────────────────
function TemporadaRow({
  temp, onUpdate, onSave, onDelete
}: {
  key?: React.Key
  temp: Temporada
  onUpdate: (id: string, field: keyof Temporada, value: any) => void
  onSave: (temp: Temporada) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(temp)
    setSaving(false)
  }

  const isNew = temp.id.startsWith('new-')
  const isValid = temp.nombre && temp.fecha_inicio && temp.fecha_fin

  return (
    <div className={`grid grid-cols-[1fr_1fr_1fr_auto_auto_auto_auto] gap-3 items-end p-3 rounded-lg border
      ${temp.activa ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>

      {/* Nombre */}
      <div>
        {isNew && <label className="block text-xs text-gray-400 mb-1">Nombre</label>}
        <input
          type="text"
          value={temp.nombre}
          onChange={e => onUpdate(temp.id, 'nombre', e.target.value)}
          placeholder="Ej: Semana Santa 2027"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Fechas */}
      <div>
        {isNew && <label className="block text-xs text-gray-400 mb-1">Inicio</label>}
        <input
          type="date"
          value={temp.fecha_inicio}
          onChange={e => onUpdate(temp.id, 'fecha_inicio', e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div>
        {isNew && <label className="block text-xs text-gray-400 mb-1">Fin</label>}
        <input
          type="date"
          value={temp.fecha_fin}
          onChange={e => onUpdate(temp.id, 'fecha_fin', e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Tipo */}
      <div>
        {isNew && <label className="block text-xs text-gray-400 mb-1">Tipo</label>}
        <select
          value={temp.tipo}
          onChange={e => onUpdate(temp.id, 'tipo', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
        >
          <option value="ALTA">🔴 Alta</option>
          <option value="BASE">🔵 Base</option>
        </select>
      </div>

      {/* Estancia mínima */}
      <div>
        {isNew && <label className="block text-xs text-gray-400 mb-1">Mín. noches</label>}
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={temp.estancia_minima}
            min={1}
            max={14}
            onChange={e => onUpdate(temp.id, 'estancia_minima', parseInt(e.target.value) || 1)}
            className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <span className="text-xs text-gray-400">n</span>
        </div>
      </div>

      {/* Activa toggle + guardar + borrar */}
      <div className="flex items-center gap-2 pb-0.5">
        <button
          onClick={() => onUpdate(temp.id, 'activa', !temp.activa)}
          title={temp.activa ? 'Activa — clic para desactivar' : 'Inactiva — clic para activar'}
          className={`w-8 h-5 rounded-full transition-colors relative ${temp.activa ? 'bg-green-500' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all
            ${temp.activa ? 'left-3.5' : 'left-0.5'}`} />
        </button>

        <button
          onClick={handleSave}
          disabled={saving || !isValid}
          title="Guardar temporada"
          className="p-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
        >
          {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
        </button>

        <button
          onClick={() => onDelete(temp.id)}
          title="Eliminar temporada"
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
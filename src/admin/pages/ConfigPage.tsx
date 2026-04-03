import React, { useState, useEffect, useCallback } from 'react'
import {
  Save, AlertCircle, CheckCircle2,
  Home, Mail, Phone, Globe, MapPin, Loader2, ExternalLink
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../integrations/supabase/client'

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Property {
  id: string
  nombre: string
  slug: string
  descripcion: string | null
  direccion: string | null
  localidad: string | null
  provincia: string | null
  pais: string | null
  telefono: string | null
  email: string | null
  web: string | null
  resend_from_email: string | null
  resend_from_name: string | null
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const PROPERTY_SLUG = 'la-rasilla'

// ── Componente principal ───────────────────────────────────────────────────────
export function ConfigPage() {
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading]   = useState(true)
  const [status, setStatus]     = useState<SaveStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('properties')
      .select('id,nombre,slug,descripcion,direccion,localidad,provincia,pais,telefono,email,web,resend_from_email,resend_from_name')
      .eq('slug', PROPERTY_SLUG)
      .single()

    if (error) setErrorMsg(error.message)
    else setProperty(data)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async () => {
    if (!property) return
    setStatus('saving'); setErrorMsg('')

    const { error } = await supabase
      .from('properties')
      .update({
        nombre:           property.nombre,
        descripcion:      property.descripcion,
        direccion:        property.direccion,
        localidad:        property.localidad,
        provincia:        property.provincia,
        pais:             property.pais,
        telefono:         property.telefono,
        email:            property.email,
        web:              property.web,
        resend_from_email: property.resend_from_email,
        resend_from_name:  property.resend_from_name,
        updated_at:       new Date().toISOString(),
      })
      .eq('id', property.id)

    if (error) { setStatus('error'); setErrorMsg(error.message) }
    else { setStatus('saved'); setTimeout(() => setStatus('idle'), 3000) }
  }

  function upd<K extends keyof Property>(k: K, v: Property[K]) {
    setProperty(p => p ? { ...p, [k]: v } : p)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 className="animate-spin mr-2" size={20} />
        Cargando configuración…
      </div>
    )
  }

  if (!property) {
    return (
      <div className="p-6 text-red-600 bg-red-50 rounded-lg">
        Error cargando configuración: {errorMsg}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
          <p className="text-sm text-slate-500 mt-1">Datos de la propiedad <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{property.slug}</span></p>
        </div>
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
            status === 'saved'  ? 'bg-emerald-600 text-white' :
            status === 'error'  ? 'bg-red-600 text-white' :
            'bg-brand-600 text-white hover:bg-brand-700'
          }`}
        >
          {status === 'saving' && <Loader2 className="animate-spin" size={16} />}
          {status === 'saved'  && <CheckCircle2 size={16} />}
          {status === 'error'  && <AlertCircle size={16} />}
          {status === 'idle'   && <Save size={16} />}
          {status === 'saving' ? 'Guardando…' : status === 'saved' ? '¡Guardado!' : status === 'error' ? 'Error' : 'Guardar cambios'}
        </button>
      </div>

      {status === 'error' && errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {/* Sección: Propiedad */}
      <Card title="Propiedad" icon={<Home size={16} />}>
        <Field label="Nombre">
          <input type="text" value={property.nombre} onChange={e => upd('nombre', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Descripción">
          <textarea rows={3} value={property.descripcion ?? ''} onChange={e => upd('descripcion', e.target.value || null)} className={inputCls} />
        </Field>
      </Card>

      {/* Sección: Dirección */}
      <Card title="Dirección" icon={<MapPin size={16} />}>
        <Field label="Dirección">
          <input type="text" value={property.direccion ?? ''} onChange={e => upd('direccion', e.target.value || null)} className={inputCls} placeholder="Calle / núm." />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Localidad">
            <input type="text" value={property.localidad ?? ''} onChange={e => upd('localidad', e.target.value || null)} className={inputCls} placeholder="Corvera de Toranzo" />
          </Field>
          <Field label="Provincia">
            <input type="text" value={property.provincia ?? ''} onChange={e => upd('provincia', e.target.value || null)} className={inputCls} placeholder="Cantabria" />
          </Field>
        </div>
        <Field label="País">
          <input type="text" value={property.pais ?? ''} onChange={e => upd('pais', e.target.value || null)} className={inputCls} placeholder="España" />
        </Field>
      </Card>

      {/* Sección: Contacto */}
      <Card title="Contacto" icon={<Phone size={16} />}>
        <Field label="Teléfono">
          <input type="tel" value={property.telefono ?? ''} onChange={e => upd('telefono', e.target.value || null)} className={inputCls} placeholder="+34 600 000 000" />
        </Field>
        <Field label="Email">
          <input type="email" value={property.email ?? ''} onChange={e => upd('email', e.target.value || null)} className={inputCls} placeholder="info@casarurallarasilla.com" />
        </Field>
        <Field label="Web">
          <input type="url" value={property.web ?? ''} onChange={e => upd('web', e.target.value || null)} className={inputCls} placeholder="https://casarurallarasilla.com" />
        </Field>
      </Card>

      {/* Sección: Email transaccional */}
      <Card title="Email transaccional (Resend)" icon={<Mail size={16} />}>
        <Field label="Remitente (nombre)" hint="Nombre que verá el cliente en el email">
          <input type="text" value={property.resend_from_name ?? ''} onChange={e => upd('resend_from_name', e.target.value || null)} className={inputCls} placeholder="Casa Rural La Rasilla" />
        </Field>
        <Field label="Remitente (email)" hint="Debe estar verificado en Resend">
          <input type="email" value={property.resend_from_email ?? ''} onChange={e => upd('resend_from_email', e.target.value || null)} className={inputCls} placeholder="noreply@casarurallarasilla.com" />
        </Field>
      </Card>

      {/* Aviso: precios y temporadas */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 flex items-start gap-4">
        <Globe size={18} className="text-slate-400 mt-0.5 shrink-0" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-slate-700">Precios, temporadas y capacidad</p>
          <p className="text-xs text-slate-500">
            Los precios por noche, temporadas y capacidad de cada unidad se gestionan en la página <strong>Unidades</strong>.
          </p>
        </div>
        <Link to="/admin/unidades"
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700 transition-all shrink-0">
          Ir a Unidades <ExternalLink size={12} />
        </Link>
      </div>

      {/* Aviso: política de cancelación */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-semibold text-slate-700 mb-3">Política de cancelación (tarifa flexible)</p>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: '≥ 60 días', value: '100% reembolso' },
            { label: '45–59 días', value: '50% reembolso' },
            { label: '30–44 días', value: '25% reembolso' },
            { label: '< 30 días', value: 'Sin reembolso' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="text-sm font-semibold text-slate-800 mt-1">{item.value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Configurado en la Edge Function <code className="bg-slate-100 px-1 rounded">cancel-reservation</code>. El descuento no reembolsable (10%) y la señal (30%) están definidos en <code className="bg-slate-100 px-1 rounded">get-config</code>.
        </p>
      </div>

    </div>
  )
}

// ── Componentes auxiliares ─────────────────────────────────────────────────────
function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100">
        <span className="text-slate-400">{icon}</span>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 transition-all'

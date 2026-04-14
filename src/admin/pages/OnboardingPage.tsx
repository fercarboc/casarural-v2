// src/admin/pages/OnboardingPage.tsx
// Wizard de alta para nuevos clientes. Se muestra cuando onboarding_done = false.

import { useState } from 'react'
import {
  Building2, Globe, Phone, Mail, MapPin, Check,
  ArrowRight, ArrowLeft, Loader2, LogOut,
} from 'lucide-react'
import { supabase } from '../../services/supabase'
import { useAdminTenant } from '../context/AdminTenantContext'
import { useAuth } from '../context/AuthContext'

// ─── Datos del wizard ──────────────────────────────────────────────────────────

interface WizardData {
  nombre:    string
  email:     string
  telefono:  string
  localidad: string
  provincia: string
  site_title: string
  domain:    string   // dominio personalizado (opcional)
}

const EMPTY: WizardData = {
  nombre: '', email: '', telefono: '',
  localidad: '', provincia: '', site_title: '', domain: '',
}

// ─── Indicador de pasos ────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
            i < current
              ? 'bg-emerald-500 text-white'
              : i === current
              ? 'bg-brand-600 text-white ring-2 ring-brand-400/40'
              : 'bg-slate-800 text-slate-500'
          }`}>
            {i < current ? <Check size={13} /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`h-px w-8 transition-all ${i < current ? 'bg-emerald-500' : 'bg-slate-700'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Paso 1 — Información de la empresa ───────────────────────────────────────

function Step1({
  data, onChange,
}: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Información de tu empresa</h2>
        <p className="mt-1 text-sm text-slate-400">
          Estos datos aparecerán en tu web y en las comunicaciones con tus clientes.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
            Nombre de la empresa *
          </label>
          <div className="relative">
            <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              autoFocus
              type="text"
              value={data.nombre}
              onChange={e => onChange({ nombre: e.target.value, site_title: e.target.value })}
              placeholder="Casa Rural La Montaña"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Email de contacto *
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={data.email}
                onChange={e => onChange({ email: e.target.value })}
                placeholder="hola@miempresa.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Teléfono
            </label>
            <div className="relative">
              <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="tel"
                value={data.telefono}
                onChange={e => onChange({ telefono: e.target.value })}
                placeholder="+34 600 000 000"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Localidad
            </label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={data.localidad}
                onChange={e => onChange({ localidad: e.target.value })}
                placeholder="Ronda"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Provincia
            </label>
            <input
              type="text"
              value={data.provincia}
              onChange={e => onChange({ provincia: e.target.value })}
              placeholder="Málaga"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Paso 2 — Dominio web ─────────────────────────────────────────────────────

function Step2({
  data, onChange,
}: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  const isDomainValid = !data.domain || /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(data.domain)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Tu dominio web</h2>
        <p className="mt-1 text-sm text-slate-400">
          Si ya tienes un dominio propio, indícalo aquí. Puedes dejarlo en blanco y configurarlo más adelante.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
            Dominio personalizado <span className="font-normal text-slate-500">(opcional)</span>
          </label>
          <div className="relative">
            <Globe size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={data.domain}
              onChange={e => onChange({ domain: e.target.value.trim().toLowerCase() })}
              placeholder="casarural.com"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-10 pr-4 font-mono text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          {data.domain && !isDomainValid && (
            <p className="mt-1.5 text-xs text-amber-400">
              Formato incorrecto. Escribe solo el dominio, sin https:// ni rutas. Ej: miempresa.com
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-300">Cómo conectar tu dominio</p>
          <ol className="space-y-2 text-xs text-slate-500 list-decimal list-inside">
            <li>Introduce tu dominio arriba y haz clic en "Siguiente"</li>
            <li>En tu proveedor DNS añade un registro <span className="font-mono text-slate-400">CNAME</span> apuntando a <span className="font-mono text-slate-400">cname.vercel-dns.com</span></li>
            <li>Espera a que el DNS propague (puede tardar hasta 24h)</li>
            <li>Tu web estará disponible en ese dominio automáticamente</li>
          </ol>
          <p className="text-xs text-slate-600">
            Sin dominio propio, tu web funcionará igualmente desde la URL que te proporcionemos.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Paso 3 — Confirmación ────────────────────────────────────────────────────

function Step3({ data }: { data: WizardData }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">¡Todo listo!</h2>
        <p className="mt-1 text-sm text-slate-400">
          Revisa el resumen y accede a tu panel para empezar a configurar tus alojamientos.
        </p>
      </div>

      <div className="rounded-2xl border border-sidebar-border bg-slate-900/50 divide-y divide-slate-800">
        {[
          { label: 'Empresa',    value: data.nombre    || '—' },
          { label: 'Email',      value: data.email     || '—' },
          { label: 'Teléfono',   value: data.telefono  || '—' },
          { label: 'Localidad',  value: data.localidad ? `${data.localidad}, ${data.provincia}` : '—' },
          { label: 'Dominio',    value: data.domain    || 'Sin dominio personalizado' },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
            <span className="text-sm text-slate-200">{value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <p className="text-xs text-emerald-400 leading-relaxed">
          Tras guardar irás a tu panel. Desde allí podrás añadir tus alojamientos, subir fotos,
          configurar precios y mucho más.
        </p>
      </div>
    </div>
  )
}

// ─── Wizard principal ──────────────────────────────────────────────────────────

const STEPS = 3

export function OnboardingPage() {
  const { property_id, nombre, refreshTenant } = useAdminTenant()
  const { signOut, user } = useAuth()
  const [step,    setStep]    = useState(0)
  const [data,    setData]    = useState<WizardData>({ ...EMPTY, nombre, email: user?.email ?? '' })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const update = (partial: Partial<WizardData>) => setData(d => ({ ...d, ...partial }))

  const canNext = () => {
    if (step === 0) return data.nombre.trim() !== '' && data.email.trim() !== ''
    if (step === 1) return !data.domain || /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(data.domain)
    return true
  }

  async function handleFinish() {
    setSaving(true)
    setError('')
    try {
      // 1. Guardar datos en properties
      const { error: propErr } = await supabase
        .from('properties')
        .update({
          nombre:          data.nombre.trim(),
          site_title:      data.site_title.trim() || data.nombre.trim(),
          email:           data.email.trim(),
          telefono:        data.telefono.trim(),
          localidad:       data.localidad.trim(),
          provincia:       data.provincia.trim(),
          onboarding_done: true,
        })
        .eq('id', property_id)

      if (propErr) throw new Error(propErr.message)

      // 2. Registrar dominio si se indicó
      if (data.domain) {
        await supabase
          .from('custom_domains')
          .insert({ domain: data.domain, property_id, verified: false })
          .select()
      }

      // 3. Refrescar el contexto → onboarding_done = true → se muestra el panel
      refreshTenant()

    } catch (err: any) {
      setError(err.message ?? 'Error desconocido')
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-admin-bg px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-400">
              Bienvenido
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Configura tu cuenta</h1>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={13} /> Salir
          </button>
        </div>

        {/* Indicador */}
        <div className="mb-8">
          <StepIndicator current={step} total={STEPS} />
        </div>

        {/* Tarjeta del paso */}
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-bg p-6 shadow-xl">
          {step === 0 && <Step1 data={data} onChange={update} />}
          {step === 1 && <Step2 data={data} onChange={update} />}
          {step === 2 && <Step3 data={data} />}

          {error && (
            <p className="mt-4 text-sm text-red-400">{error}</p>
          )}

          {/* Botones de navegación */}
          <div className="mt-6 flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                <ArrowLeft size={15} /> Atrás
              </button>
            )}

            {step < STEPS - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-40 transition-colors"
              >
                Siguiente <ArrowRight size={15} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all"
              >
                {saving
                  ? <><Loader2 size={15} className="animate-spin" /> Guardando…</>
                  : <><Check size={15} /> Acceder al panel</>
                }
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-600">
          Paso {step + 1} de {STEPS}
        </p>
      </div>
    </div>
  )
}

import React from 'react'
import {
  MessageCircle, Phone, Shield, Info, Save,
  Loader2, CheckCircle2, AlertCircle, Terminal,
} from 'lucide-react'
import { DarkCard, Field, inputCls, type Property } from '../shared'

interface Props {
  property: Property
  upd: <K extends keyof Property>(key: K, value: Property[K]) => void
  handleSave: () => Promise<boolean>
  status: 'idle' | 'saving' | 'saved' | 'error'
}

export function WhatsAppTab({ property, upd, handleSave, status }: Props) {
  return (
    <div className="space-y-6">

      {/* Activar / desactivar */}
      <DarkCard title="Canal WhatsApp" icon={<MessageCircle size={16} className="text-[#25D366]" />}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-200">Activar notificaciones WhatsApp</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Proveedor activo: <span className="text-slate-300 font-medium">Twilio WhatsApp Sandbox</span>.
              Cuando se migre a Meta Cloud API solo cambia la Edge Function, no este panel.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={property.whatsapp_enabled ?? false}
            onClick={() => upd('whatsapp_enabled', !(property.whatsapp_enabled ?? false))}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
              property.whatsapp_enabled ? 'bg-[#25D366]' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                property.whatsapp_enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </DarkCard>

      {/* Teléfono de limpieza */}
      <DarkCard title="Teléfono de limpieza" icon={<Phone size={16} className="text-purple-400" />}>
        <Field
          label="Número para plannings de limpieza"
          hint="Formato E.164 obligatorio: +34612345678. Debe haber enviado 'join <palabra>' al Sandbox de Twilio."
        >
          <input
            type="text"
            value={property.whatsapp_cleaning_phone ?? ''}
            onChange={(e) => upd('whatsapp_cleaning_phone', e.target.value || null)}
            placeholder="+34612345678"
            className={`${inputCls} font-mono`}
          />
        </Field>
      </DarkCard>

      {/* Guardar */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className={[
            'inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm transition-all',
            status === 'saved'  ? 'bg-emerald-600 text-white'
              : status === 'error' ? 'bg-red-600 text-white'
              : 'bg-brand-600 text-white hover:bg-brand-700',
            status === 'saving' ? 'opacity-80' : '',
          ].join(' ')}
        >
          {status === 'saving' && <Loader2 size={16} className="animate-spin" />}
          {status === 'saved'  && <CheckCircle2 size={16} />}
          {status === 'error'  && <AlertCircle size={16} />}
          {status === 'idle'   && <Save size={16} />}
          {status === 'saving' ? 'Guardando…' : status === 'saved' ? 'Guardado' : status === 'error' ? 'Error' : 'Guardar cambios'}
        </button>
      </div>

      {/* Secrets requeridos */}
      <DarkCard
        title="Secrets de Supabase requeridos"
        icon={<Terminal size={16} className="text-amber-400" />}
      >
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            Estas variables deben estar configuradas en{' '}
            <strong>Supabase → Edge Functions → Manage secrets</strong> (o vía CLI).
            No se almacenan en la base de datos.
          </span>
        </div>

        <div className="space-y-2">
          {SECRETS.map((s) => (
            <div key={s.name} className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3">
              <code className="w-56 shrink-0 font-mono text-xs text-amber-300">{s.name}</code>
              <span className="text-xs text-slate-400">{s.desc}</span>
            </div>
          ))}
        </div>
      </DarkCard>

      {/* Cómo unirse al Sandbox */}
      <DarkCard
        title="Cómo probar con Twilio WhatsApp Sandbox"
        icon={<Shield size={16} className="text-sky-400" />}
      >
        <ol className="space-y-3 text-sm text-slate-300">
          {SANDBOX_STEPS.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-300">
                {i + 1}
              </span>
              <span dangerouslySetInnerHTML={{ __html: step }} />
            </li>
          ))}
        </ol>

        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Payload de prueba
          </p>
          <pre className="overflow-x-auto font-mono text-[11px] text-slate-300 whitespace-pre">
{`{
  "type": "booking_confirmed",
  "to": "+34XXXXXXXXX",
  "variables": {
    "guest_name": "Fernando",
    "property_name": "La Rasilla",
    "check_in": "10/08/2026",
    "check_out": "15/08/2026",
    "total": "850,00 €",
    "booking_code": "LR-2026-001"
  }
}`}
          </pre>
        </div>
      </DarkCard>

    </div>
  )
}

// ── Datos estáticos ────────────────────────────────────────────────────────────

const SECRETS = [
  {
    name: 'TWILIO_ACCOUNT_SID',
    desc: 'Account SID de tu proyecto Twilio (empieza por AC…)',
  },
  {
    name: 'TWILIO_AUTH_TOKEN',
    desc: 'Auth Token de Twilio (visible en el dashboard principal)',
  },
  {
    name: 'TWILIO_WHATSAPP_FROM',
    desc: 'Número de origen del Sandbox. Formato: whatsapp:+14155238886',
  },
]

const SANDBOX_STEPS = [
  'Entra en <strong>console.twilio.com</strong> → Messaging → Try it out → Send a WhatsApp message.',
  'Envía el mensaje de activación desde tu móvil al número del Sandbox (ej: <code class="text-sky-300">join &lt;palabra&gt;</code>). Cada número destino debe hacer esto una vez.',
  'En Supabase → Edge Functions → Secrets, añade los tres secrets indicados arriba.',
  'Activa el toggle de este panel y guarda.',
  'Desde el detalle de cualquier reserva confirmada, pulsa el botón <strong>WhatsApp</strong>.',
]

import React from 'react'
import { MessageCircle, Phone, Key, Shield, Info, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
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
              Permite enviar mensajes de plantilla a los huéspedes vía Meta WhatsApp Cloud API.
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

      {/* Credenciales Meta */}
      <DarkCard
        title="Credenciales Meta Cloud API"
        icon={<Key size={16} className="text-amber-400" />}
      >
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-xs text-sky-300">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            Obtén estos datos en{' '}
            <a
              href="https://developers.facebook.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Meta for Developers
            </a>{' '}
            → tu app → WhatsApp → Configuración de la API.
          </span>
        </div>

        <div className="space-y-4">
          <Field label="Phone Number ID">
            <input
              type="text"
              value={property.whatsapp_phone_number_id ?? ''}
              onChange={(e) => upd('whatsapp_phone_number_id', e.target.value || null)}
              placeholder="123456789012345"
              className={`${inputCls} font-mono`}
            />
          </Field>

          <Field label="Access Token permanente">
            <input
              type="password"
              value={property.whatsapp_access_token ?? ''}
              onChange={(e) => upd('whatsapp_access_token', e.target.value || null)}
              placeholder="EAAxxxxxxxx…"
              className={`${inputCls} font-mono`}
            />
          </Field>
        </div>
      </DarkCard>

      {/* Teléfono limpieza */}
      <DarkCard
        title="Teléfono de limpieza"
        icon={<Phone size={16} className="text-purple-400" />}
      >
        <Field
          label="Número para plannings de limpieza"
          hint="Formato internacional: +34612345678. Se usa al enviar el planning manual desde el módulo de limpieza."
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
            status === 'saved' ? 'bg-emerald-600 text-white'
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

      {/* Plantillas de referencia */}
      <DarkCard
        title="Plantillas aprobadas en Meta"
        icon={<Shield size={16} className="text-slate-400" />}
      >
        <p className="mb-4 text-xs text-slate-400">
          Registra estas plantillas en Meta Business Manager con exactamente estos nombres e idioma{' '}
          <span className="font-mono text-slate-300">es</span> antes de usar los envíos en
          producción.
        </p>

        <div className="space-y-3">
          {TEMPLATES_INFO.map((t) => (
            <div key={t.name} className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-semibold text-slate-100">{t.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{t.trigger}</p>
                </div>
                <span className="shrink-0 rounded-full border border-slate-700 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                  {t.vars} vars
                </span>
              </div>
              <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-[#07111e] px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap">
                {t.text}
              </pre>
            </div>
          ))}
        </div>
      </DarkCard>
    </div>
  )
}

// ── Referencia de texto de plantillas ─────────────────────────────────────────

const TEMPLATES_INFO = [
  {
    name: 'booking_confirmed',
    trigger: 'Se envía cuando la reserva pasa a CONFIRMADA',
    vars: 10,
    text: `Hola {{1}}, tu reserva en {{2}} ha quedado confirmada. ✅

📅 Entrada: {{3}}
📅 Salida: {{4}}
🌙 Noches: {{5}}
👥 Huéspedes: {{6}}
💶 Importe total: {{7}}
✔️ Pagado: {{8}}

Si necesitas algo, puedes contactar aquí: {{9}}
Detalle de tu reserva: {{10}}`,
  },
  {
    name: 'booking_modified',
    trigger: 'Se envía cuando cambian fechas, huéspedes o importe',
    vars: 8,
    text: `Hola {{1}}, tu reserva en {{2}} ha sido actualizada. 🔄

📅 Entrada: {{3}}
📅 Salida: {{4}}
🌙 Noches: {{5}}
👥 Huéspedes: {{6}}
💶 Nuevo importe: {{7}}

Puedes revisar el detalle aquí: {{8}}`,
  },
  {
    name: 'booking_cancelled',
    trigger: 'Se envía cuando la reserva pasa a CANCELADA',
    vars: 7,
    text: `Hola {{1}}, tu reserva en {{2}} ha sido cancelada. ❌

📅 Fechas: {{3}} al {{4}}
📋 Código de reserva: {{5}}
💶 Información sobre el pago o reembolso: {{6}}

Para cualquier consulta: {{7}}`,
  },
  {
    name: 'cleaning_planning',
    trigger: 'Envío manual desde el módulo de limpieza',
    vars: 6,
    text: `Hola {{1}}, te envío el planning de limpiezas de {{2}}. 🧹

📅 Periodo: {{3}} al {{4}}

{{5}}

Si ves alguna incidencia, avísanos en: {{6}}`,
  },
]

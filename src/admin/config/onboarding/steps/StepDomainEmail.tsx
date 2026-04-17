import React from 'react'
import { Globe, Mail } from 'lucide-react'
import { Field, inputCls, type Property } from '../../shared'
import { DomainManager } from '../../DomainManager'

interface Props {
  property: Property
  upd: <K extends keyof Property>(key: K, value: Property[K]) => void
}

export function StepDomainEmail({ property, upd }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate-400">
          <Globe size={15} />
          <span className="text-xs font-semibold uppercase tracking-wider">Dominio personalizado</span>
        </div>
        <p className="text-sm text-slate-400">
          Conecta tu propio dominio (ej.{' '}
          <span className="font-mono text-slate-300">reservas.mihotel.com</span>) para que los
          clientes accedan con tu marca. Puedes omitir este paso y configurarlo más tarde.
        </p>
        <DomainManager property_id={property.id} />
      </div>

      <div className="space-y-3 border-t border-slate-700 pt-4">
        <div className="flex items-center gap-2 text-slate-400">
          <Mail size={15} />
          <span className="text-xs font-semibold uppercase tracking-wider">Email transaccional (Resend)</span>
        </div>

        <Field label="Nombre del remitente">
          <input
            type="text"
            value={property.resend_from_name ?? ''}
            onChange={e => upd('resend_from_name', e.target.value || null)}
            className={inputCls}
            placeholder="Casa Rural xxx"
          />
        </Field>

        <Field label="Email del remitente">
          <input
            type="email"
            value={property.resend_from_email ?? ''}
            onChange={e => upd('resend_from_email', e.target.value || null)}
            className={inputCls}
            placeholder="noreply@tudominio.com"
          />
        </Field>
      </div>
    </div>
  )
}

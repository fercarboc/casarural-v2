import React from 'react'
import { Globe, Mail } from 'lucide-react'
import { DarkCard, Field, inputCls, type Property } from '../shared'
import { DomainManager } from '../DomainManager'

interface Props {
  property: Property
  upd: <K extends keyof Property>(key: K, value: Property[K]) => void
}

export function DomainEmailTab({ property, upd }: Props) {
  return (
    <div className="space-y-6">
      <DarkCard title="Dominio personalizado" icon={<Globe size={16} />}>
        <p className="text-sm text-slate-400">
          Conecta tu propio dominio (ej.{' '}
          <span className="font-mono text-slate-300">reservas.mihotel.com</span>) para que los
          clientes accedan a tu web de reservas con tu marca. El dominio activo aparece como
          principal en la plataforma.
        </p>
        <DomainManager property_id={property.id} />
      </DarkCard>

      <DarkCard title="Email transaccional (Resend)" icon={<Mail size={16} />}>
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
      </DarkCard>
    </div>
  )
}

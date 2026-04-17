import React from 'react'
import { Scale } from 'lucide-react'
import { DarkCard, Field, inputCls, type Property } from '../shared'

interface Props {
  property: Property
  upd: <K extends keyof Property>(key: K, value: Property[K]) => void
}

export function LegalTab({ property, upd }: Props) {
  return (
    <div className="space-y-6">
      <DarkCard title="Datos legales" icon={<Scale size={16} />}>
        <Field label="Nombre fiscal / razón social">
          <input
            type="text"
            value={property.legal_business_name ?? ''}
            onChange={e => upd('legal_business_name', e.target.value || null)}
            className={inputCls}
            placeholder="Nombre fiscal o razón social"
          />
        </Field>

        <Field label="DNI / CIF / NIF">
          <input
            type="text"
            value={property.legal_tax_id ?? ''}
            onChange={e => upd('legal_tax_id', e.target.value || null)}
            className={inputCls}
            placeholder="B12345678 / 12345678A"
          />
        </Field>

        <Field label="Dirección legal">
          <textarea
            rows={2}
            value={property.legal_address ?? ''}
            onChange={e => upd('legal_address', e.target.value || null)}
            className={inputCls}
            placeholder="Dirección completa legal/fiscal"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Email legal">
            <input
              type="email"
              value={property.legal_email ?? ''}
              onChange={e => upd('legal_email', e.target.value || null)}
              className={inputCls}
            />
          </Field>

          <Field label="Teléfono legal">
            <input
              type="text"
              value={property.legal_phone ?? ''}
              onChange={e => upd('legal_phone', e.target.value || null)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Nº de Registro Alojamiento / Licencia turística">
          <textarea
            rows={3}
            value={property.legal_registry_info ?? ''}
            onChange={e => upd('legal_registry_info', e.target.value || null)}
            className={inputCls}
            placeholder="Ej. Nº registro turismo / licencia / código autonómico"
          />
        </Field>
      </DarkCard>
    </div>
  )
}

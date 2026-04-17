import React from 'react'
import { MapPin, Phone } from 'lucide-react'
import { DarkCard, Field, inputCls, type Property } from '../shared'

interface Props {
  property: Property
  upd: <K extends keyof Property>(key: K, value: Property[K]) => void
}

export function GeneralTab({ property, upd }: Props) {
  return (
    <div className="space-y-6">
      <DarkCard title="Dirección y mapa" icon={<MapPin size={16} />}>
        <Field label="Dirección">
          <input
            type="text"
            value={property.direccion ?? ''}
            onChange={e => upd('direccion', e.target.value || null)}
            className={inputCls}
            placeholder="Calle / número"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Localidad">
            <input
              type="text"
              value={property.localidad ?? ''}
              onChange={e => upd('localidad', e.target.value || null)}
              className={inputCls}
            />
          </Field>

          <Field label="Provincia">
            <input
              type="text"
              value={property.provincia ?? ''}
              onChange={e => upd('provincia', e.target.value || null)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="País">
          <input
            type="text"
            value={property.pais ?? ''}
            onChange={e => upd('pais', e.target.value || null)}
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Latitud"
            hint="Ej. 43.101006. Recomendado para ubicar bien el mapa en zonas rurales."
          >
            <input
              type="number"
              step="0.000001"
              value={property.latitud ?? ''}
              onChange={e =>
                upd('latitud', e.target.value === '' ? null : Number(e.target.value))
              }
              className={inputCls}
              placeholder="43.101006"
            />
          </Field>

          <Field label="Longitud" hint="Ej. -3.899326. Usa signo negativo si corresponde.">
            <input
              type="number"
              step="0.000001"
              value={property.longitud ?? ''}
              onChange={e =>
                upd('longitud', e.target.value === '' ? null : Number(e.target.value))
              }
              className={inputCls}
              placeholder="-3.899326"
            />
          </Field>
        </div>
      </DarkCard>

      <DarkCard title="Contacto" icon={<Phone size={16} />}>
        <Field label="Teléfono">
          <input
            type="tel"
            value={property.telefono ?? ''}
            onChange={e => upd('telefono', e.target.value || null)}
            className={inputCls}
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={property.email ?? ''}
            onChange={e => upd('email', e.target.value || null)}
            className={inputCls}
          />
        </Field>

        <Field label="Web">
          <input
            type="url"
            value={property.web ?? ''}
            onChange={e => upd('web', e.target.value || null)}
            className={inputCls}
          />
        </Field>
      </DarkCard>
    </div>
  )
}

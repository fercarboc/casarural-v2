import React from 'react'
import { MapPin, Phone } from 'lucide-react'
import { Field, inputCls, type Property } from '../../shared'

interface Props {
  property: Property
  upd: <K extends keyof Property>(key: K, value: Property[K]) => void
}

export function StepBasicInfo({ property, upd }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-slate-400">
          <Phone size={15} />
          <span className="text-xs font-semibold uppercase tracking-wider">Nombre y contacto</span>
        </div>

        <Field label="Nombre del alojamiento">
          <input
            type="text"
            value={property.nombre}
            onChange={e => upd('nombre', e.target.value)}
            className={inputCls}
            placeholder="Casa Rural ..."
          />
        </Field>

        <Field label="Descripción general">
          <textarea
            rows={3}
            value={property.descripcion ?? ''}
            onChange={e => upd('descripcion', e.target.value || null)}
            className={inputCls}
            placeholder="Describe brevemente tu alojamiento..."
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Teléfono">
            <input
              type="tel"
              value={property.telefono ?? ''}
              onChange={e => upd('telefono', e.target.value || null)}
              className={inputCls}
            />
          </Field>

          <Field label="Email de contacto">
            <input
              type="email"
              value={property.email ?? ''}
              onChange={e => upd('email', e.target.value || null)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Web (opcional)">
          <input
            type="url"
            value={property.web ?? ''}
            onChange={e => upd('web', e.target.value || null)}
            className={inputCls}
            placeholder="https://..."
          />
        </Field>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-slate-400">
          <MapPin size={15} />
          <span className="text-xs font-semibold uppercase tracking-wider">Ubicación</span>
        </div>

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
      </div>
    </div>
  )
}

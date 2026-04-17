import React from 'react'
import { Field, inputCls, type Property } from '../../shared'

interface Props {
  property: Property
  upd: <K extends keyof Property>(key: K, value: Property[K]) => void
}

export function StepBranding({ property, upd }: Props) {
  return (
    <div className="space-y-4">
      <Field label="Título principal de la web" hint="Visible en header, hero, footer o SEO.">
        <input
          type="text"
          value={property.site_title ?? ''}
          onChange={e => upd('site_title', e.target.value || null)}
          className={inputCls}
          placeholder="Ej. Casa Rural ......"
        />
      </Field>

      <Field label="Subtítulo / tagline">
        <input
          type="text"
          value={property.site_tagline ?? ''}
          onChange={e => upd('site_tagline', e.target.value || null)}
          className={inputCls}
          placeholder="Ej. Valles Pasiegos / Alojamientos rurales en Cantabria"
        />
      </Field>

      <Field
        label="Logo URL"
        hint="Opcional. Si existe, la web puede usar imagen en vez de texto."
      >
        <input
          type="text"
          value={property.logo_url ?? ''}
          onChange={e => upd('logo_url', e.target.value || null)}
          className={inputCls}
          placeholder="https://..."
        />
      </Field>

      <Field label="Texto alternativo del logo">
        <input
          type="text"
          value={property.logo_alt ?? ''}
          onChange={e => upd('logo_alt', e.target.value || null)}
          className={inputCls}
          placeholder="Logo Casa Rural"
        />
      </Field>

      <Field label="Texto de footer">
        <textarea
          rows={3}
          value={property.footer_text ?? ''}
          onChange={e => upd('footer_text', e.target.value || null)}
          className={inputCls}
          placeholder="Ej. Alojamientos rurales en Cantabria para escapadas en grupo y familias."
        />
      </Field>

      <div className="border-t border-slate-700 pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          SEO básico
        </p>

        <Field label="Meta title">
          <input
            type="text"
            value={property.meta_title ?? ''}
            onChange={e => upd('meta_title', e.target.value || null)}
            className={inputCls}
            placeholder="Título SEO principal"
          />
        </Field>

        <div className="mt-4">
          <Field label="Meta description">
            <textarea
              rows={3}
              value={property.meta_description ?? ''}
              onChange={e => upd('meta_description', e.target.value || null)}
              className={inputCls}
              placeholder="Descripción SEO principal de la web"
            />
          </Field>
        </div>
      </div>
    </div>
  )
}

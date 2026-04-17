import React from 'react'
import { ShieldCheck, Home, ExternalLink, Clock3, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DarkCard, Field, inputCls, type Property, type CancellationRule } from '../shared'

interface Props {
  property: Property
  upd: <K extends keyof Property>(key: K, value: Property[K]) => void
}

export function RulesTab({ property, upd }: Props) {
  function updateRule(index: number, field: keyof CancellationRule, value: number) {
    const rules = [...(property.cancellation_policy_json ?? [])]
    rules[index] = { ...rules[index], [field]: value }
    upd('cancellation_policy_json', rules)
  }

  function addRule() {
    const rules = [...(property.cancellation_policy_json ?? [])]
    rules.push({ from_days: 0, to_days: 0, refund_pct: 0 })
    upd('cancellation_policy_json', rules)
  }

  function removeRule(index: number) {
    const rules = [...(property.cancellation_policy_json ?? [])]
    rules.splice(index, 1)
    upd('cancellation_policy_json', rules)
  }

  return (
    <div className="space-y-6">
      <DarkCard title="Normas del alojamiento" icon={<ShieldCheck size={16} />}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Hora de check-in"
            hint="Ej. 16:00. Se mostrará en condiciones, ayuda y proceso de reserva."
          >
            <div className="relative">
              <Clock3
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="time"
                value={property.checkin_time ?? ''}
                onChange={e => upd('checkin_time', e.target.value || null)}
                className={`${inputCls} pl-11`}
              />
            </div>
          </Field>

          <Field
            label="Hora de check-out"
            hint="Ej. 12:00. Se mostrará en condiciones, ayuda y proceso de reserva."
          >
            <div className="relative">
              <Clock3
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="time"
                value={property.checkout_time ?? ''}
                onChange={e => upd('checkout_time', e.target.value || null)}
                className={`${inputCls} pl-11`}
              />
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="¿Se admiten mascotas?" hint="Por defecto debería estar desactivado.">
            <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100">
              <input
                type="checkbox"
                checked={property.mascotas_permitidas}
                onChange={e => upd('mascotas_permitidas', e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              Admitir mascotas
            </label>
          </Field>

          <Field
            label="Suplemento mascota (€)"
            hint="Déjalo vacío si no aplica. Solo tiene sentido si se admiten mascotas."
          >
            <input
              type="number"
              min="0"
              step="0.01"
              value={property.suplemento_mascota ?? ''}
              onChange={e =>
                upd(
                  'suplemento_mascota',
                  e.target.value === '' ? null : Number(e.target.value)
                )
              }
              className={inputCls}
              placeholder="Ej. 20"
              disabled={!property.mascotas_permitidas}
            />
          </Field>
        </div>

        <Field label="¿Se permite fumar?" hint="Por defecto debería estar desactivado.">
          <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100">
            <input
              type="checkbox"
              checked={property.fumar_permitido}
              onChange={e => upd('fumar_permitido', e.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            Permitir fumar
          </label>
        </Field>

        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
          <p className="font-semibold text-white">Vista previa rápida</p>
          <ul className="mt-3 space-y-2">
            <li>
              Check-in:{' '}
              <strong className="text-white">{property.checkin_time || 'No definido'}</strong>
            </li>
            <li>
              Check-out:{' '}
              <strong className="text-white">{property.checkout_time || 'No definido'}</strong>
            </li>
            <li>
              Mascotas:{' '}
              <strong className="text-white">
                {property.mascotas_permitidas ? 'Sí' : 'No'}
              </strong>
              {property.mascotas_permitidas && property.suplemento_mascota !== null
                ? ` · suplemento ${property.suplemento_mascota} €`
                : ''}
            </li>
            <li>
              Fumar:{' '}
              <strong className="text-white">{property.fumar_permitido ? 'Sí' : 'No'}</strong>
            </li>
          </ul>
        </div>
      </DarkCard>

      <DarkCard title="Política de cancelación" icon={<ShieldCheck size={16} />}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Descuento tarifa no reembolsable (%)">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={property.non_refundable_discount_pct ?? ''}
              onChange={e =>
                upd(
                  'non_refundable_discount_pct',
                  e.target.value === '' ? null : Number(e.target.value)
                )
              }
              className={inputCls}
              placeholder="10"
            />
          </Field>

          <Field label="Señal tarifa flexible (%)">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={property.flexible_deposit_pct ?? ''}
              onChange={e =>
                upd(
                  'flexible_deposit_pct',
                  e.target.value === '' ? null : Number(e.target.value)
                )
              }
              className={inputCls}
              placeholder="30"
            />
          </Field>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Tramos de reembolso</p>
              <p className="text-xs text-slate-400">
                Define los días previos a la llegada y el porcentaje reembolsable.
              </p>
            </div>
            <button
              type="button"
              onClick={addRule}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
            >
              <Plus size={14} />
              Añadir tramo
            </button>
          </div>

          <div className="space-y-3">
            {(property.cancellation_policy_json ?? []).map((rule, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <Field label="Desde días">
                  <input
                    type="number"
                    value={rule.from_days}
                    onChange={e => updateRule(index, 'from_days', Number(e.target.value))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Hasta días">
                  <input
                    type="number"
                    value={rule.to_days}
                    onChange={e => updateRule(index, 'to_days', Number(e.target.value))}
                    className={inputCls}
                  />
                </Field>
                <Field label="% reembolso">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={rule.refund_pct}
                    onChange={e => updateRule(index, 'refund_pct', Number(e.target.value))}
                    className={inputCls}
                  />
                </Field>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeRule(index)}
                    className="inline-flex h-[46px] items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 px-4 text-red-300 transition hover:bg-red-500/20"
                    aria-label="Eliminar tramo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DarkCard>

      <div className="rounded-3xl border border-sidebar-border bg-sidebar-bg px-5 py-5">
        <div className="flex items-start gap-4">
          <Home size={18} className="mt-0.5 shrink-0 text-slate-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Precios, temporadas y capacidad</p>
            <p className="mt-1 text-sm text-slate-400">
              Los precios por noche, temporadas, limpieza, noches mínimas y capacidad de cada
              unidad se gestionan en la sección de unidades.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              La capacidad total del conjunto se calcula sumando la capacidad base y máxima de
              todas las unidades activas.
            </p>
          </div>
          <Link
            to="/admin/unidades"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-brand-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-700"
          >
            Ir a Unidades
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>
    </div>
  )
}

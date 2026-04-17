import React from 'react'
import { Clock3, Plus, Trash2 } from 'lucide-react'
import { Field, inputCls, type Property, type CancellationRule } from '../../shared'

interface Props {
  property: Property
  upd: <K extends keyof Property>(key: K, value: Property[K]) => void
}

export function StepRules({ property, upd }: Props) {
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
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Hora de check-in"
          hint="Ej. 16:00."
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

        <Field label="Hora de check-out" hint="Ej. 12:00.">
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
        <Field label="¿Se admiten mascotas?">
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

        <Field label="Suplemento mascota (€)">
          <input
            type="number"
            min="0"
            step="0.01"
            value={property.suplemento_mascota ?? ''}
            onChange={e =>
              upd('suplemento_mascota', e.target.value === '' ? null : Number(e.target.value))
            }
            className={inputCls}
            placeholder="Ej. 20"
            disabled={!property.mascotas_permitidas}
          />
        </Field>
      </div>

      <Field label="¿Se permite fumar?">
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

      <div className="border-t border-slate-700 pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Política de cancelación
        </p>

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

        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Tramos de reembolso</p>
            <button
              type="button"
              onClick={addRule}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
            >
              <Plus size={12} />
              Añadir tramo
            </button>
          </div>

          {(property.cancellation_policy_json ?? []).map((rule, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-3"
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
                  className="inline-flex h-[46px] items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 px-3 text-red-300 transition hover:bg-red-500/20"
                  aria-label="Eliminar tramo"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

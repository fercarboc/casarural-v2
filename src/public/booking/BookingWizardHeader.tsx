import React from 'react'

import { cn } from '@/src/shared/lib/cn'

type Step = 1 | 2 | 3

export function BookingWizardHeader({ currentStep }: { currentStep: Step }) {
  const items = [
    { step: 1, label: 'Fechas' },
    { step: 2, label: 'Opción' },
    { step: 3, label: 'Datos y pago' },
  ] as const

  return (
    <div className="mb-5 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        {items.map((item, index) => {
          const active = item.step === currentStep
          const done = item.step < currentStep

          return (
            <React.Fragment key={item.step}>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                    active && 'bg-emerald-700 text-white',
                    done && 'bg-emerald-100 text-emerald-700',
                    !active && !done && 'bg-stone-100 text-stone-500'
                  )}
                >
                  {item.step}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium',
                    active && 'text-stone-900',
                    done && 'text-emerald-700',
                    !active && !done && 'text-stone-500'
                  )}
                >
                  {item.label}
                </span>
              </div>

              {index < items.length - 1 && (
                <div className="h-px flex-1 bg-stone-200" />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
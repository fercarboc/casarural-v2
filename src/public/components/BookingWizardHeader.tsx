import React from 'react'
import { clsx } from 'clsx'

type Step = 1 | 2 | 3

export function BookingWizardHeader({ currentStep }: { currentStep: Step }) {
  const steps = [
    { id: 1, label: 'Fechas' },
    { id: 2, label: 'Opción' },
    { id: 3, label: 'Datos y pago' },
  ] as const

  return (
    <div className="mb-5 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep
          const isDone = step.id < currentStep

          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2">
                <div
                  className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                    isActive && 'bg-emerald-700 text-white',
                    isDone && 'bg-emerald-100 text-emerald-700',
                    !isActive && !isDone && 'bg-stone-100 text-stone-500'
                  )}
                >
                  {step.id}
                </div>
                <span
                  className={clsx(
                    'text-sm font-medium',
                    isActive && 'text-stone-900',
                    isDone && 'text-emerald-700',
                    !isActive && !isDone && 'text-stone-500'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div className="h-px flex-1 bg-stone-200" />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
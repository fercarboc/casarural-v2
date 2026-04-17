import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { type Property, type SaveStatus, type StripeProps } from '../shared'
import { StepBasicInfo } from './steps/StepBasicInfo'
import { StepBranding } from './steps/StepBranding'
import { StepRules } from './steps/StepRules'
import { StepLegal } from './steps/StepLegal'
import { StepDomainEmail } from './steps/StepDomainEmail'
import { StepStripe } from './steps/StepStripe'
import { StepSummary } from './steps/StepSummary'

const STEPS = [
  { label: 'Datos básicos',   description: 'Nombre, contacto y ubicación', saveOnNext: true  },
  { label: 'Marca y SEO',     description: 'Título, logo y metadatos',      saveOnNext: true  },
  { label: 'Normas',          description: 'Horarios y política de cancelación', saveOnNext: true },
  { label: 'Datos legales',   description: 'Razón social y licencias',      saveOnNext: true  },
  { label: 'Dominio y Email', description: 'Dominio propio y email',        saveOnNext: true  },
  { label: 'Pagos',           description: 'Conecta Stripe',                saveOnNext: false },
  { label: 'Resumen',         description: 'Revisión final',                saveOnNext: false },
]

interface Props {
  property: Property
  upd: <K extends keyof Property>(key: K, value: Property[K]) => void
  handleSave: () => Promise<boolean>
  status: SaveStatus
  errorMsg: string
  stripeProps: StripeProps
  onComplete: () => Promise<void>
  initialStep?: number
}

export function OnboardingWizard({
  property,
  upd,
  handleSave,
  status,
  errorMsg,
  stripeProps,
  onComplete,
  initialStep = 0,
}: Props) {
  const [currentStep, setCurrentStep] = useState(
    Math.max(0, Math.min(initialStep, STEPS.length - 1))
  )
  const [completing, setCompleting] = useState(false)

  const step = STEPS[currentStep]
  const isLast = currentStep === STEPS.length - 1
  const isSaving = status === 'saving' || completing

  async function handleNext() {
    if (isLast) {
      setCompleting(true)
      try {
        await onComplete()
      } finally {
        setCompleting(false)
      }
      return
    }

    if (step.saveOnNext) {
      const ok = await handleSave()
      if (!ok) return
    }

    setCurrentStep(s => s + 1)
  }

  function handleBack() {
    if (currentStep > 0) setCurrentStep(s => s - 1)
  }

  const stepProps = { property, upd }

  return (
    <div className="flex min-h-screen items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Configura tu alojamiento</h1>
          <p className="mt-1 text-sm text-slate-400">
            Completa los pasos para poner en marcha tu panel de reservas.
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Paso {currentStep + 1} de {STEPS.length}
            </span>
            <span>{step.label}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          {/* Step dots */}
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <button
                key={i}
                onClick={() => i < currentStep && setCurrentStep(i)}
                disabled={i >= currentStep}
                className="group flex flex-col items-center gap-1"
                title={s.label}
              >
                <div
                  className={[
                    'h-2 w-2 rounded-full transition-all',
                    i < currentStep
                      ? 'cursor-pointer bg-brand-400 group-hover:bg-brand-300'
                      : i === currentStep
                      ? 'bg-brand-500 ring-2 ring-brand-500/30'
                      : 'bg-slate-700',
                  ].join(' ')}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Step card */}
        <div className="overflow-hidden rounded-3xl border border-sidebar-border bg-sidebar-bg shadow-[0_10px_40px_rgba(0,0,0,0.30)]">
          {/* Step header */}
          <div className="border-b border-sidebar-border px-6 py-5">
            <h2 className="text-lg font-semibold text-white">{step.label}</h2>
            <p className="mt-0.5 text-sm text-slate-400">{step.description}</p>
          </div>

          {/* Step content */}
          <div className="px-6 py-6">
            {currentStep === 0 && <StepBasicInfo {...stepProps} />}
            {currentStep === 1 && <StepBranding {...stepProps} />}
            {currentStep === 2 && <StepRules {...stepProps} />}
            {currentStep === 3 && <StepLegal {...stepProps} />}
            {currentStep === 4 && <StepDomainEmail {...stepProps} />}
            {currentStep === 5 && <StepStripe property={property} stripeProps={stripeProps} />}
            {currentStep === 6 && <StepSummary property={property} />}
          </div>

          {/* Error */}
          {status === 'error' && errorMsg && (
            <div className="mx-6 mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={15} className="shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between border-t border-sidebar-border px-6 py-4">
            <button
              onClick={handleBack}
              disabled={currentStep === 0 || isSaving}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Atrás
            </button>

            <button
              onClick={handleNext}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {isSaving && <Loader2 size={15} className="animate-spin" />}
              {!isSaving && isLast && <CheckCircle2 size={15} />}
              {!isSaving && !isLast && <ChevronRight size={15} />}
              {isSaving
                ? 'Guardando…'
                : isLast
                ? 'Finalizar configuración'
                : 'Continuar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

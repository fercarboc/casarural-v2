import React from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { type Property } from '../../shared'

interface Props {
  property: Property
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      {ok ? (
        <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
      ) : (
        <XCircle size={16} className="shrink-0 text-slate-600" />
      )}
      <span className={`text-sm ${ok ? 'text-slate-200' : 'text-slate-500'}`}>{label}</span>
    </div>
  )
}

export function StepSummary({ property }: Props) {
  const hasDomainConnected = false

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-400">
        Revisa el estado de la configuración antes de finalizar. Podrás editar cualquier campo
        desde el panel de configuración en cualquier momento.
      </p>

      <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Resumen de configuración
        </p>

        <div className="space-y-2.5">
          <CheckItem
            ok={!!property.nombre && !!property.email}
            label="Datos básicos (nombre y contacto)"
          />
          <CheckItem
            ok={!!property.site_title || !!property.nombre}
            label="Marca y SEO"
          />
          <CheckItem
            ok={!!property.checkin_time && !!property.checkout_time}
            label="Horarios de entrada y salida"
          />
          <CheckItem
            ok={
              !!property.legal_business_name &&
              !!property.legal_tax_id
            }
            label="Datos legales (razón social y NIF/CIF)"
          />
          <CheckItem
            ok={!!property.resend_from_email}
            label="Email transaccional configurado"
          />
          <CheckItem
            ok={hasDomainConnected}
            label="Dominio personalizado (opcional)"
          />
          <CheckItem
            ok={
              !!property.stripe_account_id &&
              !!property.stripe_onboarding_complete &&
              !!property.stripe_charges_enabled
            }
            label="Stripe conectado y activo"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 text-xs text-slate-500">
        Los elementos marcados en gris pueden completarse más tarde desde el panel de
        configuración. Haz clic en <strong className="text-slate-400">Finalizar</strong> para
        comenzar a usar el panel de administración.
      </div>
    </div>
  )
}

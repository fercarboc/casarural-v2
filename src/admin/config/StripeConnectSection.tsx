import React from 'react'
import { CreditCard, Loader2, AlertCircle, RefreshCw, BadgeCheck, BadgeAlert } from 'lucide-react'
import { type Property, type StripeProps } from './shared'

interface Props extends StripeProps {
  property: Property
}

export function StripeConnectSection({
  property,
  connectLoading,
  connectError,
  connectRefreshing,
  onStripeConnect,
  onStripeRefresh,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
        {!property.stripe_account_id ? (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800">
              <BadgeAlert size={18} className="text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Sin cuenta de cobros</p>
              <p className="text-xs text-slate-500">Conecta Stripe para activar los pagos online.</p>
            </div>
          </div>
        ) : property.stripe_onboarding_complete && property.stripe_charges_enabled ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
                <BadgeCheck size={18} className="text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">Cuenta conectada y activa</p>
                {property.stripe_account_email && (
                  <p className="truncate text-xs text-slate-500">{property.stripe_account_email}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  property.stripe_charges_enabled
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-amber-500/10 text-amber-400'
                }`}
              >
                <BadgeCheck size={11} />
                {property.stripe_charges_enabled ? 'Cobros activos' : 'Cobros pendientes'}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  property.stripe_payouts_enabled
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-amber-500/10 text-amber-400'
                }`}
              >
                <BadgeCheck size={11} />
                {property.stripe_payouts_enabled
                  ? 'Pagos a banco activos'
                  : 'Pagos a banco pendientes'}
              </span>
            </div>
            <p className="font-mono text-[11px] text-slate-600">ID: {property.stripe_account_id}</p>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10">
              <BadgeAlert size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Configuración pendiente</p>
              <p className="text-xs text-slate-500">
                La cuenta Stripe está creada pero el proceso de verificación no está completo.
              </p>
            </div>
          </div>
        )}
      </div>

      {connectError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {connectError}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {(!property.stripe_onboarding_complete || !property.stripe_charges_enabled) && (
          <button
            onClick={onStripeConnect}
            disabled={connectLoading}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#635BFF] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#5851e0] disabled:opacity-50"
          >
            {connectLoading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <CreditCard size={15} />
            )}
            {!property.stripe_account_id
              ? 'Conectar cuenta Stripe'
              : 'Continuar configuración en Stripe'}
          </button>
        )}

        {property.stripe_account_id && (
          <button
            onClick={onStripeRefresh}
            disabled={connectRefreshing}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw size={14} className={connectRefreshing ? 'animate-spin' : ''} />
            Verificar estado
          </button>
        )}
      </div>

      <p className="text-xs text-slate-600">
        Al conectar, serás redirigido a Stripe para crear o vincular tu cuenta. El proceso tarda
        unos minutos y puede requerir documentación bancaria.
      </p>
    </div>
  )
}

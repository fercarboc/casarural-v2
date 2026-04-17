import React from 'react'
import { type Property, type StripeProps } from '../../shared'
import { StripeConnectSection } from '../../StripeConnectSection'

interface Props {
  property: Property
  stripeProps: StripeProps
}

export function StepStripe({ property, stripeProps }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Conecta tu cuenta de Stripe para cobrar las reservas directamente en tu banco. Cada
        propiedad tiene su propia cuenta; los pagos llegan sin intermediarios.
      </p>
      <p className="text-sm text-slate-400">
        Puedes omitir este paso y configurarlo más tarde desde la pestaña{' '}
        <strong className="text-slate-300">Pagos</strong>.
      </p>
      <StripeConnectSection property={property} {...stripeProps} />
    </div>
  )
}

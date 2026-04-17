import React from 'react'
import { CreditCard } from 'lucide-react'
import { DarkCard, type Property, type StripeProps } from '../shared'
import { StripeConnectSection } from '../StripeConnectSection'

interface Props {
  property: Property
  stripeProps: StripeProps
}

export function PaymentsTab({ property, stripeProps }: Props) {
  return (
    <div className="space-y-6">
      <DarkCard title="Cobros y pagos" icon={<CreditCard size={16} />}>
        <p className="text-sm text-slate-400">
          Conecta tu cuenta de Stripe para cobrar las reservas directamente en tu banco. Cada
          propiedad tiene su propia cuenta; los pagos llegan sin pasar por NexCore.
        </p>
        <StripeConnectSection property={property} {...stripeProps} />
      </DarkCard>
    </div>
  )
}

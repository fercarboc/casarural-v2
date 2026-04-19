import React from 'react'

export interface CancellationRule {
  from_days: number
  to_days: number
  refund_pct: number
}

export interface Property {
  id: string
  nombre: string
  slug: string
  descripcion: string | null
  direccion: string | null
  localidad: string | null
  provincia: string | null
  pais: string | null
  latitud: number | null
  longitud: number | null
  telefono: string | null
  email: string | null
  web: string | null
  logo_url: string | null
  activa: boolean | null
  stripe_account_id: string | null
  stripe_webhook_secret: string | null
  stripe_onboarding_complete: boolean | null
  stripe_charges_enabled: boolean | null
  stripe_payouts_enabled: boolean | null
  stripe_account_email: string | null
  resend_from_email: string | null
  resend_from_name: string | null
  site_title: string | null
  site_tagline: string | null
  logo_alt: string | null
  footer_text: string | null
  meta_title: string | null
  meta_description: string | null
  legal_business_name: string | null
  legal_tax_id: string | null
  legal_address: string | null
  legal_email: string | null
  legal_phone: string | null
  legal_registry_info: string | null
  mascotas_permitidas: boolean
  suplemento_mascota: number | null
  fumar_permitido: boolean
  checkin_time: string | null
  checkout_time: string | null
  non_refundable_discount_pct: number | null
  flexible_deposit_pct: number | null
  cancellation_policy_json: CancellationRule[] | null
  onboarding_done: boolean | null
  whatsapp_enabled: boolean | null
  whatsapp_phone_number_id: string | null
  whatsapp_access_token: string | null
  whatsapp_cleaning_phone: string | null
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export const DEFAULT_CANCELLATION_RULES: CancellationRule[] = [
  { from_days: 60, to_days: 9999, refund_pct: 100 },
  { from_days: 45, to_days: 59, refund_pct: 50 },
  { from_days: 30, to_days: 44, refund_pct: 25 },
  { from_days: 0, to_days: 29, refund_pct: 0 },
]

export interface StripeProps {
  connectLoading: boolean
  connectError: string
  connectRefreshing: boolean
  onStripeConnect: () => void
  onStripeRefresh: () => void
}

export function DarkCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-sidebar-border bg-sidebar-bg shadow-[0_10px_40px_rgba(0,0,0,0.20)]">
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-6 py-4">
        <span className="text-slate-400">{icon}</span>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="space-y-4 px-6 py-5">{children}</div>
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-300">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export const inputCls =
  'w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20'

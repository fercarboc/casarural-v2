import React, { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../../integrations/supabase/client'
import { useAdminTenant } from '../context/AdminTenantContext'
import {
  type Property,
  type SaveStatus,
  type StripeProps,
  DEFAULT_CANCELLATION_RULES,
} from './shared'
import { OnboardingWizard } from './onboarding/OnboardingWizard'
import { ConfigTabsPage } from './tabs/ConfigTabsPage'

export function ConfigPage() {
  const { property_id, refreshTenant } = useAdminTenant()

  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Stripe state
  const [connectLoading, setConnectLoading] = useState(false)
  const [connectError, setConnectError] = useState('')
  const [connectRefreshing, setConnectRefreshing] = useState(false)

  // Wizard initial step (for Stripe return redirect)
  const [wizardInitialStep, setWizardInitialStep] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    setErrorMsg('')

    const { data, error } = await supabase
      .from('properties')
      .select(`
        id,
        nombre,
        slug,
        descripcion,
        direccion,
        localidad,
        provincia,
        pais,
        latitud,
        longitud,
        telefono,
        email,
        web,
        logo_url,
        activa,
        stripe_account_id,
        stripe_webhook_secret,
        stripe_onboarding_complete,
        stripe_charges_enabled,
        stripe_payouts_enabled,
        stripe_account_email,
        resend_from_email,
        resend_from_name,
        site_title,
        site_tagline,
        logo_alt,
        footer_text,
        meta_title,
        meta_description,
        legal_business_name,
        legal_tax_id,
        legal_address,
        legal_email,
        legal_phone,
        legal_registry_info,
        mascotas_permitidas,
        suplemento_mascota,
        fumar_permitido,
        checkin_time,
        checkout_time,
        non_refundable_discount_pct,
        flexible_deposit_pct,
        cancellation_policy_json,
        onboarding_done
      `)
      .eq('id', property_id)
      .single()

    if (error) {
      setErrorMsg(error.message)
      setProperty(null)
      setLoading(false)
      return
    }

    setProperty({
      ...data,
      mascotas_permitidas: !!data.mascotas_permitidas,
      fumar_permitido: !!data.fumar_permitido,
      checkin_time: data.checkin_time ?? '16:00',
      checkout_time: data.checkout_time ?? '12:00',
      cancellation_policy_json:
        Array.isArray(data.cancellation_policy_json) &&
        data.cancellation_policy_json.length > 0
          ? data.cancellation_policy_json
          : DEFAULT_CANCELLATION_RULES,
    })

    setLoading(false)
  }, [property_id])

  useEffect(() => { loadData() }, [loadData])

  // Auto-refresh Stripe state on return from Stripe onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('stripe_return') === '1' || params.get('stripe_refresh') === '1') {
      window.history.replaceState({}, '', window.location.pathname)
      setWizardInitialStep(5)
      const timer = setTimeout(() => handleStripeRefresh(), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  function upd<K extends keyof Property>(key: K, value: Property[K]) {
    setProperty(prev => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleSave = async (): Promise<boolean> => {
    if (!property) return false

    setStatus('saving')
    setErrorMsg('')

    const cleanedRules = (property.cancellation_policy_json ?? []).map(rule => ({
      from_days: Number(rule.from_days) || 0,
      to_days: Number(rule.to_days) || 0,
      refund_pct: Number(rule.refund_pct) || 0,
    }))

    const { error } = await supabase
      .from('properties')
      .update({
        nombre: property.nombre,
        descripcion: property.descripcion,
        direccion: property.direccion,
        localidad: property.localidad,
        provincia: property.provincia,
        pais: property.pais,
        latitud:
          property.latitud === null || property.latitud === undefined || property.latitud === ('' as any)
            ? null
            : Number(property.latitud),
        longitud:
          property.longitud === null || property.longitud === undefined || property.longitud === ('' as any)
            ? null
            : Number(property.longitud),
        telefono: property.telefono,
        email: property.email,
        web: property.web,
        logo_url: property.logo_url,
        resend_from_email: property.resend_from_email,
        resend_from_name: property.resend_from_name,
        site_title: property.site_title,
        site_tagline: property.site_tagline,
        logo_alt: property.logo_alt,
        footer_text: property.footer_text,
        meta_title: property.meta_title,
        meta_description: property.meta_description,
        legal_business_name: property.legal_business_name,
        legal_tax_id: property.legal_tax_id,
        legal_address: property.legal_address,
        legal_email: property.legal_email,
        legal_phone: property.legal_phone,
        legal_registry_info: property.legal_registry_info,
        mascotas_permitidas: property.mascotas_permitidas,
        suplemento_mascota:
          property.suplemento_mascota === null || property.suplemento_mascota === undefined || property.suplemento_mascota === ('' as any)
            ? null
            : Number(property.suplemento_mascota),
        fumar_permitido: property.fumar_permitido,
        checkin_time: property.checkin_time,
        checkout_time: property.checkout_time,
        non_refundable_discount_pct:
          property.non_refundable_discount_pct === null || property.non_refundable_discount_pct === undefined || property.non_refundable_discount_pct === ('' as any)
            ? null
            : Number(property.non_refundable_discount_pct),
        flexible_deposit_pct:
          property.flexible_deposit_pct === null || property.flexible_deposit_pct === undefined || property.flexible_deposit_pct === ('' as any)
            ? null
            : Number(property.flexible_deposit_pct),
        cancellation_policy_json: cleanedRules,
        updated_at: new Date().toISOString(),
      })
      .eq('id', property.id)

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
      return false
    }

    setStatus('saved')
    setTimeout(() => setStatus('idle'), 3000)
    return true
  }

  const handleCompleteOnboarding = async () => {
    if (!property) return
    const ok = await handleSave()
    if (!ok) return

    const { error } = await supabase
      .from('properties')
      .update({ onboarding_done: true, updated_at: new Date().toISOString() })
      .eq('id', property.id)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setProperty(p => (p ? { ...p, onboarding_done: true } : p))
    refreshTenant()
  }

  const handleStripeConnect = async () => {
    if (!property) return
    setConnectLoading(true)
    setConnectError('')
    try {
      const origin = window.location.origin
      const returnUrl  = `${origin}/admin/configuracion?stripe_return=1`
      const refreshUrl = `${origin}/admin/configuracion?stripe_refresh=1`

      const res = await supabase.functions.invoke('stripe-connect-onboarding', {
        body: { property_id: property.id, return_url: returnUrl, refresh_url: refreshUrl },
      })
      if (res.error) throw new Error(res.error.message)
      if (!res.data?.ok) throw new Error(res.data?.error ?? 'Error desconocido')

      if (res.data.account_id && !property.stripe_account_id) {
        setProperty(p => (p ? { ...p, stripe_account_id: res.data.account_id } : p))
      }
      window.location.href = res.data.url
    } catch (err: any) {
      setConnectError(err.message ?? 'Error iniciando onboarding')
      setConnectLoading(false)
    }
  }

  const handleStripeRefresh = async () => {
    if (!property?.id) return
    setConnectRefreshing(true)
    setConnectError('')
    try {
      const res = await supabase.functions.invoke('stripe-connect-refresh', {
        body: { property_id: property.id },
      })
      if (res.error) throw new Error(res.error.message)
      if (!res.data?.ok) throw new Error(res.data?.error ?? 'Error desconocido')

      setProperty(p =>
        p
          ? {
              ...p,
              stripe_charges_enabled:     res.data.charges_enabled,
              stripe_payouts_enabled:     res.data.payouts_enabled,
              stripe_onboarding_complete: res.data.onboarding_complete,
              stripe_account_email:       res.data.email ?? p.stripe_account_email,
            }
          : p
      )
    } catch (err: any) {
      setConnectError(err.message ?? 'Error actualizando estado')
    } finally {
      setConnectRefreshing(false)
    }
  }

  const stripeProps: StripeProps = {
    connectLoading,
    connectError,
    connectRefreshing,
    onStripeConnect: handleStripeConnect,
    onStripeRefresh: handleStripeRefresh,
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 className="mr-2 animate-spin" size={20} />
        Cargando configuración…
      </div>
    )
  }

  if (!property) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
        Error cargando configuración: {errorMsg}
      </div>
    )
  }

  if (!property.onboarding_done) {
    return (
      <OnboardingWizard
        property={property}
        upd={upd}
        handleSave={handleSave}
        status={status}
        errorMsg={errorMsg}
        stripeProps={stripeProps}
        onComplete={handleCompleteOnboarding}
        initialStep={wizardInitialStep}
      />
    )
  }

  return (
    <ConfigTabsPage
      property={property}
      upd={upd}
      handleSave={handleSave}
      status={status}
      errorMsg={errorMsg}
      stripeProps={stripeProps}
    />
  )
}

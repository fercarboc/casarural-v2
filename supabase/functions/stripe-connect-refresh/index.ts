// supabase/functions/stripe-connect-refresh/index.ts
// POST — consulta Stripe y actualiza el estado de la cuenta Connect de la property.
// Llamar desde el frontend tras volver del onboarding de Stripe.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const stripeKey   = Deno.env.get('STRIPE_SECRET_KEY')!

    if (!stripeKey) return json({ ok: false, error: 'STRIPE_SECRET_KEY no configurada' }, 500)

    // ── Autenticar ─────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) return json({ ok: false, error: 'No autorizado' }, 401)

    const adminClient = createClient(supabaseUrl, serviceKey)
    const anonClient  = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!)

    const { data: { user }, error: authErr } = await anonClient.auth.getUser(token)
    if (authErr || !user) return json({ ok: false, error: 'No autorizado' }, 401)

    // ── Body ───────────────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}))
    const property_id = typeof body.property_id === 'string' ? body.property_id : ''
    if (!property_id) return json({ ok: false, error: 'Falta property_id' }, 400)

    // ── Verificar membresía ────────────────────────────────────────────────────
    const { data: membership } = await adminClient
      .from('property_users')
      .select('rol')
      .eq('user_id', user.id)
      .eq('property_id', property_id)
      .single()

    if (!membership || !['ADMIN', 'SUPER_ADMIN'].includes(membership.rol)) {
      return json({ ok: false, error: 'Acceso denegado' }, 403)
    }

    // ── Obtener stripe_account_id ──────────────────────────────────────────────
    const { data: property } = await adminClient
      .from('properties')
      .select('stripe_account_id')
      .eq('id', property_id)
      .single()

    if (!property?.stripe_account_id) {
      return json({ ok: false, error: 'Esta property no tiene cuenta Stripe Connect' }, 404)
    }

    // ── Consultar Stripe ───────────────────────────────────────────────────────
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })
    const account = await stripe.accounts.retrieve(property.stripe_account_id)

    const details_submitted      = account.details_submitted ?? false
    const charges_enabled        = account.charges_enabled ?? false
    const payouts_enabled        = account.payouts_enabled ?? false
    const onboarding_complete    = details_submitted && charges_enabled

    // ── Actualizar BD ──────────────────────────────────────────────────────────
    await adminClient
      .from('properties')
      .update({
        stripe_details_submitted:        details_submitted,
        stripe_charges_enabled:          charges_enabled,
        stripe_payouts_enabled:          payouts_enabled,
        stripe_onboarding_complete:      onboarding_complete,
        stripe_account_email:            account.email ?? null,
        stripe_default_currency:         account.default_currency ?? null,
        stripe_connect_status_checked_at: new Date().toISOString(),
      })
      .eq('id', property_id)

    console.log(`[stripe-connect-refresh] ${property.stripe_account_id} — charges:${charges_enabled} payouts:${payouts_enabled}`)

    return json({
      ok: true,
      account_id:          account.id,
      details_submitted,
      charges_enabled,
      payouts_enabled,
      onboarding_complete,
      email:               account.email ?? null,
      currency:            account.default_currency ?? null,
    })

  } catch (err) {
    console.error('[stripe-connect-refresh] Error:', err)
    return json({ ok: false, error: 'Error interno', detail: String(err) }, 500)
  }
})

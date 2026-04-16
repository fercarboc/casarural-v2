// supabase/functions/stripe-connect-onboarding/index.ts
// POST — crea (o recupera) una cuenta Express de Stripe Connect para la property
// y devuelve el Account Link URL para que el cliente complete el onboarding.
//
// Env vars necesarias en Supabase Secrets:
//   STRIPE_SECRET_KEY  — clave secreta de la plataforma NexCore

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
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const serviceKey     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const stripeKey      = Deno.env.get('STRIPE_SECRET_KEY')!

    if (!stripeKey) return json({ ok: false, error: 'STRIPE_SECRET_KEY no configurada' }, 500)

    // ── Autenticar al llamante ─────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) return json({ ok: false, error: 'No autorizado' }, 401)

    const adminClient = createClient(supabaseUrl, serviceKey)
    const anonClient  = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!)

    const { data: { user }, error: authErr } = await anonClient.auth.getUser(token)
    if (authErr || !user) return json({ ok: false, error: 'No autorizado' }, 401)

    // ── Body ───────────────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}))
    const property_id  = typeof body.property_id === 'string' ? body.property_id : ''
    const return_url   = typeof body.return_url  === 'string' ? body.return_url  : ''
    const refresh_url  = typeof body.refresh_url === 'string' ? body.refresh_url : ''

    if (!property_id || !return_url || !refresh_url) {
      return json({ ok: false, error: 'Faltan property_id, return_url o refresh_url' }, 400)
    }

    // ── Verificar que el llamante es admin de esta property ────────────────────
    const { data: membership } = await adminClient
      .from('property_users')
      .select('rol')
      .eq('user_id', user.id)
      .eq('property_id', property_id)
      .single()

    if (!membership || !['ADMIN', 'SUPER_ADMIN'].includes(membership.rol)) {
      return json({ ok: false, error: 'Acceso denegado' }, 403)
    }

    // ── Obtener datos de la property ───────────────────────────────────────────
    const { data: property, error: propErr } = await adminClient
      .from('properties')
      .select('id, nombre, email, stripe_account_id')
      .eq('id', property_id)
      .single()

    if (propErr || !property) return json({ ok: false, error: 'Property no encontrada' }, 404)

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })

    // ── Crear o recuperar la cuenta Express ───────────────────────────────────
    let accountId: string = property.stripe_account_id ?? ''

    if (!accountId) {
      // Crear nueva cuenta Express
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'ES',
        email: property.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers:     { requested: true },
        },
        business_profile: {
          name: property.nombre ?? undefined,
          mcc: '7011', // Hotels, Motels, and Resorts
        },
        metadata: {
          property_id,
          platform: 'nexcore-casarural',
        },
      })

      accountId = account.id

      // Guardar en BD inmediatamente
      await adminClient
        .from('properties')
        .update({
          stripe_account_id:     accountId,
          stripe_connect_type:   'express',
          stripe_onboarding_complete: false,
        })
        .eq('id', property_id)

      console.log(`[stripe-connect-onboarding] Nueva cuenta Express creada: ${accountId}`)
    } else {
      console.log(`[stripe-connect-onboarding] Reutilizando cuenta existente: ${accountId}`)
    }

    // ── Crear Account Link (URL de onboarding Stripe) ─────────────────────────
    const accountLink = await stripe.accountLinks.create({
      account:     accountId,
      refresh_url, // Stripe redirige aquí si el link expira
      return_url,  // Stripe redirige aquí al terminar
      type:        'account_onboarding',
    })

    return json({ ok: true, url: accountLink.url, account_id: accountId })

  } catch (err) {
    console.error('[stripe-connect-onboarding] Error:', err)
    return json({ ok: false, error: 'Error interno', detail: String(err) }, 500)
  }
})

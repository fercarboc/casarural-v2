// supabase/functions/admin-manage-domains/index.ts
// POST { action: 'list'|'add'|'remove'|'set_active', property_id, domain?, domain_id? }
// Accesible para ADMIN y SUPER_ADMIN de la propiedad.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

function isValidDomain(d: string): boolean {
  return /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(d)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido' }, 405)

  try {
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const anonKey        = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim()
    if (!token) return json({ ok: false, error: 'No autorizado' }, 401)

    const callerClient = createClient(supabaseUrl, anonKey)
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser(token)
    if (callerErr || !caller) return json({ ok: false, error: 'No autorizado' }, 401)

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const body       = await req.json().catch(() => ({}))
    const action     = typeof body.action      === 'string' ? body.action.trim()               : ''
    const propertyId = typeof body.property_id === 'string' ? body.property_id.trim()         : ''
    const domain     = typeof body.domain      === 'string' ? body.domain.trim().toLowerCase() : ''

    if (!propertyId) return json({ ok: false, error: 'property_id requerido' }, 400)

    // Verificar que el usuario tiene acceso a esta property (ADMIN o SUPER_ADMIN)
    const { data: membership } = await adminClient
      .from('property_users')
      .select('rol')
      .eq('user_id', caller.id)
      .eq('property_id', propertyId)
      .single()

    const rol = (membership?.rol ?? '').toUpperCase()
    if (!['ADMIN', 'SUPER_ADMIN'].includes(rol)) {
      return json({ ok: false, error: 'No tienes permisos para gestionar dominios de esta propiedad' }, 403)
    }

    // ── list ──────────────────────────────────────────────────────────────────
    if (action === 'list') {
      const { data, error } = await adminClient
        .from('custom_domains')
        .select('id, domain, verified, created_at')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: true })

      if (error) return json({ ok: false, error: error.message }, 500)
      return json({ ok: true, domains: data ?? [] })
    }

    // ── add ───────────────────────────────────────────────────────────────────
    if (action === 'add') {
      if (!domain) return json({ ok: false, error: 'domain requerido' }, 400)
      if (!isValidDomain(domain)) return json({ ok: false, error: `"${domain}" no es un dominio válido (sin protocolo, sin barra)` }, 400)

      const { data: existing } = await adminClient
        .from('custom_domains')
        .select('id, property_id')
        .eq('domain', domain)
        .maybeSingle()

      if (existing) {
        return json({ ok: false, error: `El dominio "${domain}" ya está registrado` }, 409)
      }

      const { data: inserted, error: insertErr } = await adminClient
        .from('custom_domains')
        .insert({ domain, property_id: propertyId, verified: false })
        .select('id, domain, verified, created_at')
        .single()

      if (insertErr) return json({ ok: false, error: insertErr.message }, 500)
      return json({ ok: true, domain: inserted })
    }

    // ── remove ────────────────────────────────────────────────────────────────
    if (action === 'remove') {
      const domainId = typeof body.domain_id === 'string' ? body.domain_id.trim() : ''
      if (!domainId) return json({ ok: false, error: 'domain_id requerido para eliminar' }, 400)

      const { error: delErr } = await adminClient
        .from('custom_domains')
        .delete()
        .eq('id', domainId)
        .eq('property_id', propertyId)

      if (delErr) return json({ ok: false, error: delErr.message }, 500)
      return json({ ok: true })
    }

    // ── set_active (marcar como activo / inactivo) ────────────────────────────
    if (action === 'set_active') {
      const domainId = typeof body.domain_id === 'string' ? body.domain_id.trim() : ''
      const active   = body.active === true
      if (!domainId) return json({ ok: false, error: 'domain_id requerido' }, 400)

      const { error: updErr } = await adminClient
        .from('custom_domains')
        .update({ verified: active })
        .eq('id', domainId)
        .eq('property_id', propertyId)

      if (updErr) return json({ ok: false, error: updErr.message }, 500)
      return json({ ok: true })
    }

    return json({ ok: false, error: `Acción desconocida: "${action}"` }, 400)

  } catch (err) {
    console.error('admin-manage-domains: unhandled error', err)
    return json({ ok: false, error: 'Error interno del servidor' }, 500)
  }
})

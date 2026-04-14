// supabase/functions/admin-create-user/index.ts
// POST — crea un usuario en Auth y lo vincula a la propiedad del admin llamante.
// También puede ser invocada por un SUPER_ADMIN para vincular a cualquier propiedad.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido' }, 405)

  try {
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const anonKey        = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // ── Autenticar al llamante ─────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) return json({ ok: false, error: 'No autorizado' }, 401)

    const callerClient = createClient(supabaseUrl, anonKey)
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser(token)
    if (callerErr || !caller) return json({ ok: false, error: 'No autorizado' }, 401)

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // ── Obtener membresía del llamante ─────────────────────────────────────────
    const { data: membership, error: memErr } = await adminClient
      .from('property_users')
      .select('property_id, rol')
      .eq('user_id', caller.id)
      .single()

    if (memErr || !membership) {
      return json({ ok: false, error: 'No perteneces a ninguna propiedad' }, 403)
    }

    const callerRol = (membership.rol ?? '').toUpperCase()
    if (callerRol !== 'ADMIN' && callerRol !== 'SUPER_ADMIN') {
      return json({ ok: false, error: 'Acceso denegado' }, 403)
    }

    // ── Leer parámetros ────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}))
    const email       = typeof body.email       === 'string' ? body.email.trim().toLowerCase()  : ''
    const password    = typeof body.password    === 'string' ? body.password                    : ''
    const rol         = typeof body.rol         === 'string' ? body.rol.toUpperCase()            : 'ADMIN'
    // SUPER_ADMIN puede especificar property_id; si no, usa la suya propia
    const targetPropId: string = (callerRol === 'SUPER_ADMIN' && typeof body.property_id === 'string')
      ? body.property_id
      : membership.property_id

    if (!email || !password) {
      return json({ ok: false, error: 'Email y contraseña son obligatorios' }, 400)
    }
    if (password.length < 6) {
      return json({ ok: false, error: 'La contraseña debe tener al menos 6 caracteres' }, 400)
    }

    // ── Crear usuario en Auth ──────────────────────────────────────────────────
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createErr || !created?.user) {
      const msg = createErr?.message ?? 'Error al crear el usuario'
      return json({ ok: false, error: msg }, 400)
    }

    const newUserId = created.user.id

    // ── Vincular a la propiedad en property_users ──────────────────────────────
    const { error: linkErr } = await adminClient
      .from('property_users')
      .insert({ user_id: newUserId, property_id: targetPropId, rol })

    if (linkErr) {
      // Intentar limpiar el usuario creado para no dejar huérfanos
      await adminClient.auth.admin.deleteUser(newUserId)
      return json({ ok: false, error: `Error al vincular usuario: ${linkErr.message}` }, 500)
    }

    return json({
      ok: true,
      user: { id: newUserId, email: created.user.email, rol },
    })

  } catch (err) {
    console.error('admin-create-user: unhandled error', err)
    return json({ ok: false, error: 'Error interno del servidor' }, 500)
  }
})

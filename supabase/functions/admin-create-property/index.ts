// supabase/functions/admin-create-property/index.ts
// POST — crea una nueva property y su primer usuario administrador.
// Solo accesible para SUPER_ADMIN.

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

    // ── Verificar que el llamante es SUPER_ADMIN ───────────────────────────────
    const { data: membership } = await adminClient
      .from('property_users')
      .select('rol')
      .eq('user_id', caller.id)
      .single()

    if ((membership?.rol ?? '').toUpperCase() !== 'SUPER_ADMIN') {
      return json({ ok: false, error: 'Solo los super administradores pueden crear propiedades' }, 403)
    }

    // ── Leer parámetros ────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}))

    const nombre         = typeof body.nombre         === 'string' ? body.nombre.trim()         : ''
    const slug           = typeof body.slug           === 'string' ? body.slug.trim().toLowerCase() : ''
    const admin_email    = typeof body.admin_email    === 'string' ? body.admin_email.trim().toLowerCase() : ''
    const admin_password = typeof body.admin_password === 'string' ? body.admin_password        : ''

    if (!nombre || !slug || !admin_email || !admin_password) {
      return json({ ok: false, error: 'nombre, slug, admin_email y admin_password son obligatorios' }, 400)
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return json({ ok: false, error: 'El slug solo puede contener letras minúsculas, números y guiones' }, 400)
    }
    if (admin_password.length < 6) {
      return json({ ok: false, error: 'La contraseña debe tener al menos 6 caracteres' }, 400)
    }

    // ── Verificar slug único ───────────────────────────────────────────────────
    const { data: existing } = await adminClient
      .from('properties')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      return json({ ok: false, error: `El slug "${slug}" ya está en uso` }, 409)
    }

    // ── Crear la property ──────────────────────────────────────────────────────
    const { data: property, error: propErr } = await adminClient
      .from('properties')
      .insert({
        nombre,
        slug,
        activa: true,
        site_title: nombre,
      })
      .select('id, nombre, slug')
      .single()

    if (propErr || !property) {
      return json({ ok: false, error: `Error al crear propiedad: ${propErr?.message}` }, 500)
    }

    // ── Crear o reutilizar el usuario admin en Auth ────────────────────────────
    // Si el email ya existe lo reutilizamos (caso: usuario creado manualmente antes)
    let newUserId: string

    const { data: created, error: userErr } = await adminClient.auth.admin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true,
    })

    if (userErr) {
      // Intentar buscar si el usuario ya existe
      const { data: { users } } = await adminClient.auth.admin.listUsers()
      const existing = users?.find(u => u.email === admin_email)

      if (existing) {
        // Actualizar contraseña al valor indicado
        await adminClient.auth.admin.updateUserById(existing.id, { password: admin_password })
        newUserId = existing.id
      } else {
        // Error real, limpiar property
        await adminClient.from('properties').delete().eq('id', property.id)
        return json({ ok: false, error: `Error al crear usuario: ${userErr.message}` }, 400)
      }
    } else if (created?.user) {
      newUserId = created.user.id
    } else {
      await adminClient.from('properties').delete().eq('id', property.id)
      return json({ ok: false, error: 'Error inesperado al crear usuario' }, 500)
    }

    // ── Vincular usuario a la property ─────────────────────────────────────────
    const { error: linkErr } = await adminClient
      .from('property_users')
      .insert({ user_id: newUserId, property_id: property.id, rol: 'ADMIN' })

    if (linkErr) {
      // Limpiar si el vínculo falla (solo borrar usuario si lo creamos nosotros)
      if (!userErr) await adminClient.auth.admin.deleteUser(newUserId)
      await adminClient.from('properties').delete().eq('id', property.id)
      return json({ ok: false, error: `Error al vincular usuario: ${linkErr.message}` }, 500)
    }

    return json({
      ok: true,
      property: { id: property.id, nombre: property.nombre, slug: property.slug },
      user: { id: newUserId, email: admin_email },
    })

  } catch (err) {
    console.error('admin-create-property: unhandled error', err)
    return json({ ok: false, error: 'Error interno del servidor' }, 500)
  }
})

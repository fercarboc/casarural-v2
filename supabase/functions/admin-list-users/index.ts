// supabase/functions/admin-list-users/index.ts
// POST/GET — devuelve los usuarios de la propiedad del admin llamante.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return json({ ok: false, error: 'Método no permitido' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('admin-list-users: faltan secrets de Supabase')
      return json({ ok: false, error: 'Configuración incompleta del servidor' }, 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('admin-list-users: missing/invalid Authorization header')
      return json({ ok: false, error: 'Missing or invalid Authorization header' }, 401)
    }

    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      console.error('admin-list-users: empty bearer token')
      return json({ ok: false, error: 'Empty bearer token' }, 401)
    }

    // 1) Validar identidad del usuario llamante con JWT real
    const callerClient = createClient(supabaseUrl, anonKey)
    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser(token)

    if (callerError || !caller) {
      console.error('admin-list-users: auth.getUser failed', callerError)
      return json({ ok: false, error: 'Unauthorized' }, 401)
    }

    // 2) Cliente admin para consultas privilegiadas
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // 3) Obtener property_id y rol del llamante
    const { data: membership, error: membershipError } = await adminClient
      .from('property_users')
      .select('property_id, rol')
      .eq('user_id', caller.id)
      .single()

    if (membershipError || !membership) {
      console.error('admin-list-users: membership error', membershipError)
      return json({ ok: false, error: 'No perteneces a ninguna propiedad' }, 403)
    }

    if ((membership.rol ?? '').toUpperCase() !== 'ADMIN') {
      console.error('admin-list-users: access denied for role', membership.rol)
      return json({ ok: false, error: 'Acceso denegado' }, 403)
    }

    const propertyId = membership.property_id

    // 4) Obtener usuarios de la propiedad
    const { data: propertyUsers, error: puError } = await adminClient
      .from('property_users')
      .select('id, user_id, rol, created_at')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: true })

    if (puError) {
      console.error('admin-list-users: property_users query error', puError)
      return json({ ok: false, error: 'Error al obtener usuarios' }, 500)
    }

    // 5) Enriquecer con email desde Auth
    const users = await Promise.all(
      (propertyUsers ?? []).map(async (pu) => {
        const { data: authUser, error: authUserError } = await adminClient.auth.admin.getUserById(pu.user_id)

        if (authUserError) {
          console.error('admin-list-users: getUserById error', pu.user_id, authUserError)
        }

        return {
          id: pu.id,
          user_id: pu.user_id,
          email: authUser?.user?.email ?? '—',
          rol: pu.rol,
          created_at: pu.created_at,
        }
      })
    )

    return json({ ok: true, users })
  } catch (error) {
    console.error('admin-list-users: unhandled error', error)
    return json({ ok: false, error: 'Error interno del servidor' }, 500)
  }
})
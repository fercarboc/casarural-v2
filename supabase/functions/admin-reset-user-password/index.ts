import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'METHOD_NOT_ALLOWED' })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json(401, { ok: false, error: 'MISSING_AUTH' })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Cliente con JWT del usuario llamante
    const supabaseUser = createClient(supabaseUrl, serviceRoleKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // 1. Obtener usuario autenticado
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser()

    if (userError || !user) {
      return json(401, { ok: false, error: 'INVALID_USER' })
    }

    // 2. Validar que sea SUPER_ADMIN
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('property_users')
      .select('rol')
      .eq('user_id', user.id)

    if (membershipError) {
      return json(500, { ok: false, error: 'MEMBERSHIP_ERROR', detail: membershipError.message })
    }

    const isSuperAdmin = Array.isArray(memberships) && memberships.some((m) => m.rol === 'SUPER_ADMIN')

    if (!isSuperAdmin) {
      return json(403, { ok: false, error: 'FORBIDDEN' })
    }

    // 3. Leer body
    const body = await req.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const userId = typeof body.user_id === 'string' ? body.user_id.trim() : ''
    const newPassword = typeof body.new_password === 'string' ? body.new_password : ''

    if ((!email && !userId) || !newPassword) {
      return json(400, {
        ok: false,
        error: 'MISSING_FIELDS',
        detail: 'Debes enviar email o user_id, y new_password',
      })
    }

    if (newPassword.length < 8) {
      return json(400, {
        ok: false,
        error: 'WEAK_PASSWORD',
        detail: 'La contraseña debe tener al menos 8 caracteres',
      })
    }

    let targetUserId = userId

    // 4. Resolver user_id por email si hace falta
    if (!targetUserId && email) {
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers()

      if (listError) {
        return json(500, { ok: false, error: 'LIST_USERS_ERROR', detail: listError.message })
      }

      const found = usersData.users.find((u) => (u.email ?? '').toLowerCase() === email)

      if (!found) {
        return json(404, { ok: false, error: 'USER_NOT_FOUND' })
      }

      targetUserId = found.id
    }

    // 5. Cambiar contraseña
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    })

    if (updateError) {
      return json(500, { ok: false, error: 'UPDATE_PASSWORD_ERROR', detail: updateError.message })
    }

    return json(200, {
      ok: true,
      message: 'Contraseña actualizada correctamente',
      user_id: targetUserId,
      email: email || null,
    })
  } catch (err) {
    return json(500, {
      ok: false,
      error: 'UNEXPECTED_ERROR',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
})
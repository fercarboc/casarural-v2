import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    const body = await req.json().catch(() => ({}))

    const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const telefono = typeof body.telefono === 'string' ? body.telefono.trim() : null
    const asunto = typeof body.asunto === 'string' ? body.asunto.trim() : ''
    const mensaje = typeof body.mensaje === 'string' ? body.mensaje.trim() : ''
    const propertyId = typeof body.property_id === 'string' ? body.property_id.trim() : null

    // Validate required fields
    if (!nombre) return json(400, { ok: false, error: 'El nombre es obligatorio' })
    if (!email) return json(400, { ok: false, error: 'El email es obligatorio' })
    if (!isValidEmail(email)) return json(400, { ok: false, error: 'El email no es válido' })
    if (!mensaje) return json(400, { ok: false, error: 'El mensaje es obligatorio' })

    const tipo = propertyId ? 'CONTACTO' : 'CONTACTO_GLOBAL'

    const payload = {
      property_id: propertyId || null,
      reserva_id: null,
      nombre,
      email,
      telefono: telefono || null,
      tipo,
      mensaje,
      estado: 'PENDIENTE',
      asunto: asunto || 'Consulta general',
    }

    const { data, error } = await supabase
      .from('consultas')
      .insert(payload)
      .select('id')
      .single()

    if (error) {
      return json(500, { ok: false, error: 'Error guardando consulta', detail: error.message })
    }

    return json(200, { ok: true, id: data.id })
  } catch (err) {
    return json(500, {
      ok: false,
      error: 'Unexpected error',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
})

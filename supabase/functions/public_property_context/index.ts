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
    const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
    const propertyId = typeof body.property_id === 'string' ? body.property_id.trim() : ''

    if (!slug && !propertyId) {
      return json(400, { ok: false, error: 'Debes enviar slug o property_id' })
    }

    let query = supabase
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
        site_title,
        site_tagline,
        logo_alt,
        footer_text,
        meta_title,
        meta_description,
        mascotas_permitidas,
        suplemento_mascota,
        fumar_permitido,
        checkin_time,
        checkout_time,
        non_refundable_discount_pct,
        flexible_deposit_pct
      `)
      .eq('activa', true)

    if (propertyId) {
      query = query.eq('id', propertyId)
    } else {
      query = query.eq('slug', slug)
    }

    const { data: property, error } = await query.maybeSingle()

    if (error) {
      return json(500, { ok: false, error: 'Error cargando propiedad', detail: error.message })
    }

    if (!property) {
      return json(200, { ok: false, error: 'Propiedad no encontrada' })
    }

    return json(200, { ok: true, property })
  } catch (err) {
    return json(500, {
      ok: false,
      error: 'Unexpected error',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
})

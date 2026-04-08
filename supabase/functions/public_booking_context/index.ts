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
    const unidadSlug = typeof body.unidad_slug === 'string' ? body.unidad_slug.trim() : ''
    const unidadId = typeof body.unidad_id === 'string' ? body.unidad_id.trim() : ''

    if (!slug && !propertyId) {
      return json(400, { ok: false, error: 'Debes enviar slug o property_id' })
    }

    // Look up property
    let propQuery = supabase
      .from('properties')
      .select(`
        id,
        nombre,
        slug,
        checkin_time,
        checkout_time,
        mascotas_permitidas,
        suplemento_mascota,
        fumar_permitido,
        non_refundable_discount_pct,
        flexible_deposit_pct
      `)
      .eq('activa', true)

    if (propertyId) {
      propQuery = propQuery.eq('id', propertyId)
    } else {
      propQuery = propQuery.eq('slug', slug)
    }

    const { data: property, error: propError } = await propQuery.maybeSingle()

    if (propError) {
      return json(500, { ok: false, error: 'Error cargando propiedad', detail: propError.message })
    }

    if (!property) {
      return json(200, { ok: false, error: 'Propiedad no encontrada' })
    }

    // Fetch units - optionally filter by unidad
    let unitsQuery = supabase
      .from('unidades')
      .select(`
        id,
        property_id,
        nombre,
        slug,
        descripcion_corta,
        capacidad_base,
        capacidad_maxima,
        activa,
        orden
      `)
      .eq('property_id', property.id)
      .eq('activa', true)
      .order('orden', { ascending: true })

    if (unidadId) {
      unitsQuery = unitsQuery.eq('id', unidadId)
    } else if (unidadSlug) {
      unitsQuery = unitsQuery.eq('slug', unidadSlug)
    }

    const { data: units, error: unitsError } = await unitsQuery

    if (unitsError) {
      return json(500, { ok: false, error: 'Error cargando unidades', detail: unitsError.message })
    }

    return json(200, {
      ok: true,
      property,
      units: units ?? [],
    })
  } catch (err) {
    return json(500, {
      ok: false,
      error: 'Unexpected error',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
})

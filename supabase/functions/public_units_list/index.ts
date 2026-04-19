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

    // Look up the property first
    let propQuery = supabase
      .from('properties')
      .select('id, nombre, slug')
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

    // Fetch active units
    const { data: unidades, error: unitsError } = await supabase
      .from('unidades')
      .select(`
        id,
        property_id,
        nombre,
        slug,
        descripcion_corta,
        descripcion_larga,
        descripcion_extras,
        capacidad_base,
        capacidad_maxima,
        num_habitaciones,
        num_banos,
        superficie_m2,
        amenities,
        activa,
        orden,
        modo_operacion,
        precio_noche
      `)
      .eq('property_id', property.id)
      .eq('activa', true)
      .order('orden', { ascending: true })

    if (unitsError) {
      return json(500, { ok: false, error: 'Error cargando unidades', detail: unitsError.message })
    }

    const unitIds = (unidades ?? []).map((u) => u.id)

    let fotos: any[] = []

    if (unitIds.length > 0) {
      const { data: fotosData, error: fotosError } = await supabase
        .from('unidad_fotos')
        .select(`
          id,
          unidad_id,
          public_url,
          storage_path,
          alt_text,
          caption,
          orden,
          es_portada,
          activa
        `)
        .eq('property_id', property.id)
        .eq('activa', true)
        .in('unidad_id', unitIds)
        .order('orden', { ascending: true })

      if (fotosError) {
        return json(500, { ok: false, error: 'Error cargando fotos', detail: fotosError.message })
      }

      fotos = fotosData ?? []
    }

    // Group photos by unit, sorted: portada first, then by orden
    const fotosPorUnidad = new Map<string, any[]>()
    for (const foto of fotos) {
      const list = fotosPorUnidad.get(foto.unidad_id) ?? []
      list.push(foto)
      fotosPorUnidad.set(foto.unidad_id, list)
    }

    const unidadesConFotos = (unidades ?? []).map((unidad) => {
      const fotosUnidad = (fotosPorUnidad.get(unidad.id) ?? [])
        .filter((f) => !!f.public_url)
        .sort((a: any, b: any) => {
          if (a.es_portada && !b.es_portada) return -1
          if (!a.es_portada && b.es_portada) return 1
          return (a.orden ?? 9999) - (b.orden ?? 9999)
        })

      const portada =
        fotosUnidad.find((f: any) => f.es_portada && f.public_url) ??
        fotosUnidad[0] ??
        null

      return {
        ...unidad,
        portada_url: portada?.public_url ?? null,
        fotos: fotosUnidad.map((f: any, index: number) => ({
          id: f.id,
          public_url: f.public_url,
          storage_path: f.storage_path,
          alt_text: f.alt_text?.trim() || `${unidad.nombre} · imagen ${index + 1}`,
          caption: f.caption,
          orden: f.orden,
          es_portada: !!f.es_portada,
        })),
      }
    })

    return json(200, {
      ok: true,
      property: { id: property.id, nombre: property.nombre, slug: property.slug },
      units: unidadesConFotos,
    })
  } catch (err) {
    return json(500, {
      ok: false,
      error: 'Unexpected error',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
})

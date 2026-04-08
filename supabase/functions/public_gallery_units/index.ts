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
    return json(405, { ok: false, error: 'Method not allowed' })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const body = await req.json().catch(() => ({}))
    const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
    const propertyId =
      typeof body.property_id === 'string' ? body.property_id.trim() : ''

    if (!slug && !propertyId) {
      return json(400, {
        ok: false,
        error: 'Debes enviar slug o property_id',
      })
    }

    let propertyQuery = supabase
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
        meta_description
      `)
      .eq('activa', true)

    if (propertyId) {
      propertyQuery = propertyQuery.eq('id', propertyId)
    } else {
      propertyQuery = propertyQuery.eq('slug', slug)
    }

    const { data: property, error: propertyError } =
      await propertyQuery.maybeSingle()

    if (propertyError) {
      return json(500, {
        ok: false,
        error: 'Error cargando propiedad',
        detail: propertyError.message,
      })
    }

    if (!property) {
      return json(404, {
        ok: false,
        error: 'Propiedad no encontrada',
      })
    }

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
        orden
      `)
      .eq('property_id', property.id)
      .eq('activa', true)
      .order('orden', { ascending: true })

    if (unitsError) {
      return json(500, {
        ok: false,
        error: 'Error cargando unidades',
        detail: unitsError.message,
      })
    }

    const unitIds = (unidades ?? []).map((u) => u.id)

    let fotos: any[] = []

    if (unitIds.length > 0) {
      const { data: fotosData, error: fotosError } = await supabase
        .from('unidad_fotos')
        .select(`
          id,
          property_id,
          unidad_id,
          storage_path,
          public_url,
          nombre_archivo,
          mime_type,
          size_bytes,
          ancho,
          alto,
          alt_text,
          caption,
          orden,
          es_portada,
          activa,
          created_at,
          updated_at
        `)
        .eq('property_id', property.id)
        .eq('activa', true)
        .in('unidad_id', unitIds)
        .order('orden', { ascending: true })

      if (fotosError) {
        return json(500, {
          ok: false,
          error: 'Error cargando fotos',
          detail: fotosError.message,
        })
      }

      fotos = fotosData ?? []
    }

    const fotosPorUnidad = new Map<string, any[]>()

    for (const foto of fotos) {
      const list = fotosPorUnidad.get(foto.unidad_id) ?? []
      list.push(foto)
      fotosPorUnidad.set(foto.unidad_id, list)
    }

    const unidadesConFotos = (unidades ?? []).map((unidad) => {
      const fotosUnidad = (fotosPorUnidad.get(unidad.id) ?? [])
        .filter((f) => !!f.public_url)
        .sort((a, b) => {
          if (a.es_portada && !b.es_portada) return -1
          if (!a.es_portada && b.es_portada) return 1
          return (a.orden ?? 9999) - (b.orden ?? 9999)
        })

      const portada =
        fotosUnidad.find((f) => f.es_portada && f.public_url) ??
        fotosUnidad[0] ??
        null

      return {
        ...unidad,
        portada_url: portada?.public_url ?? null,
        fotos: fotosUnidad.map((f, index) => ({
          id: f.id,
          public_url: f.public_url,
          storage_path: f.storage_path,
          alt_text:
            f.alt_text?.trim() || `${unidad.nombre} · imagen ${index + 1}`,
          caption: f.caption,
          orden: f.orden,
          es_portada: !!f.es_portada,
          ancho: f.ancho,
          alto: f.alto,
        })),
      }
    })

    return json(200, {
      ok: true,
      property,
      units: unidadesConFotos,
    })
  } catch (error) {
    return json(500, {
      ok: false,
      error: 'Unexpected error',
      detail: error instanceof Error ? error.message : String(error),
    })
  }
})
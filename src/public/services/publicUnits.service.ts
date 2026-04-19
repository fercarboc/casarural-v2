export interface PublicUnitPhoto {
  id: string
  public_url: string
  storage_path: string | null
  alt_text: string
  caption: string | null
  orden: number | null
  es_portada: boolean
}

export interface PublicUnit {
  id: string
  property_id: string
  nombre: string
  slug: string
  descripcion_corta: string | null
  descripcion_larga: string | null
  descripcion_extras: string | null
  capacidad_base: number | null
  capacidad_maxima: number | null
  num_habitaciones: number | null
  num_banos: number | null
  superficie_m2: number | null
  amenities: string[] | null
  activa: boolean
  orden: number | null
  modo_operacion: 'SHORT' | 'LONG'
  precio_noche: number | null
  portada_url: string | null
  fotos: PublicUnitPhoto[]
}

export interface PublicUnitsResponse {
  ok: boolean
  property?: { id: string; nombre: string; slug: string }
  units?: PublicUnit[]
  error?: string
}

export async function fetchPublicUnits(params: {
  slug?: string
  property_id?: string
}): Promise<PublicUnitsResponse> {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public_units_list`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(params),
    },
  )

  const data = (await res.json()) as PublicUnitsResponse

  if (!res.ok) {
    throw new Error(data.error || 'Error cargando unidades')
  }

  return data
}

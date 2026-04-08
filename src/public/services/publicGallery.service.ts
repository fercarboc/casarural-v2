export interface PublicGalleryPhoto {
  id: string
  public_url: string
  storage_path: string | null
  alt_text: string
  caption: string | null
  orden: number | null
  es_portada: boolean
}

export interface PublicGalleryUnit {
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
  portada_url: string | null
  fotos: PublicGalleryPhoto[]
}

export interface PublicGalleryProperty {
  id: string
  nombre: string
  slug: string
  descripcion: string | null
  direccion: string | null
  localidad: string | null
  provincia: string | null
  pais: string | null
  telefono: string | null
  email: string | null
  web: string | null
  logo_url: string | null
  activa: boolean
  site_title: string | null
  site_tagline: string | null
  logo_alt: string | null
  footer_text: string | null
  meta_title: string | null
  meta_description: string | null
}

export interface PublicGalleryResponse {
  ok: boolean
  property?: PublicGalleryProperty
  units?: PublicGalleryUnit[]
  error?: string
  detail?: string
}

export async function fetchPublicGalleryUnits(params: {
  slug?: string
  property_id?: string
}): Promise<PublicGalleryResponse> {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public_gallery_units`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(params),
    },
  )

  const data = (await res.json()) as PublicGalleryResponse

  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Error cargando galería pública')
  }

  return data
}

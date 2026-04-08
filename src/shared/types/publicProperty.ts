export interface PublicProperty {
  id: string
  nombre: string
  slug: string
  descripcion: string | null
  direccion: string | null
  localidad: string | null
  provincia: string | null
  pais: string | null
  latitud: number | null
  longitud: number | null
  telefono: string | null
  email: string | null
  web: string | null
  logo_url: string | null
  activa: boolean | null

  site_title: string | null
  site_tagline: string | null
  logo_alt: string | null
  footer_text: string | null
  meta_title: string | null
  meta_description: string | null

  mascotas_permitidas: boolean | null
  suplemento_mascota: number | null
  fumar_permitido: boolean | null

  checkin_time: string | null
  checkout_time: string | null

  non_refundable_discount_pct: number | null
  flexible_deposit_pct: number | null
}
// Tipos del sistema multi-tenant.
// Representan la configuración pública de un cliente/property,
// tal como la devuelve la edge function resolve-tenant.

export interface TenantBranding {
  logo_url:      string
  logo_alt:      string
  primary_color: string | null
  favicon_url:   string | null
  og_image_url:  string | null
}

export interface TenantSeo {
  site_title:       string
  meta_description: string
  lang:             string
  robots_index:     boolean
}

export interface TenantFeatures {
  booking:    boolean
  gallery:    boolean
  activities: boolean
  services:   boolean
  contact:    boolean
}

export interface TenantContacto {
  email:     string
  telefono:  string
  localidad: string
  provincia: string
}

export interface TenantOperacion {
  checkin_time:  string
  checkout_time: string
}

export interface TenantConfig {
  property_id: string
  slug:        string
  nombre:      string
  estado:      'active' | 'inactive' | 'setup'
  branding:    TenantBranding
  seo:         TenantSeo
  features:    TenantFeatures
  contacto:    TenantContacto
  operacion:   TenantOperacion
}

export type TenantErrorCode = 'NOT_FOUND' | 'INACTIVE' | 'NETWORK_ERROR'

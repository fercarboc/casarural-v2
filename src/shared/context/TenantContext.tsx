import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { resolveTenant, resolveHostname } from '../services/tenant.service'
import type { TenantConfig, TenantErrorCode } from '../types/tenant'
import { TenantNotFound } from '../components/TenantNotFound'
import { TenantInactive } from '../components/TenantInactive'

// ─── Branding dinámico ────────────────────────────────────────────────────────

function applyTenantBranding(config: TenantConfig) {
  const { seo, branding } = config

  // Título y lang
  if (seo.site_title)  document.title = seo.site_title
  if (seo.lang)        document.documentElement.lang = seo.lang

  // robots
  let robotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
  if (!robotsMeta) {
    robotsMeta = document.createElement('meta')
    robotsMeta.name = 'robots'
    document.head.appendChild(robotsMeta)
  }
  robotsMeta.content = seo.robots_index ? 'index, follow' : 'noindex, nofollow'

  // Color primario como CSS custom property en :root
  if (branding.primary_color) {
    document.documentElement.style.setProperty('--color-primary', branding.primary_color)
  }

  // Favicon
  if (branding.favicon_url) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = branding.favicon_url
  }

  // og:image
  if (branding.og_image_url) {
    let ogImage = document.querySelector<HTMLMetaElement>('meta[property="og:image"]')
    if (!ogImage) {
      ogImage = document.createElement('meta')
      ogImage.setAttribute('property', 'og:image')
      document.head.appendChild(ogImage)
    }
    ogImage.content = branding.og_image_url
  }

  // og:title
  if (seo.site_title) {
    let ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')
    if (!ogTitle) {
      ogTitle = document.createElement('meta')
      ogTitle.setAttribute('property', 'og:title')
      document.head.appendChild(ogTitle)
    }
    ogTitle.content = seo.site_title
  }

  // meta description
  if (seo.meta_description) {
    let desc = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!desc) {
      desc = document.createElement('meta')
      desc.name = 'description'
      document.head.appendChild(desc)
    }
    desc.content = seo.meta_description
  }
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const TenantContext = createContext<TenantConfig | null>(null)

// ─── Hook público ─────────────────────────────────────────────────────────────

export function useTenant(): TenantConfig {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant debe usarse dentro de <TenantProvider>')
  return ctx
}

// ─── Splash mínimo mientras resuelve ──────────────────────────────────────────

function TenantSplash() {
  return (
    <div style={{
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      height:          '100vh',
      width:           '100vw',
      backgroundColor: '#fafaf9',
    }}>
      <div style={{
        width:           32,
        height:          32,
        border:          '3px solid #e7e5e4',
        borderTopColor:  '#78716c',
        borderRadius:    '50%',
        animation:       'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Portal tenant (clientes.staynexapp.com) ──────────────────────────────────
// Este dominio es el portal universal: no identifica un tenant por hostname.
// El tenant se resuelve por sesión Auth en AdminTenantContext.
// Las rutas públicas no aplican aquí — la app redirige directo a /admin.

const PORTAL_HOSTNAMES = ['clientes.staynexapp.com']

const PORTAL_TENANT: TenantConfig = {
  property_id:  '',
  slug:         '',
  nombre:       'StayNexApp',
  estado:       'active',
  branding:     { logo_url: '', logo_alt: 'StayNexApp', primary_color: null, favicon_url: null, og_image_url: null },
  seo:          { site_title: 'StayNexApp', meta_description: '', lang: 'es', robots_index: false },
  features:     { booking: false, gallery: false, activities: false, services: false, contact: false },
  contacto:     { email: '', telefono: '', localidad: '', provincia: '' },
  operacion:    { checkin_time: '16:00', checkout_time: '12:00' },
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface TenantProviderProps {
  children: ReactNode
}

export function TenantProvider({ children }: TenantProviderProps) {
  const hostname = window.location.hostname

  // Portal universal: saltar resolución de tenant, admin resuelve por sesión
  if (PORTAL_HOSTNAMES.includes(hostname)) {
    return (
      <TenantContext.Provider value={PORTAL_TENANT}>
        {children}
      </TenantContext.Provider>
    )
  }

  return <TenantProviderResolved>{children}</TenantProviderResolved>
}

function TenantProviderResolved({ children }: TenantProviderProps) {
  const [tenant, setTenant]   = useState<TenantConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<TenantErrorCode | null>(null)

  useEffect(() => {
    const hostnameOrSlug = resolveHostname()

    resolveTenant(hostnameOrSlug)
      .then((config) => {
        setTenant(config)
        applyTenantBranding(config)
      })
      .catch((err: { code?: TenantErrorCode }) => {
        setError(err?.code ?? 'NETWORK_ERROR')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <TenantSplash />
  if (error === 'NOT_FOUND')     return <TenantNotFound />
  if (error === 'INACTIVE')      return <TenantInactive />
  if (error === 'NETWORK_ERROR') return <TenantNotFound networkError />

  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  )
}

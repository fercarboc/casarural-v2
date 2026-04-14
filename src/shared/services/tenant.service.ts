import type { TenantConfig, TenantErrorCode } from '../types/tenant'

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string

function isLocalhost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0'
  )
}

// Si estamos en localhost puro, usamos VITE_DEV_PROPERTY_SLUG como fallback.
// Si estamos entrando por un dominio local real (rasilla.local, juan.local, etc.),
// usamos siempre el hostname.
export function resolveHostname(): string {
  const hostname = window.location.hostname

  if (isLocalhost(hostname)) {
    const devSlug = (import.meta as any).env.VITE_DEV_PROPERTY_SLUG as string | undefined
    return devSlug && devSlug.trim() ? devSlug.trim() : hostname
  }

  return hostname
}

class TenantResolutionError extends Error {
  code: TenantErrorCode
  constructor(code: TenantErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

// Si el valor recibido es localhost/127.0.0.1/0.0.0.0, enviamos slug como fallback.
// Si es un hostname real (incluido .local), enviamos hostname.
function buildPayload(hostnameOrSlug: string): Record<string, string> {
  if (isLocalhost(hostnameOrSlug)) {
    const devSlug = (import.meta as any).env.VITE_DEV_PROPERTY_SLUG as string | undefined
    if (devSlug && devSlug.trim()) {
      return { slug: devSlug.trim() }
    }
  }

  return { hostname: hostnameOrSlug }
}

export async function resolveTenant(hostnameOrSlug: string): Promise<TenantConfig> {
  let res: Response

  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/resolve-tenant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(buildPayload(hostnameOrSlug)),
    })
  } catch {
    throw new TenantResolutionError('NETWORK_ERROR', 'No se pudo conectar con el servidor')
  }

  const data = await res.json().catch(() => ({}))

  if (res.status === 404 || data?.error === 'TENANT_NOT_FOUND') {
    throw new TenantResolutionError('NOT_FOUND', 'Tenant no encontrado')
  }

  if (res.status === 403 || data?.error === 'TENANT_INACTIVE') {
    throw new TenantResolutionError('INACTIVE', 'Tenant inactivo')
  }

  if (!res.ok || !data?.ok || !data?.tenant) {
    throw new TenantResolutionError('NETWORK_ERROR', data?.error ?? 'Error inesperado del servidor')
  }

  return data.tenant as TenantConfig
}
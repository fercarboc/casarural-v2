// supabase/functions/resolve-tenant/index.ts
//
// Función pública (sin JWT) que resuelve qué tenant corresponde a un hostname.
// Es la pieza central del sistema multi-tenant: el frontend la llama al arrancar
// y obtiene la configuración pública del cliente antes de renderizar nada.
//
// Resolución por prioridad:
//   1. hostname del body  → busca en custom_domains
//   2. header x-forwarded-host / host → busca en custom_domains
//   3. slug del body (fallback para desarrollo local)

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-forwarded-host, host',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

function isLocalhost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase()

  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === '0.0.0.0' ||
    normalized.startsWith('192.168.')
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    const body = await req.json().catch(() => ({}))

    const hostnameFromBody =
      typeof body.hostname === 'string'
        ? body.hostname.trim().toLowerCase()
        : ''

    const slugFallback =
      typeof body.slug === 'string'
        ? body.slug.trim()
        : ''

    // Header enviado por Vercel/Netlify/Cloudflare con el dominio original
    const rawHeader =
      req.headers.get('x-forwarded-host') ||
      req.headers.get('host') ||
      ''

    // Limpiar puerto si viene incluido (ej: "localhost:5173" → "localhost")
    const hostnameFromHeader = rawHeader.split(':')[0].trim().toLowerCase()

    // Prioridad: body.hostname > headers
    const hostname = hostnameFromBody || hostnameFromHeader || ''

    let propertyId: string | null = null

    // ── 1. Resolver por hostname en custom_domains ─────────────────────────────
    // Aquí SÍ deben entrar dominios como rasilla.local o juan.local.
    if (hostname && !isLocalhost(hostname)) {
      const { data: domain, error: domainError } = await supabase
        .from('custom_domains')
        .select('property_id, domain, verified, verificado')
        .eq('domain', hostname)
        .maybeSingle()

      if (domainError) {
        return json(500, {
          ok: false,
          error: 'DB_ERROR',
          detail: domainError.message,
        })
      }

      if (domain?.property_id) {
        propertyId = domain.property_id
      }
    }

    // ── 2. Fallback por slug (desarrollo local o dominio no registrado aún) ────
    // Solo se usa si no se pudo resolver por dominio.
    if (!propertyId && slugFallback) {
      const { data: prop, error: propError } = await supabase
        .from('properties')
        .select('id')
        .eq('slug', slugFallback)
        .maybeSingle()

      if (propError) {
        return json(500, {
          ok: false,
          error: 'DB_ERROR',
          detail: propError.message,
        })
      }

      if (prop?.id) {
        propertyId = prop.id
      }
    }

    if (!propertyId) {
      return json(404, {
        ok: false,
        error: 'TENANT_NOT_FOUND',
        detail: `No se encontró ningún tenant para hostname="${hostname}" slug="${slugFallback}"`,
      })
    }

    // ── 3. Cargar configuración pública de la property ─────────────────────────
    // Solo se devuelven campos públicos. Nunca incluir secretos.
    const { data: property, error } = await supabase
      .from('properties')
      .select(`
        id,
        slug,
        nombre,
        activa,
        site_title,
        site_tagline,
        logo_url,
        logo_alt,
        primary_color,
        favicon_url,
        og_image_url,
        lang,
        robots_index,
        meta_title,
        meta_description,
        footer_text,
        telefono,
        email,
        localidad,
        provincia,
        checkin_time,
        checkout_time
      `)
      .eq('id', propertyId)
      .maybeSingle()

    if (error) {
      return json(500, {
        ok: false,
        error: 'DB_ERROR',
        detail: error.message,
      })
    }

    if (!property) {
      return json(404, {
        ok: false,
        error: 'TENANT_NOT_FOUND',
      })
    }

    if (!property.activa) {
      return json(403, {
        ok: false,
        error: 'TENANT_INACTIVE',
      })
    }

    // ── 4. Construir respuesta estructurada ────────────────────────────────────
    return json(200, {
      ok: true,
      tenant: {
        property_id: property.id,
        slug: property.slug,
        nombre: property.nombre,
        estado: 'active',

        branding: {
          logo_url: property.logo_url ?? '',
          logo_alt: property.logo_alt ?? property.nombre,
          primary_color: property.primary_color ?? null,
          favicon_url: property.favicon_url ?? null,
          og_image_url: property.og_image_url ?? null,
        },

        seo: {
          site_title: property.site_title ?? property.nombre,
          meta_description: property.meta_description ?? property.site_tagline ?? '',
          lang: property.lang ?? 'es',
          robots_index: property.robots_index ?? true,
        },

        // Feature flags — todos activos por defecto hasta que se añadan a BD
        features: {
          booking: true,
          gallery: true,
          activities: true,
          services: true,
          contact: true,
        },

        contacto: {
          email: property.email ?? '',
          telefono: property.telefono ?? '',
          localidad: property.localidad ?? '',
          provincia: property.provincia ?? '',
        },

        operacion: {
          checkin_time: property.checkin_time ?? '16:00',
          checkout_time: property.checkout_time ?? '12:00',
        },
      },
    })
  } catch (err) {
    return json(500, {
      ok: false,
      error: 'UNEXPECTED_ERROR',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
})
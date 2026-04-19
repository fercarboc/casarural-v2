// supabase/functions/send-email/index.ts
// POST { template_key, to_email, to_name, reservation_id?, property_id?, extra_vars? }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

function str(value: unknown, fallback = ''): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (value === null || value === undefined) return fallback
  return String(value)
}

function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function money(value: unknown): string {
  return `${num(value).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`
}

function buildReservationCode(reserva: { id: string; codigo?: string | null }): string {
  if (reserva.codigo && reserva.codigo.trim()) return reserva.codigo.trim()
  return `R-${reserva.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

function formatDateEs(dateStr: string): string {
  try {
    const d = new Date(`${dateStr}T12:00:00`)
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// ── Fallback HTML templates for rental events ─────────────────────────────
// Used when no DB template exists for the property. Admins can override via
// the email_templates table (same key + their property_id).
const RENTAL_FALLBACK_TEMPLATES: Record<string, { asunto: string; cuerpo_html: string }> = {
  rental_nueva_solicitud: {
    asunto: 'Nueva solicitud de alquiler — {{unit_name}}',
    cuerpo_html: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,serif"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden"><tr><td style="background:#1c4532;padding:28px 32px"><p style="margin:0;color:#a7f3d0;font-size:12px;letter-spacing:2px;text-transform:uppercase">Panel de gestión</p><h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:normal">Nueva solicitud de alquiler</h1></td></tr><tr><td style="padding:32px"><p style="margin:0 0 20px;color:#374151;font-size:15px">Has recibido una nueva solicitud de alquiler para <strong>{{unit_name}}</strong>.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px"><tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb"><span style="color:#6b7280;font-size:13px">Inquilino</span><br><strong>{{guest_name}}</strong></td></tr><tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb"><span style="color:#6b7280;font-size:13px">Email</span><br><strong>{{tenant_email}}</strong></td></tr><tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb"><span style="color:#6b7280;font-size:13px">Teléfono</span><br><strong>{{tenant_phone}}</strong></td></tr><tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb"><span style="color:#6b7280;font-size:13px">Unidad</span><br><strong>{{unit_name}}</strong></td></tr><tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb"><span style="color:#6b7280;font-size:13px">Fecha inicio deseada</span><br><strong>{{fecha_inicio}}</strong></td></tr><tr><td style="padding:12px 16px"><span style="color:#6b7280;font-size:13px">Notas</span><br><span>{{notas}}</span></td></tr></table><div style="margin-top:28px;text-align:center"><a href="{{admin_url}}" style="display:inline-block;background:#1c4532;color:#fff;text-decoration:none;padding:12px 28px;border-radius:100px;font-size:14px;font-weight:bold">Ver solicitud en el panel</a></div></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f3f4f6;text-align:center"><p style="margin:0;color:#9ca3af;font-size:12px">{{property_name}}</p></td></tr></table></td></tr></table></body></html>`,
  },
  rental_solicitud_recibida: {
    asunto: 'Hemos recibido tu solicitud — {{unit_name}}',
    cuerpo_html: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,serif"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden"><tr><td style="background:#1c4532;padding:28px 32px"><p style="margin:0;color:#a7f3d0;font-size:12px;letter-spacing:2px;text-transform:uppercase">Solicitud de alquiler</p><h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:normal">Tu solicitud ha sido recibida</h1></td></tr><tr><td style="padding:32px"><p style="margin:0 0 16px;color:#374151;font-size:15px">Hola <strong>{{guest_name}}</strong>,</p><p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">Hemos recibido tu solicitud de alquiler para <strong>{{unit_name}}</strong>. Nuestro equipo la revisará y se pondrá en contacto contigo en un plazo de 24-48 horas.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px"><tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb"><span style="color:#6b7280;font-size:13px">Alojamiento solicitado</span><br><strong>{{unit_name}}</strong></td></tr><tr><td style="padding:12px 16px"><span style="color:#6b7280;font-size:13px">Fecha de inicio preferida</span><br><strong>{{fecha_inicio}}</strong></td></tr></table><p style="margin:24px 0 0;color:#6b7280;font-size:14px">Contacto: {{property_email}} · {{property_phone}}</p></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f3f4f6;text-align:center"><p style="margin:0;color:#9ca3af;font-size:12px">{{property_name}} · {{property_address}}</p></td></tr></table></td></tr></table></body></html>`,
  },
  rental_aprobado: {
    asunto: 'Tu solicitud ha sido aprobada — {{unit_name}}',
    cuerpo_html: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,serif"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden"><tr><td style="background:#1c4532;padding:28px 32px"><p style="margin:0;color:#a7f3d0;font-size:12px;letter-spacing:2px;text-transform:uppercase">¡Buenas noticias!</p><h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:normal">Tu solicitud ha sido aprobada</h1></td></tr><tr><td style="padding:32px"><p style="margin:0 0 16px;color:#374151;font-size:15px">Hola <strong>{{guest_name}}</strong>,</p><p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">Tu solicitud de alquiler ha sido <strong>aprobada</strong>. En breve recibirás los documentos del contrato.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px"><tr><td style="padding:12px 16px;border-bottom:1px solid #bbf7d0"><span style="color:#6b7280;font-size:13px">Alojamiento</span><br><strong>{{unit_name}}</strong></td></tr><tr><td style="padding:12px 16px;border-bottom:1px solid #bbf7d0"><span style="color:#6b7280;font-size:13px">Fecha de inicio</span><br><strong>{{fecha_inicio}}</strong></td></tr><tr><td style="padding:12px 16px;border-bottom:1px solid #bbf7d0"><span style="color:#6b7280;font-size:13px">Precio mensual</span><br><strong>{{precio_mes}} €/mes</strong></td></tr><tr><td style="padding:12px 16px"><span style="color:#6b7280;font-size:13px">Notas</span><br><span>{{notas}}</span></td></tr></table><p style="margin:24px 0 0;color:#374151;font-size:14px">Contacto: <a href="mailto:{{property_email}}" style="color:#1c4532">{{property_email}}</a> · {{property_phone}}</p></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f3f4f6;text-align:center"><p style="margin:0;color:#9ca3af;font-size:12px">{{property_name}} · {{property_address}}</p></td></tr></table></td></tr></table></body></html>`,
  },
  rental_activo: {
    asunto: 'Tu alquiler está activo — ¡Bienvenido/a a {{unit_name}}!',
    cuerpo_html: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,serif"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden"><tr><td style="background:#1c4532;padding:28px 32px"><p style="margin:0;color:#a7f3d0;font-size:12px;letter-spacing:2px;text-transform:uppercase">¡Bienvenido/a!</p><h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:normal">Tu alquiler está activo</h1></td></tr><tr><td style="padding:32px"><p style="margin:0 0 16px;color:#374151;font-size:15px">Hola <strong>{{guest_name}}</strong>,</p><p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">Tu contrato de alquiler para <strong>{{unit_name}}</strong> está ahora <strong>activo</strong>. ¡Esperamos que disfrutes de tu estancia!</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px"><tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb"><span style="color:#6b7280;font-size:13px">Alojamiento</span><br><strong>{{unit_name}}</strong></td></tr><tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb"><span style="color:#6b7280;font-size:13px">Inicio</span><br><strong>{{fecha_inicio}}</strong></td></tr><tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb"><span style="color:#6b7280;font-size:13px">Fin previsto</span><br><strong>{{fecha_fin}}</strong></td></tr><tr><td style="padding:12px 16px"><span style="color:#6b7280;font-size:13px">Precio mensual</span><br><strong>{{precio_mes}} €/mes</strong></td></tr></table><p style="margin:24px 0 0;color:#374151;font-size:14px">Cualquier incidencia: <a href="mailto:{{property_email}}" style="color:#1c4532">{{property_email}}</a> · {{property_phone}}</p></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f3f4f6;text-align:center"><p style="margin:0;color:#9ca3af;font-size:12px">{{property_name}} · {{property_address}}</p></td></tr></table></td></tr></table></body></html>`,
  },
  rental_cancelado: {
    asunto: 'Tu alquiler ha sido cancelado — {{unit_name}}',
    cuerpo_html: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,serif"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden"><tr><td style="background:#44403c;padding:28px 32px"><p style="margin:0;color:#d6d3d1;font-size:12px;letter-spacing:2px;text-transform:uppercase">Alquiler</p><h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:normal">Tu alquiler ha sido cancelado</h1></td></tr><tr><td style="padding:32px"><p style="margin:0 0 16px;color:#374151;font-size:15px">Hola <strong>{{guest_name}}</strong>,</p><p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">El alquiler de <strong>{{unit_name}}</strong> ha sido <strong>cancelado</strong>.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px"><tr><td style="padding:12px 16px;border-bottom:1px solid #fecaca"><span style="color:#6b7280;font-size:13px">Alojamiento</span><br><strong>{{unit_name}}</strong></td></tr><tr><td style="padding:12px 16px"><span style="color:#6b7280;font-size:13px">Motivo / Notas</span><br><span>{{notas}}</span></td></tr></table><p style="margin:24px 0 0;color:#374151;font-size:14px">Para consultas: <a href="mailto:{{property_email}}" style="color:#1c4532">{{property_email}}</a> · {{property_phone}}</p></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f3f4f6;text-align:center"><p style="margin:0;color:#9ca3af;font-size:12px">{{property_name}} · {{property_address}}</p></td></tr></table></td></tr></table></body></html>`,
  },
  rental_finalizado: {
    asunto: 'Tu estancia en {{unit_name}} ha finalizado — ¡Hasta pronto!',
    cuerpo_html: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,serif"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden"><tr><td style="background:#1c4532;padding:28px 32px"><p style="margin:0;color:#a7f3d0;font-size:12px;letter-spacing:2px;text-transform:uppercase">Fin de estancia</p><h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:normal">¡Hasta pronto!</h1></td></tr><tr><td style="padding:32px"><p style="margin:0 0 16px;color:#374151;font-size:15px">Hola <strong>{{guest_name}}</strong>,</p><p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">Tu estancia en <strong>{{unit_name}}</strong> ha finalizado. Ha sido un placer tenerte con nosotros.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px"><tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb"><span style="color:#6b7280;font-size:13px">Alojamiento</span><br><strong>{{unit_name}}</strong></td></tr><tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb"><span style="color:#6b7280;font-size:13px">Inicio</span><br><strong>{{fecha_inicio}}</strong></td></tr><tr><td style="padding:12px 16px"><span style="color:#6b7280;font-size:13px">Fin</span><br><strong>{{fecha_fin}}</strong></td></tr></table><p style="margin:24px 0 0;color:#374151;font-size:14px">{{notas}}</p><p style="margin:16px 0 0;color:#374151;font-size:14px">Consultas sobre fianza: <a href="mailto:{{property_email}}" style="color:#1c4532">{{property_email}}</a></p></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f3f4f6;text-align:center"><p style="margin:0;color:#9ca3af;font-size:12px">{{property_name}} · {{property_address}}</p></td></tr></table></td></tr></table></body></html>`,
  },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      template_key,
      to_email,
      to_name,
      reservation_id,
      property_id,
      extra_vars = {},
    } = await req.json()

    if (!template_key || !to_email) {
      return Response.json(
        { error: 'Faltan campos obligatorios: template_key y to_email' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── Resolver property_id ────────────────────────────────────────────────
    let resolvedPropertyId: string | null = property_id ?? null

    if (!resolvedPropertyId && reservation_id) {
      const { data: reservaPid, error: reservaPidError } = await supabase
        .from('reservas')
        .select('property_id')
        .eq('id', reservation_id)
        .single()

      if (reservaPidError) {
        console.error('send-email property_id query error:', reservaPidError)
      }

      if (reservaPid?.property_id) {
        resolvedPropertyId = reservaPid.property_id
      }
    }

    // ── Buscar plantilla ────────────────────────────────────────────────────
    let template: any = null

    if (resolvedPropertyId) {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('property_id', resolvedPropertyId)
        .eq('key', template_key)
        .eq('activa', true)
        .maybeSingle()

      if (error) {
        console.error('send-email template query error (scoped):', error)
      }

      template = data
    }

    // Fallback opcional si no aparece por property_id
    if (!template) {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('key', template_key)
        .eq('activa', true)
        .maybeSingle()

      if (error) {
        console.error('send-email template query error (fallback):', error)
      }

      template = data
    }

    // Fallback to hardcoded rental templates when no DB template exists
    if (!template && RENTAL_FALLBACK_TEMPLATES[template_key]) {
      template = { ...RENTAL_FALLBACK_TEMPLATES[template_key] }
    }

    if (!template) {
      return Response.json(
        { error: `Plantilla '${template_key}' no encontrada` },
        { status: 404, headers: corsHeaders }
      )
    }

    // ── Variables de reserva ────────────────────────────────────────────────
    let reservaVars: Record<string, string> = {}

    if (reservation_id) {
      const { data: reserva, error: reservaError } = await supabase
        .from('reservas')
        .select(`
          id,
          codigo,
          property_id,
          nombre_cliente,
          apellidos_cliente,
          email_cliente,
          telefono_cliente,
          fecha_entrada,
          fecha_salida,
          noches,
          num_huespedes,
          tarifa,
          importe_total,
          importe_senal,
          token_cliente,
          estado_pago
        `)
        .eq('id', reservation_id)
        .single()

      if (reservaError) {
        console.error('send-email reserva query error:', reservaError)
      }

      if (reservation_id && !reserva) {
        return Response.json(
          { error: `No se pudo cargar la reserva ${reservation_id}` },
          { status: 500, headers: corsHeaders }
        )
      }

      if (reserva) {
        const appUrl = Deno.env.get('APP_URL') ?? ''
        const total = num(reserva.importe_total)
        const senal = Math.max(num(reserva.importe_senal), 0)
        const pagado = senal
        const resto = Math.max(0, total - pagado)

        reservaVars = {
          reservation_id: str(reserva.id),
          reservation_code: buildReservationCode(reserva),
          reserva_codigo: buildReservationCode(reserva), // compatibilidad
          guest_name: `${str(reserva.nombre_cliente)} ${str(reserva.apellidos_cliente)}`.trim(),
          check_in: formatDateEs(str(reserva.fecha_entrada)),
          check_out: formatDateEs(str(reserva.fecha_salida)),
          total_amount: money(total),
          senal_amount: senal > 0 ? money(senal) : '',
          resto_amount: resto > 0 ? money(resto) : '',
          token_cliente: str(reserva.token_cliente),
          booking_url: reserva.token_cliente
            ? `${appUrl}/reserva/${reserva.token_cliente}`
            : '',
          reserva_url: reserva.token_cliente
            ? `${appUrl}/reserva/${reserva.token_cliente}`
            : '',
          nights: String(num(reserva.noches)),
          guests: String(num(reserva.num_huespedes)),
          rate_type:
            reserva.tarifa === 'FLEXIBLE'
              ? 'Flexible'
              : reserva.tarifa === 'NO_REEMBOLSABLE'
                ? 'No reembolsable'
                : str(reserva.tarifa),
        }

        if (!resolvedPropertyId && reserva.property_id) {
          resolvedPropertyId = reserva.property_id
        }
      }
    }

    // ── Unidades de la reserva ──────────────────────────────────────────────
    let unitSummary = ''

    if (reservation_id) {
      const { data: ruData, error: ruError } = await supabase
        .from('reserva_unidades')
        .select('unidad_id, unidades(nombre)')
        .eq('reserva_id', reservation_id)

      if (ruError) {
        console.error('send-email reserva_unidades query error:', ruError)
      }

      const unitNames = (ruData ?? [])
        .map((ru: any) => ru.unidades?.nombre ?? '')
        .filter(Boolean)
      unitSummary = unitNames.join(' + ')
    }

    // ── Remitente y datos de la propiedad ───────────────────────────────────
    // Fallbacks desde variables de entorno — sin hardcodeos de ninguna propiedad
    const envFromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? ''
    const envFromName  = Deno.env.get('RESEND_FROM_NAME')  ?? 'Alojamiento'

    let fromEmail = envFromEmail
    let fromName  = envFromName
    let propVars: Record<string, string> = {
      property_name:                envFromName,
      property_tagline:             '',
      property_address:             '',
      property_phone:               '',
      property_email:               envFromEmail,
      checkin_time:                 '16:00',
      checkout_time:                '11:00',
      cancellation_policy_summary:  '',
    }

    if (resolvedPropertyId) {
      const { data: prop, error: propError } = await supabase
        .from('properties')
        .select('resend_from_email, resend_from_name, email, nombre, descripcion, site_tagline, direccion, localidad, telefono, checkin_time, checkout_time, web')
        .eq('id', resolvedPropertyId)
        .single()

      if (propError) {
        console.error('send-email property query error:', propError)
      }

      if (prop) {
        fromEmail = str(prop.resend_from_email ?? prop.email, envFromEmail)
        fromName  = str(prop.resend_from_name  ?? prop.nombre, envFromName)

        propVars = {
          property_name:               str(prop.nombre, fromName),
          property_tagline:            str(prop.site_tagline ?? prop.descripcion),
          property_address:            [prop.direccion, prop.localidad].filter(Boolean).join(', '),
          property_phone:              str(prop.telefono),
          property_email:              str(prop.email ?? prop.resend_from_email, envFromEmail),
          checkin_time:                str(prop.checkin_time, '16:00'),
          checkout_time:               str(prop.checkout_time, '11:00'),
          cancellation_policy_summary: '',
        }

        // Recalcular booking_url usando APP_URL (env) o la web de la propiedad como fallback
        const rawPropWeb = str(prop.web)
        const propWebUrl = rawPropWeb
          ? rawPropWeb.startsWith('http') ? rawPropWeb : `https://${rawPropWeb}`
          : ''
        const envAppUrl = Deno.env.get('APP_URL') ?? ''
        const baseUrl = envAppUrl || propWebUrl
        if (baseUrl && reservaVars.token_cliente) {
          const fixedUrl = `${baseUrl}/reserva/${reservaVars.token_cliente}`
          reservaVars.booking_url = fixedUrl
          reservaVars.reserva_url = fixedUrl
        }
      }
    }

    if (!fromEmail) {
      console.error('send-email: fromEmail vacío — configura RESEND_FROM_EMAIL o properties.resend_from_email')
      return Response.json(
        { error: 'Remitente no configurado. Define resend_from_email en la propiedad o RESEND_FROM_EMAIL en los secrets.' },
        { status: 500, headers: corsHeaders }
      )
    }

    // ── Variables finales ───────────────────────────────────────────────────
    const bookingUrl = reservaVars.booking_url ?? ''
    const vars = {
      guest_name: str(to_name),
      ...reservaVars,
      ...propVars,
      unit_summary: unitSummary,
      amount_paid: reservaVars.senal_amount ?? '',
      amount_due: reservaVars.resto_amount ?? '',
      rate_name: reservaVars.rate_type ?? '',
      change_request_url: bookingUrl,
      cancel_request_url: bookingUrl,
      // Alias para plantilla checkin_link
      checkin_url: bookingUrl,
      // Bloque opcional de notas — vacío por defecto; se puede pasar vía extra_vars
      bloque_notas: '',
      ...extra_vars,
    }

    console.log('send-email template_key:', template_key)
    console.log('send-email reservation_id:', reservation_id ?? null)
    console.log('send-email resolvedPropertyId:', resolvedPropertyId ?? null)
    console.log('send-email vars keys:', Object.keys(vars))

    const subject = interpolate(template.asunto, vars)
    const html = interpolate(template.cuerpo_html, vars)

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      console.warn('RESEND_API_KEY no configurada — email omitido')
      return Response.json(
        { success: true, note: 'Email skipped: no API key' },
        { headers: corsHeaders }
      )
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to_email],
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return Response.json(
        { error: 'Email sending failed', detail: err },
        { status: 502, headers: corsHeaders }
      )
    }

    return Response.json({ success: true }, { headers: corsHeaders })
  } catch (err) {
    console.error('send-email error:', err)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
})
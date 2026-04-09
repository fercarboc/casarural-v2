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
        const appUrl = Deno.env.get('APP_URL') ?? 'https://www.casarurallarasilla.com'
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
    let fromEmail = 'noreply@casarurallarasilla.com'
    let fromName = 'La Rasilla'
    let propVars: Record<string, string> = {
      property_name: 'La Rasilla',
      property_tagline: '',
      property_address: '',
      property_phone: '',
      property_email: '',
      checkin_time: '16:00',
      checkout_time: '11:00',
      cancellation_policy_summary: '',
    }

    if (resolvedPropertyId) {
      const { data: prop, error: propError } = await supabase
        .from('properties')
        .select('resend_from_email, resend_from_name, email, nombre, descripcion, direccion, localidad, telefono, checkin_time, checkout_time, politica_cancelacion')
        .eq('id', resolvedPropertyId)
        .single()

      if (propError) {
        console.error('send-email property sender query error:', propError)
      }

      if (prop) {
        fromEmail = prop.resend_from_email ?? prop.email ?? fromEmail
        fromName = prop.resend_from_name ?? prop.nombre ?? fromName
        propVars = {
          property_name: str(prop.nombre, fromName),
          property_tagline: str(prop.descripcion),
          property_address: [prop.direccion, prop.localidad].filter(Boolean).join(', '),
          property_phone: str(prop.telefono),
          property_email: str(prop.email ?? prop.resend_from_email),
          checkin_time: str(prop.checkin_time, '16:00'),
          checkout_time: str(prop.checkout_time, '11:00'),
          cancellation_policy_summary: str(prop.politica_cancelacion),
        }
      }
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
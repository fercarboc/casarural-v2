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

      if (!reservaPidError && reservaPid?.property_id) {
        resolvedPropertyId = reservaPid.property_id
      }
    }

    // ── Buscar plantilla ────────────────────────────────────────────────────
    let template: any = null

    if (resolvedPropertyId) {
      const { data } = await supabase
        .from('email_templates')
        .select('*')
        .eq('property_id', resolvedPropertyId)
        .eq('key', template_key)
        .eq('activa', true)
        .maybeSingle()

      template = data
    }

    // Fallback opcional para compatibilidad
    if (!template) {
      const { data } = await supabase
        .from('email_templates')
        .select('*')
        .eq('key', template_key)
        .eq('activa', true)
        .maybeSingle()

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
          importe_pagado,
          token_cliente
        `)
        .eq('id', reservation_id)
        .single()

      if (!reservaError && reserva) {
        const appUrl = Deno.env.get('APP_URL') ?? 'https://www.casarurallarasilla.com'
        const total = num(reserva.importe_total)
        const senal = Math.max(num(reserva.importe_senal), 0)
        const pagado = Math.max(num(reserva.importe_pagado), senal)
        const resto = Math.max(0, total - pagado)

        reservaVars = {
          reservation_id: str(reserva.id),
          reservation_code: buildReservationCode(reserva),
          reserva_codigo: buildReservationCode(reserva), // compatibilidad con plantillas antiguas
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

        // Si no habíamos resuelto property_id antes, lo aprovechamos aquí
        if (!resolvedPropertyId && reserva.property_id) {
          resolvedPropertyId = reserva.property_id
        }
      }
    }

    // ── Remitente desde la propiedad ────────────────────────────────────────
    let fromEmail = 'noreply@casarurallarasilla.com'
    let fromName = 'La Rasilla'

    if (resolvedPropertyId) {
      const { data: prop } = await supabase
        .from('properties')
        .select('resend_from_email, resend_from_name, email, nombre')
        .eq('id', resolvedPropertyId)
        .single()

      if (prop) {
        fromEmail = prop.resend_from_email ?? prop.email ?? fromEmail
        fromName = prop.resend_from_name ?? prop.nombre ?? fromName
      }
    }

    // ── Montar variables finales ────────────────────────────────────────────
    // Prioridad:
    // 1. fallback por to_name
    // 2. vars de reserva
    // 3. extra_vars pisa lo anterior
    const vars = {
      guest_name: str(to_name),
      ...reservaVars,
      ...extra_vars,
    }

    const subject = interpolate(template.asunto, vars)
    const html = interpolate(template.cuerpo_html, vars)

    // ── Envío con Resend ────────────────────────────────────────────────────
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
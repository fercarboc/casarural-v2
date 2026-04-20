// supabase/functions/send-whatsapp/index.ts
// Envía mensajes de WhatsApp vía Twilio REST API (proveedor provisional).
// Diseñado para sustituirse por Meta Cloud API sin cambiar el contrato.
//
// POST { type, to, variables, reserva_id?, property_id? }
// Secrets requeridos: TWILIO_ACCOUNT_SID · TWILIO_AUTH_TOKEN · TWILIO_WHATSAPP_FROM

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export type MessageType =
  | 'booking_confirmed'
  | 'booking_modified'
  | 'booking_cancelled'
  | 'cleaning_planning'

export interface SendWhatsappPayload {
  type: MessageType
  to: string
  variables: Record<string, string>
  reserva_id?: string
  property_id?: string
}

export interface SendWhatsappResult {
  ok: boolean
  provider: 'twilio'
  sid?: string
  to?: string
  error?: string
}

// ── Anti-duplicado: campo de reservas por tipo ─────────────────────────────────

const SENT_AT_FIELD: Partial<Record<MessageType, string>> = {
  booking_confirmed: 'whatsapp_confirmed_sent_at',
  booking_modified:  'whatsapp_modified_sent_at',
  booking_cancelled: 'whatsapp_cancelled_sent_at',
}

// ── Construcción de mensajes de texto ─────────────────────────────────────────
// Texto libre: no requiere plantillas aprobadas en Meta.
// Para migrar a Meta en el futuro, cambiar solo esta función.

function buildMessageBody(type: MessageType, v: Record<string, string>): string {
  const g = (key: string) => v[key] ?? '—'

  switch (type) {
    case 'booking_confirmed':
      return [
        `Hola ${g('guest_name')}, tu reserva en ${g('property_name')} ha sido confirmada. ✅`,
        ``,
        `📅 Entrada: ${g('check_in')}`,
        `📅 Salida: ${g('check_out')}`,
        `💶 Importe: ${g('total')}`,
        `📋 Código de reserva: ${g('booking_code')}`,
      ].join('\n')

    case 'booking_modified':
      return [
        `Hola ${g('guest_name')}, tu reserva en ${g('property_name')} ha sido modificada. 🔄`,
        ``,
        `📅 Nueva entrada: ${g('check_in')}`,
        `📅 Nueva salida: ${g('check_out')}`,
        `📋 Código de reserva: ${g('booking_code')}`,
      ].join('\n')

    case 'booking_cancelled':
      return [
        `Hola ${g('guest_name')}, tu reserva en ${g('property_name')} ha sido cancelada. ❌`,
        ``,
        `📋 Código de reserva: ${g('booking_code')}`,
      ].join('\n')

    case 'cleaning_planning':
      return [
        `Planificación de limpieza para ${g('property_name')}. 🧹`,
        ``,
        `📅 Fecha: ${g('date')}`,
        `🏠 Unidad: ${g('unit_name')}`,
        `📝 Observaciones: ${g('notes')}`,
      ].join('\n')
  }
}

// ── Validación y normalización de teléfono → E.164 ────────────────────────────

function toE164(raw: string): string {
  const cleaned = raw.replace(/[\s\-().]/g, '')

  if (/^\+\d{7,15}$/.test(cleaned)) return cleaned
  if (/^00\d{7,15}$/.test(cleaned)) return '+' + cleaned.slice(2)
  if (/^\d{9}$/.test(cleaned)) return '+34' + cleaned  // España por defecto

  throw new Error(
    `Número de teléfono inválido: "${raw}". Usa formato E.164 (ej: +34612345678).`,
  )
}

// ── Llamada a Twilio REST API ──────────────────────────────────────────────────

async function sendViaTwilio(
  to: string,
  body: string,
  accountSid: string,
  authToken: string,
  from: string,
): Promise<{ sid: string }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

  const form = new URLSearchParams({
    From: from,                      // ej: whatsapp:+14155238886
    To: `whatsapp:${to}`,           // ej: whatsapp:+34612345678
    Body: body,
  })

  const credentials = btoa(`${accountSid}:${authToken}`)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  })

  const json = await res.json()

  if (!res.ok) {
    const msg = json?.message ?? json?.code ?? `HTTP ${res.status}`
    throw new Error(`Twilio error: ${msg}`)
  }

  return { sid: json.sid }
}

// ── Edge Function ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const respond = (body: SendWhatsappResult, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const payload = (await req.json()) as SendWhatsappPayload
    const { type, to, variables = {}, reserva_id, property_id } = payload

    // Validación básica
    if (!type || !to) throw new Error('"type" y "to" son obligatorios')

    const VALID_TYPES: MessageType[] = [
      'booking_confirmed', 'booking_modified', 'booking_cancelled', 'cleaning_planning',
    ]
    if (!VALID_TYPES.includes(type)) {
      throw new Error(`Tipo desconocido: "${type}". Válidos: ${VALID_TYPES.join(', ')}`)
    }

    // Normalizar teléfono destino
    const phone = toE164(to)

    // Cargar secrets de Twilio
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_WHATSAPP_FROM')

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Faltan secrets de Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verificar que WhatsApp está activado para la propiedad
    if (property_id) {
      const { data: prop } = await supabase
        .from('properties')
        .select('whatsapp_enabled')
        .eq('id', property_id)
        .single()

      if (prop && prop.whatsapp_enabled === false) {
        throw new Error('WhatsApp no está activado para esta propiedad')
      }
    }

    // Anti-duplicado: si ya se envió este tipo para esta reserva, saltar
    const sentAtField = SENT_AT_FIELD[type]
    if (reserva_id && sentAtField) {
      const { data: reserva } = await supabase
        .from('reservas')
        .select(sentAtField)
        .eq('id', reserva_id)
        .single()

      if (reserva?.[sentAtField]) {
        return respond({ ok: true, provider: 'twilio', sid: 'skipped', to: phone })
      }
    }

    // Construir y enviar mensaje
    const body = buildMessageBody(type, variables)
    const { sid } = await sendViaTwilio(phone, body, accountSid, authToken, fromNumber)

    console.log(`[send-whatsapp] ok type=${type} to=${phone} sid=${sid}`)

    // Marcar como enviado
    if (reserva_id && sentAtField) {
      await supabase
        .from('reservas')
        .update({ [sentAtField]: new Date().toISOString() })
        .eq('id', reserva_id)
    }

    return respond({ ok: true, provider: 'twilio', sid, to: `whatsapp:${phone}` })

  } catch (err: any) {
    console.error('[send-whatsapp] error:', err.message)
    return respond({ ok: false, provider: 'twilio', error: err.message }, 400)
  }
})

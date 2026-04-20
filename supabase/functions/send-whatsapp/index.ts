// supabase/functions/send-whatsapp/index.ts
// Envía mensajes de WhatsApp vía Twilio REST API (proveedor provisional).
// Diseñado para sustituirse por Meta Cloud API sin cambiar el contrato.
//
// POST { type, to, variables, reserva_id?, property_id? }
// Secrets requeridos:
// - TWILIO_ACCOUNT_SID
// - TWILIO_AUTH_TOKEN
// - TWILIO_WHATSAPP_FROM

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type MessageType =
  | 'booking_confirmed'
  | 'booking_modified'
  | 'booking_cancelled'
  | 'cleaning_planning'

interface SendWhatsappPayload {
  type: MessageType
  to: string
  variables?: Record<string, string | number | null | undefined>
  reserva_id?: string
  property_id?: string
  force?: boolean
}

interface SendWhatsappResult {
  ok: boolean
  provider: 'twilio'
  sid?: string
  to?: string
  error?: string
}

const VALID_TYPES: MessageType[] = [
  'booking_confirmed',
  'booking_modified',
  'booking_cancelled',
  'cleaning_planning',
]

const SENT_AT_FIELD: Partial<Record<MessageType, string>> = {
  booking_confirmed: 'whatsapp_confirmed_sent_at',
  booking_modified: 'whatsapp_modified_sent_at',
  booking_cancelled: 'whatsapp_cancelled_sent_at',
}

function jsonResponse(body: SendWhatsappResult, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim()
  if (!value) {
    throw new Error(`Falta secret requerido: ${name}`)
  }
  return value
}

function getVar(
  variables: Record<string, string | number | null | undefined>,
  key: string,
): string {
  const value = variables[key]
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

function buildMessageBody(
  type: MessageType,
  variables: Record<string, string | number | null | undefined>,
): string {
  const g = (key: string) => getVar(variables, key)

  switch (type) {
    case 'booking_confirmed':
      return [
        `Hola ${g('guest_name')}, tu reserva en ${g('property_name')} ha sido confirmada. ✅`,
        '',
        `📅 Entrada: ${g('check_in')}`,
        `📅 Salida: ${g('check_out')}`,
        `💶 Importe: ${g('total')}`,
        `📋 Código de reserva: ${g('booking_code')}`,
      ].join('\n')

    case 'booking_modified':
      return [
        `Hola ${g('guest_name')}, tu reserva en ${g('property_name')} ha sido modificada. 🔄`,
        '',
        `📅 Nueva entrada: ${g('check_in')}`,
        `📅 Nueva salida: ${g('check_out')}`,
        `📋 Código de reserva: ${g('booking_code')}`,
      ].join('\n')

    case 'booking_cancelled':
      return [
        `Hola ${g('guest_name')}, tu reserva en ${g('property_name')} ha sido cancelada. ❌`,
        '',
        `📋 Código de reserva: ${g('booking_code')}`,
      ].join('\n')

    case 'cleaning_planning':
      return [
        `Planificación de limpieza para ${g('property_name')}. 🧹`,
        '',
        `📅 Fecha: ${g('date')}`,
        `🏠 Unidad: ${g('unit_name')}`,
        `📝 Observaciones: ${g('notes')}`,
      ].join('\n')
  }
}

function toE164(raw: string): string {
  const cleaned = raw.replace(/[\s\-().]/g, '')

  if (/^\+\d{7,15}$/.test(cleaned)) return cleaned
  if (/^00\d{7,15}$/.test(cleaned)) return `+${cleaned.slice(2)}`
  if (/^\d{9}$/.test(cleaned)) return `+34${cleaned}`

  throw new Error(
    `Número de teléfono inválido: "${raw}". Usa formato E.164, por ejemplo +34612345678.`,
  )
}

function normalizeWhatsAppAddress(input: string): string {
  const cleaned = input.trim()
  if (cleaned.startsWith('whatsapp:')) return cleaned
  if (cleaned.startsWith('+')) return `whatsapp:${cleaned}`
  throw new Error(`Número inválido para WhatsApp: "${input}"`)
}

function validateWhatsAppFrom(fromNumber: string): void {
  if (!/^whatsapp:\+\d{7,15}$/.test(fromNumber)) {
    throw new Error(
      `TWILIO_WHATSAPP_FROM inválido: "${fromNumber}". Debe tener formato whatsapp:+14155238886`,
    )
  }
}

async function sendViaTwilio(
  to: string,
  body: string,
  accountSid: string,
  authToken: string,
  fromNumber: string,
): Promise<{ sid: string }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

  const form = new URLSearchParams({
    From: fromNumber,
    To: to,
    Body: body,
  })

  const credentials = btoa(`${accountSid}:${authToken}`)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
      signal: controller.signal,
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      console.error('[send-whatsapp] Twilio error response:', JSON.stringify(json))
      const message = json?.message ?? 'Error desconocido'
      const code = json?.code ?? 'unknown'
      throw new Error(`Twilio error ${res.status} code=${code}: ${message}`)
    }

    if (!json?.sid) {
      throw new Error('Twilio no devolvió sid en la respuesta')
    }

    return { sid: json.sid as string }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Timeout al contactar con Twilio')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse(
        {
          ok: false,
          provider: 'twilio',
          error: 'Método no permitido',
        },
        405,
      )
    }

    const payload = (await req.json()) as SendWhatsappPayload
    const {
      type,
      to,
      variables = {},
      reserva_id,
      property_id,
      force = false,
    } = payload

    if (!type || !to) {
      throw new Error('"type" y "to" son obligatorios')
    }

    if (!VALID_TYPES.includes(type)) {
      throw new Error(`Tipo desconocido: "${type}". Válidos: ${VALID_TYPES.join(', ')}`)
    }

    const accountSid = getRequiredEnv('TWILIO_ACCOUNT_SID')
    const authToken = getRequiredEnv('TWILIO_AUTH_TOKEN')
    const fromNumber = getRequiredEnv('TWILIO_WHATSAPP_FROM')

    validateWhatsAppFrom(fromNumber)

    const e164To = toE164(to)
    const normalizedTo = normalizeWhatsAppAddress(e164To)
    const body = buildMessageBody(type, variables)

    console.log('[send-whatsapp] DEBUG', {
      type,
      from: fromNumber,
      to: normalizedTo,
      reserva_id: reserva_id ?? null,
      property_id: property_id ?? null,
      force,
    })

    const supabase = createClient(
      getRequiredEnv('SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    )

    if (property_id) {
      const { data: prop, error: propError } = await supabase
        .from('properties')
        .select('whatsapp_enabled')
        .eq('id', property_id)
        .single()

      if (propError) {
        console.error('[send-whatsapp] properties lookup error:', propError.message)
      }

      if (prop && prop.whatsapp_enabled === false) {
        throw new Error('WhatsApp no está activado para esta propiedad')
      }
    }

    const sentAtField = SENT_AT_FIELD[type]

    if (!force && reserva_id && sentAtField) {
      const { data: reserva, error: reservaError } = await supabase
        .from('reservas')
        .select(sentAtField)
        .eq('id', reserva_id)
        .single()

      if (reservaError) {
        console.error('[send-whatsapp] reservas lookup error:', reservaError.message)
      }

      if (reserva && (reserva as Record<string, unknown>)[sentAtField]) {
        console.log(
          `[send-whatsapp] SKIPPED already sent type=${type} reserva_id=${reserva_id}`,
        )
        return jsonResponse({
          ok: true,
          provider: 'twilio',
          sid: 'skipped',
          to: normalizedTo,
        })
      }
    }

    const { sid } = await sendViaTwilio(
      normalizedTo,
      body,
      accountSid,
      authToken,
      fromNumber,
    )

    console.log(`[send-whatsapp] SUCCESS sid=${sid} to=${normalizedTo}`)

    if (reserva_id && sentAtField) {
      const { error: updateError } = await supabase
        .from('reservas')
        .update({ [sentAtField]: new Date().toISOString() })
        .eq('id', reserva_id)

      if (updateError) {
        console.error(
          '[send-whatsapp] sent but failed to persist sent_at:',
          updateError.message,
        )
      }
    }

    return jsonResponse({
      ok: true,
      provider: 'twilio',
      sid,
      to: normalizedTo,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[send-whatsapp] ERROR:', message)

    return jsonResponse(
      {
        ok: false,
        provider: 'twilio',
        error: message,
      },
      400,
    )
  }
})
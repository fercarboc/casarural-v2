// supabase/functions/send-whatsapp/index.ts
// Sends WhatsApp template messages via Meta Cloud API.
// POST { event, reserva_id?, property_id, recipient_phone, recipient_name?, data }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Tipos ──────────────────────────────────────────────────────────────────────

type WaEvent =
  | 'booking_confirmed'
  | 'booking_modified'
  | 'booking_cancelled'
  | 'cleaning_planning'

// ── Plantillas registradas en Meta Business ────────────────────────────────────
// Cada entrada define el nombre de plantilla aprobada en Meta y el orden de
// variables que se pasan como parámetros posicionales {{1}}, {{2}}, etc.
//
// IMPORTANTE: los nombres deben coincidir exactamente con los aprobados en
// Meta Business Manager → WhatsApp → Plantillas de mensajes.

const TEMPLATES: Record<WaEvent, { name: string; lang: string; params: string[] }> = {
  booking_confirmed: {
    name: 'booking_confirmed',
    lang: 'es',
    params: [
      'nombre_huesped',    // {{1}} Hola {{1}}, tu reserva…
      'alojamiento',       // {{2}} en {{2}} ha quedado confirmada
      'fecha_entrada',     // {{3}} Entrada: {{3}}
      'fecha_salida',      // {{4}} Salida: {{4}}
      'noches',            // {{5}} Noches: {{5}}
      'num_huespedes',     // {{6}} Huéspedes: {{6}}
      'importe_total',     // {{7}} Importe total: {{7}}
      'importe_pagado',    // {{8}} Pagado: {{8}}
      'telefono_alojamiento', // {{9}} Contacto: {{9}}
      'url_reserva',       // {{10}} Detalle: {{10}}
    ],
  },
  booking_modified: {
    name: 'booking_modified',
    lang: 'es',
    params: [
      'nombre_huesped',    // {{1}}
      'alojamiento',       // {{2}}
      'fecha_entrada',     // {{3}}
      'fecha_salida',      // {{4}}
      'noches',            // {{5}}
      'num_huespedes',     // {{6}}
      'importe_total',     // {{7}}
      'url_reserva',       // {{8}}
    ],
  },
  booking_cancelled: {
    name: 'booking_cancelled',
    lang: 'es',
    params: [
      'nombre_huesped',    // {{1}}
      'alojamiento',       // {{2}}
      'fecha_entrada',     // {{3}}
      'fecha_salida',      // {{4}}
      'codigo_reserva',    // {{5}}
      'info_reembolso',    // {{6}}
      'telefono_alojamiento', // {{7}}
    ],
  },
  cleaning_planning: {
    name: 'cleaning_planning',
    lang: 'es',
    params: [
      'nombre_limpiadora', // {{1}}
      'alojamiento',       // {{2}}
      'fecha_inicio',      // {{3}}
      'fecha_fin',         // {{4}}
      'listado',           // {{5}} bloque de movimientos formateado
      'telefono_contacto', // {{6}}
    ],
  },
}

// Campo de reservas donde se guarda el timestamp anti-duplicado
const SENT_AT_FIELD: Partial<Record<WaEvent, string>> = {
  booking_confirmed: 'whatsapp_confirmed_sent_at',
  booking_modified:  'whatsapp_modified_sent_at',
  booking_cancelled: 'whatsapp_cancelled_sent_at',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '')
  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.startsWith('00')) return '+' + cleaned.slice(2)
  // Assumes Spain (+34) if no prefix and 9 digits
  if (cleaned.length === 9) return '+34' + cleaned
  return '+' + cleaned
}

// ── Edge Function ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const {
      event,
      reserva_id,
      property_id,
      recipient_phone,
      recipient_name,
      data = {},
    }: {
      event: WaEvent
      reserva_id?: string
      property_id: string
      recipient_phone: string
      recipient_name?: string
      data: Record<string, string>
    } = await req.json()

    if (!event || !property_id || !recipient_phone) {
      throw new Error('event, property_id y recipient_phone son obligatorios')
    }

    const template = TEMPLATES[event]
    if (!template) throw new Error(`Evento desconocido: ${event}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Cargar config WhatsApp de la propiedad
    const { data: prop, error: propErr } = await supabase
      .from('properties')
      .select('nombre, telefono, whatsapp_enabled, whatsapp_phone_number_id, whatsapp_access_token')
      .eq('id', property_id)
      .single()

    if (propErr || !prop) throw new Error('Propiedad no encontrada')
    if (!prop.whatsapp_enabled) throw new Error('WhatsApp no está activado para esta propiedad')
    if (!prop.whatsapp_phone_number_id || !prop.whatsapp_access_token) {
      throw new Error('Faltan credenciales de WhatsApp (phone_number_id o access_token)')
    }

    // 2. Anti-duplicado: si ya se envió este evento para esta reserva, saltar
    const sentAtField = SENT_AT_FIELD[event]
    if (reserva_id && sentAtField) {
      const { data: reserva } = await supabase
        .from('reservas')
        .select(sentAtField)
        .eq('id', reserva_id)
        .single()

      if (reserva?.[sentAtField]) {
        return new Response(
          JSON.stringify({ ok: true, skipped: true, reason: 'already_sent' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }

    // 3. Construir parámetros posicionales para la plantilla
    const enrichedData: Record<string, string> = {
      alojamiento: prop.nombre ?? '—',
      telefono_alojamiento: prop.telefono ?? '—',
      nombre_huesped: recipient_name ?? '—',
      ...data,
    }

    const parameters = template.params.map((key) => ({
      type: 'text',
      text: enrichedData[key] ?? '—',
    }))

    // 4. Llamar a Meta WhatsApp Cloud API
    const phone = normalizePhone(recipient_phone)
    const metaUrl = `https://graph.facebook.com/v19.0/${prop.whatsapp_phone_number_id}/messages`

    const metaRes = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${prop.whatsapp_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: template.name,
          language: { code: template.lang },
          components: [
            {
              type: 'body',
              parameters,
            },
          ],
        },
      }),
    })

    const metaBody = await metaRes.json()

    if (!metaRes.ok) {
      throw new Error(
        `Meta API error ${metaRes.status}: ${JSON.stringify(metaBody?.error ?? metaBody)}`,
      )
    }

    const waMessageId = metaBody?.messages?.[0]?.id ?? null

    // 5. Marcar como enviado en reservas (anti-duplicado)
    if (reserva_id && sentAtField) {
      await supabase
        .from('reservas')
        .update({ [sentAtField]: new Date().toISOString() })
        .eq('id', reserva_id)
    }

    return new Response(
      JSON.stringify({ ok: true, wa_message_id: waMessageId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    console.error('[send-whatsapp]', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

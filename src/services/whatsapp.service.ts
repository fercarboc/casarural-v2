// src/services/whatsapp.service.ts
// Capa de servicio frontend para mensajería WhatsApp.
// Nunca llama a Twilio directamente — delega siempre en la Edge Function.
// Para cambiar de proveedor (Twilio → Meta), solo hay que tocar el EF.

import { supabase } from '../integrations/supabase/client'

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type WaMessageType =
  | 'booking_confirmed'
  | 'booking_modified'
  | 'booking_cancelled'
  | 'cleaning_planning'

export interface WaResult {
  ok: boolean
  provider: 'twilio'
  sid?: string
  to?: string
  skipped?: boolean
  error?: string
}

interface SendOptions {
  type: WaMessageType
  to: string
  variables: Record<string, string>
  reserva_id?: string
  property_id?: string
}

// ── Función central ────────────────────────────────────────────────────────────

async function send(opts: SendOptions): Promise<WaResult> {
  const { data, error } = await supabase.functions.invoke('send-whatsapp', {
    body: opts,
  })

  if (error) {
    return { ok: false, provider: 'twilio', error: error.message }
  }

  return data as WaResult
}

// ── Helpers para cada tipo de mensaje ─────────────────────────────────────────

function fmtMoney(value: number): string {
  return `${value.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`
}

// ── API pública del servicio ───────────────────────────────────────────────────

export const whatsappService = {
  sendBookingConfirmed(params: {
    to: string
    guest_name: string
    property_name: string
    check_in: string
    check_out: string
    total: number
    booking_code: string
    reserva_id?: string
    property_id?: string
  }): Promise<WaResult> {
    return send({
      type: 'booking_confirmed',
      to: params.to,
      variables: {
        guest_name:    params.guest_name,
        property_name: params.property_name,
        check_in:      params.check_in,
        check_out:     params.check_out,
        total:         fmtMoney(params.total),
        booking_code:  params.booking_code,
      },
      reserva_id:  params.reserva_id,
      property_id: params.property_id,
    })
  },

  sendBookingModified(params: {
    to: string
    guest_name: string
    property_name: string
    check_in: string
    check_out: string
    booking_code: string
    reserva_id?: string
    property_id?: string
  }): Promise<WaResult> {
    return send({
      type: 'booking_modified',
      to: params.to,
      variables: {
        guest_name:    params.guest_name,
        property_name: params.property_name,
        check_in:      params.check_in,
        check_out:     params.check_out,
        booking_code:  params.booking_code,
      },
      reserva_id:  params.reserva_id,
      property_id: params.property_id,
    })
  },

  sendBookingCancelled(params: {
    to: string
    guest_name: string
    property_name: string
    booking_code: string
    reserva_id?: string
    property_id?: string
  }): Promise<WaResult> {
    return send({
      type: 'booking_cancelled',
      to: params.to,
      variables: {
        guest_name:    params.guest_name,
        property_name: params.property_name,
        booking_code:  params.booking_code,
      },
      reserva_id:  params.reserva_id,
      property_id: params.property_id,
    })
  },

  sendCleaningPlanning(params: {
    to: string
    property_name: string
    date: string
    unit_name: string
    notes: string
    property_id?: string
  }): Promise<WaResult> {
    return send({
      type: 'cleaning_planning',
      to: params.to,
      variables: {
        property_name: params.property_name,
        date:          params.date,
        unit_name:     params.unit_name,
        notes:         params.notes,
      },
      property_id: params.property_id,
    })
  },
}

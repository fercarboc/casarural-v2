// supabase/functions/update-rental-status/index.ts
//
// Dos modos de operación según el campo `action`:
//
//  A) Cambio de estado (action omitido o 'CHANGE_ESTADO'):
//     POST { rental_id, new_estado, notas?, message_to_tenant? }
//     → actualiza rentals.estado, envía email+WhatsApp, loguea en rental_messages
//
//  B) Mensaje libre al inquilino (action = 'SEND_MESSAGE'):
//     POST { rental_id, action:'SEND_MESSAGE', subject, body, send_whatsapp? }
//     → envía email (y WA opcional), loguea en rental_messages
//
//  C) Solicitar documentación (action = 'REQUEST_DOCS'):
//     POST { rental_id, action:'REQUEST_DOCS', doc_types:string[], message? }
//     → envía email con lista de docs pendientes, loguea en rental_messages

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type RentalEstado = 'SOLICITUD' | 'EN_REVISION' | 'APROBADO' | 'ACTIVO' | 'RENOVADO' | 'FINALIZADO' | 'CANCELADO'

const NEXT_STATES: Record<RentalEstado, RentalEstado[]> = {
  SOLICITUD:   ['EN_REVISION', 'CANCELADO'],
  EN_REVISION: ['APROBADO', 'CANCELADO'],
  APROBADO:    ['ACTIVO', 'CANCELADO'],
  ACTIVO:      ['RENOVADO', 'FINALIZADO', 'CANCELADO'],
  RENOVADO:    ['ACTIVO', 'FINALIZADO'],
  FINALIZADO:  [],
  CANCELADO:   [],
}

const EMAIL_TEMPLATE: Partial<Record<RentalEstado, string>> = {
  EN_REVISION: 'rental_en_revision',
  APROBADO:    'rental_aprobado',
  ACTIVO:      'rental_activo',
  CANCELADO:   'rental_cancelado',
  FINALIZADO:  'rental_finalizado',
}

const WA_TEMPLATE: Partial<Record<RentalEstado, string>> = {
  EN_REVISION: 'rental_en_revision',
  APROBADO:    'rental_aprobado',
  ACTIVO:      'rental_activo',
  CANCELADO:   'rental_cancelado',
}

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const payload = await req.json()
    const { rental_id, action = 'CHANGE_ESTADO' } = payload

    if (!rental_id) throw new Error('rental_id es requerido')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Cargar datos completos del rental
    const { data: rental, error: rErr } = await supabase
      .from('rentals')
      .select(`*, unidades(nombre), properties(id, nombre, email, telefono, direccion)`)
      .eq('id', rental_id)
      .single()

    if (rErr || !rental) throw new Error('Contrato no encontrado')

    const property_id: string = rental.properties?.id ?? rental.property_id
    const unit_name: string   = rental.unidades?.nombre ?? '—'
    const property_name       = rental.properties?.nombre ?? ''
    const property_email      = rental.properties?.email ?? ''
    const property_phone      = rental.properties?.telefono ?? ''
    const property_address    = rental.properties?.direccion ?? ''

    // ── A: CHANGE_ESTADO ────────────────────────────────────────────────────────
    if (action === 'CHANGE_ESTADO') {
      const { new_estado, notas, message_to_tenant } = payload

      if (!new_estado) throw new Error('new_estado es requerido')

      const currentEstado = rental.estado as RentalEstado
      const allowed = NEXT_STATES[currentEstado] ?? []
      if (!allowed.includes(new_estado as RentalEstado)) {
        throw new Error(`Transición no permitida: ${currentEstado} → ${new_estado}`)
      }

      const updatePayload: Record<string, any> = {
        estado:     new_estado,
        updated_at: new Date().toISOString(),
      }
      if (notas !== undefined) updatePayload.notas = notas

      const { error: uErr } = await supabase.from('rentals').update(updatePayload).eq('id', rental_id)
      if (uErr) throw uErr

      const templateKey = EMAIL_TEMPLATE[new_estado as RentalEstado]
      const precio_mes = Number(rental.precio_mensual ?? 0)
        .toLocaleString('es-ES', { minimumFractionDigits: 2 })

      const extraVars = {
        guest_name:       rental.cliente_nombre,
        unit_name,
        fecha_inicio:     rental.fecha_inicio ?? '—',
        fecha_fin:        rental.fecha_fin ?? '—',
        precio_mes,
        notas:            message_to_tenant ?? notas ?? rental.notas ?? '',
        property_name,
        property_email,
        property_phone,
        property_address,
      }

      // Email al inquilino
      if (templateKey) {
        await supabase.functions.invoke('send-email', {
          body: {
            template_key: templateKey,
            to_email:     rental.cliente_email,
            to_name:      rental.cliente_nombre,
            property_id,
            extra_vars:   extraVars,
          },
        })
      }

      // WhatsApp al inquilino
      const waTemplate = WA_TEMPLATE[new_estado as RentalEstado]
      if (waTemplate && rental.cliente_telefono) {
        await supabase.functions.invoke('send-whatsapp', {
          body: {
            type:        waTemplate,
            to:          rental.cliente_telefono,
            variables:   {
              guest_name:    rental.cliente_nombre,
              property_name,
              unit_name,
              check_in:      rental.fecha_inicio ?? '—',
              check_out:     rental.fecha_fin    ?? '—',
              booking_code:  rental.numero_contrato ?? rental.id.slice(0, 8).toUpperCase(),
              total:         precio_mes,
            },
            property_id,
          },
        }).catch(() => {/* WA no crítico */})
      }

      // Log en rental_messages
      const msgBody = message_to_tenant
        ?? `Estado actualizado a: ${new_estado}${notas ? ` — ${notas}` : ''}`

      await supabase.from('rental_messages').insert({
        property_id,
        rental_id,
        direction: 'OUTBOUND',
        channel:   templateKey ? 'EMAIL' : 'NOTA',
        subject:   templateKey ? `Actualización de tu solicitud — ${unit_name}` : 'Cambio de estado',
        body:      msgBody,
        sent_by:   'admin',
      })

      return respond({ ok: true, estado: new_estado })
    }

    // ── B: SEND_MESSAGE ──────────────────────────────────────────────────────────
    if (action === 'SEND_MESSAGE') {
      const { subject, body: msgBody, send_whatsapp = false } = payload
      if (!msgBody) throw new Error('body es requerido')

      // Email libre al inquilino
      await supabase.functions.invoke('send-email', {
        body: {
          template_key: 'rental_mensaje_admin',
          to_email:     rental.cliente_email,
          to_name:      rental.cliente_nombre,
          property_id,
          extra_vars: {
            guest_name:       rental.cliente_nombre,
            unit_name,
            subject:          subject ?? 'Mensaje sobre tu solicitud',
            message_body:     msgBody,
            property_name,
            property_email,
            property_phone,
            property_address,
          },
        },
      })

      // WhatsApp opcional
      if (send_whatsapp && rental.cliente_telefono) {
        await supabase.functions.invoke('send-whatsapp', {
          body: {
            type: 'booking_modified',
            to:   rental.cliente_telefono,
            variables: {
              guest_name:    rental.cliente_nombre,
              property_name,
              unit_name,
              check_in:      rental.fecha_inicio ?? '—',
              check_out:     rental.fecha_fin    ?? '—',
              booking_code:  rental.numero_contrato ?? rental.id.slice(0, 8).toUpperCase(),
            },
            property_id,
          },
        }).catch(() => {})
      }

      await supabase.from('rental_messages').insert({
        property_id,
        rental_id,
        direction: 'OUTBOUND',
        channel:   'EMAIL',
        subject:   subject ?? 'Mensaje sobre tu solicitud',
        body:      msgBody,
        sent_by:   'admin',
      })

      return respond({ ok: true })
    }

    // ── C: REQUEST_DOCS ──────────────────────────────────────────────────────────
    if (action === 'REQUEST_DOCS') {
      const { doc_types = [], message: customMsg } = payload
      if (doc_types.length === 0) throw new Error('doc_types no puede estar vacío')

      const docList = (doc_types as string[])
        .map((t: string) => `• ${t}`)
        .join('\n')

      const msgBody = customMsg
        ? `${customMsg}\n\nDocumentación solicitada:\n${docList}`
        : `Para continuar con tu solicitud necesitamos la siguiente documentación:\n\n${docList}\n\nPor favor, envíala a ${property_email} o súbela directamente en el portal.`

      await supabase.functions.invoke('send-email', {
        body: {
          template_key: 'rental_solicitar_docs',
          to_email:     rental.cliente_email,
          to_name:      rental.cliente_nombre,
          property_id,
          extra_vars: {
            guest_name:       rental.cliente_nombre,
            unit_name,
            doc_list_html:    (doc_types as string[]).map((t: string) => `<li>${t}</li>`).join(''),
            message_extra:    customMsg ?? '',
            property_name,
            property_email,
            property_phone,
            property_address,
          },
        },
      })

      // WhatsApp resumen
      if (rental.cliente_telefono) {
        await supabase.functions.invoke('send-whatsapp', {
          body: {
            type: 'booking_modified',
            to:   rental.cliente_telefono,
            variables: {
              guest_name:    rental.cliente_nombre,
              property_name,
              unit_name,
              check_in:      rental.fecha_inicio ?? '—',
              check_out:     rental.fecha_fin    ?? '—',
              booking_code:  rental.numero_contrato ?? rental.id.slice(0, 8).toUpperCase(),
            },
            property_id,
          },
        }).catch(() => {})
      }

      await supabase.from('rental_messages').insert({
        property_id,
        rental_id,
        direction: 'OUTBOUND',
        channel:   'EMAIL',
        subject:   `Documentación pendiente — ${unit_name}`,
        body:      msgBody,
        sent_by:   'admin',
      })

      return respond({ ok: true })
    }

    throw new Error(`Acción desconocida: ${action}`)

  } catch (err: any) {
    console.error('[update-rental-status]', err.message)
    return respond({ error: err.message }, 400)
  }
})

// supabase/functions/update-rental-status/index.ts
// Changes rental estado and sends the corresponding notification email.
// POST { rental_id, new_estado, notas? }  — requires authenticated admin JWT

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
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
  APROBADO:   'rental_aprobado',
  ACTIVO:     'rental_activo',
  CANCELADO:  'rental_cancelado',
  FINALIZADO: 'rental_finalizado',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { rental_id, new_estado, notas } = await req.json()
    if (!rental_id || !new_estado) throw new Error('rental_id y new_estado son requeridos')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: rental, error: rErr } = await supabase
      .from('rentals')
      .select(`
        *,
        unidades(nombre),
        properties(id, nombre, email_contacto, telefono, direccion, localidad)
      `)
      .eq('id', rental_id)
      .single()

    if (rErr || !rental) throw new Error('Contrato no encontrado')

    const currentEstado = rental.estado as RentalEstado
    const allowed = NEXT_STATES[currentEstado] ?? []
    if (!allowed.includes(new_estado as RentalEstado)) {
      throw new Error(`Transición no permitida: ${currentEstado} → ${new_estado}`)
    }

    const updatePayload: Record<string, any> = { estado: new_estado }
    if (notas !== undefined) updatePayload.notas = notas

    const { error: uErr } = await supabase
      .from('rentals')
      .update(updatePayload)
      .eq('id', rental_id)

    if (uErr) throw uErr

    const templateKey = EMAIL_TEMPLATE[new_estado as RentalEstado]
    if (templateKey) {
      const unit_name = (rental as any).unidades?.nombre ?? '—'
      const property_id = (rental as any).properties?.id ?? null
      const precio = Number(rental.precio_mensual ?? 0)
      const precio_mes = precio > 0
        ? precio.toLocaleString('es-ES', { minimumFractionDigits: 2 })
        : '—'

      await supabase.functions.invoke('send-email', {
        body: {
          template_key: templateKey,
          to_email: rental.cliente_email,
          to_name: rental.cliente_nombre,
          property_id,
          extra_vars: {
            unit_name,
            fecha_inicio: rental.fecha_inicio ?? '—',
            fecha_fin: rental.fecha_fin ?? '—',
            precio_mes,
            notas: notas ?? rental.notas ?? '',
          },
        },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

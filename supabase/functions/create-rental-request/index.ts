// supabase/functions/create-rental-request/index.ts
// Called by SolicitudPage (public) or admin; sends notification emails for a new rental request.
// POST { rental_id }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { rental_id } = await req.json()
    if (!rental_id) throw new Error('rental_id requerido')

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

    const property = (rental as any).properties
    const unit_name = (rental as any).unidades?.nombre ?? '—'
    const property_id = property?.id ?? null
    const adminUrl = `${Deno.env.get('APP_URL') ?? ''}/admin/rentals/${rental_id}`

    // Admin notification
    if (property?.email_contacto) {
      await supabase.functions.invoke('send-email', {
        body: {
          template_key: 'rental_nueva_solicitud',
          to_email: property.email_contacto,
          to_name: property.nombre ?? 'Administrador',
          property_id,
          extra_vars: {
            tenant_email: rental.cliente_email ?? '—',
            tenant_phone: rental.cliente_telefono ?? '—',
            unit_name,
            fecha_inicio: rental.fecha_inicio ?? '—',
            notas: rental.notas ?? '',
            admin_url: adminUrl,
          },
        },
      })
    }

    // Tenant acknowledgement
    await supabase.functions.invoke('send-email', {
      body: {
        template_key: 'rental_solicitud_recibida',
        to_email: rental.cliente_email,
        to_name: rental.cliente_nombre,
        property_id,
        extra_vars: {
          unit_name,
          fecha_inicio: rental.fecha_inicio ?? '—',
        },
      },
    })

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

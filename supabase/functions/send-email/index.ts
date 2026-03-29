// supabase/functions/send-email/index.ts  [v2]
// POST { template_key, to_email, to_name, reservation_id?, property_id?, extra_vars? }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { template_key, to_email, to_name, reservation_id, property_id, extra_vars = {} } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Obtener plantilla (buscar por property_id si se proporciona, fallback sin filtro)
    let templateQuery = supabase
      .from('email_templates')
      .select('*')
      .eq('key', template_key)
      .eq('activa', true);

    if (property_id) {
      templateQuery = templateQuery.eq('property_id', property_id);
    }

    const { data: template } = await templateQuery.maybeSingle();

    if (!template) {
      return Response.json(
        { error: `Plantilla '${template_key}' no encontrada` },
        { status: 404, headers: corsHeaders }
      );
    }

    // Variables de la reserva (columnas v2)
    let reservaVars: Record<string, string> = {};
    if (reservation_id) {
      const { data: reserva } = await supabase
        .from('reservas')
        .select('*, reserva_unidades(unidad_id, num_huespedes, importe)')
        .eq('id', reservation_id)
        .single();

      if (reserva) {
        const optsDate: Intl.DateTimeFormatOptions = {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        };
        const appUrl = Deno.env.get('APP_URL') ?? 'https://localhost:5173';

        reservaVars = {
          guest_name:     `${reserva.nombre_cliente} ${reserva.apellidos_cliente ?? ''}`.trim(),
          check_in:       new Date(reserva.fecha_entrada).toLocaleDateString('es-ES', optsDate),
          check_out:      new Date(reserva.fecha_salida).toLocaleDateString('es-ES', optsDate),
          total_amount:   `${reserva.importe_total}€`,
          senal_amount:   reserva.importe_senal ? `${reserva.importe_senal}€` : '',
          resto_amount:   reserva.importe_resto  ? `${reserva.importe_resto}€`  : '',
          reservation_id: reserva.id,
          token_cliente:  reserva.token_cliente ?? '',
          booking_url:    `${appUrl}/reserva/${reserva.token_cliente}`,
          nights:         String(reserva.noches),
          guests:         String(reserva.num_huespedes),
          rate_type:      reserva.tarifa === 'FLEXIBLE' ? 'Flexible' : 'No reembolsable',
        };
      }
    }

    // Remitente desde la propiedad
    let fromEmail = 'noreply@casarurallarasilla.com';
    let fromName  = 'La Rasilla';

    if (property_id || reservation_id) {
      const pid = property_id ?? (reservation_id
        ? (await supabase.from('reservas').select('property_id').eq('id', reservation_id).single()).data?.property_id
        : null);

      if (pid) {
        const { data: prop } = await supabase
          .from('properties')
          .select('resend_from_email, resend_from_name, email, nombre')
          .eq('id', pid)
          .single();

        if (prop) {
          fromEmail = prop.resend_from_email ?? prop.email ?? fromEmail;
          fromName  = prop.resend_from_name  ?? prop.nombre ?? fromName;
        }
      }
    }

    const vars    = { guest_name: to_name, ...reservaVars, ...extra_vars };
    const subject = interpolate(template.asunto,      vars);
    const html    = interpolate(template.cuerpo_html, vars);

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.warn('RESEND_API_KEY no configurada — email omitido');
      return Response.json({ success: true, note: 'Email skipped: no API key' }, { headers: corsHeaders });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${fromName} <${fromEmail}>`, to: [to_email], subject, html }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      return Response.json({ error: 'Email sending failed' }, { status: 502, headers: corsHeaders });
    }

    return Response.json({ success: true }, { headers: corsHeaders });

  } catch (err) {
    console.error('send-email error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
});
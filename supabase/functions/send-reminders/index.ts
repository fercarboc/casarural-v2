// supabase/functions/send-reminders/index.ts  [v2]
// Cron diario: recordatorios 24h antes del check-in
// POST sin body | { dry_run: true }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dry_run === true;

  // Fecha de mañana
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const fechaMañana = tomorrow.toISOString().split('T')[0];

  // Columnas v2: nombre_cliente, apellidos_cliente, email_cliente
  const { data: reservas, error } = await supabase
    .from('reservas')
    .select('id, nombre_cliente, apellidos_cliente, email_cliente, fecha_entrada, fecha_salida, noches, num_huespedes, importe_total, property_id')
    .eq('fecha_entrada', fechaMañana)
    .eq('estado', 'CONFIRMED');

  if (error) {
    return Response.json({ error: 'DB error' }, { status: 500, headers: corsHeaders });
  }

  if (!reservas?.length) {
    return Response.json({ sent: 0, note: `No arrivals on ${fechaMañana}` }, { headers: corsHeaders });
  }

  // Evitar duplicados: buscar en logs (usamos un bloqueo simple vía DB)
  const reservaIds = reservas.map((r: any) => r.id);
  const { data: yaEnviados } = await supabase
    .from('logs_ical') // Reutilizamos este campo o idealmente tendríamos un audit_log
    .select('id')
    .in('id', []) // placeholder — sin audit_log en v2, enviamos siempre (el cron no se repite en el mismo día)

  const results: { id: string; email: string; status: string }[] = [];

  for (const reserva of reservas) {
    if (dryRun) {
      results.push({ id: reserva.id, email: reserva.email_cliente, status: 'dry_run' });
      continue;
    }

    try {
      const emailRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          template_key:   'checkin_reminder',
          to_email:       reserva.email_cliente,
          to_name:        `${reserva.nombre_cliente} ${reserva.apellidos_cliente ?? ''}`.trim(),
          reservation_id: reserva.id,
          property_id:    reserva.property_id,
        }),
      });

      results.push({
        id:     reserva.id,
        email:  reserva.email_cliente,
        status: emailRes.ok ? 'sent' : 'failed',
      });
    } catch (err) {
      results.push({ id: reserva.id, email: reserva.email_cliente, status: 'error' });
    }
  }

  const sent = results.filter(r => r.status === 'sent').length;
  return Response.json({ sent, total: reservas.length, results }, { headers: corsHeaders });
});
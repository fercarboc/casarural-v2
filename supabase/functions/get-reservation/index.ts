// supabase/functions/get-reservation/index.ts  [v2]
// POST { sessionId? } | { token? }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { sessionId, token } = await req.json();

    if (!sessionId && !token) {
      return new Response(
        JSON.stringify({ error: 'Se requiere sessionId o token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Columnas v2: nombre_cliente, email_cliente, importe_total, etc.
    let query = supabase
      .from('reservas')
      .select('*, reserva_unidades(unidad_id, num_huespedes, importe, desglose, unidades(nombre, slug))');

    if (sessionId) query = query.eq('stripe_session_id', sessionId);
    else           query = query.eq('token_cliente', token);

    const { data, error } = await query.maybeSingle();

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Error al consultar la reserva' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data) {
      return new Response(
        JSON.stringify({ error: 'Reserva no encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ reserva: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[get-reservation] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
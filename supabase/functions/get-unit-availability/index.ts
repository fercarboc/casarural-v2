// supabase/functions/get-unit-availability/index.ts  [v2 — NUEVA]
// Devuelve fechas ocupadas para una unidad concreta (para el calendario público)
// POST { unidad_id, start, end }
// GET  ?unidad_id=xxx&start=YYYY-MM-DD&end=YYYY-MM-DD

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let unidad_id: string, start: string, end: string;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      unidad_id = url.searchParams.get('unidad_id') ?? '';
      start     = url.searchParams.get('start') ?? '';
      end       = url.searchParams.get('end') ?? '';
    } else {
      const body = await req.json();
      unidad_id  = body.unidad_id ?? '';
      start      = body.start ?? '';
      end        = body.end ?? '';
    }

    if (!unidad_id || !start || !end) {
      return Response.json(
        { error: 'Missing required fields: unidad_id, start, end' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Bloqueos directos de esta unidad
    const { data: bloqueos } = await supabase
      .from('bloqueos')
      .select('fecha_inicio, fecha_fin, origen, motivo')
      .eq('unidad_id', unidad_id)
      .lt('fecha_inicio', end)
      .gt('fecha_fin', start);

    // Reservas confirmadas que ocupan esta unidad
    const { data: ruConflict } = await supabase
      .from('reserva_unidades')
      .select('reserva_id')
      .eq('unidad_id', unidad_id);

    const reservaIds = (ruConflict ?? []).map((r: any) => r.reserva_id);

    const { data: reservas } = reservaIds.length
      ? await supabase
          .from('reservas')
          .select('fecha_entrada, fecha_salida')
          .in('id', reservaIds)
          .in('estado', ['CONFIRMED', 'PENDING_PAYMENT'])
          .lt('fecha_entrada', end)
          .gt('fecha_salida', start)
      : { data: [] };

    // Expandir a días individuales
    const blocked = new Set<string>();

    const addRange = (startDate: string, endDate: string) => {
      const cur = new Date(startDate);
      const fin = new Date(endDate);
      while (cur < fin) {
        blocked.add(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }
    };

    bloqueos?.forEach(b => addRange(b.fecha_inicio, b.fecha_fin));
    reservas?.forEach(r => addRange(r.fecha_entrada, r.fecha_salida));

    // También devolver rangos para calendarios que los prefieren
    const ranges = [
      ...(bloqueos ?? []).map(b => ({
        start:  b.fecha_inicio,
        end:    b.fecha_fin,
        type:   'block',
        origen: b.origen,
      })),
      ...(reservas ?? []).map(r => ({
        start:  r.fecha_entrada,
        end:    r.fecha_salida,
        type:   'reservation',
        origen: 'RESERVA',
      })),
    ];

    return Response.json({
      unidad_id,
      blocked_dates: Array.from(blocked).sort(),
      ranges,
    }, { headers: corsHeaders });

  } catch (err) {
    console.error('get-unit-availability error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
});
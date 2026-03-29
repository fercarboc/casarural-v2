// supabase/functions/check-availability/index.ts  [v2]
// POST { start, end, unidad_ids?: string[] }         → días bloqueados del periodo
// POST { checkIn, checkOut, unidad_ids: string[] }   → verifica si el rango está libre

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ── Modo calendario: lista de días bloqueados ──────────────────────────
    if (body.start && body.end) {
      const { start, end, unidad_ids } = body;

      // Reservas: buscar por unidad_ids si se proporcionan (via reserva_unidades)
      let reservasQuery = supabase
        .from('reservas')
        .select('fecha_entrada, fecha_salida')
        .in('estado', ['CONFIRMED', 'PENDING_PAYMENT'])
        .lt('fecha_entrada', end)
        .gt('fecha_salida', start);

      if (unidad_ids?.length) {
        // Obtener reserva_ids que ocupan estas unidades
        const { data: ruIds } = await supabase
          .from('reserva_unidades')
          .select('reserva_id')
          .in('unidad_id', unidad_ids);
        const ids = (ruIds ?? []).map((r: any) => r.reserva_id);
        if (ids.length === 0) {
          // No hay reservas para estas unidades — solo comprobar bloqueos
          let bloqueosQ = supabase
            .from('bloqueos')
            .select('fecha_inicio, fecha_fin')
            .lt('fecha_inicio', end)
            .gt('fecha_fin', start);
          if (unidad_ids?.length) bloqueosQ = bloqueosQ.in('unidad_id', unidad_ids);
          const { data: bloqueos } = await bloqueosQ;
          const blocked = new Set<string>();
          bloqueos?.forEach(b => addRange(b.fecha_inicio, b.fecha_fin, blocked));
          return Response.json({ blocked_dates: Array.from(blocked) }, { headers: corsHeaders });
        }
        reservasQuery = reservasQuery.in('id', ids);
      }

      const [{ data: reservas }, bloqueosResult] = await Promise.all([
        reservasQuery,
        (() => {
          let q = supabase
            .from('bloqueos')
            .select('fecha_inicio, fecha_fin')
            .lt('fecha_inicio', end)
            .gt('fecha_fin', start);
          if (unidad_ids?.length) q = q.in('unidad_id', unidad_ids);
          return q;
        })(),
      ]);

      const blocked = new Set<string>();
      reservas?.forEach(r => addRange(r.fecha_entrada, r.fecha_salida, blocked));
      bloqueosResult.data?.forEach(b => addRange(b.fecha_inicio, b.fecha_fin, blocked));

      return Response.json({ blocked_dates: Array.from(blocked) }, { headers: corsHeaders });
    }

    // ── Modo verificación: ¿están libres las unidades en un rango concreto? ──
    const { checkIn, checkOut, unidad_ids } = body;
    if (!checkIn || !checkOut) {
      return Response.json({ error: 'Missing checkIn or checkOut' }, { status: 400, headers: corsHeaders });
    }

    // Si se pasan unidad_ids, verificar cada unidad independientemente
    if (unidad_ids?.length) {
      const results: Record<string, boolean> = {};

      for (const unidad_id of unidad_ids) {
        // Reservas que ocupan esta unidad en el rango
        const { data: ruConflict } = await supabase
          .from('reserva_unidades')
          .select('reserva_id')
          .eq('unidad_id', unidad_id);

        const reservaIds = (ruConflict ?? []).map((r: any) => r.reserva_id);

        const [reservasConflict, bloqueosConflict] = await Promise.all([
          reservaIds.length
            ? supabase
                .from('reservas')
                .select('id')
                .in('id', reservaIds)
                .in('estado', ['CONFIRMED', 'PENDING_PAYMENT'])
                .lt('fecha_entrada', checkOut)
                .gt('fecha_salida', checkIn)
            : { data: [] },
          supabase
            .from('bloqueos')
            .select('id')
            .eq('unidad_id', unidad_id)
            .lt('fecha_inicio', checkOut)
            .gt('fecha_fin', checkIn),
        ]);

        const conflicts = [
          ...((reservasConflict.data ?? []).map((r: any) => r.id)),
          ...((bloqueosConflict.data ?? []).map((b: any) => b.id)),
        ];
        results[unidad_id] = conflicts.length === 0;
      }

      const allAvailable = Object.values(results).every(Boolean);
      return Response.json(
        { available: allAvailable, per_unit: results },
        { headers: corsHeaders }
      );
    }

    // Fallback sin unidad_ids: verificación global (compatible v1)
    const [{ data: conflictReservas }, { data: conflictBloqueos }] = await Promise.all([
      supabase
        .from('reservas')
        .select('id')
        .in('estado', ['CONFIRMED', 'PENDING_PAYMENT'])
        .lt('fecha_entrada', checkOut)
        .gt('fecha_salida', checkIn),
      supabase
        .from('bloqueos')
        .select('id')
        .lt('fecha_inicio', checkOut)
        .gt('fecha_fin', checkIn),
    ]);

    const conflicts = [
      ...(conflictReservas?.map(r => r.id) ?? []),
      ...(conflictBloqueos?.map(b => b.id) ?? []),
    ];
    return Response.json({ available: conflicts.length === 0, conflicts }, { headers: corsHeaders });

  } catch (err) {
    console.error('check-availability error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
});

function addRange(startDate: string, endDate: string, set: Set<string>) {
  const cur = new Date(startDate);
  const fin = new Date(endDate);
  while (cur < fin) {
    set.add(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
}
// supabase/functions/check-availability/index.ts
// v2 — endurecida
// POST { start, end, unidad_ids?: string[] }       -> días bloqueados
// POST { checkIn, checkOut, unidad_ids?: string[] } -> verifica disponibilidad

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-host, host',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // =========================================================
    // MODO CALENDARIO
    // =========================================================
    if (body.start && body.end) {
      const { start, end, unidad_ids } = body;

      // 1. Bloqueos manuales / iCal
      let bloqueosQ = supabase
        .from('bloqueos')
        .select('unidad_id, fecha_inicio, fecha_fin')
        .lt('fecha_inicio', end)
        .gt('fecha_fin', start);

      if (unidad_ids?.length) {
        bloqueosQ = bloqueosQ.in('unidad_id', unidad_ids);
      }

      // 2. Holds activos
      let holdsQ = supabase
        .from('reservation_holds')
        .select('unidad_id, fecha_inicio, fecha_fin, expires_at')
        .gt('expires_at', new Date().toISOString())
        .lt('fecha_inicio', end)
        .gt('fecha_fin', start);

      if (unidad_ids?.length) {
        holdsQ = holdsQ.in('unidad_id', unidad_ids);
      }

      // 3. Reservas confirmadas
      let reservasQ = supabase
        .from('reservas')
        .select(`
          id,
          fecha_entrada,
          fecha_salida,
          estado,
          reserva_unidades!inner(unidad_id)
        `)
        .eq('estado', 'CONFIRMED')
        .lt('fecha_entrada', end)
        .gt('fecha_salida', start);

      const [bloqueosRes, holdsRes, reservasRes] = await Promise.all([
        bloqueosQ,
        holdsQ,
        reservasQ,
      ]);

      if (bloqueosRes.error) throw bloqueosRes.error;

      // Si la tabla holds aún no existe, tolerancia temporal.
      // En producción mejor quitar esta tolerancia.
      const holds = holdsRes.error ? [] : (holdsRes.data ?? []);

      if (reservasRes.error) throw reservasRes.error;

      const blocked = new Set<string>();

      // Bloqueos
      for (const b of bloqueosRes.data ?? []) {
        if (!unidad_ids?.length || unidad_ids.includes(b.unidad_id)) {
          addRange(b.fecha_inicio, b.fecha_fin, blocked);
        }
      }

      // Holds
      for (const h of holds) {
        if (!unidad_ids?.length || unidad_ids.includes(h.unidad_id)) {
          addRange(h.fecha_inicio, h.fecha_fin, blocked);
        }
      }

      // Reservas confirmadas
      for (const r of reservasRes.data ?? []) {
        const reservaUnidades = (r as any).reserva_unidades ?? [];

        const applies = !unidad_ids?.length
          ? reservaUnidades.length > 0
          : reservaUnidades.some((ru: any) => unidad_ids.includes(ru.unidad_id));

        if (applies) {
          addRange(r.fecha_entrada, r.fecha_salida, blocked);
        }
      }

      return new Response(
        JSON.stringify({ blocked_dates: Array.from(blocked).sort() }),
        { status: 200, headers: corsHeaders }
      );
    }

    // =========================================================
    // MODO VERIFICACIÓN
    // =========================================================
    const { checkIn, checkOut, unidad_ids } = body;

    if (!checkIn || !checkOut) {
      return new Response(
        JSON.stringify({ error: 'Missing checkIn or checkOut' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ---------------------------------------------------------
    // Si vienen unidad_ids -> verificar por unidad
    // ---------------------------------------------------------
    if (unidad_ids?.length) {
      const results: Record<string, boolean> = {};

      // 1. Bloqueos
      const { data: bloqueos, error: bloqueosError } = await supabase
        .from('bloqueos')
        .select('unidad_id')
        .in('unidad_id', unidad_ids)
        .lt('fecha_inicio', checkOut)
        .gt('fecha_fin', checkIn);

      if (bloqueosError) throw bloqueosError;

      const blockedSet = new Set((bloqueos ?? []).map((b: any) => b.unidad_id));

      // 2. Holds activos
      let heldSet = new Set<string>();
      const { data: holds, error: holdsError } = await supabase
        .from('reservation_holds')
        .select('unidad_id')
        .in('unidad_id', unidad_ids)
        .gt('expires_at', new Date().toISOString())
        .lt('fecha_inicio', checkOut)
        .gt('fecha_fin', checkIn);

      if (!holdsError) {
        heldSet = new Set((holds ?? []).map((h: any) => h.unidad_id));
      }

      // 3. Reservas confirmadas
      const { data: reservas, error: reservasError } = await supabase
        .from('reservas')
        .select(`
          id,
          fecha_entrada,
          fecha_salida,
          estado,
          reserva_unidades!inner(unidad_id)
        `)
        .eq('estado', 'CONFIRMED')
        .lt('fecha_entrada', checkOut)
        .gt('fecha_salida', checkIn);

      if (reservasError) throw reservasError;

      const reservedSet = new Set<string>();

      for (const r of reservas ?? []) {
        for (const ru of (r as any).reserva_unidades ?? []) {
          if (unidad_ids.includes(ru.unidad_id)) {
            reservedSet.add(ru.unidad_id);
          }
        }
      }

      // Resultado final por unidad
      for (const unidad_id of unidad_ids) {
        const isAvailable =
          !blockedSet.has(unidad_id) &&
          !heldSet.has(unidad_id) &&
          !reservedSet.has(unidad_id);

        results[unidad_id] = isAvailable;
      }

      const allAvailable = Object.values(results).every(Boolean);

      return new Response(
        JSON.stringify({
          available: allAvailable,
          per_unit: results,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // ---------------------------------------------------------
    // Fallback v1 sin unidad_ids
    // ---------------------------------------------------------
    const [conflictReservas, conflictBloqueos, conflictHolds] = await Promise.all([
      supabase
        .from('reservas')
        .select('id')
        .eq('estado', 'CONFIRMED')
        .lt('fecha_entrada', checkOut)
        .gt('fecha_salida', checkIn),

      supabase
        .from('bloqueos')
        .select('id')
        .lt('fecha_inicio', checkOut)
        .gt('fecha_fin', checkIn),

      supabase
        .from('reservation_holds')
        .select('id')
        .gt('expires_at', new Date().toISOString())
        .lt('fecha_inicio', checkOut)
        .gt('fecha_fin', checkIn),
    ]);

    if (conflictReservas.error) throw conflictReservas.error;
    if (conflictBloqueos.error) throw conflictBloqueos.error;
    // holds opcional si tabla no existe todavía
    const holdsFallback = conflictHolds.error ? [] : (conflictHolds.data ?? []);

    const conflicts = [
      ...(conflictReservas.data?.map((r: any) => r.id) ?? []),
      ...(conflictBloqueos.data?.map((b: any) => b.id) ?? []),
      ...(holdsFallback.map((h: any) => h.id) ?? []),
    ];

    return new Response(
      JSON.stringify({
        available: conflicts.length === 0,
        conflicts,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error('check-availability error:', err);
    return new Response(
      JSON.stringify({ error: err.message ?? 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
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
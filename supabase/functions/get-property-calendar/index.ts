// supabase/functions/get-property-calendar/index.ts
// Devuelve disponibilidad día-a-día para todas las unidades de una propiedad.
// Input:  { property_id, from?, to? }   (from/to son "YYYY-MM-DD", defecto: hoy a hoy+12 meses)
// Output: { total_units: number, blocked_by_date: { [date]: number } }
//   donde blocked_by_date[date] = nº de unidades bloqueadas ese día

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { property_id, from, to } = await req.json();

    if (!property_id) {
      return Response.json({ error: 'property_id requerido' }, { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const today = new Date();
    const fromStr: string = from ?? today.toISOString().split('T')[0];
    const toDate = new Date(today.getTime() + 365 * 86400000); // 12 meses por defecto
    const toStr: string = to ?? toDate.toISOString().split('T')[0];

    // 1. Cargar unidades activas
    const { data: unidades, error: uErr } = await supabase
      .from('unidades')
      .select('id')
      .eq('property_id', property_id)
      .eq('activa', true);

    if (uErr) throw uErr;
    if (!unidades?.length) {
      return Response.json({ total_units: 0, blocked_by_date: {} }, { headers: corsHeaders });
    }

    const unitIds = unidades.map((u: { id: string }) => u.id);
    const totalUnits = unitIds.length;

    // Mapa: date → Set de unidad_ids bloqueadas ese día
    const blockedPerDay = new Map<string, Set<string>>();

    function addRange(unidadId: string, startStr: string, endStr: string) {
      // La ocupación va desde startStr hasta endStr EXCLUSIVE
      // (el día de salida queda libre, igual que check-availability)
      const cur = new Date(startStr + 'T00:00:00Z');
      const end = new Date(endStr + 'T00:00:00Z');
      while (cur < end) {
        const key = cur.toISOString().split('T')[0];
        if (key >= fromStr && key < toStr) {
          if (!blockedPerDay.has(key)) blockedPerDay.set(key, new Set());
          blockedPerDay.get(key)!.add(unidadId);
        }
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }

    // 2. Bloqueos que pisan el rango
    const { data: bloqueos, error: bErr } = await supabase
      .from('bloqueos')
      .select('unidad_id, fecha_inicio, fecha_fin')
      .in('unidad_id', unitIds)
      .lt('fecha_inicio', toStr)
      .gt('fecha_fin', fromStr);

    if (bErr) throw bErr;
    for (const b of bloqueos ?? []) {
      addRange(b.unidad_id, b.fecha_inicio, b.fecha_fin);
    }

    // 3. Reservas CONFIRMED + PENDING_PAYMENT (misma lógica que check-availability)
    const { data: reservaUnidades, error: ruErr } = await supabase
      .from('reserva_unidades')
      .select('unidad_id, reservas!inner(fecha_entrada, fecha_salida, estado)')
      .in('unidad_id', unitIds)
      .in('reservas.estado', ['CONFIRMED', 'PENDING_PAYMENT'])
      .lt('reservas.fecha_entrada', toStr)
      .gt('reservas.fecha_salida', fromStr);

    if (ruErr) throw ruErr;
    for (const ru of reservaUnidades ?? []) {
      const r = (ru as any).reservas;
      addRange(ru.unidad_id, r.fecha_entrada, r.fecha_salida);
    }

    // 4. Reservation holds activos (no vencidos)
    const { data: holds } = await supabase
      .from('reservation_holds')
      .select('unidad_id, fecha_inicio, fecha_fin, expires_at')
      .in('unidad_id', unitIds)
      .gt('expires_at', new Date().toISOString())
      .lt('fecha_inicio', toStr)
      .gt('fecha_fin', fromStr);

    for (const h of holds ?? []) {
      addRange(h.unidad_id, h.fecha_inicio, h.fecha_fin);
    }

    // Convertir a { date: count }
    const blocked_by_date: Record<string, number> = {};
    for (const [date, unitSet] of blockedPerDay.entries()) {
      blocked_by_date[date] = unitSet.size;
    }

    return Response.json({ total_units: totalUnits, blocked_by_date }, { headers: corsHeaders });

  } catch (err) {
    console.error('get-property-calendar error:', err);
    return Response.json({ error: 'Error interno', detail: String(err) }, { status: 500, headers: corsHeaders });
  }
});

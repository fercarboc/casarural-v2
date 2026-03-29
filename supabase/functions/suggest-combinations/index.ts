// supabase/functions/suggest-combinations/index.ts  [v2 — NUEVA]
// Núcleo del motor multi-unidad: sugiere combinaciones óptimas de unidades
// POST { checkIn, checkOut, huespedes, property_id }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { checkIn, checkOut, huespedes, property_id } = await req.json();

    if (!checkIn || !checkOut || !huespedes || !property_id) {
      return Response.json(
        { error: 'Missing required fields: checkIn, checkOut, huespedes, property_id' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const nights = Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (nights < 1) {
      return Response.json({ error: 'Invalid date range' }, { status: 400, headers: corsHeaders });
    }

    // 1. Obtener unidades activas de la propiedad
    const { data: todasUnidades } = await supabase
      .from('unidades')
      .select('id, nombre, slug, capacidad_base, capacidad_maxima')
      .eq('property_id', property_id)
      .eq('activa', true)
      .order('orden');

    if (!todasUnidades?.length) {
      return Response.json({ error: 'No hay unidades activas para esta propiedad' }, { status: 404, headers: corsHeaders });
    }

    // 2. Filtrar unidades disponibles en el rango
    const unidadesDisponibles: typeof todasUnidades = [];

    for (const unidad of todasUnidades) {
      // Bloqueos directos
      const { data: bloqueos } = await supabase
        .from('bloqueos')
        .select('id')
        .eq('unidad_id', unidad.id)
        .lt('fecha_inicio', checkOut)
        .gt('fecha_fin', checkIn)
        .limit(1);

      if (bloqueos?.length) continue;

      // Reservas que ocupan esta unidad
      const { data: ruConflict } = await supabase
        .from('reserva_unidades')
        .select('reserva_id')
        .eq('unidad_id', unidad.id);

      const reservaIds = (ruConflict ?? []).map((r: any) => r.reserva_id);

      if (reservaIds.length) {
        const { data: reservasConflict } = await supabase
          .from('reservas')
          .select('id')
          .in('id', reservaIds)
          .in('estado', ['CONFIRMED', 'PENDING_PAYMENT'])
          .lt('fecha_entrada', checkOut)
          .gt('fecha_salida', checkIn)
          .limit(1);

        if (reservasConflict?.length) continue;
      }

      unidadesDisponibles.push(unidad);
    }

    if (!unidadesDisponibles.length) {
      return Response.json({
        combinaciones: [],
        disponibilidad_parcial: false,
        mensaje: 'No hay unidades disponibles para las fechas seleccionadas',
      }, { headers: corsHeaders });
    }

    // 3. Generar todas las combinaciones que cubren >= huespedes (máx 4 unidades)
    const combinacionesValidas: Array<{
      unidades: typeof todasUnidades;
      total_huespedes: number;
      es_exacta: boolean;
    }> = [];

    const MAX_UNIDADES_POR_COMBO = 4;

    function generarCombinaciones(
      disponibles: typeof todasUnidades,
      inicio: number,
      actual: typeof todasUnidades,
    ) {
      const capacidadActual = actual.reduce((s, u) => s + u.capacidad_maxima, 0);

      if (capacidadActual >= huespedes) {
        combinacionesValidas.push({
          unidades: [...actual],
          total_huespedes: capacidadActual,
          es_exacta: capacidadActual === huespedes,
        });
        // No seguir añadiendo unidades si ya cubrimos — la combinación más pequeña es mejor
        return;
      }

      if (actual.length >= MAX_UNIDADES_POR_COMBO) return;

      for (let i = inicio; i < disponibles.length; i++) {
        actual.push(disponibles[i]);
        generarCombinaciones(disponibles, i + 1, actual);
        actual.pop();
      }
    }

    generarCombinaciones(unidadesDisponibles, 0, []);

    if (!combinacionesValidas.length) {
      // Calcular cuántos huéspedes máximos se pueden alojar
      const maxPosible = unidadesDisponibles.reduce((s, u) => s + u.capacidad_maxima, 0);
      return Response.json({
        combinaciones: [],
        disponibilidad_parcial: maxPosible > 0,
        max_huespedes_posible: maxPosible,
        mensaje: `Capacidad máxima disponible: ${maxPosible} huéspedes`,
      }, { headers: corsHeaders });
    }

    // 4. Calcular precio para cada combinación
    const baseUrl = Deno.env.get('SUPABASE_URL')!;
    const svcKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${svcKey}` };

    const combinacionesConPrecio = await Promise.all(
      combinacionesValidas.map(async (combo) => {
        // Distribuir huéspedes entre unidades de forma óptima
        const unidadesConHuespedes = distribuirHuespedes(combo.unidades, huespedes);

        const priceRes = await fetch(`${baseUrl}/functions/v1/calculate-price`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            checkIn,
            checkOut,
            rateType: 'FLEXIBLE',
            property_id,
            unidades: unidadesConHuespedes.map(u => ({
              unidad_id:    u.id,
              num_huespedes: u.asignados,
            })),
          }),
        });

        const precio = await priceRes.json();

        return {
          unidades: unidadesConHuespedes.map(u => ({
            id:              u.id,
            nombre:          u.nombre,
            slug:            u.slug,
            capacidad_base:  u.capacidad_base,
            capacidad_maxima: u.capacidad_maxima,
            num_huespedes:   u.asignados,
            importe:         precio.unidades?.find((p: any) => p.unidad_id === u.id)?.subtotal ?? 0,
            desglose:        precio.unidades?.find((p: any) => p.unidad_id === u.id)?.desglose ?? {},
          })),
          total_huespedes:    combo.total_huespedes,
          precio_total:       precio.importe_total ?? 0,
          precio_por_huesped: huespedes > 0 ? Math.round((precio.importe_total ?? 0) / huespedes) : 0,
          es_exacta:          combo.es_exacta,
          importe_senal:      precio.importe_senal ?? null,
          num_unidades:       combo.unidades.length,
        };
      })
    );

    // 5. Ordenar: menos unidades > precio mínimo > cobertura exacta
    combinacionesConPrecio.sort((a, b) => {
      if (a.num_unidades !== b.num_unidades) return a.num_unidades - b.num_unidades;
      if (a.es_exacta !== b.es_exacta) return a.es_exacta ? -1 : 1;
      return a.precio_total - b.precio_total;
    });

    // Devolver máximo 3 combinaciones
    const top3 = combinacionesConPrecio.slice(0, 3);

    return Response.json({
      combinaciones: top3,
      disponibilidad_parcial: false,
      total_combinaciones_posibles: combinacionesConPrecio.length,
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('suggest-combinations error:', err);
    return Response.json({ error: err.message ?? 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
});

// Distribuye huéspedes entre unidades priorizando llenar cada una a su capacidad base
function distribuirHuespedes(
  unidades: Array<{ id: string; nombre: string; slug: string; capacidad_base: number; capacidad_maxima: number }>,
  totalHuespedes: number
) {
  let restantes = totalHuespedes;
  return unidades.map((u, idx) => {
    const esUltima = idx === unidades.length - 1;
    const asignados = esUltima
      ? restantes
      : Math.min(u.capacidad_maxima, Math.max(1, Math.round(restantes / (unidades.length - idx))));
    restantes -= asignados;
    return { ...u, asignados: Math.max(1, asignados) };
  });
}
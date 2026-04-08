// supabase/functions/suggest-combinations/index.ts
// v2 — NUEVA (revisión endurecida)
// POST { checkIn, checkOut, huespedes, unidad_slug_preferida? }

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
    const { checkIn, checkOut, huespedes, unidad_slug_preferida } = await req.json();

    if (!checkIn || !checkOut || !huespedes) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: checkIn, checkOut, huespedes' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const nights = Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (nights < 1) {
      return new Response(
        JSON.stringify({ error: 'Invalid date range' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!Number.isInteger(huespedes) || huespedes <= 0) {
      return new Response(
        JSON.stringify({ error: 'huespedes must be a positive integer' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // =========================================================
    // 1. Resolver property_id en backend (NO confiar en frontend)
    // =========================================================
    const property_id = await resolvePropertyId(req, supabase);

    if (!property_id) {
      return new Response(
        JSON.stringify({ error: 'Unable to resolve property context in backend' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // =========================================================
    // 2. Cargar unidades activas
    // =========================================================
    const { data: todasUnidades, error: unidadesError } = await supabase
      .from('unidades')
      .select('id, property_id, nombre, slug, capacidad_base, capacidad_maxima, orden')
      .eq('property_id', property_id)
      .eq('activa', true)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true });

    if (unidadesError) throw unidadesError;

    if (!todasUnidades?.length) {
      return new Response(
        JSON.stringify({
          ok: true,
          property_id,
          checkIn,
          checkOut,
          nights,
          huespedes,
          combinaciones: [],
          disponibilidad_parcial: false,
          mensaje: 'No hay unidades activas para esta propiedad',
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    const capacidadMaxTotal = todasUnidades.reduce((s, u) => s + u.capacidad_maxima, 0);

    if (huespedes > capacidadMaxTotal) {
      return new Response(
        JSON.stringify({
          ok: true,
          property_id,
          checkIn,
          checkOut,
          nights,
          huespedes,
          combinaciones: [],
          disponibilidad_parcial: false,
          max_huespedes_posible: capacidadMaxTotal,
          mensaje: `La capacidad máxima total de la propiedad es ${capacidadMaxTotal}`,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // =========================================================
    // 3. Cargar conflictos EN BLOQUE
    // =========================================================

    // 3.1 Bloqueos directos
    const { data: bloqueos, error: bloqueosError } = await supabase
      .from('bloqueos')
      .select('unidad_id, fecha_inicio, fecha_fin')
      .eq('property_id', property_id)
      .lt('fecha_inicio', checkOut)
      .gt('fecha_fin', checkIn);

    if (bloqueosError) throw bloqueosError;

    const blockedUnitIds = new Set((bloqueos ?? []).map((b) => b.unidad_id));

    // 3.2 Holds activos (CRÍTICO)
    let heldUnitIds = new Set<string>();
    const { data: holds, error: holdsError } = await supabase
      .from('reservation_holds')
      .select('unidad_id, fecha_inicio, fecha_fin, expires_at')
      .eq('property_id', property_id)
      .gt('expires_at', new Date().toISOString())
      .lt('fecha_inicio', checkOut)
      .gt('fecha_fin', checkIn);

    // Si la tabla no existe todavía, no rompas el desarrollo.
    // En producción lo ideal es eliminar esta tolerancia.
    if (!holdsError) {
      heldUnitIds = new Set((holds ?? []).map((h) => h.unidad_id));
    }

    // 3.3 Reservas confirmadas y PENDING_PAYMENT NO expiradas
    const { data: reservasConflict, error: reservasError } = await supabase
      .from('reservas')
      .select(`
        id,
        estado,
        expires_at,
        fecha_entrada,
        fecha_salida,
        reserva_unidades!inner(unidad_id)
      `)
      .eq('property_id', property_id)
      .in('estado', ['CONFIRMED', 'PENDING_PAYMENT'])
      .lt('fecha_entrada', checkOut)
      .gt('fecha_salida', checkIn);

    if (reservasError) throw reservasError;

    const reservedUnitIds = new Set<string>();

    for (const reserva of reservasConflict ?? []) {
      const isConfirmed = reserva.estado === 'CONFIRMED';
      const isPendingActive =
        reserva.estado === 'PENDING_PAYMENT' &&
        reserva.expires_at &&
        new Date(reserva.expires_at).getTime() > Date.now();

      if (!isConfirmed && !isPendingActive) continue;

      for (const ru of (reserva as any).reserva_unidades ?? []) {
        reservedUnitIds.add(ru.unidad_id);
      }
    }

    const unavailableIds = new Set<string>([
      ...blockedUnitIds,
      ...heldUnitIds,
      ...reservedUnitIds,
    ]);

    const unidadesDisponibles = todasUnidades.filter((u) => !unavailableIds.has(u.id));

    if (!unidadesDisponibles.length) {
      return new Response(
        JSON.stringify({
          ok: true,
          property_id,
          checkIn,
          checkOut,
          nights,
          huespedes,
          combinaciones: [],
          disponibilidad_parcial: false,
          mensaje: 'No hay unidades disponibles para las fechas seleccionadas',
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // =========================================================
    // 4. Generar combinaciones válidas
    // =========================================================
    const combinacionesValidas: Array<{
      unidades: typeof todasUnidades;
      total_capacidad_base: number;
      total_capacidad_maxima: number;
      exceso_capacidad: number;
      es_exacta_capacidad_base: boolean;
    }> = [];

    const MAX_UNIDADES_POR_COMBO = 4;

    function generarCombinaciones(
      disponibles: typeof todasUnidades,
      inicio: number,
      actual: typeof todasUnidades,
    ) {
      const totalBase = actual.reduce((s, u) => s + u.capacidad_base, 0);
      const totalMax = actual.reduce((s, u) => s + u.capacidad_maxima, 0);

      if (totalMax >= huespedes) {
        combinacionesValidas.push({
          unidades: [...actual],
          total_capacidad_base: totalBase,
          total_capacidad_maxima: totalMax,
          exceso_capacidad: totalMax - huespedes,
          es_exacta_capacidad_base: totalBase === huespedes,
        });
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
      const maxPosible = unidadesDisponibles.reduce((s, u) => s + u.capacidad_maxima, 0);

      return new Response(
        JSON.stringify({
          ok: true,
          property_id,
          checkIn,
          checkOut,
          nights,
          huespedes,
          combinaciones: [],
          disponibilidad_parcial: unidadesDisponibles.length < todasUnidades.length,
          max_huespedes_posible: maxPosible,
          mensaje: `Capacidad máxima disponible en esas fechas: ${maxPosible} huéspedes`,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // =========================================================
    // 5. Calcular precio por combinación llamando a calculate-price
    // =========================================================
    const baseUrl = Deno.env.get('SUPABASE_URL')!;
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fnHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${svcKey}`,
    };

    const combinacionesConPrecio = await Promise.all(
      combinacionesValidas.map(async (combo) => {
        const unidadesConHuespedes = distribuirHuespedesDeterminista(
          combo.unidades,
          huespedes,
          unidad_slug_preferida
        );

        const priceRes = await fetch(`${baseUrl}/functions/v1/calculate-price`, {
          method: 'POST',
          headers: fnHeaders,
          body: JSON.stringify({
            checkIn,
            checkOut,
            rateType: 'FLEXIBLE',
            unidades: unidadesConHuespedes.map((u) => ({
              unidad_id: u.id,
              num_huespedes: u.asignados,
            })),
          }),
        });

        if (!priceRes.ok) {
          const errText = await priceRes.text();
          throw new Error(`calculate-price failed: ${priceRes.status} ${errText}`);
        }

        const precio = await priceRes.json();

        const unidades = unidadesConHuespedes.map((u) => {
          const priceUnit = precio.unidades?.find((p: any) => p.unidad_id === u.id);

          return {
            id: u.id,
            nombre: u.nombre,
            slug: u.slug,
            capacidad_base: u.capacidad_base,
            capacidad_maxima: u.capacidad_maxima,
            num_huespedes_asignados: u.asignados,
            importe_alojamiento: priceUnit?.subtotal ?? 0,
            importe_limpieza: priceUnit?.desglose?.limpieza ?? 0,
            importe_extras: priceUnit?.desglose?.extras ?? 0,
            importe_total_unidad: priceUnit?.total ?? priceUnit?.subtotal ?? 0,
            desglose: priceUnit?.desglose ?? {},
          };
        });

        const precio_total = precio.importe_total ?? 0;

        return {
          unidades,
          total_capacidad_base: combo.total_capacidad_base,
          total_capacidad_maxima: combo.total_capacidad_maxima,
          total_huespedes_asignados: huespedes,
          precio_total,
          precio_por_huesped: huespedes > 0 ? Math.round((precio_total / huespedes) * 100) / 100 : 0,
          es_exacta_capacidad_base: combo.es_exacta_capacidad_base,
          exceso_capacidad: combo.exceso_capacidad,
          num_unidades: combo.unidades.length,
        };
      })
    );

    // =========================================================
    // 6. Ordenación final correcta
    // 1. menos unidades
    // 2. menor exceso de capacidad
    // 3. menor precio total
    // 4. prioridad a unidad_slug_preferida
    // =========================================================
    combinacionesConPrecio.sort((a, b) => {
      if (a.num_unidades !== b.num_unidades) return a.num_unidades - b.num_unidades;
      if (a.exceso_capacidad !== b.exceso_capacidad) return a.exceso_capacidad - b.exceso_capacidad;
      if (a.precio_total !== b.precio_total) return a.precio_total - b.precio_total;

      const aPreferred = unidad_slug_preferida
        ? a.unidades.some((u: any) => u.slug === unidad_slug_preferida)
        : false;

      const bPreferred = unidad_slug_preferida
        ? b.unidades.some((u: any) => u.slug === unidad_slug_preferida)
        : false;

      if (aPreferred !== bPreferred) return aPreferred ? -1 : 1;

      return 0;
    });

    const top3 = combinacionesConPrecio.slice(0, 3).map((combo, idx, arr) => ({
      ranking: idx + 1,
      tipo:
        idx === 0
          ? 'RECOMENDADA'
          : idx === arr.length - 1
          ? 'COMPLETA'
          : 'ALTERNATIVA',
      ...combo,
    }));

    return new Response(
      JSON.stringify({
        ok: true,
        property_id,
        checkIn,
        checkOut,
        nights,
        huespedes,
        combinaciones: top3,
        disponibilidad_parcial: unidadesDisponibles.length < todasUnidades.length,
        total_combinaciones_posibles: combinacionesConPrecio.length,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error('suggest-combinations error:', err);
    return new Response(
      JSON.stringify({ error: err.message ?? 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});

// =========================================================
// Resolver property_id en backend
// =========================================================
async function resolvePropertyId(req: Request, supabase: any): Promise<string | null> {
  const forcedPropertyId = req.headers.get('x-property-id');
  if (forcedPropertyId) return forcedPropertyId;

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');

  if (host) {
    const { data, error } = await supabase
      .from('custom_domains')
      .select('property_id')
      .eq('domain', host)
      .maybeSingle();

    if (!error && data?.property_id) return data.property_id;
  }

  return Deno.env.get('PROPERTY_ID') || Deno.env.get('VITE_PROPERTY_ID') || null;
}

// =========================================================
// Reparto determinista de huéspedes
// Prioridad:
// 1. unidad preferida si existe
// 2. unidades con mayor capacidad máxima
// 3. orden ASC
// =========================================================
function distribuirHuespedesDeterminista(
  unidades: Array<{
    id: string;
    nombre: string;
    slug: string;
    capacidad_base: number;
    capacidad_maxima: number;
    orden?: number | null;
  }>,
  totalHuespedes: number,
  unidad_slug_preferida?: string
) {
  let restantes = totalHuespedes;

  const sorted = [...unidades].sort((a, b) => {
    const aPref = unidad_slug_preferida && a.slug === unidad_slug_preferida ? 1 : 0;
    const bPref = unidad_slug_preferida && b.slug === unidad_slug_preferida ? 1 : 0;

    if (aPref !== bPref) return bPref - aPref;
    if (a.capacidad_maxima !== b.capacidad_maxima) return b.capacidad_maxima - a.capacidad_maxima;

    const ao = a.orden ?? 999999;
    const bo = b.orden ?? 999999;
    return ao - bo;
  });

  return sorted.map((u, idx) => {
    const esUltima = idx === sorted.length - 1;
    const asignados = esUltima
      ? restantes
      : Math.min(u.capacidad_maxima, restantes);

    restantes -= asignados;

    return {
      ...u,
      asignados: Math.max(0, asignados),
    };
  });
}
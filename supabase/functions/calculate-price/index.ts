// supabase/functions/calculate-price/index.ts
// v2 ajustada al modelo real:
// - unidades contiene precios BASE y ESPECIAL
// - temporadas_unidad solo define si una fecha cae en periodo especial
// POST single:
//   { checkIn, checkOut, guests, rateType, unidad_id }
// POST multi:
//   { checkIn, checkOut, rateType, unidades: [{ unidad_id, num_huespedes }] }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

async function calcularPrecioUnidad(
  supabase: any,
  unidad_id: string,
  checkIn: string,
  checkOut: string,
  numHuespedes: number,
  rateType: string
) {
  const nights = Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (nights < 1) {
    throw new Error('Invalid date range');
  }

  // 1. Obtener la unidad con precios base y especiales
  const { data: unidad, error: unidadError } = await supabase
    .from('unidades')
    .select(`
      id,
      nombre,
      slug,
      capacidad_base,
      capacidad_maxima,
      precio_noche,
      extra_huesped_noche,
      tarifa_limpieza,
      precio_noche_especial,
      extra_huesped_especial,
      tarifa_limpieza_especial,
      min_noches,
      min_noches_especial
    `)
    .eq('id', unidad_id)
    .single();

  if (unidadError || !unidad) {
    throw new Error(`Unidad ${unidad_id} no encontrada`);
  }

  // 2. Verificar si la fecha de entrada cae en una temporada especial activa
  const { data: temporadaEspecial, error: temporadaError } = await supabase
    .from('temporadas_unidad')
    .select('id, nombre, fecha_inicio, fecha_fin, activa')
    .eq('unidad_id', unidad_id)
    .eq('activa', true)
    .lte('fecha_inicio', checkIn)
    .gte('fecha_fin', checkIn)
    .order('fecha_inicio', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (temporadaError) {
    throw temporadaError;
  }

  const esEspecial = !!temporadaEspecial;

  // 3. Elegir tarifas BASE o ESPECIAL según corresponda
  const precioNoche = esEspecial
    ? Number(unidad.precio_noche_especial ?? unidad.precio_noche ?? 0)
    : Number(unidad.precio_noche ?? 0);

  const extraHuesped = esEspecial
    ? Number(unidad.extra_huesped_especial ?? unidad.extra_huesped_noche ?? 0)
    : Number(unidad.extra_huesped_noche ?? 0);

  const limpieza = esEspecial
    ? Number(unidad.tarifa_limpieza_especial ?? unidad.tarifa_limpieza ?? 0)
    : Number(unidad.tarifa_limpieza ?? 0);

  const minNoches = esEspecial
    ? Number(unidad.min_noches_especial ?? unidad.min_noches ?? 1)
    : Number(unidad.min_noches ?? 1);

  if (!precioNoche || precioNoche <= 0) {
    throw new Error(`La unidad ${unidad.nombre} no tiene precio base válido`);
  }

  // 4. Validar estancia mínima
  if (nights < minNoches) {
    throw new Error(`Estancia mínima para ${unidad.nombre}: ${minNoches} noches`);
  }

  // 5. Cálculo económico
  const extraHuespedes = Math.max(0, numHuespedes - Number(unidad.capacidad_base ?? 0));
  const importeAlojamiento = round2(precioNoche * nights);
  const importeExtra = round2(extraHuespedes * extraHuesped * nights);

  let descuento = 0;
  if (rateType === 'NON_REFUNDABLE' || rateType === 'NO_REEMBOLSABLE') {
    descuento = round2((importeAlojamiento + importeExtra) * 0.10);
  }

  const subtotal = round2(importeAlojamiento + importeExtra + limpieza - descuento);

  return {
    unidad_id,
    unidad_nombre: unidad.nombre,
    unidad_slug: unidad.slug,
    nights,
    num_huespedes: numHuespedes,
    extra_guests: extraHuespedes,
    season: esEspecial ? (temporadaEspecial?.nombre ?? 'ESPECIAL') : 'BASE',
    temporada_id: temporadaEspecial?.id ?? null,
    precio_noche: precioNoche,
    extra_huesped: extraHuesped,
    importe_alojamiento: importeAlojamiento,
    importe_extra: importeExtra,
    limpieza: round2(limpieza),
    descuento,
    subtotal,
    total: subtotal,
    desglose: {
      noches: nights,
      precio_noche: precioNoche,
      extra_huesped: extraHuesped,
      num_extras: extraHuespedes,
      limpieza: round2(limpieza),
      descuento,
      temporada_id: temporadaEspecial?.id ?? null,
      season_type: esEspecial ? 'ESPECIAL' : 'BASE',
      season_name: esEspecial ? (temporadaEspecial?.nombre ?? 'ESPECIAL') : 'BASE',
    },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json();
    const { checkIn, checkOut, rateType } = body;

    if (!checkIn || !checkOut || !rateType) {
      return jsonResponse(
        { error: 'Missing required fields: checkIn, checkOut, rateType' },
        400
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ─────────────────────────────────────────────────────────────
    // MODO MULTI-UNIDAD
    // body.unidades = [{ unidad_id, num_huespedes }]
    // ─────────────────────────────────────────────────────────────
    if (Array.isArray(body.unidades) && body.unidades.length > 0) {
      const unidades = body.unidades as Array<{
        unidad_id: string;
        num_huespedes: number;
      }>;

      const desglosePorUnidad = await Promise.all(
        unidades.map((u) =>
          calcularPrecioUnidad(
            supabase,
            u.unidad_id,
            checkIn,
            checkOut,
            u.num_huespedes,
            rateType
          )
        )
      );

      const totalHuespedes = unidades.reduce((s, u) => s + Number(u.num_huespedes || 0), 0);
      const totalAlojamiento = round2(
        desglosePorUnidad.reduce((s, u) => s + Number(u.importe_alojamiento || 0), 0)
      );
      const totalExtra = round2(
        desglosePorUnidad.reduce((s, u) => s + Number(u.importe_extra || 0), 0)
      );
      const totalLimpieza = round2(
        desglosePorUnidad.reduce((s, u) => s + Number(u.limpieza || 0), 0)
      );
      const totalDescuento = round2(
        desglosePorUnidad.reduce((s, u) => s + Number(u.descuento || 0), 0)
      );
      const total = round2(
        desglosePorUnidad.reduce((s, u) => s + Number(u.subtotal || 0), 0)
      );

      const pctSenal = 0.30;
      const importeSenal =
        rateType === 'FLEXIBLE' ? round2(total * pctSenal) : null;

      return jsonResponse({
        mode: 'multi',
        checkIn,
        checkOut,
        nights: desglosePorUnidad[0]?.nights ?? 0,
        num_huespedes: totalHuespedes,
        rate_type: rateType,
        unidades: desglosePorUnidad,
        importe_alojamiento: totalAlojamiento,
        importe_extras: totalExtra,
        importe_limpieza: totalLimpieza,
        descuento_aplicado: totalDescuento,
        importe_total: total,
        importe_senal: importeSenal,
        importe_resto: importeSenal !== null ? round2(total - importeSenal) : null,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // MODO UNIDAD ÚNICA
    // body: { unidad_id, guests }
    // ─────────────────────────────────────────────────────────────
    const { unidad_id, guests } = body;

    if (!unidad_id || !guests) {
      return jsonResponse(
        { error: 'Missing unidad_id and guests (or unidades array)' },
        400
      );
    }

    const resultado = await calcularPrecioUnidad(
      supabase,
      unidad_id,
      checkIn,
      checkOut,
      guests,
      rateType
    );

    const pctSenal = 0.30;
    const importeSenal =
      rateType === 'FLEXIBLE' ? round2(resultado.subtotal * pctSenal) : null;

    return jsonResponse({
      mode: 'single',
      ...resultado,
      importe_total: resultado.subtotal,
      importe_senal: importeSenal,
      importe_resto: importeSenal !== null ? round2(resultado.subtotal - importeSenal) : null,
    });
  } catch (err: any) {
    console.error('calculate-price error:', err);
    return jsonResponse(
      {
        error: err?.message ?? 'Internal server error',
      },
      500
    );
  }
});
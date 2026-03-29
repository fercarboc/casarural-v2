// supabase/functions/calculate-price/index.ts  [v2]
// Calcula el precio de una o varias unidades para un rango de fechas
// POST { checkIn, checkOut, guests, rateType, unidad_id, property_id }
// POST { checkIn, checkOut, rateType, unidades: [{unidad_id, num_huespedes}], property_id }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Calcula el precio de UNA unidad para un rango de fechas
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
  if (nights < 1) throw new Error('Invalid date range');

  // Obtener unidad
  const { data: unidad } = await supabase
    .from('unidades')
    .select('id, nombre, slug, capacidad_base, capacidad_maxima')
    .eq('id', unidad_id)
    .single();

  if (!unidad) throw new Error(`Unidad ${unidad_id} no encontrada`);

  // Detectar temporada activa que cubre la fecha de entrada
  const { data: temporada } = await supabase
    .from('temporadas_unidad')
    .select('*')
    .eq('unidad_id', unidad_id)
    .eq('activa', true)
    .lte('fecha_inicio', checkIn)
    .gte('fecha_fin', checkIn)
    .limit(1)
    .maybeSingle();

  // Si no hay temporada configurada, usar defaults razonables
  const precioNoche    = temporada?.precio_noche        ?? 300;
  const extraHuesped   = temporada?.extra_huesped_noche ?? 30;
  const limpieza       = temporada?.tarifa_limpieza     ?? 60;
  const minNoches      = temporada?.min_noches          ?? 1;

  // Validar estancia mínima
  if (nights < minNoches) {
    throw new Error(`Estancia mínima para esta unidad: ${minNoches} noches`);
  }

  const extraHuespedes     = Math.max(0, numHuespedes - unidad.capacidad_base);
  const importeAlojamiento = precioNoche * nights;
  const importeExtra       = extraHuespedes * extraHuesped * nights;

  let descuento = 0;
  if (rateType === 'NON_REFUNDABLE' || rateType === 'NO_REEMBOLSABLE') {
    // Descuento del 10% por defecto (puede configurarse por property en el futuro)
    descuento = (importeAlojamiento + importeExtra) * 0.10;
  }

  const subtotal = importeAlojamiento + importeExtra + limpieza - descuento;

  return {
    unidad_id,
    unidad_nombre:       unidad.nombre,
    unidad_slug:         unidad.slug,
    nights,
    num_huespedes:       numHuespedes,
    extra_guests:        extraHuespedes,
    season:              temporada?.nombre ?? 'BASE',
    temporada_id:        temporada?.id ?? null,
    precio_noche:        precioNoche,
    extra_huesped:       extraHuesped,
    importe_alojamiento: importeAlojamiento,
    importe_extra:       importeExtra,
    limpieza,
    descuento,
    subtotal,
    // Desglose para guardar en reserva_unidades.desglose
    desglose: {
      noches:           nights,
      precio_noche:     precioNoche,
      extra_huesped:    extraHuesped,
      num_extras:       extraHuespedes,
      limpieza,
      descuento,
      temporada_id:     temporada?.id ?? null,
    },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { checkIn, checkOut, rateType, property_id } = body;

    if (!checkIn || !checkOut || !rateType) {
      return Response.json({ error: 'Missing required fields: checkIn, checkOut, rateType' }, { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ── Modo multi-unidad: array de unidades ──────────────────────────────
    if (body.unidades?.length) {
      const { unidades } = body; // [{ unidad_id, num_huespedes }]

      const desglosePorUnidad = await Promise.all(
        unidades.map((u: { unidad_id: string; num_huespedes: number }) =>
          calcularPrecioUnidad(supabase, u.unidad_id, checkIn, checkOut, u.num_huespedes, rateType)
        )
      );

      const totalHuespedes   = unidades.reduce((s: number, u: any) => s + u.num_huespedes, 0);
      const totalAlojamiento = desglosePorUnidad.reduce((s, u) => s + u.importe_alojamiento, 0);
      const totalExtra       = desglosePorUnidad.reduce((s, u) => s + u.importe_extra, 0);
      const totalLimpieza    = desglosePorUnidad.reduce((s, u) => s + u.limpieza, 0);
      const totalDescuento   = desglosePorUnidad.reduce((s, u) => s + u.descuento, 0);
      const total            = desglosePorUnidad.reduce((s, u) => s + u.subtotal, 0);

      // Señal: 30% del total para FLEXIBLE
      const pctSenal    = 0.30;
      const importeSenal = rateType === 'FLEXIBLE' ? total * pctSenal : null;

      return Response.json({
        mode:                'multi',
        checkIn,
        checkOut,
        nights:              desglosePorUnidad[0]?.nights ?? 0,
        num_huespedes:       totalHuespedes,
        rate_type:           rateType,
        unidades:            desglosePorUnidad,
        importe_alojamiento: totalAlojamiento,
        importe_extras:      totalExtra,
        importe_limpieza:    totalLimpieza,
        descuento_aplicado:  totalDescuento,
        importe_total:       total,
        importe_senal:       importeSenal,
        importe_resto:       importeSenal ? total - importeSenal : null,
      }, { headers: corsHeaders });
    }

    // ── Modo unidad única ─────────────────────────────────────────────────
    const { unidad_id, guests } = body;
    if (!unidad_id || !guests) {
      return Response.json({ error: 'Missing unidad_id and guests (or unidades array)' }, { status: 400, headers: corsHeaders });
    }

    const resultado = await calcularPrecioUnidad(supabase, unidad_id, checkIn, checkOut, guests, rateType);

    const pctSenal    = 0.30;
    const importeSenal = rateType === 'FLEXIBLE' ? resultado.subtotal * pctSenal : null;

    return Response.json({
      mode:                'single',
      ...resultado,
      importe_total:       resultado.subtotal,
      importe_senal:       importeSenal,
      importe_resto:       importeSenal ? resultado.subtotal - importeSenal : null,
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('calculate-price error:', err);
    return Response.json({ error: err.message ?? 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
});
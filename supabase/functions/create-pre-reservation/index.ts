// supabase/functions/create-pre-reservation/index.ts
// v2 — endurecida
// Crea pre-reserva + reserva_unidades + reservation_holds
// POST {
//   checkIn, checkOut, rateType,
//   unidades: [{ unidad_id, num_huespedes }],
//   guestData: { nombre_cliente, apellidos_cliente, email_cliente, telefono_cliente, nif_cliente? }
// }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-host, host',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function normalizeRateType(rateType: string): 'FLEXIBLE' | 'NO_REEMBOLSABLE' {
  const normalized = String(rateType || '').trim().toUpperCase();

  if (normalized === 'FLEXIBLE') return 'FLEXIBLE';
  if (normalized === 'NON_REFUNDABLE' || normalized === 'NO_REEMBOLSABLE') {
    return 'NO_REEMBOLSABLE';
  }

  throw new Error(`rateType inválido: ${rateType}`);
}

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { checkIn, checkOut, unidades, guestData } = body;
    const rateType = normalizeRateType(body.rateType);

    if (!checkIn || !checkOut || !unidades?.length || !guestData?.email_cliente) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const baseUrl = Deno.env.get('SUPABASE_URL')!;
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fnHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${svcKey}`,
    };

    const property_id = await resolvePropertyId(req, supabase);
    if (!property_id) {
      return new Response(
        JSON.stringify({ error: 'Unable to resolve property context in backend' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    
    const unidadIds = unidades.map((u: any) => u.unidad_id);

    // =========================================================
    // 1. Validar que las unidades pertenecen a la propiedad activa
    // =========================================================
    const { data: unidadesDb, error: unidadesError } = await supabase
      .from('unidades')
      .select('id, property_id, nombre')
      .in('id', unidadIds);

    if (unidadesError) throw unidadesError;

    if (!unidadesDb || unidadesDb.length !== unidadIds.length) {
      return new Response(
        JSON.stringify({ error: 'Una o más unidades no existen' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const invalidUnit = unidadesDb.find((u: any) => u.property_id !== property_id);
    if (invalidUnit) {
      return new Response(
        JSON.stringify({ error: `La unidad ${invalidUnit.nombre} no pertenece a la propiedad activa` }),
        { status: 400, headers: corsHeaders }
      );
    }

    // =========================================================
    // 2. Verificar disponibilidad real
    // =========================================================
    const availRes = await fetch(`${baseUrl}/functions/v1/check-availability`, {
      method: 'POST',
      headers: fnHeaders,
      body: JSON.stringify({
        checkIn,
        checkOut,
        unidad_ids: unidadIds,
      }),
    });

    if (!availRes.ok) {
      const errText = await availRes.text();
      throw new Error(`check-availability failed: ${availRes.status} ${errText}`);
    }

    const avail = await availRes.json();

    if (!avail.available) {
      const bloqueadas = avail.per_unit
        ? Object.entries(avail.per_unit)
            .filter(([, v]) => !v)
            .map(([k]) => k)
        : [];

      return new Response(
        JSON.stringify({
          error: 'Una o más unidades no están disponibles',
          unidades_bloqueadas: bloqueadas,
        }),
        { status: 409, headers: corsHeaders }
      );
    }

    // =========================================================
    // 3. Recalcular precio en backend
    // =========================================================
    const priceRes = await fetch(`${baseUrl}/functions/v1/calculate-price`, {
      method: 'POST',
      headers: fnHeaders,
      body: JSON.stringify({
        checkIn,
        checkOut,
        rateType,
        unidades,
      }),
    });

    if (!priceRes.ok) {
      const errText = await priceRes.text();
      throw new Error(`calculate-price failed: ${priceRes.status} ${errText}`);
    }

    const price = await priceRes.json();

    if (price.error) {
      return new Response(
        JSON.stringify({ error: price.error }),
        { status: 400, headers: corsHeaders }
      );
    }

    // =========================================================
    // 4. Crear reserva principal
    // =========================================================
    const numHuespedesTotal = unidades.reduce(
      (s: number, u: any) => s + Number(u.num_huespedes || 0),
      0
    );

    const importeTotal = Number(price.importe_total ?? 0);
    const importeBase = round2(importeTotal / 1.10);
    const importeIva = round2(importeTotal - importeBase);

    const { data: reserva, error: reservaError } = await supabase
      .from('reservas')
      .insert({
        property_id,
        fecha_entrada: checkIn,
        fecha_salida: checkOut,
        num_huespedes: numHuespedesTotal,
        nombre_cliente: guestData.nombre_cliente ?? '',
        apellidos_cliente: guestData.apellidos_cliente ?? '',
        email_cliente: guestData.email_cliente,
        telefono_cliente: guestData.telefono_cliente ?? '',
        nif_cliente: guestData.nif_cliente ?? '',
        tarifa: rateType,
        importe_alojamiento: price.importe_alojamiento,
        importe_extras: price.importe_extras,
        importe_limpieza: price.importe_limpieza,
        descuento_aplicado: price.descuento_aplicado,
        importe_total: importeTotal,
        importe_senal: price.importe_senal,
        importe_resto: price.importe_resto,
        iva_porcentaje: 10,
        importe_iva: importeIva,
        importe_base: importeBase,
        estado: 'PENDING_PAYMENT',
        estado_pago: 'UNPAID',
        origen: 'DIRECT_WEB',
        expires_at: expiresAt,
      })
      .select('id, token_cliente')
      .single();

    if (reservaError) throw reservaError;

    // =========================================================
    // 5. Crear reserva_unidades
    // =========================================================
    const reservaUnidadesRows = unidades.map((u: any) => {
      const precioUnidad = price.unidades?.find((p: any) => p.unidad_id === u.unidad_id);

      return {
        reserva_id: reserva.id,
        unidad_id: u.unidad_id,
        num_huespedes: u.num_huespedes,
        importe: precioUnidad?.subtotal ?? 0,
        desglose: precioUnidad?.desglose ?? {},
      };
    });

    const { error: ruError } = await supabase
      .from('reserva_unidades')
      .insert(reservaUnidadesRows);

    if (ruError) {
      await supabase.from('reservas').delete().eq('id', reserva.id);
      throw ruError;
    }

    // =========================================================
    // 6. Crear reservation_holds (CRÍTICO)
    // =========================================================
    const holdRows = unidades.map((u: any) => ({
      property_id,
      unidad_id: u.unidad_id,
      fecha_inicio: checkIn,
      fecha_fin: checkOut,
      expires_at: expiresAt,
    }));

    const { error: holdError } = await supabase
      .from('reservation_holds')
      .insert(holdRows);

    if (holdError) {
      // Rollback completo
      await supabase.from('reserva_unidades').delete().eq('reserva_id', reserva.id);
      await supabase.from('reservas').delete().eq('id', reserva.id);
      throw holdError;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        property_id,
        reserva_id: reserva.id,
        token_cliente: reserva.token_cliente,
        expires_at: expiresAt,
        price,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error('create-pre-reservation error:', err);
    return new Response(
      JSON.stringify({ error: err.message ?? 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
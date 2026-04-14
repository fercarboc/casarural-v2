// supabase/functions/create-pre-reservation/index.ts
// v2 — corregida para multi-tenant real y resolución correcta de property_id
//
// CAMBIOS CLAVE:
// - Prioridad de contexto:
//   1. body.property_id
//   2. header x-property-id
//   3. dominio (x-forwarded-host / host, sin puerto)
//   4. PROPERTY_ID / VITE_PROPERTY_ID como último fallback
// - Se añade debug temporal en el error de validación de unidad/property
// - Se mantiene compatibilidad con payload nuevo y legacy

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-forwarded-host, host, x-property-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function normalizeTarifa(rateType: string): 'FLEXIBLE' | 'NO_REEMBOLSABLE' {
  const v = String(rateType || '').trim().toUpperCase();
  if (v === 'FLEXIBLE') return 'FLEXIBLE';
  if (v === 'NON_REFUNDABLE' || v === 'NO_REEMBOLSABLE') return 'NO_REEMBOLSABLE';
  throw new Error(`rateType inválido: ${rateType}`);
}

async function resolvePropertyId(
  req: Request,
  body: any,
  supabase: any
): Promise<string | null> {
  // 1) Prioridad máxima: property_id enviado explícitamente por frontend
  const bodyPropertyId =
    typeof body?.property_id === 'string' && body.property_id.trim()
      ? body.property_id.trim()
      : null;
  if (bodyPropertyId) return bodyPropertyId;

  // 2) Header explícito
  const forced = req.headers.get('x-property-id');
  if (forced?.trim()) return forced.trim();

  // 3) Resolver por dominio, limpiando puerto
  const rawHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const host = rawHost.split(':')[0].trim().toLowerCase();

  if (host) {
    const { data, error } = await supabase
      .from('custom_domains')
      .select('property_id')
      .eq('domain', host)
      .maybeSingle();

    if (error) {
      console.error('resolvePropertyId: custom_domains error', error);
    }

    if (data?.property_id) return data.property_id;
  }

  // 4) Último fallback solo para desarrollo legado
  return Deno.env.get('PROPERTY_ID') || Deno.env.get('VITE_PROPERTY_ID') || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // ── Compatibilidad de parámetros ─────────────────────────────────────────
    const checkIn = body.fecha_entrada ?? body.checkIn;
    const checkOut = body.fecha_salida ?? body.checkOut;
    const unidades = body.unidades; // [{ unidad_id, num_huespedes, extras_manuales? }]
    const guestData = body.guestData;
    const tarifa = normalizeTarifa(body.tarifa ?? body.rateType ?? 'FLEXIBLE');
    const numHuespedes =
      body.num_huespedes ??
      unidades?.reduce((s: number, u: any) => s + Number(u.num_huespedes || 0), 0) ??
      0;

    if (!checkIn || !checkOut || !unidades?.length || !guestData?.email_cliente) {
      return new Response(
        JSON.stringify({
          error: 'Faltan campos obligatorios',
          required:
            'fecha_entrada (o checkIn), fecha_salida (o checkOut), unidades[], guestData.email_cliente',
        }),
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

    const property_id = await resolvePropertyId(req, body, supabase);
    if (!property_id) {
      return new Response(
        JSON.stringify({
          error: 'No se pudo resolver el contexto de propiedad',
          debug: {
            body_property_id: body?.property_id ?? null,
            x_property_id: req.headers.get('x-property-id'),
            forwarded_host: req.headers.get('x-forwarded-host'),
            host: req.headers.get('host'),
          },
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const unidadIds = unidades.map((u: any) => u.unidad_id);

    // =========================================================
    // 1. Validar que las unidades pertenecen a la propiedad
    // =========================================================
    const { data: unidadesDb, error: unidadesError } = await supabase
      .from('unidades')
      .select('id, property_id, nombre, activa')
      .in('id', unidadIds);

    if (unidadesError) throw unidadesError;

    if (!unidadesDb || unidadesDb.length !== unidadIds.length) {
      return new Response(
        JSON.stringify({
          error: 'Una o más unidades no existen',
          debug: {
            property_id_resuelta: property_id,
            unidad_ids_enviadas: unidadIds,
            unidades_encontradas: unidadesDb?.map((u: any) => u.id) ?? [],
          },
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const unitInvalida = unidadesDb.find((u: any) => u.property_id !== property_id);
    if (unitInvalida) {
      return new Response(
        JSON.stringify({
          error: `La unidad "${unitInvalida.nombre}" no pertenece a esta propiedad`,
          debug: {
            property_id_resuelta: property_id,
            unidad_id: unitInvalida.id,
            unidad_property_id: unitInvalida.property_id,
            unidad_nombre: unitInvalida.nombre,
          },
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const unitInactiva = unidadesDb.find((u: any) => !u.activa);
    if (unitInactiva) {
      return new Response(
        JSON.stringify({
          error: `La unidad "${unitInactiva.nombre}" no está activa`,
        }),
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
        property_id,
        fecha_entrada: checkIn,
        fecha_salida: checkOut,
        unidad_ids: unidadIds,
      }),
    });

    if (!availRes.ok) {
      const errText = await availRes.text();
      throw new Error(`check-availability falló: ${availRes.status} ${errText}`);
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
        property_id,
        fecha_entrada: checkIn,
        fecha_salida: checkOut,
        num_huespedes: numHuespedes,
        tarifa,
        unidades: unidades.map((u: any) => ({
          unidad_id: u.unidad_id,
          extras_manuales: u.extras_manuales ?? 0,
        })),
      }),
    });

    if (!priceRes.ok) {
      const errText = await priceRes.text();
      throw new Error(`calculate-price falló: ${priceRes.status} ${errText}`);
    }

    const price = await priceRes.json();

    if (price.error) {
      return new Response(JSON.stringify({ error: price.error }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // =========================================================
    // 4. Crear reserva principal
    // =========================================================
    const importeTotal = Number(price.importe_total ?? 0);
    const importeBase = round2(importeTotal / 1.1);
    const importeIva = round2(importeTotal - importeBase);

    const { data: reserva, error: reservaError } = await supabase
      .from('reservas')
      .insert({
        property_id,
        fecha_entrada: checkIn,
        fecha_salida: checkOut,
        num_huespedes: numHuespedes,
        nombre_cliente: guestData.nombre_cliente ?? '',
        apellidos_cliente: guestData.apellidos_cliente ?? '',
        email_cliente: guestData.email_cliente,
        telefono_cliente: guestData.telefono_cliente ?? '',
        nif_cliente: guestData.nif_cliente ?? '',
        tarifa,
        importe_alojamiento: price.importe_alojamiento_total ?? 0,
        importe_extras: price.importe_extras_total ?? 0,
        importe_limpieza: price.importe_limpieza_total ?? 0,
        descuento_aplicado: price.descuento_aplicado ?? 0,
        importe_base: importeBase,
        iva_porcentaje: 10,
        importe_iva: importeIva,
        importe_total: importeTotal,
        importe_senal: price.importe_senal ?? 0,
        importe_resto: price.importe_resto ?? 0,
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
        num_huespedes: u.num_huespedes ?? precioUnidad?.num_huespedes_asignados ?? 0,
        importe: precioUnidad?.importe_subtotal ?? 0,
        desglose: {
          noches: precioUnidad?.noches ?? 0,
          precio_noche: precioUnidad?.precio_noche ?? 0,
          extra_huesped: precioUnidad?.extra_huesped_noche ?? 0,
          num_extras: precioUnidad?.extras_asignados ?? 0,
          limpieza: precioUnidad?.importe_limpieza ?? 0,
          descuento: price.descuento_aplicado ?? 0,
          temporada_id: precioUnidad?.temporada_id ?? null,
          temporada_nombre: precioUnidad?.temporada_nombre ?? 'Base',
          es_especial: precioUnidad?.es_especial ?? false,
        },
      };
    });

    const { error: ruError } = await supabase.from('reserva_unidades').insert(reservaUnidadesRows);

    if (ruError) {
      await supabase.from('reservas').delete().eq('id', reserva.id);
      throw ruError;
    }

    // =========================================================
    // 6. Crear reservation_holds
    // =========================================================
    const holdRows = unidades.map((u: any) => ({
      property_id,
      unidad_id: u.unidad_id,
      fecha_inicio: checkIn,
      fecha_fin: checkOut,
      expires_at: expiresAt,
    }));

    const { error: holdError } = await supabase.from('reservation_holds').insert(holdRows);

    if (holdError) {
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
// supabase/functions/create-pre-reservation/index.ts  [v2]
// Crea pre-reserva + reserva_unidades en PENDING_PAYMENT
// POST {
//   checkIn, checkOut, rateType, property_id,
//   unidades: [{ unidad_id, num_huespedes }],
//   guestData: { nombre_cliente, apellidos_cliente, email_cliente, telefono_cliente, nif_cliente? }
// }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { checkIn, checkOut, rateType, property_id, unidades, guestData } = await req.json();

    if (!checkIn || !checkOut || !rateType || !property_id || !unidades?.length || !guestData?.email_cliente) {
      return Response.json({ error: 'Missing required fields' }, { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const baseUrl = Deno.env.get('SUPABASE_URL')!;
    const svcKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const headers  = { 'Content-Type': 'application/json', Authorization: `Bearer ${svcKey}` };

    const unidadIds = unidades.map((u: any) => u.unidad_id);

    // 1. Verificar disponibilidad de todas las unidades
    const availRes = await fetch(`${baseUrl}/functions/v1/check-availability`, {
      method: 'POST', headers,
      body: JSON.stringify({ checkIn, checkOut, unidad_ids: unidadIds }),
    });
    const avail = await availRes.json();

    if (!avail.available) {
      const bloqueadas = avail.per_unit
        ? Object.entries(avail.per_unit)
            .filter(([, v]) => !v)
            .map(([k]) => k)
        : [];
      return Response.json(
        { error: 'Una o más unidades no están disponibles', unidades_bloqueadas: bloqueadas },
        { status: 409, headers: corsHeaders }
      );
    }

    // 2. Calcular precio total
    const priceRes = await fetch(`${baseUrl}/functions/v1/calculate-price`, {
      method: 'POST', headers,
      body: JSON.stringify({ checkIn, checkOut, rateType, property_id, unidades }),
    });
    const price = await priceRes.json();
    if (price.error) return Response.json({ error: price.error }, { status: 400, headers: corsHeaders });

    // 3. Crear reserva principal
    const numHuespedesTotal = unidades.reduce((s: number, u: any) => s + u.num_huespedes, 0);
    const tarifaDB = (rateType === 'NON_REFUNDABLE' || rateType === 'NO_REEMBOLSABLE')
      ? 'NO_REEMBOLSABLE'
      : 'FLEXIBLE';

    const { data: reserva, error: reservaError } = await supabase
      .from('reservas')
      .insert({
        property_id,
        fecha_entrada:       checkIn,
        fecha_salida:        checkOut,
        num_huespedes:       numHuespedesTotal,
        nombre_cliente:      guestData.nombre_cliente,
        apellidos_cliente:   guestData.apellidos_cliente ?? '',
        email_cliente:       guestData.email_cliente,
        telefono_cliente:    guestData.telefono_cliente ?? '',
        nif_cliente:         guestData.nif_cliente ?? '',
        tarifa:              tarifaDB,
        importe_alojamiento: price.importe_alojamiento,
        importe_extras:      price.importe_extras,
        importe_limpieza:    price.importe_limpieza,
        descuento_aplicado:  price.descuento_aplicado,
        importe_total:       price.importe_total,
        importe_senal:       price.importe_senal,
        importe_resto:       price.importe_resto,
        iva_porcentaje:      10,
        importe_iva:         Math.round(price.importe_total * 0.10 * 100) / 100,
        importe_base:        Math.round(price.importe_total / 1.10 * 100) / 100,
        estado:              'PENDING_PAYMENT',
        estado_pago:         'UNPAID',
        origen:              'DIRECT_WEB',
        expires_at:          new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      .select('id, token_cliente')
      .single();

    if (reservaError) throw reservaError;

    // 4. Crear reserva_unidades (tabla pivote)
    const reservaUnidadesRows = unidades.map((u: any) => {
      const precioUnidad = price.unidades?.find((p: any) => p.unidad_id === u.unidad_id);
      return {
        reserva_id:    reserva.id,
        unidad_id:     u.unidad_id,
        num_huespedes: u.num_huespedes,
        importe:       precioUnidad?.subtotal ?? 0,
        desglose:      precioUnidad?.desglose ?? {},
      };
    });

    const { error: ruError } = await supabase
      .from('reserva_unidades')
      .insert(reservaUnidadesRows);

    if (ruError) {
      // Rollback: eliminar reserva si falla la creación del pivote
      await supabase.from('reservas').delete().eq('id', reserva.id);
      throw ruError;
    }

    return Response.json({
      reserva_id:    reserva.id,
      token_cliente: reserva.token_cliente,
      price,
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('create-pre-reservation error:', err);
    return Response.json({ error: err.message ?? 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
});
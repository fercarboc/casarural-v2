// supabase/functions/create-stripe-checkout/index.ts
// v3 — cobro directo en la cuenta conectada del cliente
// POST { reservaId, appUrl? }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/**
 * Resuelve la URL base para success_url y cancel_url de Stripe.
 *
 * Orden de precedencia:
 *  1. appUrl enviado por el frontend en el body
 *  2. APP_URL en Secrets de Supabase
 */
function resolveAppUrl(appUrlFromBody?: string): string {
  const raw = (appUrlFromBody || getRequiredEnv('APP_URL')).trim().replace(/\/$/, '');
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Invalid app URL: ${raw}`);
  }

  const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !isLocalhost) {
    throw new Error(`APP_URL must use https in non-local environments: ${raw}`);
  }

  return parsed.origin;
}

function toAmount(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = getRequiredEnv('SUPABASE_URL');
    const supabaseServiceKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const stripeSecretKey = getRequiredEnv('STRIPE_SECRET_KEY');

    let payload: { reservaId?: string; appUrl?: string };
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const { reservaId, appUrl: appUrlFromBody } = payload;

    if (!reservaId) {
      return jsonResponse({ error: 'Missing reservaId' }, 400);
    }

    const appUrl = resolveAppUrl(appUrlFromBody);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });

    const { data: reserva, error: reservaError } = await supabase
      .from('reservas')
      .select(`
        id,
        tarifa,
        estado,
        estado_pago,
        importe_total,
        importe_senal,
        importe_alojamiento,
        importe_extras,
        importe_limpieza,
        descuento_aplicado,
        noches,
        num_huespedes,
        fecha_entrada,
        fecha_salida,
        email_cliente,
        nombre_cliente,
        apellidos_cliente,
        token_cliente,
        property_id
      `)
      .eq('id', reservaId)
      .single();

    if (reservaError || !reserva) {
      return jsonResponse({ error: 'Reserva no encontrada' }, 404);
    }

    if (!['PENDING_PAYMENT', 'CONFIRMED'].includes(reserva.estado)) {
      return jsonResponse(
        { error: 'La reserva no acepta pagos en su estado actual' },
        400,
      );
    }

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, nombre, stripe_account_id, stripe_charges_enabled')
      .eq('id', reserva.property_id)
      .single();

    if (propertyError || !property) {
      return jsonResponse({ error: 'Propiedad no encontrada' }, 404);
    }

    if (!property.stripe_account_id) {
      return jsonResponse(
        { error: 'La propiedad no tiene cuenta Stripe conectada' },
        400,
      );
    }

    if (!property.stripe_charges_enabled) {
      return jsonResponse(
        { error: 'La cuenta Stripe del cliente aún no tiene cobros habilitados' },
        400,
      );
    }

    const connectedAccountId = property.stripe_account_id;
    const propNombre = property.nombre ?? 'Casa Rural';

    const isFlexibleSenal =
      reserva.tarifa === 'FLEXIBLE' && reserva.estado === 'PENDING_PAYMENT';

    const isFlexibleResto =
      reserva.estado === 'CONFIRMED' && reserva.estado_pago === 'PARTIAL';

    let importePago = 0;
    let esSenal = false;
    let esResto = false;

    if (isFlexibleSenal) {
      importePago = toAmount(reserva.importe_senal);
      esSenal = true;
    } else if (isFlexibleResto) {
      importePago = toAmount(reserva.importe_total) - toAmount(reserva.importe_senal);
      esResto = true;
    } else {
      importePago = toAmount(reserva.importe_total);
    }

    if (!Number.isFinite(importePago) || importePago <= 0) {
      return jsonResponse({ error: 'Importe de pago inválido' }, 400);
    }

    const noches = Number(reserva.noches ?? 0);
    const numHuespedes = Number(reserva.num_huespedes ?? 0);

    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (esSenal) {
      lineItems = [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Señal — ${propNombre} (${noches} noche${noches > 1 ? 's' : ''})`,
              description:
                `Estancia ${reserva.fecha_entrada} → ${reserva.fecha_salida} · ` +
                `${numHuespedes} huésped${numHuespedes !== 1 ? 'es' : ''}. ` +
                `Resto: ${(toAmount(reserva.importe_total) - importePago).toFixed(2)} €`,
            },
            unit_amount: Math.round(importePago * 100),
          },
          quantity: 1,
        },
      ];
    } else if (esResto) {
      lineItems = [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Resto — ${propNombre} (${noches} noche${noches > 1 ? 's' : ''})`,
              description:
                `Pago final estancia ${reserva.fecha_entrada} → ${reserva.fecha_salida}`,
            },
            unit_amount: Math.round(importePago * 100),
          },
          quantity: 1,
        },
      ];
    } else {
      const descuento = toAmount(reserva.descuento_aplicado);
      const alojamiento = toAmount(reserva.importe_alojamiento);
      const extras = toAmount(reserva.importe_extras);
      const limpieza = toAmount(reserva.importe_limpieza);
      const alojamientoNeto = alojamiento - descuento;

      if (alojamientoNeto > 0) {
        lineItems.push({
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${propNombre} — ${noches} noche${noches > 1 ? 's' : ''}`,
              description:
                descuento > 0
                  ? `Alojamiento (descuento no reembolsable: -${descuento.toFixed(2)} €)`
                  : 'Alojamiento',
            },
            unit_amount: Math.round(alojamientoNeto * 100),
          },
          quantity: 1,
        });
      }

      if (extras > 0) {
        lineItems.push({
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Suplemento huésped extra',
            },
            unit_amount: Math.round(extras * 100),
          },
          quantity: 1,
        });
      }

      if (limpieza > 0) {
        lineItems.push({
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Tarifa de limpieza',
            },
            unit_amount: Math.round(limpieza * 100),
          },
          quantity: 1,
        });
      }
    }

    if (!lineItems.length) {
      return jsonResponse({ error: 'No se pudieron generar líneas de pago válidas' }, 400);
    }

    // Destination Charge: la sesión se crea en la plataforma con on_behalf_of
    // y transfer_data para que los fondos vayan a la cuenta conectada.
    // El webhook de plataforma recibe checkout.session.completed correctamente.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: reserva.email_cliente,
      line_items: lineItems,
      success_url: `${appUrl}/reserva/confirmada?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/reserva/cancelada`,
      metadata: {
        reserva_id: String(reserva.id),
        property_id: String(reserva.property_id),
        tarifa: String(reserva.tarifa ?? ''),
        es_senal: esSenal ? 'true' : 'false',
        es_resto: esResto ? 'true' : 'false',
      },
      payment_intent_data: {
        on_behalf_of: connectedAccountId,
        transfer_data: { destination: connectedAccountId },
        metadata: {
          reserva_id: String(reserva.id),
          property_id: String(reserva.property_id),
          tarifa: String(reserva.tarifa ?? ''),
          es_senal: esSenal ? 'true' : 'false',
          es_resto: esResto ? 'true' : 'false',
        },
      },
      expires_at: Math.floor(Date.now() / 1000) + 60 * 30,
    });

    const { error: updateError } = await supabase
      .from('reservas')
      .update({
        stripe_session_id: session.id,
      })
      .eq('id', reservaId);

    if (updateError) {
      console.error('Error guardando stripe_session_id en reserva:', updateError);
      return jsonResponse(
        { error: 'Checkout creado pero no se pudo actualizar la reserva' },
        500,
      );
    }

    return jsonResponse({
      checkout_url: session.url,
      session_id: session.id,
      stripe_account_id: connectedAccountId,
    });
  } catch (err) {
    console.error('create-stripe-checkout error:', err);
    return jsonResponse(
      {
        error: 'Internal server error',
        detail: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }
});
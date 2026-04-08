// supabase/functions/create-stripe-checkout/index.ts  [v2]
// POST { reservaId }

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
 *  1. appUrl enviado por el frontend en el body (permite que local devuelva a localhost)
 *  2. Variable de entorno APP_URL configurada en los Secrets de Supabase
 *
 * Env vars necesarias en Supabase → Project Settings → Secrets:
 *  APP_URL = https://casarural-v2.vercel.app   (URL pública de producción, sin barra final)
 *
 * Para desarrollo local, el frontend pasa window.location.origin automáticamente.
 */
function resolveAppUrl(appUrlFromBody?: string): string {
  const raw = (appUrlFromBody || getRequiredEnv('APP_URL')).trim().replace(/\/$/, '');
  let parsed: URL;
  try { parsed = new URL(raw); }
  catch { throw new Error(`Invalid app URL: ${raw}`); }

  const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !isLocalhost) {
    throw new Error(`APP_URL must use https in non-local environments: ${raw}`);
  }
  return parsed.origin;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')   return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl        = getRequiredEnv('SUPABASE_URL');
    const supabaseServiceKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const stripeSecretKey    = getRequiredEnv('STRIPE_SECRET_KEY');

    let payload: { reservaId?: string; appUrl?: string };
    try { payload = await req.json(); }
    catch { return jsonResponse({ error: 'Invalid JSON body' }, 400); }

    const { reservaId, appUrl: appUrlFromBody } = payload;
    if (!reservaId) return jsonResponse({ error: 'Missing reservaId' }, 400);

    const appUrl = resolveAppUrl(appUrlFromBody);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe   = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

    // Usar columnas v2
    const { data: reserva, error } = await supabase
      .from('reservas')
      .select('id, tarifa, estado, estado_pago, importe_total, importe_senal, importe_alojamiento, importe_extras, importe_limpieza, descuento_aplicado, noches, num_huespedes, fecha_entrada, fecha_salida, email_cliente, nombre_cliente, apellidos_cliente, token_cliente, property_id')
      .eq('id', reservaId)
      .single();

    if (error || !reserva) return jsonResponse({ error: 'Reserva no encontrada' }, 404);

    if (!['PENDING_PAYMENT', 'CONFIRMED'].includes(reserva.estado)) {
      return jsonResponse({ error: 'La reserva no acepta pagos en su estado actual' }, 400);
    }

    // CONFIRMED + UNPAID = resto pendiente (reserva creada por admin)
    const isFlexibleResto = reserva.estado === 'CONFIRMED' && reserva.estado_pago === 'PARTIAL';
    const isFlexibleSenal = reserva.tarifa === 'FLEXIBLE'  && reserva.estado === 'PENDING_PAYMENT';

    let importePago: number;
    let esSenal = false;

    if (isFlexibleSenal) {
      importePago = Number(reserva.importe_senal);
      esSenal     = true;
    } else if (isFlexibleResto) {
      importePago = Number(reserva.importe_total) - Number(reserva.importe_senal ?? 0);
    } else {
      importePago = Number(reserva.importe_total);
    }

    if (!Number.isFinite(importePago) || importePago <= 0) {
      return jsonResponse({ error: 'Importe de pago inválido' }, 400);
    }

    // Obtener nombre de la propiedad para las líneas de Stripe
    const { data: property } = await supabase
      .from('properties')
      .select('nombre')
      .eq('id', reserva.property_id)
      .single();
    const propNombre = property?.nombre ?? 'Casa Rural';

    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

    if (esSenal) {
      lineItems = [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Señal — ${propNombre} (${reserva.noches} noche${reserva.noches > 1 ? 's' : ''})`,
            description: `Estancia ${reserva.fecha_entrada} → ${reserva.fecha_salida} · ${reserva.num_huespedes} huéspedes. Resto: ${(Number(reserva.importe_total) - importePago).toFixed(2)} € a abonar antes de la llegada.`,
          },
          unit_amount: Math.round(importePago * 100),
        },
        quantity: 1,
      }];
    } else if (isFlexibleResto) {
      lineItems = [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Resto — ${propNombre} (${reserva.noches} noche${reserva.noches > 1 ? 's' : ''})`,
            description: `Pago final estancia ${reserva.fecha_entrada} → ${reserva.fecha_salida}`,
          },
          unit_amount: Math.round(importePago * 100),
        },
        quantity: 1,
      }];
    } else {
      // Pago total NO_REEMBOLSABLE con desglose
      const descuento      = Number(reserva.descuento_aplicado ?? 0);
      const alojamiento    = Number(reserva.importe_alojamiento ?? 0);
      const extras         = Number(reserva.importe_extras ?? 0);
      const limpieza       = Number(reserva.importe_limpieza ?? 0);
      const alojNetoDscto  = alojamiento - descuento;

      lineItems = [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${propNombre} — ${reserva.noches} noche${reserva.noches > 1 ? 's' : ''}`,
              description: descuento > 0 ? `Alojamiento (−10% no reembolsable: −${descuento.toFixed(2)} €)` : 'Alojamiento',
            },
            unit_amount: Math.round(alojNetoDscto * 100),
          },
          quantity: 1,
        },
        ...(extras > 0 ? [{
          price_data: {
            currency: 'eur',
            product_data: { name: `Suplemento huésped extra` },
            unit_amount: Math.round(extras * 100),
          },
          quantity: 1,
        } as Stripe.Checkout.SessionCreateParams.LineItem] : []),
        {
          price_data: {
            currency: 'eur',
            product_data: { name: 'Tarifa de limpieza' },
            unit_amount: Math.round(limpieza * 100),
          },
          quantity: 1,
        },
      ];
    }

    const session = await stripe.checkout.sessions.create({
      mode:           'payment',
      customer_email: reserva.email_cliente,
      line_items:     lineItems,
      success_url:    `${appUrl}/reserva/confirmada?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:     `${appUrl}/reserva/cancelada`,
      metadata: {
        reserva_id: String(reserva.id),
        tarifa:     String(reserva.tarifa ?? ''),
        es_senal:   esSenal ? 'true' : 'false',
      },
      expires_at: Math.floor(Date.now() / 1000) + 60 * 30,
      payment_intent_data: {
        metadata: { reserva_id: String(reserva.id) },
      },
    });

    await supabase
      .from('reservas')
      .update({ stripe_session_id: session.id })
      .eq('id', reservaId);

    return jsonResponse({ checkout_url: session.url, session_id: session.id });

  } catch (err) {
    console.error('create-stripe-checkout error:', err);
    return jsonResponse({ error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) }, 500);
  }
});
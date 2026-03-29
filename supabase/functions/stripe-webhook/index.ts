// supabase/functions/stripe-webhook/index.ts  [v2]
// Confirma reservas tras pago. Al confirmar, crea bloqueos por unidad_id.
// Idempotente por stripe_payment_intent.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

serve(async (req) => {
  const signature     = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

  if (!signature) return new Response('Missing stripe-signature', { status: 400 });

  let event: Stripe.Event;
  try {
    const body   = await req.text();
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
    event        = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // ─── checkout.session.completed ────────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session   = event.data.object as Stripe.Checkout.Session;
    const reservaId = session.metadata?.reserva_id;
    const esSenal   = session.metadata?.es_senal === 'true';

    if (!reservaId) {
      console.error('No reserva_id in session metadata');
      return new Response('ok', { status: 200 });
    }

    // Idempotencia: leer estado actual
    const { data: reservaActual } = await supabase
      .from('reservas')
      .select('id, estado, estado_pago, property_id, fecha_entrada, fecha_salida, email_cliente, nombre_cliente, apellidos_cliente')
      .eq('id', reservaId)
      .single();

    if (!reservaActual) {
      console.error('Reserva no encontrada:', reservaId);
      return new Response('ok', { status: 200 });
    }

    if (reservaActual.estado === 'CONFIRMED') {
      console.log(`Reserva ${reservaId} ya confirmada — idempotencia`);
      return new Response('ok', { status: 200 });
    }

    if (reservaActual.estado !== 'PENDING_PAYMENT') {
      console.warn(`Reserva ${reservaId} en estado inesperado: ${reservaActual.estado}`);
      return new Response('ok', { status: 200 });
    }

    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent as Stripe.PaymentIntent)?.id ?? null;

    const importePagado = (session.amount_total ?? 0) / 100;

    // Confirmar reserva
    await supabase
      .from('reservas')
      .update({
        estado:                'CONFIRMED',
        estado_pago:           esSenal ? 'PARTIAL' : 'PAID',
        stripe_payment_intent: paymentIntentId,
        confirmed_at:          new Date().toISOString(),
      })
      .eq('id', reservaId);

    // Idempotencia en pagos
    const { data: pagoExistente } = await supabase
      .from('pagos')
      .select('id')
      .eq('stripe_payment_intent', paymentIntentId)
      .maybeSingle();

    if (!pagoExistente) {
      await supabase.from('pagos').insert({
        reserva_id:            reservaId,
        property_id:           reservaActual.property_id,
        stripe_payment_intent: paymentIntentId,
        importe:               importePagado,
        tipo:                  esSenal ? 'SENAL' : 'TOTAL',
        metodo:                'STRIPE',
        estado:                'COMPLETED',
      });
    }

    // ── Crear bloqueos por unidad (núcleo de v2) ────────────────────────────
    const { data: reservaUnidades } = await supabase
      .from('reserva_unidades')
      .select('unidad_id')
      .eq('reserva_id', reservaId);

    if (reservaUnidades?.length) {
      // Eliminar bloqueos previos de esta reserva (por si el webhook se reintenta)
      await supabase
        .from('bloqueos')
        .delete()
        .eq('origen', 'RESERVA')
        .like('motivo', `%${reservaId}%`);

      const bloqueosNuevos = reservaUnidades.map((ru: any) => ({
        property_id:  reservaActual.property_id,
        unidad_id:    ru.unidad_id,
        fecha_inicio: reservaActual.fecha_entrada,
        fecha_fin:    reservaActual.fecha_salida,
        motivo:       `Reserva confirmada [${reservaId}]`,
        origen:       'RESERVA',
      }));

      await supabase.from('bloqueos').insert(bloqueosNuevos);
    }

    // Email confirmación (fire & forget)
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      },
      body: JSON.stringify({
        template_key:   'reservation_confirmed',
        to_email:       reservaActual.email_cliente,
        to_name:        `${reservaActual.nombre_cliente} ${reservaActual.apellidos_cliente ?? ''}`.trim(),
        reservation_id: reservaId,
      }),
    }).catch(err => console.error('Email send error:', err));
  }

  // ─── checkout.session.expired ──────────────────────────────────────────────
  if (event.type === 'checkout.session.expired') {
    const session   = event.data.object as Stripe.Checkout.Session;
    const reservaId = session.metadata?.reserva_id;

    if (reservaId) {
      await supabase
        .from('reservas')
        .update({ estado: 'EXPIRED' })
        .eq('id', reservaId)
        .eq('estado', 'PENDING_PAYMENT');
    }
  }

  // ─── payment_intent.payment_failed ─────────────────────────────────────────
  if (event.type === 'payment_intent.payment_failed') {
    const pi        = event.data.object as Stripe.PaymentIntent;
    const reservaId = pi.metadata?.reserva_id;
    if (reservaId) {
      console.warn(`Pago fallido para reserva ${reservaId}:`, pi.last_payment_error?.message);
    }
  }

  return new Response('ok', { status: 200 });
});
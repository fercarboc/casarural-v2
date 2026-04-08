// supabase/functions/stripe-webhook/index.ts  [v2]
// Confirma reservas tras pago. Al confirmar:
// - actualiza reserva
// - inserta pago (idempotente por stripe_payment_intent)
// - crea bloqueos por unidad
// - elimina reservation_holds
// - marca expiradas si checkout.session.expired

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    // =========================================================
    // checkout.session.completed
    // =========================================================
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const reservaId = session.metadata?.reserva_id;
      const esSenal = session.metadata?.es_senal === 'true';

      if (!reservaId) {
        console.error('No reserva_id in session metadata');
        return new Response('ok', { status: 200 });
      }

      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

      if (!paymentIntentId) {
        console.error('No payment_intent in checkout.session.completed');
        return new Response('ok', { status: 200 });
      }

      const stripeSessionId = session.id;
      const importePagado = round2((session.amount_total ?? 0) / 100);

      // ---------------------------------------------------------
      // 1. Idempotencia REAL por stripe_payment_intent
      // ---------------------------------------------------------
      const { data: pagoExistente, error: pagoExistenteError } = await supabase
        .from('pagos')
        .select('id, reserva_id')
        .eq('stripe_payment_intent', paymentIntentId)
        .maybeSingle();

      if (pagoExistenteError) throw pagoExistenteError;

      if (pagoExistente?.id) {
        console.log(`Pago ya procesado por idempotencia: ${paymentIntentId}`);
        return new Response('ok', { status: 200 });
      }

      // ---------------------------------------------------------
      // 2. Leer reserva
      // ---------------------------------------------------------
      const { data: reservaActual, error: reservaError } = await supabase
        .from('reservas')
        .select(`
          id,
          estado,
          estado_pago,
          property_id,
          fecha_entrada,
          fecha_salida,
          email_cliente,
          nombre_cliente,
          apellidos_cliente,
          tarifa,
          importe_total,
          importe_senal
        `)
        .eq('id', reservaId)
        .single();

      if (reservaError) throw reservaError;

      if (!reservaActual) {
        console.error('Reserva no encontrada:', reservaId);
        return new Response('ok', { status: 200 });
      }

      if (reservaActual.estado !== 'PENDING_PAYMENT' && reservaActual.estado !== 'CONFIRMED') {
        console.warn(`Reserva ${reservaId} en estado inesperado: ${reservaActual.estado}`);
        return new Response('ok', { status: 200 });
      }

      // ---------------------------------------------------------
      // 3. Actualizar reserva
      // ---------------------------------------------------------
      const nuevoEstadoPago = esSenal ? 'PARTIAL' : 'PAID';

      const { error: updateReservaError } = await supabase
        .from('reservas')
        .update({
          estado: 'CONFIRMED',
          estado_pago: nuevoEstadoPago,
          stripe_payment_intent: paymentIntentId,
          stripe_session_id: stripeSessionId,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', reservaId);

      if (updateReservaError) throw updateReservaError;

      // ---------------------------------------------------------
      // 4. Insertar pago
      // ---------------------------------------------------------
      const tipoPago = esSenal ? 'SENAL' : 'TOTAL';

      const { error: pagoInsertError } = await supabase
        .from('pagos')
        .insert({
          reserva_id: reservaId,
          property_id: reservaActual.property_id,
          stripe_payment_intent: paymentIntentId,
          stripe_charge_id: null,
          importe: importePagado,
          moneda: (session.currency ?? 'eur').toUpperCase(),
          tipo: tipoPago,
          metodo: 'STRIPE',
          estado: 'COMPLETED',
          notas: `Checkout Session ${stripeSessionId}`,
        });

      if (pagoInsertError) throw pagoInsertError;

      // ---------------------------------------------------------
      // 5. Leer reserva_unidades
      // ---------------------------------------------------------
      const { data: reservaUnidades, error: ruError } = await supabase
        .from('reserva_unidades')
        .select('unidad_id')
        .eq('reserva_id', reservaId);

      if (ruError) throw ruError;

      if (!reservaUnidades?.length) {
        throw new Error(`La reserva ${reservaId} no tiene reserva_unidades`);
      }

      const unidadIds = reservaUnidades.map((ru: any) => ru.unidad_id);

      // ---------------------------------------------------------
      // 6. Reintentos seguros: borrar bloqueos previos de esta reserva
      // ---------------------------------------------------------
      await supabase
        .from('bloqueos')
        .delete()
        .eq('origen', 'RESERVA')
        .like('motivo', `%${reservaId}%`);

      // ---------------------------------------------------------
      // 7. Crear bloqueos definitivos por unidad
      // ---------------------------------------------------------
      const bloqueosNuevos = reservaUnidades.map((ru: any) => ({
        property_id: reservaActual.property_id,
        unidad_id: ru.unidad_id,
        fecha_inicio: reservaActual.fecha_entrada,
        fecha_fin: reservaActual.fecha_salida,
        motivo: `Reserva confirmada [${reservaId}]`,
        origen: 'RESERVA',
      }));

      const { error: bloqueosInsertError } = await supabase
        .from('bloqueos')
        .insert(bloqueosNuevos);

      if (bloqueosInsertError) throw bloqueosInsertError;

      // ---------------------------------------------------------
      // 8. Eliminar reservation_holds de esas unidades/rango
      // ---------------------------------------------------------
      const { error: holdsDeleteError } = await supabase
        .from('reservation_holds')
        .delete()
        .eq('property_id', reservaActual.property_id)
        .eq('fecha_inicio', reservaActual.fecha_entrada)
        .eq('fecha_fin', reservaActual.fecha_salida)
        .in('unidad_id', unidadIds);

      if (holdsDeleteError) throw holdsDeleteError;

      // ---------------------------------------------------------
      // 9. Email confirmación (opcional)
      // ---------------------------------------------------------
      // Mejor dejarlo comentado hasta tener claro el contrato de send-email
      /*
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          template_key: 'reservation_confirmed',
          to_email: reservaActual.email_cliente,
          to_name: `${reservaActual.nombre_cliente} ${reservaActual.apellidos_cliente ?? ''}`.trim(),
          reservation_id: reservaId,
        }),
      }).catch(err => console.error('Email send error:', err));
      */

      console.log(`Reserva ${reservaId} confirmada correctamente`);
    }

    // =========================================================
    // checkout.session.expired
    // =========================================================
    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const reservaId = session.metadata?.reserva_id;

      if (reservaId) {
        const { data: reservaActual } = await supabase
          .from('reservas')
          .select('id, property_id, fecha_entrada, fecha_salida')
          .eq('id', reservaId)
          .maybeSingle();

        await supabase
          .from('reservas')
          .update({ estado: 'EXPIRED' })
          .eq('id', reservaId)
          .eq('estado', 'PENDING_PAYMENT');

        if (reservaActual) {
          const { data: reservaUnidades } = await supabase
            .from('reserva_unidades')
            .select('unidad_id')
            .eq('reserva_id', reservaId);

          const unidadIds = (reservaUnidades ?? []).map((ru: any) => ru.unidad_id);

          if (unidadIds.length) {
            await supabase
              .from('reservation_holds')
              .delete()
              .eq('property_id', reservaActual.property_id)
              .eq('fecha_inicio', reservaActual.fecha_entrada)
              .eq('fecha_fin', reservaActual.fecha_salida)
              .in('unidad_id', unidadIds);
          }
        }
      }
    }

    // =========================================================
    // payment_intent.payment_failed
    // =========================================================
    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const reservaId = pi.metadata?.reserva_id;

      if (reservaId) {
        console.warn(`Pago fallido para reserva ${reservaId}:`, pi.last_payment_error?.message);
      }
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('stripe-webhook processing error:', err);
    return new Response('Webhook processing error', { status: 500 });
  }
});
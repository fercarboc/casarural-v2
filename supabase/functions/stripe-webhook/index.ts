// supabase/functions/stripe-webhook/index.ts

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
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      console.log('checkout.session.completed recibido', {
        session_id: session.id,
        metadata: session.metadata,
        payment_intent: session.payment_intent,
        amount_total: session.amount_total,
      });

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

      // 1. Idempotencia por payment_intent
      const { data: pagoExistente, error: pagoExistenteError } = await supabase
        .from('pagos')
        .select('id, reserva_id')
        .eq('stripe_payment_intent', paymentIntentId)
        .maybeSingle();

      if (pagoExistenteError) {
        console.error('Error comprobando idempotencia pagos:', pagoExistenteError);
        throw pagoExistenteError;
      }

      if (pagoExistente?.id) {
        console.log(`Pago ya procesado por idempotencia: ${paymentIntentId}`);
        return new Response('ok', { status: 200 });
      }

      // 2. Leer reserva
      const { data: reservaActual, error: reservaError } = await supabase
        .from('reservas')
        .select(`
          id,
          codigo,
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
          importe_senal,
          noches,
          nif_cliente,
          direccion_fiscal
        `)
        .eq('id', reservaId)
        .single();

      if (reservaError) {
        console.error('Error leyendo reserva:', reservaError);
        throw reservaError;
      }

      if (!reservaActual) {
        console.error('Reserva no encontrada:', reservaId);
        return new Response('ok', { status: 200 });
      }

      if (reservaActual.estado !== 'PENDING_PAYMENT' && reservaActual.estado !== 'CONFIRMED') {
        console.warn(`Reserva ${reservaId} en estado inesperado: ${reservaActual.estado}`);
        return new Response('ok', { status: 200 });
      }

      // 3. Actualizar reserva
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

      if (updateReservaError) {
        console.error('Error actualizando reserva:', updateReservaError);
        throw updateReservaError;
      }

      // 4. Insertar pago
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

      if (pagoInsertError) {
        console.error('Error insertando pago:', pagoInsertError);
        throw pagoInsertError;
      }

      // 5. Leer unidades de la reserva
      const { data: reservaUnidades, error: ruError } = await supabase
        .from('reserva_unidades')
        .select('unidad_id')
        .eq('reserva_id', reservaId);

      if (ruError) {
        console.error('Error leyendo reserva_unidades:', ruError);
        throw ruError;
      }

      if (!reservaUnidades?.length) {
        throw new Error(`La reserva ${reservaId} no tiene reserva_unidades`);
      }

      const unidadIds = reservaUnidades.map((ru: { unidad_id: string }) => ru.unidad_id);

      // 6. Borrar bloqueos previos si existen
      const { error: deleteBloqueosPreviosError } = await supabase
        .from('bloqueos')
        .delete()
        .eq('origen', 'RESERVA')
        .like('motivo', `%${reservaId}%`);

      if (deleteBloqueosPreviosError) {
        console.error('Error borrando bloqueos previos:', deleteBloqueosPreviosError);
        throw deleteBloqueosPreviosError;
      }

      // 7. Crear bloqueos definitivos
      const bloqueosNuevos = reservaUnidades.map((ru: { unidad_id: string }) => ({
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

      if (bloqueosInsertError) {
        console.error('Error insertando bloqueos:', bloqueosInsertError);
        throw bloqueosInsertError;
      }

      // 8. Eliminar holds
      const { error: holdsDeleteError } = await supabase
        .from('reservation_holds')
        .delete()
        .eq('property_id', reservaActual.property_id)
        .eq('fecha_inicio', reservaActual.fecha_entrada)
        .eq('fecha_fin', reservaActual.fecha_salida)
        .in('unidad_id', unidadIds);

      if (holdsDeleteError) {
        console.error('Error borrando holds:', holdsDeleteError);
        throw holdsDeleteError;
      }

      // 9. Auto-crear trabajos de limpieza (best-effort)
      try {
        const cleaningJobs = unidadIds.map((uid: string) => ({
          property_id: reservaActual.property_id,
          unidad_id: uid,
          reserva_id: reservaId,
          scheduled_date: reservaActual.fecha_salida,
          mode: 'SHORT_STAY',
          origin: 'AUTO_CHECKOUT',
          status: 'PENDING',
          priority: 'HIGH',
        }))

        // Check for existing jobs to avoid duplicates (idempotency)
        for (const job of cleaningJobs) {
          const { data: existing } = await supabase
            .from('cleaning_jobs')
            .select('id')
            .eq('reserva_id', job.reserva_id)
            .eq('unidad_id', job.unidad_id)
            .maybeSingle()

          if (!existing) {
            const { error: cjErr } = await supabase.from('cleaning_jobs').insert(job)
            if (cjErr) console.error('Error creando cleaning_job:', cjErr)
          }
        }
      } catch (cleaningErr) {
        console.error('Error auto-creando cleaning_jobs:', cleaningErr)
      }

      // 10. Email confirmación (best-effort)
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
      }).catch((err: unknown) => console.error('Email send error:', err));

      // 10. Auto-factura en pago total
      if (!esSenal) {
        try {
          const totalFactura = Number(reservaActual.importe_total ?? 0);

          if (totalFactura > 0) {
            const base = Math.round((totalFactura / 1.1) * 100) / 100;
            const iva = Math.round((totalFactura - base) * 100) / 100;

            let numeroFactura: string | null = null;

            const { data: numRpc, error: rpcError } = await supabase.rpc('generar_numero_factura', {
              p_property_id: reservaActual.property_id,
            });

            if (rpcError) {
              console.error('Error RPC generar_numero_factura:', rpcError);
            }

            if (numRpc) {
              numeroFactura = numRpc as string;
            } else {
              const year = new Date().getFullYear();

              const { data: last, error: lastFacturaError } = await supabase
                .from('facturas')
                .select('numero_factura')
                .eq('property_id', reservaActual.property_id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (lastFacturaError) {
                console.error('Error obteniendo última factura:', lastFacturaError);
              }

              const lastNumero = last?.numero_factura ?? '';
              const parts = lastNumero.split('-');
              const seq = (parseInt(parts[parts.length - 1] ?? '0') || 0) + 1;
              numeroFactura = `FAC-${year}-${String(seq).padStart(4, '0')}`;
            }

            const nombreFactura =
              `${reservaActual.nombre_cliente ?? ''} ${reservaActual.apellidos_cliente ?? ''}`.trim();

            const { error: facturaInsertError } = await supabase
              .from('facturas')
              .insert({
                reserva_id: reservaId,
                property_id: reservaActual.property_id,
                numero_factura: numeroFactura,
                nombre_cliente: nombreFactura,
                nif_cliente: reservaActual.nif_cliente ?? null,
                direccion_cliente: reservaActual.direccion_fiscal ?? null,
                base_imponible: base,
                iva_porcentaje: 10,
                cuota_iva: iva,
                total: totalFactura,
                lineas: [
                  {
                    concepto: 'Hospedaje Casa Rural',
                    cantidad: 1,
                    base_imponible: base,
                    iva_porcentaje: 10,
                    cuota_iva: iva,
                    total: totalFactura,
                  },
                ],
                estado: 'EMITIDA',
                fecha_emision: new Date().toISOString().slice(0, 10),
              });

            if (facturaInsertError) {
              console.error('Error insertando factura:', facturaInsertError);
            } else {
              console.log(`Factura auto-generada para reserva ${reservaId}: ${numeroFactura}`);
            }
          }
        } catch (invoiceErr) {
          console.error('Error al auto-generar factura:', invoiceErr);
        }
      }

      console.log(`Reserva ${reservaId} confirmada correctamente`);
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const reservaId = session.metadata?.reserva_id;

      if (reservaId) {
        const { data: reservaActual, error: reservaActualError } = await supabase
          .from('reservas')
          .select('id, property_id, fecha_entrada, fecha_salida')
          .eq('id', reservaId)
          .maybeSingle();

        if (reservaActualError) {
          console.error('Error leyendo reserva para expired:', reservaActualError);
        }

        const { error: reservaExpiredError } = await supabase
          .from('reservas')
          .update({ estado: 'EXPIRED' })
          .eq('id', reservaId)
          .eq('estado', 'PENDING_PAYMENT');

        if (reservaExpiredError) {
          console.error('Error marcando reserva como EXPIRED:', reservaExpiredError);
        }

        if (reservaActual) {
          const { data: reservaUnidades, error: reservaUnidadesError } = await supabase
            .from('reserva_unidades')
            .select('unidad_id')
            .eq('reserva_id', reservaId);

          if (reservaUnidadesError) {
            console.error('Error leyendo reserva_unidades en expired:', reservaUnidadesError);
          }

          const unidadIds = (reservaUnidades ?? []).map((ru: { unidad_id: string }) => ru.unidad_id);

          if (unidadIds.length) {
            const { error: deleteHoldsExpiredError } = await supabase
              .from('reservation_holds')
              .delete()
              .eq('property_id', reservaActual.property_id)
              .eq('fecha_inicio', reservaActual.fecha_entrada)
              .eq('fecha_fin', reservaActual.fecha_salida)
              .in('unidad_id', unidadIds);

            if (deleteHoldsExpiredError) {
              console.error('Error borrando holds en expired:', deleteHoldsExpiredError);
            }
          }
        }
      }
    }

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
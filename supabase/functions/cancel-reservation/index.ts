// supabase/functions/cancel-reservation/index.ts  [v3]
// POST { reservaId, cancelledBy?, reason?, importeReembolsoOverride? }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const POLITICA_CANCELACION = [
  { min_dias: 60, reembolso: 1.0  },
  { min_dias: 45, reembolso: 0.5  },
  { min_dias: 30, reembolso: 0.25 },
  { min_dias: 0,  reembolso: 0    },
];

function getPorcentajeReembolso(fechaEntrada: string): number {
  const hoy       = new Date();
  const entrada   = new Date(fechaEntrada);
  const diasHasta = Math.ceil((entrada.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  for (const tier of POLITICA_CANCELACION) {
    if (diasHasta >= tier.min_dias) return tier.reembolso;
  }
  return 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const {
      reservaId,
      cancelledBy = 'admin',
      reason,
      importeReembolsoOverride,
    } = await req.json();

    if (!reservaId) {
      return Response.json({ error: 'Missing reservaId' }, { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Obtener reserva + pagos (con stripe_payment_intent)
    const [{ data: reserva }, { data: pagos }] = await Promise.all([
      supabase.from('reservas').select('*').eq('id', reservaId).single(),
      supabase
        .from('pagos')
        .select('importe, estado, tipo, stripe_payment_intent')
        .eq('reserva_id', reservaId),
    ]);

    if (!reserva) {
      return Response.json({ error: 'Reserva no encontrada' }, { status: 404, headers: corsHeaders });
    }
    if (!['CONFIRMED', 'PENDING_PAYMENT'].includes(reserva.estado)) {
      return Response.json(
        { error: 'La reserva no se puede cancelar en su estado actual' },
        { status: 400, headers: corsHeaders }
      );
    }

    const totalPagado = (pagos ?? [])
      .filter((p: any) => p.estado === 'COMPLETED' && p.tipo !== 'REEMBOLSO')
      .reduce((sum: number, p: any) => sum + Number(p.importe), 0);

    // Determinar importe a reembolsar
    let importeReembolso = 0;
    let porcentajeReembolso = 0;

    if (typeof importeReembolsoOverride === 'number' && importeReembolsoOverride > 0) {
      // Admin indica explícitamente el importe (independiente de tarifa)
      importeReembolso = Math.min(importeReembolsoOverride, totalPagado);
      porcentajeReembolso = totalPagado > 0 ? importeReembolso / totalPagado : 0;
    } else if (reserva.estado_pago !== 'UNPAID' && reserva.tarifa === 'FLEXIBLE') {
      porcentajeReembolso = getPorcentajeReembolso(reserva.fecha_entrada);
      importeReembolso = totalPagado * porcentajeReembolso;
    }

    // Cancelar reserva en BD
    await supabase.from('reservas').update({
      estado:       'CANCELLED',
      cancelled_at: new Date().toISOString(),
      notas_admin:  reason
        ? `Cancelado: ${reason}`
        : `Cancelado por ${cancelledBy}`,
    }).eq('id', reservaId);

    // Eliminar bloqueos (liberar disponibilidad)
    await supabase
      .from('bloqueos')
      .delete()
      .eq('origen', 'RESERVA')
      .like('motivo', `%${reservaId}%`);

    // Procesar reembolso Stripe si procede
    if (importeReembolso > 0) {
      // El payment_intent puede estar en la reserva o en el registro de pago
      const paymentIntentId =
        reserva.stripe_payment_intent ??
        (pagos ?? []).find((p: any) => p.stripe_payment_intent)?.stripe_payment_intent ??
        null;

      if (paymentIntentId) {
        try {
          const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

          // Obtener stripe_account_id de la propiedad (para Direct Charges)
          const { data: property } = await supabase
            .from('properties')
            .select('stripe_account_id')
            .eq('id', reserva.property_id)
            .single();

          const connectedAccountId = property?.stripe_account_id ?? null;

          // Intentar reembolso en cuenta plataforma (Destination Charges)
          // Si falla, intentar en cuenta conectada (Direct Charges)
          try {
            await stripe.refunds.create({
              payment_intent: paymentIntentId,
              amount:         Math.round(importeReembolso * 100),
              reason:         'requested_by_customer',
            });
          } catch (platformErr: any) {
            if (connectedAccountId && platformErr?.raw?.code === 'resource_missing') {
              await stripe.refunds.create(
                {
                  payment_intent: paymentIntentId,
                  amount:         Math.round(importeReembolso * 100),
                  reason:         'requested_by_customer',
                },
                { stripeAccount: connectedAccountId }
              );
            } else {
              throw platformErr;
            }
          }

          await supabase.from('pagos').insert({
            reserva_id:  reservaId,
            property_id: reserva.property_id,
            importe:     importeReembolso,
            tipo:        'REEMBOLSO',
            metodo:      'STRIPE',
            estado:      'COMPLETED',
          });

          await supabase.from('reservas').update({ estado_pago: 'REFUNDED' }).eq('id', reservaId);

          // Registrar retención si aplica
          const retencion = totalPagado - importeReembolso;
          if (retencion > 0.01) {
            await supabase.from('retenciones_cancelacion').insert({
              reserva_id:  reservaId,
              property_id: reserva.property_id,
              importe:     retencion,
              porcentaje:  (1 - porcentajeReembolso) * 100,
              concepto:    `Retención por cancelación (política: ${Math.round(porcentajeReembolso * 100)}% reembolso)`,
            });
          }
        } catch (stripeErr) {
          console.error('Stripe refund error:', stripeErr);
          // Reembolso fallido: al menos marcamos en BD el intento
          return Response.json({
            success: true,
            stripe_refund_error: true,
            message: 'Reserva cancelada pero el reembolso en Stripe falló. Gestiona la devolución desde el panel de Stripe.',
            importe_reembolso:    importeReembolso,
            porcentaje_reembolso: Math.round(porcentajeReembolso * 100),
          }, { headers: corsHeaders });
        }
      } else {
        // No hay payment_intent almacenado: cancelar sin reembolso automático
        console.warn(`Reserva ${reservaId}: no se encontró stripe_payment_intent para reembolsar ${importeReembolso}€`);
        return Response.json({
          success: true,
          stripe_refund_error: true,
          message: `Reserva cancelada. No se encontró el pago en Stripe. Gestiona la devolución de ${importeReembolso.toFixed(2)} € manualmente desde el panel de Stripe.`,
          importe_reembolso:    importeReembolso,
          porcentaje_reembolso: Math.round(porcentajeReembolso * 100),
        }, { headers: corsHeaders });
      }
    }

    // Email cancelación (fire & forget)
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        template_key:   'reservation_cancelled',
        to_email:       reserva.email_cliente,
        to_name:        `${reserva.nombre_cliente} ${reserva.apellidos_cliente ?? ''}`.trim(),
        reservation_id: reservaId,
        extra_vars:     { refund_amount: importeReembolso.toFixed(2) },
      }),
    }).catch(console.error);

    return Response.json({
      success:              true,
      importe_reembolso:    importeReembolso,
      porcentaje_reembolso: Math.round(porcentajeReembolso * 100),
    }, { headers: corsHeaders });

  } catch (err) {
    console.error('cancel-reservation error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
});

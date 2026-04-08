import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const nowIso = new Date().toISOString();

    // =========================================================
    // 1. Buscar reservas PENDING_PAYMENT vencidas
    // =========================================================
    const { data: expiredReservas, error: expiredReservasError } = await supabase
      .from('reservas')
      .select(`
        id,
        property_id,
        fecha_entrada,
        fecha_salida,
        expires_at,
        reserva_unidades (
          unidad_id
        )
      `)
      .eq('estado', 'PENDING_PAYMENT')
      .lt('expires_at', nowIso);

    if (expiredReservasError) throw expiredReservasError;

    let reservasExpiradasCount = 0;
    let holdsEliminadosPorReservaCount = 0;

    // =========================================================
    // 2. Marcar reservas como EXPIRED y borrar holds asociados
    // =========================================================
    for (const reserva of expiredReservas ?? []) {
      const reservaId = reserva.id;
      const propertyId = reserva.property_id;
      const fechaEntrada = reserva.fecha_entrada;
      const fechaSalida = reserva.fecha_salida;

      const unidadIds = ((reserva as any).reserva_unidades ?? []).map(
        (ru: any) => ru.unidad_id
      );

      // 2.1 Marcar EXPIRED
      const { error: updateReservaError } = await supabase
        .from('reservas')
        .update({
          estado: 'EXPIRED',
        })
        .eq('id', reservaId)
        .eq('estado', 'PENDING_PAYMENT');

      if (updateReservaError) throw updateReservaError;

      reservasExpiradasCount++;

      // 2.2 Borrar holds asociados a esa reserva/rango
      if (unidadIds.length > 0) {
        const { error: deleteHoldsError, count } = await supabase
          .from('reservation_holds')
          .delete({ count: 'exact' })
          .eq('property_id', propertyId)
          .eq('fecha_inicio', fechaEntrada)
          .eq('fecha_fin', fechaSalida)
          .in('unidad_id', unidadIds);

        if (deleteHoldsError) throw deleteHoldsError;

        holdsEliminadosPorReservaCount += count ?? 0;
      }
    }

    // =========================================================
    // 3. Limpiar holds expirados huérfanos
    // =========================================================
    const { error: deleteExpiredHoldsError, count: expiredHoldsCount } = await supabase
      .from('reservation_holds')
      .delete({ count: 'exact' })
      .lt('expires_at', nowIso);

    if (deleteExpiredHoldsError) throw deleteExpiredHoldsError;

    // =========================================================
    // 4. Respuesta
    // =========================================================
    return jsonResponse({
      ok: true,
      now: nowIso,
      reservas_expiradas: reservasExpiradasCount,
      holds_eliminados_asociados: holdsEliminadosPorReservaCount,
      holds_huerfanos_expirados_eliminados: expiredHoldsCount ?? 0,
    });
  } catch (err: any) {
    console.error('expire-pending-reservations error:', err);
    return jsonResponse(
      {
        ok: false,
        error: err?.message ?? 'Internal server error',
      },
      500
    );
  }
});
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-forwarded-host, host',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function overlap(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && endA > startB
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    // ✔️ Compatibilidad total
    const checkIn = body.fecha_entrada ?? body.checkIn
    const checkOut = body.fecha_salida ?? body.checkOut
    const unidadIds = body.unidad_ids ?? []

    if (!checkIn || !checkOut) {
      return new Response(
        JSON.stringify({ error: 'Missing fecha_entrada/checkIn or fecha_salida/checkOut' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // =========================================================
    // 1. HOLDS ACTIVOS (tu tabla real)
    // =========================================================
    const now = new Date().toISOString()

    const { data: holds } = await supabase
      .from('reservation_holds')
      .select('unidad_id, fecha_inicio, fecha_fin, expires_at')
      .in('unidad_id', unidadIds)
      .gt('expires_at', now)

    // =========================================================
    // 2. BLOQUEOS (si tienes esta tabla)
    // =========================================================
    const { data: bloqueos } = await supabase
      .from('bloqueos')
      .select('unidad_id, fecha_inicio, fecha_fin')
      .in('unidad_id', unidadIds)

    // =========================================================
    // 3. RESERVAS ACTIVAS
    // =========================================================
    const { data: reservas } = await supabase
      .from('reserva_unidades')
      .select(`
        unidad_id,
        reservas!inner (
          fecha_entrada,
          fecha_salida,
          estado
        )
      `)
      .in('unidad_id', unidadIds)
      .in('reservas.estado', ['PENDING_PAYMENT', 'CONFIRMED'])

    // =========================================================
    // 4. COMPROBACIÓN
    // =========================================================
    const perUnit: Record<string, boolean> = {}

    for (const id of unidadIds) {
      let available = true

      // HOLD
      if (holds?.some(h =>
        h.unidad_id === id &&
        overlap(checkIn, checkOut, h.fecha_inicio, h.fecha_fin)
      )) {
        available = false
      }

      // BLOQUEO
      if (available && bloqueos?.some(b =>
        b.unidad_id === id &&
        overlap(checkIn, checkOut, b.fecha_inicio, b.fecha_fin)
      )) {
        available = false
      }

      // RESERVA REAL
      if (available && reservas?.some(r =>
        r.unidad_id === id &&
        overlap(
          checkIn,
          checkOut,
          r.reservas.fecha_entrada,
          r.reservas.fecha_salida
        )
      )) {
        available = false
      }

      perUnit[id] = available
    }

    const allAvailable = Object.values(perUnit).every(Boolean)

    return new Response(
      JSON.stringify({
        available: allAvailable,
        per_unit: perUnit,
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (err: any) {
    console.error(err)

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    )
  }
})
// supabase/functions/convert-recibo-to-factura/index.ts
// POST { reciboId, propertyId }
// Converts a recibo into a sealed VeriFactu factura (bloqueada=true, hash chain).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256hex(parts: (string | number)[]): Promise<string> {
  const data = parts.map(String).join('|');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { reciboId, propertyId } = await req.json();
    if (!reciboId || !propertyId) {
      return json({ error: 'reciboId y propertyId son obligatorios' }, 400);
    }

    // 1. Cargar recibo
    const { data: recibo, error: rErr } = await db
      .from('recibos')
      .select('*')
      .eq('id', reciboId)
      .eq('property_id', propertyId)
      .single();

    if (rErr || !recibo) return json({ error: 'Recibo no encontrado' }, 404);
    if (!recibo.puede_facturarse) return json({ error: 'Este recibo no puede convertirse en factura (p.ej. fianza)' }, 422);
    if (recibo.factura_id) return json({ error: 'Este recibo ya tiene una factura asociada' }, 409);
    if (recibo.estado === 'ANULADO') return json({ error: 'No se puede facturar un recibo anulado' }, 422);

    // 2. Generar número de factura
    const { data: numero, error: numErr } = await db.rpc('generar_numero_factura', {
      p_property_id: propertyId,
    });
    if (numErr || !numero) return json({ error: numErr?.message ?? 'Error generando número de factura' }, 500);

    // 3. Hash VeriFactu — obtener último hash de la cadena
    const { data: lastSealed } = await db
      .from('facturas')
      .select('hash_actual')
      .eq('property_id', propertyId)
      .eq('bloqueada', true)
      .not('hash_actual', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const hashAnterior = lastSealed?.hash_actual ?? '0';
    const fechaEmision = new Date().toISOString().split('T')[0];

    const hashActual = await sha256hex([
      propertyId,
      numero,
      fechaEmision,
      recibo.nif_cliente ?? '',
      recibo.total,
      hashAnterior,
    ]);

    // 4. Crear factura bloqueada
    const lineas = [{
      concepto:       recibo.concepto,
      cantidad:       1,
      base_imponible: Number(recibo.base_imponible),
      iva_porcentaje: Number(recibo.iva_porcentaje),
      cuota_iva:      Number(recibo.iva_importe),
      total:          Number(recibo.total),
    }];

    const { data: factura, error: fErr } = await db
      .from('facturas')
      .insert({
        property_id:       propertyId,
        reserva_id:        recibo.reserva_id ?? null,
        numero_factura:    numero,
        nombre_cliente:    recibo.nombre_cliente,
        nif_cliente:       recibo.nif_cliente,
        direccion_cliente: recibo.direccion_cliente,
        email_cliente:     recibo.email_cliente,
        base_imponible:    Number(recibo.base_imponible),
        iva_porcentaje:    Number(recibo.iva_porcentaje),
        cuota_iva:         Number(recibo.iva_importe),
        total:             Number(recibo.total),
        lineas,
        estado:            'EMITIDA',
        fecha_emision:     fechaEmision,
        fecha_operacion:   fechaEmision,
        tipo_factura:      'ORDINARIA',
        bloqueada:         true,
        hash_actual:       hashActual,
        hash_anterior:     hashAnterior,
        estado_aeat:       'PENDIENTE',
      })
      .select('*')
      .single();

    if (fErr || !factura) return json({ error: fErr?.message ?? 'Error creando factura' }, 500);

    // 5. Vincular recibo con la factura y marcar como pagado
    await db
      .from('recibos')
      .update({ factura_id: factura.id, estado: 'PAGADO' })
      .eq('id', reciboId);

    // 6. Auditoría
    await db.from('factura_eventos').insert({
      factura_id:  factura.id,
      property_id: propertyId,
      tipo_evento: 'FACTURA_EMITIDA',
      descripcion: `Factura ${numero} creada desde recibo ${recibo.numero_recibo}`,
      payload:     { recibo_id: reciboId, hash_actual: hashActual },
    });

    return json({ factura, recibo_numero: recibo.numero_recibo });
  } catch (err: any) {
    return json({ error: err?.message ?? 'Error interno' }, 500);
  }
});

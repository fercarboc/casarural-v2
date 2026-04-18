// supabase/functions/create-rectifying-invoice/index.ts
// POST { facturaId, propertyId, motivo }
// Creates a RECTIFICATIVA linked to facturaId, marks original as RECTIFICADA.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { facturaId, propertyId, motivo } = await req.json();

    if (!facturaId || !propertyId || !motivo?.trim()) {
      return json({ error: 'facturaId, propertyId y motivo son obligatorios' }, 400);
    }

    // 1. Cargar factura original
    const { data: original, error: origErr } = await db
      .from('facturas')
      .select('*')
      .eq('id', facturaId)
      .single();

    if (origErr || !original) return json({ error: 'Factura no encontrada' }, 404);
    if (original.property_id !== propertyId) return json({ error: 'Acceso no autorizado' }, 403);
    if (!original.bloqueada) return json({ error: 'Solo se pueden rectificar facturas fiscales bloqueadas' }, 422);
    if (original.estado === 'RECTIFICADA') return json({ error: 'La factura ya ha sido rectificada' }, 409);
    if (original.tipo_factura !== 'ORDINARIA') return json({ error: 'Solo se pueden rectificar facturas ordinarias' }, 422);

    // 2. Generar número de rectificativa
    const { data: numero, error: numErr } = await db.rpc('generar_numero_factura', {
      p_property_id: propertyId,
      p_serie: 'RECT',
    });
    if (numErr || !numero) return json({ error: 'Error al generar el número de rectificativa' }, 500);

    // 3. Hash chain: usar el hash de la factura original como "anterior"
    const hashAnterior = original.hash_actual ?? '0';
    const fechaEmision = new Date().toISOString().split('T')[0];

    const hashActual = await sha256hex([
      propertyId,
      numero,
      fechaEmision,
      original.nif ?? '',
      -original.total,
      hashAnterior,
    ]);

    // 4. Insertar rectificativa (importes negativos)
    const { data: rectificativa, error: rectErr } = await db
      .from('facturas')
      .insert({
        property_id:            propertyId,
        reserva_id:             original.reserva_id,
        numero,
        fecha_emision:          fechaEmision,
        fecha_operacion:        fechaEmision,
        nombre:                 original.nombre,
        nif:                    original.nif,
        direccion:              original.direccion,
        email_cliente:          original.email_cliente,
        concepto:               `Rectificación de ${original.numero}`,
        base_imponible:         -Math.abs(original.base_imponible),
        iva_porcentaje:         original.iva_porcentaje,
        iva_importe:            -Math.abs(original.iva_importe),
        total:                  -Math.abs(original.total),
        estado:                 'EMITIDA',
        tipo_factura:           'RECTIFICATIVA',
        factura_rectificada_id: original.id,
        motivo_rectificacion:   motivo.trim(),
        bloqueada:              true,
        hash_actual:            hashActual,
        hash_anterior:          hashAnterior,
        estado_aeat:            'PENDIENTE',
      })
      .select('*')
      .single();

    if (rectErr || !rectificativa) {
      return json({ error: rectErr?.message ?? 'Error al crear la rectificativa' }, 500);
    }

    // 5. Actualizar factura original a RECTIFICADA
    const { error: updErr } = await db
      .from('facturas')
      .update({ estado: 'RECTIFICADA' })
      .eq('id', original.id);

    if (updErr) {
      // Rollback: eliminar rectificativa
      await db.from('facturas').delete().eq('id', rectificativa.id);
      return json({ error: 'Error al marcar la factura original como rectificada' }, 500);
    }

    // 6. Registrar eventos de auditoría
    await db.from('factura_eventos').insert([
      {
        factura_id:  rectificativa.id,
        property_id: propertyId,
        tipo_evento: 'RECTIFICATIVA_EMITIDA',
        descripcion: `Rectificativa ${numero} emitida para ${original.numero}`,
        payload: { motivo, factura_original_id: original.id },
      },
      {
        factura_id:  original.id,
        property_id: propertyId,
        tipo_evento: 'ESTADO_CAMBIADO',
        descripcion: `Estado cambiado a RECTIFICADA por emisión de ${numero}`,
        payload: { rectificativa_id: rectificativa.id },
      },
    ]);

    return json({ rectificativa, original_numero: original.numero });
  } catch (err: any) {
    return json({ error: err.message ?? 'Error interno' }, 500);
  }
});

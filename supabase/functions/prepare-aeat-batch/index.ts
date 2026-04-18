// supabase/functions/prepare-aeat-batch/index.ts
// POST { propertyId, facturaIds: string[] }
// Marks invoices as PREPARADA for AEAT and creates a lote_aeat record.
// Phase 1: prepares the VeriFactu payload. Phase 2 (actual submission) is a future stub.

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { propertyId, facturaIds } = await req.json();

    if (!propertyId || !Array.isArray(facturaIds) || facturaIds.length === 0) {
      return json({ error: 'propertyId y facturaIds[] son obligatorios' }, 400);
    }

    // Cargar facturas verificando propiedad
    const { data: facturas, error: fErr } = await db
      .from('facturas')
      .select('id, numero, fecha_emision, nombre, nif, total, base_imponible, iva_porcentaje, iva_importe, tipo_factura, hash_actual, hash_anterior, estado_aeat, bloqueada, property_id')
      .in('id', facturaIds)
      .eq('property_id', propertyId);

    if (fErr) return json({ error: fErr.message }, 500);

    const elegibles = (facturas ?? []).filter(f => f.bloqueada && f.estado_aeat === 'PENDIENTE');
    if (elegibles.length === 0) {
      return json({ error: 'No hay facturas elegibles (bloqueada=true y estado_aeat=PENDIENTE)' }, 422);
    }

    // Cargar datos de la propiedad para el payload
    const { data: property } = await db
      .from('properties')
      .select('nombre, legal_tax_id, legal_business_name, legal_address')
      .eq('id', propertyId)
      .single();

    // Construir payload VeriFactu (estructura de referencia, no normativa final)
    const verifactuPayload = {
      version: '1.0',
      emisor: {
        nif: property?.legal_tax_id ?? '',
        nombre: property?.legal_business_name ?? property?.nombre ?? '',
        direccion: property?.legal_address ?? '',
      },
      facturas: elegibles.map(f => ({
        id_factura: {
          id_emisor:      property?.legal_tax_id ?? '',
          num_serie_fact: f.numero,
          fecha_exp_fact: f.fecha_emision,
        },
        tipo_fact:         f.tipo_factura === 'ORDINARIA' ? 'F1' : 'R1',
        base_imponible:    f.base_imponible,
        cuota_repercutida: f.iva_importe,
        tipo_impositivo:   f.iva_porcentaje,
        importe_total:     f.total,
        destinatario:      f.nif ? { nif: f.nif, nombre: f.nombre } : null,
        encadenamiento: {
          primer_registro:   f.hash_anterior === '0',
          hash_registro_ant: f.hash_anterior,
        },
        huella_verifactu: f.hash_actual,
      })),
      generado_at: new Date().toISOString(),
    };

    // Crear lote AEAT
    const { data: lote, error: loteErr } = await db
      .from('lotes_aeat')
      .insert({
        property_id:  propertyId,
        estado:       'PREPARADO',
        facturas_ids: elegibles.map(f => f.id),
        num_facturas: elegibles.length,
        payload:      verifactuPayload,
      })
      .select('*')
      .single();

    if (loteErr || !lote) return json({ error: loteErr?.message ?? 'Error al crear el lote' }, 500);

    // Actualizar estado_aeat de las facturas a PREPARADA y guardar payload
    await db
      .from('facturas')
      .update({ estado_aeat: 'PREPARADA', verifactu_payload: verifactuPayload })
      .in('id', elegibles.map(f => f.id));

    // Registrar eventos de auditoría
    await db.from('factura_eventos').insert(
      elegibles.map(f => ({
        factura_id:  f.id,
        property_id: propertyId,
        tipo_evento: 'PREPARADA_AEAT',
        descripcion: `Incluida en lote AEAT ${lote.id}`,
        payload: { lote_id: lote.id },
      }))
    );

    return json({
      lote_id:       lote.id,
      num_facturas:  elegibles.length,
      payload:       verifactuPayload,
      // Phase 2 stub: aeat_response pending actual submission
      aeat_enviada: false,
      mensaje: 'Lote preparado. La integración real con AEAT/VeriFactu está pendiente de implementación (Fase 2).',
    });
  } catch (err: any) {
    return json({ error: err.message ?? 'Error interno' }, 500);
  }
});

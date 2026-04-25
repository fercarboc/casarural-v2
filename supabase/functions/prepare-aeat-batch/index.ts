// supabase/functions/prepare-aeat-batch/index.ts
// POST { propertyId, facturaIds: string[] }
// Seals non-bloqueada invoices (hash chain) then creates a lotes_aeat record.

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { propertyId, facturaIds } = await req.json();

    if (!propertyId || !Array.isArray(facturaIds) || facturaIds.length === 0) {
      return json({ error: 'propertyId y facturaIds[] son obligatorios' }, 400);
    }

    // 1. Cargar facturas solicitadas
    const { data: rawFacturas, error: fErr } = await db
      .from('facturas')
      .select('id, numero_factura, fecha_emision, nombre_cliente, nif_cliente, total, base_imponible, iva_porcentaje, cuota_iva, tipo_factura, hash_actual, hash_anterior, estado_aeat, bloqueada, property_id, created_at')
      .in('id', facturaIds)
      .eq('property_id', propertyId)
      .not('estado', 'in', '(ANULADA,RECTIFICADA)');

    if (fErr) return json({ error: fErr.message }, 500);
    if (!rawFacturas || rawFacturas.length === 0) {
      return json({ error: 'No se encontraron facturas válidas para este lote' }, 422);
    }

    // 2. Cargar datos de la propiedad
    const { data: property } = await db
      .from('properties')
      .select('nombre, legal_tax_id, legal_business_name, legal_address')
      .eq('id', propertyId)
      .single();

    // 3. Separar bloqueadas de no bloqueadas
    const eligibles = rawFacturas.filter(f =>
      !['PREPARADA', 'ENVIADA'].includes(f.estado_aeat ?? '')
    );

    if (eligibles.length === 0) {
      return json({ error: 'Todas las facturas seleccionadas ya están PREPARADAS o ENVIADAS' }, 422);
    }

    const noBlockeadas = eligibles.filter(f => !f.bloqueada);

    // 4. Sellar las facturas no bloqueadas (aplicar cadena hash VeriFactu)
    if (noBlockeadas.length > 0) {
      // Obtener el último hash de la cadena ya existente
      const { data: lastSealed } = await db
        .from('facturas')
        .select('hash_actual')
        .eq('property_id', propertyId)
        .eq('bloqueada', true)
        .not('hash_actual', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let lastHash: string = lastSealed?.hash_actual ?? '0';

      // Ordenar por fecha_emision ASC, luego created_at ASC para mantener coherencia
      const ordered = [...noBlockeadas].sort((a, b) => {
        if (a.fecha_emision !== b.fecha_emision) return a.fecha_emision < b.fecha_emision ? -1 : 1;
        return a.created_at < b.created_at ? -1 : 1;
      });

      for (const f of ordered) {
        const hashActual = await sha256hex([
          propertyId,
          f.numero_factura,
          f.fecha_emision,
          f.nif_cliente ?? '',
          f.total,
          lastHash,
        ]);

        await db
          .from('facturas')
          .update({
            bloqueada:     true,
            hash_actual:   hashActual,
            hash_anterior: lastHash,
            estado_aeat:   'PENDIENTE',
          })
          .eq('id', f.id);

        // Actualizar referencia local para la siguiente iteración
        f.hash_actual   = hashActual;
        f.hash_anterior = lastHash;
        f.bloqueada     = true;
        f.estado_aeat   = 'PENDIENTE';
        lastHash        = hashActual;
      }
    }

    // 5. Ahora todas son elegibles
    const todasElegibles = eligibles; // todas han sido selladas si era necesario

    // 6. Construir payload VeriFactu
    const verifactuPayload = {
      version: '1.0',
      emisor: {
        nif:       property?.legal_tax_id ?? '',
        nombre:    property?.legal_business_name ?? property?.nombre ?? '',
        direccion: property?.legal_address ?? '',
      },
      facturas: todasElegibles.map(f => ({
        id_factura: {
          id_emisor:      property?.legal_tax_id ?? '',
          num_serie_fact: f.numero_factura,
          fecha_exp_fact: f.fecha_emision,
        },
        tipo_fact:         f.tipo_factura === 'ORDINARIA' ? 'F1' : 'R1',
        base_imponible:    f.base_imponible,
        cuota_repercutida: f.cuota_iva,
        tipo_impositivo:   f.iva_porcentaje,
        importe_total:     f.total,
        destinatario:      f.nif_cliente ? { nif: f.nif_cliente, nombre: f.nombre_cliente } : null,
        encadenamiento: {
          primer_registro:   f.hash_anterior === '0',
          hash_registro_ant: f.hash_anterior,
        },
        huella_verifactu: f.hash_actual,
      })),
      generado_at: new Date().toISOString(),
    };

    // 7. Crear lote AEAT
    const { data: lote, error: loteErr } = await db
      .from('lotes_aeat')
      .insert({
        property_id:  propertyId,
        estado:       'PREPARADO',
        facturas_ids: todasElegibles.map(f => f.id),
        num_facturas: todasElegibles.length,
        payload:      verifactuPayload,
      })
      .select('*')
      .single();

    if (loteErr || !lote) return json({ error: loteErr?.message ?? 'Error al crear el lote' }, 500);

    // 8. Marcar facturas como PREPARADA
    await db
      .from('facturas')
      .update({ estado_aeat: 'PREPARADA', verifactu_payload: verifactuPayload })
      .in('id', todasElegibles.map(f => f.id));

    // 9. Auditoría
    await db.from('factura_eventos').insert(
      todasElegibles.map(f => ({
        factura_id:  f.id,
        property_id: propertyId,
        tipo_evento: 'PREPARADA_AEAT',
        descripcion: `Incluida en lote AEAT ${lote.id}${!f.bloqueada ? ' (sellada automáticamente)' : ''}`,
        payload: { lote_id: lote.id, auto_sellada: !f.bloqueada },
      }))
    );

    return json({
      lote_id:        lote.id,
      num_facturas:   todasElegibles.length,
      num_selladas:   noBlockeadas.length,
      payload:        verifactuPayload,
      aeat_enviada:   false,
      mensaje:        `Lote preparado. ${noBlockeadas.length > 0 ? `${noBlockeadas.length} factura(s) selladas automáticamente con hash VeriFactu. ` : ''}La integración real con AEAT/VeriFactu está pendiente de implementación (Fase 2).`,
    });
  } catch (err: any) {
    return json({ error: err.message ?? 'Error interno' }, 500);
  }
});

// supabase/functions/create-invoice/index.ts
// POST { reservaId, propertyId, nombre?, nif?, direccion?, email_cliente? }
// Creates a fiscal invoice (ORDINARIA, bloqueada=true) with VeriFactu hash chain.

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

function calcIva10(totalConIva: number): { base: number; iva: number } {
  const base = Math.round((totalConIva / 1.1) * 100) / 100;
  const iva = Math.round((totalConIva - base) * 100) / 100;
  return { base, iva };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'Faltan variables de entorno de Supabase' }, 500);
    }

    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const {
      reservaId,
      propertyId,
      nombre: nombreOverride,
      nif,
      direccion,
      email_cliente,
    } = await req.json();

    if (!reservaId || !propertyId) {
      return json({ error: 'reservaId y propertyId son obligatorios' }, 400);
    }

    // 1) Cargar reserva
    const { data: reserva, error: rErr } = await db
      .from('reservas')
      .select(`
        id,
        codigo,
        nombre_cliente,
        apellidos_cliente,
        email_cliente,
        nif_factura,
        razon_social,
        direccion_factura,
        importe_total,
        estado_pago,
        property_id
      `)
      .eq('id', reservaId)
      .single();

    if (rErr || !reserva) {
      return json({ error: 'Reserva no encontrada' }, 404);
    }

    if (reserva.property_id !== propertyId) {
      return json({ error: 'Acceso no autorizado' }, 403);
    }

    if (!['PAID', 'PARTIAL'].includes(reserva.estado_pago ?? '')) {
      return json(
        {
          error: `La reserva debe estar pagada (PAID o PARTIAL). Estado actual: ${reserva.estado_pago}`,
        },
        422
      );
    }

    // 2) Verificar que no exista ya factura ORDINARIA activa
    const { data: existing, error: existingErr } = await db
      .from('facturas')
      .select('id, numero_factura, estado')
      .eq('reserva_id', reservaId)
      .eq('tipo_factura', 'ORDINARIA')
      .not('estado', 'in', '(ANULADA,RECTIFICADA)')
      .maybeSingle();

    if (existingErr) {
      return json({ error: existingErr.message }, 500);
    }

    if (existing) {
      return json(
        {
          error: `Ya existe la factura ordinaria ${existing.numero_factura} para esta reserva`,
        },
        409
      );
    }

    // 3) Generar número de factura
    // Importante: aquí asumo que la RPC correcta acepta SOLO p_property_id.
    const { data: numero, error: numErr } = await db.rpc('generar_numero_factura', {
      p_property_id: propertyId,
    });

    if (numErr || !numero) {
      return json(
        {
          error: numErr?.message ?? 'Error al generar el número de factura',
        },
        500
      );
    }

    // 4) Obtener hash de la factura anterior
    const { data: prevFactura, error: prevErr } = await db
      .from('facturas')
      .select('hash_actual')
      .eq('property_id', propertyId)
      .eq('tipo_factura', 'ORDINARIA')
      .not('hash_actual', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prevErr) {
      return json({ error: prevErr.message }, 500);
    }

    const hashAnterior = prevFactura?.hash_actual ?? '0';

    // 5) Calcular importes y datos fiscales finales
    const importeTotal = Number(reserva.importe_total ?? 0);
    if (!Number.isFinite(importeTotal) || importeTotal <= 0) {
      return json({ error: 'La reserva no tiene un importe_total válido' }, 422);
    }

    const { base, iva } = calcIva10(importeTotal);
    const fechaEmision = new Date().toISOString().split('T')[0];

    const nombreFinal =
      (nombreOverride ?? '').trim() ||
      reserva.razon_social ||
      `${reserva.nombre_cliente ?? ''} ${reserva.apellidos_cliente ?? ''}`.trim();

    if (!nombreFinal) {
      return json({ error: 'No se pudo determinar el nombre fiscal del cliente' }, 422);
    }

    const nifFinal = nif?.trim() || reserva.nif_factura || null;
    const direccionFinal = direccion?.trim() || reserva.direccion_factura || null;
    const emailFinal = email_cliente?.trim() || reserva.email_cliente || null;

    // 6) Hash VeriFactu
    const hashActual = await sha256hex([
      propertyId,
      numero,
      fechaEmision,
      nifFinal ?? '',
      importeTotal,
      hashAnterior,
    ]);

    // 7) Insertar factura con esquema REAL
    const lineas = [
      {
        concepto: 'Hospedaje Casa Rural',
        cantidad: 1,
        base_imponible: base,
        iva_porcentaje: 10,
        cuota_iva: iva,
        total: importeTotal,
      },
    ];

    const { data: factura, error: insertErr } = await db
      .from('facturas')
      .insert({
        property_id: propertyId,
        reserva_id: reservaId,
        numero_factura: numero,
        nombre_cliente: nombreFinal,
        nif_cliente: nifFinal,
        direccion_cliente: direccionFinal,
        base_imponible: base,
        iva_porcentaje: 10,
        cuota_iva: iva,
        total: importeTotal,
        lineas,
        estado: 'EMITIDA',
        fecha_emision: fechaEmision,
        tipo_factura: 'ORDINARIA',
        bloqueada: true,
        hash_actual: hashActual,
        hash_anterior: hashAnterior,
        estado_aeat: 'PENDIENTE',
        email_cliente: emailFinal,
        fecha_operacion: fechaEmision,
      })
      .select('*')
      .single();

    if (insertErr || !factura) {
      return json(
        {
          error: insertErr?.message ?? 'Error al crear la factura',
        },
        500
      );
    }

    // 8) Auditoría
    // Solo si la tabla existe en tu proyecto.
    const { error: auditErr } = await db.from('factura_eventos').insert({
      factura_id: factura.id,
      property_id: propertyId,
      tipo_evento: 'FACTURA_EMITIDA',
      descripcion: `Factura ordinaria ${numero} emitida`,
      payload: {
        reserva_id: reservaId,
        hash_actual: hashActual,
      },
    });

    if (auditErr) {
      // No rompo la factura por auditoría; solo devuelvo warning
      return json({
        factura,
        warning: `Factura creada, pero no se pudo registrar auditoría: ${auditErr.message}`,
      });
    }

    return json({ factura });
  } catch (err: any) {
    return json({ error: err?.message ?? 'Error interno' }, 500);
  }
});
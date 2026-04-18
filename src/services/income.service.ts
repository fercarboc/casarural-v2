import { supabase } from '../integrations/supabase/client';
import type { FacturaDetalle } from './invoice.service';

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export type PeriodoIncome = 'mes' | 'anio' | 'custom';

export interface ReservaIngreso {
  id: string;
  nombre_cliente: string;
  apellidos_cliente: string;
  fecha_entrada: string;
  fecha_salida: string;
  noches: number;
  num_huespedes: number;
  origen: string;
  tarifa: string;
  importe_total: number;
  estado: string;
  estado_pago: string;
}

export interface IncomeData {
  reservas: ReservaIngreso[];
  facturasMap: Record<string, FacturaDetalle>;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function mapFacturaLite(f: any): FacturaDetalle {
  return {
    id: f.id,
    numero: f.numero_factura,
    fecha_emision: f.fecha_emision ?? '',
    nombre: f.nombre_cliente ?? '',
    nif: f.nif_cliente ?? null,
    direccion: f.direccion_cliente ?? null,
    concepto:
      Array.isArray(f.lineas) && f.lineas.length > 0
        ? (f.lineas[0]?.concepto ?? 'Hospedaje Casa Rural')
        : 'Hospedaje Casa Rural',
    base_imponible: Number(f.base_imponible ?? 0),
    iva_porcentaje: Number(f.iva_porcentaje ?? 10),
    iva_importe: Number(f.cuota_iva ?? 0),
    total: Number(f.total ?? 0),
    estado: f.estado,
    reserva_id: f.reserva_id ?? null,
    pdf_url: null,
    created_at: f.created_at ?? '',

    tipo_factura: f.tipo_factura ?? 'ORDINARIA',
    bloqueada: f.bloqueada ?? false,
    hash_actual: f.hash_actual ?? null,
    hash_anterior: f.hash_anterior ?? null,
    factura_rectificada_id: f.factura_rectificada_id ?? null,
    motivo_rectificacion: f.motivo_rectificacion ?? null,
    estado_aeat: f.estado_aeat ?? 'PENDIENTE',
    email_cliente: f.email_cliente ?? null,
    fecha_operacion: f.fecha_operacion ?? null,

    reserva_codigo: undefined,
    reserva_fecha_entrada: undefined,
    reserva_fecha_salida: undefined,
    reserva_noches: undefined,
    reserva_num_huespedes: undefined,
    reserva_tarifa: undefined,
    reserva_precio_noche: undefined,
    reserva_importe_alojamiento: undefined,
    reserva_importe_extra: undefined,
    reserva_importe_limpieza: undefined,
    reserva_descuento: undefined,
    reserva_email: undefined,
    reserva_nombre: undefined,
    reserva_apellidos: undefined,
    reserva_estado_pago: undefined,
    reserva_total: undefined,
    reserva_importe_pagado: undefined,
    reserva_importe_senal: undefined,
  };
}

// ─── Servicio ──────────────────────────────────────────────────────────────────

export const incomeService = {
  async getIncomeData(params: {
    from: string;
    to: string;
  }): Promise<IncomeData> {
    const { from, to } = params;

    if (!from || !to) {
      throw new Error('Los parámetros from y to son obligatorios');
    }

    // 1. Cargar reservas del período
    const { data: reservasData, error: reservasError } = await supabase
      .from('reservas')
      .select(
        `
        id,
        nombre_cliente,
        apellidos_cliente,
        fecha_entrada,
        fecha_salida,
        noches,
        num_huespedes,
        origen,
        tarifa,
        importe_total,
        estado,
        estado_pago
      `
      )
      .gte('fecha_entrada', from)
      .lte('fecha_entrada', to)
      .neq('estado', 'CANCELLED')
      .neq('estado', 'EXPIRED')
      .order('fecha_entrada', { ascending: true });

    if (reservasError) {
      throw reservasError;
    }

    const reservas = (reservasData ?? []) as ReservaIngreso[];

    // 2. Si no hay reservas, devolver estructura vacía válida
    if (reservas.length === 0) {
      return {
        reservas: [],
        facturasMap: {},
      };
    }

    const reservaIds = reservas.map((r) => r.id);

    // 3. Cargar facturas activas ORDINARIAS asociadas a esas reservas
    const { data: facturasData, error: facturasError } = await supabase
      .from('facturas')
      .select(
        `
        id,
        numero_factura,
        fecha_emision,
        nombre_cliente,
        nif_cliente,
        direccion_cliente,
        base_imponible,
        iva_porcentaje,
        cuota_iva,
        total,
        estado,
        reserva_id,
        created_at,
        tipo_factura,
        bloqueada,
        hash_actual,
        hash_anterior,
        factura_rectificada_id,
        motivo_rectificacion,
        estado_aeat,
        email_cliente,
        fecha_operacion,
        lineas
      `
      )
      .in('reserva_id', reservaIds)
      .eq('tipo_factura', 'ORDINARIA')
      .not('estado', 'in', '(ANULADA,RECTIFICADA)');

    if (facturasError) {
      throw facturasError;
    }

    const facturasMap: Record<string, FacturaDetalle> = {};

    for (const factura of facturasData ?? []) {
      if (factura.reserva_id) {
        facturasMap[factura.reserva_id] = mapFacturaLite(factura);
      }
    }

    return {
      reservas,
      facturasMap,
    };
  },
};
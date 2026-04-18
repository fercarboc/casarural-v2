import { supabase, isMockMode } from '../integrations/supabase/client';
import { getMockInvoices } from './invoice.mock';

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export type EstadoFactura = 'EMITIDA' | 'ENVIADA' | 'ANULADA' | 'RECTIFICADA';
export type TipoFactura   = 'ORDINARIA' | 'RECTIFICATIVA';
export type EstadoAeat    = 'PENDIENTE' | 'PREPARADA' | 'ENVIADA' | 'ERROR' | 'NO_APLICA';

export interface FacturaDetalle {
  id: string;
  numero: string;
  fecha_emision: string;
  nombre: string;
  nif: string | null;
  direccion: string | null;
  concepto: string;
  base_imponible: number;
  iva_porcentaje: number;
  iva_importe: number;
  total: number;
  estado: EstadoFactura;
  reserva_id: string | null;
  pdf_url: string | null;
  created_at: string;
  // Billing module — VeriFactu fields
  tipo_factura: TipoFactura;
  bloqueada: boolean;
  hash_actual: string | null;
  hash_anterior: string | null;
  factura_rectificada_id: string | null;
  motivo_rectificacion: string | null;
  estado_aeat: EstadoAeat;
  email_cliente: string | null;
  fecha_operacion: string | null;
  // Campos del join con reservas
  reserva_codigo?: string;
  reserva_fecha_entrada?: string;
  reserva_fecha_salida?: string;
  reserva_noches?: number;
  reserva_num_huespedes?: number;
  reserva_tarifa?: string;
  reserva_precio_noche?: number;
  reserva_importe_alojamiento?: number;
  reserva_importe_extra?: number;
  reserva_importe_limpieza?: number;
  reserva_descuento?: number;
  reserva_email?: string;
  reserva_nombre?: string;
  reserva_apellidos?: string;
  reserva_estado_pago?: string;
  reserva_total?: number;
  reserva_importe_pagado?: number;
  reserva_importe_senal?: number;
}

export interface ReservaParaFactura {
  id: string;
  codigo: string;
  nombre_cliente: string;
  apellidos_cliente: string;
  email_cliente: string;
  fecha_entrada: string;
  fecha_salida: string;
  importe_total: number;
  nif_factura: string | null;
  razon_social: string | null;
  direccion_factura: string | null;
  // v1 compat (optional)
  nombre?: string;
  apellidos?: string;
  email?: string;
  total?: number;
}

// ─── Helpers internos ──────────────────────────────────────────────────────────

const RESERVAS_SELECT = `
  codigo, fecha_entrada, fecha_salida, noches, num_huespedes,
  tarifa, precio_noche, importe_alojamiento, importe_extras,
  importe_limpieza, descuento_aplicado, email_cliente,
  nombre_cliente, apellidos_cliente, estado_pago, importe_total, importe_pagado, importe_senal
`;

function calcIva10(totalConIva: number) {
  const base = Math.round((totalConIva / 1.10) * 100) / 100;
  const iva  = Math.round((totalConIva - base) * 100) / 100;
  return { base, iva };
}

function mapFactura(f: any): FacturaDetalle {
  return {
    id:             f.id,
    numero:         f.numero,
    fecha_emision:  f.fecha_emision,
    nombre:         f.nombre,
    nif:            f.nif,
    direccion:      f.direccion,
    concepto:       f.concepto ?? 'Hospedaje Casa Rural',
    base_imponible: Number(f.base_imponible),
    iva_porcentaje: Number(f.iva_porcentaje),
    iva_importe:    Number(f.iva_importe),
    total:          Number(f.total),
    estado:         f.estado,
    reserva_id:     f.reserva_id,
    pdf_url:        f.pdf_url ?? null,
    created_at:     f.created_at,
    // VeriFactu fields
    tipo_factura:           f.tipo_factura    ?? 'ORDINARIA',
    bloqueada:              f.bloqueada       ?? false,
    hash_actual:            f.hash_actual     ?? null,
    hash_anterior:          f.hash_anterior   ?? null,
    factura_rectificada_id: f.factura_rectificada_id ?? null,
    motivo_rectificacion:   f.motivo_rectificacion   ?? null,
    estado_aeat:            f.estado_aeat     ?? 'PENDIENTE',
    email_cliente:          f.email_cliente   ?? null,
    fecha_operacion:        f.fecha_operacion ?? null,
    reserva_codigo:              f.reservas?.codigo,
    reserva_fecha_entrada:       f.reservas?.fecha_entrada,
    reserva_fecha_salida:        f.reservas?.fecha_salida,
    reserva_noches:              f.reservas?.noches,
    reserva_num_huespedes:       f.reservas?.num_huespedes,
    reserva_tarifa:              f.reservas?.tarifa,
    reserva_precio_noche:        Number(f.reservas?.precio_noche ?? 0),
    reserva_importe_alojamiento: Number(f.reservas?.importe_alojamiento ?? 0),
    reserva_importe_extra:       Number(f.reservas?.importe_extras   ?? f.reservas?.importe_extra   ?? 0),
    reserva_importe_limpieza:    Number(f.reservas?.importe_limpieza ?? 0),
    reserva_descuento:           Number(f.reservas?.descuento_aplicado ?? f.reservas?.descuento ?? 0),
    reserva_email:               f.reservas?.email_cliente ?? f.reservas?.email,
    reserva_nombre:              f.reservas?.nombre_cliente ?? f.reservas?.nombre,
    reserva_apellidos:           f.reservas?.apellidos_cliente ?? f.reservas?.apellidos,
    reserva_estado_pago:         f.reservas?.estado_pago,
    reserva_total:               Number(f.reservas?.importe_total ?? f.reservas?.total ?? 0),
    reserva_importe_pagado:      Number(f.reservas?.importe_pagado ?? 0),
    reserva_importe_senal:       f.reservas?.importe_senal != null ? Number(f.reservas.importe_senal) : undefined,
  };
}

// ─── Servicio ──────────────────────────────────────────────────────────────────

export const invoiceService = {
  // ── Lectura ──────────────────────────────────────────────────────────────────

  async getFacturas(): Promise<FacturaDetalle[]> {
    if (isMockMode) return getMockInvoices() as any;

    const { data, error } = await supabase
      .from('facturas')
      .select(`*, reservas(${RESERVAS_SELECT})`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapFactura);
  },

  async getConfirmedReservasWithoutFactura(): Promise<ReservaParaFactura[]> {
    if (isMockMode) return [];

    const { data: linked } = await supabase
      .from('facturas')
      .select('reserva_id')
      .not('reserva_id', 'is', null);

    const linkedIds = (linked ?? []).map((f: { reserva_id: string }) => f.reserva_id);

    const { data: reservas, error } = await supabase
      .from('reservas')
      .select('id, codigo, nombre_cliente, apellidos_cliente, email_cliente, fecha_entrada, fecha_salida, importe_total, nif_factura, razon_social, direccion_factura')
      .eq('estado', 'CONFIRMED')
      .order('fecha_entrada', { ascending: false });

    if (error) throw error;
    return (reservas ?? []).filter((r: { id: string }) => !linkedIds.includes(r.id)) as ReservaParaFactura[];
  },

  // ── Creación ─────────────────────────────────────────────────────────────────

  async createFactura(
    reservaId: string,
    overrides: { nombre?: string; nif?: string | null; direccion?: string | null }
  ): Promise<FacturaDetalle> {
    const { data: reserva, error: rError } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', reservaId)
      .single();
    if (rError || !reserva) throw new Error('Reserva no encontrada');

    const nombre = overrides.nombre?.trim() ||
      reserva.razon_social ||
      `${reserva.nombre_cliente ?? reserva.nombre ?? ''} ${reserva.apellidos_cliente ?? reserva.apellidos ?? ''}`.trim();

    const importeTotal = Number(reserva.importe_total ?? reserva.total ?? 0);
    const { base, iva } = calcIva10(importeTotal);

    // Número correlativo via RPC (o fallback manual)
    let numero: string;
    const { data: rpcNum } = await supabase.rpc('generar_numero_factura');
    if (rpcNum) {
      numero = rpcNum as string;
    } else {
      // fallback: generar manualmente si la RPC no existe
      const year = new Date().getFullYear();
      const { data: last } = await supabase
        .from('facturas').select('numero')
        .or(`numero.like.FAC-${year}-%,numero.like.F-${year}-%`)
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle();
      const parts = (last?.numero ?? '').split('-');
      const seq = (parseInt(parts[parts.length - 1] ?? '0') || 0) + 1;
      numero = `FAC-${year}-${String(seq).padStart(4, '0')}`;
    }

    const { data: factura, error } = await supabase
      .from('facturas')
      .insert({
        numero,
        reserva_id:     reservaId,
        nombre,
        nif:            overrides.nif ?? reserva.nif_factura ?? null,
        direccion:      overrides.direccion ?? reserva.direccion_factura ?? null,
        concepto:       'Hospedaje Casa Rural',
        base_imponible: base,
        iva_porcentaje: 10,
        iva_importe:    iva,
        total:          importeTotal,
        estado:         'EMITIDA',
      })
      .select(`*, reservas(${RESERVAS_SELECT})`)
      .single();

    if (error) throw error;
    return mapFactura(factura);
  },

  async updateEstado(id: string, estado: EstadoFactura): Promise<void> {
    const { error } = await supabase.from('facturas').update({ estado }).eq('id', id);
    if (error) throw error;
  },

  // ── Facturación fiscal (Edge Functions) ─────────────────────────────────────

  async emitirFacturaFiscal(params: {
    reservaId: string;
    propertyId: string;
    nombre?: string;
    nif?: string | null;
    direccion?: string | null;
    email_cliente?: string | null;
  }): Promise<FacturaDetalle> {
    const { data, error } = await supabase.functions.invoke('create-invoice', { body: params });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return mapFactura(data.factura);
  },

  async emitirRectificativa(params: {
    facturaId: string;
    propertyId: string;
    motivo: string;
  }): Promise<{ rectificativa: FacturaDetalle; original_numero: string }> {
    const { data, error } = await supabase.functions.invoke('create-rectifying-invoice', { body: params });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return { rectificativa: mapFactura(data.rectificativa), original_numero: data.original_numero };
  },

  async enviarEmailFactura(facturaId: string, propertyId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('send-invoice-email', { body: { facturaId, propertyId } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
  },

  async prepararLoteAeat(propertyId: string, facturaIds: string[]): Promise<{ lote_id: string; num_facturas: number }> {
    const { data, error } = await supabase.functions.invoke('prepare-aeat-batch', { body: { propertyId, facturaIds } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },
};

// ─── Funciones adicionales (exportadas directamente) ──────────────────────────

/** Facturas del mes actual */
export async function getFacturasMes(): Promise<FacturaDetalle[]> {
  if (isMockMode) return [];

  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const desde = `${year}-${month}-01`;
  const hasta = now.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('facturas')
    .select(`*, reservas(${RESERVAS_SELECT})`)
    .gte('fecha_emision', desde)
    .lte('fecha_emision', hasta)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapFactura);
}

/** Facturas de una reserva concreta */
export async function getFacturasByReserva(reservaId: string): Promise<FacturaDetalle[]> {
  if (isMockMode) return [];

  const { data, error } = await supabase
    .from('facturas')
    .select(`*, reservas(${RESERVAS_SELECT})`)
    .eq('reserva_id', reservaId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapFactura);
}

/** Crear factura manual para un importe concreto (resto de señal, etc.) */
export async function crearFacturaManual(params: {
  reservaId: string;
  importe: number;
  concepto?: string;
  nombre?: string;
  nif?: string | null;
  direccion?: string | null;
}): Promise<FacturaDetalle> {
  const { data: reserva, error: rError } = await supabase
    .from('reservas')
    .select('*')
    .eq('id', params.reservaId)
    .single();
  if (rError || !reserva) throw new Error('Reserva no encontrada');

  const nombre = params.nombre?.trim() ||
    reserva.razon_social ||
    `${reserva.nombre_cliente ?? reserva.nombre ?? ''} ${reserva.apellidos_cliente ?? reserva.apellidos ?? ''}`.trim();

  const { base, iva } = calcIva10(params.importe);
  const concepto = params.concepto ?? 'Hospedaje Casa Rural';

  // Número via RPC
  let numero: string;
  const { data: rpcNum } = await supabase.rpc('generar_numero_factura');
  if (rpcNum) {
    numero = rpcNum as string;
  } else {
    const year = new Date().getFullYear();
    const { data: last } = await supabase
      .from('facturas').select('numero')
      .or(`numero.like.FAC-${year}-%,numero.like.F-${year}-%`)
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle();
    const parts = (last?.numero ?? '').split('-');
    const seq = (parseInt(parts[parts.length - 1] ?? '0') || 0) + 1;
    numero = `FAC-${year}-${String(seq).padStart(4, '0')}`;
  }

  const { data: factura, error } = await supabase
    .from('facturas')
    .insert({
      numero,
      reserva_id:     params.reservaId,
      nombre,
      nif:            params.nif ?? reserva.nif_factura ?? null,
      direccion:      params.direccion ?? reserva.direccion_factura ?? null,
      concepto,
      base_imponible: base,
      iva_porcentaje: 10,
      iva_importe:    iva,
      total:          params.importe,
      estado:         'EMITIDA',
    })
    .select(`*, reservas(${RESERVAS_SELECT})`)
    .single();

  if (error) throw error;
  return mapFactura(factura);
}

/** Marcar factura como enviada */
export async function marcarEnviada(facturaId: string): Promise<void> {
  return invoiceService.updateEstado(facturaId, 'ENVIADA');
}

/** Guardar URL del PDF generado (Supabase Storage, uso futuro) */
export async function guardarPdfUrl(facturaId: string, pdfUrl: string): Promise<void> {
  const { error } = await supabase
    .from('facturas')
    .update({ pdf_url: pdfUrl })
    .eq('id', facturaId);
  if (error) throw error;
}

/** Obtener facturas con filtros opcionales */
export async function getFacturasFiltradas(filtros: {
  mes?: number;
  año?: number;
  estado?: EstadoFactura | 'TODAS';
  tipo_factura?: TipoFactura | 'TODAS';
  cliente?: string;
}): Promise<FacturaDetalle[]> {
  if (isMockMode) return getMockInvoices() as any;

  let query = supabase
    .from('facturas')
    .select(`*, reservas(${RESERVAS_SELECT})`);

  if (filtros.año) {
    const y = filtros.año;
    if (filtros.mes) {
      const m  = String(filtros.mes).padStart(2, '0');
      const d1 = `${y}-${m}-01`;
      const d2 = new Date(y, filtros.mes, 0).toISOString().split('T')[0]; // último día del mes
      query = query.gte('fecha_emision', d1).lte('fecha_emision', d2);
    } else {
      query = query.gte('fecha_emision', `${y}-01-01`).lte('fecha_emision', `${y}-12-31`);
    }
  }

  if (filtros.estado && filtros.estado !== 'TODAS') {
    query = query.eq('estado', filtros.estado);
  }

  if (filtros.tipo_factura && filtros.tipo_factura !== 'TODAS') {
    query = query.eq('tipo_factura', filtros.tipo_factura);
  }

  if (filtros.cliente) {
    query = query.ilike('nombre', `%${filtros.cliente}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapFactura);
}

/** Registrar cobro manual del resto (efectivo / transferencia / otro) */
export async function registrarCobroManual(params: {
  reservaId: string;
  importe: number;
  metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'OTRO';
  fechaPago: string;   // YYYY-MM-DD
  notas?: string;
}): Promise<void> {
  const { reservaId, importe, metodoPago, fechaPago, notas } = params;

  // 1. Insertar en pagos
  const { error: pagoError } = await supabase.from('pagos').insert({
    reserva_id:  reservaId,
    concepto:    'RESTO',
    importe,
    metodo_pago: metodoPago,
    estado:      'COMPLETADO',
    fecha_pago:  fechaPago,
    notas:       notas ?? null,
  });
  if (pagoError) throw pagoError;

  // 2. Actualizar reserva: importe_pagado acumulado + estado_pago = PAID
  const { data: reserva } = await supabase
    .from('reservas')
    .select('importe_pagado')
    .eq('id', reservaId)
    .single();

  const { error: resError } = await supabase
    .from('reservas')
    .update({
      estado_pago:    'PAID',
      importe_pagado: (Number(reserva?.importe_pagado) || 0) + importe,
      updated_at:     new Date().toISOString(),
    })
    .eq('id', reservaId);
  if (resError) throw resError;
}

/** Generar checkout de Stripe para el resto pendiente (llama a la Edge Function) */
export async function generarStripeCheckoutResto(reservaId: string): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
    body: { reservaId, tipo: 'RESTO' },
  });
  if (error) throw error;
  return data as { url: string };
}

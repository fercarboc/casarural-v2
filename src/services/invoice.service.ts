import { supabase, isMockMode } from '../integrations/supabase/client';
import { getMockInvoices } from './invoice.mock';

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export type EstadoFactura = 'EMITIDA' | 'ENVIADA' | 'ANULADA' | 'RECTIFICADA';
export type TipoFactura = 'ORDINARIA' | 'RECTIFICATIVA';
export type EstadoAeat = 'PENDIENTE' | 'PREPARADA' | 'ENVIADA' | 'ERROR' | 'NO_APLICA';

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

  // VeriFactu
  tipo_factura: TipoFactura;
  bloqueada: boolean;
  hash_actual: string | null;
  hash_anterior: string | null;
  factura_rectificada_id: string | null;
  motivo_rectificacion: string | null;
  estado_aeat: EstadoAeat;
  email_cliente: string | null;
  fecha_operacion: string | null;

  // Join con reservas
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

  // Compat legacy
  nombre?: string;
  apellidos?: string;
  email?: string;
  total?: number;
}

// ─── Helpers internos ──────────────────────────────────────────────────────────

const RESERVAS_SELECT = `
  codigo,
  fecha_entrada,
  fecha_salida,
  noches,
  num_huespedes,
  tarifa,
  precio_noche,
  importe_alojamiento,
  importe_extras,
  importe_limpieza,
  descuento_aplicado,
  email_cliente,
  nombre_cliente,
  apellidos_cliente,
  estado_pago,
  importe_total,
  importe_pagado,
  importe_senal
`;

function calcIva10(totalConIva: number) {
  const base = Math.round((totalConIva / 1.1) * 100) / 100;
  const iva = Math.round((totalConIva - base) * 100) / 100;
  return { base, iva };
}

function buildLineas(concepto: string, base: number, iva: number, total: number) {
  return [
    {
      concepto,
      cantidad: 1,
      base_imponible: base,
      iva_porcentaje: 10,
      cuota_iva: iva,
      total,
    },
  ];
}

function mapFactura(f: any): FacturaDetalle {
  const lineaPrincipal =
    Array.isArray(f.lineas) && f.lineas.length > 0 ? f.lineas[0] : null;

  return {
    id: f.id,
    numero: f.numero_factura,
    fecha_emision: f.fecha_emision,
    nombre: f.nombre_cliente,
    nif: f.nif_cliente,
    direccion: f.direccion_cliente,
    concepto: lineaPrincipal?.concepto ?? 'Hospedaje Casa Rural',
    base_imponible: Number(f.base_imponible ?? 0),
    iva_porcentaje: Number(f.iva_porcentaje ?? 10),
    iva_importe: Number(f.cuota_iva ?? 0),
    total: Number(f.total ?? 0),
    estado: f.estado,
    reserva_id: f.reserva_id,
    pdf_url: null,
    created_at: f.created_at,

    tipo_factura: f.tipo_factura ?? 'ORDINARIA',
    bloqueada: f.bloqueada ?? false,
    hash_actual: f.hash_actual ?? null,
    hash_anterior: f.hash_anterior ?? null,
    factura_rectificada_id: f.factura_rectificada_id ?? null,
    motivo_rectificacion: f.motivo_rectificacion ?? null,
    estado_aeat: f.estado_aeat ?? 'PENDIENTE',
    email_cliente: f.email_cliente ?? null,
    fecha_operacion: f.fecha_operacion ?? null,

    reserva_codigo: f.reservas?.codigo,
    reserva_fecha_entrada: f.reservas?.fecha_entrada,
    reserva_fecha_salida: f.reservas?.fecha_salida,
    reserva_noches: f.reservas?.noches,
    reserva_num_huespedes: f.reservas?.num_huespedes,
    reserva_tarifa: f.reservas?.tarifa,
    reserva_precio_noche: Number(f.reservas?.precio_noche ?? 0),
    reserva_importe_alojamiento: Number(f.reservas?.importe_alojamiento ?? 0),
    reserva_importe_extra: Number(
      f.reservas?.importe_extras ?? f.reservas?.importe_extra ?? 0
    ),
    reserva_importe_limpieza: Number(f.reservas?.importe_limpieza ?? 0),
    reserva_descuento: Number(
      f.reservas?.descuento_aplicado ?? f.reservas?.descuento ?? 0
    ),
    reserva_email: f.reservas?.email_cliente ?? f.reservas?.email,
    reserva_nombre: f.reservas?.nombre_cliente ?? f.reservas?.nombre,
    reserva_apellidos: f.reservas?.apellidos_cliente ?? f.reservas?.apellidos,
    reserva_estado_pago: f.reservas?.estado_pago,
    reserva_total: Number(f.reservas?.importe_total ?? f.reservas?.total ?? 0),
    reserva_importe_pagado: Number(f.reservas?.importe_pagado ?? 0),
    reserva_importe_senal:
      f.reservas?.importe_senal != null ? Number(f.reservas.importe_senal) : undefined,
  };
}

async function generarNumeroFactura(propertyId?: string): Promise<string> {
  if (propertyId) {
    const { data: rpcNum, error: rpcErr } = await supabase.rpc('generar_numero_factura', {
      p_property_id: propertyId,
    });

    if (!rpcErr && rpcNum) {
      return rpcNum as string;
    }
  }

  const year = new Date().getFullYear();

  const { data: last, error } = await supabase
    .from('facturas')
    .select('numero_factura')
    .like('numero_factura', `FAC-${year}-%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const parts = (last?.numero_factura ?? '').split('-');
  const seq = (parseInt(parts[parts.length - 1] ?? '0', 10) || 0) + 1;

  return `FAC-${year}-${String(seq).padStart(4, '0')}`;
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

    const { data: linked, error: linkedErr } = await supabase
      .from('facturas')
      .select('reserva_id, estado, tipo_factura')
      .not('reserva_id', 'is', null)
      .eq('tipo_factura', 'ORDINARIA')
      .not('estado', 'in', '(ANULADA,RECTIFICADA)');

    if (linkedErr) throw linkedErr;

    const linkedIds = (linked ?? [])
      .map((f: any) => f.reserva_id)
      .filter(Boolean) as string[];

    const { data: reservas, error } = await supabase
      .from('reservas')
      .select(`
        id,
        codigo,
        nombre_cliente,
        apellidos_cliente,
        email_cliente,
        fecha_entrada,
        fecha_salida,
        importe_total,
        nif_factura,
        razon_social,
        direccion_factura,
        estado,
        estado_pago
      `)
      .eq('estado', 'CONFIRMED')
      .in('estado_pago', ['PAID', 'PARTIAL'])
      .order('fecha_entrada', { ascending: false });

    if (error) throw error;

    return (reservas ?? []).filter((r: any) => !linkedIds.includes(r.id)) as ReservaParaFactura[];
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

    const nombre =
      overrides.nombre?.trim() ||
      reserva.razon_social ||
      `${reserva.nombre_cliente ?? reserva.nombre ?? ''} ${reserva.apellidos_cliente ?? reserva.apellidos ?? ''}`.trim();

    if (!nombre) throw new Error('El nombre fiscal es obligatorio');

    const importeTotal = Number(reserva.importe_total ?? reserva.total ?? 0);
    if (!Number.isFinite(importeTotal) || importeTotal <= 0) {
      throw new Error('La reserva no tiene un importe válido');
    }

    const { base, iva } = calcIva10(importeTotal);
    const numero = await generarNumeroFactura(reserva.property_id);

    const { data: factura, error } = await supabase
      .from('facturas')
      .insert({
        property_id: reserva.property_id,
        numero_factura: numero,
        reserva_id: reservaId,
        nombre_cliente: nombre,
        nif_cliente: overrides.nif ?? reserva.nif_factura ?? null,
        direccion_cliente: overrides.direccion ?? reserva.direccion_factura ?? null,
        base_imponible: base,
        iva_porcentaje: 10,
        cuota_iva: iva,
        total: importeTotal,
        lineas: buildLineas('Hospedaje Casa Rural', base, iva, importeTotal),
        estado: 'EMITIDA',
        fecha_emision: new Date().toISOString().split('T')[0],
        tipo_factura: 'ORDINARIA',
        bloqueada: false,
        email_cliente: reserva.email_cliente ?? null,
        fecha_operacion: new Date().toISOString().split('T')[0],
      })
      .select(`*, reservas(${RESERVAS_SELECT})`)
      .single();

    if (error) throw error;
    return mapFactura(factura);
  },

  async updateEstado(id: string, estado: EstadoFactura): Promise<void> {
    const { error } = await supabase
      .from('facturas')
      .update({ estado })
      .eq('id', id);

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
    const { data, error } = await supabase.functions.invoke('create-invoice', {
      body: params,
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    return mapFactura(data.factura);
  },

  async emitirRectificativa(params: {
    facturaId: string;
    propertyId: string;
    motivo: string;
  }): Promise<{ rectificativa: FacturaDetalle; original_numero: string }> {
    const { data, error } = await supabase.functions.invoke('create-rectifying-invoice', {
      body: params,
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    return {
      rectificativa: mapFactura(data.rectificativa),
      original_numero: data.original_numero,
    };
  },

  async enviarEmailFactura(facturaId: string, propertyId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('send-invoice-email', {
      body: { facturaId, propertyId },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
  },

  async prepararLoteAeat(
    propertyId: string,
    facturaIds: string[]
  ): Promise<{ lote_id: string; num_facturas: number }> {
    const { data, error } = await supabase.functions.invoke('prepare-aeat-batch', {
      body: { propertyId, facturaIds },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    return data;
  },
};

// ─── Funciones adicionales exportadas ─────────────────────────────────────────

export async function getFacturasMes(): Promise<FacturaDetalle[]> {
  if (isMockMode) return [];

  const now = new Date();
  const year = now.getFullYear();
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

  const nombre =
    params.nombre?.trim() ||
    reserva.razon_social ||
    `${reserva.nombre_cliente ?? reserva.nombre ?? ''} ${reserva.apellidos_cliente ?? reserva.apellidos ?? ''}`.trim();

  if (!nombre) throw new Error('El nombre fiscal es obligatorio');

  const importe = Number(params.importe);
  if (!Number.isFinite(importe) || importe <= 0) {
    throw new Error('El importe debe ser mayor que 0');
  }

  const { base, iva } = calcIva10(importe);
  const concepto = params.concepto ?? 'Hospedaje Casa Rural';
  const numero = await generarNumeroFactura(reserva.property_id);

  const { data: factura, error } = await supabase
    .from('facturas')
    .insert({
      property_id: reserva.property_id,
      numero_factura: numero,
      reserva_id: params.reservaId,
      nombre_cliente: nombre,
      nif_cliente: params.nif ?? reserva.nif_factura ?? null,
      direccion_cliente: params.direccion ?? reserva.direccion_factura ?? null,
      base_imponible: base,
      iva_porcentaje: 10,
      cuota_iva: iva,
      total: importe,
      lineas: buildLineas(concepto, base, iva, importe),
      estado: 'EMITIDA',
      fecha_emision: new Date().toISOString().split('T')[0],
      tipo_factura: 'ORDINARIA',
      bloqueada: false,
      email_cliente: reserva.email_cliente ?? null,
      fecha_operacion: new Date().toISOString().split('T')[0],
    })
    .select(`*, reservas(${RESERVAS_SELECT})`)
    .single();

  if (error) throw error;
  return mapFactura(factura);
}

export async function marcarEnviada(facturaId: string): Promise<void> {
  return invoiceService.updateEstado(facturaId, 'ENVIADA');
}

export async function guardarPdfUrl(_facturaId: string, _pdfUrl: string): Promise<void> {
  // La tabla real no muestra pdf_url.
  // Lo dejo como no-op controlado para no romper llamadas existentes.
  return;
}

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
      const m = String(filtros.mes).padStart(2, '0');
      const d1 = `${y}-${m}-01`;
      const d2 = new Date(y, filtros.mes, 0).toISOString().split('T')[0];
      query = query.gte('fecha_emision', d1).lte('fecha_emision', d2);
    } else {
      query = query
        .gte('fecha_emision', `${y}-01-01`)
        .lte('fecha_emision', `${y}-12-31`);
    }
  }

  if (filtros.estado && filtros.estado !== 'TODAS') {
    query = query.eq('estado', filtros.estado);
  }

  if (filtros.tipo_factura && filtros.tipo_factura !== 'TODAS') {
    query = query.eq('tipo_factura', filtros.tipo_factura);
  }

  if (filtros.cliente) {
    query = query.ilike('nombre_cliente', `%${filtros.cliente}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map(mapFactura);
}

export async function registrarCobroManual(params: {
  reservaId: string;
  importe: number;
  metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'OTRO';
  fechaPago: string;
  notas?: string;
}): Promise<void> {
  const { reservaId, importe, metodoPago, fechaPago, notas } = params;

  const { data: reserva, error: reservaErr } = await supabase
    .from('reservas')
    .select('id, property_id, importe_total, importe_pagado')
    .eq('id', reservaId)
    .single();

  if (reservaErr || !reserva) throw new Error('Reserva no encontrada');

  // OJO:
  // Aquí asumo que tu tabla pagos admite estos campos. Si no coincide,
  // este será el siguiente punto a corregir.
  const { error: pagoError } = await supabase.from('pagos').insert({
    reserva_id: reservaId,
    property_id: reserva.property_id,
    importe,
    metodo_pago: metodoPago,
    estado: 'COMPLETADO',
    fecha_pago: fechaPago,
    notas: notas ?? null,
  });

  if (pagoError) throw pagoError;

  const total = Number(reserva.importe_total ?? 0);
  const pagadoActual = Number(reserva.importe_pagado ?? 0);
  const nuevoPagado = Math.round((pagadoActual + importe) * 100) / 100;

  const nuevoEstadoPago = nuevoPagado >= total ? 'PAID' : 'PARTIAL';

  const { error: resError } = await supabase
    .from('reservas')
    .update({
      estado_pago: nuevoEstadoPago,
      importe_pagado: nuevoPagado,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reservaId);

  if (resError) throw resError;
}

export async function generarStripeCheckoutResto(
  reservaId: string
): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
    body: { reservaId, tipo: 'RESTO' },
  });

  if (error) throw error;
  if (!data?.url) throw new Error('No se recibió la URL de Stripe');

  return data as { url: string };
}
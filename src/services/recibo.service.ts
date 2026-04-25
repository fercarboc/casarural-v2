import { supabase } from '../integrations/supabase/client'

export type TipoRecibo   = 'RESERVA' | 'FIANZA' | 'PAGO_MENSUAL' | 'OTRO'
export type EstadoRecibo = 'PENDIENTE' | 'PAGADO' | 'ACTIVA' | 'DEVUELTA' | 'ANULADO'

export interface Recibo {
  id: string
  property_id: string
  numero_recibo: string
  tipo: TipoRecibo
  reserva_id: string | null
  rental_id: string | null
  rental_payment_id: string | null
  nombre_cliente: string
  nif_cliente: string | null
  direccion_cliente: string | null
  email_cliente: string | null
  concepto: string
  base_imponible: number
  iva_porcentaje: number
  iva_importe: number
  total: number
  fecha_emision: string
  fecha_pago: string | null
  estado: EstadoRecibo
  puede_facturarse: boolean
  factura_id: string | null
  notas: string | null
  created_at: string
}

export interface CreateReciboParams {
  propertyId: string
  tipo: TipoRecibo
  nombreCliente: string
  nifCliente?: string | null
  direccionCliente?: string | null
  emailCliente?: string | null
  concepto: string
  total: number           // con IVA incluido (10%)
  fechaEmision?: string
  reservaId?: string | null
  rentalId?: string | null
  rentalPaymentId?: string | null
  puedeFacturarse?: boolean
  notas?: string | null
  estadoInicial?: EstadoRecibo
}

function calcIva10(totalConIva: number) {
  const base = Math.round((totalConIva / 1.1) * 100) / 100
  const iva  = Math.round((totalConIva - base) * 100) / 100
  return { base, iva }
}

async function generarNumeroRecibo(propertyId: string): Promise<string> {
  const { data, error } = await supabase.rpc('generar_numero_recibo', {
    p_property_id: propertyId,
  })
  if (error || !data) {
    // fallback manual
    const year = new Date().getFullYear()
    const { data: last } = await supabase
      .from('recibos')
      .select('numero_recibo')
      .eq('property_id', propertyId)
      .like('numero_recibo', `REC-${year}-%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const parts = (last?.numero_recibo ?? '').split('-')
    const seq = (parseInt(parts[parts.length - 1] ?? '0', 10) || 0) + 1
    return `REC-${year}-${String(seq).padStart(4, '0')}`
  }
  return data as string
}

export const reciboService = {
  async getRecibos(propertyId: string): Promise<Recibo[]> {
    const { data, error } = await supabase
      .from('recibos')
      .select('*')
      .eq('property_id', propertyId)
      .order('fecha_emision', { ascending: false })
    if (error) throw error
    return (data ?? []) as Recibo[]
  },

  async createRecibo(params: CreateReciboParams): Promise<Recibo> {
    const { base, iva } = calcIva10(params.total)
    const numero = await generarNumeroRecibo(params.propertyId)

    const estadoDefault: EstadoRecibo =
      params.tipo === 'FIANZA' ? 'ACTIVA' : 'PENDIENTE'

    const { data, error } = await supabase
      .from('recibos')
      .insert({
        property_id:       params.propertyId,
        numero_recibo:     numero,
        tipo:              params.tipo,
        reserva_id:        params.reservaId ?? null,
        rental_id:         params.rentalId ?? null,
        rental_payment_id: params.rentalPaymentId ?? null,
        nombre_cliente:    params.nombreCliente,
        nif_cliente:       params.nifCliente ?? null,
        direccion_cliente: params.direccionCliente ?? null,
        email_cliente:     params.emailCliente ?? null,
        concepto:          params.concepto,
        base_imponible:    base,
        iva_porcentaje:    10,
        iva_importe:       iva,
        total:             params.total,
        fecha_emision:     params.fechaEmision ?? new Date().toISOString().split('T')[0],
        estado:            params.estadoInicial ?? estadoDefault,
        puede_facturarse:  params.puedeFacturarse ?? params.tipo !== 'FIANZA',
        notas:             params.notas ?? null,
      })
      .select('*')
      .single()
    if (error) throw error
    return data as Recibo
  },

  async updateEstado(id: string, estado: EstadoRecibo): Promise<void> {
    const { error } = await supabase
      .from('recibos')
      .update({ estado })
      .eq('id', id)
    if (error) throw error
  },

  async convertirAFactura(reciboId: string, propertyId: string) {
    const { data, error } = await supabase.functions.invoke('convert-recibo-to-factura', {
      body: { reciboId, propertyId },
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return data as { factura: any; recibo_numero: string }
  },

  async anular(id: string): Promise<void> {
    const { error } = await supabase
      .from('recibos')
      .update({ estado: 'ANULADO' })
      .eq('id', id)
    if (error) throw error
  },
}

// src/services/rental.service.ts

import { supabase } from '../integrations/supabase/client'

export type RentalEstado =
  | 'SOLICITUD' | 'EN_REVISION' | 'APROBADO'
  | 'ACTIVO' | 'RENOVADO' | 'FINALIZADO' | 'CANCELADO'

export type DocEstado = 'PENDIENTE' | 'VALIDADO' | 'RECHAZADO'

export interface Rental {
  id: string
  property_id: string
  unidad_id: string
  numero_contrato: string | null
  cliente_nombre: string
  cliente_email: string
  cliente_telefono: string | null
  cliente_dni: string | null
  fecha_inicio: string
  fecha_fin: string | null
  fecha_fin_real: string | null
  duracion_meses: number | null
  precio_mensual: number
  fianza: number
  fianza_cobrada: boolean
  fianza_devuelta: boolean
  forma_pago: 'TARJETA' | 'SEPA' | 'TRANSFERENCIA' | 'EFECTIVO'
  incluye_gastos: boolean
  incluye_limpieza: boolean
  frecuencia_limpieza: string | null
  num_ocupantes: number
  notas_solicitud: string | null
  // Campos solicitud extendida
  estado_laboral: string | null
  motivo_estancia: string | null
  mascotas: boolean
  num_mascotas: number | null
  tipo_mascotas: string | null
  descripcion_solicitud: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  estado: RentalEstado
  notas: string | null
  created_at: string
  updated_at: string
  // Joined
  unidad_nombre?: string
  unidad_slug?: string
}

export interface RentalMessage {
  id: string
  property_id: string
  rental_id: string
  direction: 'OUTBOUND' | 'INBOUND'
  channel: 'EMAIL' | 'WHATSAPP' | 'NOTA'
  subject: string | null
  body: string
  sent_by: string | null
  sent_at: string
  created_at: string
}

export interface RentalDocument {
  id: string
  property_id: string
  rental_id: string
  document_type: string
  file_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  estado: DocEstado
  notas_admin: string | null
  created_at: string
}

export interface RentalRenewal {
  id: string
  property_id: string
  rental_id: string
  fecha_inicio: string
  fecha_fin: string | null
  duracion_meses: number | null
  nuevo_precio: number | null
  notas: string | null
  created_at: string
}

export interface RentalIncident {
  id: string
  property_id: string
  rental_id: string
  titulo: string
  descripcion: string | null
  estado: 'ABIERTA' | 'EN_GESTION' | 'CERRADA'
  created_at: string
  updated_at: string
}

export interface RentalFilters {
  estado?: RentalEstado | 'TODAS'
  unidad_id?: string
}

export const RENTAL_ESTADO_LABEL: Record<RentalEstado, string> = {
  SOLICITUD:   'Solicitud',
  EN_REVISION: 'En revisión',
  APROBADO:    'Aprobado',
  ACTIVO:      'Activo',
  RENOVADO:    'Renovado',
  FINALIZADO:  'Finalizado',
  CANCELADO:   'Cancelado',
}

export const RENTAL_ESTADO_CLS: Record<RentalEstado, string> = {
  SOLICITUD:   'bg-blue-500/10 text-blue-300 border border-blue-500/20',
  EN_REVISION: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
  APROBADO:    'bg-violet-500/10 text-violet-300 border border-violet-500/20',
  ACTIVO:      'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
  RENOVADO:    'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
  FINALIZADO:  'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  CANCELADO:   'bg-red-500/10 text-red-300 border border-red-500/20',
}

export const RENTAL_NEXT_STATES: Record<RentalEstado, RentalEstado[]> = {
  SOLICITUD:   ['EN_REVISION', 'CANCELADO'],
  EN_REVISION: ['APROBADO', 'CANCELADO'],
  APROBADO:    ['ACTIVO', 'CANCELADO'],
  ACTIVO:      ['RENOVADO', 'FINALIZADO', 'CANCELADO'],
  RENOVADO:    ['ACTIVO', 'FINALIZADO'],
  FINALIZADO:  [],
  CANCELADO:   [],
}

const RENTAL_SELECT = `
  *,
  unidades(nombre, slug)
`

function mapRental(raw: any): Rental {
  return {
    ...raw,
    unidad_nombre: raw.unidades?.nombre ?? null,
    unidad_slug:   raw.unidades?.slug   ?? null,
  }
}

export const rentalService = {
  async getRentals(propertyId: string, filters: RentalFilters = {}): Promise<Rental[]> {
    let q = supabase
      .from('rentals')
      .select(RENTAL_SELECT)
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })

    if (filters.estado && filters.estado !== 'TODAS') q = q.eq('estado', filters.estado)
    if (filters.unidad_id) q = q.eq('unidad_id', filters.unidad_id)

    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map(mapRental)
  },

  async getRentalById(id: string): Promise<Rental> {
    const { data, error } = await supabase
      .from('rentals')
      .select(RENTAL_SELECT)
      .eq('id', id)
      .single()
    if (error) throw error
    return mapRental(data)
  },

  async createRental(data: Omit<Rental, 'id' | 'created_at' | 'updated_at' | 'unidad_nombre' | 'unidad_slug'>): Promise<Rental> {
    const { data: row, error } = await supabase
      .from('rentals')
      .insert(data)
      .select(RENTAL_SELECT)
      .single()
    if (error) throw error
    return mapRental(row)
  },

  async updateRental(id: string, data: Partial<Rental>): Promise<Rental> {
    const { data: row, error } = await supabase
      .from('rentals')
      .update(data)
      .eq('id', id)
      .select(RENTAL_SELECT)
      .single()
    if (error) throw error
    return mapRental(row)
  },

  async changeEstado(id: string, currentEstado: RentalEstado, newEstado: RentalEstado, notas?: string): Promise<Rental> {
    const allowed = RENTAL_NEXT_STATES[currentEstado]
    if (!allowed.includes(newEstado)) {
      throw new Error(`Transición no permitida: ${currentEstado} → ${newEstado}`)
    }
    const update: Record<string, any> = { estado: newEstado }
    if (notas !== undefined) update.notas = notas
    return rentalService.updateRental(id, update)
  },

  // ── Documents ────────────────────────────────────────────────────────────────

  async getDocuments(rentalId: string): Promise<RentalDocument[]> {
    const { data, error } = await supabase
      .from('rental_documents')
      .select('*')
      .eq('rental_id', rentalId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async validateDocument(id: string, estado: DocEstado, notas_admin?: string): Promise<RentalDocument> {
    const { data, error } = await supabase
      .from('rental_documents')
      .update({ estado, notas_admin: notas_admin ?? null })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data
  },

  async getDocumentUrl(filePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('rental-documents')
      .createSignedUrl(filePath, 3600)
    if (error) throw error
    return data.signedUrl
  },

  async deleteDocument(id: string): Promise<void> {
    const { error } = await supabase.from('rental_documents').delete().eq('id', id)
    if (error) throw error
  },

  // ── Renewals ─────────────────────────────────────────────────────────────────

  async getRenewals(rentalId: string): Promise<RentalRenewal[]> {
    const { data, error } = await supabase
      .from('rental_renewals')
      .select('*')
      .eq('rental_id', rentalId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async createRenewal(data: Omit<RentalRenewal, 'id' | 'created_at'>): Promise<RentalRenewal> {
    const { data: row, error } = await supabase
      .from('rental_renewals')
      .insert(data)
      .select('*')
      .single()
    if (error) throw error
    return row
  },

  // ── Incidents ────────────────────────────────────────────────────────────────

  async getIncidents(rentalId: string): Promise<RentalIncident[]> {
    const { data, error } = await supabase
      .from('rental_incidents')
      .select('*')
      .eq('rental_id', rentalId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async createIncident(data: Omit<RentalIncident, 'id' | 'created_at' | 'updated_at'>): Promise<RentalIncident> {
    const { data: row, error } = await supabase
      .from('rental_incidents')
      .insert(data)
      .select('*')
      .single()
    if (error) throw error
    return row
  },

  async updateIncidentEstado(id: string, estado: RentalIncident['estado']): Promise<void> {
    const { error } = await supabase
      .from('rental_incidents')
      .update({ estado })
      .eq('id', id)
    if (error) throw error
  },

  // ── KPIs ─────────────────────────────────────────────────────────────────────

  async getKPIs(propertyId: string) {
    const [solicitudes, activos, pendientesRevision] = await Promise.all([
      supabase.from('rentals').select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId).eq('estado', 'SOLICITUD'),
      supabase.from('rentals').select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId).in('estado', ['ACTIVO', 'RENOVADO']),
      supabase.from('rentals').select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId).eq('estado', 'EN_REVISION'),
    ])
    return {
      solicitudes:        solicitudes.count  ?? 0,
      activos:            activos.count       ?? 0,
      pendientesRevision: pendientesRevision.count ?? 0,
    }
  },

  // ── Estado via EF (con email+WhatsApp+log) ────────────────────────────────────

  async changeEstadoViaEF(
    rentalId: string,
    newEstado: RentalEstado,
    notas?: string,
    messageTenant?: string,
  ): Promise<void> {
    const res = await supabase.functions.invoke('update-rental-status', {
      body: { rental_id: rentalId, new_estado: newEstado, notas, message_to_tenant: messageTenant },
    })
    if (res.error) throw new Error(res.error.message)
    if (!res.data?.ok) throw new Error(res.data?.error ?? 'Error actualizando estado')
  },

  // ── Mensajes ──────────────────────────────────────────────────────────────────

  async getMessages(rentalId: string): Promise<RentalMessage[]> {
    const { data, error } = await supabase
      .from('rental_messages')
      .select('*')
      .eq('rental_id', rentalId)
      .order('sent_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async sendMessage(rentalId: string, subject: string, body: string, sendWhatsapp = false): Promise<void> {
    const res = await supabase.functions.invoke('update-rental-status', {
      body: { rental_id: rentalId, action: 'SEND_MESSAGE', subject, body, send_whatsapp: sendWhatsapp },
    })
    if (res.error) throw new Error(res.error.message)
    if (!res.data?.ok) throw new Error(res.data?.error ?? 'Error enviando mensaje')
  },

  async requestDocs(rentalId: string, docTypes: string[], message?: string): Promise<void> {
    const res = await supabase.functions.invoke('update-rental-status', {
      body: { rental_id: rentalId, action: 'REQUEST_DOCS', doc_types: docTypes, message },
    })
    if (res.error) throw new Error(res.error.message)
    if (!res.data?.ok) throw new Error(res.data?.error ?? 'Error solicitando documentación')
  },
}

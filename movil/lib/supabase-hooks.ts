'use client'

import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import type { Reservation, Accommodation, Rental, Contract, Payment, Alert, Client, CleaningTask } from './mock-data'

// --- Status mappers ---

function mapEstado(estado: string): 'confirmed' | 'pending' | 'cancelled' {
  switch (estado) {
    case 'CONFIRMED': return 'confirmed'
    case 'PENDING_PAYMENT': return 'pending'
    case 'CANCELLED':
    case 'EXPIRED':
    case 'NO_SHOW': return 'cancelled'
    default: return 'pending'
  }
}

function mapOrigen(origen: string): 'booking' | 'airbnb' | 'direct' | 'other' {
  switch (origen) {
    case 'BOOKING_ICAL': return 'booking'
    case 'AIRBNB_ICAL': return 'airbnb'
    case 'DIRECT_WEB':
    case 'ADMIN': return 'direct'
    default: return 'other'
  }
}

function mapRentalEstado(estado: string, fechaFin: string | null): 'active' | 'expiring' | 'expired' | 'renewed' {
  if (estado === 'RENOVADO') return 'renewed'
  if (estado === 'FINALIZADO' || estado === 'CANCELADO') return 'expired'
  if (estado === 'ACTIVO') {
    if (fechaFin) {
      const daysLeft = (new Date(fechaFin).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      if (daysLeft >= 0 && daysLeft <= 30) return 'expiring'
    }
    return 'active'
  }
  return 'active'
}

function mapFianzaEstado(estado: string): 'paid' | 'pending' | 'returned' {
  switch (estado) {
    case 'ACTIVA': return 'paid'
    case 'DEVUELTA':
    case 'DEVUELTA_PARCIAL': return 'returned'
    default: return 'pending'
  }
}

function mapPaymentEstado(estado: string): 'paid' | 'pending' | 'overdue' {
  switch (estado) {
    case 'PAGADO': return 'paid'
    case 'VENCIDO': return 'overdue'
    default: return 'pending'
  }
}

function mapIncidentEstado(estado: string): 'open' | 'in-progress' | 'closed' {
  switch (estado) {
    case 'ABIERTA': return 'open'
    case 'EN_GESTION': return 'in-progress'
    case 'CERRADA': return 'closed'
    default: return 'open'
  }
}

// --- Hooks ---

export function useReservas(propertyId: string) {
  const [data, setData] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!propertyId) {
      setData([])
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)
      const { data: rows, error: err } = await supabase
        .from('reservas')
        .select(`
          id, codigo, nombre_cliente, apellidos_cliente, fecha_entrada, fecha_salida,
          noches, num_huespedes, importe_total, estado, origen, notas_admin,
          reserva_unidades(unidades(id, nombre))
        `)
        .eq('property_id', propertyId)
        .order('fecha_entrada', { ascending: false })

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      const mapped: Reservation[] = (rows ?? []).map((r: any) => ({
        id: r.id,
        code: r.codigo ?? `RES-${r.id.slice(0, 6).toUpperCase()}`,
        guestId: r.id,
        guestName: `${r.nombre_cliente ?? ''} ${r.apellidos_cliente ?? ''}`.trim() || 'Sin nombre',
        accommodationId: r.reserva_unidades?.[0]?.unidades?.id ?? '',
        accommodationName: r.reserva_unidades?.[0]?.unidades?.nombre ?? 'Sin alojamiento',
        tenantId: propertyId,
        checkIn: r.fecha_entrada ?? '',
        checkOut: r.fecha_salida ?? '',
        nights: r.noches ?? 0,
        guests: r.num_huespedes ?? 1,
        amount: r.importe_total ?? 0,
        status: mapEstado(r.estado ?? ''),
        source: mapOrigen(r.origen ?? ''),
        notes: r.notas_admin ?? undefined,
      }))

      setData(mapped)
      setLoading(false)
    }

    load()
  }, [propertyId, refreshKey])

  return { data, loading, error, refetch: () => setRefreshKey(k => k + 1) }
}

export function useUnidades(propertyId: string) {
  const [data, setData] = useState<Accommodation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!propertyId) {
      setData([])
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)
      const { data: rows, error: err } = await supabase
        .from('unidades')
        .select('id, nombre, tipo, capacidad_base, activa, modo_operacion')
        .eq('property_id', propertyId)
        .eq('activa', true)
        .order('nombre')

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      const mapped: Accommodation[] = (rows ?? []).map((u: any) => ({
        id: u.id,
        tenantId: propertyId,
        name: u.nombre ?? '',
        type: u.tipo === 'CASA_RURAL' ? 'casa-completa' as const : 'apartamento-completo' as const,
        modality: u.modo_operacion === 'LONG' ? 'larga-estancia' as const : 'corta-estancia' as const,
        capacity: u.capacidad_base ?? 1,
        status: 'disponible' as const,
      }))

      setData(mapped)
      setLoading(false)
    }

    load()
  }, [propertyId])

  return { data, loading, error }
}

export function useRentals(propertyId: string) {
  const [data, setData] = useState<Rental[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!propertyId) {
      setData([])
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)
      const { data: rows, error: err } = await supabase
        .from('rentals')
        .select(`
          id, unidad_id, cliente_nombre, fecha_inicio, fecha_fin,
          precio_mensual, fianza, fianza_estado, estado,
          unidades(nombre)
        `)
        .eq('property_id', propertyId)
        .order('fecha_inicio', { ascending: false })

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      const mapped: Rental[] = (rows ?? []).map((r: any) => ({
        id: r.id,
        accommodationId: r.unidad_id ?? '',
        accommodationName: (r.unidades as any)?.nombre ?? 'Sin unidad',
        tenantId: propertyId,
        clientId: r.id,
        clientName: r.cliente_nombre ?? 'Sin nombre',
        startDate: r.fecha_inicio ?? '',
        endDate: r.fecha_fin ?? '',
        monthlyRent: r.precio_mensual ?? 0,
        deposit: r.fianza ?? 0,
        depositStatus: mapFianzaEstado(r.fianza_estado ?? ''),
        contractStatus: mapRentalEstado(r.estado ?? '', r.fecha_fin),
        paymentDay: 1,
      }))

      setData(mapped)
      setLoading(false)
    }

    load()
  }, [propertyId])

  return { data, loading, error }
}

export function useContracts(propertyId: string) {
  const [data, setData] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!propertyId) {
      setData([])
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)
      const { data: rows, error: err } = await supabase
        .from('rentals')
        .select(`id, cliente_nombre, fecha_inicio, fecha_fin, estado, unidades(nombre)`)
        .eq('property_id', propertyId)
        .order('fecha_fin', { ascending: false })

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      const mapped: Contract[] = (rows ?? []).map((r: any) => {
        let status: 'signed' | 'pending' | 'expired' | 'renewed'
        switch (r.estado) {
          case 'ACTIVO': status = 'signed'; break
          case 'RENOVADO': status = 'renewed'; break
          case 'FINALIZADO':
          case 'CANCELADO': status = 'expired'; break
          default: status = 'pending'; break
        }
        return {
          id: r.id,
          rentalId: r.id,
          clientName: r.cliente_nombre ?? 'Sin nombre',
          accommodationName: (r.unidades as any)?.nombre ?? 'Sin unidad',
          tenantId: propertyId,
          startDate: r.fecha_inicio ?? '',
          endDate: r.fecha_fin ?? '',
          status,
        }
      })

      setData(mapped)
      setLoading(false)
    }

    load()
  }, [propertyId])

  return { data, loading, error }
}

export function useRentalPayments(propertyId: string) {
  const [data, setData] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!propertyId) {
      setData([])
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)
      const { data: rows, error: err } = await supabase
        .from('rental_payments')
        .select(`
          id, rental_id, tipo, concepto, importe, fecha_vencimiento, fecha_pago, estado,
          rentals(cliente_nombre, unidades(nombre))
        `)
        .eq('property_id', propertyId)
        .order('fecha_vencimiento', { ascending: false })

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      const mapped: Payment[] = (rows ?? []).map((p: any) => ({
        id: p.id,
        rentalId: p.rental_id ?? '',
        clientId: p.rental_id ?? '',
        clientName: (p.rentals as any)?.cliente_nombre ?? 'Sin nombre',
        accommodationName: (p.rentals as any)?.unidades?.nombre ?? 'Sin unidad',
        tenantId: propertyId,
        amount: p.importe ?? 0,
        dueDate: p.fecha_vencimiento ?? '',
        paidDate: p.fecha_pago ?? undefined,
        status: mapPaymentEstado(p.estado ?? ''),
        concept: p.concepto ?? p.tipo ?? '',
        month: p.fecha_vencimiento
          ? new Date(p.fecha_vencimiento).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
          : '',
      }))

      setData(mapped)
      setLoading(false)
    }

    load()
  }, [propertyId, refreshKey])

  return { data, loading, error, refetch: () => setRefreshKey(k => k + 1) }
}

export function useIncidents(propertyId: string) {
  const [data, setData] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!propertyId) {
      setData([])
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)
      const { data: rows, error: err } = await supabase
        .from('rental_incidents')
        .select(`
          id, rental_id, titulo, descripcion, estado, created_at,
          rentals(unidades(id, nombre))
        `)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      const mapped: Alert[] = (rows ?? []).map((i: any) => ({
        id: i.id,
        tenantId: propertyId,
        accommodationId: (i.rentals as any)?.unidades?.id ?? undefined,
        accommodationName: (i.rentals as any)?.unidades?.nombre ?? undefined,
        type: 'maintenance' as const,
        title: i.titulo ?? 'Sin título',
        description: i.descripcion ?? '',
        priority: 'medium' as const,
        status: mapIncidentEstado(i.estado ?? ''),
        createdAt: i.created_at ?? '',
      }))

      setData(mapped)
      setLoading(false)
    }

    load()
  }, [propertyId])

  return { data, loading, error }
}

export function useClients(propertyId: string) {
  const [data, setData] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!propertyId) {
      setData([])
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)

      const [guestsRes, tenantsRes] = await Promise.all([
        supabase
          .from('reservas')
          .select('id, nombre_cliente, apellidos_cliente, email_cliente, telefono_cliente')
          .eq('property_id', propertyId)
          .not('email_cliente', 'is', null)
          .order('nombre_cliente'),
        supabase
          .from('rentals')
          .select('id, cliente_nombre, cliente_email, cliente_telefono')
          .eq('property_id', propertyId)
          .not('cliente_email', 'is', null)
          .order('cliente_nombre'),
      ])

      if (guestsRes.error || tenantsRes.error) {
        setError((guestsRes.error ?? tenantsRes.error)?.message ?? 'Error')
        setLoading(false)
        return
      }

      const seenEmails = new Set<string>()
      const mappedGuests: Client[] = []
      for (const g of (guestsRes.data ?? [])) {
        const email = (g as any).email_cliente
        if (email && !seenEmails.has(email)) {
          seenEmails.add(email)
          mappedGuests.push({
            id: (g as any).id,
            name: `${(g as any).nombre_cliente ?? ''} ${(g as any).apellidos_cliente ?? ''}`.trim() || 'Sin nombre',
            email,
            phone: (g as any).telefono_cliente ?? '',
            type: 'guest',
          })
        }
      }

      const mappedTenants: Client[] = (tenantsRes.data ?? []).map((t: any) => ({
        id: t.id,
        name: t.cliente_nombre ?? 'Sin nombre',
        email: t.cliente_email ?? '',
        phone: t.cliente_telefono ?? '',
        type: 'tenant' as const,
      }))

      setData([...mappedGuests, ...mappedTenants])
      setLoading(false)
    }

    load()
  }, [propertyId])

  return { data, loading, error }
}

export function useCleaningTasks(propertyId: string) {
  const [data, setData] = useState<CleaningTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!propertyId) {
      setData([])
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)
      const { data: rows, error: err } = await supabase
        .from('cleaning_jobs')
        .select(`
          id, unit_id, scheduled_date, origin, priority, status,
          notes_internal, unidades(nombre), cleaning_staff(name), reservas(codigo)
        `)
        .eq('property_id', propertyId)
        .neq('status', 'CANCELLED')
        .order('scheduled_date', { ascending: true })

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      const mapOrigin = (o: string): CleaningTask['type'] => {
        switch (o) {
          case 'AUTO_CHECKOUT': return 'checkout'
          case 'AUTO_PROGRAMMED': return 'periodic'
          default: return 'manual'
        }
      }

      const mapPriority = (p: string): CleaningTask['priority'] => {
        if (p === 'HIGH' || p === 'URGENT') return 'high'
        if (p === 'LOW') return 'low'
        return 'medium'
      }

      const mapped: CleaningTask[] = (rows ?? []).map((j: any) => ({
        id: j.id,
        accommodationId: j.unit_id ?? '',
        accommodationName: (j.unidades as any)?.nombre ?? 'Sin unidad',
        tenantId: propertyId,
        date: j.scheduled_date ?? '',
        type: mapOrigin(j.origin ?? ''),
        priority: mapPriority(j.priority ?? ''),
        status: j.status === 'DONE' ? 'completed' : 'pending',
        notes: j.notes_internal ?? undefined,
        assignee: (j.cleaning_staff as any)?.name ?? undefined,
        reservationCode: (j.reservas as any)?.codigo ?? undefined,
      }))

      setData(mapped)
      setLoading(false)
    }

    load()
  }, [propertyId, refreshKey])

  return { data, loading, error, refetch: () => setRefreshKey(k => k + 1) }
}

export interface Bloqueo {
  id: string
  unidadId: string
  fechaInicio: string
  fechaFin: string
  motivo: string | null
  origen: string
}

export function useBloqueos(propertyId: string) {
  const [data, setData] = useState<Bloqueo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!propertyId) {
      setData([])
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      const { data: rows } = await supabase
        .from('bloqueos')
        .select('id, unidad_id, fecha_inicio, fecha_fin, motivo, origen')
        .eq('property_id', propertyId)
        .order('fecha_inicio')

      setData((rows ?? []).map((b: any) => ({
        id: b.id,
        unidadId: b.unidad_id,
        fechaInicio: b.fecha_inicio,
        fechaFin: b.fecha_fin,
        motivo: b.motivo,
        origen: b.origen,
      })))
      setLoading(false)
    }

    load()
  }, [propertyId, refreshKey])

  return { data, loading, refetch: () => setRefreshKey(k => k + 1) }
}

// --- Mutations ---

export async function markPaymentAsPaid(paymentId: string): Promise<{ error: string | null }> {
  const today = new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from('rental_payments')
    .update({ estado: 'PAGADO', fecha_pago: today })
    .eq('id', paymentId)
  return { error: error?.message ?? null }
}

export async function markCleaningJobDone(jobId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('cleaning_jobs')
    .update({ status: 'DONE' })
    .eq('id', jobId)
  return { error: error?.message ?? null }
}

export async function createBloqueo(params: {
  propertyId: string
  unidadId: string
  fechaInicio: string
  fechaFin: string
  motivo?: string
}): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('bloqueos')
    .insert({
      property_id: params.propertyId,
      unidad_id: params.unidadId,
      fecha_inicio: params.fechaInicio,
      fecha_fin: params.fechaFin,
      motivo: params.motivo || null,
      origen: 'ADMIN',
    })
  return { error: error?.message ?? null }
}

export async function createReservaManual(params: {
  propertyId: string
  unidadId: string
  nombreCliente: string
  apellidosCliente?: string
  emailCliente?: string
  telefonoCliente?: string
  fechaEntrada: string
  fechaSalida: string
  numHuespedes: number
  importeTotal?: number
}): Promise<{ error: string | null }> {
  const noches = Math.round(
    (new Date(params.fechaSalida).getTime() - new Date(params.fechaEntrada).getTime()) /
    (1000 * 60 * 60 * 24)
  )

  const { data: reserva, error: err1 } = await supabase
    .from('reservas')
    .insert({
      property_id: params.propertyId,
      nombre_cliente: params.nombreCliente,
      apellidos_cliente: params.apellidosCliente || null,
      email_cliente: params.emailCliente || null,
      telefono_cliente: params.telefonoCliente || null,
      fecha_entrada: params.fechaEntrada,
      fecha_salida: params.fechaSalida,
      noches,
      num_huespedes: params.numHuespedes,
      importe_total: params.importeTotal ?? 0,
      estado: 'CONFIRMED',
      origen: 'ADMIN',
    })
    .select('id')
    .single()

  if (err1) return { error: err1.message }

  const { error: err2 } = await supabase
    .from('reserva_unidades')
    .insert({ reserva_id: reserva.id, unidad_id: params.unidadId })

  return { error: err2?.message ?? null }
}

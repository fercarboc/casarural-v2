'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { MobileHeader } from '@/components/mobile/mobile-header'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'
import { StatusBadge } from '@/components/mobile/status-badge'
import { supabase } from '@/lib/supabase'
import { Phone, Mail, Home, Calendar, Users, Banknote, Send, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReservaDetail {
  id: string
  codigo: string | null
  nombre_cliente: string | null
  apellidos_cliente: string | null
  email_cliente: string | null
  telefono_cliente: string | null
  fecha_entrada: string
  fecha_salida: string
  noches: number
  num_huespedes: number
  importe_total: number
  estado: string
  origen: string
  notas_admin: string | null
  accommodationName: string
}

const sourceLabel: Record<string, string> = {
  BOOKING_ICAL: 'Booking.com',
  AIRBNB_ICAL: 'Airbnb',
  DIRECT_WEB: 'Web directa',
  ADMIN: 'Directa',
}

function mapEstado(estado: string): 'confirmed' | 'pending' | 'cancelled' {
  switch (estado) {
    case 'CONFIRMED': return 'confirmed'
    case 'PENDING_PAYMENT': return 'pending'
    default: return 'cancelled'
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

function Row({ icon, label, value, bold }: {
  icon?: React.ReactNode
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className={bold ? 'text-lg font-semibold text-primary' : 'text-sm font-medium'}>
        {value}
      </span>
    </div>
  )
}

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [reserva, setReserva] = useState<ReservaDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const { data, error: err } = await supabase
        .from('reservas')
        .select(`
          id, codigo, nombre_cliente, apellidos_cliente, email_cliente, telefono_cliente,
          fecha_entrada, fecha_salida, noches, num_huespedes, importe_total, estado, origen, notas_admin,
          reserva_unidades(unidades(nombre))
        `)
        .eq('id', id)
        .single()

      if (err) { setError(err.message); setLoading(false); return }

      setReserva({
        ...data,
        noches: data.noches ?? 0,
        num_huespedes: data.num_huespedes ?? 1,
        importe_total: data.importe_total ?? 0,
        accommodationName: (data.reserva_unidades as any)?.[0]?.unidades?.nombre ?? 'Sin alojamiento',
      })
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MobileHeader title="Reserva" showBack backHref="/m/reservas" />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  if (error || !reserva) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MobileHeader title="Reserva" showBack backHref="/m/reservas" />
        <main className="flex-1 flex items-center justify-center px-4">
          <p className="text-sm text-red-500 text-center">{error ?? 'Reserva no encontrada'}</p>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  const guestName = [reserva.nombre_cliente, reserva.apellidos_cliente].filter(Boolean).join(' ') || 'Sin nombre'
  const status = mapEstado(reserva.estado)
  const code = reserva.codigo ?? `RES-${reserva.id.slice(0, 6).toUpperCase()}`

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader title={code} showBack backHref="/m/reservas" />

      <main className="flex-1 pb-20 overflow-y-auto">

        {/* Guest + status */}
        <div className="px-4 py-4 border-b border-border flex items-start justify-between gap-3">
          <div>
            <p className="text-xl font-semibold">{guestName}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{reserva.accommodationName}</p>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Estancia */}
        <div className="px-4 py-4 border-b border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Estancia</h3>
          <div className="space-y-2">
            <Row
              icon={<Calendar className="h-3.5 w-3.5 text-green-600" />}
              label="Entrada"
              value={formatDate(reserva.fecha_entrada)}
            />
            <Row
              icon={<Calendar className="h-3.5 w-3.5 text-amber-600" />}
              label="Salida"
              value={formatDate(reserva.fecha_salida)}
            />
            <Row
              icon={<Home className="h-3.5 w-3.5 text-primary" />}
              label="Alojamiento"
              value={reserva.accommodationName}
            />
            <Row
              icon={<Users className="h-3.5 w-3.5 text-muted-foreground" />}
              label="Huéspedes"
              value={`${reserva.num_huespedes} persona${reserva.num_huespedes !== 1 ? 's' : ''}`}
            />
            <Row
              label="Noches"
              value={`${reserva.noches} noche${reserva.noches !== 1 ? 's' : ''}`}
            />
            <div className="pt-2 border-t border-border">
              <Row
                icon={<Banknote className="h-3.5 w-3.5 text-primary" />}
                label="Importe total"
                value={`${reserva.importe_total}€`}
                bold
              />
            </div>
          </div>
        </div>

        {/* Contacto */}
        {(reserva.email_cliente || reserva.telefono_cliente) && (
          <div className="px-4 py-4 border-b border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contacto</h3>
            <div className="space-y-2">
              {reserva.telefono_cliente && (
                <a
                  href={`tel:${reserva.telefono_cliente}`}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border active:bg-muted"
                >
                  <div className="p-2 rounded-lg bg-green-100 shrink-0">
                    <Phone className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                    <p className="font-medium">{reserva.telefono_cliente}</p>
                  </div>
                </a>
              )}
              {reserva.email_cliente && (
                <a
                  href={`mailto:${reserva.email_cliente}`}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border active:bg-muted"
                >
                  <div className="p-2 rounded-lg bg-blue-100 shrink-0">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{reserva.email_cliente}</p>
                  </div>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Origen */}
        <div className="px-4 py-4 border-b border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Origen</h3>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{sourceLabel[reserva.origen] ?? reserva.origen}</span>
          </div>
        </div>

        {/* Notas */}
        {reserva.notas_admin && (
          <div className="px-4 py-4 border-b border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notas</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{reserva.notas_admin}</p>
          </div>
        )}

        {/* Acción principal */}
        {status === 'confirmed' && reserva.email_cliente && (
          <div className="px-4 py-4">
            <a
              href={`mailto:${reserva.email_cliente}?subject=Instrucciones de entrada - ${reserva.accommodationName}&body=Hola ${reserva.nombre_cliente},%0A%0ATe enviamos las instrucciones para tu llegada el ${reserva.fecha_entrada}.`}
            >
              <Button className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Enviar instrucciones de entrada
              </Button>
            </a>
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  )
}

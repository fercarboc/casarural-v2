'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { MobileHeader } from '@/components/mobile/mobile-header'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'
import { StatusBadge } from '@/components/mobile/status-badge'
import { supabase } from '@/lib/supabase'
import { Phone, Mail, Home, Calendar, Banknote, FileText, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface RentalDetail {
  id: string
  cliente_nombre: string | null
  cliente_email: string | null
  cliente_telefono: string | null
  fecha_inicio: string
  fecha_fin: string | null
  precio_mensual: number
  fianza: number
  fianza_estado: string
  estado: string
  dia_pago: number | null
  notas: string | null
  accommodationName: string
}

function mapContractStatus(estado: string, fechaFin: string | null): 'active' | 'expiring' | 'expired' | 'renewed' {
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

function mapDepositStatus(estado: string): 'paid' | 'pending' | 'returned' {
  switch (estado) {
    case 'ACTIVA': return 'paid'
    case 'DEVUELTA':
    case 'DEVUELTA_PARCIAL': return 'returned'
    default: return 'pending'
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

export default function RentalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [rental, setRental] = useState<RentalDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const { data, error: err } = await supabase
        .from('rentals')
        .select(`
          id, cliente_nombre, cliente_email, cliente_telefono,
          fecha_inicio, fecha_fin, precio_mensual, fianza, fianza_estado,
          estado, dia_pago, notas,
          unidades(nombre)
        `)
        .eq('id', id)
        .single()

      if (err) { setError(err.message); setLoading(false); return }

      setRental({
        ...data,
        precio_mensual: data.precio_mensual ?? 0,
        fianza: data.fianza ?? 0,
        fianza_estado: data.fianza_estado ?? '',
        estado: data.estado ?? '',
        accommodationName: (data.unidades as any)?.nombre ?? 'Sin unidad',
      })
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MobileHeader title="Alquiler" showBack backHref="/m/alquileres" />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  if (error || !rental) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MobileHeader title="Alquiler" showBack backHref="/m/alquileres" />
        <main className="flex-1 flex items-center justify-center px-4">
          <p className="text-sm text-red-500 text-center">{error ?? 'Alquiler no encontrado'}</p>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  const contractStatus = mapContractStatus(rental.estado, rental.fecha_fin)
  const depositStatus = mapDepositStatus(rental.fianza_estado)
  const clientName = rental.cliente_nombre || 'Sin nombre'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader title={rental.accommodationName} showBack backHref="/m/alquileres" />

      <main className="flex-1 pb-20 overflow-y-auto">

        {/* Tenant + status */}
        <div className="px-4 py-4 border-b border-border flex items-start justify-between gap-3">
          <div>
            <p className="text-xl font-semibold">{clientName}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{rental.accommodationName}</p>
          </div>
          <StatusBadge status={contractStatus} />
        </div>

        {/* Contrato */}
        <div className="px-4 py-4 border-b border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contrato</h3>
          <div className="space-y-2">
            <Row
              icon={<Calendar className="h-3.5 w-3.5 text-green-600" />}
              label="Inicio"
              value={formatDate(rental.fecha_inicio)}
            />
            {rental.fecha_fin && (
              <Row
                icon={<Calendar className="h-3.5 w-3.5 text-amber-600" />}
                label="Fin"
                value={formatDate(rental.fecha_fin)}
              />
            )}
            <Row
              icon={<Home className="h-3.5 w-3.5 text-primary" />}
              label="Alojamiento"
              value={rental.accommodationName}
            />
            {rental.dia_pago && (
              <Row
                label="Día de pago"
                value={`Día ${rental.dia_pago}`}
              />
            )}
          </div>
        </div>

        {/* Economía */}
        <div className="px-4 py-4 border-b border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Economía</h3>
          <div className="space-y-2">
            <Row
              icon={<Banknote className="h-3.5 w-3.5 text-primary" />}
              label="Renta mensual"
              value={`${rental.precio_mensual}€/mes`}
              bold
            />
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                Fianza
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{rental.fianza}€</span>
                <StatusBadge status={depositStatus} />
              </div>
            </div>
          </div>
        </div>

        {/* Contacto */}
        {(rental.cliente_email || rental.cliente_telefono) && (
          <div className="px-4 py-4 border-b border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contacto</h3>
            <div className="space-y-2">
              {rental.cliente_telefono && (
                <a
                  href={`tel:${rental.cliente_telefono}`}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border active:bg-muted"
                >
                  <div className="p-2 rounded-lg bg-green-100 shrink-0">
                    <Phone className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                    <p className="font-medium">{rental.cliente_telefono}</p>
                  </div>
                </a>
              )}
              {rental.cliente_email && (
                <a
                  href={`mailto:${rental.cliente_email}`}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border active:bg-muted"
                >
                  <div className="p-2 rounded-lg bg-blue-100 shrink-0">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{rental.cliente_email}</p>
                  </div>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Notas */}
        {rental.notas && (
          <div className="px-4 py-4 border-b border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notas</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{rental.notas}</p>
          </div>
        )}

        {/* Acciones rápidas */}
        <div className="px-4 py-4 flex gap-3">
          <Link href={`/m/cobros?rental=${rental.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              <Banknote className="h-4 w-4 mr-2" />
              Ver cobros
            </Button>
          </Link>
          <Link href={`/m/contratos?rental=${rental.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Ver contrato
            </Button>
          </Link>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}

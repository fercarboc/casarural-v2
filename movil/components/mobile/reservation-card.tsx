import { cn } from '@/lib/utils'
import { StatusBadge } from './status-badge'
import { Phone, Mail, Eye, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Reservation } from '@/lib/mock-data'
import Link from 'next/link'

interface ReservationCardProps {
  reservation: Reservation
  onSendCheckIn?: () => void
  onCall?: () => void
  className?: string
}

export function ReservationCard({
  reservation,
  onSendCheckIn,
  onCall,
  className
}: ReservationCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    })
  }

  const sourceLabel = {
    booking: 'Booking',
    airbnb: 'Airbnb',
    direct: 'Directo',
    other: 'Otro'
  }

  return (
    <div className={cn('bg-card rounded-xl border border-border overflow-hidden', className)}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground font-mono">{reservation.code}</p>
            <p className="font-semibold text-foreground">{reservation.guestName}</p>
          </div>
          <StatusBadge status={reservation.status} />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Alojamiento</span>
            <span className="font-medium">{reservation.accommodationName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Fechas</span>
            <span className="font-medium">
              {formatDate(reservation.checkIn)} - {formatDate(reservation.checkOut)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Noches / Huéspedes</span>
            <span className="font-medium">{reservation.nights}N / {reservation.guests}P</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Fuente</span>
            <span className="font-medium">{sourceLabel[reservation.source]}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Importe</span>
            <span className="font-semibold text-primary">{reservation.amount}€</span>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-4 py-3 flex items-center gap-2">
        <Link href={`/m/reservas/${reservation.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            <Eye className="h-4 w-4 mr-1" />
            Ver
          </Button>
        </Link>
        {reservation.status === 'confirmed' && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onSendCheckIn}
          >
            <Send className="h-4 w-4 mr-1" />
            Check-in
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCall}>
          <Phone className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Mail className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

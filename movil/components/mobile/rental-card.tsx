import { cn } from '@/lib/utils'
import { StatusBadge } from './status-badge'
import { FileText, User, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Rental } from '@/lib/mock-data'
import Link from 'next/link'

interface RentalCardProps {
  rental: Rental
  className?: string
}

export function RentalCard({ rental, className }: RentalCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    })
  }

  return (
    <div className={cn('bg-card rounded-xl border border-border overflow-hidden', className)}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold text-foreground">{rental.accommodationName}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {rental.clientName}
            </p>
          </div>
          <StatusBadge status={rental.contractStatus} />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Periodo</span>
            <span className="font-medium">
              {formatDate(rental.startDate)} - {formatDate(rental.endDate)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Renta mensual</span>
            <span className="font-semibold text-primary">{rental.monthlyRent}€/mes</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Fianza</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{rental.deposit}€</span>
              <StatusBadge status={rental.depositStatus} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Día de pago</span>
            <span className="font-medium">Día {rental.paymentDay}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-4 py-3 flex items-center gap-2">
        <Link href={`/m/alquileres/${rental.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            Ver detalles
          </Button>
        </Link>
        <Link href={`/m/contratos?rental=${rental.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <FileText className="h-4 w-4" />
          </Button>
        </Link>
        <Link href={`/m/cobros?rental=${rental.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Calendar className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

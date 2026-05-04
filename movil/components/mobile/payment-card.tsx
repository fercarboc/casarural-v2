import { cn } from '@/lib/utils'
import { StatusBadge } from './status-badge'
import { CreditCard, Calendar, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Payment } from '@/lib/mock-data'

interface PaymentCardProps {
  payment: Payment
  onMarkPaid?: () => void
  disabled?: boolean
  className?: string
}

export function PaymentCard({
  payment,
  onMarkPaid,
  disabled,
  className
}: PaymentCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    })
  }

  return (
    <div className={cn('bg-card rounded-xl border border-border overflow-hidden', className)}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold text-foreground">{payment.month}</p>
            <p className="text-sm text-muted-foreground">{payment.concept}</p>
          </div>
          <StatusBadge status={payment.status} />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              Inquilino
            </span>
            <span className="font-medium">{payment.clientName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Alojamiento</span>
            <span className="font-medium">{payment.accommodationName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Vencimiento
            </span>
            <span className="font-medium">{formatDate(payment.dueDate)}</span>
          </div>
          {payment.paidDate && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pagado</span>
              <span className="font-medium text-green-600">{formatDate(payment.paidDate)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-muted-foreground flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5" />
              Importe
            </span>
            <span className="text-lg font-semibold text-primary">{payment.amount}€</span>
          </div>
        </div>
      </div>

      {payment.status !== 'paid' && (
        <div className="border-t border-border px-4 py-3">
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={onMarkPaid}
            disabled={disabled}
          >
            {disabled ? 'Guardando...' : 'Marcar como pagado'}
          </Button>
        </div>
      )}
    </div>
  )
}

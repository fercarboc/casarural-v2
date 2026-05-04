import { cn } from '@/lib/utils'
import { StatusBadge } from './status-badge'
import {
  Wrench,
  CreditCard,
  User,
  Zap,
  Sparkles,
  FileText,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Alert } from '@/lib/mock-data'

interface AlertCardProps {
  alert: Alert
  onClose?: () => void
  onMarkInProgress?: () => void
  className?: string
}

export function AlertCard({
  alert,
  onClose,
  onMarkInProgress,
  className
}: AlertCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    })
  }

  const typeConfig = {
    maintenance: { label: 'Mantenimiento', icon: Wrench, color: 'text-blue-600' },
    payment: { label: 'Pago', icon: CreditCard, color: 'text-red-600' },
    tenant: { label: 'Inquilino', icon: User, color: 'text-purple-600' },
    utility: { label: 'Suministro', icon: Zap, color: 'text-amber-600' },
    cleaning: { label: 'Limpieza', icon: Sparkles, color: 'text-green-600' },
    contract: { label: 'Contrato', icon: FileText, color: 'text-orange-600' }
  }

  const typeInfo = typeConfig[alert.type]
  const TypeIcon = typeInfo.icon

  return (
    <div className={cn('bg-card rounded-xl border border-border overflow-hidden', className)}>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className={cn('p-2 rounded-lg bg-muted shrink-0', typeInfo.color)}>
            <TypeIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-foreground">{alert.title}</p>
              <StatusBadge status={alert.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {typeInfo.label} {alert.accommodationName && `• ${alert.accommodationName}`}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-3">{alert.description}</p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <StatusBadge status={alert.priority} />
            <span>{formatDate(alert.createdAt)}</span>
          </div>
          {alert.resolvedAt && (
            <span className="text-green-600">
              Resuelto: {formatDate(alert.resolvedAt)}
            </span>
          )}
        </div>
      </div>

      {alert.status !== 'closed' && (
        <div className="border-t border-border px-4 py-3 flex gap-2">
          {alert.status === 'open' && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onMarkInProgress}
            >
              En proceso
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={onClose}
          >
            Cerrar
          </Button>
        </div>
      )}
    </div>
  )
}

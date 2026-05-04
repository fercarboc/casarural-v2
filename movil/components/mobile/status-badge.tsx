import { cn } from '@/lib/utils'

type StatusType =
  | 'confirmed'
  | 'pending'
  | 'cancelled'
  | 'active'
  | 'expired'
  | 'expiring'
  | 'paid'
  | 'unpaid'
  | 'overdue'
  | 'returned'
  | 'in-progress'
  | 'open'
  | 'closed'
  | 'signed'
  | 'renewed'
  | 'completed'
  | 'high'
  | 'medium'
  | 'low'

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  confirmed: {
    label: 'Confirmada',
    className: 'bg-green-100 text-green-800 border-green-200'
  },
  pending: {
    label: 'Pendiente',
    className: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  cancelled: {
    label: 'Cancelada',
    className: 'bg-red-100 text-red-800 border-red-200'
  },
  active: {
    label: 'Activo',
    className: 'bg-green-100 text-green-800 border-green-200'
  },
  expired: {
    label: 'Vencido',
    className: 'bg-gray-100 text-gray-800 border-gray-200'
  },
  expiring: {
    label: 'Por vencer',
    className: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  paid: {
    label: 'Pagado',
    className: 'bg-green-100 text-green-800 border-green-200'
  },
  unpaid: {
    label: 'Impagado',
    className: 'bg-red-100 text-red-800 border-red-200'
  },
  returned: {
    label: 'Devuelta',
    className: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  overdue: {
    label: 'Vencido',
    className: 'bg-red-100 text-red-800 border-red-200'
  },
  'in-progress': {
    label: 'En proceso',
    className: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  open: {
    label: 'Abierto',
    className: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  closed: {
    label: 'Cerrado',
    className: 'bg-gray-100 text-gray-800 border-gray-200'
  },
  signed: {
    label: 'Firmado',
    className: 'bg-green-100 text-green-800 border-green-200'
  },
  renewed: {
    label: 'Renovado',
    className: 'bg-green-100 text-green-800 border-green-200'
  },
  completed: {
    label: 'Completada',
    className: 'bg-green-100 text-green-800 border-green-200'
  },
  high: {
    label: 'Alta',
    className: 'bg-red-100 text-red-800 border-red-200'
  },
  medium: {
    label: 'Media',
    className: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  low: {
    label: 'Baja',
    className: 'bg-blue-100 text-blue-800 border-blue-200'
  }
}

interface StatusBadgeProps {
  status: StatusType
  customLabel?: string
  className?: string
}

export function StatusBadge({ status, customLabel, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {customLabel || config.label}
    </span>
  )
}

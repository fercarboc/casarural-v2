import { cn } from '@/lib/utils'
import { StatusBadge } from './status-badge'
import { Check, Clock, Home, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CleaningTask } from '@/lib/mock-data'

interface CleaningTaskCardProps {
  task: CleaningTask
  onMarkComplete?: () => void
  disabled?: boolean
  className?: string
}

export function CleaningTaskCard({
  task,
  onMarkComplete,
  disabled,
  className
}: CleaningTaskCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  const typeConfig = {
    checkout: { label: 'Salida', icon: '🚪' },
    checkin: { label: 'Entrada', icon: '🛎️' },
    periodic: { label: 'Periódica', icon: '📅' },
    manual: { label: 'Manual', icon: '✋' }
  }

  const typeInfo = typeConfig[task.type]

  return (
    <div className={cn('bg-card rounded-xl border border-border overflow-hidden', className)}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-muted">
              <Home className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{task.accommodationName}</p>
              <p className="text-xs text-muted-foreground">{formatDate(task.date)}</p>
            </div>
          </div>
          <StatusBadge status={task.status} />
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs">
            <span>{typeInfo.icon}</span>
            {typeInfo.label}
          </span>
          <StatusBadge status={task.priority} />
          {task.reservationCode && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs font-mono">
              {task.reservationCode}
            </span>
          )}
        </div>

        {task.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2">{task.notes}</p>
        )}

        {task.assignee && (
          <p className="text-sm text-muted-foreground mt-2">
            Asignado: <span className="font-medium">{task.assignee}</span>
          </p>
        )}
      </div>

      {task.status === 'pending' && (
        <div className="border-t border-border px-4 py-3">
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={onMarkComplete}
            disabled={disabled}
          >
            <Check className="h-4 w-4 mr-2" />
            {disabled ? 'Guardando...' : 'Marcar como completada'}
          </Button>
        </div>
      )}
    </div>
  )
}

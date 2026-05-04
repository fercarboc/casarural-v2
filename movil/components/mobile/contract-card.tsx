import { cn } from '@/lib/utils'
import { StatusBadge } from './status-badge'
import { FileText, Download, Calendar, User, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Contract } from '@/lib/mock-data'

interface ContractCardProps {
  contract: Contract
  onDownload?: () => void
  onRenew?: () => void
  className?: string
}

export function ContractCard({
  contract,
  onDownload,
  onRenew,
  className
}: ContractCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    })
  }

  const isExpiringSoon = contract.renewalDate && new Date(contract.renewalDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  return (
    <div className={cn('bg-card rounded-xl border border-border overflow-hidden', className)}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-muted">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{contract.accommodationName}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                {contract.clientName}
              </p>
            </div>
          </div>
          <StatusBadge status={contract.status} />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Inicio</span>
            <span className="font-medium">{formatDate(contract.startDate)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Fin</span>
            <span className={cn('font-medium', isExpiringSoon && 'text-amber-600')}>
              {formatDate(contract.endDate)}
            </span>
          </div>
          {contract.renewalDate && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Renovación</span>
              <span className={cn('font-medium', isExpiringSoon && 'text-amber-600')}>
                {formatDate(contract.renewalDate)}
              </span>
            </div>
          )}
        </div>

        {isExpiringSoon && (
          <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              Contrato próximo a vencer. Contactar para renovación.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-border px-4 py-3 flex items-center gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onDownload}>
          <Download className="h-4 w-4 mr-1" />
          Descargar
        </Button>
        {(contract.status === 'signed' || contract.status === 'expired') && (
          <Button variant="default" size="sm" className="flex-1" onClick={onRenew}>
            Renovar
          </Button>
        )}
      </div>
    </div>
  )
}

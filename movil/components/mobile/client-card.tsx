import { cn } from '@/lib/utils'
import { Phone, Mail, MessageCircle, User, Home, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Client } from '@/lib/mock-data'

interface ClientCardProps {
  client: Client
  onCall?: () => void
  onEmail?: () => void
  onWhatsApp?: () => void
  className?: string
}

export function ClientCard({
  client,
  onCall,
  onEmail,
  onWhatsApp,
  className
}: ClientCardProps) {
  return (
    <div className={cn('bg-card rounded-xl border border-border overflow-hidden', className)}>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2.5 rounded-full bg-muted">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">{client.name}</p>
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1',
                client.type === 'guest'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              )}
            >
              {client.type === 'guest' ? 'Huésped' : 'Inquilino'}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            <span className="truncate">{client.email}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            <span>{client.phone}</span>
          </div>
          {client.type === 'guest' && client.totalReservations && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{client.totalReservations} reserva{client.totalReservations > 1 ? 's' : ''}</span>
            </div>
          )}
          {client.type === 'tenant' && client.activeRental && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Home className="h-3.5 w-3.5" />
              <span>{client.activeRental}</span>
            </div>
          )}
          {client.notes && (
            <p className="text-muted-foreground italic text-xs mt-2 pt-2 border-t border-border">
              {client.notes}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-border px-4 py-3 flex items-center gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onCall}>
          <Phone className="h-4 w-4 mr-1" />
          Llamar
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={onEmail}>
          <Mail className="h-4 w-4 mr-1" />
          Email
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={onWhatsApp}>
          <MessageCircle className="h-4 w-4 mr-1" />
          WhatsApp
        </Button>
      </div>
    </div>
  )
}

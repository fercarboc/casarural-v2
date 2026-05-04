'use client'

import { useState } from 'react'
import { MobileHeader } from '@/components/mobile/mobile-header'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'
import { FilterChips } from '@/components/mobile/filter-chips'
import { PaymentCard } from '@/components/mobile/payment-card'
import { EmptyState } from '@/components/mobile/empty-state'
import { useTenant } from '@/lib/property-context'
import { useRentalPayments, markPaymentAsPaid } from '@/lib/supabase-hooks'
import { CreditCard } from 'lucide-react'

const filterOptions = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'overdue', label: 'Vencidos' },
  { id: 'paid', label: 'Pagados' }
]

export default function MobilePaymentsPage() {
  const { selectedTenant } = useTenant()
  const [filter, setFilter] = useState('all')
  const [markingId, setMarkingId] = useState<string | null>(null)

  const { data: payments, loading, error, refetch } = useRentalPayments(selectedTenant.id)

  const filteredPayments = payments.filter(p => filter === 'all' || p.status === filter)

  const sortedPayments = [...filteredPayments].sort((a, b) => {
    const statusOrder = { overdue: 0, pending: 1, paid: 2 }
    if (a.status !== b.status) return statusOrder[a.status] - statusOrder[b.status]
    return a.dueDate.localeCompare(b.dueDate)
  })

  const pendingAmount = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)
  const overdueAmount = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0)
  const paidAmount = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)

  const handleMarkPaid = async (paymentId: string) => {
    setMarkingId(paymentId)
    const { error } = await markPaymentAsPaid(paymentId)
    setMarkingId(null)
    if (!error) refetch()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader title="Cobros" showBack backHref="/m" />

      <main className="flex-1 pb-20 overflow-y-auto">
        {error && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-200">
            <p className="text-xs text-red-600">Error cargando cobros: {error}</p>
          </div>
        )}
        <div className="px-4 py-3 bg-muted/50 border-b border-border">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Pendiente</p>
              <p className="text-lg font-semibold text-amber-600">{pendingAmount}€</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vencido</p>
              <p className="text-lg font-semibold text-red-600">{overdueAmount}€</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cobrado</p>
              <p className="text-lg font-semibold text-green-600">{paidAmount}€</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-border">
          <FilterChips chips={filterOptions} selected={filter} onSelect={setFilter} />
        </div>

        <div className="px-4 py-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {sortedPayments.length} recibo{sortedPayments.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="px-4 py-2 space-y-3">
          {sortedPayments.length > 0 ? (
            sortedPayments.map(payment => (
              <PaymentCard
                key={payment.id}
                payment={payment}
                onMarkPaid={markingId === null ? () => handleMarkPaid(payment.id) : undefined}
                disabled={markingId === payment.id}
              />
            ))
          ) : !loading ? (
            <EmptyState
              icon={CreditCard}
              title="No hay recibos"
              description={
                filter !== 'all'
                  ? 'No se encontraron recibos con este filtro'
                  : 'Todavía no hay recibos registrados'
              }
            />
          ) : null}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}

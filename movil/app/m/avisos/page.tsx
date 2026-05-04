'use client'

import { useState } from 'react'
import { MobileHeader } from '@/components/mobile/mobile-header'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'
import { FilterChips } from '@/components/mobile/filter-chips'
import { AlertCard } from '@/components/mobile/alert-card'
import { EmptyState } from '@/components/mobile/empty-state'
import { useTenant } from '@/lib/property-context'
import { useIncidents } from '@/lib/supabase-hooks'
import { Bell, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

const statusFilters = [
  { id: 'all', label: 'Todos' },
  { id: 'open', label: 'Abiertos' },
  { id: 'in-progress', label: 'En proceso' },
  { id: 'closed', label: 'Cerrados' }
]

const typeFilters = [
  { id: 'all', label: 'Todos' },
  { id: 'maintenance', label: 'Mantenimiento' },
  { id: 'payment', label: 'Pago' },
  { id: 'contract', label: 'Contrato' },
  { id: 'tenant', label: 'Inquilino' },
  { id: 'utility', label: 'Suministro' }
]

export default function MobileAlertsPage() {
  const { selectedTenant } = useTenant()
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const { data: alerts, loading } = useIncidents(selectedTenant.id)

  const filteredAlerts = alerts.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    if (typeFilter !== 'all' && a.type !== typeFilter) return false
    return true
  })

  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    const statusOrder = { open: 0, 'in-progress': 1, closed: 2 }
    if (a.status !== b.status) return statusOrder[a.status] - statusOrder[b.status]
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    if (a.priority !== b.priority) return priorityOrder[a.priority] - priorityOrder[b.priority]
    return b.createdAt.localeCompare(a.createdAt)
  })

  const openCount = alerts.filter(a => a.status === 'open').length
  const inProgressCount = alerts.filter(a => a.status === 'in-progress').length
  const highPriorityCount = alerts.filter(a => a.priority === 'high' && a.status !== 'closed').length

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader title="Avisos" showBack backHref="/m" />

      <main className="flex-1 pb-20 overflow-y-auto">
        <div className="px-4 py-3 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>{openCount} abiertos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>{inProgressCount} en proceso</span>
            </div>
            {highPriorityCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>{highPriorityCount} alta prioridad</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 space-y-2 border-b border-border">
          <FilterChips chips={statusFilters} selected={statusFilter} onSelect={setStatusFilter} />
          <FilterChips chips={typeFilters} selected={typeFilter} onSelect={setTypeFilter} />
        </div>

        <div className="px-4 py-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {sortedAlerts.length} aviso{sortedAlerts.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="px-4 py-2 space-y-3">
          {sortedAlerts.length > 0 ? (
            sortedAlerts.map(a => (
              <AlertCard
                key={a.id}
                alert={a}
                onClose={() => {}}
                onMarkInProgress={() => {}}
              />
            ))
          ) : !loading ? (
            <EmptyState
              icon={Bell}
              title="No hay avisos"
              description={
                statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'No se encontraron avisos con estos filtros'
                  : 'No hay avisos ni incidencias pendientes'
              }
              action={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo aviso
                </Button>
              }
            />
          ) : null}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}

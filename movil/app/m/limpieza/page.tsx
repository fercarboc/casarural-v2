'use client'

import { useState } from 'react'
import { MobileHeader } from '@/components/mobile/mobile-header'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'
import { FilterChips } from '@/components/mobile/filter-chips'
import { CleaningTaskCard } from '@/components/mobile/cleaning-task-card'
import { EmptyState } from '@/components/mobile/empty-state'
import { useTenant } from '@/lib/property-context'
import { useCleaningTasks, markCleaningJobDone } from '@/lib/supabase-hooks'
import { useRefetchOnFocus } from '@/lib/use-refetch-on-focus'
import { Sparkles } from 'lucide-react'

const filterOptions = [
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'completed', label: 'Completadas' }
]

const typeFilters = [
  { id: 'all', label: 'Todos' },
  { id: 'checkout', label: 'Salida' },
  { id: 'checkin', label: 'Entrada' },
  { id: 'periodic', label: 'Periódica' },
  { id: 'manual', label: 'Manual' }
]

export default function MobileCleaningPage() {
  const { selectedTenant } = useTenant()
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [markingId, setMarkingId] = useState<string | null>(null)

  const { data: tasks, refetch, error } = useCleaningTasks(selectedTenant.id)

  useRefetchOnFocus(refetch)

  const filteredTasks = tasks.filter(task => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false
    if (typeFilter !== 'all' && task.type !== typeFilter) return false
    return true
  })

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  const pendingCount = tasks.filter(t => t.status === 'pending').length
  const completedCount = tasks.filter(t => t.status === 'completed').length

  const handleMarkComplete = async (taskId: string) => {
    setMarkingId(taskId)
    const { error } = await markCleaningJobDone(taskId)
    setMarkingId(null)
    if (!error) refetch()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader title="Limpieza" showBack backHref="/m" />

      <main className="flex-1 pb-20 overflow-y-auto">
        {error && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-200">
            <p className="text-xs text-red-600">Error cargando tareas: {error}</p>
          </div>
        )}
        <div className="px-4 py-3 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>{pendingCount} pendientes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>{completedCount} completadas</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 space-y-2 border-b border-border">
          <FilterChips chips={filterOptions} selected={statusFilter} onSelect={setStatusFilter} />
          <FilterChips chips={typeFilters} selected={typeFilter} onSelect={setTypeFilter} />
        </div>

        <div className="px-4 py-3 space-y-3">
          {sortedTasks.length > 0 ? (
            sortedTasks.map(task => (
              <CleaningTaskCard
                key={task.id}
                task={task}
                onMarkComplete={markingId === null ? () => handleMarkComplete(task.id) : undefined}
                disabled={markingId === task.id}
              />
            ))
          ) : (
            <EmptyState
              icon={Sparkles}
              title="No hay tareas"
              description={
                statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'No se encontraron tareas con estos filtros'
                  : 'No hay tareas de limpieza programadas'
              }
            />
          )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { MobileHeader } from '@/components/mobile/mobile-header'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'
import { SearchBar } from '@/components/mobile/search-bar'
import { FilterChips } from '@/components/mobile/filter-chips'
import { RentalCard } from '@/components/mobile/rental-card'
import { EmptyState } from '@/components/mobile/empty-state'
import { useTenant } from '@/lib/property-context'
import { useRentals } from '@/lib/supabase-hooks'
import { Building, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

const filterOptions = [
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Activos' },
  { id: 'expiring', label: 'Por vencer' },
  { id: 'expired', label: 'Vencidos' }
]

export default function MobileRentalsPage() {
  const { selectedTenant } = useTenant()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const { data: rentals, loading } = useRentals(selectedTenant.id)

  const filteredRentals = rentals.filter(rental => {
    if (filter !== 'all' && rental.contractStatus !== filter) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        rental.accommodationName.toLowerCase().includes(s) ||
        rental.clientName.toLowerCase().includes(s)
      )
    }
    return true
  })

  const activeCount = rentals.filter(r => r.contractStatus === 'active').length
  const expiringCount = rentals.filter(r => r.contractStatus === 'expiring').length
  const totalMonthlyRent = rentals
    .filter(r => r.contractStatus === 'active' || r.contractStatus === 'expiring')
    .reduce((sum, r) => sum + r.monthlyRent, 0)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader title="Alquileres" showBack backHref="/m" />

      <main className="flex-1 pb-20 overflow-y-auto">
        <div className="px-4 py-3 bg-muted/50 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>{activeCount} activos</span>
              </div>
              {expiringCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>{expiringCount} por vencer</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Renta mensual</p>
              <p className="text-lg font-semibold text-primary">{totalMonthlyRent}€</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 space-y-3 border-b border-border">
          <SearchBar
            placeholder="Buscar alquiler, inquilino..."
            value={search}
            onChange={setSearch}
          />
          <FilterChips chips={filterOptions} selected={filter} onSelect={setFilter} />
        </div>

        <div className="px-4 py-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {filteredRentals.length} alquiler{filteredRentals.length !== 1 ? 'es' : ''}
            </p>
          )}
        </div>

        <div className="px-4 py-2 space-y-3">
          {filteredRentals.length > 0 ? (
            filteredRentals.map(rental => (
              <RentalCard key={rental.id} rental={rental} />
            ))
          ) : !loading ? (
            <EmptyState
              icon={Building}
              title="No hay alquileres"
              description={
                search || filter !== 'all'
                  ? 'No se encontraron alquileres con estos filtros'
                  : 'Todavía no hay alquileres registrados'
              }
              action={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo alquiler
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

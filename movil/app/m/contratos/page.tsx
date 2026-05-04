'use client'

import { useState } from 'react'
import { MobileHeader } from '@/components/mobile/mobile-header'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'
import { SearchBar } from '@/components/mobile/search-bar'
import { FilterChips } from '@/components/mobile/filter-chips'
import { ContractCard } from '@/components/mobile/contract-card'
import { EmptyState } from '@/components/mobile/empty-state'
import { useTenant } from '@/lib/property-context'
import { useContracts } from '@/lib/supabase-hooks'
import { FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

const filterOptions = [
  { id: 'all', label: 'Todos' },
  { id: 'signed', label: 'Firmados' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'expired', label: 'Vencidos' }
]

export default function MobileContractsPage() {
  const { selectedTenant } = useTenant()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const { data: contracts, loading } = useContracts(selectedTenant.id)

  const filteredContracts = contracts.filter(contract => {
    if (filter !== 'all' && contract.status !== filter) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        contract.accommodationName.toLowerCase().includes(s) ||
        contract.clientName.toLowerCase().includes(s)
      )
    }
    return true
  })

  const signedCount = contracts.filter(c => c.status === 'signed').length
  const pendingCount = contracts.filter(c => c.status === 'pending').length
  const expiredCount = contracts.filter(c => c.status === 'expired').length

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader title="Contratos" showBack backHref="/m" />

      <main className="flex-1 pb-20 overflow-y-auto">
        <div className="px-4 py-3 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>{signedCount} firmados</span>
            </div>
            {pendingCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{pendingCount} pendientes</span>
              </div>
            )}
            {expiredCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>{expiredCount} vencidos</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 space-y-3 border-b border-border">
          <SearchBar
            placeholder="Buscar contrato, inquilino..."
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
              {filteredContracts.length} contrato{filteredContracts.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="px-4 py-2 space-y-3">
          {filteredContracts.length > 0 ? (
            filteredContracts.map(contract => (
              <ContractCard
                key={contract.id}
                contract={contract}
                onDownload={() => {}}
                onRenew={() => {}}
              />
            ))
          ) : !loading ? (
            <EmptyState
              icon={FileText}
              title="No hay contratos"
              description={
                search || filter !== 'all'
                  ? 'No se encontraron contratos con estos filtros'
                  : 'Todavía no hay contratos registrados'
              }
              action={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo contrato
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

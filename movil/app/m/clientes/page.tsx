'use client'

import { useState } from 'react'
import { MobileHeader } from '@/components/mobile/mobile-header'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'
import { SearchBar } from '@/components/mobile/search-bar'
import { FilterChips } from '@/components/mobile/filter-chips'
import { ClientCard } from '@/components/mobile/client-card'
import { EmptyState } from '@/components/mobile/empty-state'
import { useTenant } from '@/lib/property-context'
import { useClients } from '@/lib/supabase-hooks'
import { Users, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

const filterOptions = [
  { id: 'all', label: 'Todos' },
  { id: 'guest', label: 'Huéspedes' },
  { id: 'tenant', label: 'Inquilinos' }
]

export default function MobileClientsPage() {
  const { selectedTenant } = useTenant()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const { data: clients, loading } = useClients(selectedTenant.id)

  const filteredClients = clients.filter(client => {
    if (filter !== 'all' && client.type !== filter) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        client.name.toLowerCase().includes(s) ||
        client.email.toLowerCase().includes(s) ||
        client.phone.includes(search)
      )
    }
    return true
  })

  const guestCount = clients.filter(c => c.type === 'guest').length
  const tenantCount = clients.filter(c => c.type === 'tenant').length

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader title="Clientes" showBack backHref="/m" />

      <main className="flex-1 pb-20 overflow-y-auto">
        <div className="px-4 py-3 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>{guestCount} huéspedes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>{tenantCount} inquilinos</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 space-y-3 border-b border-border">
          <SearchBar placeholder="Buscar cliente..." value={search} onChange={setSearch} />
          <FilterChips chips={filterOptions} selected={filter} onSelect={setFilter} />
        </div>

        <div className="px-4 py-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="px-4 py-2 space-y-3">
          {filteredClients.length > 0 ? (
            filteredClients.map(client => (
              <ClientCard
                key={client.id}
                client={client}
                onCall={() => { window.location.href = `tel:${client.phone.replace(/\s/g, '')}` }}
                onEmail={() => { window.location.href = `mailto:${client.email}` }}
                onWhatsApp={() => {
                  const phone = client.phone.replace(/\s/g, '').replace('+', '')
                  window.open(`https://wa.me/${phone}`, '_blank')
                }}
              />
            ))
          ) : !loading ? (
            <EmptyState
              icon={Users}
              title="No hay clientes"
              description={
                search || filter !== 'all'
                  ? 'No se encontraron clientes con estos filtros'
                  : 'Todavía no hay clientes registrados'
              }
              action={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo cliente
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

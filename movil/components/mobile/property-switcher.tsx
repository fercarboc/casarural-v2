'use client'

import { useTenant } from '@/lib/property-context'
import { ChevronDown, Briefcase } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export function PropertySwitcher() {
  const { selectedTenant, setSelectedTenant, allTenants } = useTenant()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 h-auto py-1.5 px-2 text-left max-w-[220px]"
        >
          <Briefcase className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-sm font-medium">{selectedTenant.name}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[260px]">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Cuenta activa
        </div>
        {allTenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onClick={() => setSelectedTenant(tenant)}
            className={tenant.id === selectedTenant.id ? 'bg-accent' : ''}
          >
            <Briefcase className="h-4 w-4 mr-2 text-primary" />
            <div className="flex flex-col">
              <span className="font-medium">{tenant.name}</span>
              <span className="text-xs text-muted-foreground">{tenant.totalAccommodations} alojamientos</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

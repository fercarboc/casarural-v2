'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useAuth } from './auth-context'

export interface Tenant {
  id: string
  name: string
  totalAccommodations: number
}

interface TenantContextType {
  selectedTenant: Tenant
  setSelectedTenant: (tenant: Tenant) => void
  allTenants: Tenant[]
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function PropertyProvider({ children }: { children: ReactNode }) {
  const { propertyId, propertyName } = useAuth()

  const realTenant: Tenant = {
    id: propertyId ?? '',
    name: propertyName ?? 'Mi propiedad',
    totalAccommodations: 0,
  }

  const [selectedTenant, setSelectedTenant] = useState<Tenant>(realTenant)

  // Sync when auth resolves
  useEffect(() => {
    if (propertyId) {
      setSelectedTenant({
        id: propertyId,
        name: propertyName ?? 'Mi propiedad',
        totalAccommodations: 0,
      })
    }
  }, [propertyId, propertyName])

  return (
    <TenantContext.Provider value={{ selectedTenant, setSelectedTenant, allTenants: [selectedTenant] }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useProperty() {
  const context = useContext(TenantContext)
  if (!context) throw new Error('useProperty must be used within a PropertyProvider')
  return {
    selectedProperty: context.selectedTenant,
    setSelectedProperty: context.setSelectedTenant,
    allProperties: context.allTenants,
  }
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) throw new Error('useTenant must be used within a PropertyProvider')
  return context
}

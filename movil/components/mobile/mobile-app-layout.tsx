'use client'

import { PropertyProvider } from '@/lib/property-context'
import { MobileHeader } from './mobile-header'
import { MobileBottomNav } from './mobile-bottom-nav'

interface MobileAppLayoutProps {
  children: React.ReactNode
  title?: string
  showPropertySwitcher?: boolean
  showBack?: boolean
  backHref?: string
}

export function MobileAppLayout({
  children,
  title,
  showPropertySwitcher = true,
  showBack = false,
  backHref = '/m'
}: MobileAppLayoutProps) {
  return (
    <PropertyProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <MobileHeader
          title={title}
          showPropertySwitcher={showPropertySwitcher}
          showBack={showBack}
          backHref={backHref}
        />
        <main className="flex-1 pb-20 overflow-y-auto">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </PropertyProvider>
  )
}

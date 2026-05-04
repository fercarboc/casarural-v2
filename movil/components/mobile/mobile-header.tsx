'use client'

import { PropertySwitcher } from './property-switcher'
import { Bell, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface MobileHeaderProps {
  title?: string
  showPropertySwitcher?: boolean
  showBack?: boolean
  backHref?: string
}

export function MobileHeader({
  title,
  showPropertySwitcher = true,
  showBack = false,
  backHref = '/m'
}: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 safe-area-top">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showBack ? (
            <Link href={backHref}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </Button>
            </Link>
          ) : null}
          {title ? (
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          ) : showPropertySwitcher ? (
            <PropertySwitcher />
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Link href="/m/avisos">
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
            </Button>
          </Link>
          <Link href="/m/configuracion">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <User className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}

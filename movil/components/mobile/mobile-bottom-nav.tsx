'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  CalendarDays,
  BookOpen,
  Building,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const mainNavItems = [
  { href: '/m', icon: Home, label: 'Inicio' },
  { href: '/m/reservas', icon: BookOpen, label: 'Reservas' },
  { href: '/m/calendario', icon: CalendarDays, label: 'Calendario' },
  { href: '/m/alquileres', icon: Building, label: 'Alquileres' },
  { href: '/m/mas', icon: MoreHorizontal, label: 'Más' },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/m') {
      return pathname === '/m'
    }
    if (href === '/m/mas') {
      const morePages = ['/m/limpieza', '/m/clientes', '/m/contratos', '/m/cobros', '/m/avisos', '/m/configuracion', '/m/mas']
      return morePages.some(page => pathname.startsWith(page))
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {mainNavItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'stroke-[2.5px]')} />
              <span className={cn('text-xs', active && 'font-medium')}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

'use client'

import { useState } from 'react'
import { MobileHeader } from '@/components/mobile/mobile-header'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'
import { FilterChips } from '@/components/mobile/filter-chips'
import { StatusBadge } from '@/components/mobile/status-badge'
import { EmptyState } from '@/components/mobile/empty-state'
import { useTenant } from '@/lib/property-context'
import { useReservas } from '@/lib/supabase-hooks'
import type { Reservation } from '@/lib/mock-data'
import { LogIn, LogOut, Send, Phone, Mail, Calendar, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const filterOptions = [
  { id: 'today', label: 'Hoy' },
  { id: 'tomorrow', label: 'Mañana' },
  { id: 'week', label: 'Esta semana' }
]

export default function MobileAgendaPage() {
  const { selectedTenant } = useTenant()
  const [filter, setFilter] = useState('today')
  const { data: reservations } = useReservas(selectedTenant.id)

  const getFilterDates = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (filter === 'today') return [today.toISOString().split('T')[0]]
    if (filter === 'tomorrow') {
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      return [tomorrow.toISOString().split('T')[0]]
    }
    const dates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      dates.push(d.toISOString().split('T')[0])
    }
    return dates
  }

  const filterDates = getFilterDates()
  const checkIns = reservations.filter(r => filterDates.includes(r.checkIn) && r.status !== 'cancelled')
  const checkOuts = reservations.filter(r => filterDates.includes(r.checkOut) && r.status !== 'cancelled')

  const groupByDate = (items: Reservation[], dateField: 'checkIn' | 'checkOut') => {
    const grouped: Record<string, Reservation[]> = {}
    items.forEach(item => {
      const date = item[dateField]
      if (!grouped[date]) grouped[date] = []
      grouped[date].push(item)
    })
    return grouped
  }

  const formatDateHeader = (dateStr: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    if (dateStr === today.toISOString().split('T')[0]) return 'Hoy'
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Mañana'
    return new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })
  }

  const AgendaItem = ({ reservation, type }: { reservation: Reservation; type: 'checkin' | 'checkout' }) => (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('p-2.5 rounded-lg shrink-0', type === 'checkin' ? 'bg-green-100' : 'bg-amber-100')}>
            {type === 'checkin'
              ? <LogIn className="h-5 w-5 text-green-600" />
              : <LogOut className="h-5 w-5 text-amber-600" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">{reservation.guestName}</p>
                <p className="text-sm text-muted-foreground">{reservation.accommodationName}</p>
              </div>
              <StatusBadge status={reservation.status} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="bg-muted px-2 py-1 rounded">{reservation.code}</span>
              <span className="bg-muted px-2 py-1 rounded">{reservation.nights} noches</span>
              <span className="bg-muted px-2 py-1 rounded">{reservation.guests} huéspedes</span>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-border px-4 py-3 flex items-center gap-2">
        {type === 'checkin' && reservation.status === 'confirmed' && (
          <Button variant="default" size="sm" className="flex-1">
            <Send className="h-4 w-4 mr-1" />
            Enviar instrucciones
          </Button>
        )}
        <Link href={`/m/reservas/${reservation.id}`} className={type === 'checkout' ? 'flex-1' : ''}>
          <Button variant="outline" size="sm" className={type === 'checkout' ? 'w-full' : ''}>
            Ver reserva
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Phone className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Mail className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    items: Reservation[],
    type: 'checkin' | 'checkout',
    dateField: 'checkIn' | 'checkOut'
  ) => {
    if (items.length === 0) return null

    if (filter === 'week') {
      const grouped = groupByDate(items, dateField)
      return (
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            {icon}
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{items.length}</span>
          </div>
          {Object.entries(grouped).sort().map(([date, dateItems]) => (
            <div key={date} className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2 capitalize">{formatDateHeader(date)}</p>
              <div className="space-y-2">
                {dateItems.map(item => <AgendaItem key={item.id} reservation={item} type={type} />)}
              </div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{items.length}</span>
        </div>
        <div className="space-y-2">
          {items.map(item => <AgendaItem key={item.id} reservation={item} type={type} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader title="Agenda" showBack backHref="/m" />

      <main className="flex-1 pb-20 overflow-y-auto">
        <div className="px-4 py-3 border-b border-border">
          <FilterChips chips={filterOptions} selected={filter} onSelect={setFilter} />
        </div>

        {renderSection('Entradas', <LogIn className="h-4 w-4 text-green-600" />, checkIns, 'checkin', 'checkIn')}
        {renderSection('Salidas', <LogOut className="h-4 w-4 text-amber-600" />, checkOuts, 'checkout', 'checkOut')}

        {checkIns.length === 0 && checkOuts.length === 0 && (
          <EmptyState
            icon={Calendar}
            title="Sin movimientos"
            description={
              filter === 'today'
                ? 'No hay entradas ni salidas programadas para hoy'
                : filter === 'tomorrow'
                ? 'No hay entradas ni salidas programadas para mañana'
                : 'No hay entradas ni salidas programadas esta semana'
            }
          />
        )}
      </main>

      <MobileBottomNav />
    </div>
  )
}

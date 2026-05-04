'use client'

import { MobileHeader } from '@/components/mobile/mobile-header'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'
import { MetricCard } from '@/components/mobile/metric-card'
import { ActionCard } from '@/components/mobile/action-card'
import { useTenant } from '@/lib/property-context'
import { useReservas, useUnidades, useRentals, useRentalPayments, useIncidents } from '@/lib/supabase-hooks'
import {
  CalendarCheck,
  LogIn,
  LogOut,
  Home,
  Building,
  Banknote,
  Bell,
  Settings,
  BookOpen,
  Calendar,
  ClipboardList,
  Sparkles,
  FileText,
  Users
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function MobileDashboard() {
  const { selectedTenant } = useTenant()
  const router = useRouter()
  const propertyId = selectedTenant.id

  const { data: reservas } = useReservas(propertyId)
  const { data: unidades } = useUnidades(propertyId)
  const { data: rentals } = useRentals(propertyId)
  const { data: payments } = useRentalPayments(propertyId)
  const { data: alerts } = useIncidents(propertyId)

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 13 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches'
  const today = now.toISOString().split('T')[0]

  const todayCheckIns = reservas.filter(r => r.checkIn === today && r.status !== 'cancelled')
  const todayCheckOuts = reservas.filter(r => r.checkOut === today && r.status !== 'cancelled')
  const activeReservations = reservas.filter(r => r.status === 'confirmed' && r.checkIn <= today && r.checkOut > today)
  const pendingReservations = reservas.filter(r => r.status === 'pending')
  const activeRentals = rentals.filter(r => r.contractStatus === 'active' || r.contractStatus === 'expiring')
  const expiringContracts = rentals.filter(r => r.contractStatus === 'expiring')
  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'overdue')
  const openAlerts = alerts.filter(a => a.status === 'open' || a.status === 'in-progress')

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader />

      <main className="flex-1 pb-20 overflow-y-auto">
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-xl font-semibold text-foreground">{greeting}</h2>
          <p className="text-sm text-muted-foreground">
            Resumen de {selectedTenant.name}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="px-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Entradas hoy"
              value={todayCheckIns.length}
              icon={LogIn}
              iconColor="text-green-600"
              onClick={() => router.push('/m/agenda')}
            />
            <MetricCard
              label="Salidas hoy"
              value={todayCheckOuts.length}
              icon={LogOut}
              iconColor="text-amber-600"
              onClick={() => router.push('/m/agenda')}
            />
            <MetricCard
              label="Ocupadas hoy"
              value={`${activeReservations.length}/${unidades.length}`}
              icon={Home}
              iconColor="text-primary"
              onClick={() => {}}
            />
            <MetricCard
              label="Reservas activas"
              value={activeReservations.length}
              icon={CalendarCheck}
              iconColor="text-blue-600"
              onClick={() => router.push('/m/reservas')}
            />
          </div>
        </div>

        {/* Short Stay Section */}
        <div className="px-4 py-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Corta Estancia
          </h3>
          <div className="space-y-2">
            <ActionCard
              title="Reservas"
              description="Ver y gestionar reservas"
              icon={BookOpen}
              href="/m/reservas"
              badge={pendingReservations.length || undefined}
              badgeColor="bg-amber-100 text-amber-800"
            />
            <ActionCard
              title="Calendario"
              description="Ocupacion y disponibilidad"
              icon={Calendar}
              href="/m/calendario"
            />
            <ActionCard
              title="Agenda"
              description="Check-ins y check-outs"
              icon={ClipboardList}
              href="/m/agenda"
              badge={(todayCheckIns.length + todayCheckOuts.length) || undefined}
            />
            <ActionCard
              title="Limpieza"
              description="Tareas pendientes"
              icon={Sparkles}
              href="/m/limpieza"
            />
          </div>
        </div>

        {/* Medium/Long Stay Section */}
        <div className="px-4 py-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Media / Larga Estancia
          </h3>
          <div className="space-y-2">
            <ActionCard
              title="Alquileres"
              description="Alquileres activos"
              icon={Building}
              href="/m/alquileres"
              badge={activeRentals.length || undefined}
            />
            <ActionCard
              title="Contratos"
              description="Gestion de contratos"
              icon={FileText}
              href="/m/contratos"
              badge={expiringContracts.length || undefined}
              badgeColor="bg-amber-100 text-amber-800"
            />
            <ActionCard
              title="Cobros"
              description="Recibos y pagos"
              icon={Banknote}
              href="/m/cobros"
              badge={pendingPayments.length || undefined}
              badgeColor="bg-red-100 text-red-800"
            />
          </div>
        </div>

        {/* Accommodations Section */}
        {unidades.length > 0 && (
          <div className="px-4 py-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Alojamientos
            </h3>
            <div className="space-y-2">
              {unidades.map((u) => {
                const occupied = activeReservations.some(r => r.accommodationId === u.id)
                return (
                  <div
                    key={u.id}
                    className="bg-card rounded-xl border border-border p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-semibold text-foreground">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.capacity} personas</p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                        occupied
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-green-100 text-green-800 border-green-200'
                      }`}>
                        {occupied ? 'Ocupado' : 'Disponible'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* General Section */}
        <div className="px-4 py-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            General
          </h3>
          <div className="space-y-2">
            <ActionCard
              title="Clientes"
              description="Huespedes e inquilinos"
              icon={Users}
              href="/m/clientes"
            />
            <ActionCard
              title="Avisos"
              description="Incidencias y alertas"
              icon={Bell}
              href="/m/avisos"
              badge={openAlerts.length || undefined}
              badgeColor="bg-red-100 text-red-800"
            />
            <ActionCard
              title="Configuracion"
              description="Ajustes de la app"
              icon={Settings}
              href="/m/configuracion"
            />
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}

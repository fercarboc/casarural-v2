'use client'

import { MobileHeader } from '@/components/mobile/mobile-header'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'
import { ActionCard } from '@/components/mobile/action-card'
import { useTenant } from '@/lib/property-context'
import { useIncidents, useRentalPayments, useContracts, useCleaningTasks } from '@/lib/supabase-hooks'
import {
  Sparkles,
  Users,
  FileText,
  Banknote,
  Bell,
  Settings,
} from 'lucide-react'

export default function MobileMorePage() {
  const { selectedTenant } = useTenant()
  const propertyId = selectedTenant.id

  const { data: cleaningTasks } = useCleaningTasks(propertyId)
  const { data: alerts } = useIncidents(propertyId)
  const { data: payments } = useRentalPayments(propertyId)
  const { data: contracts } = useContracts(propertyId)

  const pendingCleanings = cleaningTasks.filter(t => t.status === 'pending').length
  const openAlerts = alerts.filter(a => a.status === 'open' || a.status === 'in-progress').length
  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'overdue').length
  const expiringContracts = contracts.filter(c => c.status === 'signed').length

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader title="Más opciones" />

      <main className="flex-1 pb-20 overflow-y-auto">
        <div className="px-4 py-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Operaciones
          </h3>
          <div className="space-y-2">
            <ActionCard
              title="Limpieza"
              description="Gestión de tareas de limpieza"
              icon={Sparkles}
              iconColor="text-green-600"
              href="/m/limpieza"
              badge={pendingCleanings || undefined}
              badgeColor="bg-blue-100 text-blue-800"
            />
            <ActionCard
              title="Clientes"
              description="Huéspedes e inquilinos"
              icon={Users}
              iconColor="text-purple-600"
              href="/m/clientes"
            />
          </div>
        </div>

        <div className="px-4 py-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Gestión
          </h3>
          <div className="space-y-2">
            <ActionCard
              title="Contratos"
              description="Gestión de contratos de alquiler"
              icon={FileText}
              iconColor="text-orange-600"
              href="/m/contratos"
              badge={expiringContracts || undefined}
              badgeColor="bg-amber-100 text-amber-800"
            />
            <ActionCard
              title="Cobros"
              description="Recibos y pagos"
              icon={Banknote}
              iconColor="text-emerald-600"
              href="/m/cobros"
              badge={pendingPayments || undefined}
              badgeColor="bg-red-100 text-red-800"
            />
            <ActionCard
              title="Avisos"
              description="Incidencias y alertas"
              icon={Bell}
              iconColor="text-red-600"
              href="/m/avisos"
              badge={openAlerts || undefined}
              badgeColor="bg-red-100 text-red-800"
            />
          </div>
        </div>

        <div className="px-4 py-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Sistema
          </h3>
          <div className="space-y-2">
            <ActionCard
              title="Configuración"
              description="Ajustes de la aplicación"
              icon={Settings}
              iconColor="text-gray-600"
              href="/m/configuracion"
            />
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}

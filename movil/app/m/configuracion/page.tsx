'use client'

import { useRouter } from 'next/navigation'
import { MobileHeader } from '@/components/mobile/mobile-header'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'
import { useAuth } from '@/lib/auth-context'
import { useTenant } from '@/lib/property-context'
import {
  Briefcase,
  User,
  Bell,
  Monitor,
  Download,
  ChevronRight,
  LogOut,
  HelpCircle,
  Home,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SettingsItemProps {
  icon: React.ReactNode
  label: string
  value?: string
  onClick?: () => void
  danger?: boolean
}

function SettingsItem({ icon, label, value, onClick, danger }: SettingsItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 bg-card border-b border-border last:border-b-0 active:bg-muted transition-colors',
        danger && 'text-destructive'
      )}
    >
      <span className={cn('text-muted-foreground', danger && 'text-destructive')}>
        {icon}
      </span>
      <span className="flex-1 text-left font-medium">{label}</span>
      {value && <span className="text-sm text-muted-foreground">{value}</span>}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  )
}

export default function MobileSettingsPage() {
  const router = useRouter()
  const { user, rol, signOut } = useAuth()
  const { selectedTenant } = useTenant()

  async function handleSignOut() {
    await signOut()
    router.replace('/m/login')
  }

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Usuario'
  const displayEmail = user?.email ?? ''

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader title="Configuración" showBack backHref="/m" />

      <main className="flex-1 pb-20 overflow-y-auto">
        {/* User Section */}
        <div className="px-4 py-4">
          <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary text-primary-foreground">
              <User className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-sm text-muted-foreground truncate">{displayEmail}</p>
              {rol && (
                <p className="text-xs text-muted-foreground capitalize mt-0.5">{rol}</p>
              )}
            </div>
          </div>
        </div>

        {/* Property Section */}
        <div className="px-4 pb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Propiedad activa
          </h3>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <Briefcase className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-foreground">{selectedTenant.name}</p>
                <p className="text-xs text-muted-foreground">ID: {selectedTenant.id.slice(0, 8)}...</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
          </div>
        </div>

        {/* App Section */}
        <div className="px-4 pb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Aplicación
          </h3>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <SettingsItem
              icon={<Download className="h-5 w-5" />}
              label="Instalar app (PWA)"
              onClick={() => {
                if ((window.navigator as any).standalone === false || window.matchMedia('(display-mode: browser)').matches) {
                  alert('Para instalar: pulsa el botón compartir del navegador y selecciona "Añadir a pantalla de inicio"')
                }
              }}
            />
            <SettingsItem
              icon={<Monitor className="h-5 w-5" />}
              label="Acceder al panel web"
              onClick={() => window.open('/', '_blank')}
            />
          </div>
        </div>

        {/* Support Section */}
        <div className="px-4 pb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Soporte
          </h3>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <SettingsItem
              icon={<Bell className="h-5 w-5" />}
              label="Avisos e incidencias"
              onClick={() => router.push('/m/avisos')}
            />
            <SettingsItem
              icon={<HelpCircle className="h-5 w-5" />}
              label="Ayuda y soporte"
              onClick={() => window.open('mailto:soporte@staynex.app')}
            />
            <SettingsItem
              icon={<Home className="h-5 w-5" />}
              label="Panel de administración"
              onClick={() => window.open('/', '_blank')}
            />
          </div>
        </div>

        {/* Logout */}
        <div className="px-4 pb-4">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <SettingsItem
              icon={<LogOut className="h-5 w-5" />}
              label="Cerrar sesión"
              onClick={handleSignOut}
              danger
            />
          </div>
        </div>

        <div className="px-4 py-4 text-center">
          <p className="text-xs text-muted-foreground">StayNex v1.0.0</p>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}

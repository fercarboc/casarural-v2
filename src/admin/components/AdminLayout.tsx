import React from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Users,
  Settings,
  LogOut,
  TrendingUp,
  FileText,
  RefreshCw,
  Menu,
  X,
  Home,
  Building2,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAdminTenant } from '../context/AdminTenantContext'
import { ChatWidget } from './ChatWidget'

const NAV_GROUPS_BASE = [
  {
    label: 'Operativo',
    items: [
      { to: '/admin/dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
      { to: '/admin/calendario', icon: <Calendar size={16} />, label: 'Calendario' },
      { to: '/admin/reservas', icon: <BookOpen size={16} />, label: 'Reservas' },
      { to: '/admin/clientes', icon: <Users size={16} />, label: 'Clientes' },
      { to: '/admin/ingresos', icon: <TrendingUp size={16} />, label: 'Ingresos' },
      { to: '/admin/facturas', icon: <FileText size={16} />, label: 'Facturas' },
      { to: '/admin/limpieza', icon: <Sparkles size={16} />, label: 'Limpieza' },
      { to: '/admin/rentals', icon: <FileText size={16} />, label: 'Contratos' },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { to: '/admin/unidades', icon: <Home size={16} />, label: 'Unidades' },
      { to: '/admin/ical', icon: <RefreshCw size={16} />, label: 'iCal Sync' },
      { to: '/admin/configuracion', icon: <Settings size={16} />, label: 'Configuración' },
    ],
  },
]

const NAV_GROUP_SUPER = {
  label: 'Super Admin',
  items: [
    { to: '/admin/propiedades', icon: <Building2 size={16} />, label: 'Propiedades' },
  ],
}

export const AdminLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
  const { signOut, user } = useAuth()
  const { nombre, rol } = useAdminTenant()

  const navGroups = rol === 'SUPER_ADMIN'
    ? [...NAV_GROUPS_BASE, NAV_GROUP_SUPER]
    : NAV_GROUPS_BASE
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login')
  }

  const initial = user?.email?.[0].toUpperCase() ?? '?'

  return (
    <div className="flex min-h-screen bg-admin-bg text-slate-100">
      {/* Mobile toggle */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed left-4 top-4 z-50 rounded-xl border border-sidebar-border bg-sidebar-bg p-2 shadow-lg md:hidden"
      >
        {isSidebarOpen ? (
          <X size={18} className="text-slate-300" />
        ) : (
          <Menu size={18} className="text-slate-300" />
        )}
      </button>

      {/* Overlay mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[1px] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar-bg
          transform transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 shadow-sm">
            <Home size={16} className="text-white" />
          </div>
          <div>
            <p className="text-base font-bold leading-tight text-white">{nombre}</p>
            <p className="text-[11px] leading-tight text-slate-500">Panel de administración</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <AdminNavLink
                    key={item.to}
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                    onClick={() => setIsSidebarOpen(false)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="space-y-1 border-t border-sidebar-border px-3 py-4">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-xs font-semibold leading-tight text-slate-200">
                {user?.email}
              </p>
              <p className="text-[10px] text-slate-500">Administrador</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 overflow-auto bg-admin-bg">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8 xl:px-10">
          <Outlet />
        </div>
      </main>

      {/* Asistente de soporte */}
      <ChatWidget />
    </div>
  )
}

const AdminNavLink = ({
  to,
  icon,
  label,
  onClick,
}: {
  to: string
  icon: React.ReactNode
  label: string
  onClick?: () => void
}) => {
  const location = useLocation()
  const isActive =
    location.pathname === to || location.pathname.startsWith(`${to}/`)

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-sidebar-hover text-white'
          : 'text-slate-400 hover:bg-sidebar-hover hover:text-slate-200'
      }`}
    >
      <span className={isActive ? 'text-brand-400' : 'text-slate-600'}>{icon}</span>
      {label}
    </Link>
  )
}
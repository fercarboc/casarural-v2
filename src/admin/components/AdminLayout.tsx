import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
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
  X 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AdminLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* Mobile Sidebar Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 rounded-lg bg-white p-2 shadow-md md:hidden"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 transform border-r border-zinc-200 bg-white p-6 transition-transform duration-200 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="mb-8 px-2">
          <h2 className="text-xl font-bold text-zinc-900">La Rasilla</h2>
          <p className="text-xs text-zinc-500">Panel de Administración</p>
        </div>

        <nav className="space-y-1">
          <AdminNavLink to="/admin/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" />
          <AdminNavLink to="/admin/calendario" icon={<Calendar size={18} />} label="Calendario" />
          <AdminNavLink to="/admin/reservas" icon={<BookOpen size={18} />} label="Reservas" />
          <AdminNavLink to="/admin/clientes" icon={<Users size={18} />} label="Clientes" />
          <AdminNavLink to="/admin/ingresos" icon={<TrendingUp size={18} />} label="Ingresos" />
          <AdminNavLink to="/admin/facturas" icon={<FileText size={18} />} label="Facturas" />
          <AdminNavLink to="/admin/ical" icon={<RefreshCw size={18} />} label="iCal Sync" />
          <AdminNavLink to="/admin/configuracion" icon={<Settings size={18} />} label="Configuración" />
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-zinc-50 p-3">
            <div className="h-8 w-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-xs font-bold text-zinc-900">{user?.email}</p>
              <p className="text-[10px] text-zinc-500">Administrador</p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const AdminNavLink = ({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
};

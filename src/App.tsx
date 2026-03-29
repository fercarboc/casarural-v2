import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
import { AnimatePresence } from 'motion/react';
import BookingPage from './public/pages/BookingPage';
import { HomePage } from './public/pages/HomePage';
import { LaCasaPage } from './public/pages/LaCasaPage';
import { GaleriaPage } from './public/pages/GaleriaPage';
import { ServiciosPage } from './public/pages/ServiciosPage';
import { ActividadesPage } from './public/pages/ActividadesPage';
import { ContactoPage } from './public/pages/ContactoPage';
import { SoportePage } from './public/pages/SoportePage';
import { DondeEstamosPage } from './public/pages/DondeEstamosPage';
import { Footer } from './public/components/Footer';
import { PoliticaCancelaciones } from './public/pages/LegalPages';
import { RGPD } from './public/pages/Rgpd';
import { AvisoLegal }   from './public/pages/AvisoLegal';
import { Privacidad }   from './public/pages/Privacidad';
import { Cookies }      from './public/pages/Cookies';
import { Ayuda }        from './public/pages/Ayuda';
import { Condiciones }  from './public/pages/Condiciones';

// Admin Imports
import { AuthProvider } from './admin/context/AuthContext';
import { ProtectedRoute } from './admin/components/ProtectedRoute';
import { AdminLayout } from './admin/components/AdminLayout';
import { LoginPage } from './admin/pages/LoginPage';
import { DashboardPage } from './admin/pages/DashboardPage';
import { CalendarPage } from './admin/pages/CalendarPage';
import { ReservationsPage } from './admin/pages/ReservationsPage';
import { ReservationDetailPage } from './admin/pages/ReservationDetailPage';
import { NewReservationPage } from './admin/pages/NewReservationPage';
import { CustomersPage } from './admin/pages/CustomersPage';
import { IncomePage } from './admin/pages/IncomePage';
import { InvoicesPage } from './admin/pages/InvoicesPage';
import { ConfigPage } from './admin/pages/ConfigPage';
import { ICalPage } from './admin/pages/ICalPage';

import { ReservationViewPage } from './public/pages/ReservationViewPage';
import ReservaConfirmada from './public/pages/ReservaConfirmada';
import { CancelarReserva } from './public/pages/CancelarReserva';
import { CambioFechas } from './public/pages/CambioFechas';

import { useCookieConsent, CookieConsentContext } from './shared/hooks/useCookieConsent';
import { CookieBanner } from './shared/components/CookieBanner';
import { Analytics } from '@vercel/analytics/react';

const NAV_LINKS = [
  { to: '/la-casa', label: 'La Casa' },
  { to: '/galeria', label: 'Galería' },
  { to: '/servicios', label: 'Servicios' },
  { to: '/actividades', label: 'Actividades' },
  { to: '/donde-estamos', label: 'Dónde estamos' },
  { to: '/contacto', label: 'Contacto' },
];

const TEST_MODE = (import.meta as any).env.VITE_BOOKING_TEST_MODE === 'true';

// Página simple que muestra cuando Stripe cancela el checkout
const ReservaCancelada = () => (
  <div className="mx-auto max-w-xl px-6 py-20 text-center">
    <div className="text-5xl mb-6">↩</div>
    <h1 className="text-2xl font-serif font-bold text-stone-800 mb-3">Pago cancelado</h1>
    <p className="text-stone-500 mb-8">No se ha realizado ningún cargo. Puedes volver a intentarlo cuando quieras.</p>
    <Link to="/reservar" className="inline-block rounded-full bg-emerald-800 px-8 py-3 text-sm font-semibold text-white hover:bg-emerald-900 transition-colors">
      Volver a reservar
    </Link>
  </div>
);

// Layouts
const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Cierra el menú al navegar
  React.useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex flex-col">
      {/* Banner modo pruebas — solo visible cuando VITE_BOOKING_TEST_MODE=true */}
      {TEST_MODE && (
        <div className="w-full bg-amber-400 text-amber-950 text-center text-xs font-bold py-2 px-4 tracking-wide z-50">
          MODO PRUEBAS — Web en desarrollo. Las reservas usan Stripe TEST y no son reales.
        </div>
      )}
      <nav className="sticky top-0 z-50 border-b border-stone-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-2xl font-serif font-bold tracking-tight text-stone-800">La Rasilla</Link>

          {/* Desktop menu */}
          <div className="hidden space-x-8 md:flex">
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} className="text-sm font-medium hover:text-emerald-700 transition-colors">{label}</Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link to="/reservar" className="rounded-full bg-emerald-800 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition-all hover:bg-emerald-900 hover:scale-105 active:scale-95">
              Reservar ahora
            </Link>
            {/* Hamburger button — only on mobile */}
            <button
              className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg hover:bg-stone-100 transition-colors"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Abrir menú"
            >
              {menuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden border-t border-stone-100 bg-white/95 px-6 py-4 flex flex-col gap-4">
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} className="text-base font-medium text-stone-700 hover:text-emerald-700 transition-colors py-1">{label}</Link>
            ))}
          </div>
        )}
      </nav>
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
};

export default function App() {
  const cookieConsent = useCookieConsent()

  return (
    <CookieConsentContext.Provider value={cookieConsent}>
    <AuthProvider>
      <ScrollToTop />
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
          <Route path="/la-casa" element={<PublicLayout><LaCasaPage /></PublicLayout>} />
          <Route path="/galeria" element={<PublicLayout><GaleriaPage /></PublicLayout>} />
          <Route path="/servicios" element={<PublicLayout><ServiciosPage /></PublicLayout>} />
          <Route path="/actividades" element={<PublicLayout><ActividadesPage /></PublicLayout>} />
          <Route path="/donde-estamos" element={<PublicLayout><DondeEstamosPage /></PublicLayout>} />
          <Route path="/contacto" element={<PublicLayout><ContactoPage /></PublicLayout>} />
          <Route path="/reservar" element={<PublicLayout><BookingPage /></PublicLayout>} />
          <Route path="/reserva/confirmada" element={<ReservaConfirmada />} />
          <Route path="/reserva/cancelada" element={<PublicLayout><ReservaCancelada /></PublicLayout>} />
          <Route path="/reserva/cancelar" element={<PublicLayout><CancelarReserva /></PublicLayout>} />
          <Route path="/reserva/cambio" element={<PublicLayout><CambioFechas /></PublicLayout>} />
          <Route path="/reserva/:token" element={<PublicLayout><ReservationViewPage /></PublicLayout>} />
          
          {/* Legal Routes */}
          <Route path="/aviso-legal"  element={<PublicLayout><AvisoLegal /></PublicLayout>} />
          <Route path="/privacidad"   element={<PublicLayout><Privacidad /></PublicLayout>} />
          <Route path="/cookies"      element={<PublicLayout><Cookies /></PublicLayout>} />
          <Route path="/ayuda"        element={<PublicLayout><Ayuda /></PublicLayout>} />
          <Route path="/condiciones"  element={<PublicLayout><Condiciones /></PublicLayout>} />
          <Route path="/rgpd"                   element={<PublicLayout><RGPD /></PublicLayout>} />
          <Route path="/politica-cancelaciones" element={<PublicLayout><PoliticaCancelaciones /></PublicLayout>} />
          <Route path="/soporte" element={<PublicLayout><SoportePage /></PublicLayout>} />
          
          {/* Admin Auth */}
          <Route path="/admin/login" element={<LoginPage />} />
          
          {/* Protected Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="calendario" element={<CalendarPage />} />
            <Route path="reservas" element={<ReservationsPage />} />
            <Route path="reservas/nueva" element={<NewReservationPage />} />
            <Route path="reservas/:id" element={<ReservationDetailPage />} />
            <Route path="clientes" element={<CustomersPage />} />
            <Route path="ingresos" element={<IncomePage />} />
            <Route path="facturas" element={<InvoicesPage />} />
            <Route path="configuracion" element={<ConfigPage />} />
            <Route path="ical" element={<ICalPage />} />
          </Route>
        </Routes>
      </AnimatePresence>
      <CookieBanner />
      <Analytics />
    </AuthProvider>
    </CookieConsentContext.Provider>
  );
}

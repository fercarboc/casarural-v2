import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';

import { HomePage } from './public/pages/HomePage';
import { AlojamientosPage } from './public/pages/Alojamientos';
import { GaleriaPage } from './public/pages/GaleriaPage';
import { ServiciosPage } from './public/pages/ServiciosPage';
import { ActividadesPage } from './public/pages/ActividadesPage';
import { ContactoPage } from './public/pages/ContactoPage';
import { SoportePage } from './public/pages/SoportePage';
import { DondeEstamosPage } from './public/pages/DondeEstamosPage';
import { Footer } from './public/components/Footer';
import { PoliticaCancelaciones } from './public/pages/LegalPages';
import { RGPD } from './public/pages/Rgpd';
import { AvisoLegal } from './public/pages/AvisoLegal';
import { Privacidad } from './public/pages/Privacidad';
import { Cookies } from './public/pages/Cookies';
import { Ayuda } from './public/pages/Ayuda';
import { Condiciones } from './public/pages/Condiciones';


import BookingFlowLayout from './public/pages/BookingFlowLayout';

import BookingCheckoutStepPage from './public/pages/BookingCheckoutStepPage';
import BookingOptionsStepPage from './public/pages/BookingOptionsStepPage';

import BookingSearchStepPage from './public/pages/BookingSearchStepPage';
 
 
import { BookingFlowProvider } from './public/booking/BookingFlowContext';



import { AuthProvider } from './admin/context/AuthContext';
import { AcceptInvitePage } from './admin/pages/AcceptInvitePage';
import { AdminTenantProvider } from './admin/context/AdminTenantContext';
import { ProtectedRoute } from './admin/components/ProtectedRoute';
import { AdminGate } from './admin/components/AdminGate';
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
import { UnidadesPage } from './admin/pages/UnidadesPage';
import { SuperAdminPage } from './admin/pages/SuperAdminPage';

import { ReservationViewPage } from './public/pages/ReservationViewPage';
import ReservaConfirmada from './public/pages/ReservaConfirmada';
import { CancelarReserva } from './public/pages/CancelarReserva';
import { CambioFechas } from './public/pages/CambioFechas';

import { useCookieConsent, CookieConsentContext } from './shared/hooks/useCookieConsent';
import { CookieBanner } from './shared/components/CookieBanner';
import { Analytics } from '@vercel/analytics/react';

import { usePublicProperty } from './shared/hooks/usePublicProperty';
import {
  getSiteName,
  getLogoAlt,
} from './shared/utils/publicProperty.utils';

const PORTAL_HOSTNAMES = ['clientes.staynexapp.com']

function InviteRedirect() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // No interferir con la página dedicada de aceptación de invitación
    if (location.pathname.startsWith('/auth/')) return

    // Portal universal sin ruta específica → redirigir al admin
    if (PORTAL_HOSTNAMES.includes(window.location.hostname) && location.pathname === '/') {
      navigate('/admin', { replace: true })
    }
  }, [navigate, location.pathname])

  return null
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

const NAV_LINKS = [
  { to: '/alojamientos', label: 'Alojamientos' },
  { to: '/galeria', label: 'Galería' },
  { to: '/servicios', label: 'Servicios' },
  { to: '/actividades', label: 'Actividades' },
  { to: '/donde-estamos', label: 'Dónde estamos' },
  { to: '/contacto', label: 'Contacto' },
];

const TEST_MODE = (import.meta as any).env.VITE_BOOKING_TEST_MODE === 'true';

const ReservaCancelada = () => (
  <div className="mx-auto max-w-xl px-6 py-20 text-center">
    <div className="mb-6 text-5xl">↩</div>
    <h1 className="mb-3 text-2xl font-serif font-bold text-stone-800">Pago cancelado</h1>
    <p className="mb-8 text-stone-500">
      No se ha realizado ningún cargo. Puedes volver a intentarlo cuando quieras.
    </p>
    <Link
      to="/reservar"
      className="inline-block rounded-full bg-emerald-800 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-900"
    >
      Volver a reservar
    </Link>
  </div>
);

const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const { property } = usePublicProperty();
  const siteName = getSiteName(property);
  const logoAlt = getLogoAlt(property);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 font-sans text-stone-900">
      {TEST_MODE && (
        <div className="z-50 w-full bg-amber-400 px-4 py-2 text-center text-xs font-bold tracking-wide text-amber-950">
          MODO PRUEBAS — Web en desarrollo. Las reservas usan Stripe TEST y no son reales.
        </div>
      )}

      <nav className="sticky top-0 z-50 border-b border-stone-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3 text-stone-800">
            {property?.logo_url ? (
              <img
                src={property.logo_url}
                alt={logoAlt}
                className="h-14 w-auto object-contain"
              />
            ) : (
              <span className="text-2xl font-serif font-bold tracking-tight">
                {siteName}
              </span>
            )}
          </Link>

          <div className="hidden space-x-8 md:flex">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="text-sm font-medium transition-colors hover:text-emerald-700"
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/reservar"
              className="rounded-full bg-emerald-800 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition-all hover:scale-105 hover:bg-emerald-900 active:scale-95"
            >
              Reservar ahora
            </Link>

            <button
              className="flex h-10 w-10 flex-col items-center justify-center rounded-lg transition-colors hover:bg-stone-100 md:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Abrir menú"
            >
              {menuOpen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-stone-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-stone-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="flex flex-col gap-4 border-t border-stone-100 bg-white/95 px-6 py-4 md:hidden">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="py-1 text-base font-medium text-stone-700 transition-colors hover:text-emerald-700"
              >
                {label}
              </Link>
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
  const cookieConsent = useCookieConsent();

  return (
    <CookieConsentContext.Provider value={cookieConsent}>
      <AuthProvider>
        <InviteRedirect />
        <ScrollToTop />
        <AnimatePresence mode="wait">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
            <Route path="/alojamientos" element={<PublicLayout><AlojamientosPage /></PublicLayout>} />
            <Route path="/la-casa" element={<Navigate to="/alojamientos" replace />} />
            <Route path="/galeria" element={<PublicLayout><GaleriaPage /></PublicLayout>} />
            <Route path="/servicios" element={<PublicLayout><ServiciosPage /></PublicLayout>} />
            <Route path="/actividades" element={<PublicLayout><ActividadesPage /></PublicLayout>} />
            <Route path="/donde-estamos" element={<PublicLayout><DondeEstamosPage /></PublicLayout>} />
            <Route path="/contacto" element={<PublicLayout><ContactoPage /></PublicLayout>} />
            {/* Booking Wizard */}
            <Route
              path="/reservar"
              element={
                <PublicLayout>
                  <BookingFlowProvider>
                    <BookingFlowLayout />
                  </BookingFlowProvider>
                </PublicLayout>
              }
            >
              <Route index element={<BookingSearchStepPage />} />
              <Route path="opciones" element={<BookingOptionsStepPage />} />
              <Route path="checkout" element={<BookingCheckoutStepPage />} />
            </Route>

            <Route path="/reserva/confirmada" element={<PublicLayout><ReservaConfirmada /></PublicLayout>} />
            <Route path="/reserva/cancelada" element={<PublicLayout><ReservaCancelada /></PublicLayout>} />
            <Route path="/reserva/cancelar" element={<PublicLayout><CancelarReserva /></PublicLayout>} />
            <Route path="/reserva/cambio" element={<PublicLayout><CambioFechas /></PublicLayout>} />
            <Route path="/reserva/:token" element={<PublicLayout><ReservationViewPage /></PublicLayout>} />

            {/* Legal Routes */}
            <Route path="/aviso-legal" element={<PublicLayout><AvisoLegal /></PublicLayout>} />
            <Route path="/privacidad" element={<PublicLayout><Privacidad /></PublicLayout>} />
            <Route path="/cookies" element={<PublicLayout><Cookies /></PublicLayout>} />
            <Route path="/ayuda" element={<PublicLayout><Ayuda /></PublicLayout>} />
            <Route path="/condiciones" element={<PublicLayout><Condiciones /></PublicLayout>} />
            <Route path="/rgpd" element={<PublicLayout><RGPD /></PublicLayout>} />
            <Route
              path="/politica-cancelaciones"
              element={<PublicLayout><PoliticaCancelaciones /></PublicLayout>}
            />
            <Route path="/soporte" element={<PublicLayout><SoportePage /></PublicLayout>} />

            {/* Auth — Primer acceso / Aceptar invitación */}
            <Route path="/auth/acepta-invitacion" element={<AcceptInvitePage />} />

            {/* Admin Auth */}
            <Route path="/admin/login" element={<LoginPage />} />

            {/* Protected Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminTenantProvider>
                    <AdminGate />
                  </AdminTenantProvider>
                </ProtectedRoute>
              }
            >
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
              <Route path="unidades" element={<UnidadesPage />} />
              <Route path="ical" element={<ICalPage />} />
              <Route path="propiedades" element={<SuperAdminPage />} />
            </Route>
          </Routes>
        </AnimatePresence>

        <CookieBanner />
        <Analytics />
      </AuthProvider>
    </CookieConsentContext.Provider>
  );
}
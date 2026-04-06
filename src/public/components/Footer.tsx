import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Phone, Mail, MapPin, ArrowRight } from 'lucide-react';
import { GestionarCookiesBtn } from '../../shared/components/CookieBanner';

import { usePublicProperty } from '../../shared/hooks/usePublicProperty';
import {
  getSiteName,
  getFooterText,
  getFullAddress,
  getLogoAlt,
} from '../../shared/utils/publicProperty.utils';

export const Footer = () => {
  const { property } = usePublicProperty();

  const siteName = getSiteName(property);
  const footerText = getFooterText(property);
  const fullAddress = getFullAddress(property);
  const logoAlt = getLogoAlt(property);

  return (
    <footer className="bg-stone-900 pb-10 pt-20 text-stone-300">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Brand */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-3 text-white">
              {property?.logo_url ? (
                <img
                  src={property.logo_url}
                  alt={logoAlt}
                  className="h-25 w-auto object-contain"
                />
              ) : (
                <span className="text-3xl font-serif font-bold tracking-tight">
                  {siteName}
                </span>
              )}
            </Link>

            <p className="text-sm leading-relaxed text-stone-400">
              {footerText}
            </p>

            <div className="flex gap-4">
              <a href="#" className="transition-colors hover:text-emerald-400" aria-label="Instagram">
                <Instagram size={20} />
              </a>
              <a href="#" className="transition-colors hover:text-emerald-400" aria-label="Facebook">
                <Facebook size={20} />
              </a>
              <a href="#" className="transition-colors hover:text-emerald-400" aria-label="WhatsApp">
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Navigation & Info */}
          <div className="grid grid-cols-2 gap-8 lg:col-span-2">
            <div className="space-y-6">
              <h4 className="text-sm font-bold uppercase tracking-widest text-white">Navegación</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/" className="transition-colors hover:text-emerald-400">Inicio</Link></li>
                <li><Link to="/alojamientos" className="transition-colors hover:text-emerald-400">Alojamientos</Link></li>
                <li><Link to="/galeria" className="transition-colors hover:text-emerald-400">Galería</Link></li>
                <li><Link to="/servicios" className="transition-colors hover:text-emerald-400">Servicios</Link></li>
                <li><Link to="/actividades" className="transition-colors hover:text-emerald-400">Actividades</Link></li>
                <li><Link to="/reservar" className="transition-colors hover:text-emerald-400">Reservas</Link></li>
                <li><Link to="/contacto" className="transition-colors hover:text-emerald-400">Contacto</Link></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-sm font-bold uppercase tracking-widest text-white">Información</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/ayuda" className="transition-colors hover:text-emerald-400">Centro de ayuda</Link></li>
                <li><Link to="/condiciones" className="transition-colors hover:text-emerald-400">Condiciones de reserva</Link></li>
                <li><Link to="/politica-cancelaciones" className="transition-colors hover:text-emerald-400">Política de cancelación</Link></li>
                <li><Link to="/contacto" className="transition-colors hover:text-emerald-400">Contacto</Link></li>
              </ul>
            </div>
          </div>

          {/* Column 4: Contact & CTA */}
          <div className="space-y-6">
            <h4 className="text-sm font-bold uppercase tracking-widest text-white">Contacto</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-emerald-500" />
                <span>{property?.telefono || 'Teléfono no disponible'}</span>
              </li>

              <li className="flex items-center gap-3">
                <Mail size={16} className="text-emerald-500" />
                <span>{property?.email || 'Email no disponible'}</span>
              </li>

              <li className="flex items-start gap-3">
                <MapPin size={16} className="mt-1 text-emerald-500" />
                <span>{fullAddress || 'Dirección no disponible'}</span>
              </li>
            </ul>

            <div className="pt-4">
              <Link
                to="/reservar"
                className="group flex items-center justify-center gap-2 rounded-full bg-emerald-800 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
              >
                Reservar ahora
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>

        {/* Legal Links Bar */}
        <div className="flex flex-col items-center justify-between gap-6 border-t border-stone-800 pt-10 md:flex-row">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-widest text-stone-500">
            <Link to="/ayuda" className="transition-colors hover:text-stone-300">Ayuda</Link>
            <Link to="/aviso-legal" className="transition-colors hover:text-stone-300">Aviso Legal</Link>
            <Link to="/privacidad" className="transition-colors hover:text-stone-300">Privacidad</Link>
            <Link to="/cookies" className="transition-colors hover:text-stone-300">Cookies</Link>
            <Link to="/rgpd" className="transition-colors hover:text-stone-300">RGPD</Link>
            <GestionarCookiesBtn />
            <Link
              to="/admin"
              className="ml-2 border-l border-stone-800 pl-6 font-bold transition-colors hover:text-stone-300"
            >
              Acceso Propietario
            </Link>
          </div>

          <p className="text-[11px] uppercase tracking-widest text-stone-600">
            © 2026 {siteName}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};
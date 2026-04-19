// src/public/pages/SolicitudConfirmadaPage.tsx

import React from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Mail, Home } from 'lucide-react'

export const SolicitudConfirmadaPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-xl px-6 py-20 text-center">
      <div className="mb-6 flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
      </div>

      <h1 className="mb-3 font-serif text-3xl font-bold text-stone-900">
        ¡Solicitud enviada!
      </h1>

      <p className="mb-8 text-stone-500 leading-relaxed">
        Hemos recibido tu solicitud de alquiler. Nos pondremos en contacto contigo
        en un plazo de <strong className="text-stone-700">24–48 horas</strong> para
        confirmar la disponibilidad y los detalles del contrato.
      </p>

      <div className="mb-8 rounded-2xl border border-stone-200 bg-stone-50 p-6 text-left space-y-3">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-stone-800">Revisa tu email</p>
            <p className="text-sm text-stone-500">Recibirás un correo de confirmación con el resumen de tu solicitud.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Home className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-stone-800">Próximos pasos</p>
            <p className="text-sm text-stone-500">
              El propietario revisará tu solicitud y te enviará las condiciones definitivas del contrato.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          to="/"
          className="rounded-full border border-stone-200 px-6 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          Volver al inicio
        </Link>
        <Link
          to="/alojamientos"
          className="rounded-full bg-emerald-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"
        >
          Ver alojamientos
        </Link>
      </div>
    </div>
  )
}

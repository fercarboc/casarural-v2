// src/public/pages/FichaAlquilerPage.tsx
// Ficha pública de una unidad en modo LONG (media/larga estancia)

import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Home, Users, BedDouble, Bath, Maximize2, CheckCircle2,
  CalendarRange, Euro, Loader2, ArrowRight,
} from 'lucide-react'
import { fetchPublicUnits, type PublicUnit } from '../services/publicUnits.service'
import { useTenant } from '../../shared/context/TenantContext'

export const FichaAlquilerPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const { property_id } = useTenant()
  const navigate = useNavigate()

  const [unit, setUnit] = useState<PublicUnit | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublicUnits({ property_id })
      .then(res => {
        const found = (res.units ?? []).find(u => u.slug === slug)
        if (!found || found.modo_operacion !== 'LONG') {
          navigate('/alojamientos', { replace: true })
        } else {
          setUnit(found)
        }
      })
      .catch(() => navigate('/alojamientos', { replace: true }))
      .finally(() => setLoading(false))
  }, [slug, property_id, navigate])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!unit) return null

  const cover = unit.portada_url || unit.fotos?.[0]?.public_url
  const gallery = unit.fotos.map(f => f.public_url).filter(Boolean).slice(0, 6)

  return (
    <div className="bg-white">
      {/* Hero */}
      {cover && (
        <div className="relative h-[50vh] overflow-hidden">
          <img src={cover} alt={unit.nombre} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 to-transparent" />
          <div className="absolute bottom-0 left-0 p-8 text-white">
            <span className="mb-2 inline-block rounded-full bg-violet-600 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              Alquiler mensual
            </span>
            <h1 className="mt-1 text-4xl font-serif font-bold">{unit.nombre}</h1>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="grid gap-12 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div>
              <h2 className="text-2xl font-serif font-bold text-stone-800">Sobre este alojamiento</h2>
              <p className="mt-4 leading-relaxed text-stone-600">
                {unit.descripcion_larga || unit.descripcion_corta || 'Alojamiento disponible para alquiler mensual.'}
              </p>
              {unit.descripcion_extras && (
                <p className="mt-3 leading-relaxed text-stone-500">{unit.descripcion_extras}</p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {unit.capacidad_maxima && (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-center">
                  <Users className="mx-auto mb-2 h-5 w-5 text-emerald-600" />
                  <p className="text-lg font-bold text-stone-800">{unit.capacidad_maxima}</p>
                  <p className="text-xs text-stone-500">personas</p>
                </div>
              )}
              {unit.num_habitaciones && (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-center">
                  <BedDouble className="mx-auto mb-2 h-5 w-5 text-emerald-600" />
                  <p className="text-lg font-bold text-stone-800">{unit.num_habitaciones}</p>
                  <p className="text-xs text-stone-500">habitaciones</p>
                </div>
              )}
              {unit.num_banos && (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-center">
                  <Bath className="mx-auto mb-2 h-5 w-5 text-emerald-600" />
                  <p className="text-lg font-bold text-stone-800">{unit.num_banos}</p>
                  <p className="text-xs text-stone-500">baños</p>
                </div>
              )}
              {unit.superficie_m2 && (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-center">
                  <Maximize2 className="mx-auto mb-2 h-5 w-5 text-emerald-600" />
                  <p className="text-lg font-bold text-stone-800">{unit.superficie_m2}</p>
                  <p className="text-xs text-stone-500">m²</p>
                </div>
              )}
            </div>

            {/* Amenities */}
            {unit.amenities && unit.amenities.length > 0 && (
              <div>
                <h3 className="mb-4 text-lg font-semibold text-stone-800">Servicios incluidos</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {unit.amenities.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-stone-700">
                      <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {gallery.length > 1 && (
              <div>
                <h3 className="mb-4 text-lg font-semibold text-stone-800">Galería</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {gallery.slice(1).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`${unit.nombre} ${i + 2}`}
                      className="aspect-[4/3] w-full rounded-xl object-cover"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar CTA */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Home className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-semibold text-stone-700">Alquiler mensual</span>
              </div>

              {unit.precio_noche != null && unit.precio_noche > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-stone-500">Desde</p>
                  <p className="text-3xl font-bold text-emerald-700">
                    {unit.precio_noche.toLocaleString('es-ES')} €
                    <span className="text-base font-normal text-stone-500">/mes</span>
                  </p>
                </div>
              )}

              <div className="mb-5 space-y-2 text-sm text-stone-600">
                <div className="flex items-center gap-2">
                  <CalendarRange size={14} className="text-emerald-600" />
                  Estancias de 1 mes en adelante
                </div>
                <div className="flex items-center gap-2">
                  <Euro size={14} className="text-emerald-600" />
                  Fianza y condiciones a convenir
                </div>
              </div>

              <Link
                to={`/solicitar/${unit.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-800 py-3 text-sm font-bold text-white hover:bg-emerald-900"
              >
                Solicitar alquiler <ArrowRight size={15} />
              </Link>

              <p className="mt-3 text-center text-xs text-stone-400">
                Sin compromiso. Te contactaremos en 24-48h.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

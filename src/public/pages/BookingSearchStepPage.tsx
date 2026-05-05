import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { AlertCircle, FlaskConical, Building, ArrowRight, X } from 'lucide-react'
import { MetaTags } from '../components/MetaTags'
import { BookingWizardHeader } from '../components/BookingWizardHeader'
import { BookingSearchForm } from '../components/BookingSearchForm'
import { AvailabilityCalendar } from '../components/AvailabilityCalendar'
import { supabase, isMockMode } from '../../integrations/supabase/client'
import { useBookingFlow } from '../booking/BookingFlowContext'
import { dateToISO, isoToDate, nightsBetween } from '../booking/bookingFlow.utils'
import { useTenant } from '../../shared/context/TenantContext'

const TEST_MODE = (import.meta as any).env.VITE_BOOKING_TEST_MODE === 'true'

export default function BookingSearchStepPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tenant   = useTenant()

  const {
    property,
    units,
    checkIn,
    checkOut,
    guests,
    availabilityByDate,
    setProperty,
    setUnits,
    setCheckIn,
    setCheckOut,
    setGuests,
    setSuggestions,
    setSelectedCombination,
    setPriceBreakdown,
    setAvailabilityByDate,
    resetSearchResults,
  } = useBookingFlow()

  const [loadingInit, setLoadingInit] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [longUnitModal, setLongUnitModal] = useState<{ id: string; nombre: string } | null>(null)

  const checkInDate = isoToDate(checkIn)
  const checkOutDate = isoToDate(checkOut)

  const maxGuests = useMemo(
    () => units.reduce((sum, unit) => sum + unit.capacidad_maxima, 0) || 1,
    [units]
  )

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut])

  const isValidSearch =
    !!checkInDate &&
    !!checkOutDate &&
    nights > 0 &&
    guests >= 1 &&
    guests <= maxGuests

  useEffect(() => {
    const loadInitial = async () => {
      setLoadingInit(true)

      try {
        // Usamos el tenant ya resuelto — evita consulta anon a properties (RLS)
        const tenantProperty = { id: tenant.property_id, nombre: tenant.nombre }
        setProperty(tenantProperty)

        // Siempre recargamos unidades desde la BD para evitar datos obsoletos
        // (capacidades desactualizadas si se añaden/modifican unidades)
        const { data: unitsData, error: unitsError } = await supabase
          .from('unidades')
          .select('id, nombre, slug, capacidad_base, capacidad_maxima, orden, activa, modo_operacion')
          .eq('property_id', tenant.property_id)
          .eq('activa', true)
          .order('orden', { ascending: true })

        if (unitsError) throw unitsError
        setUnits((unitsData ?? []).filter((u: any) => u.modo_operacion !== 'LONG'))

        // Si la URL incluye ?unidad=slug de una unidad LONG, mostrar aviso
        const unidadSlug = searchParams.get('unidad')
        if (unidadSlug) {
          const matched = (unitsData ?? []).find((u: any) => u.slug === unidadSlug)
          if (matched && (matched as any).modo_operacion === 'LONG') {
            setLongUnitModal({ id: matched.id, nombre: matched.nombre })
          }
        }
      } catch (error) {
        console.error('Error loading booking flow', error)
      } finally {
        setLoadingInit(false)
      }
    }

    // Siempre recargar: no usar caché de sessionStorage para unidades/propiedad
    loadInitial()
  }, [setProperty, setUnits])

  // Cargar disponibilidad día-a-día en cuanto tengamos propiedad y unidades
  useEffect(() => {
    if (!property?.id || units.length === 0) {
      setAvailabilityByDate({})
      return
    }

    const loadCalendar = async () => {
      try {
        const today = new Date()
        const toDate = new Date(today.getFullYear(), today.getMonth() + 12, today.getDate())
        const fromStr = today.toISOString().split('T')[0]
        const toStr   = toDate.toISOString().split('T')[0]

        const { data: calData, error: calError } = await supabase.functions.invoke(
          'get-property-calendar',
          { body: { property_id: property.id, from: fromStr, to: toStr } }
        )

        if (calError || !calData) return

        const total: number = calData.total_units ?? 0
        if (total === 0) return

        const byDate: Record<string, { blocked: number; total: number }> = {}
        for (const [date, blocked] of Object.entries(
          calData.blocked_by_date as Record<string, number>
        )) {
          byDate[date] = { blocked, total }
        }
        setAvailabilityByDate(byDate)
      } catch (err) {
        console.error('Error loading calendar availability', err)
      }
    }

    loadCalendar()
  }, [property?.id, units.length, setAvailabilityByDate])

  const handleSelectDate = (date: Date) => {
    const iso = dateToISO(date)
    if (!iso) return

    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(iso)
      setCheckOut(null)
      resetSearchResults()
      setSearchError(null)
      return
    }

    if (checkIn && !checkOut) {
      if (date <= new Date(checkIn)) {
        setCheckIn(iso)
        return
      }

      // Verificar que ningún día dentro del rango esté completamente bloqueado
      const totalUnits = units.length
      if (totalUnits > 0) {
        const start = new Date(checkIn + 'T00:00:00')
        const end   = new Date(iso + 'T00:00:00')
        const cur   = new Date(start)
        cur.setDate(cur.getDate() + 1) // el día de entrada sí puede ser checkout de otro
        while (cur < end) {
          const key = cur.toISOString().split('T')[0]
          const av  = availabilityByDate[key]
          if (av && av.total > 0 && av.blocked >= av.total) {
            setSearchError(
              `No hay disponibilidad en algún día del rango seleccionado (${key}). Elige otras fechas.`
            )
            setCheckOut(null)
            return
          }
          cur.setDate(cur.getDate() + 1)
        }
      }

      setCheckOut(iso)
      resetSearchResults()
      setSearchError(null)
    }
  }

  const handleSearch = async () => {
    if (!isValidSearch || !checkIn || !checkOut || !property) return

    setIsSearching(true)
    setSearchError(null)
    resetSearchResults()

    try {
      if (isMockMode) {
        throw new Error('La conexión con el servidor no está configurada.')
      }

      // ── PAYLOAD CORRECTO para suggest-combinations ────────────────────────
      // La función espera: property_id, fecha_entrada, fecha_salida, num_huespedes
      // NO enviar unidad_slug_preferida — el motor decide las combinaciones solo.
      const { data, error } = await supabase.functions.invoke('suggest-combinations', {
        body: {
          property_id:   property.id,
          fecha_entrada: checkIn,
          fecha_salida:  checkOut,
          num_huespedes: guests,
          tarifa:        'FLEXIBLE',
        },
      })

      if (error) {
        throw new Error(error.message || 'Error consultando disponibilidad')
      }

      // La respuesta tiene: { combinaciones: [...], resumen: {...}, disponibilidad: {...} }
      const combos = (data?.combinaciones ?? []) as any[]

      if (!combos.length) {
        setSearchError(
          data?.mensaje ?? 'No hay disponibilidad para ese grupo y fechas.'
        )
        return
      }

      setSuggestions(combos)
      setSelectedCombination(combos[0])   // preseleccionar la más económica
      setPriceBreakdown(null)

      navigate('/reservar/opciones')
    } catch (error: any) {
      console.error('Error searching combinations', error)
      setSearchError(
        error?.message || 'No se ha podido consultar la disponibilidad. Inténtalo de nuevo.'
      )
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div>
      {/* Modal: unidad de media/larga estancia */}
      {longUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2 text-violet-700">
                <Building size={20} />
                <span className="font-bold text-base">Alquiler de media/larga estancia</span>
              </div>
              <button onClick={() => setLongUnitModal(null)} className="text-stone-400 hover:text-stone-600" type="button">
                <X size={20} />
              </button>
            </div>
            <p className="mb-2 text-sm text-stone-700">
              <strong>{longUnitModal.nombre}</strong> es un alojamiento para <strong>media o larga estancia</strong> (mínimo 30 días), con precio mensual.
            </p>
            <p className="mb-5 text-sm text-stone-500">
              No se reserva ni se paga online como una estancia corta. El proceso implica presentar documentación, firmar un contrato de alquiler y abonar una fianza.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setLongUnitModal(null)}
                className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
                type="button"
              >
                Volver atrás
              </button>
              <button
                onClick={() => navigate(`/solicitar/${longUnitModal.id}`)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700"
                type="button"
              >
                Solicitar alquiler
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      <MetaTags
        title={`Reservar | ${property?.nombre ?? 'Reserva directa'}`}
        description="Reserva directa desde la web oficial. Selecciona fechas y consulta disponibilidad."
      />

      <BookingWizardHeader currentStep={1} />

      {TEST_MODE && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <FlaskConical size={16} className="shrink-0" />
          <span>
            <strong>Modo pruebas:</strong> las reservas usan Stripe TEST.
          </span>
        </div>
      )}

      <div className="mb-4">
        <h1 className="text-2xl font-bold text-stone-900 md:text-3xl">Selecciona tus fechas</h1>
        <p className="mt-1 text-sm text-stone-500">
          Elige entrada, salida y tamaño del grupo para ver las opciones disponibles.
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <BookingSearchForm
          checkIn={checkInDate}
          checkOut={checkOutDate}
          guests={guests}
          maxGuests={maxGuests}
          unitsCount={units.length}
          onGuestsChange={setGuests}
          onSearch={handleSearch}
          isValid={isValidSearch}
        />

        <AvailabilityCalendar
          selectedRange={{ start: checkInDate, end: checkOutDate }}
          onSelectDate={handleSelectDate}
          availabilityByDate={availabilityByDate}
          mode="GLOBAL"
          className="h-fit"
        />
      </div>

      {loadingInit && (
        <div className="mt-4 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500 shadow-sm">
          Cargando datos del motor de reservas...
        </div>
      )}

      {isSearching && (
        <div className="mt-4 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500 shadow-sm">
          Consultando disponibilidad real...
        </div>
      )}

      {searchError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-800"
        >
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">No se puede continuar</p>
            <p className="text-sm">{searchError}</p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
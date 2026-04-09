import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { AlertCircle, FlaskConical } from 'lucide-react'
import { MetaTags } from '../components/MetaTags'
import { BookingWizardHeader } from '../components/BookingWizardHeader'
import { BookingSearchForm } from '../components/BookingSearchForm'
import { AvailabilityCalendar } from '../components/AvailabilityCalendar'
import { supabase, isMockMode } from '../../integrations/supabase/client'
import { useBookingFlow } from '../booking/BookingFlowContext'
import { dateToISO, isoToDate, nightsBetween } from '../booking/bookingFlow.utils'

const TEST_MODE = (import.meta as any).env.VITE_BOOKING_TEST_MODE === 'true'

export default function BookingSearchStepPage() {
  const navigate = useNavigate()

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
        const { data: propertyData, error: propertyError } = await supabase
          .from('properties')
          .select('id, nombre')
          .limit(1)
          .single()

        if (propertyError) throw propertyError
        setProperty(propertyData)

        const { data: unitsData, error: unitsError } = await supabase
          .from('unidades')
          .select('id, nombre, slug, capacidad_base, capacidad_maxima, orden, activa')
          .eq('activa', true)
          .order('orden', { ascending: true })

        if (unitsError) throw unitsError
        setUnits(unitsData ?? [])
      } catch (error) {
        console.error('Error loading booking flow', error)
      } finally {
        setLoadingInit(false)
      }
    }

    if (!property || units.length === 0) {
      loadInitial()
    } else {
      setLoadingInit(false)
    }
  }, [property, units.length, setProperty, setUnits])

  useEffect(() => {
    setAvailabilityByDate({})
  }, [units.length])

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
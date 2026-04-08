import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, X } from 'lucide-react'
import { MetaTags } from '../components/MetaTags'
import { BookingWizardHeader } from '../components/BookingWizardHeader'
import {
  BookingCheckoutSection,
  CustomerFormData,
} from '../components/BookingCheckoutSection'
import { supabase, isMockMode } from '../../integrations/supabase/client'
import { useBookingFlow } from '../booking/BookingFlowContext'
import { isoToDate } from '../booking/bookingFlow.utils'

const TEST_MODE = (import.meta as any).env.VITE_BOOKING_TEST_MODE === 'true'

export default function BookingCheckoutStepPage() {
  const navigate = useNavigate()

  const {
    property,
    checkIn,
    checkOut,
    guests,
    rateType,
    priceBreakdown,
    selectedCombination,
    setRateType,
  } = useBookingFlow()

  const [isBooking, setIsBooking] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [testConfirmPending, setTestConfirmPending] = useState<CustomerFormData | null>(null)

  const checkInDate = isoToDate(checkIn)
  const checkOutDate = isoToDate(checkOut)

  const selectedComboLabel = useMemo(() => {
    if (!selectedCombination) return ''
    return selectedCombination.unidades.map((u) => u.nombre).join(' + ')
  }, [selectedCombination])

  useEffect(() => {
    if (!checkIn || !checkOut || !selectedCombination || !priceBreakdown) {
      navigate('/reservar/opciones', { replace: true })
    }
  }, [checkIn, checkOut, selectedCombination, priceBreakdown, navigate])

  const executePayment = async (form: CustomerFormData) => {
    if (!checkIn || !checkOut || !selectedCombination) return

    setIsBooking(true)
    setBookingError(null)

    try {
      if (isMockMode) {
        throw new Error(
          'La conexión con el servidor no está configurada. Contacta con el alojamiento.'
        )
      }

      const { data: preReserva, error: preError } = await supabase.functions.invoke(
        'create-pre-reservation',
        {
          body: {
            checkIn,
            checkOut,
            rateType,
            unidades: selectedCombination.unidades.map((u) => ({
              unidad_id: u.id,
              num_huespedes: u.num_huespedes_asignados,
            })),
            guestData: {
              nombre_cliente: form.nombre,
              apellidos_cliente: form.apellidos,
              email_cliente: form.email,
              telefono_cliente: form.telefono,
              nif_cliente: form.numero_documento ?? '',
            },
          },
        }
      )

      if (preError) {
        const msg =
          (preReserva as any)?.error ??
          preError.message ??
          'Error al crear la pre-reserva'
        throw new Error(msg)
      }

      const { data: checkout, error: checkoutError } = await supabase.functions.invoke(
        'create-stripe-checkout',
        {
          body: { reservaId: preReserva.reserva_id },
        }
      )

      if (checkoutError) {
        const msg =
          (checkout as any)?.error ??
          checkoutError.message ??
          'Error al iniciar el pago'
        throw new Error(msg)
      }

      window.location.href = checkout.checkout_url
    } catch (err: any) {
      console.error('Booking error', err)
      const msg = err?.message ?? ''

      if (msg.includes('disponible')) {
        setBookingError('Las fechas seleccionadas ya no están disponibles. Vuelve a buscar.')
      } else if (msg) {
        setBookingError(msg)
      } else {
        setBookingError('Ha ocurrido un error al procesar la reserva.')
      }

      setIsBooking(false)
    }
  }

  const handlePay = async (form: CustomerFormData) => {
    if (TEST_MODE) {
      setTestConfirmPending(form)
      return
    }

    await executePayment(form)
  }

  if (!checkInDate || !checkOutDate || !selectedCombination || !priceBreakdown) {
    return null
  }

  return (
    <div>
      <MetaTags
        title={`Datos y pago | ${property?.nombre ?? 'Reserva directa'}`}
        description="Completa los datos del titular y realiza el pago seguro de tu reserva."
      />

      <BookingWizardHeader currentStep={3} />

      {TEST_MODE && testConfirmPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2 text-amber-700">
                <FlaskConical size={20} />
                <span className="font-bold text-base">Modo pruebas activo</span>
              </div>
              <button
                onClick={() => setTestConfirmPending(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mb-2 text-sm text-stone-600">
              Estás a punto de iniciar un pago de <strong>prueba</strong> con Stripe TEST.
            </p>

            <ul className="mb-5 list-inside list-disc space-y-1 text-sm text-stone-500">
              <li>No se realizará ningún cargo real</li>
              <li>
                Usa la tarjeta de test:{' '}
                <code className="rounded bg-stone-100 px-1">4242 4242 4242 4242</code>
              </li>
              <li>Cualquier fecha futura y CVV de 3 dígitos</li>
            </ul>

            <div className="flex gap-3">
              <button
                onClick={() => setTestConfirmPending(null)}
                className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const form = testConfirmPending
                  setTestConfirmPending(null)
                  if (form) executePayment(form)
                }}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white hover:bg-amber-600"
              >
                Continuar con el test
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <h1 className="text-2xl font-bold text-stone-900 md:text-3xl">Datos y pago</h1>
        <p className="mt-1 text-sm text-stone-500">
          Completa los datos del titular y confirma la reserva con pago seguro.
        </p>
      </div>

      {bookingError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {bookingError}
        </div>
      )}

      <BookingCheckoutSection
        checkIn={checkInDate}
        checkOut={checkOutDate}
        guests={guests}
        rateType={rateType}
        breakdown={priceBreakdown}
        propertyName={property?.nombre}
        selectedCombinationLabel={selectedComboLabel}
        onRateChange={setRateType}
        onPay={handlePay}
        onBack={() => navigate('/reservar/opciones')}
        isProcessing={isBooking}
      />
    </div>
  )
}
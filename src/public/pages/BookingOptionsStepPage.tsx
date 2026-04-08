import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { MetaTags } from '../components/MetaTags'
import { BookingWizardHeader } from '../components/BookingWizardHeader'
import { supabase, isMockMode } from '../../integrations/supabase/client'
import { useBookingFlow } from '../booking/BookingFlowContext'
import { nightsBetween } from '../booking/bookingFlow.utils'

export default function BookingOptionsStepPage() {
  const navigate = useNavigate()

  const {
    property,
    checkIn,
    checkOut,
    guests,
    suggestions,
    selectedCombination,
    rateType,
    priceBreakdown,
    setSelectedCombination,
    setRateType,
    setPriceBreakdown,
  } = useBookingFlow()

  const [loadingPrice, setLoadingPrice] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut])

  const selectedComboLabel = useMemo(() => {
    if (!selectedCombination) return ''
    return selectedCombination.unidades.map((unit) => unit.nombre).join(' + ')
  }, [selectedCombination])

  useEffect(() => {
    if (!checkIn || !checkOut || !suggestions.length) {
      navigate('/reservar', { replace: true })
    }
  }, [checkIn, checkOut, suggestions.length, navigate])

  useEffect(() => {
    const recalculate = async () => {
      if (!checkIn || !checkOut || !selectedCombination) {
        setPriceBreakdown(null)
        return
      }

      setLoadingPrice(true)
      setError(null)

      try {
        if (isMockMode) {
          throw new Error('La conexión con el servidor no está configurada.')
        }

        const { data, error } = await supabase.functions.invoke('calculate-price', {
          body: {
            checkIn,
            checkOut,
            rateType,
            unidades: selectedCombination.unidades.map((unit) => ({
              unidad_id: unit.id,
              num_huespedes: unit.num_huespedes_asignados,
            })),
          },
        })

        if (error) {
          throw new Error(error.message || 'Error recalculando el precio')
        }

        setPriceBreakdown(data)
      } catch (err: any) {
        console.error('Error recalculating price', err)
        setPriceBreakdown(null)
        setError(err?.message || 'No se ha podido calcular el precio.')
      } finally {
        setLoadingPrice(false)
      }
    }

    recalculate()
  }, [checkIn, checkOut, selectedCombination, rateType, setPriceBreakdown])

  const handleContinue = () => {
    if (!selectedCombination || !priceBreakdown) return
    navigate('/reservar/checkout')
  }

  return (
    <div>
      <MetaTags
        title={`Opciones | ${property?.nombre ?? 'Reserva directa'}`}
        description="Elige la combinación disponible y la tarifa antes de completar tu reserva."
      />

      <BookingWizardHeader currentStep={2} />

      <div className="mb-4">
        <h1 className="text-2xl font-bold text-stone-900 md:text-3xl">Elige tu opción</h1>
        <p className="mt-1 text-sm text-stone-500">
          Selecciona la mejor combinación para tu grupo y la tarifa que prefieras.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            <CheckCircle2 size={18} />
            <p className="font-medium text-sm">Hay disponibilidad. Elige una opción para tu grupo.</p>
          </div>

          <div className="space-y-3">
            {suggestions.map((combo) => {
              const selected = selectedCombination?.ranking === combo.ranking

              return (
                <button
                  key={combo.ranking}
                  onClick={() => setSelectedCombination(combo)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    selected
                      ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/10'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                          {combo.tipo}
                        </span>
                        {combo.ranking === 1 && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Recomendada
                          </span>
                        )}
                      </div>

                      <p className="text-base font-bold text-stone-900">
                        {combo.unidades.map((u) => u.nombre).join(' + ')}
                      </p>

                      <p className="mt-1 text-sm text-stone-500">
                        {combo.total_huespedes_asignados} huéspedes · {combo.num_unidades} unidad
                        {combo.num_unidades > 1 ? 'es' : ''}
                      </p>

                      <div className="mt-2 space-y-1 text-xs text-stone-500">
                        {combo.unidades.map((u) => (
                          <div key={u.id} className="flex justify-between gap-4">
                            <span className="truncate">
                              {u.nombre} · {u.num_huespedes_asignados} huésp.
                            </span>
                            <span>{u.importe_total_unidad.toFixed(2)}€</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-xl font-bold text-stone-900">{combo.precio_total.toFixed(2)}€</p>
                      <p className="text-xs text-stone-500">
                        {combo.precio_por_huesped.toFixed(2)}€ / huésped
                      </p>
                      {selected && (
                        <CheckCircle2 size={18} className="ml-auto mt-2 text-emerald-600" />
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setRateType('FLEXIBLE')}
              className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                rateType === 'FLEXIBLE'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                  : 'border-stone-200 bg-white text-stone-700'
              }`}
            >
              Tarifa flexible
            </button>

            <button
              onClick={() => setRateType('NON_REFUNDABLE')}
              className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                rateType === 'NON_REFUNDABLE'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                  : 'border-stone-200 bg-white text-stone-700'
              }`}
            >
              No reembolsable
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {priceBreakdown && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-stone-500">Combinación seleccionada</span>
                <span className="text-right text-sm font-bold text-stone-900">{selectedComboLabel}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-500">Total</span>
                <span className="text-2xl font-bold text-stone-900">
                  {priceBreakdown.importe_total.toFixed(2)}€
                </span>
              </div>

              <div className="space-y-1 text-sm text-stone-600">
                <div className="flex justify-between">
                  <span>Alojamiento</span>
                  <span>{priceBreakdown.importe_alojamiento.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span>Extras</span>
                  <span>{priceBreakdown.importe_extras.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span>Limpieza</span>
                  <span>{priceBreakdown.importe_limpieza.toFixed(2)}€</span>
                </div>
                {priceBreakdown.descuento_aplicado > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Descuento</span>
                    <span>-{priceBreakdown.descuento_aplicado.toFixed(2)}€</span>
                  </div>
                )}
              </div>

              {rateType === 'FLEXIBLE' && priceBreakdown.importe_senal !== null && (
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <span>Señal ahora</span>
                  <strong>{priceBreakdown.importe_senal.toFixed(2)}€</strong>
                </div>
              )}

              <button
                onClick={handleContinue}
                disabled={loadingPrice}
                className="w-full rounded-xl bg-stone-900 py-3.5 text-sm font-bold text-white transition hover:bg-stone-800 disabled:opacity-50"
              >
                Continuar con la reserva
              </button>
            </motion.div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 h-fit">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-stone-900">Tu reserva</h3>

            <div className="space-y-3 text-sm text-stone-600">
              <div className="flex justify-between gap-4">
                <span>Entrada</span>
                <span className="font-medium text-stone-900">{checkIn ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Salida</span>
                <span className="font-medium text-stone-900">{checkOut ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>Noches</span>
                <span className="font-medium text-stone-900">{nights || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>Huéspedes</span>
                <span className="font-medium text-stone-900">{guests}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Combinación</span>
                <span className="text-right font-medium text-stone-900">
                  {selectedComboLabel || 'Pendiente'}
                </span>
              </div>
            </div>

            {priceBreakdown && (
              <>
                <div className="my-4 border-t border-stone-100" />
                <div className="space-y-2 text-sm text-stone-600">
                  <div className="flex justify-between">
                    <span>Alojamiento</span>
                    <span>{priceBreakdown.importe_alojamiento.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Extras</span>
                    <span>{priceBreakdown.importe_extras.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Limpieza</span>
                    <span>{priceBreakdown.importe_limpieza.toFixed(2)}€</span>
                  </div>
                  {priceBreakdown.descuento_aplicado > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Descuento</span>
                      <span>-{priceBreakdown.descuento_aplicado.toFixed(2)}€</span>
                    </div>
                  )}
                </div>

                <div className="my-4 border-t border-stone-100" />
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-stone-900">Total</span>
                  <span className="text-2xl font-bold text-stone-900">
                    {priceBreakdown.importe_total.toFixed(2)}€
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm text-sm text-stone-600">
            El backend valida la disponibilidad y recalcula el precio antes de crear la reserva.
          </div>
        </aside>
      </div>
    </div>
  )
}
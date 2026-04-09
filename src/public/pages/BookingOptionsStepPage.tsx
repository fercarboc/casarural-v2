import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { MetaTags } from '../components/MetaTags'
import { BookingWizardHeader } from '../components/BookingWizardHeader'
import { supabase, isMockMode } from '../../integrations/supabase/client'
import { useBookingFlow, SuggestedCombination, SuggestedUnit } from '../booking/BookingFlowContext'
import { nightsBetween } from '../booking/bookingFlow.utils'

// Alias locales — los tipos reales vienen de BookingFlowContext
type Combinacion = SuggestedCombination
type UnidadCombo = SuggestedUnit

// ─── Miniaturas de unidades ───────────────────────────────────────────────────

interface UnitCoverMap {
  [unidad_id: string]: string | null
}

function CombinationUnitPhotos({
  unidades,
  coverMap,
}: {
  unidades: UnidadCombo[]
  coverMap: UnitCoverMap
}) {
  const visible = unidades.slice(0, 4)

  return (
    <div className="mt-3 border-t border-stone-100 pt-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
        Alojamientos incluidos en esta combinación
      </p>
      <div className="flex gap-2">
        {visible.map((u) => {
          const url = coverMap[u.unidad_id]
          return (
            <div key={u.unidad_id} className="flex flex-col items-center gap-1" style={{ width: 80 }}>
              <div className="h-14 w-20 overflow-hidden rounded-lg bg-stone-100 shrink-0">
                {url ? (
                  <img
                    src={url}
                    alt={u.nombre}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-stone-300">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M5.25 3h13.5A2.25 2.25 0 0121 5.25v13.5A2.25 2.25 0 0118.75 21H5.25A2.25 2.25 0 013 18.75V5.25A2.25 2.25 0 015.25 3z" />
                    </svg>
                  </div>
                )}
              </div>
              <span className="w-20 truncate text-center text-[10px] text-stone-500">{u.nombre}</span>
            </div>
          )
        })}
        {unidades.length > 4 && (
          <div className="flex flex-col items-center gap-1" style={{ width: 80 }}>
            <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-stone-100 text-xs font-bold text-stone-400">
              +{unidades.length - 4}
            </div>
            <span className="w-20 text-center text-[10px] text-stone-400">más</span>
          </div>
        )}
      </div>
    </div>
  )
}

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
  const [coverMap, setCoverMap] = useState<UnitCoverMap>({})

  // Cargar foto de portada de cada unidad que aparece en las sugerencias
  useEffect(() => {
    if (!suggestions.length) return

    const allUnitIds = Array.from(
      new Set((suggestions as Combinacion[]).flatMap((c) => c.unidades.map((u) => u.unidad_id)))
    )

    supabase
      .from('unidad_fotos')
      .select('unidad_id, public_url, es_portada, orden')
      .in('unidad_id', allUnitIds)
      .order('orden', { ascending: true })
      .then(({ data }: { data: { unidad_id: string; public_url: string; es_portada: boolean; orden: number | null }[] | null }) => {
        if (!data) return
        const map: UnitCoverMap = {}
        for (const id of allUnitIds) {
          const fotos = data.filter((f: { unidad_id: string }) => f.unidad_id === id)
          const portada = fotos.find((f: { es_portada: boolean }) => f.es_portada) ?? fotos[0] ?? null
          map[id] = portada?.public_url ?? null
        }
        setCoverMap(map)
      })
  }, [suggestions])

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut])

  const selectedComboLabel = useMemo(() => {
    if (!selectedCombination) return ''
    return (selectedCombination as Combinacion).unidades.map((u) => u.nombre).join(' + ')
  }, [selectedCombination])

  useEffect(() => {
    if (!checkIn || !checkOut || !suggestions.length) {
      navigate('/reservar', { replace: true })
    }
  }, [checkIn, checkOut, suggestions.length, navigate])

  // Recalcular precio cuando cambia combinación o tarifa
  useEffect(() => {
    const recalculate = async () => {
      if (!checkIn || !checkOut || !selectedCombination || !property) {
        setPriceBreakdown(null)
        return
      }

      setLoadingPrice(true)
      setError(null)

      try {
        if (isMockMode) {
          throw new Error('La conexión con el servidor no está configurada.')
        }

        const combo = selectedCombination as Combinacion

        // ── Payload correcto para calculate-price ────────────────────────────
        const { data, error } = await supabase.functions.invoke('calculate-price', {
          body: {
            property_id:   property.id,
            fecha_entrada: checkIn,
            fecha_salida:  checkOut,
            num_huespedes: guests,
            tarifa:        rateType === 'NON_REFUNDABLE' ? 'NO_REEMBOLSABLE' : 'FLEXIBLE',
            unidades: combo.unidades.map((u) => ({
              unidad_id:       u.unidad_id,          // campo correcto
              extras_manuales: u.extras_asignados,   // respeta la distribución elegida
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
  }, [checkIn, checkOut, selectedCombination, rateType, property, guests, setPriceBreakdown])

  const handleContinue = () => {
    if (!selectedCombination || !priceBreakdown) return
    navigate('/reservar/checkout')
  }

  // Helper: importe total de una unidad en el desglose de suggest-combinations
  const importeUnidad = (u: UnidadCombo, combo: Combinacion): number => {
    // suggest-combinations devuelve importe_alojamiento + importe_extras como totales del combo,
    // no por unidad. Usamos precio_por_persona × num_huespedes_asignados como aproximación,
    // o calculamos proporcional al precio noche de la unidad.
    // Si priceBreakdown ya está calculado, usar ese desglose.
    const unidadPB = priceBreakdown?.unidades?.find((x: any) => x.unidad_id === u.unidad_id)
    if (unidadPB) {
      return (unidadPB.importe_alojamiento ?? 0) + (unidadPB.importe_extras ?? 0) + (unidadPB.importe_limpieza ?? 0)
    }
    // Fallback: proporcional al número de huéspedes
    const totalPax = combo.unidades.reduce((s, x) => s + x.num_huespedes_asignados, 0)
    return totalPax > 0 ? (combo.importe_total * u.num_huespedes_asignados) / totalPax : 0
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

          {/* Lista de combinaciones */}
          <div className="space-y-3">
            {(suggestions as Combinacion[]).map((combo, idx) => {
              // Usar índice como clave ya que no hay campo ranking
              const isSelected =
                selectedCombination &&
                (selectedCombination as Combinacion).unidades
                  .map((u) => u.unidad_id)
                  .join(',') ===
                  combo.unidades.map((u) => u.unidad_id).join(',')

              // Etiqueta de tipo de combinación
              const tipoLabel = combo.es_sin_extras
                ? combo.es_capacidad_exacta
                  ? 'Capacidad exacta'
                  : 'Sin extras'
                : `+${combo.extras_total} extra${combo.extras_total > 1 ? 's' : ''}`

              const totalPaxCombo = combo.unidades.reduce((s, u) => s + u.num_huespedes_asignados, 0)

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedCombination(combo)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/10'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                          {tipoLabel}
                        </span>
                        {idx === 0 && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Recomendada
                          </span>
                        )}
                        {combo.exceso_capacidad > 0 && (
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-500">
                            Capacidad mayor
                          </span>
                        )}
                      </div>

                      <p className="text-base font-bold text-stone-900">
                        {combo.unidades.map((u) => u.nombre).join(' + ')}
                      </p>

                      <p className="mt-1 text-sm text-stone-500">
                        {totalPaxCombo} huéspedes · {combo.num_unidades} unidad
                        {combo.num_unidades > 1 ? 'es' : ''}
                        {combo.warnings?.length > 0 && (
                          <span className="ml-2 text-amber-600">⚠ {combo.warnings[0]}</span>
                        )}
                      </p>

                      {/* Desglose por unidad */}
                      <div className="mt-2 space-y-1 text-xs text-stone-500">
                        {combo.unidades.map((u) => (
                          <div key={u.unidad_id} className="flex justify-between gap-4">
                            <span className="truncate">
                              {u.nombre} · {u.num_huespedes_asignados} huésp.
                              {u.extras_asignados > 0 && (
                                <span className="ml-1 text-amber-600">+{u.extras_asignados} extra</span>
                              )}
                            </span>
                            <span>{importeUnidad(u, combo).toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>

                      {/* Miniaturas de fotos */}
                      <CombinationUnitPhotos unidades={combo.unidades} coverMap={coverMap} />
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-xl font-bold text-stone-900">
                        {combo.importe_total.toFixed(2)} €
                      </p>
                      <p className="text-xs text-stone-500">
                        {combo.precio_por_persona.toFixed(2)} € / huésped
                      </p>
                      {isSelected && (
                        <CheckCircle2 size={18} className="ml-auto mt-2 text-emerald-600" />
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Selector de tarifa */}
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

          {/* Resumen de precio calculado */}
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
                  {(priceBreakdown.importe_total ?? 0).toFixed(2)} €
                </span>
              </div>

              <div className="space-y-1 text-sm text-stone-600">
                <div className="flex justify-between">
                  <span>Alojamiento</span>
                  <span>{(priceBreakdown.importe_alojamiento_total ?? 0).toFixed(2)} €</span>
                </div>
                {(priceBreakdown.importe_extras_total ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Extras</span>
                    <span>{(priceBreakdown.importe_extras_total ?? 0).toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Limpieza</span>
                  <span>{(priceBreakdown.importe_limpieza_total ?? 0).toFixed(2)} €</span>
                </div>
                {(priceBreakdown.descuento_aplicado ?? 0) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Descuento no reembolsable</span>
                    <span>-{(priceBreakdown.descuento_aplicado ?? 0).toFixed(2)} €</span>
                  </div>
                )}
              </div>

              {rateType === 'FLEXIBLE' && (priceBreakdown.importe_senal ?? 0) > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <span>Señal ahora ({priceBreakdown.porcentaje_senal ?? 30}%)</span>
                  <strong>{(priceBreakdown.importe_senal ?? 0).toFixed(2)} €</strong>
                </div>
              )}

              <button
                onClick={handleContinue}
                disabled={loadingPrice}
                className="w-full rounded-xl bg-stone-900 py-3.5 text-sm font-bold text-white transition hover:bg-stone-800 disabled:opacity-50"
              >
                {loadingPrice ? 'Calculando...' : 'Continuar con la reserva'}
              </button>
            </motion.div>
          )}

          {loadingPrice && !priceBreakdown && (
            <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500 shadow-sm">
              Calculando precio...
            </div>
          )}
        </div>

        {/* Sidebar resumen */}
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
                    <span>{(priceBreakdown.importe_alojamiento_total ?? 0).toFixed(2)} €</span>
                  </div>
                  {(priceBreakdown.importe_extras_total ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Extras</span>
                      <span>{(priceBreakdown.importe_extras_total ?? 0).toFixed(2)} €</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Limpieza</span>
                    <span>{(priceBreakdown.importe_limpieza_total ?? 0).toFixed(2)} €</span>
                  </div>
                  {(priceBreakdown.descuento_aplicado ?? 0) > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Descuento</span>
                      <span>-{(priceBreakdown.descuento_aplicado ?? 0).toFixed(2)} €</span>
                    </div>
                  )}
                </div>

                <div className="my-4 border-t border-stone-100" />
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-stone-900">Total</span>
                  <span className="text-2xl font-bold text-stone-900">
                    {(priceBreakdown.importe_total ?? 0).toFixed(2)} €
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
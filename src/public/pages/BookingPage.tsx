import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  FlaskConical,
  Info,
  ShieldCheck,
  X,
} from 'lucide-react';
import { supabase, isMockMode } from '../../integrations/supabase/client';
import { MetaTags } from '../components/MetaTags';
import { BookingSearchForm } from '../components/BookingSearchForm';
import { AvailabilityCalendar } from '../components/AvailabilityCalendar';
import {
  BookingCheckoutSection,
  CustomerFormData,
  RateType,
} from '../components/BookingCheckoutSection';

const TEST_MODE = (import.meta as any).env.VITE_BOOKING_TEST_MODE === 'true';

type PropertyRow = {
  id: string;
  nombre: string;
};

type UnitRow = {
  id: string;
  nombre: string;
  slug: string;
  capacidad_base: number;
  capacidad_maxima: number;
  orden?: number | null;
  activa: boolean;
};

type SuggestedUnit = {
  id: string;
  slug: string;
  nombre: string;
  capacidad_base: number;
  capacidad_maxima: number;
  num_huespedes_asignados: number;
  importe_alojamiento: number;
  importe_limpieza: number;
  importe_extras: number;
  importe_total_unidad: number;
  desglose?: any;
};

type SuggestedCombination = {
  ranking: number;
  tipo: 'RECOMENDADA' | 'ALTERNATIVA' | 'COMPLETA';
  unidades: SuggestedUnit[];
  total_capacidad_base: number;
  total_capacidad_maxima: number;
  total_huespedes_asignados: number;
  precio_total: number;
  precio_por_huesped: number;
  es_exacta_capacidad_base: boolean;
  exceso_capacidad: number;
  num_unidades: number;
};

type RemotePriceUnit = {
  unidad_id: string;
  unidad_nombre: string;
  unidad_slug: string;
  nights: number;
  num_huespedes: number;
  extra_guests: number;
  season: string;
  temporada_id: string | null;
  precio_noche: number;
  extra_huesped: number;
  importe_alojamiento: number;
  importe_extra: number;
  limpieza: number;
  descuento: number;
  subtotal: number;
  total: number;
  desglose: any;
};

type RemotePriceBreakdown = {
  ok?: boolean;
  mode: 'single' | 'multi';
  property_id?: string;
  checkIn?: string;
  checkOut?: string;
  nights: number;
  num_huespedes: number;
  rate_type: string;
  unidades: RemotePriceUnit[];
  importe_alojamiento: number;
  importe_extras: number;
  importe_limpieza: number;
  descuento_aplicado: number;
  importe_total: number;
  importe_senal: number | null;
  importe_resto: number | null;
};

type DayAvailability = {
  blocked: number;
  total: number;
};

function dateToISO(d: Date | null): string {
  if (!d) return '';
  return d.toISOString().split('T')[0];
}

function nightsBetween(start: Date | null, end: Date | null): number {
  if (!start || !end) return 0;
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export default function BookingPage() {
  const [property, setProperty] = useState<PropertyRow | null>(null);
  const [units, setUnits] = useState<UnitRow[]>([]);

  const [checkIn, setCheckIn] = useState<Date | null>(() => {
    const v = new URLSearchParams(window.location.search).get('entrada')
    return v ? new Date(v + 'T12:00:00') : null
  });
  const [checkOut, setCheckOut] = useState<Date | null>(() => {
    const v = new URLSearchParams(window.location.search).get('salida')
    return v ? new Date(v + 'T12:00:00') : null
  });
  const [guests, setGuests] = useState(() => {
    const v = new URLSearchParams(window.location.search).get('huespedes')
    return v ? Math.max(1, parseInt(v, 10)) : 2
  });
  const [rateType, setRateType] = useState<RateType>('FLEXIBLE');

  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const [suggestions, setSuggestions] = useState<SuggestedCombination[]>([]);
  const [selectedCombination, setSelectedCombination] = useState<SuggestedCombination | null>(null);
  const [priceBreakdown, setPriceBreakdown] = useState<RemotePriceBreakdown | null>(null);

  const [showCheckout, setShowCheckout] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);

  const [calendarMode] = useState<'GLOBAL' | 'UNIT'>('GLOBAL');
  const [availabilityByDate, setAvailabilityByDate] = useState<Record<string, DayAvailability>>({});
  const [testConfirmPending, setTestConfirmPending] = useState<CustomerFormData | null>(null);

  const checkoutRef = useRef<HTMLDivElement | null>(null);

  const maxGuests = useMemo(
    () => units.reduce((sum, u) => sum + u.capacidad_maxima, 0) || 1,
    [units]
  );

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);

  const isValidSearch =
    !!checkIn &&
    !!checkOut &&
    nights > 0 &&
    guests >= 1 &&
    guests <= maxGuests;

  const selectedComboLabel = useMemo(() => {
    if (!selectedCombination) return '';
    return selectedCombination.unidades.map((u) => u.nombre).join(' + ');
  }, [selectedCombination]);

  useEffect(() => {
    const loadInitial = async () => {
      setLoadingInit(true);
      try {
        const { data: propertyData, error: propertyError } = await supabase
          .from('properties')
          .select('id, nombre')
          .limit(1)
          .single();

        if (propertyError) throw propertyError;
        setProperty(propertyData);

        const { data: unitsData, error: unitsError } = await supabase
          .from('unidades')
          .select('id, nombre, slug, capacidad_base, capacidad_maxima, orden, activa')
          .eq('activa', true)
          .order('orden', { ascending: true });

        if (unitsError) throw unitsError;
        setUnits(unitsData ?? []);
      } catch (err) {
        console.error('Error loading booking page data', err);
      } finally {
        setLoadingInit(false);
      }
    };

    loadInitial();
  }, []);

  useEffect(() => {
    const loadCalendarAvailability = async () => {
      try {
        setAvailabilityByDate({});
      } catch (err) {
        console.error('Error loading calendar availability', err);
        setAvailabilityByDate({});
      }
    };

    loadCalendarAvailability();
  }, [units.length]);

  useEffect(() => {
    const recalculate = async () => {
      if (!checkIn || !checkOut || !selectedCombination) {
        setPriceBreakdown(null);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('calculate-price', {
          body: {
            checkIn: dateToISO(checkIn),
            checkOut: dateToISO(checkOut),
            rateType,
            unidades: selectedCombination.unidades.map((u) => ({
              unidad_id: u.id,
              num_huespedes: u.num_huespedes_asignados,
            })),
          },
        });

        if (error) {
          throw new Error(error.message || 'Error recalculando el precio');
        }

        setPriceBreakdown(data as RemotePriceBreakdown);
      } catch (err) {
        console.error('Error recalculating price', err);
        setPriceBreakdown(null);
      }
    };

    recalculate();
  }, [checkIn, checkOut, selectedCombination, rateType]);

  const handleSelectDate = (date: Date) => {
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(date);
      setCheckOut(null);
      setHasSearched(false);
      setIsAvailable(null);
      setSuggestions([]);
      setSelectedCombination(null);
      setPriceBreakdown(null);
      setShowCheckout(false);
      setBookingError(null);
      return;
    }

    if (checkIn && !checkOut) {
      if (date <= checkIn) {
        setCheckIn(date);
        return;
      }

      setCheckOut(date);
      setHasSearched(false);
      setIsAvailable(null);
      setSuggestions([]);
      setSelectedCombination(null);
      setPriceBreakdown(null);
      setShowCheckout(false);
      setBookingError(null);
    }
  };

  const handleSearch = async () => {
    if (!isValidSearch || !checkIn || !checkOut) return;

    setIsSearching(true);
    setHasSearched(false);
    setIsAvailable(null);
    setShowCheckout(false);
    setBookingError(null);
    setSuggestions([]);
    setSelectedCombination(null);
    setPriceBreakdown(null);

    try {
      const preferredSlug =
        guests <= 11
          ? units.find((u) => u.slug === 'casa-principal')?.slug
          : undefined;

      const { data, error } = await supabase.functions.invoke('suggest-combinations', {
        body: {
          checkIn: dateToISO(checkIn),
          checkOut: dateToISO(checkOut),
          huespedes: guests,
          unidad_slug_preferida: preferredSlug,
        },
      });

      if (error) {
        throw new Error(error.message || 'Error consultando disponibilidad');
      }

      const combos = (data?.combinaciones ?? []) as SuggestedCombination[];

      setHasSearched(true);

      if (!combos.length) {
        setIsAvailable(false);
        return;
      }

      setIsAvailable(true);
      setSuggestions(combos);
      setSelectedCombination(combos[0]);
    } catch (err) {
      console.error('Error searching combinations', err);
      setHasSearched(true);
      setIsAvailable(false);
      setBookingError('No se ha podido consultar la disponibilidad. Inténtalo de nuevo.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleContinueToCheckout = () => {
    if (!selectedCombination || !priceBreakdown) return;
    setShowCheckout(true);
    setBookingError(null);

    setTimeout(() => {
      checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const executePayment = async (form: CustomerFormData) => {
    if (!checkIn || !checkOut || !selectedCombination) return;

    setIsBooking(true);
    setBookingError(null);

    try {
      if (isMockMode) {
        throw new Error('La conexión con el servidor no está configurada. Contacta con el alojamiento.');
      }

      const { data: preReserva, error: preError } = await supabase.functions.invoke(
        'create-pre-reservation',
        {
          body: {
            checkIn: dateToISO(checkIn),
            checkOut: dateToISO(checkOut),
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
      );

      if (preError) {
        const msg =
          (preReserva as any)?.error ??
          preError.message ??
          'Error al crear la pre-reserva';
        throw new Error(msg);
      }

      const { data: checkout, error: checkoutError } = await supabase.functions.invoke(
        'create-stripe-checkout',
        {
          body: {
            reservaId: preReserva.reserva_id,
            appUrl: window.location.origin,
          },
        }
      );

      if (checkoutError) {
        const msg =
          (checkout as any)?.error ??
          checkoutError.message ??
          'Error al iniciar el pago';
        throw new Error(msg);
      }

      window.location.href = checkout.checkout_url;
    } catch (err: any) {
      console.error('Booking error', err);
      const msg = err?.message ?? '';

      if (msg.includes('disponible')) {
        setBookingError('Las fechas seleccionadas ya no están disponibles. Vuelve a buscar.');
      } else if (msg) {
        setBookingError(msg);
      } else {
        setBookingError('Ha ocurrido un error al procesar la reserva.');
      }

      setIsBooking(false);
    }
  };

  const handlePay = async (form: CustomerFormData) => {
    if (TEST_MODE) {
      setTestConfirmPending(form);
      return;
    }

    await executePayment(form);
  };

return (
  <div className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-6">
    <MetaTags
      title={`Reservar | ${property?.nombre ?? 'Reserva directa'}`}
      description="Reserva directa desde la web oficial. Combinaciones automáticas de unidades, mejor precio y pago seguro."
    />

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

    {TEST_MODE && (
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <FlaskConical size={16} className="shrink-0" />
        <span>
          <strong>Modo pruebas:</strong> reservas con Stripe TEST.
        </span>
      </div>
    )}

    <div className="mb-4">
      <h1 className="text-2xl font-bold text-stone-900 md:text-3xl">
        Reserva online
      </h1>
      <p className="mt-1 text-sm text-stone-500">
        Selecciona fechas, tamaño del grupo y elige la mejor combinación disponible.
      </p>
    </div>

    <div className="grid items-start gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <BookingSearchForm
        checkIn={checkIn}
        checkOut={checkOut}
        guests={guests}
        maxGuests={maxGuests}
        unitsCount={units.length}
        onGuestsChange={setGuests}
        onSearch={handleSearch}
        isValid={isValidSearch}
      />

      <AvailabilityCalendar
        selectedRange={{ start: checkIn, end: checkOut }}
        onSelectDate={handleSelectDate}
        availabilityByDate={availabilityByDate}
        mode={calendarMode}
        className="h-fit"
      />
    </div>

    <div className="mt-5 grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      {/* IZQUIERDA */}
      <div className="min-w-0 space-y-4">
        {hasSearched && isAvailable === false && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-800"
          >
            <AlertCircle size={20} />
            <div>
              <p className="font-semibold">No hay disponibilidad para ese grupo y fechas</p>
              <p className="text-sm">Prueba otro rango o reduce el número de huéspedes.</p>
            </div>
          </motion.div>
        )}

        {bookingError && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{bookingError}</span>
          </div>
        )}

        {hasSearched && isAvailable && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
              <CheckCircle2 size={18} />
              <p className="font-medium text-sm">
                Hay disponibilidad. Elige una opción para tu grupo.
              </p>
            </div>

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
                      <p className="text-xl font-bold text-stone-900">
                        {combo.precio_total.toFixed(2)}€
                      </p>
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
          </motion.div>
        )}

        {hasSearched && isAvailable && selectedCombination && priceBreakdown && !showCheckout && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
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

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-stone-500">Combinación seleccionada</span>
                <span className="text-right text-sm font-bold text-stone-900">
                  {selectedComboLabel}
                </span>
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
                onClick={handleContinueToCheckout}
                className="w-full rounded-xl bg-stone-900 py-3.5 text-sm font-bold text-white transition hover:bg-stone-800"
              >
                Continuar con la reserva
              </button>
            </div>
          </motion.div>
        )}

        {showCheckout && selectedCombination && priceBreakdown && checkIn && checkOut && (
          <motion.div
            ref={checkoutRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <BookingCheckoutSection
              checkIn={checkIn}
              checkOut={checkOut}
              guests={guests}
              rateType={rateType}
              breakdown={priceBreakdown}
              propertyName={property?.nombre}
              selectedCombinationLabel={selectedComboLabel}
              onRateChange={setRateType}
              onPay={handlePay}
              onBack={() => {
                setShowCheckout(false)
                setBookingError(null)
              }}
              isProcessing={isBooking}
            />
          </motion.div>
        )}
      </div>

      {/* DERECHA */}
      <div className="min-w-0">
        <div className="sticky top-6 space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-stone-900">Tu reserva</h3>

            <div className="space-y-3 text-sm text-stone-600">
              <div className="flex justify-between gap-4">
                <span>Entrada</span>
                <span className="font-medium text-stone-900">
                  {checkIn ? dateToISO(checkIn) : '—'}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span>Salida</span>
                <span className="font-medium text-stone-900">
                  {checkOut ? dateToISO(checkOut) : '—'}
                </span>
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

                {rateType === 'FLEXIBLE' && priceBreakdown.importe_senal !== null && (
                  <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    Señal ahora: <strong>{priceBreakdown.importe_senal.toFixed(2)}€</strong>
                  </div>
                )}
              </>
            )}

            {!priceBreakdown && (
              <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500">
                Selecciona fechas y consulta disponibilidad para ver el resumen real.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm text-sm text-stone-600">
            <div className="flex items-start gap-2">
              <Info size={16} className="mt-0.5 shrink-0 text-stone-400" />
              <p>
                El backend valida la disponibilidad y recalcula el precio antes de crear la reserva.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  )}

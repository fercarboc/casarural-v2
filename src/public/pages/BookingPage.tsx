import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { isBefore, isSameDay, parseISO, differenceInDays } from 'date-fns';
import { ShieldCheck, Info, AlertCircle, CheckCircle2, Calendar, Zap, CreditCard, FlaskConical, X } from 'lucide-react';

const TEST_MODE = (import.meta as any).env.VITE_BOOKING_TEST_MODE === 'true';

import { supabase, isMockMode } from '../../integrations/supabase/client';
import { AvailabilityCalendar } from '../components/AvailabilityCalendar';
import { BookingCheckoutSection, CustomerFormData } from '../components/BookingCheckoutSection';
import { bookingService } from '../../services/booking.service';
import { calendarService } from '../../services/calendar.service';
import { configService, AppConfig, getMinStayForDate } from '../../services/config.service';
import { RateType } from '../../shared/types';
import { PriceBreakdown } from '../../shared/types/booking';
import { MetaTags } from '../components/MetaTags';

export default function BookingPage() {
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [guests, setGuests] = useState(10);
  const [rateType, setRateType] = useState<RateType>('FLEXIBLE');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [flexibleBreakdown, setFlexibleBreakdown] = useState<PriceBreakdown | null>(null);
  const [nonRefundableBreakdown, setNonRefundableBreakdown] = useState<PriceBreakdown | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [occupiedDates, setOccupiedDates] = useState<Date[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const checkoutRef = useRef<HTMLDivElement>(null);
  // Modo test: guarda el form mientras se muestra el modal de confirmación
  const [testConfirmPending, setTestConfirmPending] = useState<CustomerFormData | null>(null);
  const [minStayWarning, setMinStayWarning] = useState<{ nights: number; nombre: string } | null>(null);

  const minStay = checkIn && appConfig
    ? getMinStayForDate(checkIn, appConfig)
    : { nights: 2, nombre: 'Temporada general' };

  useEffect(() => {
    calendarService.getOccupiedDates()
      .then(dates => setOccupiedDates(dates.map(d => parseISO(d))))
      .catch(console.error);
    configService.getConfig()
      .then(cfg => setAppConfig(cfg))
      .catch(console.error);
  }, []);

  const handleSelectDate = (date: Date) => {
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(date);
      setCheckOut(null);
      setHasSearched(false);
      setShowCheckout(false);
    } else if (checkIn && !checkOut) {
      if (isBefore(date, checkIn)) {
        setCheckIn(date);
      } else if (isSameDay(date, checkIn)) {
        setCheckIn(null);
      } else {
        const nights = differenceInDays(date, checkIn);
        if (appConfig) {
          const required = getMinStayForDate(checkIn, appConfig);
          if (nights < required.nights) {
            setMinStayWarning(required);
          }
        }
        setCheckOut(date);
      }
    }
  };

  const isValidSearch = checkIn !== null && checkOut !== null && guests >= 1 && guests <= 11;

  const handleSearch = async () => {
    if (!isValidSearch) return;
    setIsSearching(true);
    setShowCheckout(false);
    try {
      const availability = await bookingService.getAvailability(checkIn!, checkOut!);
      const allAvailable = availability.every(d => d.isAvailable);
      setIsAvailable(allAvailable);
      if (allAvailable) {
        setFlexibleBreakdown(bookingService.calculatePrice(checkIn!, checkOut!, guests, 'FLEXIBLE', appConfig?.pricing));
        setNonRefundableBreakdown(bookingService.calculatePrice(checkIn!, checkOut!, guests, 'NON_REFUNDABLE', appConfig?.pricing));
      }
    } catch (err) {
      console.error('Error checking availability', err);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  // Recalculate when guests change
  useEffect(() => {
    if (checkIn && checkOut && hasSearched && isAvailable) {
      setFlexibleBreakdown(bookingService.calculatePrice(checkIn, checkOut, guests, 'FLEXIBLE', appConfig?.pricing));
      setNonRefundableBreakdown(bookingService.calculatePrice(checkIn, checkOut, guests, 'NON_REFUNDABLE', appConfig?.pricing));
    }
  }, [guests, checkIn, checkOut, hasSearched, isAvailable, appConfig?.pricing]);

  const handleContinueToCheckout = () => {
    setShowCheckout(true);
    setTimeout(() => checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handlePay = async (form: CustomerFormData) => {
    // En modo test mostramos un modal de confirmación antes de redirigir a Stripe
    if (TEST_MODE) {
      setTestConfirmPending(form);
      return;
    }
    await executePayment(form);
  };

  const executePayment = async (form: CustomerFormData) => {
    if (!checkIn || !checkOut) return;
    setIsBooking(true);
    setBookingError(null);

    const fmt = (d: Date) => d.toISOString().split('T')[0]; // YYYY-MM-DD

    try {
      // Guard: si las variables de entorno no están, falla rápido con mensaje claro
      if (isMockMode) {
        throw new Error('La conexión con el servidor no está configurada. Contacta con el alojamiento.');
      }

      // PASO 1 — Crear pre-reserva (Edge Function)
      const { data: preReserva, error: preError } = await supabase.functions.invoke(
        'create-pre-reservation',
        {
          body: {
            checkIn:  fmt(checkIn),
            checkOut: fmt(checkOut),
            guests,
            rateType,
            menores: form.menores ?? 0,
            guestData: {
              nombre:    form.nombre,
              apellidos: form.apellidos,
              email:     form.email,
              telefono:  form.telefono,
              dni:       form.numero_documento ?? '',
            },
          },
        }
      );

      if (preError) {
        // FunctionsHttpError incluye el body de la función como context
        const msg = (preReserva as any)?.error ?? preError.message ?? 'Error al crear la reserva';
        throw new Error(msg);
      }

      // PASO 2 — Crear sesión de Stripe
      const { data: checkout, error: checkoutError } = await supabase.functions.invoke(
        'create-stripe-checkout',
        { body: { reservaId: preReserva.reserva_id } }
      );

      if (checkoutError) {
        const msg = (checkout as any)?.error ?? checkoutError.message ?? 'Error al iniciar el pago';
        throw new Error(msg);
      }

      // PASO 3 — Redirigir a Stripe Checkout
      window.location.href = checkout.checkout_url;
      // No resetear isBooking: el navegador está redirigiendo

    } catch (err: any) {
      console.error('Booking error', err);
      const msg: string = err?.message ?? '';
      if (msg.includes('no están disponibles') || msg.includes('disponibles')) {
        setBookingError('Las fechas seleccionadas ya no están disponibles. Por favor elige otras fechas.');
      } else if (msg.includes('estancia mínima') || msg.includes('mínima') || msg.includes('huéspedes')) {
        setBookingError(msg);
      } else if (msg) {
        setBookingError(msg);
      } else {
        setBookingError('Ha ocurrido un error al procesar tu reserva. Por favor inténtalo de nuevo.');
      }
      setIsBooking(false);
    }
  };

  // ── Página principal ──────────────────────────────────────
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <MetaTags
        title="Reservar | Mejor precio garantizado casa rural Cantabria | La Rasilla"
        description="Reserva tu estancia en La Rasilla directamente desde nuestra web. Sin comisiones, mejor precio garantizado y confirmación inmediata."
      />

      {/* Modal aviso estancia mínima */}
      {minStayWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 text-amber-700">
                <Info size={20} />
                <span className="font-bold text-base">Estancia mínima requerida</span>
              </div>
              <button onClick={() => setMinStayWarning(null)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-stone-600 mb-4">
              Durante <strong>{minStayWarning.nombre}</strong> la estancia mínima es de{' '}
              <strong>{minStayWarning.nights} noches</strong>. Las fechas seleccionadas no cumplen este requisito.
            </p>
            <p className="text-sm text-stone-500 mb-5">
              Ajusta las fechas de salida para cumplir con la estancia mínima.
            </p>
            <button
              onClick={() => setMinStayWarning(null)}
              className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white hover:bg-amber-600 transition-colors"
            >
              Entendido, cambiaré las fechas
            </button>
          </div>
        </div>
      )}

      {/* Modal de confirmación modo test */}
      {TEST_MODE && testConfirmPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 text-amber-700">
                <FlaskConical size={20} />
                <span className="font-bold text-base">Modo pruebas activo</span>
              </div>
              <button onClick={() => setTestConfirmPending(null)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-stone-600 mb-2">
              Estás a punto de iniciar un pago de <strong>prueba</strong> con Stripe TEST.
            </p>
            <ul className="text-sm text-stone-500 space-y-1 mb-5 list-disc list-inside">
              <li>No se realizará ningún cargo real</li>
              <li>Usa la tarjeta de test: <code className="bg-stone-100 px-1 rounded">4242 4242 4242 4242</code></li>
              <li>Cualquier fecha futura y CVV de 3 dígitos</li>
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => setTestConfirmPending(null)}
                className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { const f = testConfirmPending; setTestConfirmPending(null); executePayment(f); }}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white hover:bg-amber-600 transition-colors"
              >
                Continuar con el test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner modo test */}
      {TEST_MODE && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <FlaskConical size={16} className="shrink-0" />
          <span><strong>Modo pruebas:</strong> Las reservas usan Stripe TEST. No se realizarán cargos reales.</span>
        </div>
      )}

      <header className="mb-10 text-center">
        <h1 className="text-4xl font-serif font-bold text-stone-800 md:text-5xl">Reserva tu estancia en La Rasilla</h1>
        <p className="mt-4 text-lg text-stone-500 max-w-2xl mx-auto">
          <strong>Casa rural de alquiler íntegro</strong> · Hasta 11 personas · Reserva directa sin intermediarios
        </p>
      </header>

      {/* ── Búsqueda + Calendario ─────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-12">

        <div className="lg:col-span-7 space-y-6">

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <ShieldCheck className="text-emerald-600 shrink-0" size={18} />
              <span className="text-xs font-medium text-emerald-900">Mejor precio</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <Zap className="text-emerald-600 shrink-0" size={18} />
              <span className="text-xs font-medium text-emerald-900">Confirmación inmediata</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <CreditCard className="text-emerald-600 shrink-0" size={18} />
              <span className="text-xs font-medium text-emerald-900">Pago 100% seguro</span>
            </div>
          </div>

          {/* Formulario fechas */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-stone-400">
                  <Calendar size={12} /> Entrada
                </label>
                <div className={`rounded-xl border px-3 py-3 text-sm font-medium ${checkIn ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-stone-200 bg-stone-50 text-stone-400'}`}>
                  {checkIn ? checkIn.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '↓ Calendario'}
                </div>
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-stone-400">
                  <Calendar size={12} /> Salida
                </label>
                <div className={`rounded-xl border px-3 py-3 text-sm font-medium ${checkOut ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-stone-200 bg-stone-50 text-stone-400'}`}>
                  {checkOut ? checkOut.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '↓ Calendario'}
                </div>
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-stone-400">
                  Huéspedes
                </label>
                <select
                  value={guests}
                  onChange={e => setGuests(parseInt(e.target.value))}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm font-medium text-stone-700 focus:border-emerald-500 focus:outline-none"
                >
                  {[...Array(11)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? 'persona' : 'personas'}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm border ${checkIn ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-stone-50 border-stone-200 text-stone-500'}`}>
              <Info size={15} className="shrink-0" />
              <span><strong>Estancia mínima: {minStay.nights} noches</strong> · {minStay.nombre}</span>
            </div>

            <button
              disabled={!isValidSearch || isSearching}
              onClick={handleSearch}
              className="w-full rounded-xl bg-emerald-700 py-4 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-800 hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSearching
                ? <span className="flex items-center justify-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Consultando...</span>
                : 'Consultar Disponibilidad'}
            </button>
          </div>

          {/* No disponible */}
          {hasSearched && isAvailable === false && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-2xl bg-red-50 p-5 text-red-800 border border-red-100">
              <AlertCircle size={22} />
              <div>
                <p className="font-bold">Fechas no disponibles</p>
                <p className="text-sm">Algunas fechas ya están ocupadas. Prueba con otro rango en el calendario.</p>
              </div>
            </motion.div>
          )}

          {/* Disponible: tarifas */}
          {hasSearched && isAvailable && flexibleBreakdown && nonRefundableBreakdown && checkIn && checkOut && !showCheckout && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

              <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-emerald-800 border border-emerald-200">
                <CheckCircle2 size={20} />
                <p className="font-medium text-sm">¡La casa está disponible para tus fechas! Selecciona una tarifa.</p>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {/* Flexible */}
                <button onClick={() => setRateType('FLEXIBLE')}
                  className={`rounded-2xl border-2 p-5 text-left transition-all space-y-4 ${rateType === 'FLEXIBLE' ? 'border-emerald-600 bg-emerald-50 ring-4 ring-emerald-600/10' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Tarifa Flexible</p>
                      <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{flexibleBreakdown.total.toFixed(2)}€</p>
                    </div>
                    {rateType === 'FLEXIBLE' && <CheckCircle2 size={20} className="text-emerald-600" />}
                  </div>
                  <div className="space-y-1 text-xs text-stone-500 border-t border-stone-200 pt-3">
                    <div className="flex justify-between"><span>{flexibleBreakdown.nights} noches × {flexibleBreakdown.nightlyPrice.toFixed(0)}€</span><span>{flexibleBreakdown.accommodationTotal.toFixed(2)}€</span></div>
                    <div className="flex justify-between"><span>Gastos de limpieza</span><span>{flexibleBreakdown.cleaningFee.toFixed(2)}€</span></div>
                    {flexibleBreakdown.extraGuestsTotal > 0 && <div className="flex justify-between"><span>Suplemento huéspedes</span><span>{flexibleBreakdown.extraGuestsTotal.toFixed(2)}€</span></div>}
                    <div className="flex justify-between font-bold text-stone-800 text-sm pt-1 border-t border-stone-200"><span>Total</span><span>{flexibleBreakdown.total.toFixed(2)}€</span></div>
                    <div className="flex justify-between text-emerald-700 font-medium"><span>Señal ahora ({Math.round(flexibleBreakdown.depositRequired / flexibleBreakdown.total * 100)}%)</span><span>{flexibleBreakdown.depositRequired.toFixed(2)}€</span></div>
                  </div>
                  <p className="text-[10px] text-stone-400">Cancela gratis hasta 60 días antes de la entrada.</p>
                </button>

                {/* No Reembolsable */}
                <button onClick={() => setRateType('NON_REFUNDABLE')}
                  className={`rounded-2xl border-2 p-5 text-left transition-all space-y-4 ${rateType === 'NON_REFUNDABLE' ? 'border-emerald-600 bg-emerald-50 ring-4 ring-emerald-600/10' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-stone-500">No Reembolsable</p>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">−10%</span>
                      </div>
                      <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{nonRefundableBreakdown.total.toFixed(2)}€</p>
                    </div>
                    {rateType === 'NON_REFUNDABLE' && <CheckCircle2 size={20} className="text-emerald-600" />}
                  </div>
                  <div className="space-y-1 text-xs text-stone-500 border-t border-stone-200 pt-3">
                    <div className="flex justify-between"><span>{nonRefundableBreakdown.nights} noches × {nonRefundableBreakdown.nightlyPrice.toFixed(0)}€</span><span>{nonRefundableBreakdown.accommodationTotal.toFixed(2)}€</span></div>
                    <div className="flex justify-between"><span>Gastos de limpieza</span><span>{nonRefundableBreakdown.cleaningFee.toFixed(2)}€</span></div>
                    {nonRefundableBreakdown.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Descuento 10%</span><span>−{nonRefundableBreakdown.discount.toFixed(2)}€</span></div>}
                    <div className="flex justify-between font-bold text-stone-800 text-sm pt-1 border-t border-stone-200"><span>Total</span><span>{nonRefundableBreakdown.total.toFixed(2)}€</span></div>
                    <div className="flex justify-between text-stone-600 font-medium"><span>Pago completo al reservar</span><span>{nonRefundableBreakdown.total.toFixed(2)}€</span></div>
                  </div>
                  <p className="text-[10px] text-stone-400">Sin posibilidad de cancelación ni cambios.</p>
                </button>
              </div>

              {/* Continuar */}
              <button
                onClick={handleContinueToCheckout}
                className="w-full rounded-xl bg-stone-900 py-5 text-base font-bold text-white shadow-xl transition-all hover:bg-stone-800 hover:scale-[1.01] active:scale-[0.99]"
              >
                Continuar con la reserva →
              </button>

              {/* Política de cancelación */}
              <div className="rounded-2xl border border-stone-200 bg-white p-6">
                <h3 className="flex items-center gap-2 text-base font-bold text-stone-800 mb-4">
                  <Info size={16} className="text-emerald-700" /> Política de cancelación
                </h3>
                <div className="grid gap-6 md:grid-cols-2 text-sm">
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Tarifa Flexible</p>
                    <div className="flex justify-between"><span className="text-stone-600">60 días o más</span><span className="font-bold text-emerald-700">100% Reembolso</span></div>
                    <div className="flex justify-between"><span className="text-stone-600">45 a 59 días</span><span className="font-bold text-stone-700">50% Reembolso</span></div>
                    <div className="flex justify-between"><span className="text-stone-600">30 a 44 días</span><span className="font-bold text-stone-700">25% Reembolso</span></div>
                    <div className="flex justify-between"><span className="text-stone-600">Menos de 30 días</span><span className="font-bold text-red-600">Sin reembolso</span></div>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">No Reembolsable</p>
                    <p className="text-stone-600 leading-relaxed">No admite devoluciones ni cambios bajo ninguna circunstancia. El 100% se cobra al reservar.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* ── RIGHT: Calendario (sticky, oculto en checkout) ── */}
        {!showCheckout && (
          <div className="lg:col-span-5">
            <div className="sticky top-6 space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <Info size={15} className="shrink-0" />
                <span>Selecciona las fechas de llegada y salida · Mínimo <strong>{minStay.nights} noches</strong></span>
              </div>
              <AvailabilityCalendar
                selectedRange={{ start: checkIn, end: checkOut }}
                onSelectDate={handleSelectDate}
                occupiedDates={occupiedDates}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── CHECKOUT: ancho completo ─────────────────────── */}
      {showCheckout && flexibleBreakdown && nonRefundableBreakdown && checkIn && checkOut && (
        <motion.div
          ref={checkoutRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <BookingCheckoutSection
            checkIn={checkIn}
            checkOut={checkOut}
            guests={guests}
            rateType={rateType}
            flexibleBreakdown={flexibleBreakdown}
            nonRefundableBreakdown={nonRefundableBreakdown}
            onRateChange={setRateType}
            onPay={handlePay}
            onBack={() => { setShowCheckout(false); setBookingError(null); }}
            isProcessing={isBooking}
          />
          {bookingError && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{bookingError}</span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function Row({ label, value, bold, className }: { label: string; value: string; bold?: boolean; className?: string }) {
  return (
    <div className={`flex justify-between ${className ?? ''}`}>
      <span className="text-stone-500">{label}</span>
      <span className={bold ? 'font-bold text-stone-900' : 'text-stone-700'}>{value}</span>
    </div>
  );
}

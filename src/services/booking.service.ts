import { AvailabilityDay, PriceBreakdown, BookingRequest } from '../shared/types/booking';
import { RateType, Reservation } from '../shared/types';
import { addDays, format, isBefore, isSameDay, differenceInDays, parseISO } from 'date-fns';
import { isMockMode, supabase } from '../integrations/supabase/client';
import { createMockReservation, getMockReservations, updateMockReservation, deleteMockReservation } from './booking.mock';
import { calendarService } from './calendar.service';
import { PricingConfig } from './config.service';

/** Mapea una fila de Supabase al tipo Reservation del frontend */
function mapReserva(r: any): Reservation {
  return {
    id: r.id,
    created_at: r.created_at,
    check_in: r.fecha_entrada,
    check_out: r.fecha_salida,
    guests_count: r.num_huespedes,
    total_price: r.total,
    status: r.estado,
    payment_status: r.estado_pago,
    origin: r.origen,
    rate_type: r.tarifa,
    customer_name: `${r.nombre} ${r.apellidos}`,
    customer_email: r.email,
    customer_phone: r.telefono,
    stripe_session_id: r.stripe_session_id,
  };
}

export interface ReservaPublica {
  id: string
  codigo: string
  nombre: string
  apellidos: string
  email: string
  telefono: string
  fecha_entrada: string
  fecha_salida: string
  noches: number
  num_huespedes: number
  tarifa: 'FLEXIBLE' | 'NO_REEMBOLSABLE'
  temporada: 'ALTA' | 'BASE'
  total: number
  importe_senal: number | null
  importe_pagado: number
  estado: string
  estado_pago: string
  token_cliente: string
  solicitud_cambio: string | null
}

export async function getReservaByToken(token: string): Promise<ReservaPublica | null> {
  const { data, error } = await supabase
    .from('reservas')
    .select('id, codigo, nombre, apellidos, email, telefono, fecha_entrada, fecha_salida, noches, num_huespedes, tarifa, temporada, total, importe_senal, importe_pagado, estado, estado_pago, token_cliente, solicitud_cambio')
    .eq('token_cliente', token)
    .single()

  if (error || !data) return null
  return data as ReservaPublica
}

export const bookingService = {

  async getReservations(): Promise<Reservation[]> {
    if (isMockMode) return getMockReservations() as any;

    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapReserva);
  },

  async getReservationById(id: string): Promise<Reservation | undefined> {
    if (isMockMode) {
      const list = await getMockReservations();
      return list.find(r => r.id === id) as any;
    }

    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return undefined;
    return mapReserva(data);
  },

  async updateReservation(id: string, updates: Partial<{
    estado: string;
    estado_pago: string;
    notas_admin: string;
    fecha_entrada: string;
    fecha_salida: string;
    num_huespedes: number;
    total: number;
  }>) {
    if (isMockMode) return updateMockReservation(id, updates);

    const { data, error } = await supabase
      .from('reservas')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapReserva(data);
  },

  async deleteReservation(id: string) {
    if (isMockMode) return deleteMockReservation(id);

    const { error } = await supabase
      .from('reservas')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async getAvailability(start: Date, end: Date): Promise<AvailabilityDay[]> {
    // Obtener fechas ocupadas (Supabase o mock según modo)
    const occupiedStrs = await calendarService.getOccupiedDates();
    const occupiedDates = occupiedStrs.map(d => parseISO(d));

    // Temporadas altas: julio y agosto
    const isHighSeason = (date: Date) =>
      date.getMonth() === 6 || date.getMonth() === 7;

    const days: AvailabilityDay[] = [];
    let current = new Date(start);

    while (isBefore(current, end) || isSameDay(current, end)) {
      const dateStr = format(current, 'yyyy-MM-dd');
      const isOccupied = occupiedDates.some(d => isSameDay(d, current));
      const highSeason = isHighSeason(current);

      days.push({
        date: dateStr,
        isAvailable: !isOccupied,
        price: highSeason ? 300 : 275,
        isHighSeason: highSeason,
      });
      current = addDays(current, 1);
    }

    return days;
  },

  calculatePrice(checkIn: Date, checkOut: Date, guests: number, rateType: RateType, cfg?: PricingConfig | null): PriceBreakdown {
    const nights = Math.max(0, differenceInDays(checkOut, checkIn));
    const isHighSeason = checkIn.getMonth() === 6 || checkIn.getMonth() === 7;
    const nightlyPrice          = isHighSeason ? (cfg?.precio_noche_alta   ?? 330) : (cfg?.precio_noche_base   ?? 300);
    const extraGuestFeePerNight = isHighSeason ? (cfg?.extra_huesped_alta  ?? 30)  : (cfg?.extra_huesped_base  ?? 30);
    const cleaningFee           = cfg?.limpieza                    ?? 60;
    const discountPct           = (cfg?.descuento_no_reembolsable  ?? 10) / 100;
    const depositPct            = (cfg?.porcentaje_senal           ?? 50) / 100;

    const accommodationTotal = nightlyPrice * nights;
    const extraGuestsCount   = guests === 11 ? 1 : 0;
    const extraGuestsTotal   = extraGuestsCount * extraGuestFeePerNight * nights;

    const discount = rateType === 'NON_REFUNDABLE' ? accommodationTotal * discountPct : 0;
    const total    = accommodationTotal + extraGuestsTotal + cleaningFee - discount;
    const depositRequired = rateType === 'FLEXIBLE' ? total * depositPct : total;

    return { nights, nightlyPrice, accommodationTotal, extraGuestFee: extraGuestFeePerNight, extraGuestsTotal, cleaningFee, discount, total, depositRequired };
  },

  async createReservation(request: BookingRequest): Promise<{ id: string; token: string; stripeUrl: string }> {
    if (isMockMode) {
      const res = await createMockReservation({
        guestName: request.customerName,
        email: request.customerEmail,
        phone: request.customerPhone,
        checkIn: request.checkIn.split('T')[0],
        checkOut: request.checkOut.split('T')[0],
        guests: request.guests,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        total: request.total,
        source: 'DIRECT_WEB',
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: res.id, token: 'mock-token', stripeUrl: '/reservar/confirmacion?id=' + res.id };
    }

    // Calcular precio de nuevo para evitar manipulación del cliente
    const checkIn = parseISO(request.checkIn);
    const checkOut = parseISO(request.checkOut);
    const precio = this.calculatePrice(checkIn, checkOut, request.guests, request.rateType as RateType);

    const isHighSeason = checkIn.getMonth() === 6 || checkIn.getMonth() === 7;
    const nombreParts = request.customerName.trim().split(' ');
    const nombre = nombreParts[0];
    const apellidos = nombreParts.slice(1).join(' ') || '-';

    // Expirar en 30 minutos si no se paga
    const expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('reservas')
      .insert({
        nombre,
        apellidos,
        email: request.customerEmail,
        telefono: request.customerPhone,
        dni: request.customerDni ?? null,
        fecha_entrada: request.checkIn.split('T')[0],
        fecha_salida: request.checkOut.split('T')[0],
        num_huespedes: request.guests,
        menores: request.menores ?? 0,
        temporada: isHighSeason ? 'ALTA' : 'BASE',
        tarifa: request.rateType === 'NON_REFUNDABLE' ? 'NO_REEMBOLSABLE' : 'FLEXIBLE',
        precio_noche: precio.nightlyPrice,
        noches: precio.nights,
        importe_alojamiento: precio.accommodationTotal,
        importe_extra: precio.extraGuestsTotal,
        importe_limpieza: precio.cleaningFee,
        descuento: precio.discount,
        total: precio.total,
        importe_senal: request.rateType === 'FLEXIBLE' ? precio.depositRequired : null,
        estado: 'PENDING_PAYMENT',
        estado_pago: 'UNPAID',
        origen: 'DIRECT_WEB',
        expires_at,
      })
      .select('id, token_cliente')
      .single();

    if (error) throw error;

    // Llamar a la Edge Function de Stripe para crear la sesión de checkout
    const { data: checkout, error: checkoutError } = await supabase.functions.invoke('create-stripe-checkout', {
      body: { reservaId: data.id },
    });

    if (checkoutError) throw new Error(`Error al crear el pago: ${checkoutError.message}`);
    if (!checkout?.checkout_url) throw new Error('No se recibió URL de pago de Stripe');

    return {
      id: data.id,
      token: data.token_cliente,
      stripeUrl: checkout.checkout_url,
    };
  },
};

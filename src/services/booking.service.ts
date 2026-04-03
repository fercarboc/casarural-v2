import { AvailabilityDay, PriceBreakdown, BookingRequest } from '../shared/types/booking';
import { RateType, Reservation } from '../shared/types';
import { addDays, format, isBefore, isSameDay, differenceInDays, parseISO } from 'date-fns';
import { isMockMode, supabase } from '../integrations/supabase/client';
import { createMockReservation, getMockReservations, updateMockReservation, deleteMockReservation } from './booking.mock';
import { calendarService } from './calendar.service';
import { PricingConfig } from './config.service';

/** Mapea una fila de Supabase (v2) al tipo Reservation del frontend */
function mapReserva(r: any): Reservation {
  return {
    id:               r.id,
    created_at:       r.created_at,
    check_in:         r.fecha_entrada,
    check_out:        r.fecha_salida,
    guests_count:     r.num_huespedes,
    total_price:      r.importe_total,
    status:           r.estado,
    payment_status:   r.estado_pago,
    origin:           r.origen,
    rate_type:        r.tarifa,
    customer_name:    `${r.nombre_cliente ?? ''} ${r.apellidos_cliente ?? ''}`.trim(),
    customer_email:   r.email_cliente,
    customer_phone:   r.telefono_cliente,
    stripe_session_id: r.stripe_session_id,
  };
}

export interface ReservaPublica {
  id: string;
  nombre_cliente: string;
  apellidos_cliente: string;
  email_cliente: string;
  telefono_cliente: string | null;
  fecha_entrada: string;
  fecha_salida: string;
  noches: number;
  num_huespedes: number;
  tarifa: 'FLEXIBLE' | 'NO_REEMBOLSABLE';
  importe_total: number;
  importe_senal: number | null;
  importe_resto: number | null;
  estado: string;
  estado_pago: string;
  token_cliente: string;
  // Alias de compatibilidad con páginas públicas
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string | null;
  total: number;
  importe_pagado: number;
  codigo: string | null;
  solicitud_cambio: string | null;
}

export async function getReservaByToken(token: string): Promise<ReservaPublica | null> {
  const { data, error } = await supabase
    .from('reservas')
    .select('id, nombre_cliente, apellidos_cliente, email_cliente, telefono_cliente, fecha_entrada, fecha_salida, noches, num_huespedes, tarifa, importe_total, importe_senal, importe_resto, importe_alojamiento, estado, estado_pago, token_cliente, notas_cliente')
    .eq('token_cliente', token)
    .single();

  if (error || !data) return null;

  return {
    ...data,
    nombre:           data.nombre_cliente,
    apellidos:        data.apellidos_cliente,
    email:            data.email_cliente,
    telefono:         data.telefono_cliente,
    total:            data.importe_total,
    importe_pagado:   0,   // se calculará desde pagos si se necesita
    codigo:           null,
    solicitud_cambio: null,
  } as ReservaPublica;
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
    importe_total: number;
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

  async getAvailability(start: Date, end: Date, unidad_id?: string): Promise<AvailabilityDay[]> {
    const occupiedStrs = await calendarService.getOccupiedDates(unidad_id);
    const occupiedDates = occupiedStrs.map(d => parseISO(d));

    const days: AvailabilityDay[] = [];
    let current = new Date(start);

    while (isBefore(current, end) || isSameDay(current, end)) {
      const dateStr = format(current, 'yyyy-MM-dd');
      const isOccupied = occupiedDates.some(d => isSameDay(d, current));

      days.push({
        date: dateStr,
        isAvailable: !isOccupied,
        price: 300,
        isHighSeason: false,
      });
      current = addDays(current, 1);
    }

    return days;
  },

  calculatePrice(checkIn: Date, checkOut: Date, guests: number, rateType: RateType, cfg?: PricingConfig | null): PriceBreakdown {
    const nights        = Math.max(0, differenceInDays(checkOut, checkIn));
    const nightlyPrice           = cfg?.precio_noche_base        ?? 300;
    const extraGuestFeePerNight  = cfg?.extra_huesped_base        ?? 30;
    const cleaningFee            = cfg?.limpieza                  ?? 60;
    const discountPct            = (cfg?.descuento_no_reembolsable ?? 10)  / 100;
    const depositPct             = (cfg?.porcentaje_senal          ?? 30)  / 100;
    const capacidadBase          = cfg?.capacidad_base             ?? 10;

    const accommodationTotal = nightlyPrice * nights;
    const extraGuestsCount   = Math.max(0, guests - capacidadBase);
    const extraGuestsTotal   = extraGuestsCount * extraGuestFeePerNight * nights;

    const discount        = rateType === 'NON_REFUNDABLE' ? accommodationTotal * discountPct : 0;
    const total           = accommodationTotal + extraGuestsTotal + cleaningFee - discount;
    const depositRequired = rateType === 'FLEXIBLE' ? total * depositPct : total;

    return { nights, nightlyPrice, accommodationTotal, extraGuestFee: extraGuestFeePerNight, extraGuestsTotal, cleaningFee, discount, total, depositRequired };
  },

  /**
   * Crea una reserva llamando a la Edge Function create-pre-reservation (v2).
   * Requiere property_id y unidades (al menos una).
   */
  async createReservation(request: BookingRequest & {
    property_id: string;
    unidades: { unidad_id: string; num_huespedes: number }[];
  }): Promise<{ id: string; token: string; stripeUrl: string }> {
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

    const nameParts = request.customerName.trim().split(' ');

    // 1. Crear pre-reserva con la Edge Function (valida disponibilidad + calcula precio)
    const { data: preReserva, error: preError } = await supabase.functions.invoke('create-pre-reservation', {
      body: {
        checkIn:     request.checkIn.split('T')[0],
        checkOut:    request.checkOut.split('T')[0],
        rateType:    request.rateType,
        property_id: request.property_id,
        unidades:    request.unidades,
        guestData: {
          nombre_cliente:    nameParts[0],
          apellidos_cliente: nameParts.slice(1).join(' ') || '',
          email_cliente:     request.customerEmail,
          telefono_cliente:  request.customerPhone ?? '',
          nif_cliente:       request.customerDni   ?? '',
        },
      },
    });

    if (preError) throw new Error(preReserva?.error ?? preError.message ?? 'Error al crear la reserva');

    // 2. Crear sesión de Stripe
    const { data: checkout, error: checkoutError } = await supabase.functions.invoke('create-stripe-checkout', {
      body: { reservaId: preReserva.reserva_id },
    });

    if (checkoutError) throw new Error(`Error al crear el pago: ${checkoutError.message}`);
    if (!checkout?.checkout_url) throw new Error('No se recibió URL de pago de Stripe');

    return {
      id:        preReserva.reserva_id,
      token:     preReserva.token_cliente,
      stripeUrl: checkout.checkout_url,
    };
  },
};

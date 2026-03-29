/**
 * Tipos base para el sistema de reservas de La Rasilla
 */

export type ReservationStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'NO_SHOW';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';
export type ReservationOrigin = 'DIRECT_WEB' | 'BOOKING_ICAL' | 'AIRBNB_ICAL' | 'ESCAPADARURAL_ICAL' | 'ADMIN';
export type RateType = 'FLEXIBLE' | 'NON_REFUNDABLE';

export interface PropertyConfig {
  id: string;
  name: string;
  base_price: number;
  extra_guest_price: number;
  cleaning_fee: number;
  min_stay: number;
  max_guests: number;
  base_guests: number;
}

export interface Reservation {
  id: string;
  created_at: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_price: number;
  status: ReservationStatus;
  payment_status: PaymentStatus;
  origin: ReservationOrigin;
  rate_type: RateType;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  stripe_session_id?: string;
}

export interface PriceBreakdown {
  nights: number;
  nightlyPrice: number;
  accommodationTotal: number;
  extraGuestsTotal: number;
  cleaningFee: number;
  discount: number;
  total: number;
  depositRequired: number;
}

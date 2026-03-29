import { RateType, ReservationStatus, PaymentStatus, ReservationOrigin } from './index';

export interface BookingState {
  checkIn: Date | null;
  checkOut: Date | null;
  guests: number;
  rateType: RateType;
}

export interface PriceBreakdown {
  nights: number;
  nightlyPrice: number;
  accommodationTotal: number;
  extraGuestFee: number;
  extraGuestsTotal: number;
  cleaningFee: number;
  discount: number;
  total: number;
  depositRequired: number;
}

export interface AvailabilityDay {
  date: string; // ISO string
  isAvailable: boolean;
  price?: number;
  isHighSeason?: boolean;
}

export interface BookingRequest {
  checkIn: string;
  checkOut: string;
  guests: number;
  menores: number;
  rateType: RateType;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDni?: string;
  total: number;
}

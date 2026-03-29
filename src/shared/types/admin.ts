export type ReservationStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'NO_SHOW';
export type PaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'REFUNDED';
export type RateType = 'FLEXIBLE' | 'NON_REFUNDABLE';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

export interface Reservation {
  id: string;
  customerId: string;
  customer?: Customer;
  checkIn: string;
  checkOut: string;
  guests: number;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  rateType: RateType;
  totalPrice: number;
  paidAmount: number;
  origin: 'WEB' | 'BOOKING' | 'AIRBNB' | 'MANUAL';
  createdAt: string;
  notes?: string;
}

export interface Payment {
  id: string;
  reservationId: string;
  amount: number;
  method: 'STRIPE' | 'CASH' | 'TRANSFER';
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  createdAt: string;
}

export interface Invoice {
  id: string;
  reservationId: string;
  number: string;
  amount: number;
  status: 'ISSUED' | 'PAID' | 'CANCELLED';
  createdAt: string;
  pdfUrl?: string;
}

export interface Block {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: string;
}

export interface ICalFeed {
  id: string;
  name: string;
  url: string;
  lastSync: string;
  status: 'OK' | 'ERROR';
}

export interface AdminConfig {
  basePrice: number;
  highSeasonPrice: number;
  extraGuestPrice: number;
  cleaningFee: number;
  minStay: number;
  maxGuests: number;
}

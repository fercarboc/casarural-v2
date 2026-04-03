export interface Reservation {
  id: string;
  guestName: string;
  email: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'BLOCKED';
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  total: number;
  source: 'DIRECT_WEB' | 'BOOKING' | 'AIRBNB' | 'MANUAL';
  createdAt: string;
}

const MOCK_RESERVATIONS: Reservation[] = [
  {
    id: "res_1",
    guestName: "Carlos García",
    email: "carlos@email.com",
    phone: "600123123",
    checkIn: "2026-06-10",
    checkOut: "2026-06-15",
    guests: 10,
    status: "CONFIRMED",
    paymentStatus: "PAID",
    total: 1375,
    source: "DIRECT_WEB",
    createdAt: "2026-03-01T10:00:00Z"
  },
  {
    id: "res_2",
    guestName: "Laura Fernández",
    email: "laura@email.com",
    phone: "611222333",
    checkIn: "2026-06-20",
    checkOut: "2026-06-25",
    guests: 11,
    status: "PENDING",
    paymentStatus: "PARTIAL",
    total: 1500,
    source: "DIRECT_WEB",
    createdAt: "2026-03-15T12:00:00Z"
  },
  {
    id: "res_3",
    guestName: "Bloqueo Mantenimiento",
    email: "",
    phone: "",
    checkIn: "2026-06-01",
    checkOut: "2026-06-03",
    guests: 0,
    status: "BLOCKED",
    paymentStatus: "UNPAID",
    total: 0,
    source: "MANUAL",
    createdAt: "2026-03-10T08:00:00Z"
  }
];

// In-memory store for mock mode with localStorage persistence
const getStoredReservations = (): Reservation[] => {
  const stored = localStorage.getItem('mock_reservations');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error parsing mock_reservations", e);
    }
  }
  return MOCK_RESERVATIONS;
};

const saveStoredReservations = (reservations: Reservation[]) => {
  localStorage.setItem('mock_reservations', JSON.stringify(reservations));
};

let localReservations = getStoredReservations();

export const getMockReservations = async () => {
  return new Promise<Reservation[]>((resolve) => {
    setTimeout(() => resolve(localReservations), 500);
  });
};

export const createMockReservation = async (data: Omit<Reservation, 'id' | 'createdAt'>) => {
  const newRes: Reservation = {
    ...data,
    id: "res_" + Math.random().toString(36).substr(2, 9),
    createdAt: new Date().toISOString()
  };
  localReservations = [newRes, ...localReservations];
  saveStoredReservations(localReservations);
  return newRes;
};

export const updateMockReservation = async (id: string, data: Record<string, any>) => {
  localReservations = localReservations.map(res => 
    res.id === id ? { ...res, ...data } : res
  );
  saveStoredReservations(localReservations);
  return localReservations.find(res => res.id === id);
};

export const deleteMockReservation = async (id: string) => {
  localReservations = localReservations.filter(res => res.id !== id);
  saveStoredReservations(localReservations);
  return true;
};

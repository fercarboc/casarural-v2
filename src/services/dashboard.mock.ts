export const getMockDashboardStats = async () => {
  await new Promise(r => setTimeout(r, 300));
  return {
    monthlyReservations: 4,
    monthlyRevenue:      5400,
    yearlyRevenue:       18200,
    pendingPayments:     1,
    cancellations:       0,
    consultasNuevas:     2,
    ocupacionMes:        62,

    enCasaAhora: [
      { id: 'ec1', guestName: 'Familia Martínez', checkIn: '2026-03-20', checkOut: '2026-03-25', guests: 9, status: 'CONFIRMED' },
    ],
    checkinHoy:  [],
    checkoutHoy: [],

    upcomingCheckins: [
      { id: 'm1', guestName: 'Carlos García',    checkIn: '2026-04-05', checkOut: '2026-04-08', guests: 10, status: 'CONFIRMED',       origen: 'DIRECT_WEB' },
      { id: 'm2', guestName: 'Laura Fernández',  checkIn: '2026-04-12', checkOut: '2026-04-17', guests: 11, status: 'PENDING_PAYMENT', origen: 'DIRECT_WEB' },
      { id: 'm3', guestName: 'Familia Rodríguez',checkIn: '2026-04-19', checkOut: '2026-04-22', guests: 8,  status: 'CONFIRMED',       origen: 'BOOKING_ICAL' },
    ],

    actividadReciente: [
      { id: 'a1', codigo: 'RES-0042', guestName: 'Carlos García',    checkIn: '2026-04-05', checkOut: '2026-04-08', total: 1375, estado: 'CONFIRMED',       estadoPago: 'PAID',    createdAt: '2026-03-22T10:00:00Z' },
      { id: 'a2', codigo: 'RES-0041', guestName: 'Laura Fernández',  checkIn: '2026-04-12', checkOut: '2026-04-17', total: 1650, estado: 'PENDING_PAYMENT', estadoPago: 'UNPAID',  createdAt: '2026-03-21T17:30:00Z' },
      { id: 'a3', codigo: 'RES-0040', guestName: 'Familia Rodríguez',checkIn: '2026-03-20', checkOut: '2026-03-25', total: 1500, estado: 'CONFIRMED',       estadoPago: 'PARTIAL', createdAt: '2026-03-15T09:15:00Z' },
    ],
  };
};

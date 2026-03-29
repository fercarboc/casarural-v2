import { getMockReservations } from './booking.mock';

export const getMockOccupiedDates = async () => {
  const reservations = await getMockReservations();
  const occupiedDates: string[] = [];
  
  reservations.forEach(res => {
    if (res.status !== 'CANCELLED') {
      let current = new Date(res.checkIn);
      const end = new Date(res.checkOut);
      while (current < end) {
        occupiedDates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    }
  });
  
  return occupiedDates;
};

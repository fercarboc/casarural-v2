import { isMockMode, supabase } from '../integrations/supabase/client';
import { getMockOccupiedDates } from './calendar.mock';
import { addDays, format, parseISO, isBefore, isSameDay } from 'date-fns';

/** Expande un rango de fechas en un array de strings 'yyyy-MM-dd' */
function expandDateRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  let current = parseISO(startStr);
  const end = parseISO(endStr);
  while (isBefore(current, end) || isSameDay(current, end)) {
    dates.push(format(current, 'yyyy-MM-dd'));
    current = addDays(current, 1);
  }
  return dates;
}

export const calendarService = {
  async getOccupiedDates(): Promise<string[]> {
    if (isMockMode) {
      return getMockOccupiedDates();
    }

    const occupied = new Set<string>();

    // Fechas bloqueadas por reservas confirmadas / pendientes de pago
    const { data: reservas } = await supabase
      .from('reservas')
      .select('fecha_entrada, fecha_salida')
      .in('estado', ['CONFIRMED', 'PENDING_PAYMENT']);

    for (const r of reservas ?? []) {
      expandDateRange(r.fecha_entrada, r.fecha_salida).forEach(d => occupied.add(d));
    }

    // Bloqueos manuales del admin
    const { data: bloqueos } = await supabase
      .from('bloqueos')
      .select('fecha_inicio, fecha_fin');

    for (const b of bloqueos ?? []) {
      expandDateRange(b.fecha_inicio, b.fecha_fin).forEach(d => occupied.add(d));
    }

    return Array.from(occupied);
  }
};

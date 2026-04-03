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
  /**
   * Devuelve fechas ocupadas como array de strings 'yyyy-MM-dd'.
   * Si se pasa unidad_id, filtra solo esa unidad (via reserva_unidades + bloqueos).
   * Sin unidad_id devuelve todas las fechas ocupadas de la propiedad.
   */
  async getOccupiedDates(unidad_id?: string): Promise<string[]> {
    if (isMockMode) {
      return getMockOccupiedDates();
    }

    const occupied = new Set<string>();

    if (unidad_id) {
      // ── Modo por unidad ─────────────────────────────────
      const { data: ru } = await supabase
        .from('reserva_unidades')
        .select('reserva_id')
        .eq('unidad_id', unidad_id);

      const reservaIds = (ru ?? []).map((r: any) => r.reserva_id);

      if (reservaIds.length > 0) {
        const { data: reservas } = await supabase
          .from('reservas')
          .select('fecha_entrada, fecha_salida')
          .in('id', reservaIds)
          .in('estado', ['CONFIRMED', 'PENDING_PAYMENT']);

        for (const r of reservas ?? []) {
          expandDateRange(r.fecha_entrada, r.fecha_salida).forEach(d => occupied.add(d));
        }
      }

      const { data: bloqueos } = await supabase
        .from('bloqueos')
        .select('fecha_inicio, fecha_fin')
        .eq('unidad_id', unidad_id);

      for (const b of bloqueos ?? []) {
        expandDateRange(b.fecha_inicio, b.fecha_fin).forEach(d => occupied.add(d));
      }

    } else {
      // ── Modo global: todas las unidades ─────────────────
      const { data: reservas } = await supabase
        .from('reservas')
        .select('fecha_entrada, fecha_salida')
        .in('estado', ['CONFIRMED', 'PENDING_PAYMENT']);

      for (const r of reservas ?? []) {
        expandDateRange(r.fecha_entrada, r.fecha_salida).forEach(d => occupied.add(d));
      }

      const { data: bloqueos } = await supabase
        .from('bloqueos')
        .select('fecha_inicio, fecha_fin');

      for (const b of bloqueos ?? []) {
        expandDateRange(b.fecha_inicio, b.fecha_fin).forEach(d => occupied.add(d));
      }
    }

    return Array.from(occupied);
  },
};

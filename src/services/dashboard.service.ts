import { isMockMode, supabase } from '../integrations/supabase/client';
import { getMockDashboardStats } from './dashboard.mock';
import { format, startOfMonth, endOfMonth, addDays, startOfYear, getDaysInMonth } from 'date-fns';

export const dashboardService = {
  async getStats() {
    if (isMockMode) return getMockDashboardStats();

    try {
      const today      = new Date();
      const todayStr   = format(today, 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
      const monthEnd   = format(endOfMonth(today), 'yyyy-MM-dd');
      const yearStart  = format(startOfYear(today), 'yyyy-MM-dd');
      const next14days = format(addDays(today, 14), 'yyyy-MM-dd');

      const [
        { data: reservasMes },
        { data: enCasaAhora },
        { data: checkinHoy },
        { data: checkoutHoy },
        { data: proximasLlegadas },
        { data: consultasNuevas },
        { data: actividadReciente },
        { data: reservasAnio },
        { data: bloqueosMes },
      ] = await Promise.all([
        supabase
          .from('reservas')
          .select('id, importe_total, estado, estado_pago, fecha_entrada, created_at')
          .gte('fecha_entrada', monthStart)
          .lte('fecha_entrada', monthEnd),

        supabase
          .from('reservas')
          .select('id, nombre_cliente, apellidos_cliente, fecha_entrada, fecha_salida, num_huespedes, estado')
          .eq('estado', 'CONFIRMED')
          .lte('fecha_entrada', todayStr)
          .gt('fecha_salida', todayStr),

        supabase
          .from('reservas')
          .select('id, nombre_cliente, apellidos_cliente, num_huespedes, estado')
          .in('estado', ['CONFIRMED', 'PENDING_PAYMENT'])
          .eq('fecha_entrada', todayStr),

        supabase
          .from('reservas')
          .select('id, nombre_cliente, apellidos_cliente, num_huespedes')
          .eq('estado', 'CONFIRMED')
          .eq('fecha_salida', todayStr),

        supabase
          .from('reservas')
          .select('id, nombre_cliente, apellidos_cliente, fecha_entrada, fecha_salida, num_huespedes, estado, origen')
          .in('estado', ['CONFIRMED', 'PENDING_PAYMENT'])
          .gt('fecha_entrada', todayStr)
          .lte('fecha_entrada', next14days)
          .order('fecha_entrada', { ascending: true })
          .limit(6),

        supabase
          .from('consultas')
          .select('id')
          .eq('estado', 'PENDIENTE'),

        supabase
          .from('reservas')
          .select('id, nombre_cliente, apellidos_cliente, fecha_entrada, fecha_salida, importe_total, estado, estado_pago, created_at')
          .order('created_at', { ascending: false })
          .limit(5),

        supabase
          .from('reservas')
          .select('importe_total')
          .eq('estado', 'CONFIRMED')
          .gte('fecha_entrada', yearStart),

        supabase
          .from('bloqueos')
          .select('fecha_inicio, fecha_fin')
          .lte('fecha_inicio', monthEnd)
          .gte('fecha_fin', monthStart),
      ]);

      const reservas    = reservasMes ?? [];
      const confirmadas = reservas.filter(r => r.estado === 'CONFIRMED');
      const pendientes  = reservas.filter(r => r.estado === 'PENDING_PAYMENT');
      const canceladas  = reservas.filter(r => r.estado === 'CANCELLED');

      const ingresosMes  = confirmadas.reduce((s, r) => s + Number(r.importe_total ?? 0), 0);
      const ingresosAnio = (reservasAnio ?? []).reduce((s, r) => s + Number(r.importe_total ?? 0), 0);

      const diasMes = getDaysInMonth(today);
      const ocupadosSet = new Set<string>();
      for (const r of confirmadas) {
        let d = new Date(r.fecha_entrada);
        const fin = new Date(r.fecha_salida ?? r.fecha_entrada);
        while (d < fin) {
          const s = format(d, 'yyyy-MM-dd');
          if (s >= monthStart && s <= monthEnd) ocupadosSet.add(s);
          d = addDays(d, 1);
        }
      }
      for (const b of (bloqueosMes ?? [])) {
        let d = new Date(b.fecha_inicio);
        const fin = new Date(b.fecha_fin);
        while (d < fin) {
          const s = format(d, 'yyyy-MM-dd');
          if (s >= monthStart && s <= monthEnd) ocupadosSet.add(s);
          d = addDays(d, 1);
        }
      }
      const ocupacionPct = Math.round((ocupadosSet.size / diasMes) * 100);

      return {
        monthlyReservations: reservas.length,
        monthlyRevenue:      ingresosMes,
        yearlyRevenue:       ingresosAnio,
        pendingPayments:     pendientes.length,
        cancellations:       canceladas.length,
        consultasNuevas:     (consultasNuevas ?? []).length,
        ocupacionMes:        ocupacionPct,

        enCasaAhora: (enCasaAhora ?? []).map(r => ({
          id:        r.id,
          guestName: `${r.nombre_cliente} ${r.apellidos_cliente ?? ''}`.trim(),
          checkIn:   r.fecha_entrada,
          checkOut:  r.fecha_salida,
          guests:    r.num_huespedes,
          status:    r.estado,
        })),
        checkinHoy: (checkinHoy ?? []).map(r => ({
          id:        r.id,
          guestName: `${r.nombre_cliente} ${r.apellidos_cliente ?? ''}`.trim(),
          guests:    r.num_huespedes,
          status:    r.estado,
        })),
        checkoutHoy: (checkoutHoy ?? []).map(r => ({
          id:        r.id,
          guestName: `${r.nombre_cliente} ${r.apellidos_cliente ?? ''}`.trim(),
          guests:    r.num_huespedes,
        })),

        upcomingCheckins: (proximasLlegadas ?? []).map(r => ({
          id:        r.id,
          guestName: `${r.nombre_cliente} ${r.apellidos_cliente ?? ''}`.trim(),
          checkIn:   r.fecha_entrada,
          checkOut:  r.fecha_salida,
          guests:    r.num_huespedes,
          status:    r.estado,
          origen:    r.origen,
        })),

        actividadReciente: (actividadReciente ?? []).map(r => ({
          id:        r.id,
          guestName: `${r.nombre_cliente} ${r.apellidos_cliente ?? ''}`.trim(),
          checkIn:   r.fecha_entrada,
          checkOut:  r.fecha_salida,
          total:     r.importe_total,
          estado:    r.estado,
          estadoPago: r.estado_pago,
          createdAt: r.created_at,
        })),
      };
    } catch (err) {
      console.error('Dashboard error, using mock:', err);
      return getMockDashboardStats();
    }
  }
};

import { isMockMode, supabase } from '../integrations/supabase/client'
import { getMockDashboardStats } from './dashboard.mock'
import {
  format,
  startOfMonth,
  endOfMonth,
  addDays,
  startOfYear,
  getDaysInMonth,
} from 'date-fns'

type GetDashboardStatsParams = {
  year?: number
  month?: number // 1-12
}

type ReservaDashboardRow = {
  id: string
  importe_total: number | string | null
  estado: string | null
  estado_pago?: string | null
  fecha_entrada: string
  fecha_salida?: string | null
  created_at?: string | null
  nombre_cliente?: string | null
  apellidos_cliente?: string | null
  num_huespedes?: number | null
  origen?: string | null
}

type BloqueoDashboardRow = {
  fecha_inicio: string
  fecha_fin: string
}

function buildGuestName(nombre?: string | null, apellidos?: string | null): string {
  const full = `${nombre ?? ''} ${apellidos ?? ''}`.trim()
  return full || 'Cliente sin nombre'
}

function safeNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export const dashboardService = {
  async getStats(params?: GetDashboardStatsParams) {
    if (isMockMode) return getMockDashboardStats()

    try {
      const now = new Date()

      const selectedYear = params?.year ?? now.getFullYear()
      const selectedMonth = params?.month ?? now.getMonth() + 1 // 1-12

      const targetDate = new Date(selectedYear, selectedMonth - 1, 1)

      const todayStr = format(now, 'yyyy-MM-dd')
      const monthStart = format(startOfMonth(targetDate), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(targetDate), 'yyyy-MM-dd')
      const yearStart = format(startOfYear(targetDate), 'yyyy-MM-dd')
      const next14days = format(addDays(now, 14), 'yyyy-MM-dd')

      const [
        { data: reservasMes, error: reservasMesError },
        { data: enCasaAhora, error: enCasaAhoraError },
        { data: checkinHoy, error: checkinHoyError },
        { data: checkoutHoy, error: checkoutHoyError },
        { data: proximasLlegadas, error: proximasLlegadasError },
        { data: consultasNuevas, error: consultasNuevasError },
        { data: actividadReciente, error: actividadRecienteError },
        { data: reservasAnio, error: reservasAnioError },
        { data: bloqueosMes, error: bloqueosMesError },
      ] = await Promise.all([
        supabase
          .from('reservas')
          .select('id, importe_total, estado, estado_pago, fecha_entrada, fecha_salida, created_at')
          .gte('fecha_entrada', monthStart)
          .lte('fecha_entrada', monthEnd),

        supabase
          .from('reservas')
          .select(
            'id, nombre_cliente, apellidos_cliente, fecha_entrada, fecha_salida, num_huespedes, estado'
          )
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
          .select(
            'id, nombre_cliente, apellidos_cliente, fecha_entrada, fecha_salida, num_huespedes, estado, origen'
          )
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
          .select(
            'id, nombre_cliente, apellidos_cliente, fecha_entrada, fecha_salida, importe_total, estado, estado_pago, created_at'
          )
          .order('created_at', { ascending: false })
          .limit(5),

        supabase
          .from('reservas')
          .select('importe_total')
          .eq('estado', 'CONFIRMED')
          .gte('fecha_entrada', yearStart)
          .lte('fecha_entrada', monthEnd),

        supabase
          .from('bloqueos')
          .select('fecha_inicio, fecha_fin')
          .lte('fecha_inicio', monthEnd)
          .gte('fecha_fin', monthStart),
      ])

      const queryErrors = [
        reservasMesError,
        enCasaAhoraError,
        checkinHoyError,
        checkoutHoyError,
        proximasLlegadasError,
        consultasNuevasError,
        actividadRecienteError,
        reservasAnioError,
        bloqueosMesError,
      ].filter(Boolean)

      if (queryErrors.length > 0) {
        console.error('Dashboard queries error:', queryErrors)
        throw queryErrors[0]
      }

      const reservas: ReservaDashboardRow[] = (reservasMes ?? []) as ReservaDashboardRow[]
      const confirmadas = reservas.filter((r: ReservaDashboardRow) => r.estado === 'CONFIRMED')
      const pendientes = reservas.filter((r: ReservaDashboardRow) => r.estado === 'PENDING_PAYMENT')
      const canceladas = reservas.filter((r: ReservaDashboardRow) => r.estado === 'CANCELLED')

      const ingresosMes = confirmadas.reduce(
        (s: number, r: ReservaDashboardRow) => s + safeNumber(r.importe_total),
        0
      )

      const ingresosAnio = ((reservasAnio ?? []) as Pick<ReservaDashboardRow, 'importe_total'>[]).reduce(
        (s: number, r) => s + safeNumber(r.importe_total),
        0
      )

      const diasMes = getDaysInMonth(targetDate)
      const ocupadosSet = new Set<string>()

      for (const r of confirmadas as ReservaDashboardRow[]) {
        let d = new Date(r.fecha_entrada)
        const fin = new Date(r.fecha_salida ?? r.fecha_entrada)

        while (d < fin) {
          const s = format(d, 'yyyy-MM-dd')
          if (s >= monthStart && s <= monthEnd) ocupadosSet.add(s)
          d = addDays(d, 1)
        }
      }

      for (const b of ((bloqueosMes ?? []) as BloqueoDashboardRow[])) {
        let d = new Date(b.fecha_inicio)
        const fin = new Date(b.fecha_fin)

        while (d < fin) {
          const s = format(d, 'yyyy-MM-dd')
          if (s >= monthStart && s <= monthEnd) ocupadosSet.add(s)
          d = addDays(d, 1)
        }
      }

      const ocupacionPct = diasMes > 0
        ? Math.round((ocupadosSet.size / diasMes) * 100)
        : 0

      return {
        selectedYear,
        selectedMonth,
        monthStart,
        monthEnd,

        monthlyReservations: reservas.length,
        monthlyRevenue: ingresosMes,
        yearlyRevenue: ingresosAnio,
        pendingPayments: pendientes.length,
        cancellations: canceladas.length,
        consultasNuevas: (consultasNuevas ?? []).length,
        ocupacionMes: ocupacionPct,

        enCasaAhora: ((enCasaAhora ?? []) as ReservaDashboardRow[]).map((r: ReservaDashboardRow) => ({
          id: r.id,
          guestName: buildGuestName(r.nombre_cliente, r.apellidos_cliente),
          checkIn: r.fecha_entrada,
          checkOut: r.fecha_salida,
          guests: safeNumber(r.num_huespedes),
          status: r.estado,
        })),

        checkinHoy: ((checkinHoy ?? []) as ReservaDashboardRow[]).map((r: ReservaDashboardRow) => ({
          id: r.id,
          guestName: buildGuestName(r.nombre_cliente, r.apellidos_cliente),
          guests: safeNumber(r.num_huespedes),
          status: r.estado,
        })),

        checkoutHoy: ((checkoutHoy ?? []) as ReservaDashboardRow[]).map((r: ReservaDashboardRow) => ({
          id: r.id,
          guestName: buildGuestName(r.nombre_cliente, r.apellidos_cliente),
          guests: safeNumber(r.num_huespedes),
        })),

        upcomingCheckins: ((proximasLlegadas ?? []) as ReservaDashboardRow[]).map((r: ReservaDashboardRow) => ({
          id: r.id,
          guestName: buildGuestName(r.nombre_cliente, r.apellidos_cliente),
          checkIn: r.fecha_entrada,
          checkOut: r.fecha_salida,
          guests: safeNumber(r.num_huespedes),
          status: r.estado,
          origen: r.origen,
        })),

        actividadReciente: ((actividadReciente ?? []) as ReservaDashboardRow[]).map((r: ReservaDashboardRow) => ({
          id: r.id,
          guestName: buildGuestName(r.nombre_cliente, r.apellidos_cliente),
          checkIn: r.fecha_entrada,
          checkOut: r.fecha_salida,
          total: safeNumber(r.importe_total),
          estado: r.estado,
          estadoPago: r.estado_pago,
          createdAt: r.created_at,
        })),
      }
    } catch (err) {
      console.error('Dashboard error, using mock:', err)
      return getMockDashboardStats()
    }
  },
}
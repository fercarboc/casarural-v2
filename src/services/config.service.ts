// Toda la configuración viene de la BD vía Edge Function get-config.
// No hay mock ni valores hardcodeados: si la conexión falla, se lanza error claro.

import { isMockMode } from '../integrations/supabase/client';


// ── Interfaces v2 ─────────────────────────────────────────

export interface Unidad {
  id: string;
  nombre: string;
  slug: string;
  tipo: 'CASA_RURAL' | 'APARTAMENTO' | 'HABITACION';
  capacidad_base: number;
  capacidad_maxima: number;
  num_habitaciones?: number;
  num_banos?: number;
  superficie_m2?: number;
  fotos: string[];
  amenities: string[];
  activa: boolean;
  orden: number;
  // Precios base
  precio_noche: number;
  extra_huesped_noche: number;
  tarifa_limpieza: number;
  min_noches: number;
  // Precios especiales (null = igual que base)
  precio_noche_especial: number | null;
  extra_huesped_especial: number | null;
  tarifa_limpieza_especial: number | null;
  min_noches_especial: number | null;
}

export interface PeriodoEspecial {
  id: string;
  nombre: string;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string;    // YYYY-MM-DD
  activa: boolean;
}

export interface AppConfig {
  property: {
    id: string;
    nombre: string;
    slug: string;
    telefono?: string;
    email?: string;
    localidad?: string;
    provincia?: string;
  };
  unidades: Unidad[];
  periodos_especiales: PeriodoEspecial[];
  descuento_no_reembolsable: number; // porcentaje (ej. 10)
  porcentaje_senal: number;          // porcentaje (ej. 30)
}

// Interfaz de pricing derivada — mantiene compatibilidad con calculatePrice
export interface PricingConfig {
  precio_noche_base: number;
  precio_noche_alta: number;
  extra_huesped_base: number;
  extra_huesped_alta: number;
  limpieza: number;
  descuento_no_reembolsable: number;
  porcentaje_senal: number;
  estancia_minima: number;
  capacidad_base: number;
  capacidad_max: number;
}

// ── Helpers ───────────────────────────────────────────────

/** Devuelve true si la fecha cae en algún periodo especial activo */
export function isEspecial(date: Date, periodos: PeriodoEspecial[]): boolean {
  const dateStr = date.toISOString().split('T')[0];
  return periodos.some(p => p.activa && p.fecha_inicio <= dateStr && p.fecha_fin >= dateStr);
}

/** Devuelve el periodo especial que contiene la fecha, o null */
export function getPeriodoForDate(
  date: Date,
  periodos: PeriodoEspecial[]
): PeriodoEspecial | null {
  const dateStr = date.toISOString().split('T')[0];
  return periodos.find(p => p.activa && p.fecha_inicio <= dateStr && p.fecha_fin >= dateStr) ?? null;
}

/** Devuelve estancia mínima para una fecha y unidad dadas */
export function getMinStayForDate(
  date: Date,
  config: AppConfig,
  unidad_id?: string
): { nights: number; nombre: string } {
  const unidad = config.unidades.find(u => u.id === (unidad_id ?? config.unidades[0]?.id))
    ?? config.unidades[0];
  const periodo = getPeriodoForDate(date, config.periodos_especiales);
  if (periodo) {
    return {
      nights: unidad?.min_noches_especial ?? unidad?.min_noches ?? 1,
      nombre: periodo.nombre,
    };
  }
  return { nights: unidad?.min_noches ?? 1, nombre: 'Temporada general' };
}

/** Deriva un PricingConfig plano desde la config v2 para una fecha y unidad dadas */
export function getPricingForDate(
  date: Date,
  config: AppConfig,
  unidad_id?: string
): PricingConfig {
  const unidad = config.unidades.find(u => u.id === (unidad_id ?? config.unidades[0]?.id))
    ?? config.unidades[0];

  const especial = isEspecial(date, config.periodos_especiales);

  const precio   = especial
    ? (unidad?.precio_noche_especial   ?? unidad?.precio_noche   ?? 0)
    : (unidad?.precio_noche            ?? 0);
  const extra    = especial
    ? (unidad?.extra_huesped_especial  ?? unidad?.extra_huesped_noche ?? 0)
    : (unidad?.extra_huesped_noche     ?? 0);
  const limpieza = especial
    ? (unidad?.tarifa_limpieza_especial ?? unidad?.tarifa_limpieza ?? 0)
    : (unidad?.tarifa_limpieza         ?? 0);
  const minNoches = especial
    ? (unidad?.min_noches_especial     ?? unidad?.min_noches ?? 1)
    : (unidad?.min_noches              ?? 1);

  return {
    precio_noche_base:         precio,
    precio_noche_alta:         precio,
    extra_huesped_base:        extra,
    extra_huesped_alta:        extra,
    limpieza,
    descuento_no_reembolsable: config.descuento_no_reembolsable,
    porcentaje_senal:          config.porcentaje_senal,
    estancia_minima:           minNoches,
    capacidad_base:            unidad?.capacidad_base   ?? 10,
    capacidad_max:             unidad?.capacidad_maxima ?? 11,
  };
}

// ── Servicio ──────────────────────────────────────────────

export const configService = {
  async getConfig(property_id: string): Promise<AppConfig> {
    if (isMockMode) {
      throw new Error(
        'Variables de entorno no configuradas (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ' +
        'Configúralas en Vercel y redespliega.'
      );
    }

    // Usamos fetch directo con GET + query params porque invoke() hace POST
    const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
    const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
    const res = await fetch(
      `${supabaseUrl}/functions/v1/get-config?property_id=${encodeURIComponent(property_id)}`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const data = await res.json();
    const error = res.ok ? null : data;

    if (error) {
      console.error('[configService] Error al invocar get-config:', error);
      throw new Error('No se pudo cargar la configuración del servidor.');
    }

    if (!data?.property) {
      throw new Error('La configuración devuelta por el servidor está vacía.');
    }

    return {
      property:                  data.property,
      unidades:                  data.unidades                  ?? [],
      periodos_especiales:       data.periodos_especiales       ?? [],
      descuento_no_reembolsable: data.descuento_no_reembolsable ?? 10,
      porcentaje_senal:          data.porcentaje_senal          ?? 30,
    };
  },
};

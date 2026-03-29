// Toda la configuración viene de la BD vía Edge Function get-config.
// No hay mock ni valores hardcodeados: si la conexión falla, se lanza error claro.

import { supabase, isMockMode } from '../integrations/supabase/client';

export interface Temporada {
  nombre: string;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string;    // YYYY-MM-DD
  tipo: 'ALTA' | 'BASE';
  estancia_minima: number;
}

export interface PricingConfig {
  precio_noche_base: number;
  precio_noche_alta: number;
  extra_huesped_base: number;
  extra_huesped_alta: number;
  limpieza: number;
  descuento_no_reembolsable: number;
  porcentaje_senal: number; // siempre 50
  estancia_minima: number;  // mínimo base (fuera de temporada)
  capacidad_base: number;
  capacidad_max: number;
}

export interface AppConfig {
  pricing: PricingConfig;
  temporadas: Temporada[];
}

// Devuelve la temporada activa para una fecha dada (o null si es temporada base)
export function getTemporadaForDate(date: Date, temporadas: Temporada[]): Temporada | null {
  const dateStr = date.toISOString().split('T')[0];
  return temporadas.find(t => t.fecha_inicio <= dateStr && t.fecha_fin >= dateStr) ?? null;
}

// Devuelve la estancia mínima y el nombre de temporada para una fecha
export function getMinStayForDate(
  date: Date,
  config: AppConfig
): { nights: number; nombre: string } {
  const temporada = getTemporadaForDate(date, config.temporadas);
  if (temporada) {
    return { nights: temporada.estancia_minima, nombre: temporada.nombre };
  }
  return { nights: config.pricing.estancia_minima, nombre: 'Temporada general' };
}

export const configService = {
  async getConfig(): Promise<AppConfig> {
    if (isMockMode) {
      throw new Error(
        'Variables de entorno no configuradas (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ' +
        'Configúralas en Vercel y redespliega.'
      );
    }

    const { data, error } = await supabase.functions.invoke('get-config');

    if (error) {
      console.error('[configService] Error al invocar get-config:', error);
      throw new Error('No se pudo cargar la configuración del servidor.');
    }

    if (!data?.config) {
      throw new Error('La configuración devuelta por el servidor está vacía.');
    }

    return {
      pricing:    data.config   as PricingConfig,
      temporadas: (data.temporadas ?? []) as Temporada[],
    };
  },
};

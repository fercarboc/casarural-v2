import type { PricingConfig } from './config.service';

// Valores que coinciden exactamente con la tabla configuracion en Supabase.
// Se usan solo cuando isMockMode=true (env vars no disponibles en el build).
export const MOCK_CONFIG: PricingConfig = {
  precio_noche_base:         300,
  precio_noche_alta:         330,
  extra_huesped_base:        30,
  extra_huesped_alta:        30,
  limpieza:                  60,
  descuento_no_reembolsable: 10,
  porcentaje_senal:          30,
  estancia_minima:           2,
  capacidad_base:            10,
  capacidad_max:             11,
};

export const configMockService = {
  getConfig: async (): Promise<PricingConfig> => {
    return MOCK_CONFIG;
  },
};

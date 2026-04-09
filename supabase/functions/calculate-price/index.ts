// supabase/functions/calculate-price/index.ts
// casarural-v2
//
// MODELO DE PRECIOS REAL:
//   - Precio base SIEMPRE → campos en tabla `unidades`
//   - Precio especial SOLO si el rango cae en `temporadas_unidad`
//   - EXTRAS: sobre (total_pax - suma_capacidades_base), NUNCA unidad a unidad

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface UnidadDB {
  id: string;
  nombre: string;
  slug: string;
  capacidad_base: number;
  capacidad_maxima: number;
  precio_noche: number;
  extra_huesped_noche: number;
  tarifa_limpieza: number;
  min_noches: number;
  precio_noche_especial: number | null;
  extra_huesped_especial: number | null;
  tarifa_limpieza_especial: number | null;
  min_noches_especial: number | null;
}

interface TemporadaDB {
  id: string;
  unidad_id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  precio_noche: number;
  extra_huesped_noche: number;
  tarifa_limpieza: number;
  min_noches: number;
  max_noches: number | null;
  activa: boolean;
}

interface UnidadInput {
  unidad_id: string;
  extras_manuales?: number; // override manual de dónde va el extra
}

interface RequestBody {
  property_id: string;
  fecha_entrada: string;
  fecha_salida: string;
  num_huespedes: number;
  tarifa: "FLEXIBLE" | "NO_REEMBOLSABLE";
  unidades: UnidadInput[];
  porcentaje_senal?: number;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function toDate(d: string): Date {
  return new Date(d + "T00:00:00Z");
}

function calcNoches(entrada: string, salida: string): number {
  return Math.round((toDate(salida).getTime() - toDate(entrada).getTime()) / 86400000);
}

// Devuelve precios efectivos: especial si hay temporada, base si no.
// NUNCA devuelve null.
function getPreciosEfectivos(
  unidad: UnidadDB,
  temporadas: TemporadaDB[],
  fechaEntrada: string,
  fechaSalida: string
) {
  const e = toDate(fechaEntrada);
  const s = toDate(fechaSalida);

  const tempEspecial = temporadas.find(
    (t) =>
      t.unidad_id === unidad.id &&
      t.activa &&
      toDate(t.fecha_inicio) <= e &&
      toDate(t.fecha_fin) >= s
  );

  if (tempEspecial) {
    return {
      precio_noche:        tempEspecial.precio_noche,
      extra_huesped_noche: tempEspecial.extra_huesped_noche,
      tarifa_limpieza:     tempEspecial.tarifa_limpieza,
      min_noches:          tempEspecial.min_noches,
      max_noches:          tempEspecial.max_noches,
      es_especial:         true,
      temporada_nombre:    tempEspecial.nombre,
      temporada_id:        tempEspecial.id,
    };
  }

  return {
    precio_noche:        unidad.precio_noche,
    extra_huesped_noche: unidad.extra_huesped_noche,
    tarifa_limpieza:     unidad.tarifa_limpieza,
    min_noches:          unidad.min_noches ?? 1,
    max_noches:          null,
    es_especial:         false,
    temporada_nombre:    "Base",
    temporada_id:        null,
  };
}

function distribuirExtras(
  unidades: UnidadDB[],
  inputUnidades: UnidadInput[],
  extrasTotal: number
): Record<string, number> {
  const res: Record<string, number> = {};
  unidades.forEach((u) => (res[u.id] = 0));

  // Primero: respetar extras manuales del usuario
  let asignados = 0;
  inputUnidades.forEach((iu) => {
    if (iu.extras_manuales != null && iu.extras_manuales > 0) {
      const u = unidades.find((x) => x.id === iu.unidad_id);
      if (!u) return;
      const max = u.capacidad_maxima - u.capacidad_base;
      const asignar = Math.min(iu.extras_manuales, max);
      res[u.id] = asignar;
      asignados += asignar;
    }
  });

  // Resto: distribuir automáticamente por mayor capacidad base
  let rem = extrasTotal - asignados;
  if (rem > 0) {
    const sorted = [...unidades].sort((a, b) => b.capacidad_base - a.capacidad_base);
    for (const u of sorted) {
      if (rem <= 0) break;
      const yaAsig = res[u.id];
      const max = u.capacidad_maxima - u.capacidad_base - yaAsig;
      if (max <= 0) continue;
      const asignar = Math.min(rem, max);
      res[u.id] += asignar;
      rem -= asignar;
    }
  }

  return res;
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body: RequestBody = await req.json();
    const {
      property_id,
      fecha_entrada,
      fecha_salida,
      num_huespedes,
      tarifa = "FLEXIBLE",
      unidades: inputUnidades,
      porcentaje_senal = 30,
    } = body;

    if (!property_id || !fecha_entrada || !fecha_salida || !num_huespedes || !inputUnidades?.length) {
      return new Response(
        JSON.stringify({ error: "Faltan parámetros obligatorios" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const noches = calcNoches(fecha_entrada, fecha_salida);
    if (noches <= 0) {
      return new Response(
        JSON.stringify({ error: "fecha_salida debe ser posterior a fecha_entrada" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const unidadIds = inputUnidades.map((u) => u.unidad_id);

    // Cargar unidades con todos los campos de precio
    const { data: unidadesDB, error: uErr } = await supabase
      .from("unidades")
      .select(`
        id, nombre, slug,
        capacidad_base, capacidad_maxima,
        precio_noche, extra_huesped_noche, tarifa_limpieza, min_noches,
        precio_noche_especial, extra_huesped_especial,
        tarifa_limpieza_especial, min_noches_especial
      `)
      .in("id", unidadIds)
      .eq("property_id", property_id)
      .eq("activa", true);

    if (uErr || !unidadesDB?.length) {
      return new Response(
        JSON.stringify({ error: "No se encontraron unidades válidas", detail: uErr?.message }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (unidadesDB.length !== unidadIds.length) {
      return new Response(
        JSON.stringify({ error: "Algunas unidades no pertenecen a esta propiedad o no están activas" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Cargar temporadas especiales (puede ser [])
    const { data: temporadas } = await supabase
      .from("temporadas_unidad")
      .select("*")
      .in("unidad_id", unidadIds)
      .eq("property_id", property_id)
      .eq("activa", true);

    // ── CÁLCULO ───────────────────────────────────────────────────────────────

    const warnings: string[] = [];
    const sumaBase = unidadesDB.reduce((s, u) => s + u.capacidad_base, 0);
    const sumaMax  = unidadesDB.reduce((s, u) => s + u.capacidad_maxima, 0);

    if (num_huespedes > sumaMax) {
      return new Response(
        JSON.stringify({
          error: `El grupo de ${num_huespedes} huéspedes supera la capacidad máxima (${sumaMax})`,
          suma_capacidades_maximas: sumaMax,
        }),
        { status: 422, headers: corsHeaders }
      );
    }

    // EXTRAS: sobre la suma total, no unidad a unidad
    const extrasTotal = Math.max(0, num_huespedes - sumaBase);
    const extrasDesglose = distribuirExtras(unidadesDB as UnidadDB[], inputUnidades, extrasTotal);

    let importeAloj  = 0;
    let importeExtra = 0;
    let importeLimp  = 0;
    const desgloseUnidades = [];

    for (const u of unidadesDB as UnidadDB[]) {
      const precios = getPreciosEfectivos(u, temporadas ?? [], fecha_entrada, fecha_salida);

      if (noches < precios.min_noches) {
        warnings.push(`"${u.nombre}" requiere mínimo ${precios.min_noches} noches`);
      }
      if (precios.max_noches && noches > precios.max_noches) {
        warnings.push(`"${u.nombre}" permite máximo ${precios.max_noches} noches`);
      }

      const extU  = extrasDesglose[u.id] ?? 0;
      const iAloj = precios.precio_noche * noches;
      const iExt  = precios.extra_huesped_noche * extU * noches;
      const iLimp = precios.tarifa_limpieza;

      importeAloj  += iAloj;
      importeExtra += iExt;
      importeLimp  += iLimp;

      desgloseUnidades.push({
        unidad_id:               u.id,
        nombre:                  u.nombre,
        capacidad_base:          u.capacidad_base,
        capacidad_maxima:        u.capacidad_maxima,
        num_huespedes_asignados: u.capacidad_base + extU,
        extras_asignados:        extU,
        precio_noche:            precios.precio_noche,
        extra_huesped_noche:     precios.extra_huesped_noche,
        tarifa_limpieza:         precios.tarifa_limpieza,
        noches,
        importe_alojamiento:     iAloj,
        importe_extras:          iExt,
        importe_limpieza:        iLimp,
        importe_subtotal:        iAloj + iExt + iLimp,
        es_especial:             precios.es_especial,
        temporada_nombre:        precios.temporada_nombre,
        temporada_id:            precios.temporada_id,
        min_noches:              precios.min_noches,
      });
    }

    const importeBase = importeAloj + importeExtra;
    const descuento   = tarifa === "NO_REEMBOLSABLE"
      ? Math.round(importeBase * 0.10 * 100) / 100
      : 0;
    const importeNeto  = importeBase - descuento;
    const importeTotal = importeNeto + importeLimp;

    const porcSenal    = Math.min(100, Math.max(0, porcentaje_senal));
    const importeSenal = tarifa === "NO_REEMBOLSABLE"
      ? importeTotal
      : Math.round(importeTotal * (porcSenal / 100) * 100) / 100;

    return new Response(
      JSON.stringify({
        property_id,
        fecha_entrada,
        fecha_salida,
        noches,
        num_huespedes,
        tarifa,

        suma_capacidades_base:    sumaBase,
        suma_capacidades_maximas: sumaMax,
        extras_total:             extrasTotal,

        unidades: desgloseUnidades,

        importe_alojamiento_total: importeAloj,
        importe_extras_total:      importeExtra,
        importe_limpieza_total:    importeLimp,
        importe_base:              importeBase,
        descuento_aplicado:        descuento,
        importe_neto:              importeNeto,
        importe_total:             importeTotal,

        porcentaje_senal:  porcSenal,
        importe_senal:     importeSenal,
        importe_resto:     importeTotal - importeSenal,

        precio_por_persona:       Math.round((importeTotal / num_huespedes) * 100) / 100,
        precio_por_persona_noche: Math.round((importeTotal / num_huespedes / noches) * 100) / 100,

        warnings,
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Unexpected error", detail: String(err) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
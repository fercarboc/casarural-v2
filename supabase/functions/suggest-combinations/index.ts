// supabase/functions/suggest-combinations/index.ts
// VERSION DEBUG — logs detallados para diagnosticar combinaciones vacías

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const MAX_EXCESO = 2;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    console.log("[1] Body recibido:", JSON.stringify(body));

    const property_id   = body.property_id   ?? Deno.env.get("DEFAULT_PROPERTY_ID") ?? null;
    const fecha_entrada = body.fecha_entrada  ?? body.checkIn   ?? null;
    const fecha_salida  = body.fecha_salida   ?? body.checkOut  ?? null;
    const num_huespedes = body.num_huespedes  ?? body.huespedes ?? null;
    const tarifa        = body.tarifa ?? "FLEXIBLE";
    const porcSenal     = body.porcentaje_senal ?? 30;

    console.log("[2] Params resueltos:", { property_id, fecha_entrada, fecha_salida, num_huespedes });

    if (!property_id || !fecha_entrada || !fecha_salida || !num_huespedes) {
      return new Response(
        JSON.stringify({ error: "Faltan parámetros", recibidos: { property_id, fecha_entrada, fecha_salida, num_huespedes } }),
        { status: 400, headers: corsHeaders }
      );
    }

    const noches = Math.round(
      (new Date(fecha_salida + "T00:00:00Z").getTime() - new Date(fecha_entrada + "T00:00:00Z").getTime()) / 86400000
    );
    console.log("[3] Noches:", noches);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Cargar unidades con campos de precio base
    const { data: unidades, error: uErr } = await supabase
      .from("unidades")
      .select("id, nombre, slug, capacidad_base, capacidad_maxima, precio_noche, extra_huesped_noche, tarifa_limpieza, min_noches, precio_noche_especial, extra_huesped_especial, tarifa_limpieza_especial, min_noches_especial")
      .eq("property_id", property_id)
      .eq("activa", true)
      .order("orden", { ascending: true });

    if (uErr) {
      console.error("[ERROR] Error cargando unidades:", uErr);
      return new Response(JSON.stringify({ error: "Error cargando unidades", detail: uErr.message }), { status: 500, headers: corsHeaders });
    }

    console.log("[4] Unidades cargadas:", unidades?.length, unidades?.map(u => ({
      nombre: u.nombre,
      precio_noche: u.precio_noche,
      capacidad_base: u.capacidad_base,
      capacidad_maxima: u.capacidad_maxima,
    })));

    if (!unidades?.length) {
      return new Response(JSON.stringify({ error: "No hay unidades activas" }), { status: 404, headers: corsHeaders });
    }

    // Verificar precios base
    const sinPrecio = unidades.filter(u => !u.precio_noche || u.precio_noche <= 0);
    if (sinPrecio.length > 0) {
      console.error("[ERROR] Unidades sin precio_noche:", sinPrecio.map(u => u.nombre));
      return new Response(
        JSON.stringify({ error: "Unidades sin precio base", unidades: sinPrecio.map(u => ({ id: u.id, nombre: u.nombre, precio_noche: u.precio_noche })) }),
        { status: 422, headers: corsHeaders }
      );
    }

    // Filtrar ocupadas — misma lógica que check-availability
    const ids = unidades.map(u => u.id);

    // Reservas CONFIRMED + PENDING_PAYMENT (igual que check-availability)
    const { data: resOcupadas } = await supabase
      .from("reserva_unidades")
      .select("unidad_id, reservas!inner(fecha_entrada, fecha_salida, estado)")
      .in("unidad_id", ids)
      .in("reservas.estado", ["CONFIRMED", "PENDING_PAYMENT"])
      .lt("reservas.fecha_entrada", fecha_salida)
      .gt("reservas.fecha_salida", fecha_entrada);

    // Bloqueos (manuales + iCal)
    const { data: bloqOcupados } = await supabase
      .from("bloqueos")
      .select("unidad_id")
      .in("unidad_id", ids)
      .lt("fecha_inicio", fecha_salida)
      .gt("fecha_fin", fecha_entrada);

    // Reservation holds activos (pre-reservas en proceso de pago)
    const { data: holdsActivos } = await supabase
      .from("reservation_holds")
      .select("unidad_id")
      .in("unidad_id", ids)
      .gt("expires_at", new Date().toISOString())
      .lt("fecha_inicio", fecha_salida)
      .gt("fecha_fin", fecha_entrada);

    const ocupadas = new Set<string>();
    (resOcupadas   ?? []).forEach((r: any) => ocupadas.add(r.unidad_id));
    (bloqOcupados  ?? []).forEach((b: any) => ocupadas.add(b.unidad_id));
    (holdsActivos  ?? []).forEach((h: any) => ocupadas.add(h.unidad_id));
    console.log("[5] Ocupadas:", [...ocupadas]);

    const disponibles = unidades.filter(u => !ocupadas.has(u.id));
    console.log("[6] Disponibles:", disponibles.map(u => u.nombre));

    // Temporadas especiales
    const { data: temporadas } = await supabase
      .from("temporadas_unidad")
      .select("*")
      .in("unidad_id", ids)
      .eq("property_id", property_id)
      .eq("activa", true);
    console.log("[7] Temporadas especiales:", temporadas?.length ?? 0);

    // Generar combinaciones y calcular
    // Se ejecuta en dos pasadas:
    //   1ª pasada (estricta): aplica filtro MAX_EXCESO para preferir combos ajustadas
    //   2ª pasada (fallback): sin filtro de exceso, para casos donde la única unidad
    //      disponible tiene más capacidad de la buscada (p.ej. casa de 11 plazas para 7)
    const n = disponibles.length;
    const resultados = [];
    const debugRechazadas = [];

    function evaluarCombinaciones(aplicarFiltroExceso: boolean) {
      for (let mask = 1; mask < (1 << n); mask++) {
        const subset = [];
        for (let i = 0; i < n; i++) if (mask & (1 << i)) subset.push(disponibles[i]);

        const nombres = subset.map(u => u.nombre).join("+");
        const sumaBase = subset.reduce((s, u) => s + u.capacidad_base, 0);
        const sumaMax  = subset.reduce((s, u) => s + u.capacidad_maxima, 0);
        const exceso   = sumaBase - num_huespedes;
        const extrasTotal = Math.max(0, num_huespedes - sumaBase);

        // Log de cada combinación evaluada
        console.log(`[combo${aplicarFiltroExceso ? "" : "-fallback"}] ${nombres} | sumaBase:${sumaBase} sumaMax:${sumaMax} exceso:${exceso} extras:${extrasTotal}`);

        // Verificar que no supera el máximo
        if (num_huespedes > sumaMax) {
          if (aplicarFiltroExceso) debugRechazadas.push({ combo: nombres, razon: `num_huespedes(${num_huespedes}) > sumaMax(${sumaMax})` });
          continue;
        }

        // Filtro de exceso (solo en pasada estricta)
        if (aplicarFiltroExceso && exceso > MAX_EXCESO && num_huespedes <= sumaBase) {
          debugRechazadas.push({ combo: nombres, razon: `exceso(${exceso}) > MAX_EXCESO(${MAX_EXCESO})` });
          continue;
        }

        // En pasada fallback, evitar duplicar combos ya incluidas
        if (!aplicarFiltroExceso) {
          const yaIncluida = resultados.some(r =>
            r.unidades.map((u: any) => u.unidad_id).sort().join(",") ===
            subset.map(u => u.id).sort().join(",")
          );
          if (yaIncluida) continue;
        }

        // Verificar que los extras caben
        const maxExtrasPos = subset.reduce((s, u) => s + (u.capacidad_maxima - u.capacidad_base), 0);
        if (extrasTotal > maxExtrasPos) {
          if (aplicarFiltroExceso) debugRechazadas.push({ combo: nombres, razon: `extrasTotal(${extrasTotal}) > maxExtrasPos(${maxExtrasPos})` });
          continue;
        }

      // Calcular precios
      let aloj = 0, extras = 0, limp = 0;
      const detalle = [];

      for (const u of subset) {
        // Buscar temporada especial
        const e = new Date(fecha_entrada + "T00:00:00Z");
        const s = new Date(fecha_salida   + "T00:00:00Z");
        const tempEsp = (temporadas ?? []).find(
          (t: any) => t.unidad_id === u.id && t.activa &&
            new Date(t.fecha_inicio + "T00:00:00Z") <= e &&
            new Date(t.fecha_fin   + "T00:00:00Z") >= s
        );

        const pn   = tempEsp ? tempEsp.precio_noche        : u.precio_noche;
        const pe   = tempEsp ? tempEsp.extra_huesped_noche : u.extra_huesped_noche;
        const pl   = tempEsp ? tempEsp.tarifa_limpieza     : u.tarifa_limpieza;
        const pmn  = tempEsp ? tempEsp.min_noches          : (u.min_noches ?? 1);
        const esEsp = !!tempEsp;

        console.log(`  [precio] ${u.nombre}: pn=${pn} pe=${pe} pl=${pl} pmn=${pmn} especial=${esEsp}`);

        // Distribuir extras (mayor capacidad base primero)
        // (simplificado inline para debug)
        const extU = 0; // se calcula abajo

        aloj += pn * noches;
        limp += pl;
        detalle.push({ unidad_id: u.id, nombre: u.nombre, precio_noche: pn, extra: pe, limpieza: pl, minNoches: pmn });
      }

      // Distribuir extras correctamente
      const extrasD: Record<string, number> = {};
      subset.forEach(u => extrasD[u.id] = 0);
      let rem = extrasTotal;
      const sorted = [...subset].sort((a, b) => b.capacidad_base - a.capacidad_base);
      for (const u of sorted) {
        if (rem <= 0) break;
        const puede = u.capacidad_maxima - u.capacidad_base;
        const asignar = Math.min(rem, puede);
        extrasD[u.id] = asignar;
        rem -= asignar;
      }

      // Recalcular con extras
      let totalAloj = 0, totalExtras = 0, totalLimp = 0;
      for (const u of subset) {
        const tempEsp = (temporadas ?? []).find(
          (t: any) => t.unidad_id === u.id && t.activa &&
            new Date(t.fecha_inicio + "T00:00:00Z") <= new Date(fecha_entrada + "T00:00:00Z") &&
            new Date(t.fecha_fin   + "T00:00:00Z") >= new Date(fecha_salida   + "T00:00:00Z")
        );
        const pn = tempEsp ? tempEsp.precio_noche        : u.precio_noche;
        const pe = tempEsp ? tempEsp.extra_huesped_noche : u.extra_huesped_noche;
        const pl = tempEsp ? tempEsp.tarifa_limpieza     : u.tarifa_limpieza;
        const extU = extrasD[u.id] ?? 0;
        totalAloj   += pn * noches;
        totalExtras += pe * extU * noches;
        totalLimp   += pl;
      }

      const base  = totalAloj + totalExtras;
      const desc  = tarifa === "NO_REEMBOLSABLE" ? Math.round(base * 0.1 * 100) / 100 : 0;
      const neto  = base - desc;
      const total = neto + totalLimp;
      const senal = tarifa === "NO_REEMBOLSABLE" ? total : Math.round(total * (porcSenal / 100) * 100) / 100;

      console.log(`  [OK${aplicarFiltroExceso ? "" : "-fallback"}] ${nombres} total=${total}`);

      resultados.push({
        unidades: subset.map(u => ({
          unidad_id: u.id,
          nombre: u.nombre,
          slug: u.slug,
          capacidad_base: u.capacidad_base,
          capacidad_maxima: u.capacidad_maxima,
          extras_asignados: extrasD[u.id] ?? 0,
          num_huespedes_asignados: u.capacidad_base + (extrasD[u.id] ?? 0),
        })),
        suma_capacidades_base:    sumaBase,
        suma_capacidades_maximas: sumaMax,
        extras_total:             extrasTotal,
        exceso_capacidad:         exceso,
        importe_alojamiento:      totalAloj,
        importe_extras:           totalExtras,
        importe_limpieza:         totalLimp,
        importe_base:             base,
        descuento:                desc,
        importe_neto:             neto,
        importe_total:            total,
        importe_senal:            senal,
        importe_resto:            total - senal,
        precio_por_persona:       Math.round((total / num_huespedes) * 100) / 100,
        precio_por_persona_noche: Math.round((total / num_huespedes / noches) * 100) / 100,
        num_unidades:             subset.length,
        es_sin_extras:            extrasTotal === 0,
        es_capacidad_exacta:      num_huespedes === sumaBase,
        noches,
        warnings: !aplicarFiltroExceso && exceso > MAX_EXCESO
          ? [`La capacidad del alojamiento (${sumaBase}) es mayor que tu grupo (${num_huespedes})`]
          : [],
      });
      } // fin del bucle for (mask)
    } // fin de evaluarCombinaciones

    // Pasada estricta (con filtro de exceso)
    evaluarCombinaciones(true);
    // Si no hay resultados, pasada fallback (sin filtro de exceso)
    // Esto cubre casas únicas de gran capacidad (ej: casa de 11 plazas con 7 huéspedes)
    if (resultados.length === 0) {
      console.log("[7b] Sin resultados en pasada estricta — ejecutando fallback sin filtro de exceso");
      evaluarCombinaciones(false);
    }

    // ── Ordenar ─────────────────────────────────────────────────────────────
    // 1. exceso_capacidad ASC — combinaciones exactas antes que sobredimensionadas
    // 2. num_unidades ASC     — menos unidades (menos logística)
    // 3. importe_total ASC    — más barata primero
    resultados.sort((a, b) => {
      if (a.exceso_capacidad !== b.exceso_capacidad) return a.exceso_capacidad - b.exceso_capacidad;
      if (a.num_unidades     !== b.num_unidades)     return a.num_unidades - b.num_unidades;
      return a.importe_total - b.importe_total;
    });

    console.log(`[8] ${resultados.length} combinaciones válidas`);
    console.log("[8] Ranking:", resultados.map((r, i) =>
      `#${i+1} [${r.unidades.map((u: any) => u.nombre).join("+")}] exceso=${r.exceso_capacidad} units=${r.num_unidades} total=${r.importe_total}`
    ));
    console.log("[8b] Rechazadas:", JSON.stringify(debugRechazadas));

    return new Response(
      JSON.stringify({
        combinaciones: resultados,
        debug_rechazadas: debugRechazadas,
        resumen: {
          total:           resultados.length,
          sin_extras:      resultados.filter((c: any) => c.es_sin_extras).length,
          con_extras:      resultados.filter((c: any) => !c.es_sin_extras).length,
          min_precio:      resultados[0]?.importe_total ?? null,
          recomendada_idx: 0,
        },
        disponibilidad: {
          unidades_totales:     unidades.length,
          unidades_disponibles: disponibles.length,
          unidades_ocupadas:    ocupadas.size,
        },
        input: { property_id, fecha_entrada, fecha_salida, num_huespedes, noches, tarifa },
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err) {
    console.error("[FATAL]", err);
    return new Response(
      JSON.stringify({ error: "Unexpected error", detail: String(err) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
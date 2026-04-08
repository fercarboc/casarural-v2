// supabase/functions/sync-ical-import/index.ts  [v2]
// Importa feeds iCal: crea bloqueos Y reservas mínimas pendientes de completar.
// POST { feedId? } — sin feedId sincroniza todos los feeds activos
// POST { feedIds: string[] } — sincroniza array de feeds

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ICalEvent {
  uid:     string;
  start:   string;
  end:     string;
  summary: string;
}

function parseICalEvents(icalText: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const lines = icalText
    .replace(/\r\n[ \t]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');

  let inEvent = false;
  let current: Partial<ICalEvent> = {};

  const parseDate = (line: string): string => {
    const value = line.includes(':') ? line.split(':').slice(1).join(':') : line;
    const raw   = value.trim();
    const clean = raw.split('T')[0].replace(/-/g, '');
    if (clean.length === 8) {
      return `${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}`;
    }
    return new Date(raw).toISOString().split('T')[0];
  };

  for (const line of lines) {
    if (line.trim() === 'BEGIN:VEVENT') { inEvent = true; current = {}; continue; }
    if (line.trim() === 'END:VEVENT') {
      if (current.start && current.end && current.uid) {
        events.push({
          uid:     current.uid,
          start:   current.start,
          end:     current.end,
          summary: current.summary ?? 'Reserva',
        });
      }
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;

    const keyBase = line.split(':')[0].split(';')[0].toUpperCase();
    if (keyBase === 'UID')     current.uid     = line.split(':').slice(1).join(':').trim();
    if (keyBase === 'DTSTART') current.start   = parseDate(line);
    if (keyBase === 'DTEND')   current.end     = parseDate(line);
    if (keyBase === 'SUMMARY') current.summary = line.split(':').slice(1).join(':').trim();
  }

  return events;
}

const ORIGEN_MAP: Record<string, string> = {
  BOOKING:       'BOOKING',
  AIRBNB:        'AIRBNB',
  ESCAPADARURAL: 'ESCAPADARURAL',
  OTRO:          'MANUAL',
};

const PLATAFORMA_LABEL: Record<string, string> = {
  BOOKING:       'Booking.com',
  AIRBNB:        'Airbnb',
  ESCAPADARURAL: 'Escapada Rural',
  OTRO:          'Externo',
};

/** Ignora eventos que Airbnb/Booking insertan para bloquear disponibilidad (no son reservas reales). */
function isAvailabilityBlock(summary: string): boolean {
  const s = summary.toLowerCase();
  return (
    s.includes('not available') ||
    s.includes('no disponible') ||
    s.includes('closed') ||
    s.includes('bloqueado') ||
    s.includes('airbnb (not available)') ||
    s === 'airbnb'
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { feedId, feedIds } = body;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Obtener feeds a sincronizar
    let query = supabase
      .from('feeds_ical')
      .select('id, plataforma, url, unidad_id, property_id')
      .eq('activo', true);

    if (feedId)              query = query.eq('id', feedId);
    else if (feedIds?.length) query = query.in('id', feedIds);

    const { data: feeds } = await query;

    if (!feeds?.length) {
      return Response.json({ message: 'No hay feeds activos' }, { headers: corsHeaders });
    }

    const results = [];

    for (const feed of feeds) {
      const origenBloqueo = ORIGEN_MAP[feed.plataforma] ?? 'MANUAL';
      const plataformaLabel = PLATAFORMA_LABEL[feed.plataforma] ?? feed.plataforma;

      try {
        // ── 1. Descargar y parsear iCal ──────────────────────────────
        const response = await fetch(feed.url, { signal: AbortSignal.timeout(15_000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const icalText = await response.text();
        const events   = parseICalEvents(icalText);

        // Filtrar eventos pasados
        const cutoff    = new Date();
        cutoff.setDate(cutoff.getDate() - 1);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        const eventosFuturos = events.filter(e => e.end > cutoffStr);

        const MAX_NOCHES = 60;
        const eventosValidos = eventosFuturos.filter(e => {
          const noches = Math.round(
            (new Date(e.end).getTime() - new Date(e.start).getTime()) / 86_400_000
          );
          return noches > 0 && noches <= MAX_NOCHES;
        });

        // ── 2. Bloqueos: eliminar anteriores de este feed e insertar nuevos ──
        await supabase
          .from('bloqueos')
          .delete()
          .eq('unidad_id', feed.unidad_id)
          .eq('origen', origenBloqueo);

        let creadosBloqueos = 0;
        if (eventosValidos.length > 0) {
          const bloqueosNuevos = eventosValidos.map(e => ({
            property_id:  feed.property_id,
            unidad_id:    feed.unidad_id,
            fecha_inicio: e.start,
            fecha_fin:    e.end,
            motivo:       `${feed.plataforma}: ${e.summary}`,
            origen:       origenBloqueo,
            uid_ical:     e.uid,
          }));

          const { error: insertBloqueosError } = await supabase
            .from('bloqueos')
            .insert(bloqueosNuevos);

          if (insertBloqueosError) throw insertBloqueosError;
          creadosBloqueos = eventosValidos.length;
        }

        // ── 3. Reservas: obtener ya existentes para este origen+unidad ──
        // Consultamos via reserva_unidades para no duplicar en re-sincronizaciones.
        const { data: ruExistentes } = await supabase
          .from('reserva_unidades')
          .select('reserva_id, reservas!inner(id, fecha_entrada, origen)')
          .eq('unidad_id', feed.unidad_id)
          .eq('reservas.origen', origenBloqueo);

        const fechasYaImportadas = new Set<string>(
          (ruExistentes ?? []).map((row: any) => row.reservas?.fecha_entrada).filter(Boolean)
        );

        // Filtrar solo eventos que son reservas reales (no bloques de disponibilidad)
        const eventosReserva = eventosValidos.filter(
          e => !isAvailabilityBlock(e.summary)
        );

        let creadosReservas = 0;
        let omitidosReservas = 0;

        for (const evento of eventosReserva) {
          // Saltar si ya existe una reserva importada con esta fecha de entrada
          if (fechasYaImportadas.has(evento.start)) {
            omitidosReservas++;
            continue;
          }

          const noches = Math.round(
            (new Date(evento.end).getTime() - new Date(evento.start).getTime()) / 86_400_000
          );

          // Insertar reserva mínima — el admin la completará manualmente
          const { data: reserva, error: reservaError } = await supabase
            .from('reservas')
            .insert({
              property_id:         feed.property_id,
              fecha_entrada:       evento.start,
              fecha_salida:        evento.end,
              noches,
              num_huespedes:       1,
              nombre_cliente:      plataformaLabel,
              apellidos_cliente:   evento.summary,
              email_cliente:       'pendiente@ical.import',
              telefono_cliente:    '',
              nif_cliente:         '',
              tarifa:              'FLEXIBLE',
              importe_alojamiento: 0,
              importe_extras:      0,
              importe_limpieza:    0,
              descuento_aplicado:  0,
              importe_total:       0,
              importe_senal:       null,
              importe_resto:       null,
              iva_porcentaje:      10,
              importe_iva:         0,
              importe_base:        0,
              estado:              'CONFIRMED',
              estado_pago:         'PAID',
              origen:              origenBloqueo,
            })
            .select('id')
            .single();

          if (reservaError) {
            console.error('Error creando reserva iCal:', reservaError.message);
            continue;
          }

          // Crear pivote reserva_unidades
          const { error: ruError } = await supabase
            .from('reserva_unidades')
            .insert({
              reserva_id:    reserva.id,
              unidad_id:     feed.unidad_id,
              num_huespedes: 1,
              importe:       0,
              desglose:      {},
            });

          if (ruError) {
            console.error('Error creando reserva_unidades iCal:', ruError.message);
            // Rollback de la reserva si falla el pivote
            await supabase.from('reservas').delete().eq('id', reserva.id);
            continue;
          }

          creadosReservas++;
          fechasYaImportadas.add(evento.start); // evitar duplicados dentro del mismo sync
        }

        // ── 4. Actualizar feed ────────────────────────────────────────
        await supabase.from('feeds_ical').update({
          ultima_sync:  new Date().toISOString(),
          error_ultimo: null,
        }).eq('id', feed.id);

        // ── 5. Log ────────────────────────────────────────────────────
        await supabase.from('logs_ical').insert({
          feed_id:           feed.id,
          unidad_id:         feed.unidad_id,
          property_id:       feed.property_id,
          estado:            'OK',
          bloqueos_creados:  creadosBloqueos,
          bloqueos_omitidos: eventosFuturos.length - eventosValidos.length,
          detalle: [
            `Total feed: ${events.length}`,
            `Válidos: ${eventosValidos.length}`,
            `Bloqueos: ${creadosBloqueos}`,
            `Reservas nuevas: ${creadosReservas}`,
            omitidosReservas > 0 ? `Reservas ya existentes: ${omitidosReservas}` : null,
          ].filter(Boolean).join(' | '),
        });

        results.push({
          feed_id:           feed.id,
          plataforma:        feed.plataforma,
          unidad_id:         feed.unidad_id,
          status:            'OK',
          bloqueos_creados:  creadosBloqueos,
          reservas_creadas:  creadosReservas,
          reservas_omitidas: omitidosReservas,
        });

      } catch (feedErr) {
        const errMsg = feedErr instanceof Error ? feedErr.message : String(feedErr);

        await supabase.from('feeds_ical').update({ error_ultimo: errMsg }).eq('id', feed.id);
        await supabase.from('logs_ical').insert({
          feed_id:     feed.id,
          unidad_id:   feed.unidad_id,
          property_id: feed.property_id,
          estado:      'ERROR',
          detalle:     errMsg,
        });

        results.push({
          feed_id:    feed.id,
          plataforma: feed.plataforma,
          status:     'ERROR',
          error:      errMsg,
        });
      }
    }

    return Response.json({ results }, { headers: corsHeaders });

  } catch (err) {
    console.error('sync-ical-import error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
});

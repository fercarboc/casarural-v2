// supabase/functions/sync-ical-import/index.ts  [v2]
// Importa feeds iCal y guarda bloqueos con unidad_id
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
        events.push({ uid: current.uid, start: current.start, end: current.end, summary: current.summary ?? 'Reserva' });
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

    if (feedId)        query = query.eq('id', feedId);
    else if (feedIds?.length) query = query.in('id', feedIds);

    const { data: feeds } = await query;

    if (!feeds?.length) {
      return Response.json({ message: 'No hay feeds activos' }, { headers: corsHeaders });
    }

    const results = [];

    for (const feed of feeds) {
      const origenBloqueo = ORIGEN_MAP[feed.plataforma] ?? 'MANUAL';

      try {
        // 1. Descargar iCal
        const response  = await fetch(feed.url, { signal: AbortSignal.timeout(15_000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const icalText  = await response.text();
        const events    = parseICalEvents(icalText);

        // Filtrar eventos pasados
        const cutoff = new Date();
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

        // 2. Eliminar bloqueos anteriores de este feed
        await supabase
          .from('bloqueos')
          .delete()
          .eq('unidad_id', feed.unidad_id)
          .eq('origen', origenBloqueo);

        // 3. Insertar bloqueos nuevos con unidad_id
        let creados = 0;
        if (eventosValidos.length > 0) {
          const bloqueosNuevos = eventosValidos.map(e => ({
            property_id:  feed.property_id,
            unidad_id:    feed.unidad_id,   // ← clave de v2
            fecha_inicio: e.start,
            fecha_fin:    e.end,
            motivo:       `${feed.plataforma}: ${e.summary}`,
            origen:       origenBloqueo,
            uid_ical:     e.uid,
          }));

          const { error: insertError } = await supabase
            .from('bloqueos')
            .insert(bloqueosNuevos);

          if (insertError) throw insertError;
          creados = eventosValidos.length;
        }

        // 4. Actualizar feed
        await supabase.from('feeds_ical').update({
          ultima_sync:  new Date().toISOString(),
          error_ultimo: null,
        }).eq('id', feed.id);

        // 5. Log
        await supabase.from('logs_ical').insert({
          feed_id:           feed.id,
          unidad_id:         feed.unidad_id,
          property_id:       feed.property_id,
          estado:            'OK',
          bloqueos_creados:  creados,
          bloqueos_omitidos: eventosFuturos.length - eventosValidos.length,
          detalle:           `Total feed: ${events.length} | Futuros válidos: ${eventosValidos.length}`,
        });

        results.push({
          feed_id:          feed.id,
          plataforma:       feed.plataforma,
          unidad_id:        feed.unidad_id,
          status:           'OK',
          bloqueos_creados: creados,
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

        results.push({ feed_id: feed.id, plataforma: feed.plataforma, status: 'ERROR', error: errMsg });
      }
    }

    return Response.json({ results }, { headers: corsHeaders });

  } catch (err) {
    console.error('sync-ical-import error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
});
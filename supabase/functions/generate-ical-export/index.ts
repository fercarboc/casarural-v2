// supabase/functions/generate-ical-export/index.ts  [v2]
// Genera el feed iCal de UNA unidad para exportar a OTAs
// GET ?unidad_slug=casa-principal
// GET ?property_id=xxx  → agrega TODAS las unidades de la propiedad (feed finca)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const url         = new URL(req.url);
    const unidadSlug  = url.searchParams.get('unidad_slug');
    const propertyId  = url.searchParams.get('property_id');

    if (!unidadSlug && !propertyId) {
      return new Response('Missing unidad_slug or property_id', { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const today         = new Date().toISOString().split('T')[0];
    const unAnoAdelante = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let unidadIds: string[] = [];
    let calName = 'Disponibilidad';

    if (unidadSlug) {
      // Feed de una unidad concreta
      const { data: unidad } = await supabase
        .from('unidades')
        .select('id, nombre')
        .eq('slug', unidadSlug)
        .single();

      if (!unidad) return new Response('Unidad no encontrada', { status: 404 });
      unidadIds = [unidad.id];
      calName   = unidad.nombre;
    } else {
      // Feed agregado de toda la finca
      const { data: unidades } = await supabase
        .from('unidades')
        .select('id, nombre')
        .eq('property_id', propertyId!)
        .eq('activa', true);

      unidadIds = (unidades ?? []).map((u: any) => u.id);
      calName   = 'Finca — Todas las unidades';
    }

    // Reservas confirmadas que ocupan estas unidades
    const { data: reservaUnidades } = await supabase
      .from('reserva_unidades')
      .select('reserva_id, unidad_id')
      .in('unidad_id', unidadIds);

    const reservaIds = [...new Set((reservaUnidades ?? []).map((ru: any) => ru.reserva_id))];

    const [reservasResult, bloqueosResult] = await Promise.all([
      reservaIds.length
        ? supabase
            .from('reservas')
            .select('id, fecha_entrada, fecha_salida')
            .in('id', reservaIds)
            .eq('estado', 'CONFIRMED')
            .gte('fecha_salida', today)
            .lte('fecha_entrada', unAnoAdelante)
        : { data: [] },
      supabase
        .from('bloqueos')
        .select('id, fecha_inicio, fecha_fin, motivo')
        .in('unidad_id', unidadIds)
        .neq('origen', 'RESERVA') // los bloqueos de reservas ya los tenemos arriba
        .gte('fecha_fin', today),
    ]);

    const fmt  = (d: string) => d.replace(/-/g, '');
    const now  = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const domain = unidadSlug
      ? `${unidadSlug}.casarural`
      : 'finca.casarural';

    const vevents: string[] = [];

    reservasResult.data?.forEach((r: any) => {
      vevents.push([
        'BEGIN:VEVENT',
        `DTSTART;VALUE=DATE:${fmt(r.fecha_entrada)}`,
        `DTEND;VALUE=DATE:${fmt(r.fecha_salida)}`,
        `SUMMARY:Reserva confirmada`,
        `UID:reserva-${r.id}@${domain}`,
        `DTSTAMP:${now}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
      ].join('\r\n'));
    });

    bloqueosResult.data?.forEach((b: any) => {
      vevents.push([
        'BEGIN:VEVENT',
        `DTSTART;VALUE=DATE:${fmt(b.fecha_inicio)}`,
        `DTEND;VALUE=DATE:${fmt(b.fecha_fin)}`,
        `SUMMARY:${b.motivo ?? 'Bloqueado'}`,
        `UID:bloqueo-${b.id}@${domain}`,
        `DTSTAMP:${now}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
      ].join('\r\n'));
    });

    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//La Rasilla//${calName}//ES`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${calName}`,
      'X-WR-TIMEZONE:Europe/Madrid',
      ...vevents,
      'END:VCALENDAR',
    ].join('\r\n');

    const filename = unidadSlug ? `${unidadSlug}.ics` : 'finca.ics';

    return new Response(ical, {
      headers: {
        'Content-Type':        'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control':       'no-cache',
      },
    });

  } catch (err) {
    console.error('generate-ical-export error:', err);
    return new Response('Internal server error', { status: 500 });
  }
});
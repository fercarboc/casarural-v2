// supabase/functions/get-config/index.ts  [v2]
// Devuelve configuración de la propiedad + unidades (con precios) + periodos especiales
// GET ?property_slug=la-rasilla  |  GET ?property_id=xxx

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url          = new URL(req.url);
    let property_id    = url.searchParams.get('property_id');
    const propertySlug = url.searchParams.get('property_slug');

    // También acepta body JSON para compatibilidad POST
    if ((!property_id && !propertySlug) && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      property_id = body.property_id ?? null;
      if (!property_id && body.property_slug) {
        const { data: prop } = await createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        ).from('properties').select('id').eq('slug', body.property_slug).single();
        property_id = prop?.id ?? null;
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Resolver property_id desde slug si hace falta
    if (!property_id && propertySlug) {
      const { data: prop } = await supabase
        .from('properties')
        .select('id')
        .eq('slug', propertySlug)
        .single();
      property_id = prop?.id ?? null;
    }

    if (!property_id) {
      return new Response(
        JSON.stringify({ error: 'Missing property_id or property_slug' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener propiedad, unidades y periodos en paralelo
    const [propResult, unidadesResult, periodosResult] = await Promise.all([
      supabase
        .from('properties')
        .select('id, nombre, slug, telefono, email, descripcion, localidad, provincia')
        .eq('id', property_id)
        .single(),
      supabase
        .from('unidades')
        .select([
          'id', 'nombre', 'slug', 'tipo',
          'capacidad_base', 'capacidad_maxima',
          'num_habitaciones', 'num_banos', 'superficie_m2',
          'fotos', 'amenities', 'orden',
          'precio_noche', 'extra_huesped_noche', 'tarifa_limpieza', 'min_noches',
          'precio_noche_especial', 'extra_huesped_especial', 'tarifa_limpieza_especial', 'min_noches_especial',
        ].join(', '))
        .eq('property_id', property_id)
        .eq('activa', true)
        .order('orden'),
      supabase
        .from('periodos_especiales')
        .select('id, nombre, fecha_inicio, fecha_fin, activa')
        .eq('property_id', property_id)
        .eq('activa', true)
        .order('fecha_inicio'),
    ]);

    if (propResult.error) {
      return new Response(
        JSON.stringify({ error: 'Propiedad no encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Política de cancelación (fija por ahora)
    const politicaCancelacion = [
      { min_dias: 60, reembolso: 100, descripcion: '100% de reembolso' },
      { min_dias: 45, reembolso: 50,  descripcion: '50% de reembolso' },
      { min_dias: 30, reembolso: 25,  descripcion: '25% de reembolso' },
      { min_dias: 0,  reembolso: 0,   descripcion: 'Sin reembolso' },
    ];

    return new Response(
      JSON.stringify({
        property:              propResult.data,
        unidades:              unidadesResult.data ?? [],
        periodos_especiales:   periodosResult.data ?? [],
        politica_cancelacion:  politicaCancelacion,
        descuento_no_reembolsable: 10,
        porcentaje_senal:          30,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[get-config] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

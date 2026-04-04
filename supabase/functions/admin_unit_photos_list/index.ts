// supabase/functions/admin_unit_photos_list/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Missing access token" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          detail: userError?.message ?? "No authenticated user",
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await req.json().catch(() => null);
    const unidadId = body?.unidad_id as string | undefined;

    if (!unidadId) {
      return new Response(
        JSON.stringify({ error: "unidad_id es obligatorio" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: unidad, error: unidadError } = await supabase
      .from("unidades")
      .select("id, property_id, nombre")
      .eq("id", unidadId)
      .single();

    if (unidadError || !unidad) {
      return new Response(
        JSON.stringify({
          error: "Unidad no encontrada",
          detail: unidadError?.message ?? null,
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("property_users")
      .select("id, rol")
      .eq("property_id", unidad.property_id)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({
          error: "Forbidden",
          detail: membershipError?.message ?? null,
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: photos, error: photosError } = await admin
      .from("unidad_fotos")
      .select(`
        id,
        unidad_id,
        property_id,
        storage_path,
        public_url,
        orden,
        es_portada,
        activa,
        created_at,
        updated_at
      `)
      .eq("unidad_id", unidadId)
      .eq("activa", true)
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true });

    if (photosError) {
      return new Response(
        JSON.stringify({
          error: "Error obteniendo fotos",
          detail: photosError.message,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        unidad: {
          id: unidad.id,
          nombre: unidad.nombre,
          property_id: unidad.property_id,
        },
        photos: photos ?? [],
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Unexpected error",
        detail: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
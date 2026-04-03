// supabase/functions/admin_unit_photo_set_portada/index.ts

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

    // 🔐 Usuario autenticado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // 📦 Body
    const body = await req.json().catch(() => null);
    const photoId = body?.photo_id as string | undefined;

    if (!photoId) {
      return new Response(
        JSON.stringify({ error: "photo_id es obligatorio" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 🔧 Cliente admin
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 🔎 Buscar foto
    const { data: photo, error: photoError } = await admin
      .from("unidad_fotos")
      .select(`
        id,
        unidad_id,
        property_id,
        activa
      `)
      .eq("id", photoId)
      .single();

    if (photoError || !photo) {
      return new Response(
        JSON.stringify({ error: "Foto no encontrada" }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (!photo.activa) {
      return new Response(
        JSON.stringify({ error: "Foto no activa" }),
        { status: 409, headers: corsHeaders }
      );
    }

    // 🔐 Verificar propiedad
    const { data: membership } = await supabase
      .from("property_users")
      .select("id")
      .eq("property_id", photo.property_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: corsHeaders }
      );
    }

    // 🔁 1. Quitar portada a todas las fotos de la unidad
    const { error: resetError } = await admin
      .from("unidad_fotos")
      .update({ es_portada: false })
      .eq("unidad_id", photo.unidad_id);

    if (resetError) {
      return new Response(
        JSON.stringify({
          error: "Error reseteando portada",
          detail: resetError.message,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // ⭐ 2. Marcar esta como portada
    const { error: setError } = await admin
      .from("unidad_fotos")
      .update({ es_portada: true })
      .eq("id", photo.id);

    if (setError) {
      return new Response(
        JSON.stringify({
          error: "Error marcando portada",
          detail: setError.message,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 🔄 3. Sincronizar en tabla unidades
    const { error: syncError } = await admin.rpc("sync_unidad_portada", {
      p_unidad_id: photo.unidad_id,
    });

    if (syncError) {
      return new Response(
        JSON.stringify({
          error: "Portada actualizada pero falló sync",
          detail: syncError.message,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        photo_id: photo.id,
        unidad_id: photo.unidad_id,
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
// supabase/functions/admin_unit_photo_delete/index.ts

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

    const body = await req.json().catch(() => null);
    const photoId = body?.photo_id as string | undefined;

    if (!photoId) {
      return new Response(
        JSON.stringify({ error: "photo_id es obligatorio" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1) Buscar foto
    const { data: photo, error: photoError } = await admin
      .from("unidad_fotos")
      .select(`
        id,
        unidad_id,
        property_id,
        storage_path,
        public_url,
        es_portada,
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
        JSON.stringify({ error: "La foto ya está desactivada" }),
        { status: 409, headers: corsHeaders }
      );
    }

    // 2) Verificar que el usuario pertenece a la propiedad
    const { data: membership, error: membershipError } = await supabase
      .from("property_users")
      .select("id, rol")
      .eq("property_id", photo.property_id)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: corsHeaders }
      );
    }

    // 3) Borrar del storage
    const { error: removeStorageError } = await admin.storage
      .from("unidades-fotos")
      .remove([photo.storage_path]);

    if (removeStorageError) {
      return new Response(
        JSON.stringify({
          error: "Error eliminando archivo de Storage",
          detail: removeStorageError.message,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 4) Desactivar en BD (borrado lógico)
    const { error: updateError } = await admin
      .from("unidad_fotos")
      .update({
        activa: false,
        es_portada: false,
      })
      .eq("id", photo.id);

    if (updateError) {
      return new Response(
        JSON.stringify({
          error: "Error actualizando foto en BD",
          detail: updateError.message,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 5) Resincronizar portada
    const { error: syncError } = await admin.rpc("sync_unidad_portada", {
      p_unidad_id: photo.unidad_id,
    });

    if (syncError) {
      return new Response(
        JSON.stringify({
          error: "Foto eliminada pero falló sync_unidad_portada",
          detail: syncError.message,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted_photo_id: photo.id,
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
// supabase/functions/admin_unit_photo_upload/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 🔹 CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 🔹 1. Crear cliente con JWT del usuario
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: req.headers.get("Authorization")!,
          },
        },
      }
    );

    // 🔹 2. Usuario autenticado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // 🔹 3. Parse multipart
    const formData = await req.formData();

    const unidadId = formData.get("unidad_id") as string;
    const file = formData.get("file") as File;

    if (!unidadId || !file) {
      return new Response(
        JSON.stringify({ error: "unidad_id y file son obligatorios" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 🔹 4. Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      return new Response(
        JSON.stringify({ error: "El archivo debe ser una imagen" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "Máximo 5MB permitido" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 🔹 5. Obtener unidad
    const { data: unidad, error: unidadError } = await supabase
      .from("unidades")
      .select("id, property_id")
      .eq("id", unidadId)
      .single();

    if (unidadError || !unidad) {
      return new Response(JSON.stringify({ error: "Unidad no encontrada" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const propertyId = unidad.property_id;

    // 🔹 6. Verificar que el usuario pertenece a la property
    const { data: membership } = await supabase
      .from("property_users")
      .select("id")
      .eq("property_id", propertyId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    // 🔹 7. Crear cliente SERVICE ROLE (para storage + insert seguro)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 🔹 8. Generar path
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;

    const path = `${propertyId}/${unidadId}/${fileName}`;

    // 🔹 9. Subir a Storage
    const { error: uploadError } = await admin.storage
      .from("unidades-fotos")
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: "Error subiendo imagen", detail: uploadError }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 🔹 10. Obtener URL pública
    const { data: publicUrlData } = admin.storage
      .from("unidades-fotos")
      .getPublicUrl(path);

    const publicUrl = publicUrlData.publicUrl;

    // 🔹 11. Obtener orden siguiente
    const { data: lastPhoto } = await admin
      .from("unidad_fotos")
      .select("orden")
      .eq("unidad_id", unidadId)
      .order("orden", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = lastPhoto ? lastPhoto.orden + 1 : 0;

    // 🔹 12. Insertar en BD
    const { data: insertedPhoto, error: insertError } = await admin
      .from("unidad_fotos")
      .insert({
        property_id: propertyId,
        unidad_id: unidadId,
        storage_path: path,
        public_url: publicUrl,
        orden: nextOrder,
        es_portada: nextOrder === 0, // primera = portada
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Error guardando en BD", detail: insertError }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 🔹 13. Sincronizar portada
    await admin.rpc("sync_unidad_portada", {
      p_unidad_id: unidadId,
    });

    // 🔹 14. Respuesta OK
    return new Response(
      JSON.stringify({
        success: true,
        photo: insertedPhoto,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Unexpected error",
        detail: String(err),
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
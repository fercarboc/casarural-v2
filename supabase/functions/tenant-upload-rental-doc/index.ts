// supabase/functions/tenant-upload-rental-doc/index.ts
// Subida pública de documentos por el inquilino durante la solicitud de alquiler.
// Autenticación ligera: verifica que rental_id + email coincidan con la solicitud.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const formData = await req.formData();
    const file         = formData.get("file")          as File   | null;
    const rental_id    = formData.get("rental_id")     as string | null;
    const email        = formData.get("email")         as string | null;
    const document_type = formData.get("document_type") as string | null;

    if (!file || !rental_id || !email || !document_type) {
      return new Response(
        JSON.stringify({ error: "Faltan parámetros: file, rental_id, email, document_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tipos permitidos
    const ALLOWED_TYPES = ["DNI", "NOMINA", "CONTRATO_LABORAL", "VIDA_LABORAL", "DECLARACION_RENTA", "JUSTIFICANTE_BANCO", "OTRO"];
    if (!ALLOWED_TYPES.includes(document_type)) {
      return new Response(
        JSON.stringify({ error: "Tipo de documento no permitido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tamaño máximo 10 MB
    if (file.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "El archivo supera el tamaño máximo de 10 MB" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verificar que la solicitud existe y el email coincide (estado SOLICITUD solamente)
    const { data: rental, error: rentalErr } = await supabase
      .from("rentals")
      .select("id, property_id, cliente_email, estado")
      .eq("id", rental_id)
      .single();

    if (rentalErr || !rental) {
      return new Response(
        JSON.stringify({ error: "Solicitud no encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (rental.cliente_email?.toLowerCase() !== email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "El email no coincide con la solicitud" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (rental.estado !== "SOLICITUD") {
      return new Response(
        JSON.stringify({ error: "Solo se pueden adjuntar documentos en el estado SOLICITUD" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Subir archivo a Storage
    const bytes = await file.arrayBuffer();
    const timestamp = Date.now();
    const safeName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = `${rental.property_id}/${rental_id}/${document_type}/${safeName}`;

    const { error: uploadErr } = await supabase.storage
      .from("rental-documents")
      .upload(filePath, bytes, { contentType: file.type, upsert: false });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      return new Response(
        JSON.stringify({ error: "Error al subir el archivo", detail: uploadErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Registrar en rental_documents
    const { error: dbErr } = await supabase.from("rental_documents").insert({
      property_id:   rental.property_id,
      rental_id,
      document_type,
      file_path:     filePath,
      file_name:     file.name,
      file_size:     file.size,
      mime_type:     file.type,
      estado:        "PENDIENTE",
    });

    if (dbErr) {
      console.error("DB error:", dbErr);
      // El archivo ya está en Storage, solo logueamos el error de BD
    }

    return new Response(
      JSON.stringify({ ok: true, file_path: filePath }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Error inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

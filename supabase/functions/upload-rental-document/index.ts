// supabase/functions/upload-rental-document/index.ts
// POST multipart/form-data: { file, rental_id, document_type, property_id }
// Returns: { document_id, file_path, file_name }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Verify JWT — only authenticated admins can upload
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Sin autorización')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Validate the calling user's JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    ).auth.getUser(token)
    if (authErr || !user) throw new Error('Token inválido')

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const rental_id = formData.get('rental_id') as string | null
    const document_type = formData.get('document_type') as string | null
    const property_id = formData.get('property_id') as string | null

    if (!file || !rental_id || !document_type || !property_id) {
      throw new Error('Faltan campos: file, rental_id, document_type, property_id')
    }

    // Verify user belongs to this property
    const { count } = await supabase
      .from('property_users')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', property_id)
      .eq('user_id', user.id)
    if ((count ?? 0) === 0) throw new Error('Sin permisos para esta propiedad')

    // Sanitize filename
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const safeName = `${document_type}_${Date.now()}.${ext}`
    const filePath = `${property_id}/${rental_id}/${document_type}/${safeName}`

    // Upload to Storage
    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadErr } = await supabase.storage
      .from('rental-documents')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      })
    if (uploadErr) throw uploadErr

    // Insert record in rental_documents
    const { data: doc, error: insertErr } = await supabase
      .from('rental_documents')
      .insert({
        property_id,
        rental_id,
        document_type,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        estado: 'PENDIENTE',
      })
      .select('*')
      .single()
    if (insertErr) throw insertErr

    return new Response(JSON.stringify({ ok: true, document: doc }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

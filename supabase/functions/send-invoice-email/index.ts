// supabase/functions/send-invoice-email/index.ts
// POST { facturaId, propertyId }
// Sends the invoice PDF via email using Resend and records the audit event.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendKey   = Deno.env.get('RESEND_API_KEY');
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { facturaId, propertyId } = await req.json();
    if (!facturaId || !propertyId) return json({ error: 'facturaId y propertyId son obligatorios' }, 400);

    // Cargar factura
    const { data: factura, error: fErr } = await db
      .from('facturas')
      .select('*')
      .eq('id', facturaId)
      .eq('property_id', propertyId)
      .single();

    if (fErr || !factura) return json({ error: 'Factura no encontrada' }, 404);

    const destinatario = factura.email_cliente;
    if (!destinatario) return json({ error: 'La factura no tiene email de cliente' }, 422);

    if (!resendKey) {
      // Modo desarrollo: simular envío
      await db.from('factura_eventos').insert({
        factura_id:  facturaId,
        property_id: propertyId,
        tipo_evento: 'EMAIL_ENVIADO',
        descripcion: `[DEV] Email simulado a ${destinatario}`,
        payload: { email: destinatario, dev_mode: true },
      });
      return json({ sent: false, dev_mode: true, message: 'RESEND_API_KEY no configurada — email simulado' });
    }

    // Cargar configuración de la propiedad
    const { data: property } = await db
      .from('properties')
      .select('nombre, resend_from_name, resend_from_email')
      .eq('id', propertyId)
      .single();

    const fromName  = property?.resend_from_name  ?? property?.nombre ?? 'Casa Rural';
    const fromEmail = property?.resend_from_email ?? `noreply@${Deno.env.get('APP_DOMAIN') ?? 'example.com'}`;

    // Enviar email con Resend (texto básico — PDF generation está en el frontend)
    const emailBody = {
      from: `${fromName} <${fromEmail}>`,
      to:   [destinatario],
      subject: `Factura ${factura.numero} — ${fromName}`,
      html: `
        <p>Estimado/a ${factura.nombre},</p>
        <p>Adjuntamos su factura <strong>${factura.numero}</strong> por importe de <strong>${factura.total?.toFixed(2)} €</strong>.</p>
        <p>Puede descargar el PDF desde el portal de su reserva o solicitárnoslo respondiendo a este email.</p>
        <p>Gracias por su estancia.</p>
        <p>Un saludo,<br>${fromName}</p>
      `,
    };

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emailBody),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      return json({ error: `Resend error: ${errText}` }, 502);
    }

    const resendData = await resendRes.json();

    // Marcar factura enviada + registrar evento
    await Promise.all([
      db.from('facturas').update({ estado: 'ENVIADA' }).eq('id', facturaId),
      db.from('factura_eventos').insert({
        factura_id:  facturaId,
        property_id: propertyId,
        tipo_evento: 'EMAIL_ENVIADO',
        descripcion: `Email enviado a ${destinatario}`,
        payload: { email: destinatario, resend_id: resendData.id },
      }),
    ]);

    return json({ sent: true, resend_id: resendData.id });
  } catch (err: any) {
    return json({ error: err.message ?? 'Error interno' }, 500);
  }
});

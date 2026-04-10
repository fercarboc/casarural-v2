// supabase/functions/send-presupuesto/index.ts
// POST — registra una consulta tipo PRESUPUESTO y envía email al cliente.
// Llamado desde el panel admin (PreReservaModal).

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

function str(v: unknown, fallback = '') {
  if (typeof v === 'string' && v.trim()) return v.trim()
  if (v == null) return fallback
  return String(v)
}

function money(v: number) {
  return v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function formatDate(d: string) {
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch { return d }
}

function buildEmail(params: {
  propNombre: string
  propTagline: string
  propAddress: string
  propPhone: string
  propEmail: string
  checkinTime: string
  checkoutTime: string
  appUrl: string
  guestName: string
  fechaEntrada: string
  fechaSalida: string
  noches: number
  numHuespedes: number
  unidadNombres: string
  precioCalculado: number
  descuento: number
  precioFinal: number
  comentarios: string
}): string {
  const {
    propNombre, propTagline, propAddress, propPhone, propEmail,
    checkinTime, checkoutTime, appUrl,
    guestName, fechaEntrada, fechaSalida, noches, numHuespedes,
    unidadNombres, precioCalculado, descuento, precioFinal, comentarios,
  } = params

  const filaDescuento = descuento > 0 ? `
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;">🏷️ Descuento</td>
            <td style="padding:6px 0;font-weight:600;color:#c0392b;">- ${money(descuento)}</td>
          </tr>` : ''

  const bloqueComentarios = comentarios ? `
      <tr><td style="padding:0 40px 20px;">
        <div style="background:#F0F7F4;border-left:3px solid #2D4A3E;border-radius:8px;padding:14px 18px;font-size:13px;color:#333;">
          <strong>Notas de la propiedad:</strong><br>${comentarios.replace(/\n/g, '<br>')}
        </div>
      </td></tr>` : ''

  const botonReservar = appUrl ? `
      <tr><td style="padding:8px 40px 20px;text-align:center;">
        <a href="${appUrl}" style="display:inline-block;background:#2D4A3E;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;">Reservar ahora →</a>
      </td></tr>` : ''

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Presupuesto</title></head>
<body style="margin:0;padding:0;background:#F5F5F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.09);">

      <tr>
        <td style="background:#2D4A3E;padding:32px 40px 28px;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#fff;font-family:Georgia,serif;">${propNombre}</p>
          <p style="margin:6px 0 0;font-size:13px;color:#A5C8BE;">${propTagline}</p>
        </td>
      </tr>

      <tr><td style="padding:32px 40px 8px;">
        <p style="margin:0;font-size:20px;font-weight:700;color:#1C2B25;">🏡 Presupuesto personalizado</p>
        <p style="margin:8px 0 0;font-size:14px;color:#555;">Hola <strong>${guestName}</strong>, hemos preparado este presupuesto especialmente para ti. Revisa los detalles a continuación.</p>
      </td></tr>

      <tr><td style="padding:16px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F7F4;border-radius:12px;padding:20px 24px;font-size:14px;">
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;width:50%;">📅 Check-in</td>
            <td style="padding:6px 0;font-weight:600;color:#1C2B25;">${formatDate(fechaEntrada)}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;">⏰ Hora entrada</td>
            <td style="padding:6px 0;font-weight:600;color:#1C2B25;">${checkinTime} h</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;">📅 Check-out</td>
            <td style="padding:6px 0;font-weight:600;color:#1C2B25;">${formatDate(fechaSalida)}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;">⏰ Hora salida</td>
            <td style="padding:6px 0;font-weight:600;color:#1C2B25;">${checkoutTime} h</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;">🌙 Noches</td>
            <td style="padding:6px 0;font-weight:600;color:#1C2B25;">${noches}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;">👥 Huéspedes</td>
            <td style="padding:6px 0;font-weight:600;color:#1C2B25;">${numHuespedes}</td>
          </tr>
          ${unidadNombres ? `<tr>
            <td style="padding:6px 12px 6px 0;color:#555;">🏠 Alojamiento</td>
            <td style="padding:6px 0;font-weight:600;color:#1C2B25;">${unidadNombres}</td>
          </tr>` : ''}
        </table>
      </td></tr>

      <tr><td style="padding:4px 40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e7;border:1px solid #e0c96e;border-radius:12px;padding:20px 24px;font-size:14px;">
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;width:50%;">💶 Precio estancia</td>
            <td style="padding:6px 0;font-weight:600;color:#1C2B25;">${money(precioCalculado)}</td>
          </tr>
          ${filaDescuento}
          <tr>
            <td style="padding:10px 12px 6px 0;color:#1C2B25;font-weight:700;font-size:15px;border-top:1px solid #e0c96e;">💰 Total ofertado</td>
            <td style="padding:10px 0 6px;font-weight:800;font-size:17px;color:#2D4A3E;border-top:1px solid #e0c96e;">${money(precioFinal)}</td>
          </tr>
        </table>
      </td></tr>

      ${bloqueComentarios}

      <tr><td style="padding:4px 40px 20px;">
        <div style="background:#f8f9fa;border-radius:10px;padding:18px 22px;font-size:13px;color:#333;">
          <p style="margin:0 0 10px;font-weight:700;color:#1C2B25;">Para confirmar tu reserva puedes:</p>
          <p style="margin:0 0 6px;">🏦 <strong>Transferencia bancaria</strong> — contacta con nosotros para los datos de cuenta</p>
          <p style="margin:0 0 6px;">📱 <strong>Bizum</strong> — contacta con nosotros para el número</p>
          <p style="margin:0;">💳 <strong>Tarjeta online</strong> — reserva directamente en nuestra web</p>
        </div>
      </td></tr>

      ${botonReservar}

      <tr><td style="padding:0 40px 24px;">
        <div style="background:#FFF3CD;border:1px solid #FFD966;border-radius:10px;padding:12px 16px;font-size:12px;color:#856404;">
          ⚠️ <strong>Aviso importante:</strong> Este presupuesto no bloquea la disponibilidad hasta que se confirme y abone la reserva. La disponibilidad puede variar.
        </div>
      </td></tr>

      <tr><td style="background:#2D4A3E;padding:24px 40px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#A5C8BE;">${propNombre} &nbsp;·&nbsp; ${propAddress}</p>
        <p style="margin:6px 0 0;font-size:12px;color:#6B9E94;">${propPhone} &nbsp;·&nbsp; ${propEmail}</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ ok: false, error: 'Unauthorized' }, 401)

  // ── 1. Verificar caller ──────────────────────────────────────────────────
  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser()
  if (callerError || !caller) return json({ ok: false, error: 'Unauthorized' }, 401)

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // ── 2. Property del caller ────────────────────────────────────────────────
  const { data: membership } = await callerClient
    .from('property_users')
    .select('property_id, rol')
    .eq('user_id', caller.id)
    .single()

  if (!membership) return json({ ok: false, error: 'No perteneces a ninguna propiedad' }, 403)
  if (membership.rol !== 'ADMIN') return json({ ok: false, error: 'Acceso denegado' }, 403)

  const propertyId = membership.property_id

  // ── 3. Parsear body ───────────────────────────────────────────────────────
  let body: Record<string, any>
  try { body = await req.json() } catch { return json({ ok: false, error: 'Body JSON inválido' }, 400) }

  const nombre          = str(body.nombre)
  const apellidos       = str(body.apellidos)
  const email           = str(body.email).toLowerCase()
  const telefono        = str(body.telefono)
  const fechaEntrada    = str(body.fecha_entrada)
  const fechaSalida     = str(body.fecha_salida)
  const numHuespedes    = Number(body.num_huespedes) || 2
  const noches          = Number(body.noches) || 1
  const precioCalculado = Number(body.precio_calculado) || 0
  const descuento       = Number(body.descuento) || 0
  const precioFinal     = Number(body.precio_final) || precioCalculado - descuento
  const comentarios     = str(body.comentarios)
  const unidadNombres   = str(body.unidad_nombres)
  const appUrl          = str(body.app_url)

  if (!nombre || !email || !fechaEntrada || !fechaSalida) {
    return json({ ok: false, error: 'Faltan campos obligatorios: nombre, email, fechas' }, 400)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: 'Email inválido' }, 400)
  }

  // ── 4. Insertar en consultas ──────────────────────────────────────────────
  const mensajeResumen = [
    `Presupuesto enviado: ${fechaEntrada} → ${fechaSalida} (${noches} noches, ${numHuespedes} huéspedes)`,
    unidadNombres ? `Alojamiento: ${unidadNombres}` : '',
    `Precio calculado: ${money(precioCalculado)}`,
    descuento > 0 ? `Descuento: -${money(descuento)}` : '',
    `Total ofertado: ${money(precioFinal)}`,
    comentarios ? `Comentarios: ${comentarios}` : '',
  ].filter(Boolean).join('\n')

  const { error: insertError } = await adminClient
    .from('consultas')
    .insert({
      property_id: propertyId,
      nombre: `${nombre}${apellidos ? ' ' + apellidos : ''}`,
      email,
      telefono: telefono || null,
      tipo: 'PRESUPUESTO',
      asunto: `Presupuesto ${fechaEntrada} - ${fechaSalida}`,
      mensaje: mensajeResumen,
      estado: 'PRESUPUESTO_ENVIADO',
    })

  if (insertError) {
    console.error('send-presupuesto insert consultas error:', insertError)
    return json({ ok: false, error: 'Error al registrar la consulta' }, 500)
  }

  // ── 5. Config de la propiedad ─────────────────────────────────────────────
  const { data: prop } = await adminClient
    .from('properties')
    .select('nombre, site_tagline, descripcion, direccion, localidad, telefono, email, resend_from_email, resend_from_name, checkin_time, checkout_time, web')
    .eq('id', propertyId)
    .single()

  const propNombre   = str(prop?.nombre, 'Alojamiento')
  const propTagline  = str(prop?.site_tagline ?? prop?.descripcion)
  const propAddress  = [prop?.direccion, prop?.localidad].filter(Boolean).join(', ')
  const propPhone    = str(prop?.telefono)
  const propEmail    = str(prop?.email ?? prop?.resend_from_email)
  const checkinTime  = str(prop?.checkin_time, '16:00')
  const checkoutTime = str(prop?.checkout_time, '11:00')

  const fromEmail = str(prop?.resend_from_email ?? prop?.email, Deno.env.get('RESEND_FROM_EMAIL') ?? '')
  const fromName  = str(prop?.resend_from_name  ?? prop?.nombre, Deno.env.get('RESEND_FROM_NAME') ?? 'Alojamiento')

  if (!fromEmail) {
    return json({ ok: false, error: 'Remitente no configurado en la propiedad' }, 500)
  }

  // ── 6. URL de reserva ─────────────────────────────────────────────────────
  const baseUrl = str(appUrl || Deno.env.get('APP_URL') || prop?.web || '')
  const reservarUrl = baseUrl.startsWith('http') ? baseUrl : baseUrl ? `https://${baseUrl}` : ''

  // ── 7. Construir y enviar email ───────────────────────────────────────────
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.warn('send-presupuesto: RESEND_API_KEY no configurada — email omitido')
    return json({ ok: true, note: 'Registrado, email omitido (no hay API key)' })
  }

  const html = buildEmail({
    propNombre, propTagline, propAddress, propPhone, propEmail,
    checkinTime, checkoutTime, appUrl: reservarUrl,
    guestName: `${nombre}${apellidos ? ' ' + apellidos : ''}`,
    fechaEntrada, fechaSalida, noches, numHuespedes,
    unidadNombres, precioCalculado, descuento, precioFinal, comentarios,
  })

  const subject = `Presupuesto para tu estancia · ${propNombre}`

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      subject,
      html,
    }),
  })

  if (!resendRes.ok) {
    const err = await resendRes.text()
    console.error('send-presupuesto Resend error:', err)
    // La consulta ya quedó guardada — devolvemos éxito parcial
    return json({ ok: true, warning: 'Registrado, pero el email no se pudo enviar: ' + err })
  }

  return json({ ok: true })
})

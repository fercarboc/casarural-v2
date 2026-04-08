import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js/cors'
import {
  buildEmail,
  defaultEmailBranding,
  type EmailTemplateKey,
} from '../_shared/email/index.ts'

type JsonRecord = Record<string, unknown>

interface SendConsultaReplyPayload {
  propertyId: string
  consultaId?: string | null

  customerEmail?: string | null
  customerName?: string | null

  subject: string
  message: string

  templateKey?: EmailTemplateKey
  attachmentName?: string | null
  attachmentUrl?: string | null
  attachmentContentType?: string | null

  actionLabel?: string | null
  actionUrl?: string | null

  summaryItems?: Array<{
    label: string
    value: string
  }>
}

interface PropertyRow {
  id: string
  nombre: string | null
  email: string | null
  telefono: string | null
  web: string | null
  logo_url: string | null
  resend_from_email: string | null
  resend_from_name: string | null
}

interface ConsultaRow {
  id: string
  property_id: string
  email: string | null
  nombre: string | null
  asunto: string | null
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_API_URL = 'https://api.resend.com/emails'

const FALLBACK_FROM_EMAIL =
  Deno.env.get('RESEND_FROM_EMAIL') ??
  'no-reply@staynexapp.com'

const FALLBACK_FROM_NAME =
  Deno.env.get('RESEND_FROM_NAME') ??
  'StayNexApp'

function jsonResponse(status: number, body: JsonRecord) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null

  const [type, token] = authHeader.split(' ')
  if (type !== 'Bearer' || !token) return null

  return token
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function textToHtml(value: string): string {
  return escapeHtml(value)
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 16px 0;">${paragraph.replace(/\n/g, '<br />')}</p>`)
    .join('')
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function buildFromAddress(property: PropertyRow): string {
  const fromEmail = property.resend_from_email?.trim() || FALLBACK_FROM_EMAIL
  const fromName =
    property.resend_from_name?.trim() ||
    property.nombre?.trim() ||
    FALLBACK_FROM_NAME

  return `${fromName} <${fromEmail}>`
}

async function sendWithResend(params: {
  from: string
  to: string
  subject: string
  html: string
  text: string
  attachmentName?: string | null
  attachmentUrl?: string | null
  attachmentContentType?: string | null
}) {
  const attachments =
    params.attachmentName && params.attachmentUrl
      ? [
          {
            filename: params.attachmentName,
            path: params.attachmentUrl,
            contentType: params.attachmentContentType ?? undefined,
          },
        ]
      : undefined

  const resendPayload: JsonRecord = {
    from: params.from,
    to: [params.to],
    subject: params.subject,
    html: params.html,
    text: params.text,
  }

  if (attachments) {
    resendPayload.attachments = attachments
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resendPayload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      (typeof data?.message === 'string' && data.message) ||
      (typeof data?.error?.message === 'string' && data.error.message) ||
      'Error enviando email con Resend'

    throw new Error(message)
  }

  return data as { id?: string }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, {
      ok: false,
      error: 'Method not allowed',
    })
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, {
      ok: false,
      error: 'Supabase env vars missing',
    })
  }

  if (!RESEND_API_KEY) {
    return jsonResponse(500, {
      ok: false,
      error: 'RESEND_API_KEY missing',
    })
  }

  const token = getBearerToken(req)
  if (!token) {
    return jsonResponse(401, {
      ok: false,
      error: 'Missing bearer token',
    })
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  let payload: SendConsultaReplyPayload

  try {
    payload = await req.json()
  } catch {
    return jsonResponse(400, {
      ok: false,
      error: 'Invalid JSON body',
    })
  }

  const propertyId = normalizeNullableString(payload.propertyId)
  const consultaId = normalizeNullableString(payload.consultaId)
  const subject = normalizeNullableString(payload.subject)
  const message = normalizeNullableString(payload.message)

  if (!propertyId) {
    return jsonResponse(400, {
      ok: false,
      error: 'propertyId is required',
    })
  }

  if (!subject) {
    return jsonResponse(400, {
      ok: false,
      error: 'subject is required',
    })
  }

  if (!message) {
    return jsonResponse(400, {
      ok: false,
      error: 'message is required',
    })
  }

  const templateKey: EmailTemplateKey = payload.templateKey ?? 'consulta_reply'
  const attachmentName = normalizeNullableString(payload.attachmentName)
  const attachmentUrl = normalizeNullableString(payload.attachmentUrl)
  const attachmentContentType = normalizeNullableString(payload.attachmentContentType)
  const actionLabel = normalizeNullableString(payload.actionLabel)
  const actionUrl = normalizeNullableString(payload.actionUrl)

  try {
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return jsonResponse(401, {
        ok: false,
        error: 'Invalid user session',
      })
    }

    const { data: membership, error: membershipError } = await serviceClient
      .from('property_users')
      .select('property_id, rol')
      .eq('property_id', propertyId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError) {
      return jsonResponse(500, {
        ok: false,
        error: membershipError.message,
      })
    }

    if (!membership) {
      return jsonResponse(403, {
        ok: false,
        error: 'User has no access to this property',
      })
    }

    const { data: property, error: propertyError } = await serviceClient
      .from('properties')
      .select(`
        id,
        nombre,
        email,
        telefono,
        web,
        logo_url,
        resend_from_email,
        resend_from_name
      `)
      .eq('id', propertyId)
      .single<PropertyRow>()

    if (propertyError || !property) {
      return jsonResponse(404, {
        ok: false,
        error: 'Property not found',
      })
    }

    let consulta: ConsultaRow | null = null

    if (consultaId) {
      const { data: consultaData, error: consultaError } = await serviceClient
        .from('consultas')
        .select('id, property_id, email, nombre, asunto')
        .eq('id', consultaId)
        .eq('property_id', propertyId)
        .maybeSingle<ConsultaRow>()

      if (consultaError) {
        return jsonResponse(500, {
          ok: false,
          error: consultaError.message,
        })
      }

      consulta = consultaData
    }

    const customerEmail =
      normalizeNullableString(payload.customerEmail) ??
      normalizeNullableString(consulta?.email) ??
      null

    const customerName =
      normalizeNullableString(payload.customerName) ??
      normalizeNullableString(consulta?.nombre) ??
      null

    if (!customerEmail) {
      return jsonResponse(400, {
        ok: false,
        error: 'customerEmail is required',
      })
    }

    const propertyName = property.nombre?.trim() || 'StayNexApp'
    const messageHtml = textToHtml(message)

    const built = buildEmail(templateKey, {
      subject,
      previewText: `Nuevo mensaje de ${propertyName}`,
      title: subject,
      subtitle: propertyName,
      intro: customerName
        ? `Hola ${customerName}, te enviamos la respuesta a tu consulta.`
        : 'Te enviamos la respuesta a tu consulta.',
      badge:
        templateKey === 'consulta_documents'
          ? 'Documentación'
          : templateKey === 'consulta_managed'
          ? 'Gestión realizada'
          : templateKey === 'consulta_ack'
          ? 'Consulta recibida'
          : 'Respuesta',
      customerName,
      propertyName,
      messageHtml,
      summaryItems: payload.summaryItems?.length
        ? payload.summaryItems
        : [
            { label: 'Cliente', value: customerName || customerEmail },
            { label: 'Email', value: customerEmail },
            { label: 'Propiedad', value: propertyName },
            ...(consulta?.asunto
              ? [{ label: 'Consulta', value: consulta.asunto }]
              : []),
          ],
      attachments:
        attachmentName && attachmentUrl
          ? [{ name: attachmentName, url: attachmentUrl }]
          : [],
      actionLabel: actionLabel ?? undefined,
      actionUrl: actionUrl ?? undefined,
      footerNote: 'Gracias por contactar con nosotros.',
      branding: {
        ...defaultEmailBranding,
        brandName: propertyName,
        logoUrl: property.logo_url || defaultEmailBranding.logoUrl,
        websiteUrl: property.web || defaultEmailBranding.websiteUrl,
        supportEmail: property.email || defaultEmailBranding.supportEmail,
        supportPhone: property.telefono || defaultEmailBranding.supportPhone,
      },
    })

    let resendId: string | null = null
    let sendStatus: 'SENT' | 'FAILED' = 'FAILED'
    let sendErrorMessage: string | null = null

    try {
      const resendResult = await sendWithResend({
        from: buildFromAddress(property),
        to: customerEmail,
        subject: built.subject,
        html: built.html,
        text: built.text,
        attachmentName,
        attachmentUrl,
        attachmentContentType,
      })

      resendId = typeof resendResult?.id === 'string' ? resendResult.id : null
      sendStatus = 'SENT'
    } catch (err) {
      sendStatus = 'FAILED'
      sendErrorMessage =
        err instanceof Error ? err.message : 'Unknown resend error'
    }

    const { data: communication, error: insertError } = await serviceClient
      .from('customer_communications')
      .insert({
        property_id: propertyId,
        related_consulta_id: consultaId,
        type: 'EMAIL_OUT',
        status: sendStatus,
        subject: built.subject,
        body_html: built.html,
        body_text: built.text,
        attachment_name: attachmentName,
        attachment_url: attachmentUrl,
        customer_email: customerEmail,
        customer_name: customerName,
        metadata: {
          template_key: templateKey,
          resend_id: resendId,
          sent_by_user_id: user.id,
          source: 'send_consulta_reply',
          error: sendErrorMessage,
        },
      })
      .select('id')
      .single()

    if (insertError) {
      return jsonResponse(500, {
        ok: false,
        error: insertError.message,
        resendId,
        sendStatus,
      })
    }

    if (sendStatus === 'FAILED') {
      return jsonResponse(502, {
        ok: false,
        error: sendErrorMessage || 'Email send failed',
        communicationId: communication?.id ?? null,
      })
    }

    const { error: replyInsertError } = await serviceClient
      .from('consulta_respuestas')
      .insert({
        consulta_id: consultaId,
        property_id: propertyId,
        subject: built.subject,
        body_html: built.html,
        body_text: built.text,
        attachment_name: attachmentName,
        attachment_url: attachmentUrl,
        customer_email: customerEmail,
        customer_name: customerName,
        sent_by_user_id: user.id,
        status: sendStatus,
      })

    // No bloqueo el éxito principal por esta tabla auxiliar si el resto ya salió.
    if (replyInsertError) {
      console.error('consulta_respuestas insert error:', replyInsertError.message)
    }

    return jsonResponse(200, {
      ok: true,
      communicationId: communication?.id ?? null,
      resendId,
      status: sendStatus,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unexpected error'

    return jsonResponse(500, {
      ok: false,
      error: message,
    })
  }
})
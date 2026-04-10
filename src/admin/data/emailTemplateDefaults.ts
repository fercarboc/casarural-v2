// src/admin/data/emailTemplateDefaults.ts
// Plantillas base del sistema. Se usan para crear plantillas cuando no existen en BD.
// Variables soportadas: {{variable}} — interpoladas por send-email Edge Function.

export type TemplateKey =
  | 'reservation_confirmed'
  | 'admin_reservation_confirmed_manual'
  | 'checkin_link'

export interface TemplateDefault {
  key: TemplateKey
  label: string
  description: string
  asunto: string
  variables: Array<{ name: string; desc: string }>
  cuerpo_html: string
}

// ─── HTML helpers ──────────────────────────────────────────────────────────────

const emailShell = (body: string) => `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email</title></head>
<body style="margin:0;padding:0;background:#F5F5F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.09);">
${body}
      <tr><td style="background:#2D4A3E;padding:24px 40px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#A5C8BE;">{{property_name}} &nbsp;·&nbsp; {{property_address}}</p>
        <p style="margin:6px 0 0;font-size:12px;color:#6B9E94;">{{property_phone}} &nbsp;·&nbsp; {{property_email}}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`

const propertyHeader = () => `      <tr>
        <td style="background:#2D4A3E;padding:32px 40px 28px;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#fff;font-family:Georgia,serif;">{{property_name}}</p>
          <p style="margin:6px 0 0;font-size:13px;color:#A5C8BE;">{{property_tagline}}</p>
        </td>
      </tr>`

// ─── PLANTILLAS ────────────────────────────────────────────────────────────────

const RESERVATION_CONFIRMED_HTML = emailShell(`${propertyHeader()}
      <tr><td style="padding:32px 40px 8px;">
        <p style="margin:0;font-size:20px;font-weight:700;color:#1C2B25;">✅ ¡Reserva confirmada!</p>
        <p style="margin:8px 0 0;font-size:14px;color:#555;">Hola <strong>{{guest_name}}</strong>, tu reserva en <strong>{{property_name}}</strong> está confirmada. A continuación encontrarás todos los detalles.</p>
      </td></tr>
      <tr><td style="padding:16px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F7F4;border-radius:12px;padding:20px 24px;font-size:14px;">
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;width:50%;">📅 Check-in</td>
            <td style="padding:6px 0;font-weight:600;color:#1C2B25;">{{check_in}}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;">⏰ Hora entrada</td>
            <td style="padding:6px 0;font-weight:600;color:#1C2B25;">{{checkin_time}} h</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;">📅 Check-out</td>
            <td style="padding:6px 0;font-weight:600;color:#1C2B25;">{{check_out}}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;">⏰ Hora salida</td>
            <td style="padding:6px 0;font-weight:600;color:#1C2B25;">{{checkout_time}} h</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;">🌙 Noches</td>
            <td style="padding:6px 0;font-weight:600;color:#1C2B25;">{{nights}}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;">👥 Huéspedes</td>
            <td style="padding:6px 0;font-weight:600;color:#1C2B25;">{{guests}}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;">🏠 Alojamiento</td>
            <td style="padding:6px 0;font-weight:600;color:#1C2B25;">{{unit_summary}}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;">💶 Total</td>
            <td style="padding:6px 0;font-weight:700;font-size:16px;color:#2D4A3E;">{{total_amount}}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;">📋 Tarifa</td>
            <td style="padding:6px 0;font-weight:600;color:#1C2B25;">{{rate_type}}</td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:8px 40px 24px;text-align:center;">
        <a href="{{booking_url}}" style="display:inline-block;background:#2D4A3E;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;">Ver mi reserva →</a>
      </td></tr>
      <tr><td style="padding:0 40px 24px;">
        <div style="background:#FFF8E7;border:1px solid #F0D080;border-radius:10px;padding:14px 18px;font-size:13px;color:#5D4037;">
          <strong>⚠️ Recuerda:</strong> Es obligatorio registrar los datos de todos los huéspedes antes del check-in (RD 933/2021).
          <a href="{{booking_url}}" style="display:block;margin-top:8px;color:#2D4A3E;font-weight:700;">Completar registro de huéspedes →</a>
        </div>
      </td></tr>
`)

const ADMIN_MANUAL_HTML = emailShell(`${propertyHeader()}
      <tr><td style="padding:32px 40px 8px;">
        <p style="margin:0;font-size:20px;font-weight:700;color:#1C2B25;">Tu reserva en {{property_name}}</p>
        <p style="margin:8px 0 0;font-size:14px;color:#555;">Hola <strong>{{guest_name}}</strong>, hemos registrado tu reserva. Revisa los detalles y completa el pago según las instrucciones.</p>
      </td></tr>
      <tr><td style="padding:16px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F7F4;border-radius:12px;padding:20px 24px;font-size:14px;">
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;width:50%;">📅 Check-in</td>
            <td style="padding:6px 0;font-weight:600;color:#1C2B25;">{{check_in}}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;">📅 Check-out</td>
            <td style="padding:6px 0;font-weight:600;color:#1C2B25;">{{check_out}}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;">🌙 Noches</td>
            <td style="padding:6px 0;font-weight:600;color:#1C2B25;">{{nights}}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;">👥 Huéspedes</td>
            <td style="padding:6px 0;font-weight:600;color:#1C2B25;">{{guests}}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555;">💶 Total</td>
            <td style="padding:6px 0;font-weight:700;font-size:16px;color:#2D4A3E;">{{total_amount}}</td>
          </tr>
        </table>
      </td></tr>
      {{bloque_transferencia}}
      <tr><td style="padding:8px 40px 24px;text-align:center;">
        <a href="{{reserva_url}}" style="display:inline-block;background:#2D4A3E;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;">Ver mi reserva →</a>
      </td></tr>
`)

const CHECKIN_LINK_HTML = emailShell(`${propertyHeader()}
      <tr><td style="padding:32px 40px 8px;">
        <p style="margin:0;font-size:20px;font-weight:700;color:#1C2B25;">📋 Registro previo al check-in</p>
        <p style="margin:8px 0 0;font-size:14px;color:#555;">Hola <strong>{{guest_name}}</strong>, tu llegada a <strong>{{property_name}}</strong> se acerca. Por favor, completa el registro de viajeros antes de tu llegada.</p>
      </td></tr>
      <tr><td style="padding:16px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F7F4;border-radius:12px;padding:16px 24px;font-size:14px;">
          <tr>
            <td style="padding:5px 12px 5px 0;color:#555;width:50%;">📅 Check-in</td>
            <td style="padding:5px 0;font-weight:600;color:#1C2B25;">{{check_in}}</td>
          </tr>
          <tr>
            <td style="padding:5px 12px 5px 0;color:#555;">⏰ Hora entrada</td>
            <td style="padding:5px 0;font-weight:600;color:#1C2B25;">{{checkin_time}} h</td>
          </tr>
          <tr>
            <td style="padding:5px 12px 5px 0;color:#555;">📅 Check-out</td>
            <td style="padding:5px 0;font-weight:600;color:#1C2B25;">{{check_out}}</td>
          </tr>
          <tr>
            <td style="padding:5px 12px 5px 0;color:#555;">🏠 Alojamiento</td>
            <td style="padding:5px 0;font-weight:600;color:#1C2B25;">{{unit_summary}}</td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 40px 16px;">
        {{bloque_notas}}
      </td></tr>
      <tr><td style="padding:0 40px 24px;text-align:center;">
        <a href="{{checkin_url}}" style="display:inline-block;background:#2D4A3E;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;">Completar registro →</a>
      </td></tr>
      <tr><td style="padding:0 40px 24px;">
        <div style="background:#FFF8E7;border:1px solid #F0D080;border-radius:10px;padding:14px 18px;font-size:12px;color:#5D4037;">
          Este registro es obligatorio por ley (RD 933/2021). Los datos se envían al Ministerio del Interior.
        </div>
      </td></tr>
`)

// ─── EXPORT ────────────────────────────────────────────────────────────────────

export const EMAIL_TEMPLATE_DEFAULTS: TemplateDefault[] = [
  {
    key: 'reservation_confirmed',
    label: 'Confirmación de reserva',
    description: 'Se envía automáticamente cuando el cliente completa el pago en Stripe.',
    asunto: 'Reserva confirmada · {{property_name}} — {{reservation_code}}',
    variables: [
      { name: '{{guest_name}}',    desc: 'Nombre del cliente' },
      { name: '{{reservation_code}}', desc: 'Código de reserva (ej. R-ABC12345)' },
      { name: '{{check_in}}',      desc: 'Fecha de entrada formateada' },
      { name: '{{check_out}}',     desc: 'Fecha de salida formateada' },
      { name: '{{nights}}',        desc: 'Número de noches' },
      { name: '{{guests}}',        desc: 'Número de huéspedes' },
      { name: '{{unit_summary}}',  desc: 'Nombre(s) de las unidades' },
      { name: '{{total_amount}}',  desc: 'Total formateado (ej. 946,00 €)' },
      { name: '{{senal_amount}}',  desc: 'Señal pagada (si aplica)' },
      { name: '{{resto_amount}}',  desc: 'Resto pendiente (si aplica)' },
      { name: '{{rate_type}}',     desc: 'Flexible / No reembolsable' },
      { name: '{{booking_url}}',   desc: 'Enlace al área de cliente' },
      { name: '{{property_name}}', desc: 'Nombre del alojamiento' },
      { name: '{{property_tagline}}', desc: 'Tagline del alojamiento' },
      { name: '{{checkin_time}}',  desc: 'Hora de entrada (ej. 16:00)' },
      { name: '{{checkout_time}}', desc: 'Hora de salida (ej. 11:00)' },
    ],
    cuerpo_html: RESERVATION_CONFIRMED_HTML,
  },
  {
    key: 'admin_reservation_confirmed_manual',
    label: 'Solicitud de pago (manual)',
    description: 'Se envía desde admin para reservas creadas manualmente. Incluye bloque de pago opcional.',
    asunto: 'Tu reserva en {{property_name}} — {{reservation_code}}',
    variables: [
      { name: '{{guest_name}}',        desc: 'Nombre del cliente' },
      { name: '{{reservation_code}}',  desc: 'Código de reserva' },
      { name: '{{check_in}}',          desc: 'Fecha de entrada formateada' },
      { name: '{{check_out}}',         desc: 'Fecha de salida formateada' },
      { name: '{{nights}}',            desc: 'Número de noches' },
      { name: '{{guests}}',            desc: 'Número de huéspedes' },
      { name: '{{total_amount}}',      desc: 'Total formateado' },
      { name: '{{reserva_url}}',       desc: 'Enlace al área de cliente' },
      { name: '{{bloque_transferencia}}', desc: 'Bloque HTML con datos de pago (generado por admin)' },
      { name: '{{property_name}}',     desc: 'Nombre del alojamiento' },
      { name: '{{checkin_time}}',      desc: 'Hora de entrada' },
      { name: '{{checkout_time}}',     desc: 'Hora de salida' },
    ],
    cuerpo_html: ADMIN_MANUAL_HTML,
  },
  {
    key: 'checkin_link',
    label: 'Enlace de check-in',
    description: 'Se envía para que el cliente registre los datos de los huéspedes antes de la llegada.',
    asunto: 'Registro de viajeros · {{property_name}} — {{check_in}}',
    variables: [
      { name: '{{guest_name}}',    desc: 'Nombre del cliente' },
      { name: '{{reservation_code}}', desc: 'Código de reserva' },
      { name: '{{check_in}}',      desc: 'Fecha de entrada formateada' },
      { name: '{{check_out}}',     desc: 'Fecha de salida formateada' },
      { name: '{{unit_summary}}',  desc: 'Nombre(s) de las unidades' },
      { name: '{{checkin_url}}',   desc: 'Enlace al formulario de check-in' },
      { name: '{{checkin_time}}',  desc: 'Hora de entrada' },
      { name: '{{checkout_time}}', desc: 'Hora de salida' },
      { name: '{{property_name}}', desc: 'Nombre del alojamiento' },
      { name: '{{bloque_notas}}',  desc: 'Nota adicional del admin (opcional)' },
    ],
    cuerpo_html: CHECKIN_LINK_HTML,
  },
]

export const BASE_TEMPLATE_KEYS: TemplateKey[] = [
  'reservation_confirmed',
  'admin_reservation_confirmed_manual',
  'checkin_link',
]

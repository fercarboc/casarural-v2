import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../../integrations/supabase/client'
import { getReservaByToken, ReservaPublica } from '../../services/booking.service'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatEur(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)
}

function toLocalDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function todayStr(): string {
  return toLocalDateStr(new Date())
}

// ─── Componente principal ─────────────────────────────────────────────────────
type Screen = 'loading' | 'error' | 'inactive' | 'form' | 'sent'

export function CambioFechas() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [screen, setScreen] = useState<Screen>('loading')
  const [reserva, setReserva] = useState<ReservaPublica | null>(null)
  const [nuevaEntrada, setNuevaEntrada] = useState('')
  const [nuevaSalida, setNuevaSalida] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)

  useEffect(() => {
    if (!token) { setScreen('error'); return }
    getReservaByToken(token).then(res => {
      if (!res) { setScreen('error'); return }
      setReserva(res)
      setScreen(res.estado === 'CONFIRMED' ? 'form' : 'inactive')
    })
  }, [token])

  const validate = (): boolean => {
    if (!reserva) return false
    const errors: Record<string, string> = {}

    if (!nuevaEntrada) {
      errors.entrada = 'Selecciona la nueva fecha de entrada'
    } else if (nuevaEntrada < todayStr()) {
      errors.entrada = 'La fecha de entrada no puede ser en el pasado'
    }

    if (!nuevaSalida) {
      errors.salida = 'Selecciona la nueva fecha de salida'
    } else if (nuevaEntrada && nuevaSalida <= nuevaEntrada) {
      errors.salida = 'La fecha de salida debe ser posterior a la entrada'
    } else if (nuevaEntrada && nuevaSalida) {
      const noches = Math.round((new Date(nuevaSalida).getTime() - new Date(nuevaEntrada).getTime()) / (1000 * 60 * 60 * 24))
      if (noches < 2) errors.salida = 'La estancia mínima es de 2 noches'
    }

    if (nuevaEntrada === reserva.fecha_entrada && nuevaSalida === reserva.fecha_salida) {
      errors.entrada = 'Las nuevas fechas son iguales a las actuales'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate() || !reserva) return

    // Si ya hay solicitud pendiente y no se ha confirmado, pedir confirmación
    if (reserva.solicitud_cambio && !confirmOverwrite) {
      setConfirmOverwrite(true)
      return
    }

    setSending(true)
    setSendError(null)
    try {
      const nuevasNoches = Math.round(
        (new Date(nuevaSalida).getTime() - new Date(nuevaEntrada).getTime()) / (1000 * 60 * 60 * 24)
      )

      const { error: consultaError } = await supabase.from('consultas').insert({
        nombre: `${reserva.nombre} ${reserva.apellidos}`,
        email: reserva.email,
        telefono: reserva.telefono,
        asunto: `Solicitud de cambio de fechas — ${reserva.codigo}`,
        mensaje:
          `Solicitud de cambio para reserva ${reserva.codigo}.\n` +
          `Fechas actuales: ${reserva.fecha_entrada} → ${reserva.fecha_salida} (${reserva.noches} noches)\n` +
          `Nuevas fechas solicitadas: ${nuevaEntrada} → ${nuevaSalida} (${nuevasNoches} noches)\n\n` +
          `Mensaje del cliente: ${mensaje.trim() || 'Sin mensaje'}`,
        reserva_id: reserva.id,
        estado: 'NUEVA',
      })
      if (consultaError) throw consultaError

      await supabase
        .from('reservas')
        .update({
          solicitud_cambio: `${nuevaEntrada}|${nuevaSalida}|${mensaje.trim()}|${new Date().toISOString()}`,
        })
        .eq('token_cliente', token)

      const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string
      const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string

      await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          template_key: 'change_request_received',
          to_email: reserva.email,
          to_name: `${reserva.nombre} ${reserva.apellidos}`,
          reservation_id: reserva.id,
          extra_vars: {
            new_check_in: formatDate(nuevaEntrada),
            new_check_out: formatDate(nuevaSalida),
            change_message: mensaje.trim() || 'Sin mensaje adicional',
          },
        }),
      }).catch(() => { /* email best-effort */ })

      setScreen('sent')
    } catch (e: any) {
      setSendError('Error al enviar la solicitud. Por favor inténtalo de nuevo.')
    } finally {
      setSending(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (screen === 'loading') {
    return (
      <>
        <GlobalStyles />
        <div style={s.centerPage}>
          <div style={s.spinner} />
          <p style={s.spinnerText}>Cargando tu reserva…</p>
        </div>
      </>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (screen === 'error') {
    return (
      <>
        <GlobalStyles />
        <div style={s.centerPage}>
          <div style={s.errorBadge}>!</div>
          <h2 style={s.titleSm}>Enlace no válido</h2>
          <p style={s.subtitleSm}>
            Este enlace de cambio de fechas no es válido o ha caducado.<br />
            Si necesitas ayuda, contáctanos en{' '}
            <a href="mailto:contacto@casarurallarasilla.com" style={s.link}>
              contacto@casarurallarasilla.com
            </a>
          </p>
          <Link to="/" style={s.btnPrimary}>Volver al inicio</Link>
        </div>
      </>
    )
  }

  // ── Reserva no activa ──────────────────────────────────────────────────────
  if (screen === 'inactive' && reserva) {
    return (
      <>
        <GlobalStyles />
        <div style={s.centerPage}>
          <div style={{ ...s.errorBadge, background: '#FFF3E0', color: '#E65100' }}>i</div>
          <h2 style={s.titleSm}>Reserva no activa</h2>
          <p style={s.subtitleSm}>Esta reserva ya fue cancelada o no está activa.</p>
          <p style={{ ...s.subtitleSm, fontWeight: 500, color: '#2D4A3E' }}>Código: {reserva.codigo}</p>
          <Link to="/" style={s.btnPrimary}>Volver al inicio</Link>
        </div>
      </>
    )
  }

  // ── Confirmación enviada ──────────────────────────────────────────────────
  if (screen === 'sent' && reserva) {
    return (
      <>
        <GlobalStyles />
        <div style={s.centerPage}>
          <div style={s.calBadge}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="3" stroke="white" strokeWidth="2" />
              <path d="M3 9h18M8 2v4M16 2v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <path d="M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h2 style={s.titleSm}>Solicitud enviada correctamente</h2>
          <p style={s.subtitleSm}>
            Hemos recibido tu solicitud de cambio de fechas para{' '}
            <strong style={{ color: '#2D4A3E' }}>{reserva.codigo}</strong>.
          </p>
          {nuevaEntrada && nuevaSalida && (
            <p style={{ ...s.subtitleSm, marginTop: 4 }}>
              Nuevas fechas solicitadas:{' '}
              <strong style={{ color: '#2D4A3E' }}>{formatDate(nuevaEntrada)}</strong>
              {' → '}
              <strong style={{ color: '#2D4A3E' }}>{formatDate(nuevaSalida)}</strong>
            </p>
          )}
          <p style={{ ...s.subtitleSm, marginTop: 4 }}>
            Te responderemos en 24–48 horas en:{' '}
            <strong style={{ color: '#2D4A3E' }}>{reserva.email}</strong>
          </p>
          <Link to="/" style={{ ...s.btnPrimary, marginTop: 8 }}>Volver al inicio</Link>
        </div>
      </>
    )
  }

  // ── Formulario principal ──────────────────────────────────────────────────
  if (!reserva) return null

  const nuevasNoches = (nuevaEntrada && nuevaSalida)
    ? Math.round((new Date(nuevaSalida).getTime() - new Date(nuevaEntrada).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <>
      <GlobalStyles />
      <div style={s.page}>
        <div style={s.container}>

          {/* Encabezado */}
          <div style={s.heading} className="cf-fade">
            <p style={s.headingLabel}>La Rasilla</p>
            <h1 style={s.headingTitle}>Solicitud de cambio de fechas</h1>
            <p style={s.headingSubtitle}>
              Selecciona las nuevas fechas que te gustaría y te contactaremos para confirmar la disponibilidad.
            </p>
          </div>

          {/* Aviso solicitud pendiente */}
          {reserva.solicitud_cambio && !confirmOverwrite && (
            <div style={{ ...s.aviso, background: '#EEF4FF', borderColor: '#BFCFE8' }} className="cf-fade">
              <span style={s.avisoIcon}>ℹ️</span>
              <div>
                <p style={{ ...s.avisoText, color: '#1A3A6B' }}>
                  Ya tienes una solicitud de cambio pendiente. Si envías una nueva, reemplazará la anterior.
                </p>
              </div>
            </div>
          )}

          {/* Ficha de reserva actual */}
          <section style={s.card} className="cf-fade">
            <h2 style={s.cardTitle}>Tu reserva actual</h2>
            <Row label="Código" value={reserva.codigo} />
            <Row label="Entrada actual" value={formatDate(reserva.fecha_entrada)} />
            <Row label="Salida actual" value={formatDate(reserva.fecha_salida)} />
            <Row label="Noches" value={`${reserva.noches}`} />
            <Row label="Huéspedes" value={`${reserva.num_huespedes}`} />
            <Row label="Total" value={formatEur(reserva.total)} strong />
          </section>

          {/* Nuevas fechas */}
          <section style={s.card} className="cf-fade">
            <h2 style={s.cardTitle}>Nuevas fechas que solicitas</h2>

            <div style={s.dateGrid}>
              <div>
                <label style={s.fieldLabel}>Fecha de entrada</label>
                <input
                  type="date"
                  value={nuevaEntrada}
                  min={todayStr()}
                  onChange={e => { setNuevaEntrada(e.target.value); setFormErrors({}); setConfirmOverwrite(false) }}
                  style={{ ...s.dateInput, borderColor: formErrors.entrada ? '#C62828' : '#E5E0D8' }}
                />
                {formErrors.entrada && <p style={s.fieldError}>{formErrors.entrada}</p>}
              </div>

              <div>
                <label style={s.fieldLabel}>Fecha de salida</label>
                <input
                  type="date"
                  value={nuevaSalida}
                  min={nuevaEntrada || todayStr()}
                  onChange={e => { setNuevaSalida(e.target.value); setFormErrors({}); setConfirmOverwrite(false) }}
                  style={{ ...s.dateInput, borderColor: formErrors.salida ? '#C62828' : '#E5E0D8' }}
                />
                {formErrors.salida && <p style={s.fieldError}>{formErrors.salida}</p>}
              </div>
            </div>

            {nuevasNoches > 0 && (
              <div style={s.nochesBadge}>
                {nuevasNoches} {nuevasNoches === 1 ? 'noche' : 'noches'}
              </div>
            )}
          </section>

          {/* Mensaje */}
          <section style={s.card} className="cf-fade">
            <h2 style={s.cardTitle}>
              Mensaje adicional <span style={s.optional}>(opcional)</span>
            </h2>
            <textarea
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
              placeholder="Ej: preferimos el puente del mes de mayo, o cualquier otra semana disponible en esas fechas…"
              rows={4}
              style={s.textarea}
            />
          </section>

          {/* Aviso informativo */}
          <div style={s.aviso} className="cf-fade">
            <span style={s.avisoIcon}>ℹ️</span>
            <p style={s.avisoText}>
              El cambio de fechas está sujeto a disponibilidad y puede implicar una diferencia de precio.
              Nuestro equipo te contactará para confirmar los detalles.
            </p>
          </div>

          {/* Confirmación sobreescritura */}
          {confirmOverwrite && (
            <div style={{ ...s.aviso, background: '#FFF3E0', borderColor: '#F5DFB0' }} className="cf-fade">
              <span style={s.avisoIcon}>⚠️</span>
              <p style={{ ...s.avisoText, color: '#7A5F2A' }}>
                Ya tienes una solicitud pendiente. ¿Confirmas que quieres enviar una nueva solicitud?
                Haz clic en <strong>Enviar solicitud</strong> de nuevo para confirmar.
              </p>
            </div>
          )}

          {sendError && (
            <p style={s.errorMsg}>{sendError}</p>
          )}

          {/* Acciones */}
          <div style={s.actions} className="cf-fade">
            <Link to="/" style={s.btnSecondary}>Cancelar — volver</Link>
            <button
              onClick={handleSubmit}
              disabled={sending}
              style={{ ...s.btnPrimary, opacity: sending ? 0.7 : 1, cursor: sending ? 'not-allowed' : 'pointer' }}
            >
              {sending ? 'Enviando…' : 'Enviar solicitud'}
            </button>
          </div>

        </div>
      </div>
    </>
  )
}

// ─── Sub-componente Row ───────────────────────────────────────────────────────
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={s.row}>
      <span style={s.rowLabel}>{label}</span>
      <span style={{ ...s.rowValue, fontWeight: strong ? 600 : 400, color: strong ? '#2D4A3E' : '#1C2B25' }}>
        {value}
      </span>
    </div>
  )
}

// ─── Global styles ────────────────────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Jost:wght@300;400;500&display=swap');
      @keyframes cfFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes cfSpin { to { transform: rotate(360deg); } }
      .cf-fade { animation: cfFadeUp 0.45s ease both; }
      .cf-fade:nth-child(2) { animation-delay: 0.05s; }
      .cf-fade:nth-child(3) { animation-delay: 0.1s; }
      .cf-fade:nth-child(4) { animation-delay: 0.15s; }
      .cf-fade:nth-child(5) { animation-delay: 0.2s; }
      .cf-fade:nth-child(6) { animation-delay: 0.25s; }
      input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.5; cursor: pointer; }
    `}</style>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '60vh',
    background: '#F5F0E8',
    fontFamily: "'Jost', sans-serif",
    padding: '48px 16px 80px',
  },
  container: {
    maxWidth: 640,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  centerPage: {
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    fontFamily: "'Jost', sans-serif",
    background: '#F5F0E8',
    padding: '40px 24px',
    textAlign: 'center',
  },
  spinner: {
    width: 40, height: 40, borderRadius: '50%',
    border: '3px solid #C4A882', borderTopColor: '#2D4A3E',
    animation: 'cfSpin 0.8s linear infinite',
  },
  spinnerText: { color: '#8B9E98', fontSize: 15 },
  errorBadge: {
    width: 60, height: 60, borderRadius: '50%',
    background: '#FFE4E4', color: '#CC3333',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, fontWeight: 700,
  },
  calBadge: {
    width: 64, height: 64, borderRadius: '50%',
    background: 'linear-gradient(135deg, #1565C0, #1976D2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(21,101,192,0.25)',
  },
  titleSm: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 26, fontWeight: 600, color: '#1C2B25',
    margin: 0,
  },
  subtitleSm: {
    color: '#8B9E98', fontSize: 14, lineHeight: 1.7,
    maxWidth: 420, margin: 0, textAlign: 'center',
  },
  link: { color: '#2D4A3E', textDecoration: 'underline' },
  heading: { textAlign: 'center', paddingBottom: 8 },
  headingLabel: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: '#C4A882', marginBottom: 8,
  },
  headingTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 36, fontWeight: 600, color: '#1C2B25',
    margin: '0 0 10px',
  },
  headingSubtitle: { color: '#8B9E98', fontSize: 14, lineHeight: 1.6 },
  card: {
    background: 'white',
    borderRadius: 16,
    padding: '24px 28px',
    boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
    border: '1px solid rgba(45,74,62,0.08)',
  },
  cardTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 18, fontWeight: 600, color: '#1C2B25',
    marginBottom: 16, paddingBottom: 12,
    borderBottom: '1px solid rgba(45,74,62,0.08)',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '7px 0', gap: 16, borderBottom: '1px solid #F5F0E8',
  },
  rowLabel: { fontSize: 13, color: '#8B9E98', flexShrink: 0 },
  rowValue: { fontSize: 13, textAlign: 'right' },
  dateGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
  },
  fieldLabel: {
    display: 'block',
    fontSize: 12, color: '#8B9E98',
    marginBottom: 6, textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  dateInput: {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1px solid', fontFamily: "'Jost', sans-serif",
    fontSize: 14, color: '#1C2B25', background: '#FAFAF8',
    outline: 'none', boxSizing: 'border-box', cursor: 'pointer',
  },
  fieldError: { fontSize: 12, color: '#C62828', marginTop: 4 },
  nochesBadge: {
    marginTop: 14,
    display: 'inline-block',
    background: '#F5F0E8',
    border: '1px solid rgba(196,168,130,0.4)',
    borderRadius: 20, padding: '5px 16px',
    fontSize: 12, fontWeight: 500, color: '#2D4A3E',
  },
  optional: { fontSize: 12, fontWeight: 400, color: '#8B9E98', fontFamily: "'Jost', sans-serif" },
  textarea: {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1px solid #E5E0D8', fontFamily: "'Jost', sans-serif",
    fontSize: 14, color: '#1C2B25', resize: 'vertical',
    outline: 'none', background: '#FAFAF8', boxSizing: 'border-box',
    lineHeight: 1.6,
  },
  aviso: {
    display: 'flex', gap: 12, alignItems: 'flex-start',
    background: '#F0F6FF', border: '1px solid #C8DEFF',
    borderRadius: 12, padding: '14px 18px',
  },
  avisoIcon: { fontSize: 18, flexShrink: 0, marginTop: 1 },
  avisoText: { fontSize: 13, color: '#1A3A6B', lineHeight: 1.6, margin: 0 },
  errorMsg: { fontSize: 13, color: '#C62828', textAlign: 'center', padding: '8px 0' },
  actions: {
    display: 'flex', gap: 12, justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    padding: '12px 28px', borderRadius: 10,
    background: '#2D4A3E', color: 'white',
    fontSize: 14, fontWeight: 500,
    textDecoration: 'none', border: 'none',
    fontFamily: "'Jost', sans-serif",
    display: 'inline-block', cursor: 'pointer',
  },
  btnSecondary: {
    padding: '12px 28px', borderRadius: 10,
    background: 'transparent', color: '#2D4A3E',
    border: '2px solid #2D4A3E',
    fontSize: 14, fontWeight: 500,
    textDecoration: 'none',
    fontFamily: "'Jost', sans-serif",
    display: 'inline-block',
  },
}

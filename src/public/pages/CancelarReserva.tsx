
import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { getReservaByToken, ReservaPublica } from '../../services/booking.service'
 
// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}
 
function formatEur(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)
}
 
function calcularReembolso(reserva: ReservaPublica) {
  if (reserva.tarifa === 'NO_REEMBOLSABLE') {
    return {
      diasRestantes: 0,
      porcentajeReembolso: 0,
      importeReembolso: 0,
      descripcion: 'Tarifa no reembolsable — sin reembolso',
    }
  }
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const entrada = new Date(reserva.fecha_entrada + 'T00:00:00')
  const dias = Math.floor((entrada.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
 
  let pct = 0
  let descripcion = ''
  if (dias >= 60)      { pct = 100; descripcion = 'Reembolso completo (más de 60 días)' }
  else if (dias >= 45) { pct = 50;  descripcion = 'Reembolso del 50% (entre 45 y 59 días)' }
  else if (dias >= 30) { pct = 25;  descripcion = 'Reembolso del 25% (entre 30 y 44 días)' }
  else                 { pct = 0;   descripcion = 'Sin reembolso (menos de 30 días)' }
 
  const importeReembolso = Math.round((reserva.importe_pagado * pct / 100) * 100) / 100
  return { diasRestantes: dias, porcentajeReembolso: pct, importeReembolso, descripcion }
}
 
function reembolsoColor(pct: number): string {
  if (pct === 100) return '#2D7D5A'
  if (pct === 50)  return '#1565C0'
  if (pct === 25)  return '#E65100'
  return '#C62828'
}
 
// ─── Componente principal ─────────────────────────────────────────────────────
type Screen = 'loading' | 'error' | 'inactive' | 'form' | 'cancelled'
 
export function CancelarReserva() {
  const [searchParams]  = useSearchParams()
  const token           = searchParams.get('token') ?? ''
 
  const [screen,    setScreen]    = useState<Screen>('loading')
  const [reserva,   setReserva]   = useState<ReservaPublica | null>(null)
  const [motivo,    setMotivo]    = useState('')
  const [sending,   setSending]   = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
 
  // Resultado de la cancelación (devuelto por la Edge Function)
  const [resultado, setResultado] = useState<{
    importe_reembolso: number
    politica_aplicada: string
    mensaje: string
  } | null>(null)
 
  useEffect(() => {
    if (!token) { setScreen('error'); return }
    getReservaByToken(token).then(res => {
      if (!res) { setScreen('error'); return }
      setReserva(res)
      setScreen(res.estado === 'CONFIRMED' ? 'form' : 'inactive')
    })
  }, [token])
 
  // ── Acción: cancelar reserva real ─────────────────────────────────────────
  const handleCancelar = async () => {
    if (!reserva) return
    setSending(true)
    setSendError(null)

    try {
      const SUPABASE_URL      = (import.meta as any).env.VITE_SUPABASE_URL as string
      const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string

      const res = await fetch(`${SUPABASE_URL}/functions/v1/cancel-reservation`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        // La Edge Function espera reservaId, no token.
        // El componente ya tiene la reserva cargada, así que usamos reserva.id directamente.
        body: JSON.stringify({
          reservaId:   reserva.id,
          cancelledBy: 'guest',
          reason:      motivo.trim() || undefined,
        }),
      })

      // Comprobar content-type antes de parsear como JSON
      const ct = res.headers.get('content-type') ?? ''
      if (!ct.includes('application/json')) {
        const body = await res.text().catch(() => '')
        console.error('[cancel-reservation] Respuesta no-JSON', { status: res.status, ct, body: body.slice(0, 300) })
        throw new Error(`Error del servidor (HTTP ${res.status}). Contacta con el alojamiento.`)
      }

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Error al cancelar la reserva')
      }
 
      setResultado({
        importe_reembolso: data.importe_reembolso ?? 0,
        politica_aplicada: data.politica_aplicada ?? '',
        mensaje:           data.mensaje ?? '',
      })
      setScreen('cancelled')
 
    } catch (e: any) {
      setSendError(e.message ?? 'Error al cancelar. Por favor inténtalo de nuevo o contáctanos.')
    } finally {
      setSending(false)
    }
  }
 
  // ── Loading ───────────────────────────────────────────────────────────────
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
 
  // ── Error ─────────────────────────────────────────────────────────────────
  if (screen === 'error') {
    return (
      <>
        <GlobalStyles />
        <div style={s.centerPage}>
          <div style={s.errorBadge}>!</div>
          <h2 style={s.titleSm}>Enlace no válido</h2>
          <p style={s.subtitleSm}>
            Este enlace de cancelación no es válido o ha caducado.<br />
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
 
  // ── Reserva no activa ─────────────────────────────────────────────────────
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
 
  // ── Cancelación confirmada ────────────────────────────────────────────────
  if (screen === 'cancelled' && reserva && resultado) {
    const tieneReembolso = resultado.importe_reembolso > 0
    return (
      <>
        <GlobalStyles />
        <div style={s.centerPage}>
          <div style={s.successBadge}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 style={s.titleSm}>Reserva cancelada</h2>
          <p style={s.subtitleSm}>
            Tu reserva <strong style={{ color: '#2D4A3E' }}>{reserva.codigo}</strong> ha sido cancelada.<br />
            Esperamos que puedas visitarnos en otra ocasión.
          </p>
 
          {/* Bloque de reembolso */}
          <div style={{
            ...s.reembolsoConfirmBox,
            borderColor: tieneReembolso ? '#2D7D5A40' : '#E6510040',
            background:  tieneReembolso ? '#F0F7F0'   : '#FFF3E0',
          }}>
            {tieneReembolso ? (
              <>
                <p style={{ fontSize: 13, color: '#2D7D5A', margin: '0 0 6px', fontWeight: 600 }}>
                  Reembolso en curso
                </p>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#2D4A3E', margin: '0 0 6px', fontFamily: "'Cormorant Garamond', serif" }}>
                  {formatEur(resultado.importe_reembolso)}
                </p>
                <p style={{ fontSize: 13, color: '#555', margin: 0, lineHeight: 1.6 }}>
                  {resultado.politica_aplicada}<br />
                  Se procesará en <strong>5–10 días hábiles</strong> en tu método de pago original.
                </p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: '#E65100', margin: '0 0 6px', fontWeight: 600 }}>
                  Sin reembolso aplicable
                </p>
                <p style={{ fontSize: 13, color: '#555', margin: 0, lineHeight: 1.6 }}>
                  {resultado.politica_aplicada}
                </p>
              </>
            )}
          </div>
 
          <p style={{ ...s.subtitleSm, fontSize: 13 }}>
            Te hemos enviado un email de confirmación a{' '}
            <strong style={{ color: '#2D4A3E' }}>{reserva.email}</strong>
          </p>
          <Link to="/" style={s.btnPrimary}>Volver al inicio</Link>
        </div>
      </>
    )
  }
 
  // ── Formulario principal ──────────────────────────────────────────────────
  if (!reserva) return null
  const politica = calcularReembolso(reserva)
  const color    = reembolsoColor(politica.porcentajeReembolso)
 
  return (
    <>
      <GlobalStyles />
      <div style={s.page}>
        <div style={s.container}>
 
          {/* Encabezado */}
          <div style={s.heading} className="cr-fade">
            <p style={s.headingLabel}>La Rasilla</p>
            <h1 style={s.headingTitle}>Cancelar reserva</h1>
            <p style={s.headingSubtitle}>
              Revisa los datos y la política de cancelación antes de confirmar.
            </p>
          </div>
 
          {/* Ficha de reserva */}
          <section style={s.card} className="cr-fade">
            <h2 style={s.cardTitle}>Tu reserva</h2>
            <Row label="Código"    value={reserva.codigo} />
            <Row label="Entrada"   value={formatDate(reserva.fecha_entrada)} />
            <Row label="Salida"    value={formatDate(reserva.fecha_salida)} />
            <Row label="Noches"    value={`${reserva.noches}`} />
            <Row label="Huéspedes" value={`${reserva.num_huespedes}`} />
            <Row label="Total"     value={formatEur(reserva.total)} strong />
          </section>
 
          {/* Política de cancelación */}
          <section style={s.card} className="cr-fade">
            <h2 style={s.cardTitle}>
              Política de cancelación
              <span style={{ ...s.tarifaBadge, color }}>
                Tarifa: {reserva.tarifa === 'FLEXIBLE' ? 'Flexible' : 'No reembolsable'}
              </span>
            </h2>
 
            <div style={{ ...s.policyBox, borderColor: color + '40', background: color + '08' }}>
              <p style={{ ...s.policyDias, color }}>
                Días hasta tu llegada: <strong>{Math.max(0, politica.diasRestantes)} días</strong>
              </p>
              <div style={s.policyDivider} />
              <span style={{ ...s.policyBadge, background: color, color: 'white' }}>
                {politica.porcentajeReembolso}% de reembolso
              </span>
              <p style={{ ...s.policyDesc, color }}>{politica.descripcion}</p>
            </div>
 
            <div style={s.reembolsoGrid}>
              <div style={s.reembolsoBlock}>
                <span style={s.reembolsoLabel}>Importe cobrado</span>
                <span style={s.reembolsoValue}>{formatEur(reserva.importe_pagado)}</span>
              </div>
              <div style={s.reembolsoBlock}>
                <span style={s.reembolsoLabel}>Reembolso estimado</span>
                <span style={{ ...s.reembolsoValue, color }}>{formatEur(politica.importeReembolso)}</span>
              </div>
            </div>
          </section>
 
          {/* Motivo */}
          <section style={s.card} className="cr-fade">
            <h2 style={s.cardTitle}>
              Motivo de cancelación <span style={s.optional}>(opcional)</span>
            </h2>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Cuéntanos el motivo de tu cancelación…"
              rows={4}
              style={s.textarea}
            />
          </section>
 
          {/* Aviso — diferente según tarifa */}
          <div style={{ ...s.aviso, borderColor: color + '60', background: color + '0A' }} className="cr-fade">
            <span style={s.avisoIcon}>⚠️</span>
            <p style={{ ...s.avisoText, color: '#555' }}>
              {reserva.tarifa === 'NO_REEMBOLSABLE'
                ? <>Al confirmar, tu reserva quedará <strong>cancelada de forma inmediata</strong>. La tarifa contratada es no reembolsable — no se realizará ningún reembolso.</>
                : <>Al confirmar, tu reserva quedará <strong>cancelada de forma inmediata</strong> y recibirás un reembolso de <strong style={{ color }}>{formatEur(politica.importeReembolso)}</strong> según la política aplicable.</>
              }
            </p>
          </div>
 
          {sendError && (
            <p style={s.errorMsg}>{sendError}</p>
          )}
 
          {/* Acciones */}
          <div style={s.actions} className="cr-fade">
            <Link to="/" style={s.btnSecondary}>Volver — no cancelar</Link>
            <button
              onClick={handleCancelar}
              disabled={sending}
              style={{
                ...s.btnDanger,
                opacity: sending ? 0.7 : 1,
                cursor: sending ? 'not-allowed' : 'pointer',
              }}
            >
              {sending ? 'Cancelando…' : 'Confirmar cancelación'}
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
      @keyframes crFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes crSpin    { to   { transform: rotate(360deg); } }
      .cr-fade { animation: crFadeUp 0.45s ease both; }
      .cr-fade:nth-child(2) { animation-delay: 0.05s; }
      .cr-fade:nth-child(3) { animation-delay: 0.10s; }
      .cr-fade:nth-child(4) { animation-delay: 0.15s; }
      .cr-fade:nth-child(5) { animation-delay: 0.20s; }
      .cr-fade:nth-child(6) { animation-delay: 0.25s; }
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
    animation: 'crSpin 0.8s linear infinite',
  },
  spinnerText: { color: '#8B9E98', fontSize: 15 },
  errorBadge: {
    width: 60, height: 60, borderRadius: '50%',
    background: '#FFE4E4', color: '#CC3333',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, fontWeight: 700,
  },
  successBadge: {
    width: 64, height: 64, borderRadius: '50%',
    background: 'linear-gradient(135deg, #2D4A3E, #3D6B5A)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(45,74,62,0.2)',
  },
  titleSm: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 26, fontWeight: 600, color: '#1C2B25', margin: 0,
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
    fontSize: 36, fontWeight: 600, color: '#1C2B25', margin: '0 0 10px',
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
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 8,
  },
  tarifaBadge: { fontSize: 12, fontFamily: "'Jost', sans-serif", fontWeight: 500 },
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '7px 0', gap: 16, borderBottom: '1px solid #F5F0E8',
  },
  rowLabel: { fontSize: 13, color: '#8B9E98', flexShrink: 0 },
  rowValue:  { fontSize: 13, textAlign: 'right' },
  policyBox: {
    border: '1px solid', borderRadius: 12, padding: '16px 20px', marginBottom: 16,
  },
  policyDias:    { fontSize: 14, marginBottom: 10 },
  policyDivider: { height: 1, background: 'rgba(0,0,0,0.06)', margin: '10px 0' },
  policyBadge: {
    fontSize: 12, fontWeight: 600, padding: '4px 12px',
    borderRadius: 20, display: 'inline-block', marginBottom: 8,
  },
  policyDesc: { fontSize: 13, marginTop: 6, lineHeight: 1.5 },
  reembolsoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  reembolsoBlock: {
    background: '#F9F6F0', borderRadius: 10,
    padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4,
  },
  reembolsoLabel: { fontSize: 11, color: '#8B9E98', textTransform: 'uppercase', letterSpacing: '0.06em' },
  reembolsoValue: {
    fontSize: 18, fontWeight: 600,
    fontFamily: "'Cormorant Garamond', serif", color: '#1C2B25',
  },
  reembolsoConfirmBox: {
    border: '1px solid', borderRadius: 12,
    padding: '20px 24px', textAlign: 'center',
    maxWidth: 380, width: '100%',
  },
  optional:  { fontSize: 12, fontWeight: 400, color: '#8B9E98', fontFamily: "'Jost', sans-serif" },
  textarea: {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1px solid #E5E0D8', fontFamily: "'Jost', sans-serif",
    fontSize: 14, color: '#1C2B25', resize: 'vertical',
    outline: 'none', background: '#FAFAF8', boxSizing: 'border-box', lineHeight: 1.6,
  },
  aviso: {
    display: 'flex', gap: 12, alignItems: 'flex-start',
    border: '1px solid', borderRadius: 12, padding: '14px 18px',
  },
  avisoIcon: { fontSize: 18, flexShrink: 0, marginTop: 1 },
  avisoText: { fontSize: 13, lineHeight: 1.6, margin: 0 },
  errorMsg:  { fontSize: 13, color: '#C62828', textAlign: 'center', padding: '8px 0' },
  actions: {
    display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap',
  },
  btnPrimary: {
    padding: '12px 28px', borderRadius: 10,
    background: '#2D4A3E', color: 'white',
    fontSize: 14, fontWeight: 500, textDecoration: 'none',
    border: 'none', fontFamily: "'Jost', sans-serif",
    display: 'inline-block', cursor: 'pointer',
  },
  btnDanger: {
    padding: '12px 28px', borderRadius: 10,
    background: '#B91C1C', color: 'white',
    fontSize: 14, fontWeight: 500, textDecoration: 'none',
    border: 'none', fontFamily: "'Jost', sans-serif",
    display: 'inline-block',
  },
  btnSecondary: {
    padding: '12px 28px', borderRadius: 10,
    background: 'transparent', color: '#2D4A3E',
    border: '2px solid #2D4A3E',
    fontSize: 14, fontWeight: 500, textDecoration: 'none',
    fontFamily: "'Jost', sans-serif", display: 'inline-block',
  },
}
 
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCookieConsentContext } from '../hooks/useCookieConsent'

// ─── Banner principal ─────────────────────────────────────────────────────────

export function CookieBanner() {
  const { hasDecided, acceptAll, acceptEssential } = useCookieConsentContext()
  const [showDetails, setShowDetails] = useState(false)

  if (hasDecided) return null

  return (
    <div style={s.overlay}>
      <div style={s.banner} role="dialog" aria-modal="true" aria-label="Preferencias de cookies">

        {!showDetails ? (
          <>
            <div style={s.header}>
              <span style={s.icon}>🍪</span>
              <p style={s.title}>Usamos cookies</p>
            </div>
            <p style={s.text}>
              Usamos cookies esenciales para el funcionamiento del sitio (sesión de administración, reservas).
              También podemos usar cookies de preferencias para recordar tu última búsqueda.
              Vercel Analytics está activo sin cookies — no requiere consentimiento.
              Consulta nuestra{' '}
              <Link to="/cookies" style={s.link}>Política de Cookies</Link>.
            </p>
            <div style={s.actions}>
              <button onClick={acceptEssential} style={s.btnSecondary}>
                Solo esenciales
              </button>
              <button onClick={() => setShowDetails(true)} style={s.btnGhost}>
                Más opciones
              </button>
              <button onClick={acceptAll} style={s.btnPrimary}>
                Aceptar todas
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={s.title}>Gestionar preferencias</p>
            <div style={s.table}>
              <CookieRow
                name="Esenciales"
                desc="Necesarias para el motor de reservas y el panel de administración. No se pueden desactivar."
                locked
              />
              <CookieRow
                name="Analíticas (Vercel)"
                desc="Vercel Analytics recopila datos anónimos y agregados sin cookies. Siempre activo, no requiere consentimiento."
                locked
              />
              <CookieRow
                name="Preferencias"
                desc="Recuerdan tu última búsqueda de fechas y huéspedes para mayor comodidad."
                optional
              />
            </div>
            <div style={s.actions}>
              <button onClick={() => setShowDetails(false)} style={s.btnGhost}>
                Volver
              </button>
              <button onClick={acceptEssential} style={s.btnSecondary}>
                Solo esenciales
              </button>
              <button onClick={acceptAll} style={s.btnPrimary}>
                Aceptar todas
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CookieRow({ name, desc, locked, optional }: {
  name: string; desc: string; locked?: boolean; optional?: boolean
}) {
  return (
    <div style={s.row}>
      <div style={{ flex: 1 }}>
        <p style={s.rowName}>{name}</p>
        <p style={s.rowDesc}>{desc}</p>
      </div>
      <div style={s.badge}>
        {locked
          ? <span style={{ ...s.pill, background: '#E8F5E9', color: '#2D7D5A' }}>Siempre activo</span>
          : optional
          ? <span style={{ ...s.pill, background: '#FFF8E1', color: '#D97706' }}>Opcional</span>
          : null
        }
      </div>
    </div>
  )
}

// ─── Botón para el footer ─────────────────────────────────────────────────────

export function GestionarCookiesBtn() {
  const { resetConsent } = useCookieConsentContext()
  return (
    <button onClick={resetConsent} style={btnStyle}>
      Gestionar cookies
    </button>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
    padding: '16px',
    display: 'flex', justifyContent: 'center',
    pointerEvents: 'none',
  },
  banner: {
    pointerEvents: 'all',
    background: '#1C2B25',
    color: '#F5F0E8',
    borderRadius: 16,
    padding: '24px 28px',
    maxWidth: 680,
    width: '100%',
    boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
    fontFamily: "'Jost', 'Inter', sans-serif",
  },
  header: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  icon: { fontSize: 22 },
  title: { fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 },
  text: { fontSize: 13, color: 'rgba(245,240,232,0.75)', lineHeight: 1.7, margin: '0 0 20px' },
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap' as const, justifyContent: 'flex-end' },
  btnPrimary: {
    background: '#2D7D5A', color: '#fff', border: 'none',
    borderRadius: 99, padding: '10px 22px', fontSize: 13, fontWeight: 700,
    cursor: 'pointer',
  },
  btnSecondary: {
    background: 'transparent', color: '#F5F0E8',
    border: '1px solid rgba(245,240,232,0.3)',
    borderRadius: 99, padding: '10px 22px', fontSize: 13, fontWeight: 600,
    cursor: 'pointer',
  },
  btnGhost: {
    background: 'transparent', color: 'rgba(245,240,232,0.5)',
    border: 'none', padding: '10px 12px', fontSize: 13,
    cursor: 'pointer', textDecoration: 'underline',
  },
  link: { color: '#7CC9A5', textDecoration: 'underline' },
  table: { display: 'flex', flexDirection: 'column' as const, gap: 14, marginBottom: 20 },
  row: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  rowName: { fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 4px' },
  rowDesc: { fontSize: 12, color: 'rgba(245,240,232,0.6)', margin: 0, lineHeight: 1.6 },
  badge: { flexShrink: 0, paddingTop: 2 },
  pill: { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99 },
}

const btnStyle: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0,
  color: 'inherit', fontSize: 'inherit', cursor: 'pointer',
  textDecoration: 'underline', font: 'inherit',
}

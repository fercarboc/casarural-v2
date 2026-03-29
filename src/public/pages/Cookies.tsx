// src/public/pages/Cookies.tsx
import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'

export function Cookies() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <>
      <GlobalStyles />
      <div style={s.page}>
        <div style={s.hero}>
          <p style={s.heroLabel}>La Rasilla · Casa Rural</p>
          <h1 style={s.heroTitle}>Política de Cookies</h1>
          <p style={s.heroSub}>Qué cookies utilizamos y cómo puedes gestionarlas</p>
        </div>

        <div style={s.container}>

          <Section id="que-son" title="1. ¿Qué son las cookies?">
            <p>Las cookies son pequeños archivos de texto que los sitios web depositan en el dispositivo del usuario cuando los visita. Permiten al sitio recordar información sobre tu visita (como el idioma preferido o el estado de tu sesión), lo que puede hacer que tu próxima visita sea más fácil y el sitio más útil para ti.</p>
            <p>Las cookies no pueden dañar tu dispositivo ni acceder a información personal almacenada en él, más allá de lo que el sitio web depositó originalmente.</p>
          </Section>

          <Section id="tipos" title="2. Tipos de cookies que utilizamos">

            <CookieBlock
              tipo="Estrictamente necesarias"
              color="#2D4A3E"
              requiereConsentimiento={false}
              descripcion="Son imprescindibles para el funcionamiento básico del sitio y del motor de reservas. Sin ellas, no sería posible navegar por el sitio ni realizar una reserva. No pueden desactivarse."
              cookies={[
                ['__session', 'Supabase / propio', 'Sesión de administración', 'Sesión'],
                ['sb-access-token', 'Supabase', 'Token de autenticación del panel admin', 'Sesión'],
                ['sb-refresh-token', 'Supabase', 'Renovación de sesión de administración', '1 año'],
                ['cookieConsent', 'Propio', 'Almacena la decisión de consentimiento de cookies', '1 año'],
              ]}
            />

            <CookieBlock
              tipo="Analíticas (con consentimiento)"
              color="#1565C0"
              requiereConsentimiento={true}
              descripcion="Nos permiten conocer cómo los usuarios interactúan con el sitio: páginas más visitadas, tiempo de permanencia, origen del tráfico. La información se usa de forma agregada y anónima para mejorar el sitio. Solo se activan si das tu consentimiento."
              cookies={[
                ['va_*', 'Vercel Analytics', 'Identificador anónimo de visita para estadísticas de uso', 'Sesión'],
              ]}
            />

            <CookieBlock
              tipo="De preferencias"
              color="#D97706"
              requiereConsentimiento={true}
              descripcion="Recuerdan tus preferencias de navegación (como el número de huéspedes o las fechas de la última búsqueda) para ofrecerte una experiencia más personalizada."
              cookies={[
                ['lr_search_prefs', 'Propio', 'Última búsqueda de disponibilidad realizada', '30 días'],
              ]}
            />

          </Section>

          <Section id="terceros" title="3. Cookies de terceros">
            <p>El sitio integra servicios de terceros que pueden depositar sus propias cookies. En concreto:</p>
            <InfoTable rows={[
              ['Stripe', 'Gestión del proceso de pago seguro. Stripe puede depositar cookies funcionales necesarias para la verificación antifraude y el procesamiento del pago. Política: stripe.com/privacy'],
              ['Vercel Analytics', 'Análisis de tráfico web de forma anónima y sin cookies de seguimiento entre sitios. No requiere consentimiento bajo el RGPD en la mayoría de jurisdicciones. Política: vercel.com/legal/privacy-policy'],
            ]} />
            <p>No utilizamos cookies de redes sociales, publicidad comportamental ni remarketing.</p>
          </Section>

          <Section id="gestion" title="4. Cómo gestionar o desactivar las cookies">
            <p>Puedes gestionar tus preferencias de cookies de las siguientes formas:</p>

            <h3 style={s.subTitle}>4.1 Panel de preferencias del sitio</h3>
            <p>Al acceder por primera vez al sitio, se muestra un banner de consentimiento que te permite aceptar o rechazar las cookies no esenciales. Puedes cambiar tu decisión en cualquier momento haciendo clic en el enlace <strong>"Gestionar cookies"</strong> que aparece en el pie de página.</p>

            <h3 style={s.subTitle}>4.2 Configuración del navegador</h3>
            <p>Todos los navegadores modernos permiten configurar el tratamiento de cookies. Aquí tienes los enlaces a las guías de los más utilizados:</p>
            <ul>
              {[
                ['Google Chrome', 'https://support.google.com/chrome/answer/95647'],
                ['Mozilla Firefox', 'https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies'],
                ['Microsoft Edge', 'https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge'],
                ['Safari (Mac/iOS)', 'https://support.apple.com/es-es/guide/safari/sfri11471/mac'],
              ].map(([name, url]) => (
                <li key={name}><a href={url} target="_blank" rel="noopener noreferrer" style={s.link}>{name}</a></li>
              ))}
            </ul>
            <p>Ten en cuenta que desactivar las cookies estrictamente necesarias puede impedir el correcto funcionamiento del motor de reservas.</p>

            <h3 style={s.subTitle}>4.3 Vercel Analytics</h3>
            <p>Vercel Analytics recopila datos de forma anónima y agregada, sin identificar a usuarios individuales ni usar cookies persistentes de seguimiento. No es necesario ningún complemento adicional para excluirse; basta con desactivar las cookies analíticas desde el panel de preferencias del sitio.</p>
          </Section>

          <Section id="actualizaciones" title="5. Actualizaciones de esta política">
            <p>Esta Política de Cookies puede actualizarse cuando incorporemos nuevos servicios o cuando cambien las condiciones de los actuales. Cuando se produzcan cambios relevantes, mostraremos de nuevo el banner de consentimiento para informarte y permitirte revisar tus preferencias.</p>
            <p>Recomendamos revisar esta página periódicamente.</p>
          </Section>

          <div style={s.footer}>
            <p style={s.footerText}>Última actualización: marzo de 2026</p>
            <div style={s.footerLinks}>
              <Link to="/aviso-legal" style={s.footerLink}>Aviso Legal</Link>
              <span style={s.dot}>·</span>
              <Link to="/privacidad" style={s.footerLink}>Privacidad</Link>
              <span style={s.dot}>·</span>
              <Link to="/ayuda" style={s.footerLink}>Ayuda</Link>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={s.section}>
      <h2 style={s.sectionTitle}>{title}</h2>
      <div style={s.sectionBody}>{children}</div>
    </section>
  )
}

function CookieBlock({ tipo, color, requiereConsentimiento, descripcion, cookies }: {
  tipo: string; color: string; requiereConsentimiento: boolean
  descripcion: string; cookies: [string, string, string, string][]
}) {
  return (
    <div style={{ border: `1px solid ${color}25`, borderLeft: `3px solid ${color}`, borderRadius: '0 8px 8px 0', padding: '16px 20px', margin: '16px 0', background: color + '06' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tipo}</span>
        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: requiereConsentimiento ? '#FFF3E0' : '#F0F7F0', color: requiereConsentimiento ? '#D97706' : '#2D7D5A', fontWeight: 600 }}>
          {requiereConsentimiento ? 'Requiere consentimiento' : 'Sin consentimiento necesario'}
        </span>
      </div>
      <p style={{ fontSize: 13, color: '#555', lineHeight: 1.7, margin: '0 0 12px' }}>{descripcion}</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.05)' }}>
              {['Nombre', 'Proveedor', 'Propósito', 'Duración'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#555' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cookies.map(([nombre, proveedor, proposito, duracion], i) => (
              <tr key={i} style={{ borderTop: '1px solid rgba(0,0,0,0.06)', background: i % 2 === 0 ? 'rgba(255,255,255,0.6)' : 'transparent' }}>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: color }}>{nombre}</td>
                <td style={{ padding: '8px 12px', color: '#555' }}>{proveedor}</td>
                <td style={{ padding: '8px 12px', color: '#333' }}>{proposito}</td>
                <td style={{ padding: '8px 12px', color: '#777' }}>{duracion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InfoTable({ rows }: { rows: [string, string][] }) {
  return (
    <table style={s.infoTable}>
      <tbody>
        {rows.map(([label, value], i) => (
          <tr key={i} style={i % 2 === 0 ? s.trEven : s.trOdd}>
            <td style={s.tdLabel}>{label}</td>
            <td style={s.tdValue}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Jost:wght@300;400;500&display=swap');
      body { margin: 0; } * { box-sizing: border-box; }
    `}</style>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { background: '#F5F0E8', minHeight: '100vh', fontFamily: "'Jost', sans-serif" },
  hero: { background: '#2D4A3E', padding: '64px 24px 48px', textAlign: 'center' },
  heroLabel: { fontFamily: "'Cormorant Garamond', serif", fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4A882', margin: '0 0 12px' },
  heroTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 42, fontWeight: 600, color: '#fff', margin: '0 0 12px' },
  heroSub:   { fontSize: 15, color: 'rgba(255,255,255,0.65)', margin: 0 },
  container: { maxWidth: 820, margin: '0 auto', padding: '48px 24px 80px' },
  section:   { marginBottom: 48, paddingBottom: 48, borderBottom: '1px solid rgba(45,74,62,0.1)' },
  sectionTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, color: '#1C2B25', margin: '0 0 20px', paddingBottom: 12, borderBottom: '2px solid #C4A882', display: 'inline-block' },
  sectionBody: { fontSize: 14, color: '#444', lineHeight: 1.8 },
  subTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: '#2D4A3E', margin: '20px 0 8px' },
  infoTable: { width: '100%', borderCollapse: 'collapse', fontSize: 13, margin: '12px 0' },
  trEven: { background: '#F9F6F1' },
  trOdd:  { background: '#fff' },
  tdLabel: { padding: '10px 16px', color: '#777', fontWeight: 600, width: '22%', borderBottom: '1px solid #EEE', verticalAlign: 'top' },
  tdValue: { padding: '10px 16px', color: '#1C2B25', borderBottom: '1px solid #EEE' },
  link: { color: '#2D4A3E', textDecoration: 'underline' },
  footer: { marginTop: 48, textAlign: 'center' },
  footerText: { fontSize: 12, color: '#AAA', margin: '0 0 12px' },
  footerLinks: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  footerLink: { fontSize: 13, color: '#2D4A3E', textDecoration: 'none', fontWeight: 500 },
  dot: { color: '#CCC', fontSize: 13 },
}

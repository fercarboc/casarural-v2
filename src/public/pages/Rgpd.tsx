// src/public/pages/RGPD.tsx
// Información sobre el Reglamento General de Protección de Datos
// Página independiente accesible desde el footer → /rgpd
import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usePublicProperty } from '../../shared/hooks/usePublicProperty'

export function RGPD() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  const { property } = usePublicProperty()

  const propNombre    = property?.nombre ?? ''
  const responsable   = property?.legal_business_name ?? propNombre
  const emailContacto = property?.legal_email ?? property?.email ?? ''
  const telefono      = property?.legal_phone ?? property?.telefono ?? ''
  const domicilio     = property?.legal_address
    ?? [property?.direccion, property?.localidad, property?.provincia, property?.pais].filter(Boolean).join(', ')

  return (
    <>
      <GlobalStyles />
      <div style={s.page}>

        {/* Hero */}
        <div style={s.hero}>
          <div style={s.heroDecor} />
          <div style={s.heroContent}>
            <p style={s.heroEyebrow}>{propNombre ? `${propNombre} · Casa Rural` : 'Casa Rural'}</p>
            <h1 style={s.heroTitle}>Tus derechos bajo el RGPD</h1>
            <p style={s.heroSub}>
              El Reglamento General de Protección de Datos te otorga control total
              sobre tus datos personales. Aquí te explicamos cómo ejercerlos.
            </p>
            <div style={s.heroBadge}>
              Reglamento (UE) 2016/679 · LOPDGDD 3/2018 · Vigente desde mayo 2018
            </div>
          </div>
        </div>

        <div style={s.container}>

          {/* Intro */}
          <div style={s.introBox}>
            <p style={s.introText}>
              El <strong>Reglamento General de Protección de Datos (RGPD)</strong> es la norma
              europea que regula cómo las organizaciones tratan los datos personales de los ciudadanos
              de la Unión Europea. En España se complementa con la{' '}
              <strong>Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los
              derechos digitales (LOPDGDD)</strong>.
            </p>
            <p style={s.introText}>
              En {propNombre || 'nuestra casa rural'} tratamos tus datos con total transparencia y solo para las finalidades
              estrictamente necesarias para gestionar tu reserva y nuestra relación contigo.
              Nunca los vendemos ni los cedemos a terceros con fines comerciales.
            </p>
          </div>

          {/* Tus derechos — cards visuales */}
          <Section title="Tus 7 derechos fundamentales">
            <div style={s.derechosGrid}>
              {[
                {
                  letra: 'A',
                  nombre: 'Acceso',
                  desc: 'Tienes derecho a obtener confirmación de si estamos tratando tus datos personales y, en ese caso, acceder a ellos: qué datos tenemos, con qué finalidad, durante cuánto tiempo y a quién los hemos comunicado.',
                  color: '#2D4A3E',
                },
                {
                  letra: 'R',
                  nombre: 'Rectificación',
                  desc: 'Puedes solicitar que corrijamos datos inexactos o que completemos datos incompletos. Por ejemplo, si tu nombre o email están mal registrados en tu reserva.',
                  color: '#1565C0',
                },
                {
                  letra: 'S',
                  nombre: 'Supresión ("derecho al olvido")',
                  desc: 'Puedes pedir que eliminemos tus datos cuando ya no sean necesarios para la finalidad para la que se recogieron, cuando retires el consentimiento o cuando te opongas al tratamiento.',
                  color: '#6A1B9A',
                },
                {
                  letra: 'O',
                  nombre: 'Oposición',
                  desc: 'Puedes oponerte en cualquier momento al tratamiento de tus datos cuando este se base en nuestro interés legítimo. Dejaremos de tratarlos salvo que acreditemos motivos imperiosos que prevalezcan.',
                  color: '#C62828',
                },
                {
                  letra: 'L',
                  nombre: 'Limitación',
                  desc: 'Puedes solicitar que restrinjamos el tratamiento de tus datos en ciertos casos: si impugnas su exactitud, si el tratamiento es ilícito pero prefieres la limitación al borrado, o si los necesitas para una reclamación.',
                  color: '#D97706',
                },
                {
                  letra: 'P',
                  nombre: 'Portabilidad',
                  desc: 'Tienes derecho a recibir los datos que nos has facilitado en un formato estructurado, de uso común y lectura mecánica (por ejemplo, CSV o JSON), y a transmitirlos a otro responsable.',
                  color: '#2E7D32',
                },
                {
                  letra: 'C',
                  nombre: 'Retirar el consentimiento',
                  desc: 'Cuando el tratamiento se base en tu consentimiento (por ejemplo, cookies analíticas), puedes retirarlo en cualquier momento. La retirada no afecta a la licitud del tratamiento previo.',
                  color: '#37474F',
                },
              ].map(d => (
                <div key={d.letra} style={{ ...s.derechoCard, borderTop: `3px solid ${d.color}` }}>
                  <div style={{ ...s.derechoLetra, background: d.color }}>{d.letra}</div>
                  <h3 style={{ ...s.derechoNombre, color: d.color }}>{d.nombre}</h3>
                  <p style={s.derechoDesc}>{d.desc}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Cómo ejercer los derechos */}
          <Section title="Cómo ejercer tus derechos">
            <div style={s.ejercerBox}>
              <div style={s.ejercerStep}>
                <div style={s.ejercerNum}>1</div>
                <div>
                  <p style={s.ejercerTitle}>Escríbenos por email</p>
                  <p style={s.ejercerDesc}>
                    Envía tu solicitud a{' '}
                    {emailContacto
                      ? <a href={`mailto:${emailContacto}`} style={s.link}>{emailContacto}</a>
                      : 'nuestro email de contacto'
                    }{' '}
                    indicando claramente qué derecho deseas ejercer y adjuntando una copia de
                    tu DNI u otro documento de identidad válido para verificar tu identidad.
                  </p>
                </div>
              </div>

              <div style={s.ejercerStep}>
                <div style={s.ejercerNum}>2</div>
                <div>
                  <p style={s.ejercerTitle}>Plazo de respuesta</p>
                  <p style={s.ejercerDesc}>
                    Responderemos a tu solicitud en el plazo máximo de <strong>1 mes</strong> desde
                    su recepción. En casos complejos o con gran número de solicitudes, podemos
                    ampliar este plazo hasta 2 meses adicionales, informándote de ello.
                  </p>
                </div>
              </div>

              <div style={s.ejercerStep}>
                <div style={s.ejercerNum}>3</div>
                <div>
                  <p style={s.ejercerTitle}>Sin coste</p>
                  <p style={s.ejercerDesc}>
                    El ejercicio de tus derechos es <strong>gratuito</strong>. Solo podríamos
                    cobrar una tasa razonable en caso de solicitudes manifiestamente infundadas
                    o excesivas, o negarnos a actuar en esos casos.
                  </p>
                </div>
              </div>

              <div style={s.ejercerStep}>
                <div style={s.ejercerNum}>4</div>
                <div>
                  <p style={s.ejercerTitle}>Reclamación ante la AEPD</p>
                  <p style={s.ejercerDesc}>
                    Si no quedas satisfecho con nuestra respuesta, tienes derecho a presentar
                    una reclamación ante la{' '}
                    <strong>Agencia Española de Protección de Datos (AEPD)</strong>:{' '}
                    <a
                      href="https://www.aepd.es"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={s.link}
                    >
                      www.aepd.es
                    </a>
                    {' '}· Teléfono: 901 100 099
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* Bases jurídicas */}
          <Section title="Bases jurídicas que usamos para tratar tus datos">
            <p style={s.bodyText}>
              El RGPD exige que todo tratamiento de datos tenga una base jurídica válida.
              En La Rasilla usamos las siguientes:
            </p>
            <div style={s.basesGrid}>
              {[
                {
                  base: 'Ejecución del contrato',
                  art: 'Art. 6.1.b RGPD',
                  uso: 'Para gestionar tu reserva, procesar el pago, enviarte el email de confirmación, aplicar la política de cancelación y registrar el reembolso o retención correspondiente.',
                  color: '#2D4A3E',
                },
                {
                  base: 'Obligación legal',
                  art: 'Art. 6.1.c RGPD',
                  uso: 'Para cumplir con las obligaciones fiscales y contables (Ley General Tributaria, normativa de servicios de pago). Incluye el registro de ingresos por penalizaciones de cancelación.',
                  color: '#1565C0',
                },
                {
                  base: 'Interés legítimo',
                  art: 'Art. 6.1.f RGPD',
                  uso: 'Para atender consultas previas a la reserva, mantener comunicación contigo y mejorar la experiencia del sitio web.',
                  color: '#D97706',
                },
                {
                  base: 'Consentimiento',
                  art: 'Art. 6.1.a RGPD',
                  uso: 'Para instalar cookies analíticas o de preferencias. Puedes retirar este consentimiento en cualquier momento desde el panel de gestión de cookies.',
                  color: '#6A1B9A',
                },
              ].map(b => (
                <div key={b.base} style={{ ...s.baseCard, borderLeft: `3px solid ${b.color}` }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ ...s.baseNombre, color: b.color }}>{b.base}</span>
                    <span style={{ ...s.baseArt, background: b.color + '15', color: b.color }}>{b.art}</span>
                  </div>
                  <p style={s.baseUso}>{b.uso}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Transferencias internacionales */}
          <Section title="Transferencias internacionales de datos">
            <p style={s.bodyText}>
              Algunos de los encargados de tratamiento que usamos tienen su sede fuera del
              Espacio Económico Europeo (EEE). En todos los casos hemos verificado que
              cuentan con garantías adecuadas conforme al RGPD:
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr style={{ background: '#2D4A3E' }}>
                    {['Proveedor', 'País', 'Garantía aplicable', 'Finalidad'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Stripe', 'Irlanda (UE)', 'Dentro del EEE', 'Procesamiento de pagos'],
                    ['Supabase', 'UE (Frankfurt)', 'Dentro del EEE', 'Base de datos y backend'],
                    ['Vercel', 'UE (disponible)', 'Dentro del EEE / SCCs', 'Hosting del sitio web'],
                    ['Resend', 'EE.UU.', 'Cláusulas Contractuales Tipo (SCCs)', 'Envío de emails transaccionales'],
                  ].map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#F9F6F1' : '#fff' }}>
                      {row.map((cell, j) => (
                        <td key={j} style={s.td}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ ...s.bodyText, fontSize: 12, color: '#888', marginTop: 8 }}>
              SCCs = Standard Contractual Clauses (Cláusulas Contractuales Tipo aprobadas por la Comisión Europea).
            </p>
          </Section>

          {/* Seguridad */}
          <Section title="Medidas de seguridad que aplicamos">
            <div style={s.seguridadGrid}>
              {[
                { icon: '🔒', titulo: 'Cifrado en tránsito', desc: 'Todo el tráfico entre tu navegador y nuestros servidores está cifrado con TLS 1.3 (HTTPS). Los datos nunca viajan en texto plano.' },
                { icon: '🛡️', titulo: 'Control de acceso', desc: 'El panel de administración requiere autenticación mediante Supabase Auth. Las tablas de datos tienen políticas de seguridad a nivel de fila (Row Level Security).' },
                { icon: '💳', titulo: 'Pagos seguros', desc: 'Los datos de tarjeta son gestionados exclusivamente por Stripe (PCI DSS nivel 1). En ningún momento almacenamos número de tarjeta ni CVV en nuestros sistemas.' },
                { icon: '🗄️', titulo: 'Minimización de datos', desc: 'Solo recogemos los datos estrictamente necesarios para gestionar tu reserva. No pedimos información adicional que no sea imprescindible.' },
                { icon: '⏱️', titulo: 'Retención limitada', desc: 'Los datos se conservan únicamente durante el plazo necesario para la finalidad para la que se recogieron o para cumplir obligaciones legales.' },
                { icon: '🔑', titulo: 'Acceso restringido', desc: 'Solo el titular del alojamiento tiene acceso al panel de administración y a los datos de reservas. No hay acceso por parte de terceros no autorizados.' },
              ].map(m => (
                <div key={m.titulo} style={s.seguridadCard}>
                  <span style={s.seguridadIcon}>{m.icon}</span>
                  <div>
                    <p style={s.seguridadTitulo}>{m.titulo}</p>
                    <p style={s.seguridadDesc}>{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Contacto DPD */}
          <Section title="Contacto y delegado de protección de datos">
            <div style={s.contactBox}>
              <div style={s.contactInfo}>
                <p style={s.bodyText}>
                  Para cualquier consulta relativa al tratamiento de tus datos personales
                  o para ejercer tus derechos, puedes dirigirte al responsable del tratamiento:
                </p>
                <div style={s.contactDetails}>
                  {[
                    ['Responsable', responsable],
                    ['Email',       emailContacto],
                    ['Teléfono',    telefono],
                    ['Dirección',   domicilio],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label} style={s.contactRow}>
                      <span style={s.contactLabel}>{label}</span>
                      <span style={s.contactValue}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={s.aepd}>
                <p style={s.aepdTitle}>Agencia Española de Protección de Datos</p>
                <p style={s.aepdDesc}>
                  Si consideras que tus derechos no han sido atendidos correctamente,
                  puedes presentar una reclamación ante la autoridad de control:
                </p>
                <a
                  href="https://www.aepd.es/es/derechos-y-deberes/conoce-tus-derechos"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={s.aepdLink}
                >
                  Reclamar ante la AEPD →
                </a>
              </div>
            </div>
          </Section>

          {/* Footer */}
          <div style={s.pageFooter}>
            <p style={s.pageFooterText}>
              Este documento se complementa con la{' '}
              <Link to="/privacidad" style={s.link}>Política de Privacidad</Link>
              {' '}y el{' '}
              <Link to="/aviso-legal" style={s.link}>Aviso Legal</Link>.
              Última actualización: marzo de 2026.
            </p>
            <div style={s.footerLinks}>
              <Link to="/aviso-legal"  style={s.footerLink}>Aviso Legal</Link>
              <span style={s.dot}>·</span>
              <Link to="/privacidad"   style={s.footerLink}>Privacidad</Link>
              <span style={s.dot}>·</span>
              <Link to="/cookies"      style={s.footerLink}>Cookies</Link>
              <span style={s.dot}>·</span>
              <Link to="/condiciones"  style={s.footerLink}>Condiciones</Link>
              <span style={s.dot}>·</span>
              <Link to="/ayuda"        style={s.footerLink}>Ayuda</Link>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={s.section}>
      <h2 style={s.sectionTitle}>{title}</h2>
      {children}
    </section>
  )
}

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Jost:wght@300;400;500&display=swap');
      body { margin: 0; }
      * { box-sizing: border-box; }
    `}</style>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: { background: '#F5F0E8', minHeight: '100vh', fontFamily: "'Jost', sans-serif" },

  // Hero
  hero: { background: '#1C2B25', padding: '80px 24px 56px', textAlign: 'center', position: 'relative', overflow: 'hidden' },
  heroDecor: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(ellipse at 60% 0%, rgba(196,168,130,0.12) 0%, transparent 60%)',
    pointerEvents: 'none',
  },
  heroContent: { position: 'relative', zIndex: 1 },
  heroEyebrow: { fontFamily: "'Cormorant Garamond', serif", fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4A882', margin: '0 0 14px' },
  heroTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 46, fontWeight: 600, color: '#fff', margin: '0 0 16px', lineHeight: 1.15 },
  heroSub:   { fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxWidth: 540, margin: '0 auto 20px' },
  heroBadge: { display: 'inline-block', fontSize: 11, fontWeight: 500, color: '#C4A882', border: '1px solid rgba(196,168,130,0.35)', borderRadius: 20, padding: '6px 16px', letterSpacing: '0.04em' },

  // Layout
  container: { maxWidth: 860, margin: '0 auto', padding: '56px 24px 80px' },
  section:   { marginBottom: 56, paddingBottom: 56, borderBottom: '1px solid rgba(45,74,62,0.1)' },
  sectionTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 26, fontWeight: 600, color: '#1C2B25',
    margin: '0 0 28px', paddingBottom: 12,
    borderBottom: '2px solid #C4A882',
    display: 'inline-block',
  },
  bodyText: { fontSize: 14, color: '#444', lineHeight: 1.8, margin: '0 0 16px' },

  // Intro box
  introBox: { background: '#fff', borderRadius: 14, padding: '28px 32px', marginBottom: 56, border: '1px solid rgba(45,74,62,0.1)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' },
  introText: { fontSize: 14, color: '#444', lineHeight: 1.9, margin: '0 0 12px' },

  // Derechos grid
  derechosGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 },
  derechoCard:  { background: '#fff', borderRadius: 12, padding: '20px', border: '1px solid rgba(45,74,62,0.08)', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' },
  derechoLetra: { width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, marginBottom: 12 },
  derechoNombre:{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600, margin: '0 0 8px' },
  derechoDesc:  { fontSize: 12, color: '#666', lineHeight: 1.7, margin: 0 },

  // Ejercer derechos
  ejercerBox:  { display: 'flex', flexDirection: 'column', gap: 24 },
  ejercerStep: { display: 'flex', gap: 20, alignItems: 'flex-start' },
  ejercerNum:  { width: 38, height: 38, borderRadius: '50%', background: '#2D4A3E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0, fontFamily: "'Cormorant Garamond', serif" },
  ejercerTitle: { fontSize: 15, fontWeight: 600, color: '#1C2B25', margin: '0 0 6px' },
  ejercerDesc:  { fontSize: 13, color: '#555', lineHeight: 1.7, margin: 0 },

  // Bases jurídicas
  basesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  baseCard:  { background: '#fff', borderRadius: '0 10px 10px 0', padding: '16px 20px', border: '1px solid rgba(45,74,62,0.08)' },
  baseNombre:{ fontSize: 14, fontWeight: 700, margin: 0 },
  baseArt:   { fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' as const, flexShrink: 0 },
  baseUso:   { fontSize: 13, color: '#555', lineHeight: 1.7, margin: 0 },

  // Tabla
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, borderRadius: 8, overflow: 'hidden' },
  th:    { padding: '11px 16px', color: '#fff', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: '0.05em', textAlign: 'left' as const },
  td:    { padding: '11px 16px', borderBottom: '1px solid #EEE', color: '#333' },

  // Seguridad
  seguridadGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 },
  seguridadCard: { background: '#fff', borderRadius: 12, padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'flex-start', border: '1px solid rgba(45,74,62,0.08)' },
  seguridadIcon: { fontSize: 24, flexShrink: 0, marginTop: 2 },
  seguridadTitulo: { fontSize: 13, fontWeight: 600, color: '#1C2B25', margin: '0 0 4px' },
  seguridadDesc:   { fontSize: 12, color: '#666', lineHeight: 1.6, margin: 0 },

  // Contacto
  contactBox: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 },
  contactInfo: { background: '#fff', borderRadius: 12, padding: '24px', border: '1px solid rgba(45,74,62,0.1)' },
  contactDetails: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 },
  contactRow:   { display: 'flex', gap: 12, alignItems: 'flex-start' },
  contactLabel: { fontSize: 12, color: '#999', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', width: 90, flexShrink: 0, paddingTop: 1 },
  contactValue: { fontSize: 13, color: '#1C2B25' },
  aepd:         { background: '#2D4A3E', borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  aepdTitle:    { fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: '#fff', margin: '0 0 10px' },
  aepdDesc:     { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, margin: '0 0 16px' },
  aepdLink:     { display: 'inline-block', background: '#C4A882', color: '#1C2B25', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' },

  // Links
  link: { color: '#2D4A3E', textDecoration: 'underline' },

  // Page footer
  pageFooter:     { marginTop: 56, textAlign: 'center' },
  pageFooterText: { fontSize: 13, color: '#888', lineHeight: 1.7, margin: '0 0 16px' },
  footerLinks:    { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  footerLink:     { fontSize: 13, color: '#2D4A3E', textDecoration: 'none', fontWeight: 500 },
  dot:            { color: '#CCC', fontSize: 13 },
}
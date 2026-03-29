// src/public/pages/Privacidad.tsx
import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'

export function Privacidad() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <>
      <GlobalStyles />
      <div style={s.page}>
        <div style={s.hero}>
          <p style={s.heroLabel}>La Rasilla · Casa Rural</p>
          <h1 style={s.heroTitle}>Política de Privacidad</h1>
          <p style={s.heroSub}>Cómo tratamos tus datos personales</p>
        </div>

        <div style={s.container}>

          <Section id="responsable" title="1. Responsable del tratamiento">
            <InfoTable rows={[
              ['Responsable', 'Fernando Carbonell de la Rasilla'],
              ['Actividad', 'Alojamiento rural — Casa Rural La Rasilla'],
              ['Domicilio', 'Castillo Pedroso, Cantabria, España'],
              ['Email de contacto / DPD', 'contacto@casarurallarasilla.com'],
              ['Teléfono', '+34 690 288 707'],
            ]} />
          </Section>

          <Section id="datos" title="2. Datos personales que tratamos">
            <p>En función de la actividad realizada, tratamos las siguientes categorías de datos personales:</p>

            <SubSection title="2.1 Datos de reserva">
              <ul>
                <li>Nombre y apellidos del titular de la reserva</li>
                <li>Dirección de correo electrónico</li>
                <li>Número de teléfono</li>
                <li>Fechas de entrada y salida</li>
                <li>Número de huéspedes</li>
                <li>Tarifa contratada e importes</li>
                <li>Identificador de la reserva y estado de pago</li>
              </ul>
              <p>Los datos de pago (tarjeta de crédito o débito) son gestionados íntegramente por <strong>Stripe Payments Europe, Ltd.</strong> Nunca almacenamos ni tenemos acceso al número completo de tarjeta ni al CVV. Stripe actúa como encargado de tratamiento y cumple con PCI DSS nivel 1.</p>
            </SubSection>

            <SubSection title="2.2 Datos de contacto">
              <ul>
                <li>Nombre y apellidos</li>
                <li>Dirección de correo electrónico</li>
                <li>Teléfono (si se facilita voluntariamente)</li>
                <li>Contenido del mensaje enviado</li>
              </ul>
            </SubSection>

            <SubSection title="2.3 Datos de navegación">
              <p>Utilizamos Vercel Analytics para recoger datos técnicos de navegación de forma anónima y agregada (páginas visitadas, tiempo de permanencia, dispositivo utilizado). Vercel Analytics no usa cookies ni rastrea usuarios individuales, por lo que no requiere consentimiento previo. Consulta la <Link to="/cookies" style={s.link}>Política de Cookies</Link> para más información.</p>
            </SubSection>
          </Section>

          <Section id="finalidades" title="3. Finalidades y base jurídica del tratamiento">
            <table style={s.infoTable}>
              <thead>
                <tr style={{ background: '#2D4A3E' }}>
                  <th style={s.th}>Finalidad</th>
                  <th style={s.th}>Base jurídica (RGPD)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Gestionar la reserva del alojamiento y el cobro', 'Ejecución del contrato (art. 6.1.b)'],
                  ['Enviar emails transaccionales (confirmación, cancelación, recordatorio)', 'Ejecución del contrato (art. 6.1.b)'],
                  ['Gestionar cancelaciones y aplicar política de cancelación', 'Ejecución del contrato (art. 6.1.b)'],
                  ['Atender consultas y solicitudes de información', 'Interés legítimo o consentimiento (art. 6.1.a / 6.1.f)'],
                  ['Cumplir obligaciones contables y fiscales', 'Obligación legal (art. 6.1.c)'],
                  ['Análisis estadístico anónimo del sitio web (Vercel Analytics, sin cookies)', 'Interés legítimo (art. 6.1.f) — datos anónimos y agregados, sin identificación individual'],
                  ['Registro de retenciones por cancelación para control fiscal', 'Obligación legal (art. 6.1.c)'],
                ].map(([fin, base], i) => (
                  <tr key={i} style={i % 2 === 0 ? s.trEven : s.trOdd}>
                    <td style={s.tdLabel}>{fin}</td>
                    <td style={s.tdValue}>{base}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section id="conservacion" title="4. Plazo de conservación">
            <p>Los datos se conservan durante los siguientes plazos:</p>
            <InfoTable rows={[
              ['Datos de reserva (activa o completada)', '5 años — obligaciones fiscales (Ley General Tributaria)'],
              ['Datos de reservas canceladas con retención', '5 años — justificación de ingresos ante Hacienda'],
              ['Datos de contacto y consultas', '1 año desde la última comunicación'],
              ['Datos de navegación anónimos (Vercel Analytics)', 'Datos agregados, sin retención individual identificable'],
              ['Datos de pagos (referencia Stripe)', '5 años — normativa de servicios de pago'],
            ]} />
            <p>Transcurridos estos plazos, los datos serán eliminados o anonimizados de forma segura.</p>
          </Section>

          <Section id="destinatarios" title="5. Destinatarios de los datos">
            <p>No cedemos tus datos personales a terceros salvo en los siguientes casos, necesarios para la prestación del servicio:</p>
            <InfoTable rows={[
              ['Stripe Payments Europe, Ltd.', 'Procesamiento de pagos. Encargado de tratamiento. Sede en Irlanda (UE).'],
              ['Resend, Inc.', 'Envío de emails transaccionales. Encargado de tratamiento. Transferencia internacional con garantías adecuadas (SCCs).'],
              ['Supabase, Inc.', 'Infraestructura de base de datos y backend. Encargado de tratamiento. Datos en servidores UE (Frankfurt).'],
              ['Vercel, Inc.', 'Hosting del sitio web. Encargado de tratamiento. Servidores disponibles en UE.'],
              ['Hacienda / AEAT', 'En cumplimiento de obligaciones fiscales legales. Cesión basada en obligación legal.'],
            ]} />
            <p>No vendemos ni alquilamos datos personales a terceros con fines comerciales.</p>
          </Section>

          <Section id="derechos" title="6. Tus derechos">
            <p>En virtud del Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD), puedes ejercer los siguientes derechos:</p>
            <InfoTable rows={[
              ['Acceso', 'Obtener confirmación de si tratamos tus datos y una copia de ellos.'],
              ['Rectificación', 'Solicitar la corrección de datos inexactos o incompletos.'],
              ['Supresión', 'Solicitar el borrado cuando ya no sean necesarios o retires el consentimiento.'],
              ['Oposición', 'Oponerte al tratamiento basado en interés legítimo.'],
              ['Limitación', 'Solicitar la restricción del tratamiento en determinadas circunstancias.'],
              ['Portabilidad', 'Recibir tus datos en formato estructurado y legible por máquina.'],
              ['Retirar consentimiento', 'Retirar el consentimiento dado en cualquier momento, sin efecto retroactivo.'],
            ]} />
            <p>Para ejercer cualquiera de estos derechos, dirígete a: <a href="mailto:contacto@casarurallarasilla.com" style={s.link}>contacto@casarurallarasilla.com</a></p>
            <p>Asimismo, tienes derecho a presentar una reclamación ante la <strong>Agencia Española de Protección de Datos (AEPD)</strong>: <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" style={s.link}>www.aepd.es</a></p>
          </Section>

          <Section id="seguridad" title="7. Seguridad de los datos">
            <p>Aplicamos medidas técnicas y organizativas apropiadas para proteger tus datos frente a accesos no autorizados, pérdida, destrucción o alteración, incluyendo:</p>
            <ul>
              <li>Cifrado de las comunicaciones mediante protocolo HTTPS (TLS).</li>
              <li>Acceso restringido a los datos de reserva mediante autenticación segura.</li>
              <li>Políticas de control de acceso en la base de datos (Row Level Security).</li>
              <li>Gestión de pagos exclusivamente a través de Stripe (certificación PCI DSS nivel 1).</li>
            </ul>
          </Section>

          <Section id="menores" title="8. Menores de edad">
            <p>El servicio de alojamiento está destinado exclusivamente a personas mayores de 18 años. No recogemos conscientemente datos personales de menores. Si detectamos que hemos recibido datos de un menor de edad sin consentimiento parental verificado, procederemos a su eliminación inmediata.</p>
          </Section>

          <div style={s.footer}>
            <p style={s.footerText}>Última actualización: marzo de 2026</p>
            <div style={s.footerLinks}>
              <Link to="/aviso-legal" style={s.footerLink}>Aviso Legal</Link>
              <span style={s.dot}>·</span>
              <Link to="/cookies" style={s.footerLink}>Política de Cookies</Link>
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

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ margin: '16px 0' }}>
      <h3 style={s.subTitle}>{title}</h3>
      {children}
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
  subTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: '#2D4A3E', margin: '16px 0 8px' },
  infoTable: { width: '100%', borderCollapse: 'collapse', fontSize: 13, borderRadius: 8, overflow: 'hidden', margin: '12px 0' },
  trEven: { background: '#F9F6F1' },
  trOdd:  { background: '#fff' },
  tdLabel: { padding: '10px 16px', color: '#777', fontWeight: 500, width: '38%', borderBottom: '1px solid #EEE', verticalAlign: 'top' },
  tdValue: { padding: '10px 16px', color: '#1C2B25', borderBottom: '1px solid #EEE' },
  th: { padding: '11px 16px', color: '#fff', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' },
  link: { color: '#2D4A3E', textDecoration: 'underline' },
  footer: { marginTop: 48, textAlign: 'center' },
  footerText: { fontSize: 12, color: '#AAA', margin: '0 0 12px' },
  footerLinks: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  footerLink: { fontSize: 13, color: '#2D4A3E', textDecoration: 'none', fontWeight: 500 },
  dot: { color: '#CCC', fontSize: 13 },
}

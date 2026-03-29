// src/public/pages/Condiciones.tsx
// Condiciones generales de reserva — resumen visual y accesible del Aviso Legal
import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'

export function Condiciones() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <>
      <GlobalStyles />
      <div style={s.page}>
        <div style={s.hero}>
          <p style={s.heroLabel}>La Rasilla · Casa Rural</p>
          <h1 style={s.heroTitle}>Condiciones de Reserva</h1>
          <p style={s.heroSub}>Todo lo que necesitas saber antes de reservar</p>
        </div>

        <div style={s.container}>

          {/* Resumen visual de tarifas */}
          <Section title="Tarifas disponibles">
            <div style={s.tarifasGrid}>
              <TarifaCard
                nombre="Flexible"
                color="#1565C0"
                precio="Precio completo"
                pago="Señal del 30% al reservar"
                destacado={false}
                items={[
                  'Cancelación con reembolso según antelación',
                  'Resto del pago antes de la llegada',
                  'Política de cancelación aplicable',
                  'Recomendada si no tienes fechas seguras',
                ]}
              />
              <TarifaCard
                nombre="No reembolsable"
                color="#D97706"
                precio="10% de descuento sobre alojamiento"
                pago="Pago total al reservar"
                destacado={true}
                items={[
                  'Sin reembolso bajo ninguna circunstancia',
                  'Pago único e irrevocable al confirmar',
                  'Ideal si tus fechas son definitivas',
                  'El descuento NO aplica sobre limpieza (50 €)',
                ]}
              />
            </div>
            <p style={s.nota}>
              La limpieza (50 €) es un suplemento fijo por estancia y <strong>no está incluida en el precio por noche</strong>.
              No es reembolsable en ninguna de las dos tarifas.
            </p>
          </Section>

          {/* Política de cancelación tabla */}
          <Section title="Política de cancelación — tarifa Flexible">
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr style={{ background: '#2D4A3E' }}>
                    <th style={s.th}>Días hasta la entrada</th>
                    <th style={s.th}>Reembolso sobre lo pagado</th>
                    <th style={s.th}>Lo que retenemos</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['60 días o más', '100%', 'Nada (solo limpieza no reembolsable)'],
                    ['Entre 45 y 59 días', '50%', '50% del alojamiento + limpieza'],
                    ['Entre 30 y 44 días', '25%', '75% del alojamiento + limpieza'],
                    ['Menos de 30 días', '0%', 'Importe íntegro pagado'],
                  ].map(([dias, rem, ret], i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#F9F6F1' : '#fff' }}>
                      <td style={s.td}>{dias}</td>
                      <td style={{ ...s.td, fontWeight: 700, color: i === 0 ? '#2D7D5A' : i === 3 ? '#C62828' : '#1565C0' }}>{rem}</td>
                      <td style={s.td}>{ret}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AlertBox>
              <strong>Tarifa No reembolsable:</strong> No aplica ningún reembolso independientemente de la antelación. Al elegir esta tarifa y confirmar el pago, aceptas expresamente la renuncia total a cualquier devolución.
            </AlertBox>
          </Section>

          {/* Horarios y normas */}
          <Section title="Horarios y normas del alojamiento">
            <div style={s.normasGrid}>
              <NormaItem icon="🕓" titulo="Check-in" texto="A partir de las 16:00 h" />
              <NormaItem icon="🕛" titulo="Check-out" texto="Antes de las 12:00 h" />
              <NormaItem icon="👥" titulo="Capacidad máxima" texto="11 huéspedes (10 incluidos en precio)" />
              <NormaItem icon="🚭" titulo="No fumadores" texto="Prohibido fumar en el interior" />
              <NormaItem icon="🐾" titulo="Mascotas" texto="No permitidas" />
              <NormaItem icon="🎉" titulo="Eventos" texto="No permitidos sin autorización previa" />
            </div>
          </Section>

          {/* Proceso de pago */}
          <Section title="Proceso de pago">
            <div style={s.pasosList}>
              {[
                { n: '1', t: 'Selección y cálculo', d: 'Elige fechas, huéspedes y tarifa. El sistema calcula el precio en tiempo real.' },
                { n: '2', t: 'Datos personales', d: 'Introduce nombre, email y teléfono del titular de la reserva.' },
                { n: '3', t: 'Pago seguro con Stripe', d: 'Pago mediante tarjeta de crédito/débito a través de Stripe (PCI DSS nivel 1). No almacenamos datos de tarjeta.' },
                { n: '4', t: 'Confirmación inmediata', d: 'Recibirás un email con el código de reserva, el desglose y los enlaces de gestión.' },
              ].map(paso => (
                <div key={paso.n} style={s.paso}>
                  <div style={s.pasoNum}>{paso.n}</div>
                  <div>
                    <p style={s.pasoTitulo}>{paso.t}</p>
                    <p style={s.pasoDesc}>{paso.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Aviso cancelación */}
          <Section title="Importante antes de confirmar">
            <div style={s.importanteGrid}>
              <ImportanteItem color="#C62828" icon="⚠️" titulo="Tarifa No reembolsable" texto="Si seleccionas esta tarifa y pagas, no recibirás ninguna devolución si cancelas, cambias de opinión o no puedes asistir por cualquier motivo (enfermedad, trabajo, familia, fuerza mayor, etc.). Solo elige esta tarifa si tus fechas son definitivas al 100%." />
              <ImportanteItem color="#1565C0" icon="ℹ️" titulo="Modificaciones" texto="No es posible modificar fechas a través del sistema. Si necesitas cambiar las fechas, contáctanos y lo estudiaremos según disponibilidad, sin garantía de aceptación." />
              <ImportanteItem color="#2D7D5A" icon="✓" titulo="Recomendación" texto="Si tienes alguna duda sobre las fechas, elige la tarifa Flexible. El sobrecoste es mínimo comparado con la tranquilidad de poder cancelar con reembolso." />
            </div>
          </Section>

          {/* CTA */}
          <div style={s.ctaBox}>
            <h3 style={s.ctaTitle}>¿Tienes alguna duda antes de reservar?</h3>
            <p style={s.ctaSub}>Estamos disponibles para resolver cualquier consulta.</p>
            <div style={s.ctaActions}>
              <Link to="/ayuda" style={s.btnSecondary}>Ver ayuda completa</Link>
              <a href="https://wa.me/34690288707" target="_blank" rel="noopener noreferrer" style={s.btnPrimary}>
                Contactar por WhatsApp
              </a>
            </div>
          </div>

          <div style={s.footer}>
            <p style={s.footerText}>
              Estas condiciones son un resumen. El documento legal completo está disponible en el{' '}
              <Link to="/aviso-legal" style={s.link}>Aviso Legal</Link>.
              Última actualización: marzo de 2026.
            </p>
            <div style={s.footerLinks}>
              <Link to="/aviso-legal" style={s.footerLink}>Aviso Legal</Link>
              <span style={s.dot}>·</span>
              <Link to="/privacidad" style={s.footerLink}>Privacidad</Link>
              <span style={s.dot}>·</span>
              <Link to="/cookies" style={s.footerLink}>Cookies</Link>
              <span style={s.dot}>·</span>
              <Link to="/ayuda" style={s.footerLink}>Ayuda</Link>
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

function TarifaCard({ nombre, color, precio, pago, destacado, items }: {
  nombre: string; color: string; precio: string; pago: string; destacado: boolean; items: string[]
}) {
  return (
    <div style={{ ...s.tarifaCard, borderTop: `4px solid ${color}`, boxShadow: destacado ? `0 4px 24px ${color}20` : undefined }}>
      <p style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>{nombre}</p>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: '#1C2B25', margin: '0 0 4px' }}>{precio}</p>
      <p style={{ fontSize: 12, color: '#888', margin: '0 0 16px' }}>{pago}</p>
      <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 13, color: '#444', lineHeight: 2 }}>
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  )
}

function NormaItem({ icon, titulo, texto }: { icon: string; titulo: string; texto: string }) {
  return (
    <div style={s.normaItem}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#2D4A3E', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{titulo}</p>
        <p style={{ fontSize: 13, color: '#444', margin: 0 }}>{texto}</p>
      </div>
    </div>
  )
}

function ImportanteItem({ color, icon, titulo, texto }: { color: string; icon: string; titulo: string; texto: string }) {
  return (
    <div style={{ border: `1px solid ${color}25`, borderTop: `3px solid ${color}`, borderRadius: '0 0 8px 8px', padding: '16px 20px', background: color + '06' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color, margin: '0 0 8px' }}>{icon} {titulo}</p>
      <p style={{ fontSize: 13, color: '#444', lineHeight: 1.7, margin: 0 }}>{texto}</p>
    </div>
  )
}

function AlertBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFF8EE', border: '1px solid #F5DFB0', borderLeft: '3px solid #D97706', borderRadius: '0 8px 8px 0', padding: '14px 18px', margin: '16px 0', fontSize: 14, color: '#7A5F2A', lineHeight: 1.7 }}>
      {children}
    </div>
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
  page:      { background: '#F5F0E8', minHeight: '100vh', fontFamily: "'Jost', sans-serif" },
  hero:      { background: '#2D4A3E', padding: '64px 24px 48px', textAlign: 'center' },
  heroLabel: { fontFamily: "'Cormorant Garamond', serif", fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4A882', margin: '0 0 12px' },
  heroTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 42, fontWeight: 600, color: '#fff', margin: '0 0 12px' },
  heroSub:   { fontSize: 15, color: 'rgba(255,255,255,0.65)', margin: 0 },
  container: { maxWidth: 820, margin: '0 auto', padding: '48px 24px 80px' },
  section:   { marginBottom: 48, paddingBottom: 48, borderBottom: '1px solid rgba(45,74,62,0.1)' },
  sectionTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: '#1C2B25', margin: '0 0 24px', paddingBottom: 12, borderBottom: '2px solid #C4A882', display: 'inline-block' },
  tarifasGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 },
  tarifaCard:    { background: '#fff', borderRadius: 8, padding: '20px 24px', border: '1px solid rgba(45,74,62,0.1)' },
  nota: { fontSize: 13, color: '#777', background: '#F9F6F1', borderRadius: 8, padding: '12px 16px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, borderRadius: 8, overflow: 'hidden', marginBottom: 16 },
  th: { padding: '11px 16px', color: '#fff', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' },
  td: { padding: '11px 16px', borderBottom: '1px solid #EEE', color: '#333' },
  normasGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  normaItem:     { background: '#fff', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', border: '1px solid rgba(45,74,62,0.08)' },
  pasosList:     { display: 'flex', flexDirection: 'column', gap: 16 },
  paso:          { display: 'flex', gap: 16, alignItems: 'flex-start' },
  pasoNum:       { width: 32, height: 32, borderRadius: '50%', background: '#2D4A3E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 },
  pasoTitulo:    { fontWeight: 600, color: '#1C2B25', fontSize: 14, margin: '0 0 4px' },
  pasoDesc:      { fontSize: 13, color: '#555', lineHeight: 1.6, margin: 0 },
  importanteGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 },
  ctaBox: { background: '#2D4A3E', borderRadius: 16, padding: '36px 40px', textAlign: 'center', marginBottom: 48 },
  ctaTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: '#fff', margin: '0 0 8px' },
  ctaSub:   { fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: '0 0 24px' },
  ctaActions: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },
  btnPrimary:   { padding: '12px 28px', borderRadius: 10, background: '#C4A882', color: '#1C2B25', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-block' },
  btnSecondary: { padding: '12px 28px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', fontSize: 14, fontWeight: 500, textDecoration: 'none', display: 'inline-block' },
  footer:      { marginTop: 48, textAlign: 'center' },
  footerText:  { fontSize: 12, color: '#999', lineHeight: 1.6, margin: '0 0 12px' },
  footerLinks: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  footerLink:  { fontSize: 13, color: '#2D4A3E', textDecoration: 'none', fontWeight: 500 },
  link:        { color: '#2D4A3E', textDecoration: 'underline' },
  dot:         { color: '#CCC', fontSize: 13 },
}

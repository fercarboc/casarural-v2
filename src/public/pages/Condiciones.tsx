// src/public/pages/Condiciones.tsx
// Condiciones generales de reserva — resumen visual y accesible del Aviso Legal
import React, { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MetaTags } from '../components/MetaTags'
import { usePublicProperty } from '../../shared/hooks/usePublicProperty'
import {
  getMetaDescription,
  getSiteName,
  getSiteTagline,
} from '../../shared/utils/publicProperty.utils'

type CancellationRule = {
  from_days: number
  to_days: number
  refund_pct: number
}

const DEFAULT_CANCELLATION_RULES: CancellationRule[] = [
  { from_days: 60, to_days: 9999, refund_pct: 100 },
  { from_days: 45, to_days: 59, refund_pct: 50 },
  { from_days: 30, to_days: 44, refund_pct: 25 },
  { from_days: 0, to_days: 29, refund_pct: 0 },
]

export function Condiciones() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const { property } = usePublicProperty()

  const siteName = getSiteName(property)
  const siteTagline = getSiteTagline(property)

  const phone = property?.telefono?.trim() || ''
  const email = property?.email?.trim() || ''
  const website = property?.web?.trim() || ''

  const whatsappNumber = phone.replace(/[^\d+]/g, '').replace(/^\+/, '')
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : ''
  const mailHref = email ? `mailto:${email}` : ''

  const metaTitle = property?.meta_title?.trim()
    ? `Condiciones de Reserva | ${property.meta_title}`
    : `Condiciones de Reserva | ${siteName}`

  const metaDescription =
    property?.meta_description?.trim() ||
    getMetaDescription(property)

  const flexibleDepositPct =
    typeof property?.flexible_deposit_pct === 'number'
      ? property.flexible_deposit_pct
      : 30

  const nonRefundableDiscountPct =
    typeof property?.non_refundable_discount_pct === 'number'
      ? property.non_refundable_discount_pct
      : 10

  const checkinText = property?.checkin_time
    ? `A partir de las ${property.checkin_time} h`
    : 'Consulta horario de entrada'

  const checkoutText = property?.checkout_time
    ? `Antes de las ${property.checkout_time} h`
    : 'Consulta horario de salida'

  const mascotasTexto = useMemo(() => {
    if (property?.mascotas_permitidas === true) {
      if (
        typeof property?.suplemento_mascota === 'number' &&
        property.suplemento_mascota > 0
      ) {
        return `Permitidas con suplemento de ${property.suplemento_mascota.toFixed(2)} €`
      }
      return 'Permitidas'
    }

    if (property?.mascotas_permitidas === false) {
      return 'No permitidas'
    }

    return 'Consultar antes de reservar'
  }, [property?.mascotas_permitidas, property?.suplemento_mascota])

  const fumarTexto = useMemo(() => {
    if (property?.fumar_permitido === true) {
      return 'Permitido según normas del alojamiento'
    }

    if (property?.fumar_permitido === false) {
      return 'Prohibido fumar en el interior'
    }

    return 'Consultar antes de reservar'
  }, [property?.fumar_permitido])

  const cancellationRules = useMemo(() => {
    const raw = (property as any)?.cancellation_policy_json
    if (Array.isArray(raw) && raw.length > 0) {
      return [...raw].sort((a, b) => b.from_days - a.from_days)
    }
    return DEFAULT_CANCELLATION_RULES
  }, [property])

  const cancellationRows = useMemo(() => {
    return cancellationRules.map((rule) => {
      const diasLabel =
        rule.to_days >= 9999
          ? `${rule.from_days} días o más`
          : rule.from_days === 0
          ? `Menos de ${rule.to_days + 1} días`
          : `Entre ${rule.from_days} y ${rule.to_days} días`

      let retentionText = 'Nada'
      if (rule.refund_pct === 100) {
        retentionText = 'Nada'
      } else if (rule.refund_pct === 0) {
        retentionText = 'Importe íntegro pagado'
      } else {
        retentionText = `${100 - rule.refund_pct}% del alojamiento pagado`
      }

      return {
        dias: diasLabel,
        reembolso: `${rule.refund_pct}%`,
        retencion: retentionText,
        refundPct: rule.refund_pct,
      }
    })
  }, [cancellationRules])

  const heroLabel = [siteName, siteTagline].filter(Boolean).join(' · ')
  const contactRef = email || phone || 'nuestro equipo'
  const webRef = website || 'la web oficial'

  return (
    <>
      <GlobalStyles />

      <MetaTags
        title={metaTitle}
        description={metaDescription}
      />

      <div style={s.page}>
        <div style={s.hero}>
          <p style={s.heroLabel}>{heroLabel}</p>
          <h1 style={s.heroTitle}>Condiciones de Reserva</h1>
          <p style={s.heroSub}>Todo lo que necesitas saber antes de reservar</p>
        </div>

        <div style={s.container}>

          <Section title="Tarifas disponibles">
            <div style={s.tarifasGrid}>
              <TarifaCard
                nombre="Flexible"
                color="#1565C0"
                precio="Precio completo"
                pago={`Señal del ${flexibleDepositPct}% al reservar`}
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
                precio={`${nonRefundableDiscountPct}% de descuento sobre alojamiento`}
                pago="Pago total al reservar"
                destacado={true}
                items={[
                  'Sin reembolso bajo ninguna circunstancia',
                  'Pago único e irrevocable al confirmar',
                  'Ideal si tus fechas son definitivas',
                  'La limpieza y otros suplementos no suelen incluir descuento salvo indicación expresa',
                ]}
              />
            </div>

            <p style={s.nota}>
              El precio final de la reserva puede incluir alojamiento, limpieza y otros suplementos aplicables según la configuración del alojamiento. <strong>Revisa siempre el desglose final antes de pagar</strong>.
            </p>
          </Section>

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
                  {cancellationRows.map((row, i) => (
                    <tr key={`${row.dias}-${i}`} style={{ background: i % 2 === 0 ? '#F9F6F1' : '#fff' }}>
                      <td style={s.td}>{row.dias}</td>
                      <td
                        style={{
                          ...s.td,
                          fontWeight: 700,
                          color:
                            row.refundPct === 100
                              ? '#2D7D5A'
                              : row.refundPct === 0
                              ? '#C62828'
                              : '#1565C0',
                        }}
                      >
                        {row.reembolso}
                      </td>
                      <td style={s.td}>{row.retencion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <AlertBox>
              <strong>Tarifa No reembolsable:</strong> no aplica ningún reembolso independientemente de la antelación. Al elegir esta tarifa y confirmar el pago, aceptas expresamente la renuncia total a cualquier devolución.
            </AlertBox>
          </Section>

          <Section title="Horarios y normas del alojamiento">
            <div style={s.normasGrid}>
              <NormaItem icon="🕓" titulo="Check-in" texto={checkinText} />
              <NormaItem icon="🕛" titulo="Check-out" texto={checkoutText} />
              <NormaItem icon="👥" titulo="Capacidad" texto="La capacidad depende de la unidad o combinación de unidades seleccionada durante la reserva." />
              <NormaItem icon="🚭" titulo="Fumar" texto={fumarTexto} />
              <NormaItem icon="🐾" titulo="Mascotas" texto={mascotasTexto} />
              <NormaItem icon="🎉" titulo="Eventos" texto="No permitidos sin autorización previa" />
            </div>
          </Section>

          <Section title="Proceso de pago">
            <div style={s.pasosList}>
              {[
                {
                  n: '1',
                  t: 'Selección y cálculo',
                  d: 'Elige fechas, huéspedes y tarifa. El sistema calcula el precio en tiempo real según la configuración del alojamiento.',
                },
                {
                  n: '2',
                  t: 'Datos personales',
                  d: 'Introduce nombre, email y teléfono del titular de la reserva.',
                },
                {
                  n: '3',
                  t: 'Pago seguro',
                  d: `El pago se realiza a través de una pasarela segura. En tarifa Flexible se cobra la señal (${flexibleDepositPct}%) y en la No reembolsable se cobra el 100% al confirmar.`,
                },
                {
                  n: '4',
                  t: 'Confirmación inmediata',
                  d: `Recibirás un email con el código de reserva, el desglose y los enlaces de gestión. Si necesitas ayuda, puedes contactar con ${contactRef}.`,
                },
              ].map((paso) => (
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

          <Section title="Importante antes de confirmar">
            <div style={s.importanteGrid}>
              <ImportanteItem
                color="#C62828"
                icon="⚠️"
                titulo="Tarifa No reembolsable"
                texto="Si seleccionas esta tarifa y pagas, no recibirás ninguna devolución si cancelas, cambias de opinión o no puedes asistir por cualquier motivo. Solo elige esta tarifa si tus fechas son definitivas al 100%."
              />

              <ImportanteItem
                color="#1565C0"
                icon="ℹ️"
                titulo="Modificaciones"
                texto={`Las modificaciones de fechas o condiciones no están garantizadas y dependen de disponibilidad. Si necesitas cambios, contacta con nosotros a través de ${contactRef}.`}
              />

              <ImportanteItem
                color="#2D7D5A"
                icon="✓"
                titulo="Normas del alojamiento"
                texto={`Antes de pagar, revisa siempre las condiciones específicas del alojamiento en ${webRef}. Mascotas: ${mascotasTexto}. Fumar: ${fumarTexto}.`}
              />
            </div>
          </Section>

          <div style={s.ctaBox}>
            <h3 style={s.ctaTitle}>¿Tienes alguna duda antes de reservar?</h3>
            <p style={s.ctaSub}>Estamos disponibles para resolver cualquier consulta.</p>

            <div style={s.ctaActions}>
              <Link to="/ayuda" style={s.btnSecondary}>
                Ver ayuda completa
              </Link>

              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={s.btnPrimary}
                >
                  Contactar por WhatsApp
                </a>
              ) : mailHref ? (
                <a href={mailHref} style={s.btnPrimary}>
                  Contactar por email
                </a>
              ) : (
                <Link to="/contacto" style={s.btnPrimary}>
                  Ir a contacto
                </Link>
              )}
            </div>
          </div>

          <div style={s.footer}>
            <p style={s.footerText}>
              Estas condiciones son un resumen. El documento legal completo está disponible en el{' '}
              <Link to="/aviso-legal" style={s.link}>Aviso Legal</Link>.
              Última actualización: abril de 2026.
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

function TarifaCard({
  nombre,
  color,
  precio,
  pago,
  destacado,
  items,
}: {
  nombre: string
  color: string
  precio: string
  pago: string
  destacado: boolean
  items: string[]
}) {
  return (
    <div
      style={{
        ...s.tarifaCard,
        borderTop: `4px solid ${color}`,
        boxShadow: destacado ? `0 4px 24px ${color}20` : undefined,
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: '0 0 6px',
        }}
      >
        {nombre}
      </p>

      <p
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 20,
          fontWeight: 600,
          color: '#1C2B25',
          margin: '0 0 4px',
        }}
      >
        {precio}
      </p>

      <p style={{ fontSize: 12, color: '#888', margin: '0 0 16px' }}>
        {pago}
      </p>

      <ul
        style={{
          margin: 0,
          padding: '0 0 0 16px',
          fontSize: 13,
          color: '#444',
          lineHeight: 2,
        }}
      >
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function NormaItem({ icon, titulo, texto }: { icon: string; titulo: string; texto: string }) {
  return (
    <div style={s.normaItem}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div>
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#2D4A3E',
            margin: '0 0 2px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {titulo}
        </p>
        <p style={{ fontSize: 13, color: '#444', margin: 0 }}>{texto}</p>
      </div>
    </div>
  )
}

function ImportanteItem({
  color,
  icon,
  titulo,
  texto,
}: {
  color: string
  icon: string
  titulo: string
  texto: string
}) {
  return (
    <div
      style={{
        border: `1px solid ${color}25`,
        borderTop: `3px solid ${color}`,
        borderRadius: '0 0 8px 8px',
        padding: '16px 20px',
        background: color + '06',
      }}
    >
      <p style={{ fontSize: 13, fontWeight: 700, color, margin: '0 0 8px' }}>
        {icon} {titulo}
      </p>
      <p style={{ fontSize: 13, color: '#444', lineHeight: 1.7, margin: 0 }}>
        {texto}
      </p>
    </div>
  )
}

function AlertBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#FFF8EE',
        border: '1px solid #F5DFB0',
        borderLeft: '3px solid #D97706',
        borderRadius: '0 8px 8px 0',
        padding: '14px 18px',
        margin: '16px 0',
        fontSize: 14,
        color: '#7A5F2A',
        lineHeight: 1.7,
      }}
    >
      {children}
    </div>
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

const s: Record<string, React.CSSProperties> = {
  page: {
    background: '#F5F0E8',
    minHeight: '100vh',
    fontFamily: "'Jost', sans-serif",
  },
  hero: {
    background: '#2D4A3E',
    padding: '64px 24px 48px',
    textAlign: 'center',
  },
  heroLabel: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 13,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#C4A882',
    margin: '0 0 12px',
  },
  heroTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 42,
    fontWeight: 600,
    color: '#fff',
    margin: '0 0 12px',
  },
  heroSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    margin: 0,
  },
  container: {
    maxWidth: 820,
    margin: '0 auto',
    padding: '48px 24px 80px',
  },
  section: {
    marginBottom: 48,
    paddingBottom: 48,
    borderBottom: '1px solid rgba(45,74,62,0.1)',
  },
  sectionTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 26,
    fontWeight: 600,
    color: '#1C2B25',
    margin: '0 0 24px',
    paddingBottom: 12,
    borderBottom: '2px solid #C4A882',
    display: 'inline-block',
  },
  tarifasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 16,
    marginBottom: 16,
  },
  tarifaCard: {
    background: '#fff',
    borderRadius: 8,
    padding: '20px 24px',
    border: '1px solid rgba(45,74,62,0.1)',
  },
  nota: {
    fontSize: 13,
    color: '#777',
    background: '#F9F6F1',
    borderRadius: 8,
    padding: '12px 16px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  th: {
    padding: '11px 16px',
    color: '#fff',
    fontWeight: 600,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    textAlign: 'left',
  },
  td: {
    padding: '11px 16px',
    borderBottom: '1px solid #EEE',
    color: '#333',
  },
  normasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
  },
  normaItem: {
    background: '#fff',
    borderRadius: 10,
    padding: '14px 16px',
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    border: '1px solid rgba(45,74,62,0.08)',
  },
  pasosList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  paso: {
    display: 'flex',
    gap: 16,
    alignItems: 'flex-start',
  },
  pasoNum: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: '#2D4A3E',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
    flexShrink: 0,
  },
  pasoTitulo: {
    fontWeight: 600,
    color: '#1C2B25',
    fontSize: 14,
    margin: '0 0 4px',
  },
  pasoDesc: {
    fontSize: 13,
    color: '#555',
    lineHeight: 1.6,
    margin: 0,
  },
  importanteGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
  },
  ctaBox: {
    background: '#2D4A3E',
    borderRadius: 16,
    padding: '36px 40px',
    textAlign: 'center',
    marginBottom: 48,
  },
  ctaTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 26,
    fontWeight: 600,
    color: '#fff',
    margin: '0 0 8px',
  },
  ctaSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    margin: '0 0 24px',
  },
  ctaActions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    padding: '12px 28px',
    borderRadius: 10,
    background: '#C4A882',
    color: '#1C2B25',
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
    display: 'inline-block',
  },
  btnSecondary: {
    padding: '12px 28px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
    fontSize: 14,
    fontWeight: 500,
    textDecoration: 'none',
    display: 'inline-block',
  },
  footer: {
    marginTop: 48,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    lineHeight: 1.6,
    margin: '0 0 12px',
  },
  footerLinks: {
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  footerLink: {
    fontSize: 13,
    color: '#2D4A3E',
    textDecoration: 'none',
    fontWeight: 500,
  },
  link: {
    color: '#2D4A3E',
    textDecoration: 'underline',
  },
  dot: {
    color: '#CCC',
    fontSize: 13,
  },
}
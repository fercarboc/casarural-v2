// src/public/pages/Ayuda.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MetaTags } from '../components/MetaTags'
import { usePublicProperty } from '../../shared/hooks/usePublicProperty'
import {
  getMetaDescription,
  getSiteName,
  getSiteTagline,
} from '../../shared/utils/publicProperty.utils'

type FAQCategory = {
  categoria: string
  preguntas: Array<{
    q: string
    a: string
  }>
}

export function Ayuda() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const [open, setOpen] = useState<string | null>(null)
  const { property } = usePublicProperty()

  const siteName = getSiteName(property)
  const siteTagline = getSiteTagline(property)

  const phone = property?.telefono?.trim() || ''
  const email = property?.email?.trim() || ''
  const website = property?.web?.trim() || ''
  const localidad = property?.localidad?.trim() || ''
  const provincia = property?.provincia?.trim() || ''
  const ubicacion = [localidad, provincia].filter(Boolean).join(', ') || 'Cantabria'
  const mascotasPermitidas = property?.mascotas_permitidas
const suplementoMascota = property?.suplemento_mascota
const fumarPermitido = property?.fumar_permitido

// textos dinámicos claros (sin ambigüedad)
const mascotasTexto = mascotasPermitidas
  ? suplementoMascota
    ? `Se admiten mascotas con suplemento.`
    : `Se admiten mascotas sin coste adicional.`
  : `No se admiten mascotas.`

const fumarTexto = fumarPermitido
  ? `Se permite fumar en el alojamiento.`
  : `No se permite fumar en el interior del alojamiento.`



  const phoneHref = phone ? `tel:${phone.replace(/\s+/g, '')}` : ''
  const whatsappNumber = phone.replace(/[^\d+]/g, '').replace(/^\+/, '')
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : ''
  const mailHref = email ? `mailto:${email}` : ''

  const metaTitle = property?.meta_title?.trim()
    ? `Ayuda | ${property.meta_title}`
    : `Ayuda | ${siteName}`

  const metaDescription =
    property?.meta_description?.trim() ||
    getMetaDescription(property)

  const FAQS: FAQCategory[] = useMemo(() => {
    const siteRef = siteName || 'el alojamiento'
    const emailRef = email || 'nuestro email de contacto'
    const phoneRef = phone || 'nuestro teléfono de contacto'
    const websiteRef = website || 'la web oficial'
    const locationRef = ubicacion || 'Cantabria'

    return [
      {
        categoria: 'Reservas',
        preguntas: [
          {
            q: '¿Cómo realizo una reserva?',
            a: `Ve a la sección "Reservar" del menú, selecciona tus fechas de entrada y salida y el número de huéspedes. El sistema te mostrará la disponibilidad en tiempo real y el precio desglosado. A continuación, elige tu tarifa, completa tus datos y realiza el pago. Recibirás un email de confirmación en minutos.`,
          },
          {
            q: '¿Puedo reservar por teléfono o email?',
            a: `Sí. Puedes contactarnos por teléfono (${phoneRef}) o por email (${emailRef}) y estudiaremos la gestión de la reserva contigo.`,
          },
          {
            q: '¿La propiedad se alquila por habitaciones?',
            a: `Depende del tipo de alojamiento configurado y de cómo esté planteada la reserva en la web. Consulta siempre la información del alojamiento y el proceso de reserva, donde se indicará claramente si se reserva completo o por unidad independiente.`,
          },
          {
            q: '¿Cuántas personas pueden alojarse?',
            a: `La capacidad máxima depende de cada alojamiento. En la ficha de cada alojamiento y durante el proceso de reserva verás la ocupación permitida y las condiciones aplicables.`,
          },
          {
            q: '¿Cuántas noches es la estancia mínima?',
            a: `La estancia mínima puede variar según temporada, fechas especiales o configuración del alojamiento. Se muestra siempre durante el proceso de reserva antes de confirmar.`,
          },
        ],
      },
      {
        categoria: 'Tarifas y precios',
        preguntas: [
          {
            q: '¿Qué diferencia hay entre las tarifas disponibles?',
            a: `Las tarifas disponibles, sus condiciones y posibles restricciones se muestran durante el proceso de reserva. Revisa siempre la política concreta de cada tarifa antes de pagar.`,
          },
          {
            q: '¿El precio incluye la limpieza?',
            a: `Depende de la configuración del alojamiento. Si existe suplemento de limpieza o cualquier otro cargo adicional, se mostrará desglosado en la reserva antes del pago.`,
          },
          {
            q: '¿Hay suplemento por huéspedes adicionales?',
            a: `Si el alojamiento tiene suplementos por ocupación extra, aparecerán reflejados automáticamente en el cálculo del precio durante la reserva.`,
          },
          {
            q: '¿El precio lleva IVA?',
            a: `Los importes mostrados en la web corresponden al precio final aplicable según la configuración fiscal del alojamiento.`,
          },
        ],
      },
      {
        categoria: 'Cancelaciones y cambios',
        preguntas: [
          {
            q: '¿Cómo cancelo mi reserva?',
            a: `En el email de confirmación de tu reserva encontrarás un enlace para gestionar la reserva o podrás contactarnos directamente en ${emailRef}.`,
          },
          {
            q: '¿Cuánto me devuelven si cancelo?',
            a: `El reembolso depende de la tarifa contratada y de la antelación con la que canceles. La política aplicable se muestra durante la reserva y en la confirmación recibida por email.`,
          },
          {
            q: '¿Puedo cambiar las fechas de mi reserva?',
            a: `Las modificaciones dependen de disponibilidad y de la tarifa contratada. Puedes solicitarlo por email a ${emailRef} y revisaremos tu caso.`,
          },
          {
            q: '¿En cuánto tiempo recibo el reembolso?',
            a: `Si procede reembolso, el plazo final depende del método de pago y de la entidad bancaria. Habitualmente tarda varios días hábiles.`,
          },
        ],
      },
      {
        categoria: 'Llegada y estancia',
        preguntas: [
          {
            q: '¿Cuál es el horario de entrada y salida?',
            a: 'La entrada y salida pueden variar según la reserva y la disponibilidad operativa. Si necesitas un horario especial, consúltalo con antelación.',
          },
          {
            q: '¿Dónde está el alojamiento?',
            a: `${siteRef} se encuentra en ${locationRef}. En la sección "Dónde estamos" de ${websiteRef} encontrarás el mapa y la referencia de acceso.`,
          },
         {
            q: '¿Se admiten mascotas?',
            a: `IMPORTANTE: ${mascotasTexto} Te recomendamos confirmar siempre esta información antes de reservar para evitar incidencias.`,
          },
          {
            q: '¿Se puede fumar en el alojamiento?',
            a: `${fumarTexto} Consulta siempre las normas específicas antes de tu estancia.`,
          },
        ],
      },
      {
        categoria: 'Pagos y seguridad',
        preguntas: [
          {
            q: '¿Es seguro pagar en vuestra web?',
            a: `Sí. El pago se realiza mediante una pasarela segura. Nunca almacenamos los datos completos de tu tarjeta en la web del alojamiento.`,
          },
          {
            q: '¿Qué métodos de pago aceptáis?',
            a: `Los métodos de pago disponibles se muestran durante el proceso de reserva. Si necesitas una alternativa, consulta con nosotros en ${emailRef}.`,
          },
          {
            q: '¿Recibiré justificante o factura de mi reserva?',
            a: `Sí. Tras la reserva recibirás un email de confirmación. Si necesitas documentación adicional, escríbenos a ${emailRef}.`,
          },
        ],
      },
    ]
  }, [siteName, email, phone, website, ubicacion])

  const toggle = (key: string) => setOpen((prev) => (prev === key ? null : key))

  return (
    <>
      <GlobalStyles />

      <MetaTags
        title={metaTitle}
        description={metaDescription}
      />

      <div style={s.page}>
        <div style={s.hero}>
          <p style={s.heroLabel}>
            {siteName}
            {siteTagline ? ` · ${siteTagline}` : ''}
          </p>
          <h1 style={s.heroTitle}>Centro de Ayuda</h1>
          <p style={s.heroSub}>Respuestas a las preguntas más frecuentes</p>
        </div>

        <div style={s.container}>
          {FAQS.map((cat) => (
            <section key={cat.categoria} style={s.catSection}>
              <h2 style={s.catTitle}>{cat.categoria}</h2>

              <div style={s.faqList}>
                {cat.preguntas.map((faq, i) => {
                  const key = `${cat.categoria}-${i}`
                  const isOpen = open === key

                  return (
                    <div
                      key={key}
                      style={{
                        ...s.faqItem,
                        borderBottom:
                          i < cat.preguntas.length - 1 ? '1px solid #EEE7DC' : 'none',
                      }}
                    >
                      <button
                        onClick={() => toggle(key)}
                        style={s.faqQ}
                        aria-expanded={isOpen}
                      >
                        <span>{faq.q}</span>
                        <span
                          style={{
                            ...s.faqIcon,
                            transform: isOpen ? 'rotate(45deg)' : 'none',
                          }}
                        >
                          +
                        </span>
                      </button>

                      {isOpen && (
                        <div style={s.faqA}>
                        <p
                          style={{ margin: 0 }}
                          dangerouslySetInnerHTML={{
                            __html: faq.a.replace(
                              'IMPORTANTE:',
                              '<strong>IMPORTANTE:</strong>'
                            ),
                          }}
                        />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}

          <section style={{ ...s.catSection, border: 'none' }}>
            <div style={s.contactBox}>
              <h3 style={s.contactTitle}>¿No encuentras lo que buscas?</h3>
              <p style={s.contactSub}>Estamos disponibles para ayudarte directamente.</p>

              <div style={s.contactActions}>
                {phoneHref ? (
                  <a href={phoneHref} style={s.btnPhone}>
                    📞 Llamar ahora
                  </a>
                ) : null}

                {whatsappHref ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={s.btnWa}
                  >
                    WhatsApp
                  </a>
                ) : null}

                {mailHref ? (
                  <a href={mailHref} style={s.btnEmail}>
                    Enviar email
                  </a>
                ) : null}

                {!phoneHref && !whatsappHref && !mailHref ? (
                  <Link to="/contacto" style={s.btnEmail}>
                    Ir a contacto
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          <div style={s.footer}>
            <p style={s.footerText}>Última actualización: abril de 2026</p>
            <div style={s.footerLinks}>
              <Link to="/aviso-legal" style={s.footerLink}>
                Aviso Legal
              </Link>
              <span style={s.dot}>·</span>
              <Link to="/privacidad" style={s.footerLink}>
                Privacidad
              </Link>
              <span style={s.dot}>·</span>
              <Link to="/cookies" style={s.footerLink}>
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Jost:wght@300;400;500&display=swap');
      body { margin: 0; }
      * { box-sizing: border-box; }
      button { cursor: pointer; }
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
  catSection: {
    marginBottom: 40,
    paddingBottom: 40,
    borderBottom: '1px solid rgba(45,74,62,0.1)',
  },
  catTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 26,
    fontWeight: 600,
    color: '#1C2B25',
    margin: '0 0 20px',
    paddingBottom: 12,
    borderBottom: '2px solid #C4A882',
    display: 'inline-block',
  },
  faqList: {
    background: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    border: '1px solid rgba(45,74,62,0.08)',
  },
  faqItem: {
    padding: 0,
  },
  faqQ: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    padding: '18px 24px',
    background: 'none',
    border: 'none',
    textAlign: 'left',
    fontFamily: "'Jost', sans-serif",
    fontSize: 14,
    fontWeight: 500,
    color: '#1C2B25',
    lineHeight: 1.5,
  },
  faqIcon: {
    fontSize: 22,
    color: '#2D4A3E',
    flexShrink: 0,
    fontWeight: 300,
    transition: 'transform 0.2s ease',
    lineHeight: 1,
  },
  faqA: {
    padding: '0 24px 18px',
    fontSize: 14,
    color: '#555',
    lineHeight: 1.8,
  },
  contactBox: {
    background: '#2D4A3E',
    borderRadius: 16,
    padding: '36px 40px',
    textAlign: 'center',
  },
  contactTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 26,
    fontWeight: 600,
    color: '#fff',
    margin: '0 0 8px',
  },
  contactSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    margin: '0 0 24px',
  },
  contactActions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  btnPhone: {
    padding: '12px 24px',
    borderRadius: 10,
    background: '#fff',
    color: '#2D4A3E',
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
    display: 'inline-block',
  },
  btnWa: {
    padding: '12px 24px',
    borderRadius: 10,
    background: '#25D366',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
    display: 'inline-block',
  },
  btnEmail: {
    padding: '12px 24px',
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
    color: '#AAA',
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
  dot: {
    color: '#CCC',
    fontSize: 13,
  },
}
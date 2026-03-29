// src/public/pages/Ayuda.tsx
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const FAQS = [
  {
    categoria: 'Reservas',
    preguntas: [
      {
        q: '¿Cómo realizo una reserva?',
        a: 'Ve a la sección "Reservar" del menú, selecciona tus fechas de entrada y salida y el número de huéspedes. El sistema te mostrará la disponibilidad en tiempo real y el precio desglosado. A continuación, elige tu tarifa (Flexible o No reembolsable), completa tus datos y realiza el pago mediante tarjeta a través de Stripe. Recibirás un email de confirmación en minutos.',
      },
      {
        q: '¿Puedo reservar por teléfono o email?',
        a: 'Sí. Puedes contactarnos por teléfono (+34 690 288 707) o por email (contacto@casarurallarasilla.com) y gestionamos la reserva manualmente. En ese caso, te enviaremos un enlace de pago seguro o acordaremos la forma de pago.',
      },
      {
        q: '¿La casa se alquila por habitaciones?',
        a: 'No. La Rasilla se alquila siempre en su totalidad. No hay reservas por habitaciones individuales. Al reservar, dispones de toda la casa: 5 habitaciones dobles, cocina completa, salón, baños y zonas comunes.',
      },
      {
        q: '¿Cuántas personas pueden alojarse?',
        a: 'La capacidad estándar es de 10 huéspedes, incluidos en el precio base. Se admite un máximo de 11 huéspedes, con suplemento por el huésped extra (entre 30 € y 33 € por noche, según temporada). Superar los 11 huéspedes está expresamente prohibido.',
      },
      {
        q: '¿Cuántas noches es la estancia mínima?',
        a: 'La estancia mínima varía según la temporada: en temporada base suelen ser 2 noches, en puentes y festivos 3 noches, y en temporada alta (verano) 4 noches. La estancia mínima se indica siempre durante el proceso de reserva antes de confirmar.',
      },
    ],
  },
  {
    categoria: 'Tarifas y precios',
    preguntas: [
      {
        q: '¿Qué diferencia hay entre la tarifa Flexible y la No reembolsable?',
        a: 'La tarifa Flexible tiene el precio completo y permite cancelar con reembolso parcial o total según la antelación. La tarifa No reembolsable incluye un descuento del 10% sobre el alojamiento pero no permite ningún reembolso en caso de cancelación, independientemente del motivo o la antelación. El suplemento de limpieza (60 €) nunca es reembolsable en ninguna de las dos tarifas.',
      },
      {
        q: '¿El precio incluye la limpieza?',
        a: 'El precio por noche no incluye la limpieza. El suplemento de limpieza es de 60 € por estancia (pago único, independientemente del número de noches). Se añade automáticamente al total en el proceso de reserva.',
      },
      {
        q: '¿Hay suplemento por huéspedes adicionales?',
        a: 'Sí. El precio base incluye hasta 10 huéspedes. Si se hospeda un 11.º huésped (el máximo permitido), se aplica un suplemento por cada noche de estancia: 30 €/noche en temporada base y 33 €/noche en temporada alta.',
      },
      {
        q: '¿El precio lleva IVA?',
        a: 'El arrendamiento rural para uso residencial está exento de IVA según la legislación española (art. 20.1.23 de la Ley del IVA). Por tanto, los precios mostrados son precios finales sin IVA adicional que repercutir.',
      },
    ],
  },
  {
    categoria: 'Cancelaciones y cambios',
    preguntas: [
      {
        q: '¿Cómo cancelo mi reserva?',
        a: 'En el email de confirmación de tu reserva encontrarás un enlace directo para gestionar la cancelación. Al hacer clic, accederás a una página donde podrás ver el reembolso estimado según tu tarifa y la antelación, e iniciar la cancelación de forma inmediata. También puedes contactarnos por email o teléfono.',
      },
      {
        q: '¿Cuánto me devuelven si cancelo con tarifa Flexible?',
        a: 'El reembolso depende de los días que falten para tu entrada en el momento de cancelar: más de 60 días → 100% de reembolso; entre 45 y 59 días → 50%; entre 30 y 44 días → 25%; menos de 30 días → sin reembolso. El suplemento de limpieza (60 €) no se reembolsa en ningún caso.',
      },
      {
        q: '¿Puedo cancelar una tarifa No reembolsable?',
        a: 'Sí puedes cancelar, pero no recibirás ningún reembolso. Al contratar la tarifa No reembolsable aceptas expresamente la ausencia total de devolución a cambio del descuento del 10% obtenido. Te recomendamos contratar un seguro de viaje si deseas cobertura ante imprevistos.',
      },
      {
        q: '¿Puedo cambiar las fechas de mi reserva?',
        a: 'Las modificaciones de fechas no están disponibles de forma automática. Puedes solicitarlo por email a contacto@casarurallarasilla.com y lo estudiaremos según disponibilidad. No existe obligación por nuestra parte de aceptar cambios de fecha.',
      },
      {
        q: '¿En cuánto tiempo recibo el reembolso?',
        a: 'Los reembolsos se procesan automáticamente a través de Stripe en el momento de la cancelación. El plazo para que aparezca en tu cuenta depende de tu banco, pero habitualmente es de 5 a 10 días hábiles. El reembolso se realiza siempre sobre el mismo método de pago utilizado en la reserva.',
      },
    ],
  },
  {
    categoria: 'Llegada y estancia',
    preguntas: [
      {
        q: '¿Cuál es el horario de entrada y salida?',
        a: 'La entrada (check-in) es a partir de las 16:00 h. La salida (check-out) debe realizarse antes de las 12:00 h. Si necesitas un horario diferente, consúltalo con antelación por teléfono o email y lo valoraremos según disponibilidad.',
      },
      {
        q: '¿Dónde está la casa?',
        a: 'La Rasilla está en Castillo Pedroso, en el Valle de Toranzo, Cantabria. Se encuentra en el corazón de los Valles Pasiegos, a unos 35 km de Santander. En la sección "La Casa" del sitio web encontrarás el mapa y las indicaciones de acceso.',
      },
      {
        q: '¿Se admiten mascotas?',
        a: 'Las mascotas NO están permitidas.',
      },
      {
        q: '¿Se puede fumar en la casa?',
        a: 'Está prohibido fumar en el interior del alojamiento. Existe espacio exterior habilitado para ello.',
      },
    ],
  },
  {
    categoria: 'Pagos y seguridad',
    preguntas: [
      {
        q: '¿Es seguro pagar en vuestra web?',
        a: 'Sí. El pago se realiza a través de Stripe, uno de los procesadores de pago más seguros del mundo, con certificación PCI DSS nivel 1. Nunca almacenamos los datos de tu tarjeta. La conexión está cifrada con TLS/HTTPS. Aceptamos las principales tarjetas de crédito y débito.',
      },
      {
        q: '¿Qué métodos de pago aceptáis?',
        a: 'A través del sitio web aceptamos tarjetas de crédito y débito Visa, Mastercard y American Express, así como otros métodos habilitados por Stripe según tu país. Para reservas directas por teléfono o email, también podemos gestionar transferencia bancaria.',
      },
      {
        q: '¿Recibiré factura por mi reserva?',
        a: 'Sí. Generamos automáticamente un documento de confirmación de reserva con el desglose del importe. Si necesitas una factura con datos fiscales para empresa o deducción, facilítanos el CIF/NIF y la razón social antes de la reserva o en el momento del check-in.',
      },
    ],
  },
]

export function Ayuda() {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const [open, setOpen] = useState<string | null>(null)

  const toggle = (key: string) => setOpen(prev => prev === key ? null : key)

  return (
    <>
      <GlobalStyles />
      <div style={s.page}>
        <div style={s.hero}>
          <p style={s.heroLabel}>La Rasilla · Casa Rural</p>
          <h1 style={s.heroTitle}>Centro de Ayuda</h1>
          <p style={s.heroSub}>Respuestas a las preguntas más frecuentes</p>
        </div>

        <div style={s.container}>

          {FAQS.map(cat => (
            <section key={cat.categoria} style={s.catSection}>
              <h2 style={s.catTitle}>{cat.categoria}</h2>
              <div style={s.faqList}>
                {cat.preguntas.map((faq, i) => {
                  const key = `${cat.categoria}-${i}`
                  const isOpen = open === key
                  return (
                    <div key={key} style={{ ...s.faqItem, borderBottom: i < cat.preguntas.length - 1 ? '1px solid #EEE7DC' : 'none' }}>
                      <button
                        onClick={() => toggle(key)}
                        style={s.faqQ}
                        aria-expanded={isOpen}
                      >
                        <span>{faq.q}</span>
                        <span style={{ ...s.faqIcon, transform: isOpen ? 'rotate(45deg)' : 'none' }}>+</span>
                      </button>
                      {isOpen && (
                        <div style={s.faqA}>
                          <p style={{ margin: 0 }}>{faq.a}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}

          {/* Contacto directo */}
          <section style={{ ...s.catSection, border: 'none' }}>
            <div style={s.contactBox}>
              <h3 style={s.contactTitle}>¿No encuentras lo que buscas?</h3>
              <p style={s.contactSub}>Estamos disponibles para ayudarte directamente.</p>
              <div style={s.contactActions}>
                <a href="tel:+34690288707" style={s.btnPhone}>
                  📞 Llamar ahora
                </a>
                <a href="https://wa.me/34690288707" target="_blank" rel="noopener noreferrer" style={s.btnWa}>
                  WhatsApp
                </a>
                <a href="mailto:contacto@casarurallarasilla.com" style={s.btnEmail}>
                  Enviar email
                </a>
              </div>
            </div>
          </section>

          <div style={s.footer}>
            <p style={s.footerText}>Última actualización: marzo de 2026</p>
            <div style={s.footerLinks}>
              <Link to="/aviso-legal" style={s.footerLink}>Aviso Legal</Link>
              <span style={s.dot}>·</span>
              <Link to="/privacidad" style={s.footerLink}>Privacidad</Link>
              <span style={s.dot}>·</span>
              <Link to="/cookies" style={s.footerLink}>Cookies</Link>
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
      body { margin: 0; } * { box-sizing: border-box; }
      button { cursor: pointer; }
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
  catSection: { marginBottom: 40, paddingBottom: 40, borderBottom: '1px solid rgba(45,74,62,0.1)' },
  catTitle:  { fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: '#1C2B25', margin: '0 0 20px', paddingBottom: 12, borderBottom: '2px solid #C4A882', display: 'inline-block' },
  faqList:   { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid rgba(45,74,62,0.08)' },
  faqItem:   { padding: 0 },
  faqQ: {
    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 16, padding: '18px 24px', background: 'none', border: 'none',
    textAlign: 'left', fontFamily: "'Jost', sans-serif", fontSize: 14, fontWeight: 500,
    color: '#1C2B25', lineHeight: 1.5,
  },
  faqIcon: {
    fontSize: 22, color: '#2D4A3E', flexShrink: 0, fontWeight: 300,
    transition: 'transform 0.2s ease', lineHeight: 1,
  },
  faqA: { padding: '0 24px 18px', fontSize: 14, color: '#555', lineHeight: 1.8 },
  contactBox: {
    background: '#2D4A3E', borderRadius: 16,
    padding: '36px 40px', textAlign: 'center',
  },
  contactTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: '#fff', margin: '0 0 8px' },
  contactSub:   { fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: '0 0 24px' },
  contactActions: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },
  btnPhone: { padding: '12px 24px', borderRadius: 10, background: '#fff', color: '#2D4A3E', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-block' },
  btnWa:    { padding: '12px 24px', borderRadius: 10, background: '#25D366', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-block' },
  btnEmail: { padding: '12px 24px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', fontSize: 14, fontWeight: 500, textDecoration: 'none', display: 'inline-block' },
  footer:      { marginTop: 48, textAlign: 'center' },
  footerText:  { fontSize: 12, color: '#AAA', margin: '0 0 12px' },
  footerLinks: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  footerLink:  { fontSize: 13, color: '#2D4A3E', textDecoration: 'none', fontWeight: 500 },
  dot:         { color: '#CCC', fontSize: 13 },
}

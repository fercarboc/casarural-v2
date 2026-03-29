// src/public/pages/AvisoLegal.tsx
import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'

export function AvisoLegal() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <>
      <GlobalStyles />
      <div style={s.page}>
        <div style={s.hero}>
          <p style={s.heroLabel}>La Rasilla · Casa Rural</p>
          <h1 style={s.heroTitle}>Aviso Legal</h1>
          <p style={s.heroSub}>Condiciones de uso, reservas y política de cancelación</p>
        </div>

        <div style={s.container}>

          <Section id="titular" title="1. Titular del sitio web">
            <p>En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa de los siguientes datos identificativos:</p>
            <InfoTable rows={[
              ['Titular', 'Fernando Carbonell de la Rasilla'],
              ['NIF', 'Disponible bajo solicitud justificada'],
              ['Domicilio', 'Castillo Pedroso, Cantabria, España'],
              ['Email de contacto', 'contacto@casarurallarasilla.com'],
              ['Teléfono', '+34 690 288 707'],
              ['Actividad', 'Alojamiento rural — alquiler íntegro de casa rural'],
            ]} />
          </Section>

          <Section id="objeto" title="2. Objeto y ámbito de aplicación">
            <p>El presente Aviso Legal regula el acceso y uso del sitio web <strong>casarurallarasilla.com</strong> (en adelante, «el Sitio»), así como la contratación del servicio de alojamiento rural ofertado en él.</p>
            <p>El acceso al Sitio implica la aceptación plena y sin reservas de todas las condiciones incluidas en este Aviso Legal, la Política de Privacidad y la Política de Cookies. Si no está conforme con alguna de estas condiciones, deberá abstenerse de utilizar el Sitio.</p>
          </Section>

          <Section id="alojamiento" title="3. Descripción del alojamiento y condiciones de uso">
            <p><strong>La Rasilla</strong> es una casa rural de alquiler íntegro situada en Castillo Pedroso, en el Valle de Toranzo (Valles Pasiegos), Cantabria. El alojamiento se arrienda en su totalidad —no por habitaciones individuales— y dispone de las siguientes características:</p>
            <ul>
              <li>5 habitaciones dobles (una de ellas con posibilidad de tercera cama)</li>
              <li>Capacidad estándar: <strong>10 huéspedes incluidos en el precio</strong></li>
              <li>Capacidad máxima absoluta: <strong>11 huéspedes</strong></li>
            </ul>
            <p>Superar la capacidad máxima de 11 huéspedes está expresamente prohibido y podrá ser causa de resolución inmediata del contrato de arrendamiento sin derecho a reembolso.</p>
          </Section>

          <Section id="reservas" title="4. Proceso de reserva y contratación">
            <p>La reserva del alojamiento se realiza a través del motor de reservas integrado en el Sitio, siguiendo estos pasos:</p>
            <ol>
              <li>Selección de fechas de entrada y salida, y número de huéspedes.</li>
              <li>Verificación automática de disponibilidad.</li>
              <li>Visualización del precio desglosado y selección de tarifa (Flexible o No reembolsable).</li>
              <li>Introducción de datos personales del titular de la reserva.</li>
              <li>Pago a través de la pasarela segura Stripe.</li>
              <li>Confirmación automática por email con el código de reserva.</li>
            </ol>
            <p>La reserva quedará confirmada únicamente cuando el pago sea procesado correctamente por Stripe y el sistema emita el email de confirmación. Hasta ese momento, las fechas no quedan bloqueadas.</p>
            <p>El titular de la reserva debe ser mayor de edad (18 años o más) y se hace responsable del cumplimiento de las normas del alojamiento por parte de todos los huéspedes.</p>
          </Section>

          <Section id="tarifas" title="5. Tarifas, precios y desglose">
            <p>Los precios vigentes en el momento de la reserva son los que se muestran en el proceso de contratación. Se ofrecen dos modalidades tarifarias:</p>

            <Highlight color="blue" title="Tarifa Flexible">
              <ul>
                <li>Precio completo sin descuento.</li>
                <li>Temporada base: desde <strong>300 €/noche</strong>. Temporada alta: desde <strong>330 €/noche</strong>.</li>
                <li>Suplemento por huésped extra (a partir del 11.º): <strong>30 € – 33 €/noche</strong>.</li>
                <li>Suplemento de limpieza: <strong>60 € (pago único por estancia)</strong>.</li>
                <li>Pago de señal del <strong>50% del total</strong> en el momento de la reserva.</li>
                <li>Resto del importe a abonar antes de la fecha de entrada, según se indique.</li>
                <li>Sujeta a política de cancelación con reembolso parcial o total según antelación.</li>
                 
                <li>Más abajo dispone de cuadro detallando la política de reembolso de la Tarifa Fles¡xible</li>
              </ul>
            </Highlight>

            <Highlight color="amber" title="Tarifa No reembolsable">
              <ul>
                <li><strong>Descuento del 10% sobre el importe de alojamiento</strong> (noches). El suplemento de limpieza (50 €) no está sujeto a descuento.</li>
                <li>El precio de la tarifa No reembolsable incluye ya aplicado dicho descuento.</li>
                <li><strong>Pago total del importe en el momento de la reserva.</strong></li>
                <li><strong>Sin posibilidad de reembolso bajo ninguna circunstancia</strong>, independientemente de la antelación con que se cancele.</li>
                <li>Al contratar esta tarifa, el cliente reconoce y acepta expresamente la ausencia total de reembolso en caso de cancelación.</li>
              </ul>
            </Highlight>

            <p>Los precios incluyen el Impuesto sobre el Valor Añadido (IVA) en los casos en que resulte de aplicación. El arrendamiento de inmuebles para uso residencial temporal está, con carácter general, exento de IVA conforme al artículo 20.1.23.º de la Ley 37/1992 del IVA. En ningún caso se repercute IVA adicional sobre los precios mostrados.</p>
          </Section>

          <Section id="cancelacion" title="6. Política de cancelación — condiciones específicas">
            <AlertBox>
              <strong>Lea atentamente este apartado antes de realizar su reserva.</strong> Las condiciones de cancelación varían significativamente según la tarifa contratada. La elección de tarifa es una decisión contractual vinculante desde el momento del pago.
            </AlertBox>

            <h3 style={s.subTitle}>6.1 Tarifa No reembolsable — sin reembolso en ningún caso</h3>
            <p>Al seleccionar la tarifa <strong>No reembolsable</strong>, el cliente acepta de forma expresa e inequívoca que:</p>
            <ul>
              <li>El importe abonado <strong>no será reembolsado bajo ninguna circunstancia</strong>, incluyendo cancelaciones voluntarias, casos de fuerza mayor, enfermedad, accidente, fallecimiento de familiar, o cualquier otra causa ajena al titular.</li>
              <li>La cancelación no genera derecho a cambio de fechas, crédito o compensación alternativa de ningún tipo.</li>
              <li>El descuento del 10% obtenido al contratar esta tarifa es la contraprestación directa por asumir el riesgo total de pérdida del importe.</li>
              <li>Este es el modelo habitual en el sector del alojamiento turístico para tarifas con descuento por pago anticipado irrevocable.</li>
            </ul>
            <p>Se recomienda la contratación de un seguro de viaje o cancelación por parte del cliente si desea cobertura ante imprevistos.</p>

            <h3 style={s.subTitle}>6.2 Tarifa Flexible — reembolso según antelación</h3>
            <p>La tarifa Flexible permite cancelar con derecho a reembolso parcial o total según la antelación con que se comunique la cancelación, contando desde la fecha de entrada:</p>

            <CancelTable rows={[
              ['60 días o más', '100% del importe pagado', 'Reembolso total'],
              ['Entre 45 y 59 días', '50% del importe pagado', 'Retención del 50%'],
              ['Entre 30 y 44 días', '25% del importe pagado', 'Retención del 75%'],
              ['Menos de 30 días', '0% — sin reembolso', 'Retención total'],
            ]} />

            <p>Condiciones adicionales de la tarifa Flexible:</p>
            <ul>
              <li>El suplemento de limpieza (60 €) <strong>no es reembolsable en ningún caso</strong>, independientemente de la antelación.</li>
              <li>Los plazos se calculan en días naturales desde la fecha de cancelación hasta la fecha de entrada, a las 00:00 h (hora peninsular española).</li>
              <li>El reembolso se procesa automáticamente sobre el método de pago original en un plazo de <strong>5 a 10 días hábiles</strong>.</li>
              <li>En caso de haber abonado únicamente la señal (50%), el reembolso se aplicará sobre dicha señal. El importe restante no llegado a cobrar no genera derecho a compensación adicional.</li>
            </ul>

            <h3 style={s.subTitle}>6.3 Modificaciones de reserva</h3>
            <p>El cliente <strong>no puede modificar las fechas de su reserva</strong> a través del sistema online. Cualquier solicitud de modificación debe dirigirse por escrito a <a href="mailto:contacto@casarurallarasilla.com" style={s.link}>contacto@casarurallarasilla.com</a> y quedará sujeta a disponibilidad y a criterio del titular del alojamiento. La aceptación de una modificación no implica obligación de aceptar futuras solicitudes.</p>

            <h3 style={s.subTitle}>6.4 Cancelación por parte del alojamiento</h3>
            <p>En el supuesto excepcional de que el alojamiento deba cancelar una reserva confirmada por causas imputables al mismo (incendio, inundación, causas estructurales graves u otras circunstancias de fuerza mayor debidamente acreditadas), el cliente recibirá el <strong>reembolso íntegro del importe abonado</strong>, sin derecho a reclamación adicional por daños, lucro cesante u otros conceptos.</p>
          </Section>

          <Section id="horarios" title="7. Horarios y normas de uso">
            <InfoTable rows={[
              ['Check-in (entrada)', 'A partir de las 16:00 h'],
              ['Check-out (salida)', 'Antes de las 12:00 h'],
              ['Estancia mínima', 'Variable según temporada (se indica en el proceso de reserva)'],
              ['Mascotas', 'NO SE ADMITEN en el alojamiento'],
              ['Fumadores', 'Prohibido fumar en el interior del alojamiento'],
              ['Eventos', 'No se permiten celebraciones, fiestas o eventos sin autorización previa'],
            ]} />
            <p>El incumplimiento de las normas del alojamiento podrá dar lugar a la rescisión inmediata del contrato de arrendamiento sin derecho a reembolso.</p>
          </Section>

          <Section id="propiedad" title="8. Propiedad intelectual e industrial">
            <p>Todos los contenidos del Sitio —incluyendo, sin limitación, textos, fotografías, imágenes, logotipos, diseños, código fuente y estructura— son propiedad del titular o de terceros que han autorizado su uso, y están protegidos por las leyes españolas e internacionales de propiedad intelectual e industrial.</p>
            <p>Queda expresamente prohibida la reproducción, distribución, comunicación pública o transformación de cualquier contenido del Sitio sin autorización previa y por escrito del titular.</p>
          </Section>

          <Section id="responsabilidad" title="9. Limitación de responsabilidad">
            <p>El titular del alojamiento no se hace responsable de:</p>
            <ul>
              <li>Interrupciones o fallos técnicos del Sitio debidos a causas ajenas a su control.</li>
              <li>Daños o perjuicios derivados del uso indebido del alojamiento o incumplimiento de las normas por parte de los huéspedes.</li>
              <li>Objetos olvidados en el alojamiento tras la salida.</li>
              <li>Circunstancias meteorológicas o eventos de fuerza mayor que afecten al disfrute de la estancia.</li>
            </ul>
          </Section>

          <Section id="jurisdiccion" title="10. Legislación aplicable y jurisdicción">
            <p>El presente Aviso Legal se rige por la legislación española vigente. Para la resolución de cualquier conflicto derivado del uso del Sitio o de la prestación del servicio de alojamiento, las partes se someten, con renuncia expresa a cualquier otro fuero que pudiera corresponderles, a los Juzgados y Tribunales de Santander (Cantabria), salvo que la normativa vigente de protección de consumidores establezca un fuero imperativo diferente.</p>
            <p>Para reclamaciones sobre contratos de consumo celebrados online, puede acceder a la plataforma europea de resolución de litigios en línea en: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" style={s.link}>ec.europa.eu/consumers/odr</a></p>
          </Section>

          <div style={s.footer}>
            <p style={s.footerText}>Última actualización: marzo de 2026</p>
            <div style={s.footerLinks}>
              <Link to="/privacidad" style={s.footerLink}>Política de Privacidad</Link>
              <span style={s.dot}>·</span>
              <Link to="/cookies" style={s.footerLink}>Política de Cookies</Link>
              <span style={s.dot}>·</span>
              <Link to="/condiciones" style={s.footerLink}>Condiciones de Reserva</Link>
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

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={s.section}>
      <h2 style={s.sectionTitle}>{title}</h2>
      <div style={s.sectionBody}>{children}</div>
    </section>
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

function CancelTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div style={{ overflowX: 'auto', margin: '16px 0' }}>
      <table style={{ ...s.infoTable, width: '100%' }}>
        <thead>
          <tr style={{ background: '#2D4A3E' }}>
            <th style={s.th}>Antelación a la entrada</th>
            <th style={s.th}>Reembolso</th>
            <th style={s.th}>Observación</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([ant, rem, obs], i) => (
            <tr key={i} style={i % 2 === 0 ? s.trEven : s.trOdd}>
              <td style={s.tdLabel}>{ant}</td>
              <td style={{ ...s.tdValue, fontWeight: 600, color: i === 0 ? '#2D7D5A' : i === 3 ? '#C62828' : '#1565C0' }}>{rem}</td>
              <td style={s.tdValue}>{obs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Highlight({ color, title, children }: { color: 'blue' | 'amber'; title: string; children: React.ReactNode }) {
  const colors = {
    blue:  { border: '#1565C0', bg: '#EEF4FF', badge: '#1565C0' },
    amber: { border: '#D97706', bg: '#FFFBEB', badge: '#D97706' },
  }
  const c = colors[color]
  return (
    <div style={{ border: `1px solid ${c.border}30`, borderLeft: `3px solid ${c.border}`, background: c.bg, borderRadius: '0 8px 8px 0', padding: '16px 20px', margin: '12px 0' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: c.badge, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
      <div style={{ fontSize: 14, color: '#333', lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

function AlertBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFF8EE', border: '1px solid #F5DFB0', borderLeft: '3px solid #D97706', borderRadius: '0 8px 8px 0', padding: '14px 18px', margin: '0 0 20px', fontSize: 14, color: '#7A5F2A', lineHeight: 1.7 }}>
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
  page: { background: '#F5F0E8', minHeight: '100vh', fontFamily: "'Jost', sans-serif" },
  hero: {
    background: '#2D4A3E',
    padding: '64px 24px 48px',
    textAlign: 'center',
  },
  heroLabel: { fontFamily: "'Cormorant Garamond', serif", fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4A882', margin: '0 0 12px' },
  heroTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 42, fontWeight: 600, color: '#fff', margin: '0 0 12px' },
  heroSub:   { fontSize: 15, color: 'rgba(255,255,255,0.65)', margin: 0 },
  container: { maxWidth: 820, margin: '0 auto', padding: '48px 24px 80px' },
  section:   { marginBottom: 48, paddingBottom: 48, borderBottom: '1px solid rgba(45,74,62,0.1)' },
  sectionTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 24, fontWeight: 600, color: '#1C2B25',
    margin: '0 0 20px', paddingBottom: 12,
    borderBottom: '2px solid #C4A882',
    display: 'inline-block',
  },
  sectionBody: { fontSize: 14, color: '#444', lineHeight: 1.8 },
  subTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: '#2D4A3E', margin: '24px 0 12px' },
  infoTable: { width: '100%', borderCollapse: 'collapse', fontSize: 13, borderRadius: 8, overflow: 'hidden' },
  trEven: { background: '#F9F6F1' },
  trOdd:  { background: '#fff' },
  tdLabel: { padding: '10px 16px', color: '#777', fontWeight: 500, width: '38%', borderBottom: '1px solid #EEE' },
  tdValue: { padding: '10px 16px', color: '#1C2B25', borderBottom: '1px solid #EEE' },
  th:      { padding: '11px 16px', color: '#fff', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' },
  link:    { color: '#2D4A3E', textDecoration: 'underline' },
  footer:  { marginTop: 48, textAlign: 'center' },
  footerText:  { fontSize: 12, color: '#AAA', margin: '0 0 12px' },
  footerLinks: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  footerLink:  { fontSize: 13, color: '#2D4A3E', textDecoration: 'none', fontWeight: 500 },
  dot:         { color: '#CCC', fontSize: 13 },
}

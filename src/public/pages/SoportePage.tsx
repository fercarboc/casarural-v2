import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone, Mail, MessageCircle, ChevronDown, ChevronUp,
  Clock, MapPin, Calendar, FileText, ShieldCheck, HelpCircle,
  ArrowRight, CheckCircle2
} from 'lucide-react';

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQS = [
  {
    cat: 'Reservas',
    items: [
      {
        q: '¿Cómo puedo hacer una reserva?',
        a: 'Puedes reservar directamente desde nuestra web en la sección "Reservar". Selecciona las fechas, el número de huéspedes y elige la tarifa que mejor se adapte a ti (flexible o no reembolsable). El pago se realiza de forma segura a través de Stripe.',
      },
      {
        q: '¿Cuál es la diferencia entre tarifa flexible y no reembolsable?',
        a: 'La tarifa flexible requiere solo un 50% de señal al reservar y el resto antes de la llegada; además permite cancelación con devolución de la señal si se cancela con más de 30 días de antelación. La tarifa no reembolsable incluye un descuento del 10% pero el importe total se paga al reservar y no se devuelve en caso de cancelación.',
      },
      {
        q: '¿Puedo modificar las fechas de mi reserva?',
        a: 'Sí, puedes solicitar un cambio de fechas a través de tu página de reserva (enlace en el email de confirmación) usando el botón "Solicitar cambio". Estudiaremos tu solicitud y te responderemos en el menor tiempo posible, siempre sujeto a disponibilidad.',
      },
      {
        q: '¿Con cuánta antelación puedo reservar?',
        a: 'Puedes reservar con hasta 12 meses de antelación. Para reservas de última hora (menos de 48 horas), te recomendamos contactarnos directamente por teléfono o WhatsApp para confirmar disponibilidad.',
      },
      {
        q: '¿Cuántas personas pueden alojarse?',
        a: 'La Rasilla tiene capacidad para un máximo de 11 personas. El precio base incluye hasta 10 personas; el huésped número 11 tiene un suplemento adicional por noche.',
      },
    ],
  },
  {
    cat: 'Check-in y Check-out',
    items: [
      {
        q: '¿Cuál es el horario de check-in?',
        a: 'El check-in es a partir de las 16:00 h. Estaremos allí para recibirte personalmente y entregarte las llaves. Unos días antes de tu llegada nos pondremos en contacto contigo para coordinarnos e indicarte el mejor acceso al pueblo según desde dónde viajes.',
      },
      {
        q: '¿Cuál es el horario de check-out?',
        a: 'El check-out es antes de las 12:00 h del día de salida. Si necesitas un check-out más tardío, consúltanos con antelación y lo estudiaremos según la disponibilidad.',
      },
      {
        q: '¿Dónde está exactamente la casa?',
        a: 'La Rasilla está en Castillo Pedroso, 39699, Corvera de Toranzo, Cantabria. Al hacer la reserva recibirás las instrucciones de acceso detalladas. El pueblo tiene dos accesos principales y te indicaremos el más adecuado según tu punto de origen.',
      },
      {
        q: '¿Hay aparcamiento?',
        a: 'Sí, dispones de aparcamiento gratuito en la propiedad con espacio suficiente para varios vehículos.',
      },
    ],
  },
  {
    cat: 'Pagos y Cancelaciones',
    items: [
      {
        q: '¿Cómo funciona el pago?',
        a: 'El pago se realiza online de forma segura con Stripe (tarjeta de crédito/débito). En tarifa flexible abonas el 50% al reservar y el resto 30 días antes de la llegada. En tarifa no reembolsable el pago es completo al reservar.',
      },
      {
        q: '¿Puedo cancelar mi reserva?',
        a: 'Depende de la tarifa elegida.\n\nTarifa flexible: la política de cancelación funciona por tramos según la antelación con la que canceles respecto a la fecha de entrada. Con más de 60 días de antelación se devuelve el 100% de lo pagado. Entre 45 y 60 días se devuelve el 50%. Entre 30 y 45 días se devuelve el 25%. Con menos de 30 días de antelación no hay devolución.\n\nTarifa no reembolsable: no hay devolución en ningún caso, salvo fuerza mayor imputable a nosotros (obras, averías graves de la propiedad), en cuyo caso se devuelve el importe íntegro.',
      },
      {
        q: '¿Se emite factura?',
        a: 'Sí, podemos emitir factura. Indícanos tus datos fiscales (nombre/razón social, NIF/CIF y dirección) a través del formulario de contacto o al realizar la reserva.',
      },
      {
        q: '¿Hay fianza o depósito?',
        a: 'Sí. Al hacer el check-in solicitamos una fianza de 150 € en efectivo o transferencia, que se devuelve al día siguiente una vez comprobado el estado de la propiedad. En caso de daños materiales se descontarán los gastos de reparación de la fianza.',
      },
    ],
  },
  {
    cat: 'La Casa y Servicios',
    items: [
      {
        q: '¿Qué incluye el alojamiento?',
        a: 'La Rasilla incluye ropa de cama, toallas, calefacción, cocina completamente equipada, barbacoa, jardín y zona de juegos. La tarifa de limpieza final está incluida en el precio. Ten en cuenta que la casa no dispone de wifi.',
      },
      {
        q: '¿Se admiten mascotas?',
        a: 'De momento no admitimos mascotas para garantizar el confort de todos los huéspedes. Si tienes alguna necesidad especial, contáctanos y lo valoramos.',
      },
      {
        q: '¿Puedo celebrar eventos o reuniones?',
        a: 'La casa es ideal para reuniones familiares, cumpleaños y celebraciones íntimas. Para eventos con más de 11 personas o con catering externo, consúltanos previamente.',
      },
      {
        q: '¿Hay normas específicas en la casa?',
        a: 'Sí: respeto al descanso de los vecinos (silencio a partir de las 23:00 h), no fumar en el interior, y cuidado general de las instalaciones. Las normas completas te las facilita al momento del check-in.',
      },
    ],
  },
];

// ─── Componente FAQ item ───────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-stone-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start justify-between gap-4 py-5 text-left"
      >
        <span className="font-semibold text-stone-800 text-sm leading-relaxed">{q}</span>
        {open
          ? <ChevronUp size={18} className="text-stone-400 shrink-0 mt-0.5" />
          : <ChevronDown size={18} className="text-stone-400 shrink-0 mt-0.5" />
        }
      </button>
      {open && (
        <p className="text-sm text-stone-600 leading-relaxed pb-5 pr-8 whitespace-pre-line">{a}</p>
      )}
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────
export const SoportePage: React.FC = () => {
  const [activecat, setActiveCat] = useState('Reservas');

  const activeFaqs = FAQS.find(f => f.cat === activecat)?.items ?? [];

  return (
    <div className="min-h-screen bg-stone-50">

      {/* Hero */}
      <section className="bg-stone-900 text-white py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-700 bg-stone-800 px-4 py-2 text-xs font-semibold text-stone-400 mb-6">
            <HelpCircle size={14} /> Centro de ayuda
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">
            ¿En qué podemos ayudarte?
          </h1>
          <p className="text-lg text-stone-400 leading-relaxed">
            Encuentra respuesta a las preguntas más frecuentes o contáctanos directamente. Estamos aquí para que tu estancia sea perfecta.
          </p>
        </div>
      </section>

      {/* Contacto rápido */}
      <section className="bg-white border-b border-stone-200 py-10 px-6">
        <div className="mx-auto max-w-5xl grid gap-4 sm:grid-cols-3">
          <a href="tel:+34690288707"
            className="group flex items-center gap-4 rounded-2xl border border-stone-200 p-5 hover:border-emerald-300 hover:bg-emerald-50 transition-all">
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200 transition-colors">
              <Phone size={20} />
            </div>
            <div>
              <p className="font-bold text-stone-800 text-sm">Llamar</p>
              <p className="text-xs text-stone-500">+34 690-288-707</p>
              <p className="text-xs text-stone-400">Lun–Dom · 9:00–21:00</p>
            </div>
          </a>

          <a href="https://wa.me/34690288707" target="_blank" rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl border border-stone-200 p-5 hover:border-emerald-300 hover:bg-emerald-50 transition-all">
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200 transition-colors">
              <MessageCircle size={20} />
            </div>
            <div>
              <p className="font-bold text-stone-800 text-sm">WhatsApp</p>
              <p className="text-xs text-stone-500">+34 690-288-707</p>
              <p className="text-xs text-stone-400">Respuesta inmediata</p>
            </div>
          </a>

          <a href="mailto:contacto@casarurallarasilla.com"
            className="group flex items-center gap-4 rounded-2xl border border-stone-200 p-5 hover:border-emerald-300 hover:bg-emerald-50 transition-all">
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200 transition-colors">
              <Mail size={20} />
            </div>
            <div>
              <p className="font-bold text-stone-800 text-sm">Email</p>
              <p className="text-xs text-stone-500">contacto@casarurallarasilla.com</p>
              <p className="text-xs text-stone-400">Respuesta en &lt; 24 horas</p>
            </div>
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-serif font-bold text-stone-800 mb-8">Preguntas frecuentes</h2>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Categorías */}
            <nav className="lg:w-48 shrink-0">
              <ul className="space-y-1">
                {FAQS.map(f => (
                  <li key={f.cat}>
                    <button
                      onClick={() => setActiveCat(f.cat)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        activecat === f.cat
                          ? 'bg-emerald-700 text-white'
                          : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {f.cat}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Preguntas */}
            <div className="flex-1 rounded-2xl border border-stone-200 bg-white px-6 divide-y divide-stone-100">
              {activeFaqs.map((item, i) => (
                <FaqItem key={i} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Info rápida: horarios y ubicación */}
      <section className="bg-white border-t border-stone-200 py-16 px-6">
        <div className="mx-auto max-w-5xl grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard icon={<Clock size={20} className="text-emerald-700" />} title="Check-in" lines={['A partir de las 16:00 h', 'Recepción en persona']} />
          <InfoCard icon={<Clock size={20} className="text-emerald-700" />} title="Check-out" lines={['Antes de las 12:00 h', 'Consultar salida tardía']} />
          <InfoCard icon={<MapPin size={20} className="text-emerald-700" />} title="Dirección" lines={['Castillo Pedroso, 39699', 'Corvera de Toranzo, Cantabria']} />
          <InfoCard icon={<Calendar size={20} className="text-emerald-700" />} title="Estancia mínima" lines={['2 noches en temporada base', '3–4 noches en temporada alta']} />
        </div>
      </section>

      {/* Links a documentos */}
      <section className="py-16 px-6 bg-stone-50">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-serif font-bold text-stone-800 mb-6">Documentación y políticas</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { to: '/condiciones-reserva',   icon: <FileText  size={16} />, label: 'Condiciones de reserva' },
              { to: '/politica-cancelaciones',icon: <ShieldCheck size={16} />, label: 'Política de cancelaciones' },
              { to: '/politica-privacidad',   icon: <ShieldCheck size={16} />, label: 'Política de privacidad' },
              { to: '/politica-cookies',      icon: <FileText  size={16} />, label: 'Política de cookies' },
              { to: '/aviso-legal',           icon: <FileText  size={16} />, label: 'Aviso legal' },
              { to: '/rgpd',                  icon: <ShieldCheck size={16} />, label: 'RGPD' },
            ].map(l => (
              <Link key={l.to} to={l.to}
                className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-5 py-4 text-sm font-semibold text-stone-700 hover:border-emerald-300 hover:text-emerald-700 transition-all group">
                <div className="flex items-center gap-3">
                  <span className="text-stone-400 group-hover:text-emerald-600 transition-colors">{l.icon}</span>
                  {l.label}
                </div>
                <ArrowRight size={14} className="text-stone-300 group-hover:text-emerald-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-emerald-800 py-16 px-6 text-center text-white">
        <div className="mx-auto max-w-2xl space-y-4">
          <CheckCircle2 size={36} className="mx-auto text-emerald-300" />
          <h2 className="text-3xl font-serif font-bold">¿No encuentras lo que buscas?</h2>
          <p className="text-emerald-200">Escríbenos y te respondemos personalmente en menos de 24 horas.</p>
          <Link to="/contacto"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-50 transition-all mt-2">
            Enviar consulta <ArrowRight size={16} />
          </Link>
        </div>
      </section>

    </div>
  );
};

function InfoCard({ icon, title, lines }: { icon: React.ReactNode; title: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-stone-200 p-5 space-y-3">
      <div className="p-2.5 rounded-xl bg-emerald-50 w-fit">{icon}</div>
      <p className="font-bold text-stone-800 text-sm">{title}</p>
      {lines.map((l, i) => <p key={i} className="text-xs text-stone-500">{l}</p>)}
    </div>
  );
}

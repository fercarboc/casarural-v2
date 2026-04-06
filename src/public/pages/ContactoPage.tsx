import React, { useState } from 'react';
import { HeroSection } from '../components/HeroSection';
import { SectionContainer } from '../components/SectionContainer';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Globe,
} from 'lucide-react';
import { MetaTags } from '../components/MetaTags';
import { supabase } from '../../integrations/supabase/client';
import { usePublicProperty } from '../../shared/hooks/usePublicProperty';
import {
  getMetaDescription,
  getFullAddress,
  getSiteName,
  getSiteTagline,
} from '../../shared/utils/publicProperty.utils';

export const ContactoPage: React.FC = () => {
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    asunto: '',
    mensaje: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const { property } = usePublicProperty();

  const siteName = getSiteName(property);
  const siteTagline = getSiteTagline(property);
  const metaTitle = property?.meta_title?.trim()
    ? `Contacto | ${property.meta_title}`
    : `Contacto | ${siteName}`;
  const metaDescription =
    property?.meta_description?.trim() ||
    getMetaDescription(property);

  const fullAddress = getFullAddress(property);
  const email = property?.email?.trim() || '';
  const phone = property?.telefono?.trim() || '';
  const website = property?.web?.trim() || '';
  const generalDescription =
    property?.descripcion?.trim() ||
    `${siteName} ofrece atención directa para resolver dudas sobre disponibilidad, reserva y estancia.`;

  const heroTitle =
    property?.site_title?.trim()
      ? `Contacto ${property.site_title}`
      : `Contacto ${siteName}`;

  const heroSubtitle =
    property?.site_tagline?.trim()
      ? `¿Tienes dudas? ${property.site_tagline}. Contacta con nosotros y te responderemos lo antes posible.`
      : `¿Tienes dudas sobre el alojamiento o el entorno? Contacta con nosotros y te responderemos lo antes posible.`;

  const heroImage = '/images/pueblo3.jpg';

  const set = (k: string, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nombre || !form.email || !form.mensaje) return;

    if (!property?.id) {
      setError('No se ha podido identificar la propiedad. Recarga la página e inténtalo de nuevo.');
      return;
    }

    setSending(true);
    setError('');

    try {
      const payload = {
        property_id: property.id,
        nombre: form.nombre.trim(),
        email: form.email.trim().toLowerCase(),
        telefono: form.telefono.trim() || null,
        asunto: form.asunto.trim() || 'Consulta general',
        tipo: 'CONTACTO',
        mensaje: form.mensaje.trim(),
        estado: 'PENDIENTE',
      };

      const { error: err } = await supabase
        .from('consultas')
        .insert(payload);

      if (err) throw err;

      setSent(true);
    } catch (err) {
      console.error('Error insertando consulta:', err);
      setError(
        `Ha ocurrido un error. ${
          email
            ? `Por favor, escríbenos directamente a ${email}.`
            : 'Por favor, inténtalo de nuevo más tarde.'
        }`
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white">
      <MetaTags
        title={metaTitle}
        description={metaDescription}
      />

      <HeroSection
        title={heroTitle}
        subtitle={heroSubtitle}
        image={heroImage}
      />

      <SectionContainer>
        <div className="grid gap-16 lg:grid-cols-2">
          <div className="space-y-8">
            <div>
              <h2 className="mb-6 text-4xl font-serif font-bold text-stone-800">
                Atención directa y personalizada
              </h2>
              <p className="text-lg leading-relaxed text-stone-600">
                En <strong>{siteName}</strong> creemos en el trato cercano.
                Al contactar con nosotros, hablas directamente con la propiedad
                o con su gestión. Sin intermediarios innecesarios y con
                información clara para ayudarte con tu estancia.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-stone-600">
                {generalDescription}
              </p>
            </div>

            <div className="grid gap-6">
              {phone ? (
                <div className="flex items-start gap-4 rounded-2xl border border-stone-100 bg-stone-50 p-6">
                  <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
                    <Phone size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-800">Teléfono</h4>
                    <p className="text-stone-600">{phone}</p>
                    <p className="mt-1 text-sm text-stone-400">
                      Atención directa para resolver tus dudas.
                    </p>
                  </div>
                </div>
              ) : null}

              {email ? (
                <div className="flex items-start gap-4 rounded-2xl border border-stone-100 bg-stone-50 p-6">
                  <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-800">Correo electrónico</h4>
                    <p className="text-stone-600">{email}</p>
                    <p className="mt-1 text-sm text-stone-400">
                      Respondemos lo antes posible.
                    </p>
                  </div>
                </div>
              ) : null}

              {fullAddress ? (
                <div className="flex items-start gap-4 rounded-2xl border border-stone-100 bg-stone-50 p-6">
                  <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-800">Ubicación</h4>
                    <p className="text-stone-600">{fullAddress}</p>
                    <p className="mt-1 text-sm text-stone-400">
                      Consulta la ubicación antes de planificar tu viaje.
                    </p>
                  </div>
                </div>
              ) : null}

              {website ? (
                <div className="flex items-start gap-4 rounded-2xl border border-stone-100 bg-stone-50 p-6">
                  <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
                    <Globe size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-800">Web</h4>
                    <a
                      href={website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-stone-600 underline decoration-stone-300 underline-offset-4 hover:text-emerald-700"
                    >
                      {website}
                    </a>
                  </div>
                </div>
              ) : null}

              <div className="flex items-start gap-4 rounded-2xl border border-stone-100 bg-stone-50 p-6">
                <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
                  <Clock size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-stone-800">Horario de Atención</h4>
                  <p className="font-medium text-stone-600">
                    09:00 – 23:00 · Lunes a Domingo
                  </p>
                  <p className="mt-1 text-sm text-stone-400">
                    Atención telefónica y WhatsApp durante todo el día.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
              <ShieldCheck className="shrink-0 text-emerald-600" size={32} />
              <p className="font-medium text-emerald-900">
                Al reservar directamente con nosotros, te ofrecemos una
                comunicación más clara, sin intermediarios innecesarios y con
                condiciones visibles desde la propia web.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-100 bg-white p-8 shadow-2xl md:p-12">
            {sent ? (
              <div className="flex h-full flex-col items-center justify-center space-y-4 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-2xl font-serif font-bold text-stone-800">
                  ¡Mensaje enviado!
                </h3>
                <p className="max-w-xs text-stone-500">
                  Hemos recibido tu consulta. Te responderemos en el email{' '}
                  <strong>{form.email}</strong> lo antes posible.
                </p>
                <button
                  onClick={() => {
                    setSent(false);
                    setForm({
                      nombre: '',
                      email: '',
                      telefono: '',
                      asunto: '',
                      mensaje: '',
                    });
                  }}
                  className="mt-4 text-sm font-medium text-emerald-700 hover:underline"
                >
                  Enviar otra consulta
                </button>
              </div>
            ) : (
              <>
                <h3 className="mb-8 text-2xl font-serif font-bold text-stone-800">
                  Envíanos un mensaje
                </h3>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-stone-700">
                        Nombre completo *
                      </label>
                      <input
                        type="text"
                        value={form.nombre}
                        onChange={(e) => set('nombre', e.target.value)}
                        required
                        className="w-full rounded-xl border border-stone-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                        placeholder="Tu nombre"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-stone-700">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => set('email', e.target.value)}
                        required
                        className="w-full rounded-xl border border-stone-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                        placeholder="tu@email.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={form.telefono}
                      onChange={(e) => set('telefono', e.target.value)}
                      className="w-full rounded-xl border border-stone-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                      placeholder="+34 600 000 000"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">
                      Asunto
                    </label>
                    <input
                      type="text"
                      value={form.asunto}
                      onChange={(e) => set('asunto', e.target.value)}
                      className="w-full rounded-xl border border-stone-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                      placeholder="¿En qué podemos ayudarte?"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">
                      Mensaje *
                    </label>
                    <textarea
                      rows={4}
                      value={form.mensaje}
                      onChange={(e) => set('mensaje', e.target.value)}
                      required
                      className="w-full rounded-xl border border-stone-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                      placeholder="Cuéntanos más sobre tu consulta..."
                    />
                  </div>

                  {error ? (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={sending}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-4 font-bold text-white shadow-lg transition-colors hover:bg-stone-800 disabled:opacity-50"
                  >
                    {sending ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar mensaje ahora'
                    )}
                  </button>

                  <p className="text-center text-xs text-stone-400">
                    Al enviar este formulario, aceptas nuestra política de
                    privacidad. Tus datos solo se usarán para responder a tu
                    consulta.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </SectionContainer>
    </div>
  );
};
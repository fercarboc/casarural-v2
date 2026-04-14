import React, { useEffect, useMemo, useState } from 'react';
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
import { usePublicProperty } from '../../shared/hooks/usePublicProperty';
import {
  getMetaDescription,
  getFullAddress,
  getSiteName,
  getSiteTagline,
} from '../../shared/utils/publicProperty.utils';
import { fetchPublicUnits } from '../services/publicUnits.service';
import { createPublicContact } from '../services/publicContact.service';
import { useTenant } from '../../shared/context/TenantContext';

interface UnitOption {
  id: string;
  nombre: string;
  slug: string;
}

export const ContactoPage: React.FC = () => {
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    asunto: '',
    mensaje: '',
    selectedUnitId: '',
  });

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [error, setError] = useState('');
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [unitOptions, setUnitOptions] = useState<UnitOption[]>([]);

  const { property_id } = useTenant();
  const { property } = usePublicProperty();

  const siteName = getSiteName(property);
  getSiteTagline(property);
  const metaTitle = property?.meta_title?.trim()
    ? `Contacto | ${property.meta_title}`
    : `Contacto | ${siteName}`;
  const metaDescription =
    property?.meta_description?.trim() || getMetaDescription(property);

  const fullAddress = getFullAddress(property);
  const propertyEmail = property?.email?.trim() || '';
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
      : `¿Tienes dudas sobre disponibilidad, precios, condiciones o alternativas? Contacta con nosotros y te responderemos lo antes posible.`;

  const heroImage = '/images/pueblo3.jpg';

  useEffect(() => {
    const loadUnits = async () => {
      try {
        const result = await fetchPublicUnits({ property_id });
        const rows: UnitOption[] = (result.units ?? []).map((u) => ({
          id: u.id,
          nombre: u.nombre,
          slug: u.slug,
        }));
        setUnitOptions(rows);
      } catch (err) {
        console.error('Error loading unit options:', err);
        setUnitOptions([]);
      } finally {
        setOptionsLoading(false);
      }
    };

    loadUnits();
  }, []);

  const selectedUnit = useMemo(() => {
    return unitOptions.find((u) => u.id === form.selectedUnitId) ?? null;
  }, [unitOptions, form.selectedUnitId]);

  const isGlobal = !form.selectedUnitId;

  const set = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const resetForm = () => {
    setForm({
      nombre: '',
      email: '',
      telefono: '',
      asunto: '',
      mensaje: '',
      selectedUnitId: '',
    });
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.nombre.trim() || !form.email.trim() || !form.mensaje.trim()) {
      setError('Completa al menos nombre, email y mensaje.');
      return;
    }

    setSending(true);
    setError('');

    try {
      // Always use the real property_id. Unit selection is informational only —
      // the asunto field captures which unit the user is asking about.
      const asunto = form.asunto.trim() ||
        (selectedUnit ? `Consulta sobre ${selectedUnit.nombre}` : 'Consulta general');

      await createPublicContact({
        nombre: form.nombre.trim(),
        email: form.email.trim().toLowerCase(),
        telefono: form.telefono.trim() || null,
        asunto,
        mensaje: form.mensaje.trim(),
        property_id: isGlobal ? null : property?.id ?? null,
      });

      setSentEmail(form.email.trim().toLowerCase());
      setSent(true);
      resetForm();
    } catch (err) {
      console.error('Error enviando consulta:', err);
      setError(
        `Ha ocurrido un error. ${
          propertyEmail
            ? `Por favor, escríbenos directamente a ${propertyEmail}.`
            : 'Por favor, inténtalo de nuevo más tarde.'
        }`,
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

              {propertyEmail ? (
                <div className="flex items-start gap-4 rounded-2xl border border-stone-100 bg-stone-50 p-6">
                  <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-800">Correo electrónico</h4>
                    <p className="text-stone-600">{propertyEmail}</p>
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
                  <h4 className="font-bold text-stone-800">Horario de atención</h4>
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
                Puedes consultarnos disponibilidad, alternativas si unas fechas
                están ocupadas, condiciones de reserva, devoluciones o cualquier
                otra duda antes de reservar.
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
                  <strong>{sentEmail}</strong> lo antes posible.
                </p>
                <button
                  onClick={() => {
                    setSent(false);
                    setSentEmail('');
                    resetForm();
                    setError('');
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">
                      ¿Sobre qué quieres consultar?
                    </label>
                    <select
                      value={form.selectedUnitId}
                      onChange={(e) => set('selectedUnitId', e.target.value)}
                      disabled={optionsLoading}
                      className="w-full rounded-xl border border-stone-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                    >
                      <option value="">
                        Consulta general sobre todas las propiedades
                      </option>
                      {unitOptions.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.nombre}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-stone-500">
                      Puedes dejar la consulta como general o elegir una propiedad concreta.
                    </p>
                  </div>

                  <div
                    className={`rounded-xl px-4 py-3 text-sm ${
                      isGlobal
                        ? 'border border-blue-100 bg-blue-50 text-blue-900'
                        : 'border border-emerald-100 bg-emerald-50 text-emerald-900'
                    }`}
                  >
                    {isGlobal ? (
                      <>
                        Esta consulta se guardará como <strong>consulta general</strong>.
                      </>
                    ) : (
                      <>
                        Esta consulta se asociará a{' '}
                        <strong>{selectedUnit?.nombre || 'la propiedad seleccionada'}</strong>.
                      </>
                    )}
                  </div>

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
                      placeholder="Ej. Consulta para grupo, cambio de fechas, política de devolución..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">
                      Mensaje *
                    </label>
                    <textarea
                      rows={5}
                      value={form.mensaje}
                      onChange={(e) => set('mensaje', e.target.value)}
                      required
                      className="w-full rounded-xl border border-stone-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                      placeholder="Cuéntanos tu duda, las fechas aproximadas, el número de personas o cualquier detalle útil..."
                    />
                  </div>

                  {error ? (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={sending || optionsLoading}
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

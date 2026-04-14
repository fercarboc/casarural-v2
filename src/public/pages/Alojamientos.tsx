import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Home,
  Trees,
  Users2,
  Bed,
  Coffee,
  Utensils,
  Bath,
  CheckCircle2,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { HeroSection } from '../components/HeroSection';
import { SectionContainer } from '../components/SectionContainer';
import { FeatureGrid } from '../components/FeatureGrid';
import { CTASection } from '../components/CTASection';
import { MetaTags } from '../components/MetaTags';
import { fetchPublicUnits, type PublicUnit } from '../services/publicUnits.service';
import { useTenant } from '../../shared/context/TenantContext';

const HERO_FALLBACK = '/images/casa3.jpg';

export const AlojamientosPage: React.FC = () => {
  const { property_id } = useTenant();
  const [units, setUnits] = useState<PublicUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUnits = async () => {
      try {
        const result = await fetchPublicUnits({ property_id });
        setUnits(result.units ?? []);
      } catch (err) {
        console.error('Error loading units:', err);
        setUnits([]);
      } finally {
        setLoading(false);
      }
    };

    loadUnits();
  }, []);

  const activeUnits = useMemo(() => units.filter((u) => u.activa), [units]);
  const isSingleUnit = activeUnits.length <= 1;
  const singleUnit = activeUnits[0] ?? null;

  const heroImage = singleUnit?.portada_url || singleUnit?.fotos?.[0]?.public_url || HERO_FALLBACK;

  // Build gallery for single-unit mode: use real photos from unidad_fotos
  const singleGallery = useMemo(() => {
    if (!singleUnit) return [];
    return singleUnit.fotos.map((f) => f.public_url).filter(Boolean).slice(0, 9);
  }, [singleUnit]);

  const metaTitle = isSingleUnit
    ? `${singleUnit?.nombre || 'Alojamiento'} | Alojamiento rural en Cantabria`
    : 'Alojamientos rurales en Cantabria | Reserva directa';

  const metaDescription = isSingleUnit
    ? singleUnit?.descripcion_corta ||
      'Descubre nuestro alojamiento rural en Cantabria con reserva directa, naturaleza y confort.'
    : 'Descubre nuestros alojamientos rurales en Cantabria. Reserva directa, mejor precio y escapadas para grupos, familias y parejas.';

  if (loading) {
    return (
      <div className="bg-white">
        <MetaTags title="Cargando alojamiento..." description="Cargando información del alojamiento" />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-stone-500">Cargando alojamientos...</p>
        </div>
      </div>
    );
  }

  if (!activeUnits.length) {
    return (
      <div className="bg-white">
        <MetaTags
          title="Alojamientos | Próximamente"
          description="Próximamente estarán disponibles nuestros alojamientos rurales."
        />

        <HeroSection
          title="Alojamientos rurales en preparación"
          subtitle="Estamos actualizando esta sección para mostrarte nuestros alojamientos con toda la información y reserva directa."
          image={HERO_FALLBACK}
        />

        <SectionContainer>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-serif font-bold text-stone-800">
              Próximamente
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-stone-600">
              En breve podrás consultar aquí todos los alojamientos disponibles,
              sus características, fotos y acceso directo a la reserva online.
            </p>
          </div>
        </SectionContainer>
      </div>
    );
  }

  if (isSingleUnit && singleUnit) {
    return (
      <div className="bg-white">
        <MetaTags title={metaTitle} description={metaDescription} />

        <HeroSection
          title={singleUnit.nombre}
          subtitle={
            singleUnit.descripcion_corta ||
            'Un espacio diseñado para el descanso, la convivencia y el disfrute de la naturaleza en Cantabria.'
          }
          image={heroImage}
        />

        <SectionContainer>
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div className="space-y-6">
              <h2 className="text-4xl font-serif font-bold text-stone-800">
                Un alojamiento con encanto en Cantabria
              </h2>

              <div className="prose prose-stone space-y-4 text-lg leading-relaxed text-stone-600">
                <p>
                  {singleUnit.descripcion_larga ||
                    `${singleUnit.nombre} es un alojamiento pensado para ofrecer una experiencia cómoda, auténtica y bien resuelta en un entorno natural privilegiado.`}
                </p>

                <p>
                  {singleUnit.capacidad_maxima
                    ? `Cuenta con capacidad para hasta ${singleUnit.capacidad_maxima} huéspedes, con espacios preparados para disfrutar de una estancia cómoda tanto en familia como en grupo.`
                    : 'Dispone de espacios preparados para disfrutar de una estancia cómoda tanto en familia como en grupo.'}
                </p>

                <p>
                  {singleUnit.descripcion_extras ||
                    'Reserva directa, entorno natural y un alojamiento preparado para disfrutar sin complicaciones.'}
                </p>
              </div>

              <ul className="space-y-3 pt-4">
                {[
                  singleUnit.capacidad_maxima
                    ? `Capacidad máxima para ${singleUnit.capacidad_maxima} personas`
                    : null,
                  singleUnit.capacidad_base
                    ? `Capacidad base para ${singleUnit.capacidad_base} personas`
                    : null,
                  singleUnit.num_habitaciones
                    ? `${singleUnit.num_habitaciones} habitaciones`
                    : null,
                  singleUnit.num_banos
                    ? `${singleUnit.num_banos} baños`
                    : null,
                  singleUnit.superficie_m2
                    ? `${singleUnit.superficie_m2} m²`
                    : null,
                  'Reserva directa con mejor control y atención cercana',
                ]
                  .filter(Boolean)
                  .map((item, i) => (
                    <li key={i} className="flex items-center gap-3 font-medium text-stone-700">
                      <CheckCircle2 size={20} className="text-emerald-600" />
                      {item}
                    </li>
                  ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {singleGallery.slice(0, 6).map((url, index) => (
                <img
                  key={`${url}-${index}`}
                  src={url}
                  alt={`${singleUnit.nombre} imagen ${index + 1}`}
                  className="aspect-[4/3] w-full rounded-2xl object-cover shadow-lg"
                />
              ))}
            </div>
          </div>

          {singleGallery.length > 6 ? (
            <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
              {singleGallery.slice(6, 9).map((url, index) => (
                <img
                  key={`${url}-bottom-${index}`}
                  src={url}
                  alt={`${singleUnit.nombre} detalle ${index + 7}`}
                  className="h-48 w-full rounded-2xl object-cover shadow-md"
                />
              ))}
            </div>
          ) : null}
        </SectionContainer>

        <SectionContainer bg="stone">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-serif font-bold text-stone-800">
              Diseñado para disfrutar la estancia
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-stone-500">
              Un alojamiento preparado para combinar comodidad, funcionalidad y entorno.
            </p>
          </div>

          <FeatureGrid
            features={[
              {
                icon: <Users size={24} />,
                title: singleUnit.capacidad_maxima
                  ? `Hasta ${singleUnit.capacidad_maxima} personas`
                  : 'Capacidad flexible',
                description:
                  'Espacios pensados para una estancia cómoda y bien aprovechada.',
              },
              {
                icon: <Home size={24} />,
                title: 'Reserva directa',
                description:
                  'Sin intermediarios innecesarios y con información clara desde nuestra web.',
              },
              {
                icon: <Trees size={24} />,
                title: 'Entorno natural',
                description:
                  'Naturaleza, desconexión y la esencia rural de Cantabria.',
              },
              {
                icon: <Users2 size={24} />,
                title: 'Ideal para grupos y familias',
                description:
                  'Una opción pensada para compartir estancia con comodidad.',
              },
            ]}
          />
        </SectionContainer>

        <SectionContainer>
          <div className="rounded-3xl bg-stone-900 p-12 text-white shadow-2xl">
            <h2 className="mb-12 text-center text-3xl font-serif font-bold">
              Distribución y Equipamiento
            </h2>

            <div className="grid gap-12 md:grid-cols-2">
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="shrink-0 rounded-full bg-stone-800 p-3 text-emerald-400">
                    <Bed size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold">Habitaciones</h4>
                    <p className="mt-2 text-stone-400">
                      {singleUnit.num_habitaciones
                        ? `Este alojamiento dispone de ${singleUnit.num_habitaciones} habitaciones para una estancia cómoda y bien distribuida.`
                        : 'Habitaciones preparadas para garantizar descanso y comodidad.'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="shrink-0 rounded-full bg-stone-800 p-3 text-emerald-400">
                    <Bath size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold">Baños</h4>
                    <p className="mt-2 text-stone-400">
                      {singleUnit.num_banos
                        ? `Cuenta con ${singleUnit.num_banos} baños para facilitar una estancia práctica y cómoda.`
                        : 'Baños preparados para cubrir las necesidades de la estancia con comodidad.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="shrink-0 rounded-full bg-stone-800 p-3 text-emerald-400">
                    <Coffee size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold">Zona de estar</h4>
                    <p className="mt-2 text-stone-400">
                      Espacios pensados para descansar, compartir tiempo y disfrutar de la estancia.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="shrink-0 rounded-full bg-stone-800 p-3 text-emerald-400">
                    <Utensils size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold">Equipamiento</h4>
                    <p className="mt-2 text-stone-400">
                      {singleUnit.amenities?.length
                        ? 'Incluye servicios y equipamiento pensados para una experiencia cómoda y completa.'
                        : 'Equipamiento orientado a que la estancia sea práctica, cómoda y funcional.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {singleUnit.amenities?.length ? (
              <div className="mt-12 border-t border-stone-800 pt-8">
                <h3 className="mb-4 text-xl font-bold text-white">Servicios destacados</h3>
                <div className="flex flex-wrap gap-3">
                  {singleUnit.amenities.map((item, index) => (
                    <span
                      key={`${item}-${index}`}
                      className="rounded-full border border-stone-700 bg-stone-800 px-4 py-2 text-sm text-stone-200"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </SectionContainer>

        <SectionContainer bg="stone">
          <CTASection
            title={`¿Quieres reservar ${singleUnit.nombre}?`}
            subtitle="Consulta disponibilidad y reserva directamente desde nuestra web."
            buttonText="Ver disponibilidad y precios"
            to={`/reservar?unidad=${singleUnit.slug}`}
          />
        </SectionContainer>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <MetaTags title={metaTitle} description={metaDescription} />

      <HeroSection
        title="Nuestros alojamientos"
        subtitle="Descubre diferentes opciones de estancia en Cantabria, con reserva directa, fotos reales y toda la información de cada alojamiento."
        image={activeUnits[0]?.portada_url || activeUnits[0]?.fotos?.[0]?.public_url || HERO_FALLBACK}
      />

      <SectionContainer>
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <h2 className="text-4xl font-serif font-bold text-stone-800">
            Alojamientos pensados para distintos tipos de estancia
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-stone-600">
            Aquí puedes ver todos los alojamientos activos, sus características principales y acceder
            directamente a la reserva del que mejor encaje contigo.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {activeUnits.map((unit) => {
            const cover = unit.portada_url || unit.fotos?.[0]?.public_url || HERO_FALLBACK;

            return (
              <article
                key={unit.id}
                className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <img
                  src={cover}
                  alt={unit.nombre}
                  className="h-72 w-full object-cover"
                />

                <div className="p-6">
                  <div className="mb-3 flex items-center gap-2 text-emerald-700">
                    <Building2 size={18} />
                    <span className="text-sm font-semibold uppercase tracking-wider">
                      Alojamiento
                    </span>
                  </div>

                  <h3 className="text-2xl font-serif font-bold text-stone-800">
                    {unit.nombre}
                  </h3>

                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-stone-600">
                    {unit.descripcion_corta || 'Alojamiento rural con reserva directa y estancia cómoda en Cantabria.'}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {unit.capacidad_maxima ? (
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                        Hasta {unit.capacidad_maxima} personas
                      </span>
                    ) : null}

                    {unit.num_habitaciones ? (
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                        {unit.num_habitaciones} habitaciones
                      </span>
                    ) : null}

                    {unit.num_banos ? (
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                        {unit.num_banos} baños
                      </span>
                    ) : null}
                  </div>

                  {unit.amenities?.length ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {unit.amenities.slice(0, 4).map((item, index) => (
                        <span
                          key={`${item}-${index}`}
                          className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Link
                      to={`/reservar?unidad=${unit.slug}`}
                      className="rounded-full bg-emerald-600 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-emerald-700"
                    >
                      Reservar
                    </Link>

                    <Link
                      to={`/reservar?unidad=${unit.slug}`}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 px-5 py-3 text-sm font-bold text-stone-700 transition hover:border-stone-500"
                    >
                      Ver disponibilidad <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </SectionContainer>

      <SectionContainer bg="stone">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-serif font-bold text-stone-800">
            Reserva directa y mejor control de tu estancia
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-stone-500">
            Consulta fotos, capacidad y características de cada alojamiento antes de reservar.
          </p>
        </div>

        <FeatureGrid
          features={[
            {
              icon: <Home size={24} />,
              title: 'Varios alojamientos',
              description: 'Elige la opción que mejor se adapte a tu estancia.',
            },
            {
              icon: <Users size={24} />,
              title: 'Para distintos tipos de grupos',
              description: 'Opciones pensadas para familias, parejas o grupos.',
            },
            {
              icon: <Trees size={24} />,
              title: 'Entorno natural',
              description: 'Alojamientos en una ubicación pensada para desconectar.',
            },
            {
              icon: <Users2 size={24} />,
              title: 'Reserva directa',
              description: 'Sin depender de terceros para conocer disponibilidad y condiciones.',
            },
          ]}
        />
      </SectionContainer>

      <SectionContainer bg="stone">
        <CTASection
          title="¿Ya sabes qué alojamiento te interesa?"
          subtitle="Consulta disponibilidad y reserva directamente online."
          buttonText="Ver disponibilidad y precios"
          to="/reservar"
        />
      </SectionContainer>
    </div>
  );
};

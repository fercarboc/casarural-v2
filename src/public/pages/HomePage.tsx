import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Users, Home, Trees, ShieldCheck, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { MetaTags, defaultSchema } from '../components/MetaTags';
import { supabase } from '../../integrations/supabase/client';

interface Unidad {
  id: string;
  nombre: string;
  slug: string;
  descripcion_corta: string | null;
  foto_portada: string | null;
  fotos: string[] | null;
  capacidad_base: number | null;
  capacidad_maxima: number | null;
  num_habitaciones: number | null;
  activa: boolean;
  orden: number | null;
}

interface HeroUnit extends Unidad {
  heroImage: string;
}

const HERO_FALLBACK_IMAGE = '/images/casa2.jpg';

export const HomePage: React.FC = () => {
  const [units, setUnits] = useState<Unidad[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const loadUnits = async () => {
      try {
        const { data, error } = await supabase
          .from('unidades')
          .select(`
            id,
            nombre,
            slug,
            descripcion_corta,
            foto_portada,
            fotos,
            capacidad_base,
            capacidad_maxima,
            num_habitaciones,
            activa,
            orden
          `)
          .eq('activa', true)
          .order('orden', { ascending: true });

        if (error) {
          console.error('Error loading active units:', error);
          setUnits([]);
          return;
        }

        setUnits((data ?? []) as Unidad[]);
      } catch (err) {
        console.error('Unexpected error loading active units:', err);
        setUnits([]);
      } finally {
        setLoadingUnits(false);
      }
    };

    loadUnits();
  }, []);

  const heroUnits = useMemo<HeroUnit[]>(() => {
    return units.map((unit) => ({
      ...unit,
      heroImage: unit.foto_portada || unit.fotos?.[0] || HERO_FALLBACK_IMAGE,
    }));
  }, [units]);

  const isSingleUnit = heroUnits.length <= 1;
  const currentHero = heroUnits[currentSlide] ?? null;
  const singleUnit = heroUnits[0] ?? null;

  useEffect(() => {
    if (heroUnits.length <= 1) return;

    const interval = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroUnits.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [heroUnits.length]);

  useEffect(() => {
    if (currentSlide >= heroUnits.length) {
      setCurrentSlide(0);
    }
  }, [currentSlide, heroUnits.length]);

  const goToPrevSlide = () => {
    if (heroUnits.length <= 1) return;
    setCurrentSlide((prev) => (prev === 0 ? heroUnits.length - 1 : prev - 1));
  };

  const goToNextSlide = () => {
    if (heroUnits.length <= 1) return;
    setCurrentSlide((prev) => (prev + 1) % heroUnits.length);
  };

  const heroTitle = isSingleUnit
    ? singleUnit?.nombre || 'Alojamiento rural en Cantabria'
    : 'Alojamientos rurales con encanto en Cantabria';

  const heroSubtitle = isSingleUnit
    ? 'Tu refugio rural'
    : 'Escapadas, grupos y naturaleza';

  const heroDescription = isSingleUnit
    ? singleUnit?.descripcion_corta ||
      `Reserva ${singleUnit?.nombre || 'tu alojamiento'} con todas las comodidades para disfrutar de una escapada rural auténtica en Cantabria.`
    : currentHero?.descripcion_corta ||
      'Descubre nuestros alojamientos rurales para familias, grupos y escapadas en plena naturaleza, con reserva directa y mejor precio en nuestra web.';

  const heroPrimaryLink = isSingleUnit
    ? `/reservar${singleUnit?.slug ? `?unidad=${singleUnit.slug}` : ''}`
    : '/reservar';

  const heroSecondaryLink = isSingleUnit
    ? `/alojamiento`
    : '/propiedades';

  const heroPrimaryText = isSingleUnit ? 'Ver Disponibilidad' : 'Reservar ahora';
  const heroSecondaryText = isSingleUnit ? 'Explorar alojamiento' : 'Ver alojamientos';

  const maxGuests = isSingleUnit ? singleUnit?.capacidad_maxima : null;
  const roomCount = isSingleUnit ? singleUnit?.num_habitaciones : null;

  const metaTitle = isSingleUnit && singleUnit?.nombre
    ? `${singleUnit.nombre} | Cantabria | Reserva directa`
    : 'Alojamientos rurales en Cantabria | Reserva directa';

  const metaDescription = isSingleUnit
    ? singleUnit?.descripcion_corta ||
      'Reserva tu alojamiento rural en Cantabria con mejor precio directo, entorno natural y experiencia premium.'
    : 'Descubre nuestros alojamientos rurales en Cantabria. Reserva directa, mejor precio y escapadas para familias y grupos.';

  return (
    <div className="relative">
      <MetaTags
        title={metaTitle}
        description={metaDescription}
        schema={defaultSchema}
      />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] overflow-hidden bg-stone-950">
        {/* Fondo hero */}
        {loadingUnits ? (
          <div className="absolute inset-0">
            <img
              src={HERO_FALLBACK_IMAGE}
              alt="Alojamiento rural en Cantabria"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/45" />
          </div>
        ) : (
          <>
            {isSingleUnit ? (
              <div className="absolute inset-0">
                <img
                  src={singleUnit?.heroImage || HERO_FALLBACK_IMAGE}
                  alt={singleUnit?.nombre || 'Alojamiento rural en Cantabria'}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/45" />
              </div>
            ) : (
              <>
                {heroUnits.map((unit, index) => (
                  <div
                    key={unit.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ${
                      index === currentSlide ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <img
                      src={unit.heroImage}
                      alt={unit.nombre}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50" />
                  </div>
                ))}

                {/* Controles slider */}
                <button
                  type="button"
                  onClick={goToPrevSlide}
                  className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white backdrop-blur-sm transition hover:bg-white/25"
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft size={22} />
                </button>

                <button
                  type="button"
                  onClick={goToNextSlide}
                  className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white backdrop-blur-sm transition hover:bg-white/25"
                  aria-label="Imagen siguiente"
                >
                  <ChevronRight size={22} />
                </button>

                {/* Indicadores */}
                <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-3">
                  {heroUnits.map((unit, index) => (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => setCurrentSlide(index)}
                      className={`h-2.5 rounded-full transition-all ${
                        index === currentSlide ? 'w-8 bg-white' : 'w-2.5 bg-white/50'
                      }`}
                      aria-label={`Ir a la imagen ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Contenido hero */}
        <div className="relative z-10 mx-auto flex min-h-[90vh] max-w-7xl items-center px-6 py-16 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 text-sm font-bold uppercase tracking-[0.28em] text-emerald-300"
            >
              {isSingleUnit ? 'Alojamiento rural · Cantabria' : 'Alojamientos rurales · Cantabria'}
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl font-serif font-bold leading-tight text-white sm:text-5xl lg:text-7xl"
            >
              {heroTitle}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 text-xl font-serif italic text-emerald-200 sm:text-2xl"
            >
              {heroSubtitle}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg"
            >
              {heroDescription}
            </motion.p>

            {isSingleUnit && (maxGuests || roomCount) ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mt-6 flex flex-wrap gap-3"
              >
                {maxGuests ? (
                  <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                    Hasta {maxGuests} huéspedes
                  </span>
                ) : null}

                {roomCount ? (
                  <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                    {roomCount} habitaciones
                  </span>
                ) : null}
              </motion.div>
            ) : null}

            {!isSingleUnit && currentHero ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mt-6"
              >
                <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                  Ahora mostrando: {currentHero.nombre}
                </span>
              </motion.div>
            ) : null}

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-10 flex flex-col gap-4 sm:flex-row"
            >
              <Link
                to={heroPrimaryLink}
                className="rounded-full bg-emerald-600 px-8 py-4 text-center text-base font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-emerald-700 active:scale-95"
              >
                {heroPrimaryText}
              </Link>

              <Link
                to={heroSecondaryLink}
                className="rounded-full border-2 border-white/35 px-8 py-4 text-center text-base font-bold text-white transition-all hover:border-white hover:bg-white/10"
              >
                {heroSecondaryText}
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid items-center gap-16 md:grid-cols-2">
          <div className="space-y-8">
            <h2 className="text-4xl font-serif font-bold leading-tight text-stone-800">
              {isSingleUnit
                ? 'Una experiencia rural premium en Cantabria'
                : 'Alojamientos rurales pensados para disfrutar Cantabria'}
            </h2>

            <p className="text-lg leading-relaxed text-stone-600">
              {isSingleUnit ? (
                <>
                  {singleUnit?.nombre || 'Nuestro alojamiento'} no es solo un lugar donde dormir; es un espacio
                  preparado para ofrecer comodidad, descanso y una experiencia auténtica en un entorno natural.
                </>
              ) : (
                <>
                  Descubre una selección de alojamientos rurales con encanto para escapadas, familias y grupos.
                  Reserva directamente desde nuestra web y encuentra el espacio que mejor encaja contigo.
                </>
              )}
            </p>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                  <Home size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-stone-800">
                    {isSingleUnit ? 'Alojamiento exclusivo' : 'Variedad de alojamientos'}
                  </h3>
                  <p className="text-sm text-stone-500">
                    {isSingleUnit
                      ? 'Privacidad total y una estancia diseñada para disfrutar sin compartir espacios.'
                      : 'Diferentes opciones para parejas, familias, grupos y escapadas a medida.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-stone-800">
                    {isSingleUnit && maxGuests ? `Hasta ${maxGuests} huéspedes` : 'Ideal para grupos y familias'}
                  </h3>
                  <p className="text-sm text-stone-500">
                    Espacios cómodos para disfrutar de una estancia relajada con la mejor experiencia de reserva directa.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                  <Trees size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-stone-800">Entorno Natural</h3>
                  <p className="text-sm text-stone-500">
                    Naturaleza, tranquilidad y el encanto de Cantabria a tu alcance.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-stone-800">Reserva Directa</h3>
                  <p className="text-sm text-stone-500">
                    Mejor control, atención directa y condiciones claras sin depender de terceros.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Link
                to={isSingleUnit ? heroPrimaryLink : '/propiedades'}
                className="inline-flex items-center gap-2 font-bold text-emerald-700 transition-all hover:gap-3"
              >
                {isSingleUnit ? 'Reservar ahora mi estancia' : 'Descubrir nuestros alojamientos'}{' '}
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 relative">
            <div className="absolute -z-10 left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-100/50 blur-3xl" />

            {(isSingleUnit
              ? (singleUnit?.fotos?.slice(0, 4) ?? [])
              : heroUnits.flatMap((u) => (u.fotos ?? []).slice(0, 1)).slice(0, 4)
            ).map((image, index) => (
              <img
                key={`${image}-${index}`}
                src={image}
                alt={`Imagen ${index + 1}`}
                className={`rounded-2xl shadow-2xl transform transition-transform duration-500 hover:-translate-y-2 ${
                  index % 2 === 1 ? 'mt-12' : ''
                }`}
              />
            ))}

            {(isSingleUnit
              ? (singleUnit?.fotos?.slice(0, 4) ?? []).length === 0
              : heroUnits.flatMap((u) => (u.fotos ?? []).slice(0, 1)).slice(0, 4).length === 0
            ) ? (
              <>
                <img
                  src="/images/porche1.jpg"
                  alt="Imagen destacada 1"
                  className="rounded-2xl shadow-2xl transform transition-transform duration-500 hover:-translate-y-2"
                />
                <img
                  src="/images/pueblo1.jpg"
                  alt="Imagen destacada 2"
                  className="mt-12 rounded-2xl shadow-2xl transform transition-transform duration-500 hover:-translate-y-2"
                />
                <img
                  src="/images/porche2.jpg"
                  alt="Imagen destacada 3"
                  className="rounded-2xl shadow-2xl transform transition-transform duration-500 hover:-translate-y-2"
                />
                <img
                  src="/images/pueblo2.jpg"
                  alt="Imagen destacada 4"
                  className="mt-12 rounded-2xl shadow-2xl transform transition-transform duration-500 hover:-translate-y-2"
                />
              </>
            ) : null}
          </div>
        </div>
      </section>

      {/* SEO Content Block */}
      <section className="bg-stone-50 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-8 text-3xl font-serif font-bold text-stone-800">
            {isSingleUnit
              ? 'Descubre el turismo rural en Cantabria'
              : 'Descubre nuestros alojamientos rurales en Cantabria'}
          </h2>

          <div className="prose prose-stone mx-auto space-y-6 text-lg leading-relaxed text-stone-600">
            <p>
              Cantabria destaca por su combinación de naturaleza, tranquilidad y pueblos con encanto.
              {isSingleUnit ? (
                <>
                  {' '}Si buscas una estancia auténtica, {singleUnit?.nombre || 'nuestro alojamiento'} te ofrece un
                  entorno ideal para desconectar y disfrutar con total comodidad.
                </>
              ) : (
                <>
                  {' '}Si buscas escapadas rurales para distintos tipos de viaje, aquí encontrarás opciones adaptadas
                  a familias, grupos y estancias especiales.
                </>
              )}
            </p>

            <p>
              Reserva directamente desde nuestra web y accede a una experiencia más clara, más cercana y mejor
              pensada para planificar tu estancia sin intermediarios innecesarios.
            </p>
          </div>

          <div className="mt-12">
            <Link
              to={heroPrimaryLink}
              className="rounded-full bg-stone-900 px-10 py-4 text-lg font-bold text-white shadow-xl transition-all hover:bg-stone-800"
            >
              Reservar ahora al mejor precio
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Stats / Trust */}
      <section className="border-y border-stone-200 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            <div>
              <p className="text-4xl font-serif font-bold text-emerald-700">
                {isSingleUnit ? (maxGuests ?? '—') : heroUnits.length}
              </p>
              <p className="mt-2 text-sm uppercase tracking-widest text-stone-500">
                {isSingleUnit ? 'Plazas Máximas' : 'Alojamientos'}
              </p>
            </div>

            <div>
              <p className="text-4xl font-serif font-bold text-emerald-700">
                {isSingleUnit ? (roomCount ?? '—') : '100%'}
              </p>
              <p className="mt-2 text-sm uppercase tracking-widest text-stone-500">
                {isSingleUnit ? 'Habitaciones' : 'Reserva Directa'}
              </p>
            </div>

            <div>
              <p className="text-4xl font-serif font-bold text-emerald-700">
                {isSingleUnit ? '100%' : 'Cantabria'}
              </p>
              <p className="mt-2 text-sm uppercase tracking-widest text-stone-500">
                {isSingleUnit ? 'Alojamiento Completo' : 'Entorno Natural'}
              </p>
            </div>

            <div>
              <p className="text-4xl font-serif font-bold text-emerald-700">Directa</p>
              <p className="mt-2 text-sm uppercase tracking-widest text-stone-500">Mejor experiencia</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="bg-stone-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-4 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">
              Opiniones verificadas
            </p>
            <h2 className="mt-2 text-3xl font-serif font-bold text-stone-800">
              Lo que dicen nuestros huéspedes
            </h2>
          </div>

          <div className="mt-4 mb-12 flex justify-center gap-8 text-sm text-stone-500">
            <span>⭐ <strong className="text-stone-700">8,4/10</strong> en Booking.com · 6 opiniones</span>
            <span>⭐ <strong className="text-stone-700">5/5</strong> en EscapadaRural · 10 opiniones</span>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                name: 'Merediz',
                source: 'Booking.com',
                score: '10',
                title: 'Excepcional',
                text: 'Nos gustó mucho la casa y el entorno. El porche es una gozada y como nos hizo muy buen tiempo lo disfrutamos mucho. La casa está muy bien equipada, muy cómoda y limpia. Totalmente recomendable.',
                context: '3 noches · En familia',
              },
              {
                name: 'Carmelo',
                source: 'Booking.com',
                score: '9,0',
                title: 'Superó las expectativas',
                text: 'Emplazamiento, distribución, limpieza, patio delantero amplio y ajardinado, barbacoa. Y el tiempo nos acompañó.',
                context: '4 noches · En familia',
              },
              {
                name: 'Alvaro S. Villanueva',
                source: 'EscapadaRural',
                score: '5/5',
                title: 'Merece la pena',
                text: 'La casa está muy bien equipada y cómoda para 11 personas. Pueblo pequeño pero con encanto, paseos con vistas increíbles. Dueños muy atentos. Nos recibió con unos sobaos de la zona buenísimos.',
                context: 'Con amigos',
              },
              {
                name: 'Sicadadia',
                source: 'EscapadaRural',
                score: '5/5',
                title: 'Perfecta',
                text: 'Fuimos con unos amigos y familia. Buena ubicación y la casa perfecta. Todo limpísimo y totalmente equipada. El trato con los dueños inmejorable.',
                context: 'Con familia y amigos',
              },
            ].map((r, i) => (
              <div
                key={i}
                className="flex flex-col gap-4 rounded-2xl border border-stone-100 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    {r.source}
                  </span>
                  <span className="text-lg font-serif font-bold text-emerald-700">⭐ {r.score}</span>
                </div>
                <p className="font-bold text-stone-800">"{r.title}"</p>
                <p className="flex-1 text-sm leading-relaxed text-stone-600">"{r.text}"</p>
                <div className="border-t border-stone-100 pt-2">
                  <p className="text-xs font-bold text-stone-700">{r.name}</p>
                  <p className="text-xs text-stone-400">{r.context}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
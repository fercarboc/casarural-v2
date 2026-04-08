import React from 'react';
import { HeroSection } from '../components/HeroSection';
import { SectionContainer } from '../components/SectionContainer';
import { CTASection } from '../components/CTASection';
import {
  Car,
  Plane,
  Train,
  Trees,
  Compass,
  Mountain,
  Map as MapIcon,
} from 'lucide-react';
import { MetaTags } from '../components/MetaTags';
import { usePublicProperty } from '../../shared/hooks/usePublicProperty';
import {
  getFullAddress,
  getMetaDescription,
  getSiteName,
  getSiteTagline,
} from '../../shared/utils/publicProperty.utils';

export const DondeEstamosPage: React.FC = () => {
  const { property } = usePublicProperty();

  const siteName = getSiteName(property);
  const siteTagline = getSiteTagline(property);
  const fullAddress = getFullAddress(property);

  const metaTitle = property?.meta_title?.trim()
    ? `Dónde estamos | ${property.meta_title}`
    : `Dónde estamos | ${siteName}`;

  const metaDescription =
    property?.meta_description?.trim() || getMetaDescription(property);

  const heroTitle = siteTagline
    ? `Dónde estamos · ${siteTagline}`
    : `Dónde estamos · ${siteName}`;

  const heroSubtitle = fullAddress
    ? `Descubre la ubicación de ${siteName} y cómo llegar cómodamente hasta ${fullAddress}.`
    : `Descubre la ubicación de ${siteName} y cómo llegar cómodamente hasta el alojamiento.`;

  const heroImage = '/images/pueblo2.jpg';

  const localityLine =
    [property?.localidad, property?.provincia, property?.pais]
      .filter(Boolean)
      .join(', ') || 'Cantabria, España';

  const lat = property?.latitud != null ? Number(property.latitud) : null;
  const lng = property?.longitud != null ? Number(property.longitud) : null;

  const hasValidCoordinates =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat! >= -90 &&
    lat! <= 90 &&
    lng! >= -180 &&
    lng! <= 180;

  const exactAddressQuery = [
    property?.direccion,
    property?.localidad,
    property?.provincia,
    property?.pais,
  ]
    .filter((v) => typeof v === 'string' && v.trim().length > 0)
    .join(', ');

  const townZoneQuery = [
    property?.localidad,
    property?.provincia,
    property?.pais,
  ]
    .filter((v) => typeof v === 'string' && v.trim().length > 0)
    .join(', ');

  let mapSrc = '';

  if (hasValidCoordinates) {
    mapSrc = `https://maps.google.com/maps?q=${lat},${lng}&z=17&output=embed`;
  } else if (exactAddressQuery) {
    mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(
      exactAddressQuery
    )}&z=16&output=embed`;
  } else {
    mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(
      townZoneQuery || 'Cantabria, España'
    )}&z=13&output=embed`;
  }

  const phone = property?.telefono?.trim() || '';
  const website = property?.web?.trim() || '';

  return (
    <div className="bg-white">
      <MetaTags title={metaTitle} description={metaDescription} />

      <HeroSection
        title={heroTitle}
        subtitle={heroSubtitle}
        image={heroImage}
      />

      <SectionContainer>
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div className="space-y-8">
            <h2 className="text-4xl font-serif font-bold text-stone-800">
              Un entorno natural privilegiado
            </h2>

            <div className="prose prose-stone space-y-4 text-lg leading-relaxed text-stone-600">
              <p>
                <strong>{siteName}</strong> se encuentra en{' '}
                <strong>{localityLine}</strong>, en un entorno ideal para disfrutar
                de naturaleza, tranquilidad y escapadas con un ritmo más pausado.
              </p>

              <p>
                La ubicación permite combinar descanso y movilidad. Es una buena base
                para conocer el entorno rural, acercarte a pueblos con encanto y
                planificar rutas por la zona con comodidad.
              </p>

              <p>
                Una vez confirmada la reserva, podrás llegar fácilmente usando el mapa,
                con ubicación precisa o referencia de la zona.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="flex items-center gap-3 text-stone-700">
                <Mountain className="text-emerald-600" />
                <span>Entorno natural</span>
              </div>
              <div className="flex items-center gap-3 text-stone-700">
                <Trees className="text-emerald-600" />
                <span>Paisaje rural</span>
              </div>
              <div className="flex items-center gap-3 text-stone-700">
                <Compass className="text-emerald-600" />
                <span>Escapadas y rutas</span>
              </div>
              <div className="flex items-center gap-3 text-stone-700">
                <MapIcon className="text-emerald-600" />
                <span>Ubicación accesible</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-square overflow-hidden rounded-3xl border-8 border-white shadow-2xl bg-stone-100">
              <iframe
                title={`Ubicación de ${siteName}`}
                src={mapSrc}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="absolute -bottom-6 -left-6 max-w-xs rounded-2xl border border-stone-100 bg-white p-6 shadow-xl">
              <p className="text-sm font-medium italic text-stone-800">
                {hasValidCoordinates
                  ? 'Ubicación exacta del alojamiento.'
                  : exactAddressQuery
                  ? 'Mapa basado en la dirección. Puede no ser exacto en zonas rurales.'
                  : 'Mapa basado en la zona del pueblo como referencia.'}
              </p>
            </div>
          </div>
        </div>
      </SectionContainer>

      <SectionContainer>
        <h2 className="mb-12 text-center text-3xl font-serif font-bold text-stone-800">
          Cómo llegar
        </h2>

        <div className="grid gap-8 md:grid-cols-3">
          <Card icon={<Car size={24} />} title="En coche">
            La mejor opción para moverte con libertad por la zona rural.
          </Card>

          <Card icon={<Plane size={24} />} title="En avión">
            Aeropuerto cercano + coche de alquiler recomendado.
          </Card>

          <Card icon={<Train size={24} />} title="En tren">
            Combinar con coche o transporte local para el último tramo.
          </Card>
        </div>

        <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center">
          <p className="font-medium text-emerald-800">
            📍{' '}
            <strong>
              {hasValidCoordinates
                ? `${lat}, ${lng}`
                : exactAddressQuery || townZoneQuery || 'Cantabria, España'}
            </strong>
          </p>

          {phone && (
            <p className="mt-2 text-sm text-emerald-700">
              Contacto: <strong>{phone}</strong>
            </p>
          )}

          {!phone && website && (
            <p className="mt-2 text-sm text-emerald-700">
              Más info: <strong>{website}</strong>
            </p>
          )}
        </div>
      </SectionContainer>

      <SectionContainer bg="stone">
        <CTASection
          title={`Ven a descubrir ${siteName}`}
          subtitle="Consulta disponibilidad y planifica tu estancia directamente desde nuestra web."
          buttonText="Ver disponibilidad"
          to="/reservar"
        />
      </SectionContainer>
    </div>
  );
};

const Card = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-stone-100 bg-stone-50 p-8">
    <div className="mb-6 w-fit rounded-full bg-emerald-50 p-3 text-emerald-700">
      {icon}
    </div>
    <h3 className="mb-4 text-xl font-bold text-stone-800">{title}</h3>
    <p className="text-sm text-stone-600">{children}</p>
  </div>
);
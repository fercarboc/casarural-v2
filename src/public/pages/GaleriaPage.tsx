import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeroSection } from '../components/HeroSection';
import { SectionContainer } from '../components/SectionContainer';
import { CTASection } from '../components/CTASection';
import { MetaTags } from '../components/MetaTags';
import { usePublicProperty } from '../../shared/hooks/usePublicProperty';
import {
  getMetaDescription,
  getSiteName,
} from '../../shared/utils/publicProperty.utils';
import { fetchPublicGalleryUnits } from '../services/publicGallery.service';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

const PROPERTY_SLUG =
  (import.meta as any).env?.VITE_PROPERTY_SLUG || 'la-rasilla';

interface GalleryItem {
  id: string;
  src: string;
  alt: string;
  unitId: string;
  unitName: string;
  unitSlug: string;
  imageOrder: number;
}

interface UnitWithGallery {
  id: string;
  nombre: string;
  slug: string;
  descripcion_corta: string | null;
  activa: boolean;
  orden: number | null;
  gallery: GalleryItem[];
  portada?: GalleryItem | null;
}

const HERO_FALLBACK = '/images/casa2.jpg';

type TabValue = 'all' | string;

export const GaleriaPage: React.FC = () => {
  const [unitsWithPhotos, setUnitsWithPhotos] = useState<UnitWithGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<TabValue>('all');

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const { property } = usePublicProperty();
  const siteName = getSiteName(property);

  useEffect(() => {
    const loadGalleryData = async () => {
      try {
        const result = await fetchPublicGalleryUnits({ slug: PROPERTY_SLUG });

        const mapped: UnitWithGallery[] = (result.units ?? []).map((unit) => {
          const gallery: GalleryItem[] = unit.fotos.map((foto, index) => ({
            id: foto.id,
            src: foto.public_url,
            alt: foto.alt_text || `${unit.nombre} · imagen ${index + 1}`,
            unitId: unit.id,
            unitName: unit.nombre,
            unitSlug: unit.slug,
            imageOrder: foto.orden ?? index,
          }));

          const portada = gallery.find((g) =>
            unit.fotos[gallery.indexOf(g)]?.es_portada,
          ) ?? gallery[0] ?? null;

          return {
            id: unit.id,
            nombre: unit.nombre,
            slug: unit.slug,
            descripcion_corta: unit.descripcion_corta,
            activa: unit.activa,
            orden: unit.orden,
            gallery,
            portada,
          };
        });

        setUnitsWithPhotos(mapped);
      } catch (err) {
        console.error('Error loading gallery data:', err);
        setUnitsWithPhotos([]);
      } finally {
        setLoading(false);
      }
    };

    loadGalleryData();
  }, []);

  const isSingleUnit = unitsWithPhotos.length <= 1;
  const singleUnit = unitsWithPhotos[0] ?? null;

  const allGalleryItems = useMemo(() => {
    return unitsWithPhotos.flatMap((unit) => unit.gallery);
  }, [unitsWithPhotos]);

  const selectedUnit = useMemo(() => {
    if (selectedTab === 'all') return null;
    return unitsWithPhotos.find((u) => u.id === selectedTab) ?? null;
  }, [selectedTab, unitsWithPhotos]);

  const filteredGallery = useMemo(() => {
    if (selectedTab === 'all') return allGalleryItems;
    return allGalleryItems.filter((item) => item.unitId === selectedTab);
  }, [allGalleryItems, selectedTab]);

  const heroImage = useMemo(() => {
    if (isSingleUnit && singleUnit) {
      return singleUnit.portada?.src || HERO_FALLBACK;
    }
    if (selectedUnit) return selectedUnit.portada?.src || HERO_FALLBACK;
    return unitsWithPhotos[0]?.portada?.src || HERO_FALLBACK;
  }, [isSingleUnit, singleUnit, selectedUnit, unitsWithPhotos]);

  const heroTitle = useMemo(() => {
    if (isSingleUnit && singleUnit) return `Galería de ${singleUnit.nombre}`;
    if (selectedUnit) return `Galería de ${selectedUnit.nombre}`;
    return 'Galería de alojamientos';
  }, [isSingleUnit, singleUnit, selectedUnit]);

  const heroSubtitle = useMemo(() => {
    if (isSingleUnit && singleUnit) {
      return (
        singleUnit.descripcion_corta ||
        `Descubre en imágenes cada rincón de ${singleUnit.nombre}.`
      );
    }
    if (selectedUnit) {
      return (
        selectedUnit.descripcion_corta ||
        `Explora las imágenes de ${selectedUnit.nombre}.`
      );
    }
    return 'Descubre en imágenes cada alojamiento y explora sus espacios antes de reservar.';
  }, [isSingleUnit, singleUnit, selectedUnit]);

  const metaTitle = useMemo(() => {
    if (isSingleUnit && singleUnit) return `Galería | ${singleUnit.nombre}`;
    if (selectedUnit) return `Galería | ${selectedUnit.nombre} | ${siteName}`;
    return `Galería | ${siteName}`;
  }, [isSingleUnit, singleUnit, selectedUnit, siteName]);

  const metaDescription = useMemo(() => {
    if (isSingleUnit && singleUnit) {
      return singleUnit.descripcion_corta || getMetaDescription(property);
    }
    if (selectedUnit) {
      return selectedUnit.descripcion_corta || getMetaDescription(property);
    }
    return getMetaDescription(property);
  }, [isSingleUnit, singleUnit, selectedUnit, property]);

  const currentLightboxImage = filteredGallery[lightboxIndex] ?? null;

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setZoom(1);
    setTouchStartX(null);
    setTouchEndX(null);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setZoom(1);
    setTouchStartX(null);
    setTouchEndX(null);
  };

  const goPrev = () => {
    if (!filteredGallery.length) return;
    setLightboxIndex((prev) => (prev === 0 ? filteredGallery.length - 1 : prev - 1));
    setZoom(1);
  };

  const goNext = () => {
    if (!filteredGallery.length) return;
    setLightboxIndex((prev) => (prev === filteredGallery.length - 1 ? 0 : prev + 1));
    setZoom(1);
  };

  const zoomIn = () => setZoom((prev) => Math.min(prev + 0.5, 3));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 0.5, 1));
  const resetZoom = () => setZoom(1);

  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft') goPrev();
      if (event.key === 'ArrowRight') goNext();
      if (event.key === '+' || event.key === '=') zoomIn();
      if (event.key === '-') zoomOut();
      if (event.key === '0') resetZoom();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [lightboxOpen, filteredGallery.length]);

  useEffect(() => {
    if (!lightboxOpen) return;

    if (lightboxIndex >= filteredGallery.length && filteredGallery.length > 0) {
      setLightboxIndex(0);
      setZoom(1);
    }

    if (filteredGallery.length === 0) closeLightbox();
  }, [filteredGallery, lightboxIndex, lightboxOpen]);

  useEffect(() => {
    if (lightboxOpen) {
      setLightboxIndex(0);
      setZoom(1);
    }
  }, [selectedTab]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;

    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) goNext();
    else if (distance < -minSwipeDistance) goPrev();

    setTouchStartX(null);
    setTouchEndX(null);
  };

  if (loading) {
    return (
      <div className="bg-white">
        <MetaTags title="Galería" description="Cargando galería..." />
        <HeroSection
          title="Galería de imágenes"
          subtitle="Cargando imágenes del alojamiento..."
          image={HERO_FALLBACK}
        />
        <SectionContainer>
          <div className="flex min-h-[240px] items-center justify-center">
            <p className="text-stone-500">Cargando galería...</p>
          </div>
        </SectionContainer>
      </div>
    );
  }

  if (!unitsWithPhotos.length) {
    return (
      <div className="bg-white">
        <MetaTags title="Galería" description="Galería de imágenes no disponible." />
        <HeroSection
          title="Galería de imágenes"
          subtitle="Próximamente mostraremos aquí las imágenes de los alojamientos."
          image={HERO_FALLBACK}
        />
        <SectionContainer>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-serif font-bold text-stone-800">
              Galería no disponible
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-stone-600">
              Todavía no hay imágenes publicadas para los alojamientos activos.
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
          title={heroTitle}
          subtitle={heroSubtitle}
          image={heroImage}
        />

        <SectionContainer>
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="text-4xl font-serif font-bold text-stone-800">
              Un recorrido visual por el alojamiento
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-stone-600">
              Explora en imágenes el ambiente, los espacios y los detalles de {singleUnit.nombre}.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {singleUnit.gallery.map((image, index) => (
              <button
                key={`${image.unitId}-${image.src}-${index}`}
                type="button"
                onClick={() => openLightbox(index)}
                className="group relative aspect-[3/2] overflow-hidden rounded-2xl bg-stone-100 shadow-md transition-all hover:shadow-xl text-left"
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="flex w-full items-end justify-between gap-4">
                    <p className="text-sm font-medium text-white">{image.alt}</p>
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                      Ver grande
                    </span>
                  </div>
                </div>
              </button>
            ))}

            {singleUnit.gallery.length === 0 ? (
              <div className="col-span-full mt-4 text-center">
                <p className="text-stone-500">
                  Este alojamiento todavía no tiene imágenes publicadas.
                </p>
              </div>
            ) : null}
          </div>
        </SectionContainer>

        <SectionContainer bg="stone">
          <CTASection
            title="¿Te gusta lo que ves?"
            subtitle="Consulta disponibilidad y reserva directamente desde nuestra web."
            buttonText="Ver disponibilidad"
            to={`/reservar?unidad=${singleUnit.slug}`}
          />
        </SectionContainer>

        {lightboxOpen && currentLightboxImage ? (
          <GalleryLightbox
            image={currentLightboxImage}
            currentIndex={lightboxIndex}
            total={filteredGallery.length}
            zoom={zoom}
            onClose={closeLightbox}
            onPrev={goPrev}
            onNext={goNext}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onResetZoom={resetZoom}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="bg-white">
      <MetaTags title={metaTitle} description={metaDescription} />

      <HeroSection
        title={heroTitle}
        subtitle={heroSubtitle}
        image={heroImage}
      />

      <SectionContainer>
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="text-4xl font-serif font-bold text-stone-800">
            Imágenes de los alojamientos
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-stone-600">
            Filtra por alojamiento para ver solo sus fotos o revisa una vista general de todos.
          </p>
        </div>

        <div className="mb-10 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => setSelectedTab('all')}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              selectedTab === 'all'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'border border-stone-300 bg-white text-stone-700 hover:border-stone-500'
            }`}
          >
            Todos
          </button>

          {unitsWithPhotos.map((unit) => (
            <button
              key={unit.id}
              type="button"
              onClick={() => setSelectedTab(unit.id)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                selectedTab === unit.id
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'border border-stone-300 bg-white text-stone-700 hover:border-stone-500'
              }`}
            >
              {unit.nombre}
            </button>
          ))}
        </div>

        {selectedUnit ? (
          <div className="mb-8 text-center">
            <h3 className="text-2xl font-serif font-bold text-stone-800">
              {selectedUnit.nombre}
            </h3>
            <p className="mx-auto mt-2 max-w-3xl text-stone-600">
              {selectedUnit.descripcion_corta || 'Galería del alojamiento seleccionado.'}
            </p>
            <div className="mt-5">
              <Link
                to={`/reservar?unidad=${selectedUnit.slug}`}
                className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                Reservar {selectedUnit.nombre}
              </Link>
            </div>
          </div>
        ) : (
          <div className="mb-8 text-center">
            <p className="text-stone-600">
              Mostrando imágenes de todos los alojamientos activos.
            </p>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGallery.map((image, index) => (
            <button
              key={`${image.unitId}-${image.src}-${index}`}
              type="button"
              onClick={() => openLightbox(index)}
              className="group relative aspect-[3/2] overflow-hidden rounded-2xl bg-stone-100 shadow-md transition-all hover:shadow-xl text-left"
            >
              <img
                src={image.src}
                alt={image.alt}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className="flex w-full items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{image.unitName}</p>
                    <p className="text-xs text-white/80">{image.alt}</p>
                  </div>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                    Ver grande
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {filteredGallery.length === 0 ? (
          <div className="mt-10 text-center">
            <p className="text-stone-500">
              Este alojamiento todavía no tiene imágenes publicadas.
            </p>
          </div>
        ) : null}
      </SectionContainer>

      <SectionContainer bg="stone">
        <CTASection
          title="¿Te gusta lo que ves?"
          subtitle={
            selectedUnit
              ? `Consulta disponibilidad y reserva ${selectedUnit.nombre} directamente desde nuestra web.`
              : 'Reserva tu estancia y vive la experiencia en persona.'
          }
          buttonText="Ver disponibilidad"
          to={selectedUnit ? `/reservar?unidad=${selectedUnit.slug}` : '/reservar'}
        />
      </SectionContainer>

      {lightboxOpen && currentLightboxImage ? (
        <GalleryLightbox
          image={currentLightboxImage}
          currentIndex={lightboxIndex}
          total={filteredGallery.length}
          zoom={zoom}
          onClose={closeLightbox}
          onPrev={goPrev}
          onNext={goNext}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      ) : null}
    </div>
  );
};

function GalleryLightbox({
  image,
  currentIndex,
  total,
  zoom,
  onClose,
  onPrev,
  onNext,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: {
  image: GalleryItem;
  currentIndex: number;
  total: number;
  zoom: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchEnd: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-w-7xl flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 pb-4 text-white">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold uppercase tracking-widest text-white/70">
              {image.unitName}
            </p>
            <p className="truncate text-base font-medium text-white">
              {image.alt}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onZoomOut}
              className="rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
              aria-label="Alejar imagen"
            >
              <ZoomOut size={18} />
            </button>

            <button
              type="button"
              onClick={onZoomIn}
              className="rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
              aria-label="Acercar imagen"
            >
              <ZoomIn size={18} />
            </button>

            <button
              type="button"
              onClick={onResetZoom}
              className="rounded-full bg-white/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white/20"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
              aria-label="Cerrar galería"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden rounded-3xl bg-black/60">
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-4 text-white backdrop-blur-sm transition hover:bg-white/20"
            aria-label="Imagen anterior"
          >
            <ChevronLeft size={26} />
          </button>

          <button
            type="button"
            onClick={onNext}
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-4 text-white backdrop-blur-sm transition hover:bg-white/20"
            aria-label="Imagen siguiente"
          >
            <ChevronRight size={26} />
          </button>

          <div
            className="flex h-full w-full items-center justify-center overflow-auto"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <img
              src={image.src}
              alt={image.alt}
              className="max-h-full max-w-full object-contain transition-transform duration-300 ease-out"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              draggable={false}
            />
          </div>

          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-4 bg-gradient-to-t from-black/80 to-transparent px-6 py-5 text-white">
            <div>
              <p className="text-sm font-semibold">{image.unitName}</p>
              <p className="text-xs text-white/75">{image.alt}</p>
            </div>

            <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold tracking-wider text-white backdrop-blur-sm">
              {currentIndex + 1} / {total}
            </div>
          </div>
        </div>

        <div className="pt-4 text-center text-xs text-white/60">
          Desliza para cambiar · Usa + / − para zoom · ESC para cerrar
        </div>
      </div>
    </div>
  );
}

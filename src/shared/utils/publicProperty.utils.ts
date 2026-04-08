import type { PublicProperty } from '../types/publicProperty';

export function getSiteName(property: PublicProperty | null): string {
  return (
    property?.site_title?.trim() ||
    property?.nombre?.trim() ||
    'Alojamiento'
  );
}

export function getSiteTagline(property: PublicProperty | null): string {
  return property?.site_tagline?.trim() || '';
}

export function getMetaTitle(property: PublicProperty | null): string {
  return (
    property?.meta_title?.trim() ||
    getSiteName(property)
  );
}

export function getMetaDescription(property: PublicProperty | null): string {
  return (
    property?.meta_description?.trim() ||
    property?.descripcion?.trim() ||
    'Alojamiento rural con reserva directa.'
  );
}

export function getFooterText(property: PublicProperty | null): string {
  return (
    property?.footer_text?.trim() ||
    property?.descripcion?.trim() ||
    'Alojamiento rural con reserva directa.'
  );
}

export function getFullAddress(property: PublicProperty | null): string {
  const parts = [
    property?.direccion,
    property?.localidad,
    property?.provincia,
    property?.pais,
  ].filter(Boolean);

  return parts.join(', ');
}

export function getLogoAlt(property: PublicProperty | null): string {
  return (
    property?.logo_alt?.trim() ||
    getSiteName(property)
  );
}
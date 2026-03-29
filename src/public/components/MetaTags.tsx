import React, { useEffect } from 'react';

interface MetaTagsProps {
  title: string;
  description: string;
  canonical?: string;
  schema?: object;
}

export const MetaTags: React.FC<MetaTagsProps> = ({ title, description, canonical, schema }) => {
  useEffect(() => {
    document.title = title;
    
    // Update Meta Description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    // Update Canonical
    if (canonical) {
      let linkCanonical = document.querySelector('link[rel="canonical"]');
      if (!linkCanonical) {
        linkCanonical = document.createElement('link');
        linkCanonical.setAttribute('rel', 'canonical');
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute('href', canonical);
    }

    // Update JSON-LD Schema
    if (schema) {
      let scriptSchema = document.querySelector('script[type="application/ld+json"]');
      if (!scriptSchema) {
        scriptSchema = document.createElement('script');
        scriptSchema.setAttribute('type', 'application/ld+json');
        document.head.appendChild(scriptSchema);
      }
      scriptSchema.textContent = JSON.stringify(schema);
    }
  }, [title, description, canonical, schema]);

  return null;
};

// Default Schema for La Rasilla
export const defaultSchema = {
  "@context": "https://schema.org",
  "@type": "VacationRental",
  "name": "La Rasilla",
  "description": "Casa rural de alquiler íntegro en Valles Pasiegos, Cantabria. Capacidad para 11 personas.",
  "url": "https://larasilla.com",
  "telephone": "+34690288707",
  "address": {
    "@type": "PostalAddress",
    "addressRegion": "Cantabria",
    "addressLocality": "Valles Pasiegos",
    "addressCountry": "ES"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "43.2189",
    "longitude": "-3.8431"
  },
  "occupancy": {
    "@type": "QuantitativeValue",
    "maxValue": 11
  },
  "amenityFeature": [
    { "@type": "LocationFeatureSpecification", "name": "Desconexión digital", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Cocina equipada", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Jardín", "value": true }
  ]
};

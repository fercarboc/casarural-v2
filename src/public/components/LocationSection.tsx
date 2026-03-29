import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

export const LocationSection: React.FC = () => {
  return (
    <div className="grid gap-12 lg:grid-cols-2 items-center">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
          <MapPin size={14} /> Ubicación privilegiada
        </div>
        <h2 className="text-3xl font-serif font-bold text-stone-800 md:text-4xl">
          En el corazón de los Valles Pasiegos
        </h2>
        <p className="text-lg text-stone-600 leading-relaxed">
          La Rasilla se encuentra en un entorno natural incomparable en Cantabria. Rodeada de praderas verdes y montañas, 
          ofrece la paz necesaria para una desconexión total, estando a la vez cerca de los principales atractivos turísticos de la región.
        </p>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-stone-100 shadow-sm">
            <div className="rounded-full bg-stone-100 p-3 text-stone-600"><Navigation size={20} /></div>
            <div>
              <h4 className="font-bold text-stone-800">Cómo llegar</h4>
              <p className="text-sm text-stone-500">Acceso sencillo por carretera desde Santander (40 min) o Bilbao (1h 15 min).</p>
            </div>
          </div>
        </div>
        <a 
          href="https://maps.google.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-emerald-700 font-bold hover:underline"
        >
          Abrir en Google Maps
        </a>
      </div>
      <div className="relative h-[400px] overflow-hidden rounded-3xl shadow-2xl">
        {/* Placeholder for real map */}
        <div className="absolute inset-0 bg-stone-200 flex items-center justify-center">
          <img 
            src="https://picsum.photos/seed/map-placeholder/800/600" 
            alt="Mapa" 
            className="h-full w-full object-cover opacity-50 grayscale"
            referrerPolicy="no-referrer"
          />
          <div className="absolute z-10 rounded-2xl bg-white p-6 shadow-xl text-center">
            <MapPin size={32} className="mx-auto text-emerald-600 mb-2" />
            <p className="font-bold text-stone-800">La Rasilla</p>
            <p className="text-xs text-stone-500">Valles Pasiegos, Cantabria</p>
          </div>
        </div>
      </div>
    </div>
  );
};

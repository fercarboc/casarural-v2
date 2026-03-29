import React from 'react';
import { HeroSection } from '../components/HeroSection';
import { SectionContainer } from '../components/SectionContainer';
import { CTASection } from '../components/CTASection';
import { Car, Plane, Train, Trees, Compass, Mountain, Map as MapIcon } from 'lucide-react';
import { MetaTags } from '../components/MetaTags';

export const DondeEstamosPage: React.FC = () => {
  return (
    <div className="bg-white">
      <MetaTags 
        title="Dónde estamos | Valles Pasiegos Cantabria | La Rasilla"
        description="Descubre cómo llegar a La Rasilla en los Valles Pasiegos, Cantabria. Un entorno natural único para tu escapada rural en el norte de España."
      />

      <HeroSection 
        title="En el corazón de los Valles Pasiegos"
        subtitle="Un refugio de paz rodeado de praderas verdes y montañas, a un paso de los principales puntos de interés de Cantabria."
        image="/images/pueblo2.jpg"
      />

      <SectionContainer>
        <div className="grid gap-16 lg:grid-cols-2 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl font-serif font-bold text-stone-800">Un entorno natural privilegiado</h2>
            <div className="prose prose-stone text-lg text-stone-600 leading-relaxed space-y-4">
              <p>
                <strong>Casa Rural La Rasilla</strong> está en <strong>Castillo Pedroso (39699)</strong>, municipio de Corvera de Toranzo, en el <strong>Valle de Toranzo</strong> — uno de los auténticos Valles Pasiegos de Cantabria. Un entorno de pradera verde, montaña y silencio donde el tiempo parece detenerse.
              </p>
              <p>
                Nuestra situación es privilegiada: a <strong>10 minutos de Puente Viesgo</strong>, donde encontrarás las famosas <strong>Cuevas del Castillo</strong> con arte rupestre paleolítico Patrimonio de la Humanidad. A solo <strong>1 km tienes las Bodegas Seldaiz</strong>, perfectas para una visita y cata. Y a pocos minutos, el impresionante salto de agua de <strong>El Churrón de Borleña</strong>.
              </p>
              <p>
                La zona ofrece infinitas rutas de senderismo por el valle, bosques de roble y hayedo, y la tranquilidad de la Cantabria más auténtica. A pesar del entorno natural, estamos perfectamente comunicados: a 40 min de Santander y a 45 min de las playas de la costa cántabra.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="flex items-center gap-3 text-stone-700">
                <Mountain className="text-emerald-600" />
                <span>Vistas al Valle</span>
              </div>
              <div className="flex items-center gap-3 text-stone-700">
                <Trees className="text-emerald-600" />
                <span>Bosques Autóctonos</span>
              </div>
              <div className="flex items-center gap-3 text-stone-700">
                <Compass className="text-emerald-600" />
                <span>Rutas de senderismo en el Valle</span>
              </div>
              <div className="flex items-center gap-3 text-stone-700">
                <MapIcon className="text-emerald-600" />
                <span>10 min de Puente Viesgo</span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
              <iframe
                title="Ubicación Casa Rural La Rasilla"
                src="https://maps.google.com/maps?q=43.214925,-3.970798&z=16&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-stone-100 max-w-xs">
              <p className="text-sm font-medium text-stone-800 italic">"Un lugar donde el único ruido es el de los pájaros y el viento entre los árboles."</p>
            </div>
          </div>
        </div>
      </SectionContainer>

      <SectionContainer>
        <h2 className="text-3xl font-serif font-bold text-stone-800 text-center mb-12">Cómo llegar a La Rasilla</h2>
        <div className="grid gap-8 md:grid-cols-3">
          <div className="bg-stone-50 p-8 rounded-2xl border border-stone-100">
            <div className="rounded-full bg-emerald-50 p-3 text-emerald-700 w-fit mb-6"><Car size={24} /></div>
            <h3 className="text-xl font-bold text-stone-800 mb-4">En Coche</h3>
            <p className="text-stone-600 text-sm leading-relaxed">Acceso directo por la A-67 (autovía Cantabria). A <strong>40 min de Santander</strong> y <strong>1h 30min de Bilbao</strong>. Imprescindible para moverse por la zona.</p>
          </div>
          <div className="bg-stone-50 p-8 rounded-2xl border border-stone-100">
            <div className="rounded-full bg-emerald-50 p-3 text-emerald-700 w-fit mb-6"><Plane size={24} /></div>
            <h3 className="text-xl font-bold text-stone-800 mb-4">En Avión</h3>
            <p className="text-stone-600 text-sm leading-relaxed">Aeropuerto de Santander (SDR) a <strong>35 minutos</strong>. Conexiones con Madrid, Barcelona y otras ciudades. Recomendamos alquilar coche en el aeropuerto.</p>
          </div>
          <div className="bg-stone-50 p-8 rounded-2xl border border-stone-100">
            <div className="rounded-full bg-emerald-50 p-3 text-emerald-700 w-fit mb-6"><Train size={24} /></div>
            <h3 className="text-xl font-bold text-stone-800 mb-4">En Tren</h3>
            <p className="text-stone-600 text-sm leading-relaxed">Estación de Santander con conexiones AVE/Alvia desde Madrid (~4h). Desde la estación, alquila un coche para llegar cómodamente.</p>
          </div>
        </div>
        <div className="mt-8 p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
          <p className="text-emerald-800 font-medium">📍 <strong>Castillo Pedroso, 39699 — Corvera de Toranzo, Cantabria</strong></p>
          <p className="text-emerald-700 text-sm mt-1">La dirección exacta y acceso se facilita al confirmar la reserva.</p>
        </div>
      </SectionContainer>

      <SectionContainer bg="stone">
        <CTASection 
          title="Ven a descubrir los Valles Pasiegos"
          subtitle="Tu refugio en Cantabria te está esperando. Reserva ahora y vive la experiencia La Rasilla."
          buttonText="Ver disponibilidad y ubicación"
          to="/reservar"
        />
      </SectionContainer>
    </div>
  );
};

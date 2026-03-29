import React from 'react';
import { HeroSection } from '../components/HeroSection';
import { SectionContainer } from '../components/SectionContainer';
import { CTASection } from '../components/CTASection';
import { Coffee, Utensils, Tv, Trees, ShieldCheck, Info, Calendar, Users, Bath } from 'lucide-react';
import { MetaTags } from '../components/MetaTags';

export const ServiciosPage: React.FC = () => {
  return (
    <div className="bg-white">
      <MetaTags 
        title="Servicios | Casa rural en Cantabria con encanto | La Rasilla"
        description="Conoce todos los servicios de La Rasilla. Wifi, barbacoa, cocina equipada, jardín privado y mucho más en tu casa rural en Cantabria."
      />

      <HeroSection 
        title="Servicios pensados para tu comodidad"
        subtitle="En La Rasilla cuidamos cada detalle para que tu única preocupación sea disfrutar de los Valles Pasiegos."
        image="/images/BAHIASANTANDER.png"
      />

      <SectionContainer>
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-serif font-bold text-stone-800">Todo lo que necesitas, y un poco más</h2>
          <p className="mt-6 text-lg text-stone-600 leading-relaxed">
            Nuestra <strong>casa rural en Cantabria con encanto</strong> ofrece una amplia gama de servicios diseñados para grupos grandes. 
            Desde una conexión a internet estable hasta espacios exteriores privados, hemos pensado en todo para que te sientas como en casa.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: <Trees className="text-emerald-600" />,
              title: "Desconexión total",
              description: "Sin WiFi, sin ruido, sin prisas. El entorno natural de los Valles Pasiegos es la mejor terapia para desconectar de verdad."
            },
            {
              icon: <Bath className="text-emerald-600" />,
              title: "Casa totalmente equipada",
              description: "Útiles de cocina, ropa de cama, toallas y todo lo necesario incluido. Solo tienes que llegar y disfrutar."
            },
            {
              icon: <Utensils className="text-emerald-600" />,
              title: "Barbacoa y Exterior",
              description: "Zona de barbacoa equipada y mobiliario de jardín para disfrutar de comidas al aire libre en Cantabria."
            },
            {
              icon: <Coffee className="text-emerald-600" />,
              title: "Cocina Completa",
              description: "Horno, microondas, lavavajillas, cafetera, tostadora y todo el menaje necesario para 11 comensales."
            },
            {
              icon: <Tv className="text-emerald-600" />,
              title: "Zona de Entretenimiento",
              description: "Smart TV de gran formato y juegos de mesa para las tardes en familia o grupo."
            },
            {
              icon: <Trees className="text-emerald-600" />,
              title: "Jardín privado",
              description: "Jardín totalmente cerrado y exclusivo. Ideal si se viaja con niños pequeños: total seguridad para que jueguen con libertad."
            }
          ].map((service, index) => (
            <div key={index} className="p-8 bg-stone-50 rounded-2xl border border-stone-100 hover:shadow-md transition-shadow">
              <div className="mb-4">{service.icon}</div>
              <h3 className="text-xl font-bold text-stone-800 mb-2">{service.title}</h3>
              <p className="text-stone-600">{service.description}</p>
            </div>
          ))}
        </div>
      </SectionContainer>

      <SectionContainer bg="stone">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <img
            src="/images/porche2.jpg"
            alt="Porche exterior de La Rasilla, casa rural Valles Pasiegos"
            className="rounded-3xl shadow-xl"
          />
          <div className="space-y-6">
            <h2 className="text-3xl font-serif font-bold text-stone-800">Atención personalizada y directa</h2>
            <p className="text-lg text-stone-600">
              Como propietarios, nos encargamos personalmente de que todo esté perfecto a tu llegada. Ofrecemos una <strong>garantía de reserva directa</strong>: sin comisiones de plataformas externas y con una comunicación fluida desde el primer momento.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="text-emerald-600 mt-1 shrink-0" />
                <p className="text-stone-700"><strong>Limpieza profesional:</strong> Seguimos estrictos protocolos para garantizar la higiene en cada estancia.</p>
              </div>
              <div className="flex items-start gap-3">
                <Info className="text-emerald-600 mt-1 shrink-0" />
                <p className="text-stone-700"><strong>Información turística:</strong> Te asesoramos sobre las mejores rutas y restaurantes de la zona.</p>
              </div>
            </div>
          </div>
        </div>
      </SectionContainer>

      <SectionContainer>
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div className="space-y-8">
            <h2 className="text-3xl font-serif font-bold text-stone-800">Información útil para tu estancia</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="rounded-full bg-emerald-50 p-3 text-emerald-700"><Calendar size={20} /></div>
                <div>
                  <h4 className="font-bold text-stone-800">Estancia mínima</h4>
                  <p className="text-sm text-stone-500">Generalmente 2 noches, aunque puede variar en puentes y temporada alta.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="rounded-full bg-emerald-50 p-3 text-emerald-700"><Users size={20} /></div>
                <div>
                  <h4 className="font-bold text-stone-800">Capacidad máxima</h4>
                  <p className="text-sm text-stone-500">Hasta 11 personas (10 base + 1 supletoria). No se permiten visitas externas.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="rounded-full bg-emerald-50 p-3 text-emerald-700"><ShieldCheck size={20} /></div>
                <div>
                  <h4 className="font-bold text-stone-800">Normas básicas</h4>
                  <p className="text-sm text-stone-500">Respeto al entorno, no se permiten fiestas ruidosas y no se admiten mascotas (consultar).</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
            <img src="https://picsum.photos/seed/info/800/600" alt="Información útil casa rural Cantabria" className="rounded-3xl shadow-2xl" referrerPolicy="no-referrer" />
          </div>
        </div>
      </SectionContainer>

      <SectionContainer bg="stone">
        <CTASection 
          title="Disfruta de todos nuestros servicios"
          subtitle="Reserva tu estancia en La Rasilla y vive una experiencia inolvidable en el corazón de Cantabria."
          buttonText="Consultar disponibilidad"
          to="/reservar"
        />
      </SectionContainer>
    </div>
  );
};

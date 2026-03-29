import React from 'react';
import { HeroSection } from '../components/HeroSection';
import { SectionContainer } from '../components/SectionContainer';
import { FeatureGrid } from '../components/FeatureGrid';
import { CTASection } from '../components/CTASection';
import { Users, Home, Trees, Users2, Bed, Coffee, Utensils, Bath, CheckCircle2 } from 'lucide-react';
import { MetaTags } from '../components/MetaTags';

export const LaCasaPage: React.FC = () => {
  return (
    <div className="bg-white">
      <MetaTags 
        title="La Casa | Casa rural en Cantabria alquiler íntegro | La Rasilla"
        description="Descubre La Rasilla, tu casa rural en Cantabria de alquiler íntegro. 5 habitaciones, capacidad para 11 personas y finca privada en los Valles Pasiegos."
      />

      <HeroSection 
        title="Tu casa rural en Cantabria de alquiler íntegro"
        subtitle="Un espacio exclusivo diseñado para la convivencia, el descanso y el disfrute de la naturaleza en estado puro."
        image="/images/casa3.jpg"
      />

      <SectionContainer>
        <div className="grid gap-16 lg:grid-cols-2 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl font-serif font-bold text-stone-800">Un refugio con alma en los Valles Pasiegos</h2>
            <div className="prose prose-stone text-lg text-stone-600 leading-relaxed space-y-4">
              <p>
                La Rasilla es mucho más que un alojamiento; es una <strong>casa rural en Cantabria de alquiler íntegro</strong> que combina la robustez de la arquitectura tradicional pasiega con un interiorismo cálido y funcional. Nuestra misión es ofrecerte un lugar donde el tiempo se detiene, permitiéndote reconectar con los tuyos en un entorno de belleza inigualable.
              </p>
              <p>
                La casa ha sido rehabilitada respetando los materiales originales como la piedra y la madera, pero integrando todas las comodidades modernas. Con una <strong>capacidad para hasta 11 personas</strong>, disponemos de amplios salones, una cocina totalmente equipada y rincones pensados para la lectura o la charla tranquila en el salón.
              </p>
              <p>
                Al elegir nuestra <strong>casa rural para grupos en Cantabria</strong>, disfrutarás de un jardín privado y vallado con zona de barbacoa, ideal para familias que viajan con niños pequeños. Un espacio exterior exclusivo donde los pequeños pueden jugar con total seguridad mientras los adultos disfrutan de una barbacoa al aire libre. Es el destino perfecto para <strong>familias y grupos en Cantabria</strong> que buscan privacidad, confort y naturaleza.
              </p>
            </div>
            
            <ul className="space-y-3 pt-4">
              {[
                "Alquiler íntegro para máxima privacidad",
                "Capacidad flexible de 10 a 11 personas",
                "5 amplias habitaciones dobles",
                "Jardín privado con barbacoa, vallado y seguro",
                 "En el Centro del Pueblo, junto a la zona infantil",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-stone-700 font-medium">
                  <CheckCircle2 size={20} className="text-emerald-600" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img
              src="/images/porche.jpg"
              alt="Porche exterior La Rasilla Valles Pasiegos"
              className="rounded-2xl shadow-lg w-full aspect-[4/3] object-cover"
            />
            <img
              src="/images/porche2.jpg"
              alt="Jardín y porche casa rural Cantabria"
              className="rounded-2xl shadow-lg w-full aspect-[4/3] object-cover"
            />
            <img
              src="/images/habitacion1.jpg"
              alt="Habitación doble casa rural Cantabria"
              className="rounded-2xl shadow-lg w-full aspect-[4/3] object-cover"
            />
            <img
              src="/images/habitacion2.jpg"
              alt="Habitación doble Valles Pasiegos"
              className="rounded-2xl shadow-lg w-full aspect-[4/3] object-cover"
            />
            <img
              src="/images/habitacion3.jpg"
              alt="Habitación con vistas al valle"
              className="rounded-2xl shadow-lg w-full aspect-[4/3] object-cover"
            />
            <img
              src="/images/habitacion4.jpg"
              alt="Dormitorio casa rural 11 personas Cantabria"
              className="rounded-2xl shadow-lg w-full aspect-[4/3] object-cover"
            />
          </div>
        </div>

        {/* Row of 3 smaller photos */}
        <div className="grid grid-cols-3 gap-4 mt-12">
          <img
            src="/images/cocina.jpg"
            alt="Cocina equipada casa rural Cantabria"
            className="rounded-2xl shadow-md w-full h-48 object-cover"
          />
          <img
            src="/images/salon1.jpg"
            alt="Salón principal casa rural Valles Pasiegos"
            className="rounded-2xl shadow-md w-full h-48 object-cover"
          />
          <img
            src="/images/aseo1.jpg"
            alt="Baño completo casa rural Cantabria"
            className="rounded-2xl shadow-md w-full h-48 object-cover"
          />
        </div>
      </SectionContainer>

      <SectionContainer bg="stone">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-serif font-bold text-stone-800">Diseñada para grupos y familias</h2>
          <p className="mt-4 text-stone-500 max-w-2xl mx-auto">
            Cada rincón de La Rasilla ha sido pensado para facilitar la convivencia de grupos grandes sin renunciar a la intimidad personal.
          </p>
        </div>
        <FeatureGrid 
          features={[
            { icon: <Users size={24} />, title: "Hasta 11 personas", description: "5 habitaciones dobles y posibilidad de cama supletoria de alta calidad." },
            { icon: <Home size={24} />, title: "Alquiler íntegro", description: "Sin compartir espacios con extraños. La casa es solo vuestra." },
            { icon: <Trees size={24} />, title: "Jardín privado con barbacoa", description: "Jardín vallado exclusivo con zona de barbacoa. Seguro para niños." },
            { icon: <Users2 size={24} />, title: "Ideal para Grupos", description: "Mesa de comedor XL y sofás amplios para estar todos juntos." }
          ]}
        />
      </SectionContainer>

      <SectionContainer>
        <div className="rounded-3xl bg-stone-900 p-12 text-white shadow-2xl">
          <h2 className="text-3xl font-serif font-bold mb-12 text-center">Distribución y Equipamiento</h2>
          <div className="grid gap-12 md:grid-cols-2">
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="rounded-full bg-stone-800 p-3 text-emerald-400 shrink-0"><Bed size={24} /></div>
                <div>
                  <h4 className="text-xl font-bold">5 Dormitorios Dobles</h4>
                  <p className="mt-2 text-stone-400">Habitaciones exteriores con vistas al valle. Camas de alta gama y lencería de algodón premium para un descanso reparador.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="rounded-full bg-stone-800 p-3 text-emerald-400 shrink-0"><Bath size={24} /></div>
                <div>
                  <h4 className="text-xl font-bold">Baños Completos</h4>
                  <p className="mt-2 text-stone-400">Equipados con duchas de gran caudal, secadores de pelo y toallas mullidas. Todo listo para vuestra llegada.</p>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="rounded-full bg-stone-800 p-3 text-emerald-400 shrink-0"><Coffee size={24} /></div>
                <div>
                  <h4 className="text-xl font-bold">Salón Principal</h4>
                  <p className="mt-2 text-stone-400">El corazón de la casa. Un espacio diáfano con techos de madera y Smart TV donde compartir momentos inolvidables.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="rounded-full bg-stone-800 p-3 text-emerald-400 shrink-0"><Utensils size={24} /></div>
                <div>
                  <h4 className="text-xl font-bold">Cocina de Chef</h4>
                  <p className="mt-2 text-stone-400">Totalmente equipada con electrodomésticos de última generación, lavavajillas y menaje completo para grandes grupos.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionContainer>

      <SectionContainer bg="stone">
        <CTASection 
          title="¿Buscas una casa rural para 10 u 11 personas?"
          subtitle="La Rasilla es el lugar que estabas buscando. Reserva ahora tu estancia sin intermediarios y al mejor precio."
          buttonText="Ver disponibilidad y precios"
          to="/reservar"
        />
      </SectionContainer>
    </div>
  );
};


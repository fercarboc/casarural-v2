import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Users, Home, Trees, ShieldCheck, ArrowRight } from 'lucide-react';
import { MetaTags, defaultSchema } from '../components/MetaTags';

export const HomePage: React.FC = () => {
  return (
    <div className="relative">
      <MetaTags 
        title="Casa rural Valles Pasiegos | La Rasilla | Hasta 11 personas"
        description="Reserva tu casa rural en Valles Pasiegos (Cantabria) para grupos de hasta 11 personas. Alquiler íntegro, entorno natural y descanso premium. ¡Reserva ya!"
        schema={defaultSchema}
      />

      {/* Hero Section */}
      <section className="min-h-[90vh] grid md:grid-cols-2 bg-stone-50">
        {/* Foto izquierda */}
        <div className="relative overflow-hidden">
          <img
            src="/images/casa2.jpg"
            alt="Exterior de La Rasilla, casa rural en Valles Pasiegos Cantabria"
            className="h-full w-full object-cover"
          />
        </div>

        {/* Texto derecha */}
        <div className="flex flex-col justify-center px-10 py-16 lg:px-20">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-bold uppercase tracking-widest text-emerald-600 mb-4"
          >
            Casa Rural · Cantabria
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-serif font-bold text-stone-900 leading-tight lg:text-6xl"
          >
            Casa Rural<br />La Rasilla
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-2xl font-serif italic text-emerald-700"
          >
            Valles Pasiegos
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-lg text-stone-600 leading-relaxed max-w-md"
          >
            Alquiler íntegro para hasta 11 personas en el corazón de Cantabria. El refugio perfecto para grupos y familias que buscan exclusividad, naturaleza y silencio.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-10 flex flex-col sm:flex-row gap-4"
          >
            <Link to="/reservar" className="rounded-full bg-emerald-600 px-8 py-4 text-base font-bold text-white shadow-lg transition-all hover:bg-emerald-700 hover:scale-105 active:scale-95 text-center">
              Ver Disponibilidad
            </Link>
            <Link to="/la-casa" className="rounded-full border-2 border-stone-300 px-8 py-4 text-base font-bold text-stone-700 transition-all hover:border-stone-500 text-center">
              Explorar la casa
            </Link>
          </motion.div>
        </div>
      </section>
      
      {/* Benefits Section */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-16 md:grid-cols-2 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl font-serif font-bold text-stone-800 leading-tight">Una experiencia rural premium en Cantabria</h2>
            <p className="text-lg leading-relaxed text-stone-600">
              La Rasilla no es solo un alojamiento; es un hogar rehabilitado con mimo para ofrecer el máximo confort en un entorno virgen. 
              Ubicada estratégicamente en los <strong>Valles Pasiegos</strong>, nuestra casa rural de alquiler íntegro es el punto de partida ideal 
              para descubrir la magia del norte de España.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><Home size={24} /></div>
                <div>
                  <h3 className="font-bold text-stone-800">Alquiler Íntegro</h3>
                  <p className="text-sm text-stone-500">Privacidad total para tu grupo. La casa y el jardín son solo vuestros.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><Users size={24} /></div>
                <div>
                  <h3 className="font-bold text-stone-800">Hasta 11 Huéspedes</h3>
                  <p className="text-sm text-stone-500">Espacios amplios diseñados para la convivencia de grupos grandes.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><Trees size={24} /></div>
                <div>
                  <h3 className="font-bold text-stone-800">Entorno Natural</h3>
                  <p className="text-sm text-stone-500">Vistas panorámicas y aire puro en el corazón de la montaña.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><ShieldCheck size={24} /></div>
                <div>
                  <h3 className="font-bold text-stone-800">Garantía Directa</h3>
                  <p className="text-sm text-stone-500">Mejor precio garantizado reservando directamente en nuestra web.</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Link to="/reservar" className="inline-flex items-center gap-2 text-emerald-700 font-bold hover:gap-3 transition-all">
                Reservar ahora mi estancia <ArrowRight size={20} />
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 relative">
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-100/50 rounded-full blur-3xl" />
            <img
              src="/images/porche1.jpg"
              alt="Porche de La Rasilla, casa rural en Valles Pasiegos"
              className="rounded-2xl shadow-2xl transform hover:-translate-y-2 transition-transform duration-500"
            />
            <img
              src="/images/pueblo1.jpg"
              alt="Castillo Pedroso, Valle de Toranzo, Cantabria"
              className="mt-12 rounded-2xl shadow-2xl transform hover:-translate-y-2 transition-transform duration-500"
            />
            <img
              src="/images/porche2.jpg"
              alt="Porche y jardín de La Rasilla, casa rural Cantabria"
              className="rounded-2xl shadow-2xl transform hover:-translate-y-2 transition-transform duration-500"
            />
            <img
              src="/images/pueblo2.jpg"
              alt="Vistas de Castillo Pedroso, Valles Pasiegos"
              className="mt-12 rounded-2xl shadow-2xl transform hover:-translate-y-2 transition-transform duration-500"
            />
          </div>
        </div>
      </section>

      {/* SEO Content Block */}
      <section className="bg-stone-50 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-serif font-bold text-stone-800 mb-8">Descubre el Turismo Rural en los Valles Pasiegos</h2>
          <div className="prose prose-stone mx-auto text-stone-600 space-y-6 text-lg leading-relaxed">
            <p>
              Cantabria es un destino que enamora por su contraste entre mar y montaña, y los <strong>Valles Pasiegos</strong> representan la esencia más pura de esta tierra. Si buscas una <strong>casa rural en Cantabria de alquiler íntegro</strong>, La Rasilla te ofrece la oportunidad de sumergirte en un paisaje de praderas infinitas, cabañas tradicionales y una paz que solo se interrumpe por el sonido de la naturaleza.
            </p>
            <p>
              Nuestra ubicación privilegiada permite disfrutar de <strong>escapadas rurales en el norte de España</strong> inolvidables. Ya sea que viajes en familia o con un grupo de amigos, nuestra capacidad para <strong>10 u 11 personas</strong> asegura que todos tengan su espacio. El <strong>turismo rural en Cantabria</strong> ha evolucionado, y en La Rasilla combinamos la arquitectura tradicional con servicios modernos para garantizar una estancia cómoda y auténtica.
            </p>
            <p>
              Desde aquí, podrás explorar rutas de senderismo por el <strong>Valle de Toranzo</strong>, visitar las famosas <strong>Cuevas del Castillo</strong> en Puente Viesgo, descubrir las <strong>Bodegas Seldaiz</strong> a 1 km o sorprenderte con el salto de agua de <strong>El Churrón de Borleña</strong>. Elegir un <strong>alojamiento rural en los Valles Pasiegos</strong> es elegir desconexión, aire puro y recuerdos que durarán toda la vida. Reserva directamente con nosotros para obtener las mejores condiciones y atención personalizada.
            </p>
          </div>
          <div className="mt-12">
            <Link to="/reservar" className="rounded-full bg-stone-900 px-10 py-4 text-lg font-bold text-white shadow-xl transition-all hover:bg-stone-800">
              Reservar ahora al mejor precio
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Stats / Trust */}
      <section className="py-16 border-y border-stone-200">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-serif font-bold text-emerald-700">11</p>
              <p className="text-sm uppercase tracking-widest text-stone-500 mt-2">Plazas Máximas</p>
            </div>
            <div>
              <p className="text-4xl font-serif font-bold text-emerald-700">5</p>
              <p className="text-sm uppercase tracking-widest text-stone-500 mt-2">Habitaciones</p>
            </div>
            <div>
              <p className="text-4xl font-serif font-bold text-emerald-700">100%</p>
              <p className="text-sm uppercase tracking-widest text-stone-500 mt-2">Alquiler Íntegro</p>
            </div>
            <div>
              <p className="text-4xl font-serif font-bold text-emerald-700">8,4/10</p>
              <p className="text-sm uppercase tracking-widest text-stone-500 mt-2">Booking.com</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonios reales */}
      <section className="py-24 bg-stone-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-4">
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">Opiniones verificadas</p>
            <h2 className="mt-2 text-3xl font-serif font-bold text-stone-800">Lo que dicen nuestros huéspedes</h2>
          </div>
          <div className="flex justify-center gap-8 mt-4 mb-12 text-sm text-stone-500">
            <span>⭐ <strong className="text-stone-700">8,4/10</strong> en Booking.com · 6 opiniones</span>
            <span>⭐ <strong className="text-stone-700">5/5</strong> en EscapadaRural · 10 opiniones</span>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                name: "Merediz",
                source: "Booking.com",
                score: "10",
                title: "Excepcional",
                text: "Nos gustó mucho la casa y el entorno. El porche es una gozada y como nos hizo muy buen tiempo lo disfrutamos mucho. La casa está muy bien equipada, muy cómoda y limpia. Totalmente recomendable.",
                context: "3 noches · En familia"
              },
              {
                name: "Carmelo",
                source: "Booking.com",
                score: "9,0",
                title: "Superó las expectativas",
                text: "Emplazamiento, distribución, limpieza, patio delantero amplio y ajardinado, barbacoa. Y el tiempo nos acompañó.",
                context: "4 noches · En familia"
              },
              {
                name: "Alvaro S. Villanueva",
                source: "EscapadaRural",
                score: "5/5",
                title: "Merece la pena",
                text: "La casa está muy bien equipada y cómoda para 11 personas. Pueblo pequeño pero con encanto, paseos con vistas increíbles. Dueños muy atentos. Nos recibió con unos sobaos de la zona buenísimos.",
                context: "Con amigos"
              },
              {
                name: "Sicadadia",
                source: "EscapadaRural",
                score: "5/5",
                title: "Perfecta",
                text: "Fuimos con unos amigos y familia. Buena ubicación y la casa perfecta. Todo limpísimo y totalmente equipada. El trato con los dueños inmejorable.",
                context: "Con familia y amigos"
              },
            ].map((r, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-400">{r.source}</span>
                  <span className="text-lg font-serif font-bold text-emerald-700">⭐ {r.score}</span>
                </div>
                <p className="font-bold text-stone-800">"{r.title}"</p>
                <p className="text-sm text-stone-600 leading-relaxed flex-1">"{r.text}"</p>
                <div className="pt-2 border-t border-stone-100">
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


import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Trees, Zap, Users, Landmark, Waves, Sparkles,
  MapPin, Clock, Mountain,
} from 'lucide-react';
import { HeroSection } from '../components/HeroSection';
import { SectionContainer } from '../components/SectionContainer';
import { CTASection } from '../components/CTASection';
import { MetaTags } from '../components/MetaTags';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Categoria = 'todas' | 'naturaleza' | 'aventura' | 'familia' | 'cultura' | 'playas' | 'relax';

interface Actividad {
  titulo: string;
  descripcion: string;
  distancia: string;
  tiempo: string;          // "5 min", "25 min", "1 h 30 min"
  destacada?: boolean;     // badge "Imprescindible"
  categoria: Exclude<Categoria, 'todas'>;
  externo?: boolean;       // si hay enlace a proveedor externo
  imagen?: string;
}

// ─── Datos ────────────────────────────────────────────────────────────────────

const ACTIVIDADES: Actividad[] = [
  // NATURALEZA
  {
    categoria: 'naturaleza',
    titulo: 'Churrón de Borleña',
    descripcion: 'Una preciosa cascada escondida en el pueblo de Borleña, a solo 5 minutos de La Rasilla. Paseo sencillo entre prados pasiegos y bosque ribereño, perfecto para la tarde del primer día.',
    distancia: 'Borleña',
    tiempo: '5 min',
    destacada: true,
    imagen: '/images/Churron-de-Borlena.jpg',
  },
  {
    categoria: 'naturaleza',
    titulo: 'Ruta del Río Pas',
    descripcion: 'Senderismo a lo largo del río Pas, salida prácticamente desde la puerta. Caminos tranquilos, naturaleza pasiega auténtica y vistas a los montes que rodean el valle.',
    distancia: 'Salida desde La Rasilla',
    tiempo: '0 min',
    imagen: '/images/RIOPAS.jpg',
  },
  {
    categoria: 'naturaleza',
    titulo: 'Bosque de Secuoyas de Cabezón de la Sal',
    descripcion: 'El bosque de secuoyas más grande de España. Árboles centenarios de más de 40 metros de altura crean un paisaje casi irreal. Impresiona a todo el mundo, sin excepción.',
    distancia: 'Cabezón de la Sal',
    tiempo: '25 min',
    destacada: true,
    imagen: '/images/bosque-secuoyas.jpg',
  },
  {
    categoria: 'naturaleza',
    titulo: 'Cascada del Asón y Collados del Asón',
    descripcion: 'Parque Natural con una de las cascadas más espectaculares de Cantabria. La ruta circular permite ver el nacimiento del río Asón y los pastos de alta montaña.',
    distancia: 'Valle de Asón',
    tiempo: '45 min',
    imagen: '/images/Cascada-del-Ason.jpg',
  },
  {
    categoria: 'naturaleza',
    titulo: 'Picos de Europa',
    descripcion: 'El gran parque nacional del norte de España. Acceso desde Potes o Fuente Dé, con el teleférico más largo de España y rutas para todos los niveles.',
    distancia: 'Fuente Dé / Potes',
    tiempo: '1 h 30 min',
    imagen: '/images/picos-de-europa.jpg',
  },
  {
    categoria: 'naturaleza',
    titulo: 'Liébana y Potes',
    descripcion: 'Valle mágico rodeado de Picos de Europa. Queso de Liébana, orujo artesanal, el Monasterio de Santo Toribio y uno de los paisajes más dramáticos de Cantabria.',
    distancia: 'Potes',
    tiempo: '1 h 30 min',
    imagen: '/images/Potes-Santo-Toribio-liebana.jpg',
  },

  // AVENTURA
  {
    categoria: 'aventura',
    titulo: 'Alceda Aventura',
    descripcion: 'Parque de aventura con tirolinas, puentes colgantes y circuitos aéreos en pleno bosque. Tienen circuitos para adultos, familias y niños desde 4 años. A 5 minutos de casa.',
    distancia: 'Alceda',
    tiempo: '5 min',
    destacada: true,
    imagen: '/images/AlcedaAventura.jpg',
  },
  {
    categoria: 'aventura',
    titulo: 'Barranquismo',
    descripcion: 'Cantabria tiene algunos de los mejores barrancos del norte de España. Varios operadores locales ofrecen descensos de barranco para grupos, con todos los niveles.',
    distancia: 'Zona Cantabria',
    tiempo: '30-45 min',
    imagen: '/images/barranquismo.jpg',
  },
  {
    categoria: 'aventura',
    titulo: 'Rafting y kayak río Pas',
    descripcion: 'El río Pas ofrece tramos perfectos para rafting y kayak. Empresas locales en Puente Viesgo organizan descensos guiados para grupos, sin experiencia previa necesaria.',
    distancia: 'Puente Viesgo',
    tiempo: '15 min',
    imagen: '/images/KAYAK_RIO_PASjpg.jpg',
  },
  {
    categoria: 'aventura',
    titulo: 'Rutas BTT — Valles Pasiegos',
    descripcion: 'La red de caminos pasiegos es perfecta para la bici de montaña. Rutas circulares desde la casa, con diferentes dificultades. Alquiler de bicicletas disponible en la zona.',
    distancia: 'Salida desde La Rasilla',
    tiempo: '0 min',
    imagen: '/images/rutas_btt.jpg',
  },
  {
    categoria: 'aventura',
    titulo: 'Espeleología — Cuevas de Cantabria',
    descripcion: 'La región esconde una red de cuevas y cavidades kársticas únicas. Empresas especializadas ofrecen iniciación a la espeleología en grupos, con equipamiento incluido.',
    distancia: 'Zona Cantabria',
    tiempo: '30-60 min',
    imagen: '/images/cuevas_del_castillo.jpg',
  },

  // FAMILIA
  {
    categoria: 'familia',
    titulo: 'Parque de Cabárceno',
    descripcion: 'Uno de los mejores parques de naturaleza de Europa. Animales en semilibertad — elefantes, rinocerontes, osos polares, bisontes — en un entorno natural impresionante. Imprescindible.',
    distancia: 'Cabárceno',
    tiempo: '25 min',
    destacada: true,
    imagen: '/images/cabarceno.jpg',
  },
  {
    categoria: 'familia',
    titulo: 'Alceda Aventura (circuito familiar)',
    descripcion: 'El parque de aventura tiene circuitos especiales para niños a partir de 4 años. Una tarde perfecta para grupos con familias. A 5 minutos de La Rasilla.',
    distancia: 'Alceda',
    tiempo: '5 min',
    imagen: '/images/AlcedaAventura.jpg',
  },
  {
    categoria: 'familia',
    titulo: 'Granja de Alpacas — Valle del Pas',
    descripcion: 'Una experiencia única en los Valles Pasiegos: visitar una granja de alpacas y darles de comer. Los niños alucinan. Consultar disponibilidad directamente con la granja.',
    distancia: 'Zona Valles Pasiegos',
    tiempo: '15 min',
    imagen: '/images/alpacas.png',
  },
  {
    categoria: 'familia',
    titulo: 'Playa de Liencres y Dunas',
    descripcion: 'Parque Natural de las Dunas de Liencres, con una playa salvaje y dunas de arena blanca. Perfecta para un día de playa tranquila y senderismo costero con niños.',
    distancia: 'Liencres',
    tiempo: '35 min',
    imagen: '/images/Dunas-de-Liencres.jpg',
  },

  // CULTURA
  {
    categoria: 'cultura',
    titulo: 'El Capricho de Gaudí — Comillas',
    descripcion: 'La única obra de Gaudí en Cantabria. Una joya modernista en el corazón de Comillas, pueblo señorial con palacio, universidad pontificia y ambiente único en España.',
    distancia: 'Comillas',
    tiempo: '50 min',
    destacada: true,
    imagen: '/images/el-capricho.jpg',
  },
  {
    categoria: 'cultura',
    titulo: 'Cueva de El Castillo — Puente Viesgo',
    descripcion: 'Arte rupestre paleolítico declarado Patrimonio de la Humanidad. Las pinturas tienen más de 40.000 años. Visita guiada obligatoria, reserva con antelación.',
    distancia: 'Puente Viesgo',
    tiempo: '15 min',
    destacada: true,
    imagen: '/images/cuevas_del_castillo.jpg',
  },
  {
    categoria: 'cultura',
    titulo: 'Santander',
    descripcion: 'La capital de Cantabria. Palacio de la Magdalena, catedral, mercado del Este, playa del Sardinero y el animado centro histórico. Perfecto para un día de ciudad.',
    distancia: 'Santander',
    tiempo: '30 min',
    imagen: '/images/BAHIASANTANDER.png',
  },
  {
    categoria: 'cultura',
    titulo: 'Comillas — Villa Señorial',
    descripcion: 'Además de Gaudí, Comillas tiene el Palacio de Sobrellano, la Universidad Pontificia y calles con sabor indiano. Uno de los pueblos más bonitos de España.',
    distancia: 'Comillas',
    tiempo: '50 min',
    imagen: '/images/Comillas-vista-general.jpg',
  },
  {
    categoria: 'cultura',
    titulo: 'Potes y Monasterio de Liébana',
    descripcion: 'El Monasterio de Santo Toribio de Liébana custodia el Lignum Crucis más grande del mundo. El pueblo de Potes, medieval y con orujo artesanal, es una parada obligada.',
    distancia: 'Potes',
    tiempo: '1 h 30 min',
    imagen: '/images/Potes-Santo-Toribio-liebana.jpg',
  },

  // PLAYAS
  {
    categoria: 'playas',
    titulo: 'Playa del Sardinero — Santander',
    descripcion: 'La playa más famosa de Cantabria. Amplia, bien equipada y con el Palacio de la Magdalena de fondo. Perfecta para combinar playa y visita a la capital.',
    distancia: 'Santander',
    tiempo: '30 min',
    imagen: '/images/elsardinero.jpeg',
  },
  {
    categoria: 'playas',
    titulo: 'Playa de Langre',
    descripcion: 'Playa virgen en lo alto de los acantilados. Sin infraestructura, arena dorada y aguas limpias. Una de las mejores playas salvajes de Cantabria.',
    distancia: 'Liencres',
    tiempo: '40 min',
    destacada: true,
    imagen: '/images/playadelangre.jpg',
  },
  {
    categoria: 'playas',
    titulo: 'Playa de Oyambre',
    descripcion: 'Dentro del Parque Natural de Oyambre, una de las playas más largas y naturales del Cantábrico. Vista a los Picos de Europa con suerte en días claros.',
    distancia: 'San Vicente de la Barquera',
    tiempo: '50 min',
    imagen: '/images/playaoyambre.jpg',
  },
  {
    categoria: 'playas',
    titulo: 'Playas de Noja',
    descripcion: 'Varias playas en un mismo municipio, con aguas tranquilas y perfectas para familias con niños pequeños. La Ría de Joyel tiene la zona más calmada.',
    distancia: 'Noja',
    tiempo: '50 min',
    imagen: '/images/Playas_de_Noja.JPG',
  },
  {
    categoria: 'playas',
    titulo: 'Playa de Liencres y Dunas',
    descripcion: 'Parque Natural de las Dunas de Liencres. Playa salvaje con duna viva y pinar costero. El Puntal, a la entrada de la bahía de Santander, ofrece vistas espectaculares.',
    distancia: 'Liencres',
    tiempo: '35 min',
    imagen: '/images/Dunas-de-Liencres.jpg',
  },

  // RELAX
  {
    categoria: 'relax',
    titulo: 'Balneario de Alceda',
    descripcion: 'Un tesoro a 5 minutos de La Rasilla. Aguas termales con propiedades mineromedicinales, piscinas termales, spa y tratamientos. El lugar perfecto para recuperarse tras las rutas.',
    distancia: 'Alceda',
    tiempo: '5 min',
    destacada: true,
    imagen: '/images/balbeariodealceda.jpg',
  },
  {
    categoria: 'relax',
    titulo: 'Balneario de Puente Viesgo',
    descripcion: 'Gran complejo termal con hotel de lujo, spa, piscinas termales y amplia carta de tratamientos. Uno de los balnearios más completos del norte de España.',
    distancia: 'Puente Viesgo',
    tiempo: '15 min',
    destacada: true,
    imagen: '/images/balnearioPuenteViesgo.jpg',
  },
  {
    categoria: 'relax',
    titulo: 'Balneario de Liérganes',
    descripcion: 'El balneario de aguas sulfurosas más antiguo de Cantabria. Arquitectura indiana, pueblo precioso y aguas con propiedades respiratorias únicas.',
    distancia: 'Liérganes',
    tiempo: '25 min',
    imagen: '/images/balneariolierganes.jpg',
  },
  {
    categoria: 'relax',
    titulo: 'Senderismo contemplativo',
    descripcion: 'Los Valles Pasiegos ofrecen algo difícil de encontrar: silencio de verdad. Caminos entre caseríos pasiegos, vacas en libertad y el sonido del río. El relax definitivo.',
    distancia: 'Salida desde La Rasilla',
    tiempo: '0 min',
    imagen: '/images/senderismo_vallespaisegos.jpg',
  },
  {
    categoria: 'relax',
    titulo: 'Golf de Pedreña',
    descripcion: 'El club de golf más legendario de España, cuna de Seve Ballesteros. Hoyo a hoyo con vistas a la bahía de Santander y las montañas de Cantabria. Una jornada memorable para los aficionados al golf.',
    distancia: 'Pedreña, Santander',
    tiempo: '40 min',
    imagen: '/images/golfpedrena.jpg',
  },
];

// ─── Config categorías ────────────────────────────────────────────────────────

const CATEGORIAS: { key: Categoria; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'todas',      label: 'Todo',        icon: <Mountain size={16} />,  color: 'stone'   },
  { key: 'naturaleza', label: 'Naturaleza',  icon: <Trees size={16} />,     color: 'emerald' },
  { key: 'aventura',   label: 'Aventura',    icon: <Zap size={16} />,       color: 'orange'  },
  { key: 'familia',    label: 'Familias',    icon: <Users size={16} />,     color: 'blue'    },
  { key: 'cultura',    label: 'Cultura',     icon: <Landmark size={16} />,  color: 'violet'  },
  { key: 'playas',     label: 'Playas',      icon: <Waves size={16} />,     color: 'cyan'    },
  { key: 'relax',      label: 'Relax',       icon: <Sparkles size={16} />,  color: 'rose'    },
];

const COLOR_MAP: Record<string, { tab: string; badge: string; dot: string }> = {
  stone:   { tab: 'bg-stone-900 text-white',    badge: 'bg-stone-100 text-stone-700',    dot: 'bg-stone-400' },
  emerald: { tab: 'bg-emerald-700 text-white',  badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  orange:  { tab: 'bg-orange-600 text-white',   badge: 'bg-orange-50 text-orange-700',   dot: 'bg-orange-500' },
  blue:    { tab: 'bg-blue-600 text-white',     badge: 'bg-blue-50 text-blue-700',       dot: 'bg-blue-500' },
  violet:  { tab: 'bg-violet-700 text-white',   badge: 'bg-violet-50 text-violet-700',   dot: 'bg-violet-500' },
  cyan:    { tab: 'bg-cyan-600 text-white',     badge: 'bg-cyan-50 text-cyan-700',       dot: 'bg-cyan-500' },
  rose:    { tab: 'bg-rose-600 text-white',     badge: 'bg-rose-50 text-rose-700',       dot: 'bg-rose-500' },
};

function getCategoriaColor(cat: Categoria): string {
  return CATEGORIAS.find(c => c.key === cat)?.color ?? 'stone';
}

// ─── Componente tarjeta ───────────────────────────────────────────────────────

function ActividadCard({ actividad, index }: { actividad: Actividad; index: number }) {
  const color = getCategoriaColor(actividad.categoria);
  const colors = COLOR_MAP[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="group rounded-2xl border border-stone-100 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-lg"
    >
      {/* Imagen */}
      {actividad.imagen && (
        <div className="h-44 overflow-hidden bg-stone-100">
          <img
            src={actividad.imagen}
            alt={actividad.titulo}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}

      {/* Contenido */}
      <div className="p-5">
        {/* Cabecera */}
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="text-base font-serif font-bold text-stone-800 leading-snug">
            {actividad.titulo}
          </h3>
          {actividad.destacada && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
              ★ Destacado
            </span>
          )}
        </div>

        {/* Descripción */}
        <p className="text-sm text-stone-500 leading-relaxed mb-4">
          {actividad.descripcion}
        </p>

        {/* Footer */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 text-xs font-medium text-stone-400">
            <MapPin size={12} className="text-stone-300" />
            {actividad.distancia}
          </div>
          <div className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${colors.badge}`}>
            <Clock size={11} />
            {actividad.tiempo}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export const ActividadesPage: React.FC = () => {
  const [categoriaActiva, setCategoriaActiva] = useState<Categoria>('todas');

  const actividadesFiltradas = categoriaActiva === 'todas'
    ? ACTIVIDADES
    : ACTIVIDADES.filter(a => a.categoria === categoriaActiva);

  const catActual = CATEGORIAS.find(c => c.key === categoriaActiva)!;

  return (
    <div className="bg-white">
      <MetaTags
        title="Actividades y planes | Casa rural La Rasilla | Valles Pasiegos"
        description="Qué hacer cerca de La Rasilla: naturaleza, aventura, playas, cultura y balnearios a pocos minutos de tu casa rural en Cantabria."
      />

      <HeroSection
        title="¿Qué hacer desde La Rasilla?"
        subtitle="Cascadas, aventura, playa, cultura y los mejores balnearios de Cantabria. Todo a menos de una hora."
        image="/images/actividades.png"
        height="h-[55vh]"
      />

      <SectionContainer>

        {/* Intro */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <h2 className="text-4xl font-serif font-bold text-stone-800">
            Los Valles Pasiegos como punto de partida
          </h2>
          <p className="mt-6 text-lg text-stone-500 leading-relaxed">
            La Rasilla está en <strong className="text-stone-700">Castillo Pedroso - Corvera de Toranzo</strong>, en el corazón de los Valles Pasiegos.
            A 30 minutos de Santander, a 5 minutos de un balneario y rodeada de naturaleza sin tráfico, sin ruido, sin prisas.
            Esto es lo que tienes a tu alrededor.
          </p>
        </div>

        {/* Destacados — antes del filtro */}
        <div className="mb-14 grid gap-4 sm:grid-cols-3">
          {[
            { icon: <Clock size={20} className="text-emerald-600" />, titulo: '5 min', sub: 'Balneario de Alceda', color: 'emerald' },
            { icon: <Clock size={20} className="text-blue-600"    />, titulo: '25 min', sub: 'Parque de Cabárceno', color: 'blue' },
            { icon: <Clock size={20} className="text-violet-600"  />, titulo: '50 min', sub: 'El Capricho de Gaudí', color: 'violet' },
          ].map(item => (
            <div key={item.titulo} className="flex items-center gap-4 rounded-2xl border border-stone-100 bg-stone-50 px-5 py-4">
              <div className={`rounded-xl bg-${item.color}-50 p-2.5`}>{item.icon}</div>
              <div>
                <p className="text-xl font-bold text-stone-800">{item.titulo}</p>
                <p className="text-sm text-stone-500">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filtro de categorías */}
        <div className="mb-10 flex flex-wrap gap-2 justify-center">
          {CATEGORIAS.map(cat => {
            const isActive = cat.key === categoriaActiva;
            const colors = COLOR_MAP[cat.color];
            return (
              <button
                key={cat.key}
                onClick={() => setCategoriaActiva(cat.key)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? colors.tab + ' shadow-md'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat.icon}
                {cat.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-500'
                }`}>
                  {cat.key === 'todas' ? ACTIVIDADES.length : ACTIVIDADES.filter(a => a.categoria === cat.key).length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Título de sección activa */}
        {categoriaActiva !== 'todas' && (
          <motion.div
            key={categoriaActiva}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8 flex items-center gap-3"
          >
            <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold ${COLOR_MAP[catActual.color].badge}`}>
              {catActual.icon}
              {catActual.label}
            </div>
            <span className="text-stone-400">·</span>
            <span className="text-sm text-stone-400">{actividadesFiltradas.length} actividades</span>
          </motion.div>
        )}

        {/* Grid de actividades */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {actividadesFiltradas.map((actividad, i) => (
            <ActividadCard key={actividad.titulo} actividad={actividad} index={i} />
          ))}
        </div>

        {/* Nota balnearios */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 rounded-2xl border border-rose-100 bg-rose-50 p-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="rounded-2xl bg-rose-100 p-4 shrink-0">
              <Sparkles size={28} className="text-rose-600" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-stone-800 mb-1">
                Los mejores balnearios de Cantabria, a la puerta
              </h3>
              <p className="text-stone-600 text-sm leading-relaxed">
                Alceda (5 min), Puente Viesgo (15 min) y Liérganes (25 min) forman el triángulo termal de Cantabria.
                Ningún otro alojamiento de la zona te pone los tres tan cerca. Ideal para completar el descanso de tu grupo.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Nota distancias */}
        <p className="mt-6 text-center text-xs text-stone-400">
          * Tiempos de desplazamiento en coche desde La Rasilla (Castillo Pedroso, Corvera de Toranzo). Pueden variar según tráfico y condiciones.
        </p>

      </SectionContainer>

      <CTASection
        title="¿Listo para explorarlo?"
        subtitle="Reserva La Rasilla y ten todo esto a tu disposición. La casa es solo el punto de partida."
        buttonText="Comprobar disponibilidad"
        to="/reservar"
      />
    </div>
  );
};

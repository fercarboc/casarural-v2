import React from 'react';
import { motion } from 'motion/react';

interface HeroSectionProps {
  title: string;
  subtitle?: string;
  image: string;
  height?: string;
  overlay?: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ 
  title, 
  subtitle, 
  image, 
  height = "h-[60vh]",
  overlay = true 
}) => {
  return (
    <section className={`relative ${height} overflow-hidden`}>
      <img 
        src={image} 
        alt={title} 
        className="h-full w-full object-cover"
        referrerPolicy="no-referrer"
      />
      {overlay && <div className="absolute inset-0 bg-stone-900/40" />}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-serif font-bold md:text-6xl max-w-4xl"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 max-w-2xl text-lg font-light text-stone-100 md:text-xl"
          >
            {subtitle}
          </motion.p>
        )}
      </div>
    </section>
  );
};

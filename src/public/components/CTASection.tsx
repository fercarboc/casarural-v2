import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface CTASectionProps {
  title: string;
  subtitle: string;
  buttonText: string;
  to: string;
}

export const CTASection: React.FC<CTASectionProps> = ({ title, subtitle, buttonText, to }) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-emerald-900 px-8 py-16 text-center text-white shadow-2xl">
      <div className="absolute inset-0 opacity-10">
        <img 
          src="https://picsum.photos/seed/texture/1200/400" 
          alt="Texture" 
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="relative z-10 mx-auto max-w-2xl">
        <h2 className="text-3xl font-serif font-bold md:text-4xl">{title}</h2>
        <p className="mt-4 text-emerald-100/80">{subtitle}</p>
        <Link 
          to={to} 
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-emerald-900 transition-transform hover:scale-105 active:scale-95"
        >
          {buttonText}
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
};

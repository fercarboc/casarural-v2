import React from 'react';

interface ServiceCardProps {
  title: string;
  description: string;
  image: string;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ title, description, image }) => {
  return (
    <div className="group overflow-hidden rounded-2xl bg-white border border-stone-100 shadow-md transition-all hover:shadow-xl">
      <div className="h-48 overflow-hidden">
        <img 
          src={image} 
          alt={title} 
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="p-6">
        <h4 className="text-xl font-serif font-bold text-stone-800 mb-3">{title}</h4>
        <p className="text-sm text-stone-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

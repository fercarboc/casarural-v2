import React from 'react';

interface SectionContainerProps {
  children: React.ReactNode;
  className?: string;
  bg?: 'white' | 'stone' | 'emerald';
}

export const SectionContainer: React.FC<SectionContainerProps> = ({ 
  children, 
  className = "", 
  bg = 'white' 
}) => {
  const bgClasses = {
    white: 'bg-white',
    stone: 'bg-stone-50',
    emerald: 'bg-emerald-900 text-white'
  };

  return (
    <section className={`py-20 px-6 ${bgClasses[bg]} ${className}`}>
      <div className="mx-auto max-w-7xl">
        {children}
      </div>
    </section>
  );
};

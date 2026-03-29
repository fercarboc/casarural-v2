import React from 'react';

interface FeatureGridProps {
  features: {
    icon: React.ReactNode;
    title: string;
    description: string;
  }[];
  columns?: number;
}

export const FeatureGrid: React.FC<FeatureGridProps> = ({ features, columns = 4 }) => {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4'
  }[columns as 2 | 3 | 4];

  return (
    <div className={`grid gap-8 ${gridCols}`}>
      {features.map((feature, index) => (
        <div key={index} className="flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-stone-100 shadow-sm transition-transform hover:-translate-y-1">
          <div className="mb-4 rounded-full bg-emerald-50 p-4 text-emerald-700">
            {feature.icon}
          </div>
          <h4 className="text-lg font-bold text-stone-800 mb-2">{feature.title}</h4>
          <p className="text-sm text-stone-500 leading-relaxed">{feature.description}</p>
        </div>
      ))}
    </div>
  );
};

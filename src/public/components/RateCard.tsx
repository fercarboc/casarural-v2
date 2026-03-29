import React from 'react';
import { Check, ShieldCheck, XCircle } from 'lucide-react';
import { RateType } from '../../shared/types';

interface RateCardProps {
  type: RateType;
  price: number;
  isSelected: boolean;
  onSelect: () => void;
  description: string;
  features: string[];
  isRefundable: boolean;
}

export const RateCard: React.FC<RateCardProps> = ({
  type,
  price,
  isSelected,
  onSelect,
  description,
  features,
  isRefundable
}) => {
  return (
    <button
      onClick={onSelect}
      className={`relative flex w-full flex-col rounded-2xl border-2 p-6 text-left transition-all ${
        isSelected 
          ? 'border-emerald-600 bg-emerald-50 ring-4 ring-emerald-600/10' 
          : 'border-stone-200 bg-white hover:border-stone-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-bold text-stone-800">
          {type === 'NON_REFUNDABLE' ? 'Tarifa No Reembolsable' : 'Tarifa Flexible'}
        </h4>
        {isSelected && <div className="rounded-full bg-emerald-600 p-1 text-white"><Check size={14} /></div>}
      </div>
      
      <p className="mt-2 text-sm text-stone-500 leading-relaxed">{description}</p>
      
      <div className="mt-6">
        <span className="text-3xl font-serif font-bold text-stone-900">{price.toFixed(2)}€</span>
        <span className="ml-2 text-sm text-stone-400">Total estancia</span>
      </div>

      <ul className="mt-6 space-y-3">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-stone-600">
            {isRefundable ? <ShieldCheck size={14} className="text-emerald-600 mt-0.5" /> : <XCircle size={14} className="text-stone-400 mt-0.5" />}
            {f}
          </li>
        ))}
      </ul>

      {type === 'NON_REFUNDABLE' && (
        <div className="mt-4 rounded-lg bg-stone-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-stone-500">
          Ahorra un 10% reservando ahora
        </div>
      )}
    </button>
  );
};

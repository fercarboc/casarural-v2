import React from 'react';
import { PriceBreakdown } from '../../shared/types/booking';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Info } from 'lucide-react';

interface BookingSummaryCardProps {
  checkIn: Date;
  checkOut: Date;
  guests: number;
  breakdown: PriceBreakdown;
  onConfirm: () => void;
  isLoading: boolean;
}

export const BookingSummaryCard: React.FC<BookingSummaryCardProps> = ({
  checkIn,
  checkOut,
  guests,
  breakdown,
  onConfirm,
  isLoading
}) => {
  return (
    <div className="sticky top-24 rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
      <h3 className="text-xl font-serif font-bold text-stone-800">Resumen de tu reserva</h3>
      
      <div className="mt-6 space-y-4 border-b border-stone-100 pb-6">
        <div className="flex justify-between text-sm">
          <span className="text-stone-400">Estancia</span>
          <span className="font-medium text-stone-700">
            {format(checkIn, 'dd MMM')} - {format(checkOut, 'dd MMM')}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-stone-400">Noches</span>
          <span className="font-medium text-stone-700">{breakdown.nights} noches</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-stone-400">Huéspedes</span>
          <span className="font-medium text-stone-700">{guests} personas</span>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-stone-600">Alojamiento ({breakdown.nights} x {breakdown.nightlyPrice}€)</span>
          <span className="font-medium text-stone-800">{breakdown.accommodationTotal.toFixed(2)}€</span>
        </div>
        
        {breakdown.extraGuestsTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-stone-600">Suplemento huésped extra</span>
            <span className="font-medium text-stone-800">{breakdown.extraGuestsTotal.toFixed(2)}€</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-stone-600">Gastos de limpieza</span>
          <span className="font-medium text-stone-800">{breakdown.cleaningFee.toFixed(2)}€</span>
        </div>

        {breakdown.discount > 0 && (
          <div className="flex justify-between text-sm text-emerald-600 font-medium">
            <span>Descuento No Reembolsable (10%)</span>
            <span>-{breakdown.discount.toFixed(2)}€</span>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-baseline justify-between border-t border-stone-200 pt-6">
        <span className="text-lg font-bold text-stone-800">Total</span>
        <div className="text-right">
          <span className="text-3xl font-serif font-bold text-emerald-800">{breakdown.total.toFixed(2)}€</span>
          <p className="text-[10px] text-stone-400 uppercase tracking-widest mt-1">IVA incluido</p>
        </div>
      </div>

      {breakdown.depositRequired < breakdown.total && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
          <Info size={14} />
          <span>Pago hoy (30% de señal): <strong>{breakdown.depositRequired.toFixed(2)}€</strong></span>
        </div>
      )}

      <button
        onClick={onConfirm}
        disabled={isLoading}
        className="mt-8 w-full rounded-xl bg-stone-900 py-4 text-sm font-bold text-white shadow-xl transition-all hover:bg-black hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        {isLoading ? 'Procesando...' : 'Confirmar y Pagar'}
      </button>
      
      <p className="mt-4 text-center text-[10px] text-stone-400 leading-relaxed">
        Al hacer clic en "Confirmar y Pagar", serás redirigido a nuestra pasarela de pago segura Stripe.
      </p>
    </div>
  );
};

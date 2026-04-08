import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Info, Home, Users } from 'lucide-react';

type RemotePriceUnit = {
  unidad_id: string;
  unidad_nombre: string;
  unidad_slug: string;
  nights: number;
  num_huespedes: number;
  extra_guests: number;
  season: string;
  temporada_id: string | null;
  precio_noche: number;
  extra_huesped: number;
  importe_alojamiento: number;
  importe_extra: number;
  limpieza: number;
  descuento: number;
  subtotal: number;
  total: number;
  desglose: any;
};

type RemotePriceBreakdown = {
  ok?: boolean;
  mode: 'single' | 'multi';
  property_id?: string;
  checkIn?: string;
  checkOut?: string;
  nights: number;
  num_huespedes: number;
  rate_type: string;
  unidades: RemotePriceUnit[];
  importe_alojamiento: number;
  importe_extras: number;
  importe_limpieza: number;
  descuento_aplicado: number;
  importe_total: number;
  importe_senal: number | null;
  importe_resto: number | null;
};

interface BookingSummaryCardProps {
  checkIn: Date;
  checkOut: Date;
  guests: number;
  breakdown: RemotePriceBreakdown;
  selectedCombinationLabel?: string;
  onConfirm: () => void;
  isLoading: boolean;
}

export const BookingSummaryCard: React.FC<BookingSummaryCardProps> = ({
  checkIn,
  checkOut,
  guests,
  breakdown,
  selectedCombinationLabel,
  onConfirm,
  isLoading,
}) => {
  const isFlexible = breakdown.rate_type === 'FLEXIBLE';
  const hasDeposit = isFlexible && breakdown.importe_senal !== null;

  return (
    <div className="sticky top-24 rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
      <h3 className="text-xl font-serif font-bold text-stone-800">Resumen de tu reserva</h3>

      <div className="mt-6 space-y-4 border-b border-stone-100 pb-6">
        <div className="flex justify-between text-sm">
          <span className="text-stone-400">Estancia</span>
          <span className="font-medium text-stone-700">
            {format(checkIn, 'dd MMM', { locale: es })} - {format(checkOut, 'dd MMM', { locale: es })}
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

        {selectedCombinationLabel && (
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-stone-400">Combinación</span>
            <span className="text-right font-medium text-stone-700">{selectedCombinationLabel}</span>
          </div>
        )}
      </div>

      {breakdown.unidades?.length > 0 && (
        <div className="mt-6 space-y-3 border-b border-stone-100 pb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-400">
            Desglose por unidad
          </p>

          {breakdown.unidades.map((u) => (
            <div key={u.unidad_id} className="rounded-xl border border-stone-100 bg-stone-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Home size={14} className="text-stone-500" />
                    <p className="font-semibold text-stone-800">{u.unidad_nombre}</p>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-xs text-stone-500">
                    <Users size={13} />
                    <span>
                      {u.num_huespedes} huésped{u.num_huespedes !== 1 ? 'es' : ''}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-stone-500">
                    <div className="flex justify-between gap-4">
                      <span>
                        {u.nights} noche{u.nights !== 1 ? 's' : ''} × {u.precio_noche.toFixed(2)}€
                      </span>
                      <span>{u.importe_alojamiento.toFixed(2)}€</span>
                    </div>

                    {u.importe_extra > 0 && (
                      <div className="flex justify-between gap-4">
                        <span>Suplemento huésped extra</span>
                        <span>{u.importe_extra.toFixed(2)}€</span>
                      </div>
                    )}

                    <div className="flex justify-between gap-4">
                      <span>Limpieza</span>
                      <span>{u.limpieza.toFixed(2)}€</span>
                    </div>

                    {u.descuento > 0 && (
                      <div className="flex justify-between gap-4 text-emerald-700">
                        <span>Descuento</span>
                        <span>-{u.descuento.toFixed(2)}€</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-stone-900">{u.total.toFixed(2)}€</p>
                  <p className="text-[10px] text-stone-400">{u.season}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-stone-600">Alojamiento</span>
          <span className="font-medium text-stone-800">
            {breakdown.importe_alojamiento.toFixed(2)}€
          </span>
        </div>

        {breakdown.importe_extras > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-stone-600">Extras</span>
            <span className="font-medium text-stone-800">
              {breakdown.importe_extras.toFixed(2)}€
            </span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-stone-600">Limpieza</span>
          <span className="font-medium text-stone-800">
            {breakdown.importe_limpieza.toFixed(2)}€
          </span>
        </div>

        {breakdown.descuento_aplicado > 0 && (
          <div className="flex justify-between text-sm font-medium text-emerald-600">
            <span>Descuento</span>
            <span>-{breakdown.descuento_aplicado.toFixed(2)}€</span>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-baseline justify-between border-t border-stone-200 pt-6">
        <span className="text-lg font-bold text-stone-800">Total</span>
        <div className="text-right">
          <span className="text-3xl font-serif font-bold text-emerald-800">
            {breakdown.importe_total.toFixed(2)}€
          </span>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-stone-400">
            IVA incluido
          </p>
        </div>
      </div>

      {hasDeposit && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
          <Info size={14} />
          <span>
            Pago hoy (señal): <strong>{breakdown.importe_senal!.toFixed(2)}€</strong>
          </span>
        </div>
      )}

      {!hasDeposit && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-stone-50 p-3 text-xs text-stone-700">
          <Info size={14} />
          <span>
            Esta tarifa requiere el pago completo ahora.
          </span>
        </div>
      )}

      <button
        onClick={onConfirm}
        disabled={isLoading}
        className="mt-8 w-full rounded-xl bg-stone-900 py-4 text-sm font-bold text-white shadow-xl transition-all hover:bg-black hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        {isLoading ? 'Procesando...' : hasDeposit ? 'Confirmar y Pagar señal' : 'Confirmar y Pagar'}
      </button>

      <p className="mt-4 text-center text-[10px] leading-relaxed text-stone-400">
        Al hacer clic en “Confirmar y Pagar”, serás redirigido a nuestra pasarela de pago segura Stripe.
      </p>
    </div>
  );
};
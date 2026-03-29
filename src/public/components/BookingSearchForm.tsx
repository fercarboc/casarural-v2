import React from 'react';
import { Calendar, Users, AlertCircle } from 'lucide-react';
import { format, isBefore, startOfToday, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface BookingSearchFormProps {
  checkIn: Date | null;
  checkOut: Date | null;
  guests: number;
  onGuestsChange: (val: number) => void;
  onSearch: () => void;
  isValid: boolean;
  onScrollToCalendar?: () => void;
}

export const BookingSearchForm: React.FC<BookingSearchFormProps> = ({
  checkIn,
  checkOut,
  guests,
  onGuestsChange,
  onSearch,
  isValid: parentIsValid,
  onScrollToCalendar
}) => {
  const today = startOfToday();

  const getCheckInError = () => {
    if (!checkIn) return null;
    if (isBefore(checkIn, today)) return 'La fecha de entrada no puede ser anterior a hoy';
    return null;
  };

  const getCheckOutError = () => {
    if (!checkOut) return null;
    if (checkIn && (isBefore(checkOut, checkIn) || isSameDay(checkOut, checkIn))) {
      return 'La fecha de salida debe ser posterior a la de entrada';
    }
    return null;
  };

  const getGuestsError = () => {
    if (guests < 1) return 'Mínimo 1 huésped';
    if (guests > 11) return 'Máximo 11 huéspedes';
    return null;
  };

  const checkInError = getCheckInError();
  const checkOutError = getCheckOutError();
  const guestsError = getGuestsError();

  const isFormValid = parentIsValid && !checkInError && !checkOutError && !guestsError;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
            <Calendar size={14} /> Entrada
          </label>
          <div
            onClick={onScrollToCalendar}
            className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
              checkInError ? 'border-red-300 bg-red-50 text-red-700' : checkIn ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-stone-200 bg-stone-50 text-stone-400 hover:border-emerald-400'
            }`}
          >
            {checkIn ? format(checkIn, 'dd MMM yyyy', { locale: es }) : '↓ Elige en el calendario'}
          </div>
          {checkInError && (
            <p className="flex items-center gap-1 text-[10px] font-medium text-red-600 mt-1">
              <AlertCircle size={10} /> {checkInError}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
            <Calendar size={14} /> Salida
          </label>
          <div
            onClick={onScrollToCalendar}
            className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
              checkOutError ? 'border-red-300 bg-red-50 text-red-700' : checkOut ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-stone-200 bg-stone-50 text-stone-400 hover:border-emerald-400'
            }`}
          >
            {checkOut ? format(checkOut, 'dd MMM yyyy', { locale: es }) : '↓ Elige en el calendario'}
          </div>
          {checkOutError && (
            <p className="flex items-center gap-1 text-[10px] font-medium text-red-600 mt-1">
              <AlertCircle size={10} /> {checkOutError}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
            <Users size={14} /> Huéspedes
          </label>
          <select 
            value={guests}
            onChange={(e) => onGuestsChange(parseInt(e.target.value))}
            className={`w-full rounded-xl border px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-1 ${
              guestsError 
                ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-500' 
                : 'border-stone-200 bg-stone-50 text-stone-700 focus:border-emerald-500 focus:ring-emerald-500'
            }`}
          >
            {[...Array(11)].map((_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? 'Huésped' : 'Huéspedes'}</option>
            ))}
          </select>
          {guestsError ? (
            <p className="flex items-center gap-1 text-[10px] font-medium text-red-600 mt-1">
              <AlertCircle size={10} /> {guestsError}
            </p>
          ) : (
            <p className="text-[10px] text-stone-400 mt-1 italic">Máximo 11 personas (suplemento a partir del 11º)</p>
          )}
        </div>
      </div>

      <button
        disabled={!isFormValid}
        onClick={onSearch}
        className="mt-8 w-full rounded-xl bg-emerald-800 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-all hover:bg-emerald-900 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        Consultar Disponibilidad
      </button>
    </div>
  );
};

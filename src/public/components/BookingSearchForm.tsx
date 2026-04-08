import React from 'react'
import { Calendar, Users, AlertCircle, Info } from 'lucide-react'
import { format, isBefore, startOfToday, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'

interface BookingSearchFormProps {
  checkIn: Date | null
  checkOut: Date | null
  guests: number
  maxGuests: number
  onGuestsChange: (val: number) => void
  onSearch: () => void
  isValid: boolean
  onScrollToCalendar?: () => void
  unitsCount?: number
}

export const BookingSearchForm: React.FC<BookingSearchFormProps> = ({
  checkIn,
  checkOut,
  guests,
  maxGuests,
  onGuestsChange,
  onSearch,
  isValid: parentIsValid,
  onScrollToCalendar,
  unitsCount,
}) => {
  const today = startOfToday()

  const getCheckInError = () => {
    if (!checkIn) return null
    if (isBefore(checkIn, today)) return 'Entrada anterior a hoy'
    return null
  }

  const getCheckOutError = () => {
    if (!checkOut) return null
    if (checkIn && (isBefore(checkOut, checkIn) || isSameDay(checkOut, checkIn))) {
      return 'La salida debe ser posterior'
    }
    return null
  }

  const getGuestsError = () => {
    if (guests < 1) return 'Mínimo 1 huésped'
    if (guests > maxGuests) return `Máximo ${maxGuests} huéspedes`
    return null
  }

  const checkInError = getCheckInError()
  const checkOutError = getCheckOutError()
  const guestsError = getGuestsError()

  const isFormValid =
    parentIsValid &&
    !checkInError &&
    !checkOutError &&
    !guestsError &&
    maxGuests >= 1

  const fieldBase =
    'h-12 rounded-xl border px-4 text-sm font-medium transition-colors cursor-pointer flex items-center'
  const selectBase =
    'h-12 w-full rounded-xl border px-4 text-sm font-medium transition-colors focus:outline-none focus:ring-1'

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-stone-500">
            <Calendar size={13} /> Entrada
          </label>
          <div
            onClick={onScrollToCalendar}
            className={`${fieldBase} ${
              checkInError
                ? 'border-red-300 bg-red-50 text-red-700'
                : checkIn
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-stone-200 bg-stone-50 text-stone-400 hover:border-emerald-400'
            }`}
          >
            {checkIn ? format(checkIn, 'dd MMM yyyy', { locale: es }) : 'Seleccionar'}
          </div>
          {checkInError && (
            <p className="flex items-center gap-1 text-[10px] font-medium text-red-600">
              <AlertCircle size={10} /> {checkInError}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-stone-500">
            <Calendar size={13} /> Salida
          </label>
          <div
            onClick={onScrollToCalendar}
            className={`${fieldBase} ${
              checkOutError
                ? 'border-red-300 bg-red-50 text-red-700'
                : checkOut
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-stone-200 bg-stone-50 text-stone-400 hover:border-emerald-400'
            }`}
          >
            {checkOut ? format(checkOut, 'dd MMM yyyy', { locale: es }) : 'Seleccionar'}
          </div>
          {checkOutError && (
            <p className="flex items-center gap-1 text-[10px] font-medium text-red-600">
              <AlertCircle size={10} /> {checkOutError}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-stone-500">
            <Users size={13} /> Huéspedes
          </label>
          <select
            value={guests}
            onChange={(e) => onGuestsChange(parseInt(e.target.value))}
            className={`${selectBase} ${
              guestsError
                ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-500'
                : 'border-stone-200 bg-stone-50 text-stone-700 focus:border-emerald-500 focus:ring-emerald-500'
            }`}
          >
            {[...Array(Math.max(maxGuests, 1))].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1} {i === 0 ? 'Huésped' : 'Huéspedes'}
              </option>
            ))}
          </select>

          {guestsError ? (
            <p className="flex items-center gap-1 text-[10px] font-medium text-red-600">
              <AlertCircle size={10} /> {guestsError}
            </p>
          ) : (
            <p className="flex items-center gap-1 text-[10px] text-stone-400">
              <Info size={10} />
              Máx. {maxGuests}
              {typeof unitsCount === 'number'
                ? ` · ${unitsCount} unidad${unitsCount !== 1 ? 'es' : ''}`
                : ''}
            </p>
          )}
        </div>

        <div className="flex items-end">
          <button
            disabled={!isFormValid}
            onClick={onSearch}
            className="h-12 w-full rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ver disponibilidad
          </button>
        </div>
      </div>
    </div>
  )
}
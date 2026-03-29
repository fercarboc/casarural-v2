import React from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isBefore, startOfToday, isWithinInterval, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AvailabilityCalendarProps {
  selectedRange: { start: Date | null; end: Date | null };
  onSelectDate: (date: Date) => void;
  occupiedDates: Date[];
}

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  selectedRange,
  onSelectDate,
  occupiedDates
}) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const today = startOfToday();

  const days = React.useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const isDateOccupied = (date: Date) => occupiedDates.some(d => isSameDay(d, date));
  const isDateSelected = (date: Date) => {
    if (selectedRange.start && isSameDay(date, selectedRange.start)) return true;
    if (selectedRange.end && isSameDay(date, selectedRange.end)) return true;
    return false;
  };

  const isDateInRange = (date: Date) => {
    if (!selectedRange.start || !selectedRange.end) return false;
    return isWithinInterval(date, { start: selectedRange.start, end: selectedRange.end });
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-serif font-semibold text-stone-800 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h3>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="rounded-full p-2 hover:bg-stone-100 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={nextMonth} className="rounded-full p-2 hover:bg-stone-100 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-stone-400 uppercase tracking-wider mb-4">
        {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(d => <div key={d}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {/* Empty cells to offset first day of month (Monday-first calendar) */}
        {Array.from({ length: (getDay(days[0]) + 6) % 7 }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const occupied = isDateOccupied(day);
          const past = isBefore(day, today);
          const selected = isDateSelected(day);
          const inRange = isDateInRange(day);
          const disabled = occupied || past;

          return (
            <button
              key={day.toString()}
              disabled={disabled}
              onClick={() => onSelectDate(day)}
              className={cn(
                "relative h-10 w-full rounded-lg text-sm font-medium transition-all flex items-center justify-center",
                disabled ? "text-stone-300 cursor-not-allowed" : "text-stone-700 hover:bg-emerald-50 hover:text-emerald-700",
                occupied && "bg-stone-50 line-through",
                selected && "bg-emerald-800 text-white hover:bg-emerald-900 hover:text-white",
                inRange && !selected && "bg-emerald-50 text-emerald-800"
              )}
            >
              {format(day, 'd')}
              {selected && (
                <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-xs text-stone-500 border-t border-stone-100 pt-6">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-emerald-800" />
          <span>Seleccionado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-emerald-50" />
          <span>En rango</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-stone-100 line-through" />
          <span>Ocupado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border border-stone-200" />
          <span>Disponible</span>
        </div>
      </div>
    </div>
  );
};

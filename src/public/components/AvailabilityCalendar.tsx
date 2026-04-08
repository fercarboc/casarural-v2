import React from 'react'
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  startOfToday,
  isWithinInterval,
  getDay,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type DayAvailability = {
  blocked: number
  total: number
}

interface AvailabilityCalendarProps {
  selectedRange: { start: Date | null; end: Date | null }
  onSelectDate: (date: Date) => void
  availabilityByDate?: Record<string, DayAvailability>
  mode?: 'GLOBAL' | 'UNIT'
  className?: string
}

function toKey(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

const WEEK_DAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  selectedRange,
  onSelectDate,
  availabilityByDate = {},
  mode = 'GLOBAL',
  className,
}) => {
  const [currentMonth, setCurrentMonth] = React.useState(startOfMonth(new Date()))
  const today = startOfToday()

  const days = React.useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const leadingEmptyDays = React.useMemo(() => {
    if (!days.length) return 0
    return (getDay(days[0]) + 6) % 7
  }, [days])

  const getDayAvailability = (date: Date): DayAvailability => {
    return availabilityByDate[toKey(date)] ?? { blocked: 0, total: 0 }
  }

  const isDateSelected = (date: Date) => {
    return !!(
      (selectedRange.start && isSameDay(date, selectedRange.start)) ||
      (selectedRange.end && isSameDay(date, selectedRange.end))
    )
  }

  const isDateInRange = (date: Date) => {
    if (!selectedRange.start || !selectedRange.end) return false
    return isWithinInterval(date, { start: selectedRange.start, end: selectedRange.end })
  }

  const prevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1))
  const nextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1))

  return (
    <div className={cn('rounded-2xl border border-stone-200 bg-white p-3 shadow-sm', className)}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold capitalize text-stone-800">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h3>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={15} />
          </button>

          <button
            type="button"
            onClick={nextMonth}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEK_DAYS.map((day) => (
          <div
            key={day}
            className="flex h-6 items-center justify-center text-[10px] font-medium uppercase tracking-wide text-stone-400"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingEmptyDays }).map((_, index) => (
          <div key={`empty-${index}`} className="h-8" />
        ))}

        {days.map((day) => {
          const { blocked, total } = getDayAvailability(day)

          const fullyBlocked = total > 0 && blocked >= total
          const partiallyBlocked = total > 0 && blocked > 0 && blocked < total

          const past = isBefore(day, today)
          const selected = isDateSelected(day)
          const inRange = isDateInRange(day)

          const disabled = past || fullyBlocked

          let title = 'Disponible'
          if (total > 0) {
            if (fullyBlocked) {
              title =
                mode === 'GLOBAL'
                  ? `Sin disponibilidad (${blocked}/${total} ocupadas)`
                  : 'Ocupado'
            } else if (partiallyBlocked) {
              title = `Disponibilidad parcial (${blocked}/${total} ocupadas)`
            }
          }

          return (
            <button
              key={toKey(day)}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(day)}
              title={title}
              className={cn(
                'relative flex h-8 w-full items-center justify-center rounded-md border text-sm font-medium transition',
                'focus:outline-none focus:ring-2 focus:ring-emerald-200',
                disabled
                  ? 'cursor-not-allowed border-transparent text-stone-300'
                  : 'border-transparent text-stone-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700',
                fullyBlocked && 'bg-stone-50 text-stone-300 line-through',
                partiallyBlocked &&
                  !selected &&
                  !inRange &&
                  'border-amber-200 bg-amber-50 text-amber-800',
                inRange && !selected && 'border-emerald-100 bg-emerald-50 text-emerald-800',
                selected &&
                  'border-emerald-800 bg-emerald-800 text-white hover:border-emerald-900 hover:bg-emerald-900 hover:text-white'
              )}
            >
              {format(day, 'd')}

              {partiallyBlocked && !selected && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-2 flex items-center gap-3 text-[10px] text-stone-500">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-800" />
          <span>Sel.</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-100" />
          <span>Rango</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-300" />
          <span>Parcial</span>
        </div>
      </div>
    </div>
  )
}
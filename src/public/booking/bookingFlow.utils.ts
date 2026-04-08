import { format } from 'date-fns'

export function isoToDate(value: string | null): Date | null {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function dateToISO(date: Date | null): string | null {
  if (!date) return null
  return format(date, 'yyyy-MM-dd')
}

export function nightsBetween(start: string | null, end: string | null): number {
  if (!start || !end) return 0

  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)

  const startDate = new Date(sy, sm - 1, sd)
  const endDate = new Date(ey, em - 1, ed)

  return Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  )
}
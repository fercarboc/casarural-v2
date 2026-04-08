export function formatDateTime(
  value: string | Date | null | undefined,
  locale = 'es-ES'
): string {
  if (!value) return '—';

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
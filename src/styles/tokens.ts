/**
 * Design tokens — StayNex Admin
 *
 * Usar estos strings en className para garantizar consistencia.
 * Los colores `brand-*` están definidos en src/index.css (@theme).
 */

// ── Botones ───────────────────────────────────────────────────────────────────

export const btn = {
  /** Acción principal: verde marca */
  primary:
    'inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50',

  /** Acción secundaria: borde */
  secondary:
    'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50',

  /** Peligro */
  danger:
    'inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50',

  /** Icono-only sin fondo */
  ghost:
    'rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700',

  /** Small primario */
  primarySm:
    'inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50',

  /** Small secundario */
  secondarySm:
    'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50',
} as const;

// ── Inputs ────────────────────────────────────────────────────────────────────

export const input =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20';

export const inputSm =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20';

export const select =
  'rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20';

// ── Cards ─────────────────────────────────────────────────────────────────────

export const card =
  'rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-card)]';

export const cardHeader =
  'flex items-center gap-2.5 border-b border-slate-100 bg-slate-50 px-6 py-4';

// ── Badges (estado) ───────────────────────────────────────────────────────────

export const badge = {
  confirmed:  'inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700',
  pending:    'inline-flex items-center rounded-full bg-amber-50  px-2.5 py-0.5 text-[10px] font-bold text-amber-700',
  partial:    'inline-flex items-center rounded-full bg-blue-50   px-2.5 py-0.5 text-[10px] font-bold text-blue-700',
  cancelled:  'inline-flex items-center rounded-full bg-red-50    px-2.5 py-0.5 text-[10px] font-bold text-red-700',
  inactive:   'inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500',
  active:     'inline-flex items-center rounded-full bg-brand-50  px-2.5 py-0.5 text-[10px] font-bold text-brand-700',
} as const;

// ── Tablas ────────────────────────────────────────────────────────────────────

export const table = {
  wrapper: 'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-card)]',
  thead:   'bg-slate-50 border-b border-slate-200',
  th:      'px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500',
  tbody:   'divide-y divide-slate-100',
  tr:      'transition-colors hover:bg-slate-50',
  td:      'px-6 py-4 text-sm text-slate-600',
  tdBold:  'px-6 py-4 text-sm font-semibold text-slate-900',
} as const;

// ── Página: header ────────────────────────────────────────────────────────────

export const pageHeader = {
  wrapper: 'flex items-start justify-between',
  title:   'text-2xl font-bold text-slate-900',
  sub:     'mt-1 text-sm text-slate-500',
} as const;

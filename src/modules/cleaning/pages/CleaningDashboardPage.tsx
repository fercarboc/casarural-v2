// src/modules/cleaning/pages/CleaningDashboardPage.tsx

import React, { useState, useEffect, useCallback } from 'react'
import {
  Sparkles,
  Clock,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Loader2,
  User,
  Building2,
  ChevronRight,
  RefreshCw,
  Zap,
  RepeatIcon,
  Plus,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAdminTenant } from '../../../admin/context/AdminTenantContext'
import { cleaningService } from '../services/cleaningService'
import { cleaningScheduleService } from '../services/cleaningScheduleService'
import { CreateCleaningJobModal } from '../components/CreateCleaningJobModal'
import type {
  CleaningJob,
  CleaningDashboardKPIs,
  CleaningStatus,
  CleaningSchedule,
} from '../types/cleaning.types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return format(parseISO(d), 'EEE d MMM', { locale: es })
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<CleaningStatus, string> = {
  PENDING:     'Pendiente',
  ASSIGNED:    'Asignado',
  IN_PROGRESS: 'En curso',
  DONE:        'Completado',
  CANCELLED:   'Cancelado',
  NO_ACCESS:   'Sin acceso',
}

const STATUS_CLS: Record<CleaningStatus, string> = {
  PENDING:     'bg-amber-500/10 text-amber-300 border border-amber-500/20',
  ASSIGNED:    'bg-violet-500/10 text-violet-300 border border-violet-500/20',
  IN_PROGRESS: 'bg-brand-500/10 text-brand-300 border border-brand-500/20',
  DONE:        'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
  CANCELLED:   'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  NO_ACCESS:   'bg-red-500/10 text-red-300 border border-red-500/20',
}

const PRIORITY_CLS: Record<string, string> = {
  URGENT: 'bg-red-500/15 text-red-300 border border-red-500/25',
  HIGH:   'bg-orange-500/15 text-orange-300 border border-orange-500/25',
  MEDIUM: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  LOW:    'bg-slate-500/10 text-slate-500 border border-slate-500/15',
}

const PRIORITY_LABEL: Record<string, string> = {
  URGENT: 'Urgente',
  HIGH:   'Alta',
  MEDIUM: 'Media',
  LOW:    'Baja',
}

// ── Quick-status transition ────────────────────────────────────────────────────

const NEXT_STATUS: Partial<Record<CleaningStatus, CleaningStatus>> = {
  PENDING:     'IN_PROGRESS',
  ASSIGNED:    'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
  NO_ACCESS:   'PENDING',
}

const NEXT_LABEL: Partial<Record<CleaningStatus, string>> = {
  PENDING:     'Iniciar',
  ASSIGNED:    'Iniciar',
  IN_PROGRESS: 'Completar',
  NO_ACCESS:   'Reprogramar',
}

// ── Componente principal ──────────────────────────────────────────────────────

export const CleaningDashboardPage: React.FC = () => {
  const { property_id } = useAdminTenant()

  const [kpis, setKpis] = useState<CleaningDashboardKPIs | null>(null)
  const [todayJobs, setTodayJobs] = useState<CleaningJob[]>([])
  const [upcoming, setUpcoming] = useState<CleaningJob[]>([])
  const [schedules, setSchedules] = useState<CleaningSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [transitioning, setTransitioning] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<{ created: number; skipped: number } | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const today = todayStr()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [k, tj, up, sc] = await Promise.all([
        cleaningService.getDashboardKPIs(property_id),
        cleaningService.getTodayJobs(property_id),
        cleaningService.getUpcoming7Days(property_id),
        cleaningScheduleService.getSchedules(property_id, { active: true }),
      ])
      setKpis(k)
      setTodayJobs(tj)
      setUpcoming(up)
      setSchedules(sc)
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar los datos de limpieza')
    } finally {
      setLoading(false)
    }
  }, [property_id])

  async function handleGenerate() {
    setGenerating(true)
    setGenerateResult(null)
    setError('')
    try {
      const result = await cleaningService.generateJobs()
      setGenerateResult(result)
      await load()
    } catch (e: any) {
      setError(e.message ?? 'Error generando jobs')
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => { load() }, [load])

  async function handleQuickStatus(job: CleaningJob) {
    const next = NEXT_STATUS[job.status]
    if (!next) return
    setTransitioning(job.id)
    try {
      const updated = await cleaningService.changeStatus(job.id, job.status, next)
      setTodayJobs(prev => prev.map(j => j.id === updated.id ? updated : j))
      setUpcoming(prev => prev.map(j => j.id === updated.id ? updated : j))
      // Refresh KPIs
      const k = await cleaningService.getDashboardKPIs(property_id)
      setKpis(k)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setTransitioning(null)
    }
  }

  const urgentJobs = todayJobs.filter(j => j.priority === 'URGENT')
  const upcomingExcludingToday = upcoming.filter(j => j.scheduled_date !== today)

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="rounded-3xl border border-sidebar-border bg-sidebar-bg px-6 py-5 shadow-[0_10px_40px_rgba(0,0,0,0.20)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600/20">
              <Sparkles size={18} className="text-brand-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Módulo de Limpieza</h1>
              <p className="text-xs text-slate-500 capitalize">
                {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-700"
            >
              <Plus size={13} />
              Nueva tarea
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || generating}
              className="flex items-center gap-2 rounded-xl border border-brand-500/30 bg-brand-600/20 px-4 py-2.5 text-sm font-medium text-brand-300 transition-all hover:bg-brand-600/30 disabled:opacity-40"
            >
              {generating ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
              Generar jobs
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-sidebar-border bg-admin-card px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-sidebar-hover disabled:opacity-40"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          <AlertTriangle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      {generateResult && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300">
          <CheckCircle2 size={15} className="shrink-0" />
          Jobs generados: <strong>{generateResult.created}</strong> nuevos, <strong>{generateResult.skipped}</strong> ya existían.
          {generateResult.created === 0 && generateResult.skipped === 0 && (
            <span className="ml-1 text-emerald-400/70">— Verifica que los alquileres estén en estado APROBADO, ACTIVO o RENOVADO.</span>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex h-60 items-center justify-center rounded-3xl border border-sidebar-border bg-sidebar-bg">
          <Loader2 size={24} className="animate-spin text-slate-500" />
        </div>
      ) : (
        <>
          {/* ── KPIs ─────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Hoy"
              value={kpis?.todayTotal ?? 0}
              icon={<Calendar size={16} />}
              color="blue"
              sub={kpis?.todayUrgent ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">
                  {kpis.todayUrgent} urgente{kpis.todayUrgent > 1 ? 's' : ''}
                </span>
              ) : <span className="text-xs text-slate-500">sin urgentes</span>}
            />
            <KpiCard
              label="Pendientes"
              value={kpis?.pendingTotal ?? 0}
              icon={<Clock size={16} />}
              color="amber"
              sub={<span className="text-xs text-slate-500">sin asignar</span>}
            />
            <KpiCard
              label="Completadas"
              value={kpis?.doneThisWeek ?? 0}
              icon={<CheckCircle2 size={16} />}
              color="emerald"
              sub={<span className="text-xs text-slate-500">esta semana</span>}
            />
            <KpiCard
              label="Próximos 7 días"
              value={kpis?.next7daysTotal ?? 0}
              icon={<Calendar size={16} />}
              color="violet"
              sub={<span className="text-xs text-slate-500">programadas</span>}
            />
          </div>

          {/* ── Urgentes strip ────────────────────────────────────────────────── */}
          {urgentJobs.length > 0 && (
            <div className="flex items-center justify-between rounded-2xl border border-red-500/25 bg-red-500/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15">
                  <AlertTriangle size={16} className="text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-300">
                    {urgentJobs.length} limpieza{urgentJobs.length > 1 ? 's' : ''} urgente{urgentJobs.length > 1 ? 's' : ''} — mismo día entrada/salida
                  </p>
                  <p className="text-xs text-red-400/70">
                    {urgentJobs.map(j => j.unit_name ?? j.unit_id).join(' · ')} — requieren atención inmediata
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Schedules activos ─────────────────────────────────────────────── */}
          {schedules.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar-bg">
              <div className="flex items-center justify-between border-b border-sidebar-border bg-admin-card/70 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <RepeatIcon size={14} className="text-violet-400" />
                  <h3 className="text-sm font-semibold text-white">Programaciones activas</h3>
                </div>
                <span className="text-xs text-slate-500">{schedules.length} schedule{schedules.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-sidebar-border">
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Unidad</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Frecuencia</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Inicio</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Fin</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Días</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sidebar-border">
                    {schedules.map(sc => (
                      <tr key={sc.id} className="transition-colors hover:bg-sidebar-hover/50">
                        <td className="px-4 py-2.5 text-xs font-medium text-slate-200">{sc.unit_name ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          <FrequencyBadge frequency={sc.frequency} />
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-400">{sc.start_date}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-400">{sc.end_date ?? '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">
                          {sc.days_of_week?.join(', ') ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-sidebar-border bg-admin-card/40 px-5 py-3">
                <p className="text-[11px] text-slate-500">
                  Los jobs se generan para alquileres en estado <span className="text-slate-400 font-medium">APROBADO, ACTIVO o RENOVADO</span>. Pulsa "Generar jobs" para actualizar.
                </p>
              </div>
            </div>
          )}

          {/* ── Grid 2 columnas: jobs hoy + próximos ─────────────────────────── */}
          <div className="grid gap-6 xl:grid-cols-2">

            {/* Jobs de hoy */}
            <div className="overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar-bg">
              <div className="flex items-center justify-between border-b border-sidebar-border bg-admin-card/70 px-5 py-3.5">
                <h3 className="text-sm font-semibold text-white">Jobs de hoy</h3>
                <span className="text-xs text-slate-500">{todayJobs.length} trabajos</span>
              </div>
              {todayJobs.length === 0 ? (
                <EmptyState icon={<CheckCircle2 size={22} className="text-emerald-400" />} msg="No hay limpiezas programadas para hoy" />
              ) : (
                <div className="divide-y divide-sidebar-border">
                  {todayJobs.map(job => (
                    <JobRow
                      key={job.id}
                      job={job}
                      onQuickStatus={() => handleQuickStatus(job)}
                      transitioning={transitioning === job.id}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Próximos 7 días */}
            <div className="overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar-bg">
              <div className="flex items-center justify-between border-b border-sidebar-border bg-admin-card/70 px-5 py-3.5">
                <h3 className="text-sm font-semibold text-white">Próximos 7 días</h3>
                <span className="text-xs text-slate-500">
                  {format(new Date(), 'd MMM', { locale: es })} — {format(new Date(Date.now() + 7 * 86400000), 'd MMM', { locale: es })}
                </span>
              </div>
              {upcomingExcludingToday.length === 0 ? (
                <EmptyState icon={<Calendar size={22} className="text-slate-500" />} msg="No hay limpiezas programadas los próximos días" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-sidebar-border">
                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Fecha</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Unidad</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tipo</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Asignado</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sidebar-border">
                      {upcomingExcludingToday.map(job => (
                        <tr key={job.id} className="transition-colors hover:bg-sidebar-hover/50">
                          <td className="whitespace-nowrap px-4 py-2.5 text-xs font-medium capitalize text-slate-300">
                            {fmtDate(job.scheduled_date)}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-200">
                            {job.unit_name ?? '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            <ModeBadge mode={job.mode} />
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-400">
                            {job.staff_name ?? job.provider_name ?? <span className="text-slate-600">—</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusChip status={job.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showCreateModal && (
        <CreateCleaningJobModal
          onClose={() => setShowCreateModal(false)}
          onCreated={load}
        />
      )}
    </div>
  )
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon,
  color,
  sub,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: 'blue' | 'amber' | 'emerald' | 'violet'
  sub?: React.ReactNode
}) {
  const COLOR: Record<string, string> = {
    blue:    'bg-blue-500/10 text-blue-300',
    amber:   'bg-amber-500/10 text-amber-300',
    emerald: 'bg-emerald-500/10 text-emerald-300',
    violet:  'bg-violet-500/10 text-violet-300',
  }
  return (
    <div className="rounded-2xl border border-sidebar-border bg-sidebar-bg p-5 shadow-[0_4px_24px_rgba(0,0,0,0.15)]">
      <div className={`mb-3 w-fit rounded-xl p-2 ${COLOR[color]}`}>
        {icon}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-0.5 text-3xl font-bold text-white">{value}</p>
      {sub && <div className="mt-2">{sub}</div>}
    </div>
  )
}

function StatusChip({ status }: { status: CleaningStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

const FREQ_LABEL: Record<string, string> = {
  WEEKLY: 'Semanal', BIWEEKLY: 'Quincenal', MONTHLY: 'Mensual',
}
const FREQ_CLS: Record<string, string> = {
  WEEKLY:   'bg-blue-500/10 text-blue-300',
  BIWEEKLY: 'bg-violet-500/10 text-violet-300',
  MONTHLY:  'bg-amber-500/10 text-amber-300',
}

function FrequencyBadge({ frequency }: { frequency: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${FREQ_CLS[frequency] ?? 'bg-slate-500/10 text-slate-400'}`}>
      {FREQ_LABEL[frequency] ?? frequency}
    </span>
  )
}

function ModeBadge({ mode }: { mode: string }) {
  return mode === 'SHORT_STAY' ? (
    <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-300">SHORT</span>
  ) : (
    <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-300">LONG</span>
  )
}

function EmptyState({ icon, msg }: { icon: React.ReactNode; msg: string }) {
  return (
    <div className="flex h-36 flex-col items-center justify-center gap-2 text-slate-500">
      {icon}
      <p className="text-xs">{msg}</p>
    </div>
  )
}

function AssignedLabel({ job }: { job: CleaningJob }) {
  if (job.staff_name)    return <span className="flex items-center gap-1 text-xs text-slate-300"><User size={11} />{job.staff_name}</span>
  if (job.provider_name) return <span className="flex items-center gap-1 text-xs text-slate-300"><Building2 size={11} />{job.provider_name}</span>
  return <span className="text-xs text-slate-600">Sin asignar</span>
}

function JobRow({
  job,
  onQuickStatus,
  transitioning,
}: {
  job: CleaningJob
  onQuickStatus: () => void
  transitioning: boolean
}) {
  const next = NEXT_STATUS[job.status]
  const nextLabel = NEXT_LABEL[job.status]

  return (
    <div className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-sidebar-hover/40">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-100 text-sm">{job.unit_name ?? '—'}</span>
          {job.priority === 'URGENT' && (
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${PRIORITY_CLS.URGENT}`}>
              Urgente
            </span>
          )}
          <ModeBadge mode={job.mode} />
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
          {job.start_time && <span>{job.start_time.slice(0, 5)}</span>}
          <AssignedLabel job={job} />
        </div>
      </div>
      <StatusChip status={job.status} />
      {next && (
        <button
          onClick={onQuickStatus}
          disabled={transitioning}
          className="ml-1 flex shrink-0 items-center gap-1 rounded-lg border border-sidebar-border bg-admin-card px-3 py-1.5 text-[11px] font-medium text-slate-300 transition-all hover:bg-sidebar-hover disabled:opacity-40"
        >
          {transitioning ? <Loader2 size={10} className="animate-spin" /> : <ChevronRight size={10} />}
          {nextLabel}
        </button>
      )}
    </div>
  )
}

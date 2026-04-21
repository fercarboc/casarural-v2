// src/modules/cleaning/services/cleaningService.ts

import { supabase } from '../../../integrations/supabase/client'
import type {
  CleaningJob,
  CleaningJobFilters,
  CreateCleaningJobDto,
  AssignmentDto,
  CleaningStatus,
  CleaningDashboardKPIs,
  STATUS_TRANSITIONS,
} from '../types/cleaning.types'
import { STATUS_TRANSITIONS as TRANSITIONS } from '../types/cleaning.types'

const JOB_SELECT = `
  *,
  unidades(nombre),
  cleaning_staff(name),
  cleaning_providers(name),
  cleaning_services(name),
  reservas(codigo)
`

function mapJob(raw: any): CleaningJob {
  return {
    ...raw,
    unit_name:          raw.unidades?.nombre      ?? null,
    staff_name:         raw.cleaning_staff?.name  ?? null,
    provider_name:      raw.cleaning_providers?.name ?? null,
    service_name:       raw.cleaning_services?.name  ?? null,
    reservation_codigo: raw.reservas?.codigo       ?? null,
  }
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function nDaysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function weekStart(): string {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() + 1) // Monday
  return d.toISOString().split('T')[0]
}

export const cleaningService = {
  async getCleaningJobs(propertyId: string, filters: CleaningJobFilters = {}): Promise<CleaningJob[]> {
    let q = supabase
      .from('cleaning_jobs')
      .select(JOB_SELECT)
      .eq('property_id', propertyId)
      .order('scheduled_date', { ascending: true })
      .order('start_time', { ascending: true, nullsFirst: true })

    if (filters.mode)      q = q.eq('mode', filters.mode)
    if (filters.status && filters.status !== 'ALL') q = q.eq('status', filters.status)
    if (filters.unit_id)   q = q.eq('unit_id', filters.unit_id)
    if (filters.priority)  q = q.eq('priority', filters.priority)
    if (filters.date_from) q = q.gte('scheduled_date', filters.date_from)
    if (filters.date_to)   q = q.lte('scheduled_date', filters.date_to)

    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map(mapJob)
  },

  async getTodayJobs(propertyId: string): Promise<CleaningJob[]> {
    const today = todayStr()
    const { data, error } = await supabase
      .from('cleaning_jobs')
      .select(JOB_SELECT)
      .eq('property_id', propertyId)
      .eq('scheduled_date', today)
      .not('status', 'in', '(CANCELLED)')
      .order('priority', { ascending: false })
      .order('start_time', { ascending: true, nullsFirst: true })
    if (error) throw error
    return (data ?? []).map(mapJob)
  },

  async getUpcoming7Days(propertyId: string): Promise<CleaningJob[]> {
    const from = todayStr()
    const to   = nDaysFromNow(7)
    const { data, error } = await supabase
      .from('cleaning_jobs')
      .select(JOB_SELECT)
      .eq('property_id', propertyId)
      .gte('scheduled_date', from)
      .lte('scheduled_date', to)
      .not('status', 'in', '(CANCELLED)')
      .order('scheduled_date', { ascending: true })
      .order('priority', { ascending: false })
    if (error) throw error
    return (data ?? []).map(mapJob)
  },

  async getDashboardKPIs(propertyId: string): Promise<CleaningDashboardKPIs> {
    const today = todayStr()
    const weekFrom = weekStart()
    const nextWeek = nDaysFromNow(7)

    const [todayRes, pendingRes, doneRes, next7Res] = await Promise.all([
      supabase
        .from('cleaning_jobs')
        .select('id, priority', { count: 'exact' })
        .eq('property_id', propertyId)
        .eq('scheduled_date', today)
        .not('status', 'in', '(CANCELLED)'),
      supabase
        .from('cleaning_jobs')
        .select('id', { count: 'exact' })
        .eq('property_id', propertyId)
        .in('status', ['PENDING']),
      supabase
        .from('cleaning_jobs')
        .select('id', { count: 'exact' })
        .eq('property_id', propertyId)
        .eq('status', 'DONE')
        .gte('scheduled_date', weekFrom)
        .lte('scheduled_date', today),
      supabase
        .from('cleaning_jobs')
        .select('id', { count: 'exact' })
        .eq('property_id', propertyId)
        .gte('scheduled_date', today)
        .lte('scheduled_date', nextWeek)
        .not('status', 'in', '(CANCELLED)'),
    ])

    if (todayRes.error) throw todayRes.error
    if (pendingRes.error) throw pendingRes.error
    if (doneRes.error) throw doneRes.error
    if (next7Res.error) throw next7Res.error

    const todayUrgent = (todayRes.data ?? []).filter(j => j.priority === 'URGENT').length

    return {
      todayTotal:    todayRes.count  ?? 0,
      todayUrgent,
      pendingTotal:  pendingRes.count ?? 0,
      doneThisWeek:  doneRes.count   ?? 0,
      next7daysTotal: next7Res.count ?? 0,
    }
  },

  async createCleaningJob(data: CreateCleaningJobDto): Promise<CleaningJob> {
    const { data: row, error } = await supabase
      .from('cleaning_jobs')
      .insert({
        property_id:         data.property_id,
        unit_id:             data.unit_id,
        reservation_id:      data.reservation_id ?? null,
        rental_id:           data.rental_id ?? null,
        cleaning_service_id: data.cleaning_service_id ?? null,
        mode:                data.mode,
        origin:              data.origin,
        scheduled_date:      data.scheduled_date,
        start_time:          data.start_time ?? null,
        end_time:            data.end_time ?? null,
        duration_minutes:    data.duration_minutes ?? null,
        priority:            data.priority ?? 'MEDIUM',
        assignment_type:     data.assignment_type ?? null,
        assigned_user_id:    data.assigned_user_id ?? null,
        provider_id:         data.provider_id ?? null,
        notes_internal:      data.notes_internal ?? null,
        notes_worker:        data.notes_worker ?? null,
        estimated_cost:      data.estimated_cost ?? null,
        sale_price:          data.sale_price ?? null,
        billable:            data.billable ?? false,
      })
      .select(JOB_SELECT)
      .single()
    if (error) throw error
    return mapJob(row)
  },

  async updateCleaningJob(id: string, data: Partial<CleaningJob>): Promise<CleaningJob> {
    const { data: row, error } = await supabase
      .from('cleaning_jobs')
      .update(data)
      .eq('id', id)
      .select(JOB_SELECT)
      .single()
    if (error) throw error
    return mapJob(row)
  },

  async assignCleaningJob(id: string, assignment: AssignmentDto): Promise<CleaningJob> {
    const update: Record<string, any> = {
      assignment_type:  assignment.assignment_type,
      assigned_user_id: assignment.assignment_type === 'INTERNAL' ? (assignment.assigned_user_id ?? null) : null,
      provider_id:      assignment.assignment_type === 'EXTERNAL' ? (assignment.provider_id ?? null) : null,
      status: 'ASSIGNED',
    }
    const { data: row, error } = await supabase
      .from('cleaning_jobs')
      .update(update)
      .eq('id', id)
      .select(JOB_SELECT)
      .single()
    if (error) throw error
    return mapJob(row)
  },

  async generateJobs(): Promise<{ created: number; skipped: number }> {
    const res = await supabase.functions.invoke('generate-cleaning-jobs', { body: {} })
    if (res.error) throw new Error(res.error.message)
    return res.data
  },

  async changeStatus(id: string, currentStatus: CleaningStatus, newStatus: CleaningStatus): Promise<CleaningJob> {
    const allowed = TRANSITIONS[currentStatus]
    if (!allowed.includes(newStatus)) {
      throw new Error(`Transición no permitida: ${currentStatus} → ${newStatus}`)
    }
    const update: Record<string, any> = { status: newStatus }
    if (newStatus === 'DONE') {
      // invoice_status auto-update handled client-side (DB trigger is Phase 4)
      update.invoice_status = 'NOT_APPLICABLE'
    }
    const { data: row, error } = await supabase
      .from('cleaning_jobs')
      .update(update)
      .eq('id', id)
      .select(JOB_SELECT)
      .single()
    if (error) throw error
    return mapJob(row)
  },
}

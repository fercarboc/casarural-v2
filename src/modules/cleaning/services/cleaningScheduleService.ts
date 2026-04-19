// src/modules/cleaning/services/cleaningScheduleService.ts

import { supabase } from '../../../integrations/supabase/client'
import type { CleaningSchedule } from '../types/cleaning.types'

const SCHEDULE_SELECT = `*, unidades(nombre)`

function mapSchedule(raw: any): CleaningSchedule {
  return {
    ...raw,
    unit_name: raw.unidades?.nombre ?? null,
  }
}

interface ScheduleFilters {
  unit_id?:   string
  rental_id?: string
  active?:    boolean
  frequency?: CleaningSchedule['frequency']
}

interface CreateScheduleDto {
  property_id:         string
  unit_id:             string
  rental_id:           string
  cleaning_service_id?: string | null
  frequency:           CleaningSchedule['frequency']
  days_of_week?:       string[] | null
  interval_weeks?:     number | null
  start_date:          string
  end_date?:           string | null
  preferred_time?:     string | null
  duration_minutes?:   number | null
  assignment_type?:    CleaningSchedule['assignment_type']
  assigned_user_id?:   string | null
  provider_id?:        string | null
  billable?:           boolean
  price?:              number | null
}

export const cleaningScheduleService = {
  async getSchedules(propertyId: string, filters: ScheduleFilters = {}): Promise<CleaningSchedule[]> {
    let q = supabase
      .from('cleaning_schedules')
      .select(SCHEDULE_SELECT)
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })

    if (filters.unit_id)   q = q.eq('unit_id', filters.unit_id)
    if (filters.rental_id) q = q.eq('rental_id', filters.rental_id)
    if (filters.active !== undefined) q = q.eq('active', filters.active)
    if (filters.frequency) q = q.eq('frequency', filters.frequency)

    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map(mapSchedule)
  },

  async createSchedule(data: CreateScheduleDto): Promise<CleaningSchedule> {
    const { data: row, error } = await supabase
      .from('cleaning_schedules')
      .insert(data)
      .select(SCHEDULE_SELECT)
      .single()
    if (error) throw error
    return mapSchedule(row)
  },

  async updateSchedule(id: string, data: Partial<CleaningSchedule>): Promise<CleaningSchedule> {
    const { data: row, error } = await supabase
      .from('cleaning_schedules')
      .update(data)
      .eq('id', id)
      .select(SCHEDULE_SELECT)
      .single()
    if (error) throw error
    return mapSchedule(row)
  },

  async toggleSchedule(id: string, active: boolean): Promise<void> {
    const { error } = await supabase
      .from('cleaning_schedules')
      .update({ active })
      .eq('id', id)
    if (error) throw error
  },

  async deleteSchedule(id: string): Promise<void> {
    const { count } = await supabase
      .from('cleaning_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('rental_id', id) // jobs linked via rental
    if ((count ?? 0) > 0) {
      throw new Error('No se puede eliminar un schedule con jobs generados. Desactívalo en su lugar.')
    }
    const { error } = await supabase
      .from('cleaning_schedules')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}

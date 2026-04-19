// src/modules/cleaning/types/cleaning.types.ts

export type CleaningMode = 'SHORT_STAY' | 'LONG_STAY'
export type CleaningOrigin = 'AUTO_CHECKOUT' | 'AUTO_PROGRAMMED' | 'MANUAL' | 'EXTRA_REQUEST'
export type CleaningPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type CleaningStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | 'NO_ACCESS'
export type AssignmentType = 'INTERNAL' | 'EXTERNAL'
export type InvoiceStatus = 'NOT_APPLICABLE' | 'PENDING' | 'INVOICED'
export type ScheduleFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'
export type ServiceMode = 'SHORT_STAY' | 'LONG_STAY' | 'BOTH'

export interface CleaningJob {
  id: string
  property_id: string
  unit_id: string
  reservation_id: string | null
  rental_id: string | null
  cleaning_service_id: string | null
  mode: CleaningMode
  origin: CleaningOrigin
  scheduled_date: string
  start_time: string | null
  end_time: string | null
  duration_minutes: number | null
  priority: CleaningPriority
  assignment_type: AssignmentType | null
  assigned_user_id: string | null
  provider_id: string | null
  status: CleaningStatus
  notes_internal: string | null
  notes_worker: string | null
  estimated_cost: number | null
  sale_price: number | null
  billable: boolean
  invoice_status: InvoiceStatus
  created_at: string
  updated_at: string
  // Joined
  unit_name?: string
  staff_name?: string
  provider_name?: string
  service_name?: string
  reservation_codigo?: string
}

export interface CleaningService {
  id: string
  property_id: string
  name: string
  description: string | null
  mode: ServiceMode
  duration_minutes: number | null
  price: number | null
  billable: boolean
  active: boolean
  created_at: string
}

export interface CleaningSchedule {
  id: string
  property_id: string
  unit_id: string
  rental_id: string
  cleaning_service_id: string | null
  frequency: ScheduleFrequency
  days_of_week: string[] | null
  interval_weeks: number | null
  start_date: string
  end_date: string | null
  preferred_time: string | null
  duration_minutes: number | null
  assignment_type: AssignmentType | null
  assigned_user_id: string | null
  provider_id: string | null
  billable: boolean
  price: number | null
  active: boolean
  created_at: string
  // Joined
  unit_name?: string
}

export interface CleaningStaff {
  id: string
  property_id: string
  name: string
  phone: string | null
  email: string | null
  active: boolean
  created_at: string
}

export interface CleaningProvider {
  id: string
  property_id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  notes: string | null
  active: boolean
  created_at: string
}

export interface CleaningDashboardKPIs {
  todayTotal: number
  todayUrgent: number
  pendingTotal: number
  doneThisWeek: number
  next7daysTotal: number
}

export interface CreateCleaningJobDto {
  property_id: string
  unit_id: string
  reservation_id?: string | null
  rental_id?: string | null
  cleaning_service_id?: string | null
  mode: CleaningMode
  origin: CleaningOrigin
  scheduled_date: string
  start_time?: string | null
  end_time?: string | null
  duration_minutes?: number | null
  priority?: CleaningPriority
  assignment_type?: AssignmentType | null
  assigned_user_id?: string | null
  provider_id?: string | null
  notes_internal?: string | null
  notes_worker?: string | null
  estimated_cost?: number | null
  sale_price?: number | null
  billable?: boolean
}

export interface AssignmentDto {
  assignment_type: AssignmentType
  assigned_user_id?: string | null
  provider_id?: string | null
}

export interface CleaningJobFilters {
  mode?: CleaningMode
  status?: CleaningStatus | 'ALL'
  unit_id?: string
  date_from?: string
  date_to?: string
  priority?: CleaningPriority
}

export const STATUS_TRANSITIONS: Record<CleaningStatus, CleaningStatus[]> = {
  PENDING:     ['ASSIGNED', 'CANCELLED'],
  ASSIGNED:    ['IN_PROGRESS', 'PENDING', 'CANCELLED'],
  IN_PROGRESS: ['DONE', 'NO_ACCESS', 'CANCELLED'],
  DONE:        [],
  NO_ACCESS:   ['PENDING'],
  CANCELLED:   [],
}

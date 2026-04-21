// supabase/functions/generate-cleaning-jobs/index.ts
// Generates cleaning_jobs from active cleaning_schedules for LONG rentals.
// Called daily by cron. Also callable manually (POST with no body).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// How many days ahead to generate jobs
const HORIZON_DAYS = 30

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Day-of-week map: JS getDay() → our string keys
const DOW_MAP: Record<number, string> = {
  0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT',
}

function computeDates(
  schedule: {
    frequency: string
    start_date: string
    end_date: string | null
    days_of_week: string[] | null
    interval_weeks: number | null
  },
  horizonEnd: Date,
): string[] {
  const start = new Date(schedule.start_date)
  const end = schedule.end_date ? new Date(schedule.end_date) : horizonEnd
  const effectiveEnd = end < horizonEnd ? end : horizonEnd
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dates: string[] = []

  if (schedule.frequency === 'WEEKLY' || schedule.frequency === 'BIWEEKLY') {
    const intervalDays = schedule.frequency === 'BIWEEKLY' ? 14 : 7
    const allowedDays = schedule.days_of_week ?? null

    // Find the first occurrence on or after today
    let cursor = start < today ? today : start

    // Align cursor to an allowed day if days_of_week is specified
    if (allowedDays && allowedDays.length > 0) {
      // Walk cursor forward until it hits an allowed day
      for (let i = 0; i < 7; i++) {
        if (allowedDays.includes(DOW_MAP[cursor.getDay()])) break
        cursor = addDays(cursor, 1)
      }
    }

    while (cursor <= effectiveEnd) {
      dates.push(toIso(cursor))
      cursor = addDays(cursor, intervalDays)
    }
  } else if (schedule.frequency === 'MONTHLY') {
    // Same day-of-month as start_date, each month
    const dayOfMonth = start.getDate()
    let cursor = new Date(today.getFullYear(), today.getMonth(), dayOfMonth)
    if (cursor < today) {
      cursor.setMonth(cursor.getMonth() + 1)
    }
    while (cursor <= effectiveEnd) {
      dates.push(toIso(cursor))
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, dayOfMonth)
    }
  }

  return dates
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const horizonEnd = addDays(new Date(), HORIZON_DAYS)

    // Get all active schedules
    const { data: allSchedules, error: sErr } = await supabase
      .from('cleaning_schedules')
      .select(`
        id, property_id, unit_id, rental_id, cleaning_service_id,
        frequency, start_date, end_date, days_of_week, interval_weeks,
        preferred_time, duration_minutes, assignment_type,
        assigned_user_id, provider_id, billable, price
      `)
      .eq('active', true)

    if (sErr) throw sErr
    if (!allSchedules || allSchedules.length === 0) {
      return new Response(JSON.stringify({ ok: true, created: 0, skipped: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Filtrar sólo los que tienen alquiler en estado activo (sin depender de FK en schema cache)
    const rentalIds = [...new Set(allSchedules.map((s: any) => s.rental_id).filter(Boolean))]
    const { data: rentalsData, error: rErr } = await supabase
      .from('rentals').select('id, estado').in('id', rentalIds)
      .in('estado', ['APROBADO', 'ACTIVO', 'RENOVADO'])
    if (rErr) throw rErr

    const allowedRentalIds = new Set((rentalsData ?? []).map((r: any) => r.id))
    const schedules = allSchedules.filter((s: any) => allowedRentalIds.has(s.rental_id))

    let created = 0
    let skipped = 0

    for (const schedule of schedules ?? []) {
      const dates = computeDates(schedule, horizonEnd)

      for (const date of dates) {
        // Idempotency: skip if a job already exists for this schedule+date
        const { data: existing } = await supabase
          .from('cleaning_jobs')
          .select('id')
          .eq('unit_id', schedule.unit_id)
          .eq('rental_id', schedule.rental_id)
          .eq('scheduled_date', date)
          .eq('origin', 'AUTO_PROGRAMMED')
          .maybeSingle()

        if (existing) { skipped++; continue }

        const { error: insertErr } = await supabase.from('cleaning_jobs').insert({
          property_id: schedule.property_id,
          unit_id: schedule.unit_id,
          rental_id: schedule.rental_id,
          cleaning_service_id: schedule.cleaning_service_id ?? null,
          mode: 'LONG_STAY',
          origin: 'AUTO_PROGRAMMED',
          scheduled_date: date,
          start_time: schedule.preferred_time ?? null,
          duration_minutes: schedule.duration_minutes ?? null,
          priority: 'MEDIUM',
          assignment_type: schedule.assignment_type ?? null,
          assigned_user_id: schedule.assigned_user_id ?? null,
          provider_id: schedule.provider_id ?? null,
          status: 'PENDING',
          billable: schedule.billable ?? false,
          sale_price: schedule.price ?? null,
        })

        if (insertErr) {
          console.error(`Error inserting job for schedule ${schedule.id} on ${date}:`, insertErr)
        } else {
          created++
        }
      }
    }

    console.log(`generate-cleaning-jobs: ${created} created, ${skipped} skipped`)

    return new Response(JSON.stringify({ ok: true, created, skipped }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('generate-cleaning-jobs error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

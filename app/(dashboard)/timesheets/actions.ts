'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

export type TimesheetActionState = { error?: string; success?: boolean; id?: string }

export async function clockInAction(
  jobType: 'survey' | 'construction',
  jobId: string,
  lat: number | null,
  lng: number | null,
  notes: string | null
): Promise<TimesheetActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await db
    .from('timesheets')
    .select('id')
    .eq('user_id', user.id)
    .is('clock_out_time', null)
    .limit(1)
    .maybeSingle()

  if (existing) return { error: 'Already clocked in. Please clock out first.' }

  const { data, error } = await db.from('timesheets').insert({
    user_id: user.id,
    job_type: jobType,
    job_id: jobId,
    date: today,
    clock_in_time: new Date().toISOString(),
    clock_in_lat: lat,
    clock_in_lng: lng,
    notes,
  }).select('id').single()

  if (error) return { error: error.message }
  revalidatePath('/timesheets')
  return { success: true, id: data.id }
}

export async function clockOutAction(
  timesheetId: string,
  lat: number | null,
  lng: number | null,
  photoUrl: string | null,
  notes: string | null
): Promise<TimesheetActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createServiceClient()

  const { data: ts, error: fetchError } = await db
    .from('timesheets')
    .select('user_id, clock_in_time')
    .eq('id', timesheetId)
    .single()

  if (fetchError || !ts) return { error: 'Timesheet not found' }
  if (ts.user_id !== user.id) return { error: 'Unauthorized' }

  const clockOutTime = new Date()
  const clockInTime = ts.clock_in_time ? new Date(ts.clock_in_time) : null
  const rawHours = clockInTime ? (clockOutTime.getTime() - clockInTime.getTime()) / 3600000 : 0
  const hours = isNaN(rawHours) || rawHours < 0 ? 0 : parseFloat(rawHours.toFixed(2))

  const { error } = await db.from('timesheets').update({
    clock_out_time: clockOutTime.toISOString(),
    clock_out_lat: lat,
    clock_out_lng: lng,
    hours,
    site_photo_url: photoUrl,
    notes,
  }).eq('id', timesheetId)

  if (error) return { error: error.message }
  revalidatePath('/timesheets')
  return { success: true }
}

export async function addManualTimesheetAction(
  _prev: TimesheetActionState,
  formData: FormData
): Promise<TimesheetActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createServiceClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(profile?.role ?? '')) {
    return { error: 'Only admins and managers can add manual entries' }
  }

  const schema = z.object({
    staff_id: z.string().min(1, 'Staff member is required'),
    job_type: z.enum(['survey', 'construction']),
    job_id: z.string().min(1, 'Job is required'),
    date: z.string().min(1, 'Date is required'),
    hours: z.coerce.number().min(0.1, 'Hours must be greater than 0'),
    notes: z.string().optional(),
  })

  const raw = Object.fromEntries(formData.entries())
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data, error } = await db.from('timesheets').insert({
    user_id: parsed.data.staff_id,
    job_type: parsed.data.job_type,
    job_id: parsed.data.job_id,
    date: parsed.data.date,
    hours: parsed.data.hours,
    notes: parsed.data.notes || null,
  }).select('id').single()

  if (error) return { error: error.message }
  revalidatePath('/timesheets')
  return { success: true, id: data.id }
}

export async function deleteTimesheetAction(id: string): Promise<TimesheetActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createServiceClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(profile?.role ?? '')) {
    return { error: 'Only admins and managers can delete timesheets' }
  }

  const { error } = await db.from('timesheets').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/timesheets')
  return { success: true }
}

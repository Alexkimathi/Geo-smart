'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

const surveyJobSchema = z.object({
  client_id: z.string().min(1, 'Client is required'),
  site_name: z.string().min(1, 'Site name is required'),
  county: z.string().optional(),
  survey_type: z.enum(['Topo', 'Cadastral', 'Control', 'Setting Out']),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  notes: z.string().optional(),
})

export type JobFormState = { error?: string; success?: boolean; jobId?: string }

export async function createSurveyJobAction(
  _prev: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = surveyJobSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()
  const { data: job, error } = await db
    .from('survey_jobs')
    .insert({
      client_id: parsed.data.client_id,
      site_name: parsed.data.site_name,
      county: parsed.data.county || null,
      survey_type: parsed.data.survey_type,
      start_date: parsed.data.start_date || null,
      end_date: parsed.data.end_date || null,
      notes: parsed.data.notes || null,
      status: 'New',
      equipment_ids: [],
      team_ids: [],
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/jobs/survey')
  return { success: true, jobId: job.id }
}

export async function updateSurveyJobAction(
  jobId: string,
  _prev: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = surveyJobSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()
  const { error } = await db
    .from('survey_jobs')
    .update({
      client_id: parsed.data.client_id,
      site_name: parsed.data.site_name,
      county: parsed.data.county || null,
      survey_type: parsed.data.survey_type,
      start_date: parsed.data.start_date || null,
      end_date: parsed.data.end_date || null,
      notes: parsed.data.notes || null,
    })
    .eq('id', jobId)

  if (error) return { error: error.message }

  revalidatePath('/jobs/survey')
  revalidatePath(`/jobs/survey/${jobId}`)
  return { success: true }
}

export async function updateSurveyStatusAction(jobId: string, status: string): Promise<JobFormState> {
  const db = createServiceClient()
  const { error } = await db
    .from('survey_jobs')
    .update({ status })
    .eq('id', jobId)
  if (error) return { error: error.message }
  revalidatePath(`/jobs/survey/${jobId}`)
  revalidatePath('/jobs/survey')
  return { success: true }
}

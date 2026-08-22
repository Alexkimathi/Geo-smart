'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import { sendEmail } from '@/lib/email'
import { jobDeliveredEmailTemplate } from '@/lib/email-templates'
import { getSurveyJobNotificationRecipients } from '@/lib/get-notification-recipients'

const surveyJobSchema = z.object({
  client_id: z.string().min(1, 'Client is required'),
  site_name: z.string().min(1, 'Site name is required'),
  county: z.string().optional(),
  survey_type: z.string().min(1, 'Survey type is required'),
  quoted_amount: z.coerce.number().min(0).default(0),
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
      quoted_amount: parsed.data.quoted_amount,
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
      quoted_amount: parsed.data.quoted_amount,
      start_date: parsed.data.start_date || null,
      end_date: parsed.data.end_date || null,
      notes: parsed.data.notes || null,
    })
    .eq('id', jobId)

  if (error) return { error: error.message }

  revalidatePath('/jobs/survey')
  revalidatePath(`/jobs/survey/${jobId}`)
  return { success: true, jobId }
}

export async function deleteSurveyJobAction(jobId: string): Promise<JobFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createServiceClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'manager') return { error: 'Only admins or managers can delete jobs' }

  const { error } = await db.from('survey_jobs').delete().eq('id', jobId)
  if (error) return { error: error.message }

  revalidatePath('/jobs/survey')
  return { success: true }
}

export async function archiveSurveyJobAction(jobId: string): Promise<JobFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createServiceClient()
  const { error } = await db.from('survey_jobs').update({ is_archived: true }).eq('id', jobId)
  if (error) return { error: error.message }

  revalidatePath('/jobs/survey')
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

  if (status === 'Delivered') {
    void (async () => {
      try {
        const { data: jobData } = await db
          .from('survey_jobs')
          .select('job_no, site_name, survey_type, county, start_date, end_date')
          .eq('id', jobId)
          .single()
        const { emails, clientName } = await getSurveyJobNotificationRecipients(jobId)
        if (emails.length === 0 || !jobData) return
        const { subject, html } = jobDeliveredEmailTemplate({ ...jobData, clientName })
        await sendEmail({ to: emails, subject, html })
      } catch (err) {
        console.error('[notifications] Job Delivered email failed:', err)
      }
    })()
  }

  return { success: true }
}

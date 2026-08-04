'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

const constructionJobSchema = z.object({
  client_id: z.string().min(1, 'Client is required'),
  project_name: z.string().min(1, 'Project name is required'),
  project_type: z.enum(['House', 'Commercial', 'Road', 'Tender']),
  contract_value: z.coerce.number().min(0).optional(),
  boq_total: z.coerce.number().min(0).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  notes: z.string().optional(),
})

export type JobFormState = { error?: string; success?: boolean; jobId?: string }

export async function createConstructionJobAction(
  _prev: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = constructionJobSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()
  const { data: job, error } = await db
    .from('construction_jobs')
    .insert({
      client_id: parsed.data.client_id,
      project_name: parsed.data.project_name,
      project_type: parsed.data.project_type,
      contract_value: parsed.data.contract_value ?? 0,
      boq_total: parsed.data.boq_total ?? 0,
      start_date: parsed.data.start_date || null,
      end_date: parsed.data.end_date || null,
      notes: parsed.data.notes || null,
      status: 'Ongoing',
      progress_pct: 0,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/jobs/construction')
  return { success: true, jobId: job.id }
}

export async function updateConstructionJobAction(
  jobId: string,
  _prev: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = constructionJobSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()
  const { error } = await db
    .from('construction_jobs')
    .update({
      client_id: parsed.data.client_id,
      project_name: parsed.data.project_name,
      project_type: parsed.data.project_type,
      contract_value: parsed.data.contract_value ?? 0,
      boq_total: parsed.data.boq_total ?? 0,
      start_date: parsed.data.start_date || null,
      end_date: parsed.data.end_date || null,
      notes: parsed.data.notes || null,
    })
    .eq('id', jobId)

  if (error) return { error: error.message }

  revalidatePath('/jobs/construction')
  revalidatePath(`/jobs/construction/${jobId}`)
  return { success: true }
}

export async function updateProgressAction(jobId: string, progress: number): Promise<JobFormState> {
  const db = createServiceClient()
  const { error } = await db
    .from('construction_jobs')
    .update({ progress_pct: progress })
    .eq('id', jobId)
  if (error) return { error: error.message }
  revalidatePath(`/jobs/construction/${jobId}`)
  return { success: true }
}

export async function updateConstructionStatusAction(jobId: string, status: string): Promise<JobFormState> {
  const db = createServiceClient()
  const { error } = await db
    .from('construction_jobs')
    .update({ status })
    .eq('id', jobId)
  if (error) return { error: error.message }
  revalidatePath(`/jobs/construction/${jobId}`)
  revalidatePath('/jobs/construction')
  return { success: true }
}

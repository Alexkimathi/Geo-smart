'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function addJobNoteAction(
  jobId: string,
  jobType: 'survey' | 'construction',
  content: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const trimmed = content.trim()
  if (!trimmed) return { error: 'Note cannot be empty' }

  const db = createServiceClient()
  const { error } = await db.from('job_notes').insert({
    job_id: jobId,
    job_type: jobType,
    content: trimmed,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath(`/jobs/${jobType}/${jobId}`)
  return { success: true }
}

export async function deleteJobNoteAction(
  noteId: string,
  jobId: string,
  jobType: 'survey' | 'construction'
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createServiceClient()

  // Only the note author or an admin can delete
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  const { data: note } = await db.from('job_notes').select('created_by').eq('id', noteId).single()

  if (note?.created_by !== user.id && profile?.role !== 'admin') {
    return { error: 'You can only delete your own notes' }
  }

  const { error } = await db.from('job_notes').delete().eq('id', noteId)
  if (error) return { error: error.message }

  revalidatePath(`/jobs/${jobType}/${jobId}`)
  return { success: true }
}

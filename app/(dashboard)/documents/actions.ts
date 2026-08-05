'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export type DocumentFormState = { error?: string; success?: boolean }

export async function createDocumentAction(
  name: string,
  category: string,
  fileUrl: string,
  fileSize: number | null,
  mimeType: string | null,
  jobType: 'survey' | 'construction' | null,
  jobId: string | null,
  clientId: string | null
): Promise<DocumentFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createServiceClient()
  const { error } = await db.from('documents').insert({
    name,
    category,
    file_url: fileUrl,
    file_size: fileSize,
    mime_type: mimeType,
    job_type: jobType,
    job_id: jobId || null,
    client_id: clientId || null,
    uploaded_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/documents')
  return { success: true }
}

export async function deleteDocumentAction(
  id: string,
  filePath: string
): Promise<DocumentFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createServiceClient()

  // Delete file from storage
  const { error: storageErr } = await db.storage
    .from('documents')
    .remove([filePath])

  if (storageErr) return { error: storageErr.message }

  // Delete row
  const { error } = await db.from('documents').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/documents')
  return { success: true }
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function updateProfileAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const full_name = (formData.get('full_name') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim()

  if (!full_name) return { error: 'Name is required' }

  const db = createServiceClient()
  const { error } = await db
    .from('profiles')
    .update({ full_name, phone: phone || null })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/settings/account')
  return { success: true }
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import type { UserRole } from '@/types/database'

const VALID_ROLES: UserRole[] = ['admin', 'manager', 'surveyor', 'site_engineer', 'accountant']

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(2, 'Full name is required'),
  role: z.enum(['admin', 'manager', 'surveyor', 'site_engineer', 'accountant']),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createServiceClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'manager') return null
  return user
}

export async function createUserAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const admin = await requireAdmin()
  if (!admin) return { error: 'Only admins can create users' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = createUserSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()

  // Create user via Supabase Admin API
  const { data: created, error: createError } = await db.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  })

  if (createError) return { error: createError.message }
  if (!created.user) return { error: 'User creation failed' }

  // Upsert profile with role and details
  const { error: profileError } = await db.from('profiles').upsert({
    id: created.user.id,
    email: parsed.data.email,
    full_name: parsed.data.full_name,
    role: parsed.data.role,
    phone: parsed.data.phone || null,
  })

  if (profileError) {
    if (profileError.message.includes('role_check') || profileError.message.includes('check constraint')) {
      return { error: 'Please select a valid role.' }
    }
    return { error: 'User account was created but profile setup failed. Please contact support.' }
  }

  revalidatePath('/settings/users')
  return { success: true }
}

export async function updateUserRoleAction(
  userId: string,
  role: UserRole
): Promise<{ error?: string; success?: boolean }> {
  const admin = await requireAdmin()
  if (!admin) return { error: 'Only admins can change roles' }
  if (!VALID_ROLES.includes(role)) return { error: 'Invalid role' }

  const db = createServiceClient()
  const { error } = await db.from('profiles').update({ role }).eq('id', userId)
  if (error) return { error: error.message }

  revalidatePath('/settings/users')
  return { success: true }
}

export async function updateUserAction(
  userId: string,
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const admin = await requireAdmin()
  if (!admin) return { error: 'Only admins can edit users' }

  const full_name = formData.get('full_name') as string
  const role = formData.get('role') as UserRole | null
  const phone = formData.get('phone') as string

  if (!full_name?.trim()) return { error: 'Full name is required' }
  if (role !== null && !VALID_ROLES.includes(role)) return { error: 'Please select a valid role.' }

  const updateData: Record<string, unknown> = {
    full_name: full_name.trim(),
    phone: phone || null,
  }
  if (role !== null) updateData.role = role

  const db = createServiceClient()
  const { error } = await db
    .from('profiles')
    .update(updateData)
    .eq('id', userId)

  if (error) {
    if (error.message.includes('role_check') || error.message.includes('check constraint')) {
      return { error: 'Please select a valid role.' }
    }
    return { error: 'Failed to save changes. Please try again.' }
  }

  revalidatePath('/settings/users')
  return { success: true }
}

export async function deleteUserAction(
  userId: string
): Promise<{ error?: string; success?: boolean }> {
  const admin = await requireAdmin()
  if (!admin) return { error: 'Only admins can delete users' }
  if (userId === admin.id) return { error: 'You cannot delete your own account' }

  const db = createServiceClient()
  const { error } = await db.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  revalidatePath('/settings/users')
  return { success: true }
}

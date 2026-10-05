'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

const bankAccountSchema = z.object({
  account_name: z.string().min(1, 'Account name is required'),
  bank_name: z.string().min(1, 'Bank name is required'),
  branch: z.string().optional(),
  account_no: z.string().min(1, 'Account number is required'),
  currency: z.string().optional(),
  swift_code: z.string().optional(),
  bank_code: z.string().optional(),
  branch_code: z.string().optional(),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_active: z.preprocess(v => v === 'on' || v === 'true' || v === true, z.boolean()).default(true),
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

export async function createBankAccountAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const admin = await requireAdmin()
  if (!admin) return { error: 'Only admins or managers can manage bank accounts' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = bankAccountSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()
  const { error } = await db.from('bank_accounts').insert({
    account_name: parsed.data.account_name,
    bank_name: parsed.data.bank_name,
    branch: parsed.data.branch || null,
    account_no: parsed.data.account_no,
    currency: parsed.data.currency || null,
    swift_code: parsed.data.swift_code || null,
    bank_code: parsed.data.bank_code || null,
    branch_code: parsed.data.branch_code || null,
    sort_order: parsed.data.sort_order,
    is_active: parsed.data.is_active,
    created_by: admin.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/settings/bank-accounts')
  return { success: true }
}

export async function updateBankAccountAction(
  id: string,
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const admin = await requireAdmin()
  if (!admin) return { error: 'Only admins or managers can manage bank accounts' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = bankAccountSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()
  const { error } = await db.from('bank_accounts').update({
    account_name: parsed.data.account_name,
    bank_name: parsed.data.bank_name,
    branch: parsed.data.branch || null,
    account_no: parsed.data.account_no,
    currency: parsed.data.currency || null,
    swift_code: parsed.data.swift_code || null,
    bank_code: parsed.data.bank_code || null,
    branch_code: parsed.data.branch_code || null,
    sort_order: parsed.data.sort_order,
    is_active: parsed.data.is_active,
  }).eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/settings/bank-accounts')
  return { success: true }
}

export async function deleteBankAccountAction(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const admin = await requireAdmin()
  if (!admin) return { error: 'Only admins or managers can manage bank accounts' }

  const db = createServiceClient()
  const { error } = await db.from('bank_accounts').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/settings/bank-accounts')
  return { success: true }
}

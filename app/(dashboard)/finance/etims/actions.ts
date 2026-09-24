'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

export type EtimsFormState = { error?: string; success?: boolean; docId?: string }

const etimsDocumentSchema = z.object({
  invoice_no: z.string().min(1, 'Invoice number is required'),
  invoice_date: z.string().min(1, 'Invoice date is required'),
  seller_pin: z.string().min(1, 'Seller PIN is required'),
  seller_name: z.string().min(1, 'Seller name is required'),
  client_id: z.string().optional(),
  buyer_pin: z.string().default(''),
  buyer_name: z.string().min(1, 'Buyer name is required'),
  line_items: z.string().transform((v) => {
    try { return JSON.parse(v) } catch { return [] }
  }),
  scu_id: z.string().optional(),
  cu_invoice_no: z.string().optional(),
  internal_data: z.string().optional(),
  receipt_signature: z.string().optional(),
  qr_code_data: z.string().optional(),
  status: z.enum(['Draft', 'Final']).default('Draft'),
})

export async function createEtimsDocumentAction(
  _prev: EtimsFormState,
  formData: FormData
): Promise<EtimsFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = etimsDocumentSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const {
    invoice_no, invoice_date, seller_pin, seller_name,
    client_id, buyer_pin, buyer_name, line_items,
    scu_id, cu_invoice_no, internal_data, receipt_signature, qr_code_data, status,
  } = parsed.data

  const db = createServiceClient()
  const { data, error } = await db
    .from('etims_documents')
    .insert({
      invoice_no, invoice_date, seller_pin, seller_name,
      client_id: client_id || null,
      buyer_pin, buyer_name, line_items,
      scu_id: scu_id || null,
      cu_invoice_no: cu_invoice_no || null,
      internal_data: internal_data || null,
      receipt_signature: receipt_signature || null,
      qr_code_data: qr_code_data || null,
      status, created_by: user.id,
    })
    .select('id').single()

  if (error) return { error: error.message }

  revalidatePath('/finance/etims')
  return { success: true, docId: data.id }
}

export async function updateEtimsDocumentAction(
  id: string,
  _prev: EtimsFormState,
  formData: FormData
): Promise<EtimsFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = etimsDocumentSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const {
    invoice_no, invoice_date, seller_pin, seller_name,
    client_id, buyer_pin, buyer_name, line_items,
    scu_id, cu_invoice_no, internal_data, receipt_signature, qr_code_data, status,
  } = parsed.data

  const db = createServiceClient()
  const { error } = await db
    .from('etims_documents')
    .update({
      invoice_no, invoice_date, seller_pin, seller_name,
      client_id: client_id || null,
      buyer_pin, buyer_name, line_items,
      scu_id: scu_id || null,
      cu_invoice_no: cu_invoice_no || null,
      internal_data: internal_data || null,
      receipt_signature: receipt_signature || null,
      qr_code_data: qr_code_data || null,
      status, updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/finance/etims')
  revalidatePath(`/finance/etims/${id}`)
  return { success: true, docId: id }
}

export async function deleteEtimsDocumentAction(id: string): Promise<EtimsFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createServiceClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'manager') {
    return { error: 'Only admins or managers can delete eTIMS documents' }
  }

  const { error } = await db.from('etims_documents').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/finance/etims')
  return { success: true }
}

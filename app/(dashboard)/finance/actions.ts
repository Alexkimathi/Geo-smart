'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import type { FinanceDocType, FinanceDocStatus } from '@/types/database'

// ─── Shared Types ────────────────────────────────────────────
export type FinanceFormState = { error?: string; success?: boolean; docId?: string }

// ─── Validation Schemas ──────────────────────────────────────
const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().min(0),
  unit: z.string().default(''),
  unit_price: z.coerce.number().min(0),
  amount: z.coerce.number().min(0),
})

const documentSchema = z.object({
  client_id: z.string().optional(),
  job_type: z.enum(['survey', 'construction']).optional(),
  job_id: z.string().optional(),
  due_date: z.string().optional(),
  tax: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  line_items: z.string().transform((v) => {
    try { return JSON.parse(v) } catch { return [] }
  }),
})

const paymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  method: z.enum(['Cash', 'Bank Transfer', 'M-Pesa', 'Cheque', 'Other']),
  payment_date: z.string().min(1, 'Payment date is required'),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

const expenseSchema = z.object({
  job_type: z.enum(['survey', 'construction']).optional(),
  job_id: z.string().optional(),
  category: z.enum(['Labour', 'Materials', 'Transport', 'Fuel', 'Equipment', 'Other']),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  expense_date: z.string().min(1, 'Date is required'),
  receipt_url: z.string().optional(),
})

// ─── Helpers ─────────────────────────────────────────────────
function calcTotals(lineItems: unknown[], taxPct: number) {
  const items = lineItems.map((i) => lineItemSchema.safeParse(i))
  const subtotal = items.reduce((sum, r) => sum + (r.success ? r.data.amount : 0), 0)
  const total = subtotal * (1 + taxPct / 100)
  return { amount: subtotal, total }
}

// ─── Document Actions ─────────────────────────────────────────

export async function createDocumentAction(
  type: FinanceDocType,
  _prev: FinanceFormState,
  formData: FormData
): Promise<FinanceFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = documentSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { tax, line_items, client_id, job_type, job_id, due_date, notes } = parsed.data
  const { amount, total } = calcTotals(line_items as unknown[], tax)

  const db = createServiceClient()
  const { data: doc, error } = await db
    .from('finance_documents')
    .insert({
      type,
      doc_no: '',          // trigger will set this
      client_id: client_id || null,
      job_type: job_type || null,
      job_id: job_id || null,
      due_date: due_date || null,
      tax,
      amount,
      total,
      line_items,
      notes: notes || null,
      status: 'Draft',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/finance/quotations')
  revalidatePath('/finance/invoices')
  return { success: true, docId: doc.id }
}

export async function updateDocumentAction(
  id: string,
  _prev: FinanceFormState,
  formData: FormData
): Promise<FinanceFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = documentSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { tax, line_items, client_id, job_type, job_id, due_date, notes } = parsed.data
  const { amount, total } = calcTotals(line_items as unknown[], tax)

  const db = createServiceClient()
  const { error } = await db
    .from('finance_documents')
    .update({
      client_id: client_id || null,
      job_type: job_type || null,
      job_id: job_id || null,
      due_date: due_date || null,
      tax,
      amount,
      total,
      line_items,
      notes: notes || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/finance/quotations')
  revalidatePath('/finance/invoices')
  revalidatePath(`/finance/quotations/${id}`)
  revalidatePath(`/finance/invoices/${id}`)
  return { success: true, docId: id }
}

export async function updateDocumentStatusAction(
  id: string,
  status: FinanceDocStatus
): Promise<FinanceFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const update: Record<string, unknown> = { status }
  if (status === 'Paid') update.paid_date = new Date().toISOString().split('T')[0]

  const db = createServiceClient()
  const { error } = await db.from('finance_documents').update(update).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/finance/invoices')
  revalidatePath('/finance/quotations')
  revalidatePath(`/finance/invoices/${id}`)
  revalidatePath(`/finance/quotations/${id}`)
  return { success: true }
}

export async function convertQuotationAction(quotationId: string): Promise<FinanceFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createServiceClient()

  // Fetch the quotation
  const { data: quotation, error: fetchErr } = await db
    .from('finance_documents')
    .select('*')
    .eq('id', quotationId)
    .eq('type', 'Quotation')
    .single()

  if (fetchErr || !quotation) return { error: 'Quotation not found' }
  if (quotation.converted_to) return { error: 'Already converted to an invoice' }

  // Create invoice from quotation
  const { data: invoice, error: insertErr } = await db
    .from('finance_documents')
    .insert({
      type: 'Invoice',
      doc_no: '',
      client_id: quotation.client_id,
      job_type: quotation.job_type,
      job_id: quotation.job_id,
      due_date: quotation.due_date,
      tax: quotation.tax,
      amount: quotation.amount,
      total: quotation.total,
      line_items: quotation.line_items,
      notes: quotation.notes,
      status: 'Draft',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (insertErr) return { error: insertErr.message }

  // Mark quotation as converted
  await db
    .from('finance_documents')
    .update({ converted_to: invoice.id, status: 'Sent' })
    .eq('id', quotationId)

  revalidatePath('/finance/quotations')
  revalidatePath('/finance/invoices')
  revalidatePath(`/finance/quotations/${quotationId}`)
  return { success: true, docId: invoice.id }
}

export async function deleteDocumentAction(id: string): Promise<FinanceFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createServiceClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Only admins can delete documents' }

  const { error } = await db.from('finance_documents').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/finance/quotations')
  revalidatePath('/finance/invoices')
  return { success: true }
}

// ─── Payment Actions ──────────────────────────────────────────

export async function recordPaymentAction(
  invoiceId: string,
  _prev: FinanceFormState,
  formData: FormData
): Promise<FinanceFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = paymentSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()

  const { error: payErr } = await db.from('payments').insert({
    invoice_id: invoiceId,
    amount: parsed.data.amount,
    method: parsed.data.method,
    payment_date: parsed.data.payment_date,
    reference: parsed.data.reference || null,
    notes: parsed.data.notes || null,
    recorded_by: user.id,
  })

  if (payErr) return { error: payErr.message }

  // Check if invoice is fully paid
  const [{ data: invoice }, { data: payments }] = await Promise.all([
    db.from('finance_documents').select('total').eq('id', invoiceId).single(),
    db.from('payments').select('amount').eq('invoice_id', invoiceId),
  ])

  if (invoice && payments) {
    const totalPaid = payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
    if (totalPaid >= invoice.total) {
      await db
        .from('finance_documents')
        .update({ status: 'Paid', paid_date: parsed.data.payment_date })
        .eq('id', invoiceId)
    }
  }

  revalidatePath(`/finance/invoices/${invoiceId}`)
  revalidatePath('/finance/invoices')
  revalidatePath('/finance/payments')
  return { success: true }
}

export async function updatePaymentAction(
  paymentId: string,
  invoiceId: string,
  _prev: FinanceFormState,
  formData: FormData
): Promise<FinanceFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = paymentSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()
  const { error } = await db.from('payments').update({
    amount: parsed.data.amount,
    method: parsed.data.method,
    payment_date: parsed.data.payment_date,
    reference: parsed.data.reference || null,
    notes: parsed.data.notes || null,
  }).eq('id', paymentId)

  if (error) return { error: error.message }

  // Recalculate invoice paid status
  const [{ data: invoice }, { data: payments }] = await Promise.all([
    db.from('finance_documents').select('total, status').eq('id', invoiceId).single(),
    db.from('payments').select('amount').eq('invoice_id', invoiceId),
  ])

  if (invoice && payments) {
    const totalPaid = payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
    if (totalPaid >= invoice.total && invoice.status !== 'Paid') {
      await db.from('finance_documents')
        .update({ status: 'Paid', paid_date: parsed.data.payment_date })
        .eq('id', invoiceId)
    } else if (totalPaid < invoice.total && invoice.status === 'Paid') {
      await db.from('finance_documents')
        .update({ status: 'Sent', paid_date: null })
        .eq('id', invoiceId)
    }
  }

  revalidatePath(`/finance/invoices/${invoiceId}`)
  revalidatePath('/finance/invoices')
  revalidatePath('/finance/payments')
  return { success: true }
}

export async function deletePaymentAction(
  paymentId: string,
  invoiceId: string
): Promise<FinanceFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createServiceClient()
  const { error } = await db.from('payments').delete().eq('id', paymentId)
  if (error) return { error: error.message }

  // Recalculate invoice status — if it was Paid, revert to Sent
  const [{ data: invoice }, { data: remaining }] = await Promise.all([
    db.from('finance_documents').select('total, status').eq('id', invoiceId).single(),
    db.from('payments').select('amount').eq('invoice_id', invoiceId),
  ])

  if (invoice && invoice.status === 'Paid') {
    const totalPaid = (remaining ?? []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
    if (totalPaid < invoice.total) {
      await db.from('finance_documents')
        .update({ status: 'Sent', paid_date: null })
        .eq('id', invoiceId)
    }
  }

  revalidatePath(`/finance/invoices/${invoiceId}`)
  revalidatePath('/finance/invoices')
  revalidatePath('/finance/payments')
  return { success: true }
}

// ─── LPO Actions ─────────────────────────────────────────────

const lpoLineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().min(0),
  unit: z.string().default(''),
  unit_price: z.coerce.number().min(0),
  amount: z.coerce.number().min(0),
})

const lpoSchema = z.object({
  supplier_name: z.string().min(1, 'Supplier name is required'),
  job_type: z.enum(['survey', 'construction']).optional(),
  job_id: z.string().optional(),
  issued_date: z.string().optional(),
  tax: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  items: z.string().transform((v) => { try { return JSON.parse(v) } catch { return [] } }),
})

function calcLpoTotals(items: unknown[], taxPct: number) {
  const parsed = (items as unknown[]).map((i) => lpoLineItemSchema.safeParse(i))
  const subtotal = parsed.reduce((sum, r) => sum + (r.success ? r.data.amount : 0), 0)
  const total = subtotal * (1 + taxPct / 100)
  return { subtotal, total }
}

export async function createLpoAction(
  _prev: FinanceFormState,
  formData: FormData
): Promise<FinanceFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = lpoSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { tax, items, supplier_name, job_type, job_id, issued_date, notes } = parsed.data
  const { subtotal, total } = calcLpoTotals(items as unknown[], tax)

  const db = createServiceClient()
  const { data: lpo, error } = await db.from('lpos').insert({
    lpo_no: '',
    supplier_name,
    job_type: job_type || null,
    job_id: job_id || null,
    items,
    subtotal,
    tax,
    total,
    issued_date: issued_date || null,
    notes: notes || null,
    status: 'Draft',
    created_by: user.id,
  }).select('id').single()

  if (error) return { error: error.message }

  revalidatePath('/finance/lpos')
  return { success: true, docId: lpo.id }
}

export async function updateLpoAction(
  id: string,
  _prev: FinanceFormState,
  formData: FormData
): Promise<FinanceFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = lpoSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { tax, items, supplier_name, job_type, job_id, issued_date, notes } = parsed.data
  const { subtotal, total } = calcLpoTotals(items as unknown[], tax)

  const db = createServiceClient()
  const { error } = await db.from('lpos').update({
    supplier_name, job_type: job_type || null, job_id: job_id || null,
    items, subtotal, tax, total, issued_date: issued_date || null, notes: notes || null,
  }).eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/finance/lpos')
  revalidatePath(`/finance/lpos/${id}`)
  return { success: true, docId: id }
}

export async function updateLpoStatusAction(
  id: string,
  status: 'Draft' | 'Sent' | 'Received' | 'Cancelled'
): Promise<FinanceFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createServiceClient()
  const { error } = await db.from('lpos').update({ status }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/finance/lpos')
  revalidatePath(`/finance/lpos/${id}`)
  return { success: true }
}

export async function deleteLpoAction(id: string): Promise<FinanceFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createServiceClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Only admins can delete LPOs' }

  const { error } = await db.from('lpos').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/finance/lpos')
  return { success: true }
}

// ─── BOQ Actions ──────────────────────────────────────────────

export async function saveBoqAction(
  jobId: string,
  jobType: 'survey' | 'construction',
  items: { id?: string; description: string; unit: string; quantity: number; unit_rate: number; amount: number; sort_order: number }[]
): Promise<FinanceFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createServiceClient()

  // Delete existing items then re-insert (simplest approach for reordering)
  const { error: delErr } = await db.from('boq_items').delete().eq('job_id', jobId).eq('job_type', jobType)
  if (delErr) return { error: delErr.message }

  if (items.length > 0) {
    const { error: insErr } = await db.from('boq_items').insert(
      items.map((item, i) => ({
        job_id: jobId, job_type: jobType,
        description: item.description, unit: item.unit,
        quantity: item.quantity, unit_rate: item.unit_rate,
        amount: item.amount, sort_order: i,
      }))
    )
    if (insErr) return { error: insErr.message }
  }

  revalidatePath(`/jobs/${jobType}/${jobId}`)
  return { success: true }
}

// ─── Expense Actions ──────────────────────────────────────────

export async function createExpenseAction(
  _prev: FinanceFormState,
  formData: FormData
): Promise<FinanceFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = expenseSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()
  const { error } = await db.from('expenses').insert({
    job_type: parsed.data.job_type || null,
    job_id: parsed.data.job_id || null,
    category: parsed.data.category,
    description: parsed.data.description,
    amount: parsed.data.amount,
    expense_date: parsed.data.expense_date,
    receipt_url: parsed.data.receipt_url || null,
    recorded_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/finance/expenses')
  return { success: true }
}

export async function deleteExpenseAction(id: string): Promise<FinanceFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createServiceClient()

  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  const { data: expense } = await db.from('expenses').select('recorded_by').eq('id', id).single()

  if (profile?.role !== 'admin' && expense?.recorded_by !== user.id) {
    return { error: 'You can only delete your own expenses' }
  }

  const { error } = await db.from('expenses').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/finance/expenses')
  return { success: true }
}

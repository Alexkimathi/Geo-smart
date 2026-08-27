'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

// ── Helpers ──────────────────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function getRole(userId: string) {
  const db = createServiceClient()
  const { data } = await db.from('profiles').select('role').eq('id', userId).single()
  return data?.role as string | undefined
}

function isAdminOrManager(role: string | undefined) {
  return role === 'admin' || role === 'manager'
}

// ============================================================
// PROJECTS
// ============================================================

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  location: z.string().min(1, 'Location is required'),
  county: z.string().min(1, 'County is required'),
  description: z.string().optional(),
  status: z.enum(['active', 'completed']).default('active'),
})

export type PlotFormState = { error?: string; success?: boolean; id?: string }

export async function createProjectAction(
  _prev: PlotFormState,
  formData: FormData
): Promise<PlotFormState> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }
  const role = await getRole(user.id)
  if (!isAdminOrManager(role)) return { error: 'Only admin or manager can create projects' }

  const parsed = projectSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()
  const { data, error } = await db
    .from('plot_projects')
    .insert({ ...parsed.data, created_by: user.id })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/plots/projects')
  return { success: true, id: data.id }
}

export async function updateProjectAction(
  id: string,
  _prev: PlotFormState,
  formData: FormData
): Promise<PlotFormState> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }
  const role = await getRole(user.id)
  if (!isAdminOrManager(role)) return { error: 'Only admin or manager can edit projects' }

  const parsed = projectSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()
  const { error } = await db.from('plot_projects').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/plots/projects')
  revalidatePath(`/plots/projects/${id}`)
  return { success: true }
}

export async function deleteProjectAction(id: string): Promise<PlotFormState> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }
  const role = await getRole(user.id)
  if (!isAdminOrManager(role)) return { error: 'Only admin or manager can delete projects' }

  const db = createServiceClient()
  const { error } = await db.from('plot_projects').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/plots/projects')
  return { success: true }
}

// ============================================================
// PLOTS
// ============================================================

const plotSchema = z.object({
  plot_no: z.string().min(1, 'Plot number is required'),
  size_desc: z.string().optional(),
  area_sqm: z.coerce.number().positive().optional().nullable(),
  price: z.coerce.number().positive('Price is required'),
  gps_lat: z.coerce.number().optional().nullable(),
  gps_lng: z.coerce.number().optional().nullable(),
  title_status: z.string().optional(),
  notes: z.string().optional(),
})

export async function createPlotAction(
  projectId: string,
  _prev: PlotFormState,
  formData: FormData
): Promise<PlotFormState> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }
  const role = await getRole(user.id)
  if (!isAdminOrManager(role)) return { error: 'Only admin or manager can add plots' }

  const parsed = plotSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()
  const { data, error } = await db
    .from('plots')
    .insert({
      project_id: projectId,
      plot_no: parsed.data.plot_no,
      size_desc: parsed.data.size_desc || null,
      area_sqm: parsed.data.area_sqm ?? null,
      price: parsed.data.price,
      gps_lat: parsed.data.gps_lat ?? null,
      gps_lng: parsed.data.gps_lng ?? null,
      title_status: parsed.data.title_status || null,
      notes: parsed.data.notes || null,
      status: 'available',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { error: `Plot number "${parsed.data.plot_no}" already exists in this project` }
    return { error: error.message }
  }

  revalidatePath(`/plots/projects/${projectId}`)
  revalidatePath('/plots/plots')
  return { success: true, id: data.id }
}

export async function updatePlotAction(
  plotId: string,
  projectId: string,
  _prev: PlotFormState,
  formData: FormData
): Promise<PlotFormState> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }
  const role = await getRole(user.id)
  if (!isAdminOrManager(role)) return { error: 'Only admin or manager can edit plots' }

  const parsed = plotSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()
  const { error } = await db.from('plots').update({
    plot_no: parsed.data.plot_no,
    size_desc: parsed.data.size_desc || null,
    area_sqm: parsed.data.area_sqm ?? null,
    price: parsed.data.price,
    gps_lat: parsed.data.gps_lat ?? null,
    gps_lng: parsed.data.gps_lng ?? null,
    title_status: parsed.data.title_status || null,
    notes: parsed.data.notes || null,
  }).eq('id', plotId)

  if (error) return { error: error.message }

  revalidatePath(`/plots/projects/${projectId}`)
  revalidatePath(`/plots/plots/${plotId}`)
  return { success: true }
}

export async function deletePlotAction(plotId: string, projectId: string): Promise<PlotFormState> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }
  const role = await getRole(user.id)
  if (!isAdminOrManager(role)) return { error: 'Only admin or manager can delete plots' }

  const db = createServiceClient()
  // Prevent deletion if there are any reservations
  const { count } = await db
    .from('plot_reservations')
    .select('id', { count: 'exact', head: true })
    .eq('plot_id', plotId)
  if ((count ?? 0) > 0) return { error: 'Cannot delete a plot that has reservations' }

  const { error } = await db.from('plots').delete().eq('id', plotId)
  if (error) return { error: error.message }

  revalidatePath(`/plots/projects/${projectId}`)
  revalidatePath('/plots/plots')
  return { success: true }
}

// ── Plot photo upload/delete ─────────────────────────────────

export async function deletePhotoAction(photoId: string, plotId: string, projectId: string): Promise<PlotFormState> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }
  const role = await getRole(user.id)
  if (!isAdminOrManager(role)) return { error: 'Only admin or manager can delete photos' }

  const db = createServiceClient()
  const { data: photo } = await db.from('plot_photos').select('url').eq('id', photoId).single()
  if (photo?.url) {
    // Extract path from URL for storage deletion
    const url = new URL(photo.url)
    const pathParts = url.pathname.split('/object/public/plot-photos/')
    if (pathParts[1]) {
      const supabase = await createClient()
      await supabase.storage.from('plot-photos').remove([pathParts[1]])
    }
  }

  const { error } = await db.from('plot_photos').delete().eq('id', photoId)
  if (error) return { error: error.message }

  revalidatePath(`/plots/plots/${plotId}`)
  revalidatePath(`/plots/projects/${projectId}`)
  return { success: true }
}

// ── Reservation document delete ──────────────────────────────

export async function deleteReservationDocAction(
  docId: string,
  reservationId: string,
): Promise<{ error?: string }> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }
  const role = await getRole(user.id)
  if (!isAdminOrManager(role)) return { error: 'Only admin or manager can delete documents' }

  const db = createServiceClient()
  const { data: doc } = await db.from('reservation_documents').select('url').eq('id', docId).single()
  if (doc?.url) {
    const url = new URL(doc.url)
    const pathParts = url.pathname.split('/object/public/reservation-docs/')
    if (pathParts[1]) {
      await db.storage.from('reservation-docs').remove([pathParts[1]])
    }
  }

  const { error } = await db.from('reservation_documents').delete().eq('id', docId)
  if (error) return { error: error.message }

  revalidatePath(`/plots/reservations/${reservationId}`)
  return {}
}

// ============================================================
// BUYERS
// ============================================================

const buyerSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  national_id: z.string().optional(),
  notes: z.string().optional(),
})

export async function createBuyerAction(
  _prev: PlotFormState,
  formData: FormData
): Promise<PlotFormState> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = buyerSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()
  const { data, error } = await db
    .from('plot_buyers')
    .insert({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      national_id: parsed.data.national_id || null,
      notes: parsed.data.notes || null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/plots/buyers')
  return { success: true, id: data.id }
}

export async function updateBuyerAction(
  id: string,
  _prev: PlotFormState,
  formData: FormData
): Promise<PlotFormState> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = buyerSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()
  const { error } = await db.from('plot_buyers').update({
    full_name: parsed.data.full_name,
    phone: parsed.data.phone,
    email: parsed.data.email || null,
    national_id: parsed.data.national_id || null,
    notes: parsed.data.notes || null,
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/plots/buyers')
  revalidatePath(`/plots/buyers/${id}`)
  return { success: true }
}

// ============================================================
// RESERVATIONS
// ============================================================

const reserveSchema = z.object({
  // Buyer fields (create new buyer inline)
  buyer_full_name: z.string().min(1, 'Buyer name is required'),
  buyer_phone: z.string().min(1, 'Buyer phone is required'),
  buyer_email: z.string().email().optional().or(z.literal('')),
  buyer_national_id: z.string().optional(),
  buyer_notes: z.string().optional(),
  // Reservation fields
  sale_price: z.coerce.number().positive('Sale price is required'),
  reservation_fee: z.coerce.number().min(0),
  reservation_date: z.string().min(1),
  payment_plan: z.enum(['lump_sum', 'installment']),
  installment_count: z.coerce.number().int().positive().optional().nullable(),
  installment_frequency: z.enum(['monthly', 'quarterly']).optional(),
  mpesa_code: z.string().optional(),
  mpesa_name: z.string().optional(),
  notes: z.string().optional(),
})

export async function createReservationAction(
  plotId: string,
  _prev: PlotFormState,
  formData: FormData
): Promise<PlotFormState> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = reserveSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()

  // Verify plot is still available
  const { data: plot } = await db.from('plots').select('status, project_id').eq('id', plotId).single()
  if (!plot) return { error: 'Plot not found' }
  if (plot.status !== 'available') return { error: 'Plot is no longer available' }

  const d = parsed.data

  // Compute installment amount if applicable
  let installmentAmount: number | null = null
  if (d.payment_plan === 'installment' && d.installment_count) {
    const remaining = d.sale_price - d.reservation_fee
    installmentAmount = Math.ceil(remaining / d.installment_count)
  }

  // Create buyer record inline
  const { data: buyer, error: buyerErr } = await db
    .from('plot_buyers')
    .insert({
      full_name: d.buyer_full_name,
      phone: d.buyer_phone,
      email: d.buyer_email || null,
      national_id: d.buyer_national_id || null,
      notes: d.buyer_notes || null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (buyerErr) return { error: buyerErr.message }

  // Create reservation (pending admin approval)
  const { data: reservation, error: resErr } = await db
    .from('plot_reservations')
    .insert({
      plot_id: plotId,
      buyer_id: buyer.id,
      reserved_by: user.id,
      sale_price: d.sale_price,
      reservation_fee: d.reservation_fee,
      reservation_date: d.reservation_date,
      payment_plan: d.payment_plan,
      installment_count: d.installment_count ?? null,
      installment_amount: installmentAmount,
      installment_frequency: d.payment_plan === 'installment' ? (d.installment_frequency ?? 'monthly') : null,
      mpesa_code: d.mpesa_code || null,
      mpesa_name: d.mpesa_name || null,
      notes: d.notes || null,
      status: 'pending_approval',
    })
    .select('id')
    .single()

  if (resErr) return { error: resErr.message }

  // Record the reservation fee as first payment (will be linked after approval)
  if (d.reservation_fee > 0) {
    await db.from('plot_payments').insert({
      reservation_id: reservation.id,
      amount: d.reservation_fee,
      payment_date: d.reservation_date,
      method: 'M-Pesa',
      reference: d.mpesa_code || null,
      mpesa_name: d.mpesa_name || null,
      payment_type: 'reservation_fee',
      recorded_by: user.id,
    })
  }

  revalidatePath(`/plots/plots/${plotId}`)
  revalidatePath('/plots/reservations')
  return { success: true, id: reservation.id }
}

export async function approveReservationAction(reservationId: string): Promise<PlotFormState> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }
  const role = await getRole(user.id)
  if (!isAdminOrManager(role)) return { error: 'Only admin or manager can approve reservations' }

  const db = createServiceClient()

  const { data: reservation } = await db
    .from('plot_reservations')
    .select('plot_id, status')
    .eq('id', reservationId)
    .single()

  if (!reservation) return { error: 'Reservation not found' }
  if (reservation.status !== 'pending_approval') return { error: 'Reservation is not pending approval' }

  const approvedAt = new Date()
  const expiresAt = new Date(approvedAt)
  expiresAt.setDate(expiresAt.getDate() + 14)

  // Update reservation to active
  const { error: resErr } = await db.from('plot_reservations').update({
    status: 'active',
    approved_at: approvedAt.toISOString(),
    approved_by: user.id,
    reservation_expires_at: expiresAt.toISOString(),
  }).eq('id', reservationId)

  if (resErr) return { error: resErr.message }

  // Update plot status to reserved
  const { error: plotErr } = await db.from('plots').update({ status: 'reserved' }).eq('id', reservation.plot_id)
  if (plotErr) return { error: plotErr.message }

  revalidatePath('/plots/reservations')
  revalidatePath(`/plots/reservations/${reservationId}`)
  revalidatePath(`/plots/plots/${reservation.plot_id}`)
  return { success: true }
}

export async function cancelReservationAction(reservationId: string): Promise<PlotFormState> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }
  const role = await getRole(user.id)
  if (!isAdminOrManager(role)) return { error: 'Only admin or manager can cancel reservations' }

  const db = createServiceClient()

  const { data: reservation } = await db
    .from('plot_reservations')
    .select('plot_id, status')
    .eq('id', reservationId)
    .single()

  if (!reservation) return { error: 'Reservation not found' }
  if (reservation.status === 'completed') return { error: 'Cannot cancel a completed reservation' }

  await db.from('plot_reservations').update({ status: 'cancelled' }).eq('id', reservationId)
  await db.from('plots').update({ status: 'available' }).eq('id', reservation.plot_id)

  revalidatePath('/plots/reservations')
  revalidatePath(`/plots/reservations/${reservationId}`)
  revalidatePath(`/plots/plots/${reservation.plot_id}`)
  return { success: true }
}

export async function markTransferredAction(plotId: string): Promise<PlotFormState> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }
  const role = await getRole(user.id)
  if (!isAdminOrManager(role)) return { error: 'Only admin or manager can mark plots as transferred' }

  const db = createServiceClient()
  const { error } = await db.from('plots').update({ status: 'transferred' }).eq('id', plotId)
  if (error) return { error: error.message }

  revalidatePath(`/plots/plots/${plotId}`)
  revalidatePath('/plots/plots')
  return { success: true }
}

// ============================================================
// PAYMENTS
// ============================================================

const paymentSchema = z.object({
  amount: z.coerce.number().positive('Amount is required'),
  payment_date: z.string().min(1, 'Payment date is required'),
  method: z.enum(['M-Pesa', 'Bank Transfer', 'Cash', 'Cheque']),
  reference: z.string().optional(),
  mpesa_name: z.string().optional(),
  payment_type: z.enum(['installment', 'lump_sum', 'other']),
  notes: z.string().optional(),
})

export async function recordPaymentAction(
  reservationId: string,
  _prev: PlotFormState,
  formData: FormData
): Promise<PlotFormState> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = paymentSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()

  // Fetch reservation + all payments to check if fully paid
  const { data: reservation } = await db
    .from('plot_reservations')
    .select('plot_id, sale_price, status')
    .eq('id', reservationId)
    .single()

  if (!reservation) return { error: 'Reservation not found' }
  if (reservation.status !== 'active') return { error: 'Can only record payments on active reservations' }

  const { data: payments } = await db
    .from('plot_payments')
    .select('amount')
    .eq('reservation_id', reservationId)

  const totalPaid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0)
  const newTotal = totalPaid + parsed.data.amount

  if (newTotal > reservation.sale_price) {
    return { error: `Payment would exceed sale price. Outstanding balance is KES ${(reservation.sale_price - totalPaid).toLocaleString()}` }
  }

  // Insert payment
  const { error: payErr } = await db.from('plot_payments').insert({
    reservation_id: reservationId,
    amount: parsed.data.amount,
    payment_date: parsed.data.payment_date,
    method: parsed.data.method,
    reference: parsed.data.reference || null,
    mpesa_name: parsed.data.mpesa_name || null,
    payment_type: parsed.data.payment_type,
    recorded_by: user.id,
    notes: parsed.data.notes || null,
  })

  if (payErr) return { error: payErr.message }

  // Auto-complete if fully paid
  if (newTotal >= reservation.sale_price) {
    await db.from('plot_reservations').update({ status: 'completed' }).eq('id', reservationId)
    await db.from('plots').update({ status: 'sold' }).eq('id', reservation.plot_id)
  }

  revalidatePath(`/plots/reservations/${reservationId}`)
  revalidatePath(`/plots/plots/${reservation.plot_id}`)
  revalidatePath('/plots/reservations')
  return { success: true }
}

export async function deletePaymentAction(paymentId: string, reservationId: string): Promise<PlotFormState> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }
  const role = await getRole(user.id)
  if (!isAdminOrManager(role)) return { error: 'Only admin or manager can delete payments' }

  const db = createServiceClient()

  // Get reservation to recalculate status
  const { data: reservation } = await db
    .from('plot_reservations')
    .select('plot_id, sale_price, status')
    .eq('id', reservationId)
    .single()

  await db.from('plot_payments').delete().eq('id', paymentId)

  // Recalculate paid total after deletion
  const { data: remaining } = await db
    .from('plot_payments')
    .select('amount')
    .eq('reservation_id', reservationId)

  const newTotal = (remaining ?? []).reduce((sum, p) => sum + Number(p.amount), 0)

  // If it was completed but now underpaid, revert to active
  if (reservation && reservation.status === 'completed' && newTotal < reservation.sale_price) {
    await db.from('plot_reservations').update({ status: 'active' }).eq('id', reservationId)
    await db.from('plots').update({ status: 'reserved' }).eq('id', reservation.plot_id)
  }

  revalidatePath(`/plots/reservations/${reservationId}`)
  if (reservation) revalidatePath(`/plots/plots/${reservation.plot_id}`)
  revalidatePath('/plots/reservations')
  return { success: true }
}

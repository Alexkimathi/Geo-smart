'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

export type EquipmentFormState = { error?: string; success?: boolean; id?: string }

const equipmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  serial_no: z.string().optional(),
  type: z.enum(['total_station', 'gps', 'level', 'drone', 'vehicle', 'material', 'tool', 'other']),
  purchase_date: z.string().optional(),
  condition: z.enum(['good', 'fair', 'poor', 'under_maintenance', 'retired']),
  assigned_to_user_id: z.string().optional(),
  last_calibration_date: z.string().optional(),
  stock_qty: z.coerce.number().int().min(0).default(1),
  min_stock_qty: z.coerce.number().int().min(0).default(1),
  notes: z.string().optional(),
})

const maintenanceSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
  done_by: z.string().optional(),
  next_due_date: z.string().optional(),
})

export async function createEquipmentAction(
  _prev: EquipmentFormState,
  formData: FormData
): Promise<EquipmentFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = equipmentSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()
  const { data, error } = await db.from('equipment').insert({
    name: parsed.data.name,
    serial_no: parsed.data.serial_no || null,
    type: parsed.data.type,
    purchase_date: parsed.data.purchase_date || null,
    condition: parsed.data.condition,
    assigned_to_user_id: parsed.data.assigned_to_user_id || null,
    last_calibration_date: parsed.data.last_calibration_date || null,
    stock_qty: parsed.data.stock_qty,
    min_stock_qty: parsed.data.min_stock_qty,
    notes: parsed.data.notes || null,
  }).select('id').single()

  if (error) return { error: error.message }

  revalidatePath('/equipment')
  return { success: true, id: data.id }
}

export async function updateEquipmentAction(
  id: string,
  _prev: EquipmentFormState,
  formData: FormData
): Promise<EquipmentFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = equipmentSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()
  const { error } = await db.from('equipment').update({
    name: parsed.data.name,
    serial_no: parsed.data.serial_no || null,
    type: parsed.data.type,
    purchase_date: parsed.data.purchase_date || null,
    condition: parsed.data.condition,
    assigned_to_user_id: parsed.data.assigned_to_user_id || null,
    last_calibration_date: parsed.data.last_calibration_date || null,
    stock_qty: parsed.data.stock_qty,
    min_stock_qty: parsed.data.min_stock_qty,
    notes: parsed.data.notes || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/equipment')
  revalidatePath(`/equipment/${id}`)
  return { success: true, id }
}

export async function deleteEquipmentAction(id: string): Promise<EquipmentFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createServiceClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(profile?.role ?? '')) {
    return { error: 'Only admins and managers can delete equipment' }
  }

  const { error } = await db.from('equipment').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/equipment')
  return { success: true }
}

export async function addMaintenanceLogAction(
  equipmentId: string,
  _prev: EquipmentFormState,
  formData: FormData
): Promise<EquipmentFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = maintenanceSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()
  const { error } = await db.from('maintenance_logs').insert({
    equipment_id: equipmentId,
    date: parsed.data.date,
    description: parsed.data.description,
    done_by: parsed.data.done_by || null,
    next_due_date: parsed.data.next_due_date || null,
  })

  if (error) return { error: error.message }

  // Update last_calibration_date if next_due_date provided
  if (parsed.data.next_due_date) {
    await db.from('equipment')
      .update({ last_calibration_date: parsed.data.date, updated_at: new Date().toISOString() })
      .eq('id', equipmentId)
  }

  revalidatePath(`/equipment/${equipmentId}`)
  return { success: true }
}

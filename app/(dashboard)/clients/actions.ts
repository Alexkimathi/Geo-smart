'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

const clientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  company: z.string().optional(),
  site_location: z.string().optional(),
  gps_lat: z.coerce.number().optional().nullable(),
  gps_lng: z.coerce.number().optional().nullable(),
  pin: z.string().optional(),
  contact_person: z.string().optional(),
})

export type ClientFormState = {
  error?: string
  success?: boolean
}

export async function createClientAction(
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = clientSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()
  const { error } = await db.from('clients').insert({
    name: parsed.data.name,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    company: parsed.data.company || null,
    site_location: parsed.data.site_location || null,
    gps_lat: parsed.data.gps_lat ?? null,
    gps_lng: parsed.data.gps_lng ?? null,
    pin: parsed.data.pin || null,
    contact_person: parsed.data.contact_person || null,
  })

  if (error) return { error: error.message }

  revalidatePath('/clients')
  return { success: true }
}

export async function updateClientAction(
  id: string,
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = clientSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const db = createServiceClient()
  const { error } = await db
    .from('clients')
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      company: parsed.data.company || null,
      site_location: parsed.data.site_location || null,
      gps_lat: parsed.data.gps_lat ?? null,
      gps_lng: parsed.data.gps_lng ?? null,
      pin: parsed.data.pin || null,
      contact_person: parsed.data.contact_person || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
  return { success: true }
}

export async function deleteClientAction(id: string): Promise<ClientFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createServiceClient()
  const { error } = await db.from('clients').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/clients')
  return { success: true }
}

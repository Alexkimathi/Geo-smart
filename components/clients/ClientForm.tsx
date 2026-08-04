'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Client } from '@/types/database'
import type { ClientFormState } from '@/app/(dashboard)/clients/actions'

interface Props {
  client?: Client
  action: (prev: ClientFormState, formData: FormData) => Promise<ClientFormState>
  onSuccess?: () => void
}

export function ClientForm({ client, action, onSuccess }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})

  useEffect(() => {
    if (state.success) {
      onSuccess?.()
      router.refresh()
    }
  }, [state.success, onSuccess, router])

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Client Name *</Label>
          <Input id="name" name="name" required defaultValue={client?.name} placeholder="John Doe" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company">Company</Label>
          <Input id="company" name="company" defaultValue={client?.company ?? ''} placeholder="ABC Ltd" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={client?.phone ?? ''} placeholder="+254 700 000 000" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={client?.email ?? ''} placeholder="client@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact_person">Contact Person</Label>
          <Input id="contact_person" name="contact_person" defaultValue={client?.contact_person ?? ''} placeholder="Jane Doe" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pin">KRA PIN</Label>
          <Input id="pin" name="pin" defaultValue={client?.pin ?? ''} placeholder="A000000000Z" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="site_location">Site Location</Label>
          <Input id="site_location" name="site_location" defaultValue={client?.site_location ?? ''} placeholder="Nairobi, Karen" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gps_lat">GPS Latitude</Label>
          <Input id="gps_lat" name="gps_lat" type="number" step="any" defaultValue={client?.gps_lat ?? ''} placeholder="-1.286389" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gps_lng">GPS Longitude</Label>
          <Input id="gps_lng" name="gps_lng" type="number" step="any" defaultValue={client?.gps_lng ?? ''} placeholder="36.817223" />
        </div>
      </div>

      {state.error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : client ? 'Save Changes' : 'Create Client'}
        </Button>
      </div>
    </form>
  )
}

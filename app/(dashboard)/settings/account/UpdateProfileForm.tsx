'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfileAction } from './actions'
import type { Profile } from '@/types/database'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  surveyor: 'Surveyor',
  site_engineer: 'Site Engineer',
  accountant: 'Accountant',
}

export function UpdateProfileForm({ profile, email }: { profile: Profile; email: string }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, {})

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            name="full_name"
            required
            defaultValue={profile.full_name}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={profile.phone ?? ''}
            placeholder="+254 7XX XXX XXX"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Email</Label>
          <p className="text-sm text-gray-600 h-9 flex items-center">{email}</p>
        </div>

        <div className="space-y-1.5">
          <Label>Role</Label>
          <p className="text-sm text-gray-600 h-9 flex items-center">
            {ROLE_LABELS[profile.role] ?? profile.role}
            <span className="text-xs text-gray-400 ml-1.5">(set by admin)</span>
          </p>
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Profile updated.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save Profile'}
      </Button>
    </form>
  )
}

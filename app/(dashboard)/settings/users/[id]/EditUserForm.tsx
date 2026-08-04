'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { updateUserAction } from '../actions'
import type { Profile } from '@/types/database'

export function EditUserForm({ profile, isSelf }: { profile: Profile; isSelf: boolean }) {
  const router = useRouter()
  const action = updateUserAction.bind(null, profile.id)
  const [state, formAction, pending] = useActionState(action, {})

  useEffect(() => {
    if (state.success) router.push('/settings/users')
  }, [state.success, router])

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="full_name">Full Name *</Label>
          <Input
            id="full_name"
            name="full_name"
            required
            defaultValue={profile.full_name}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="role">Role *</Label>
          <NativeSelect
            id="role"
            name="role"
            required
            defaultValue={profile.role}
            disabled={isSelf}
          >
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="surveyor">Surveyor</option>
            <option value="site_engineer">Site Engineer</option>
            <option value="accountant">Accountant</option>
          </NativeSelect>
          {isSelf && (
            <p className="text-xs text-gray-400">You cannot change your own role.</p>
          )}
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
      </div>

      {state.error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          User updated successfully.
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}

'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { createUserAction } from '../actions'

export function NewUserForm() {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(createUserAction, {})

  useEffect(() => {
    if (state.success) router.push('/settings/users')
  }, [state.success, router])

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="full_name">Full Name *</Label>
          <Input id="full_name" name="full_name" required placeholder="e.g. John Kamau" />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="email">Email Address *</Label>
          <Input id="email" name="email" type="email" required placeholder="john@geosmart.co.ke" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="role">Role *</Label>
          <NativeSelect id="role" name="role" required defaultValue="">
            <option value="" disabled>Select role...</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="surveyor">Surveyor</option>
            <option value="site_engineer">Site Engineer</option>
            <option value="accountant">Accountant</option>
          </NativeSelect>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" placeholder="+254 7XX XXX XXX" />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="password">Initial Password *</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
          />
          <p className="text-xs text-gray-400">Share this password with the user. They should change it after first login.</p>
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
          {pending ? 'Creating...' : 'Create User'}
        </Button>
      </div>
    </form>
  )
}

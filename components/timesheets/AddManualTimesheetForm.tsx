'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addManualTimesheetAction } from '@/app/(dashboard)/timesheets/actions'
import type { JobOption } from '@/app/(dashboard)/timesheets/page'
import type { Profile } from '@/types/database'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  jobs: JobOption[]
  staffProfiles: Pick<Profile, 'id' | 'full_name' | 'role'>[]
}

export function AddManualTimesheetForm({ jobs, staffProfiles }: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, pending] = useActionState(addManualTimesheetAction, {})
  const [jobType, setJobType] = useState<'survey' | 'construction' | ''>('')

  const filteredJobs = jobs.filter((j) => j.job_type === jobType)

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
      setJobType('')
      router.refresh()
    }
  }, [state.success, router])

  const today = new Date().toISOString().split('T')[0]

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ts_staff">Staff Member *</Label>
          <select
            id="ts_staff"
            name="staff_id"
            required
            className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Select staff —</option>
            {staffProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} ({p.role.replace('_', ' ')})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ts_date">Date *</Label>
          <Input id="ts_date" name="date" type="date" defaultValue={today} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ts_hours">Hours *</Label>
          <Input
            id="ts_hours"
            name="hours"
            type="number"
            min={0.5}
            max={24}
            step={0.5}
            required
            placeholder="e.g. 8"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ts_job_type">Job Type *</Label>
          <select
            id="ts_job_type"
            name="job_type"
            value={jobType}
            onChange={(e) => setJobType(e.target.value as typeof jobType)}
            required
            className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Select type —</option>
            <option value="survey">Survey</option>
            <option value="construction">Construction</option>
          </select>
        </div>

        {jobType && (
          <div className="space-y-1.5">
            <Label htmlFor="ts_job_id">Job *</Label>
            <select
              id="ts_job_id"
              name="job_id"
              required
              className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Select job —</option>
              {filteredJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.label}
                </option>
              ))}
              {filteredJobs.length === 0 && (
                <option disabled>No active {jobType} jobs</option>
              )}
            </select>
          </div>
        )}

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ts_notes">Notes</Label>
          <Input id="ts_notes" name="notes" placeholder="Work description..." />
        </div>
      </div>

      {state.error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
          Timesheet entry added.
        </div>
      )}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Adding...' : 'Add Entry'}
      </Button>
    </form>
  )
}

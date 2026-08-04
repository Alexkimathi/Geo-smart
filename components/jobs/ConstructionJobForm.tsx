'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect } from '@/components/ui/native-select'
import type { Client, ConstructionJob } from '@/types/database'
import type { JobFormState } from '@/app/(dashboard)/jobs/construction/actions'

interface Props {
  clients: Client[]
  job?: ConstructionJob
  defaultClientId?: string
  action: (prev: JobFormState, formData: FormData) => Promise<JobFormState>
}

export function ConstructionJobForm({ clients, job, defaultClientId, action }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})

  useEffect(() => {
    if (state.success) {
      if (state.jobId) router.push(`/jobs/construction/${state.jobId}`)
      else router.refresh()
    }
  }, [state.success, state.jobId, router])

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Client */}
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="client_id">Client *</Label>
          <NativeSelect
            id="client_id"
            name="client_id"
            required
            defaultValue={job?.client_id ?? defaultClientId ?? ''}
          >
            <option value="">Select a client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.company ? ` — ${c.company}` : ''}
              </option>
            ))}
          </NativeSelect>
        </div>

        {/* Project Name */}
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="project_name">Project Name *</Label>
          <Input
            id="project_name"
            name="project_name"
            required
            defaultValue={job?.project_name}
            placeholder="e.g. Karen Residential House"
          />
        </div>

        {/* Project Type */}
        <div className="space-y-1.5">
          <Label htmlFor="project_type">Project Type *</Label>
          <NativeSelect
            id="project_type"
            name="project_type"
            required
            defaultValue={job?.project_type ?? ''}
          >
            <option value="">Select type...</option>
            <option value="House">House</option>
            <option value="Commercial">Commercial</option>
            <option value="Road">Road</option>
            <option value="Tender">Tender</option>
          </NativeSelect>
        </div>

        {/* Contract Value */}
        <div className="space-y-1.5">
          <Label htmlFor="contract_value">Contract Value (KES)</Label>
          <Input
            id="contract_value"
            name="contract_value"
            type="number"
            min="0"
            step="1"
            defaultValue={job?.contract_value ?? ''}
            placeholder="0"
          />
        </div>

        {/* BOQ Total */}
        <div className="space-y-1.5">
          <Label htmlFor="boq_total">BOQ Total (KES)</Label>
          <Input
            id="boq_total"
            name="boq_total"
            type="number"
            min="0"
            step="1"
            defaultValue={job?.boq_total ?? ''}
            placeholder="0"
          />
        </div>

        {/* Start Date */}
        <div className="space-y-1.5">
          <Label htmlFor="start_date">Start Date</Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={job?.start_date ?? ''}
          />
        </div>

        {/* End Date */}
        <div className="space-y-1.5">
          <Label htmlFor="end_date">End Date</Label>
          <Input
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={job?.end_date ?? ''}
          />
        </div>

        {/* Notes */}
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={job?.notes ?? ''}
            placeholder="Project scope, special requirements..."
            rows={3}
          />
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
          {pending ? 'Saving...' : job ? 'Save Changes' : 'Create Construction Job'}
        </Button>
      </div>
    </form>
  )
}

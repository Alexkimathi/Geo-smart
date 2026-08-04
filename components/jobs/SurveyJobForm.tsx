'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect } from '@/components/ui/native-select'
import { KENYA_COUNTIES } from '@/lib/kenya-counties'
import type { Client, SurveyJob } from '@/types/database'
import type { JobFormState } from '@/app/(dashboard)/jobs/survey/actions'

interface Props {
  clients: Client[]
  job?: SurveyJob
  defaultClientId?: string
  action: (prev: JobFormState, formData: FormData) => Promise<JobFormState>
  onSuccess?: (jobId?: string) => void
}

export function SurveyJobForm({ clients, job, defaultClientId, action, onSuccess }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})

  useEffect(() => {
    if (state.success) {
      onSuccess?.(state.jobId)
      if (state.jobId) router.push(`/jobs/survey/${state.jobId}`)
      else router.refresh()
    }
  }, [state.success, state.jobId, onSuccess, router])

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

        {/* Site Name */}
        <div className="space-y-1.5">
          <Label htmlFor="site_name">Site Name *</Label>
          <Input
            id="site_name"
            name="site_name"
            required
            defaultValue={job?.site_name}
            placeholder="e.g. Karen Plot 123"
          />
        </div>

        {/* County */}
        <div className="space-y-1.5">
          <Label htmlFor="county">County</Label>
          <NativeSelect
            id="county"
            name="county"
            defaultValue={job?.county ?? ''}
          >
            <option value="">Select county...</option>
            {KENYA_COUNTIES.map((c) => (
              <option key={c.code} value={c.name}>
                {c.code} — {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        {/* Survey Type */}
        <div className="space-y-1.5">
          <Label htmlFor="survey_type">Survey Type *</Label>
          <NativeSelect
            id="survey_type"
            name="survey_type"
            required
            defaultValue={job?.survey_type ?? ''}
          >
            <option value="">Select type...</option>
            <option value="Topo">Topographic Survey</option>
            <option value="Cadastral">Cadastral Survey</option>
            <option value="Control">Control Survey</option>
            <option value="Setting Out">Setting Out</option>
          </NativeSelect>
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
            placeholder="Scope of work, special instructions..."
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
          {pending ? 'Saving...' : job ? 'Save Changes' : 'Create Survey Job'}
        </Button>
      </div>
    </form>
  )
}

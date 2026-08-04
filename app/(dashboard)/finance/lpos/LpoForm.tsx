'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { LineItemsEditor } from '@/components/finance/LineItemsEditor'
import type { FinanceFormState } from '@/app/(dashboard)/finance/actions'
import type { Lpo } from '@/types/database'
import type { JobOption } from '@/components/finance/JobSelector'

interface Props {
  jobs: JobOption[]
  action: (prev: FinanceFormState, formData: FormData) => Promise<FinanceFormState>
  prefill?: Lpo | null
  successRedirect?: string
  submitLabel?: string
}

export function LpoForm({ jobs, action, prefill, successRedirect, submitLabel = 'Create LPO' }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})

  useEffect(() => {
    if (state.success) {
      router.push(successRedirect ?? `/finance/lpos/${state.docId}`)
    }
  }, [state.success, state.docId, successRedirect, router])

  const today = new Date().toISOString().split('T')[0]

  const surveyJobs = jobs.filter((j) => j.job_type === 'survey')
  const constructionJobs = jobs.filter((j) => j.job_type === 'construction')

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="supplier_name">Supplier Name *</Label>
          <Input id="supplier_name" name="supplier_name" required placeholder="e.g. ABC Hardware Ltd" defaultValue={prefill?.supplier_name ?? ''} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="issued_date">Issue Date</Label>
          <Input id="issued_date" name="issued_date" type="date" defaultValue={prefill?.issued_date ?? today} />
        </div>

        {/* Job link */}
        <div className="space-y-1.5">
          <Label htmlFor="lpo_job_type">Linked Job Type</Label>
          <select id="lpo_job_type" name="job_type" defaultValue={prefill?.job_type ?? ''}
            className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— No job link —</option>
            <option value="survey">Survey Job</option>
            <option value="construction">Construction Job</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lpo_job_id">Job</Label>
          <select id="lpo_job_id" name="job_id" defaultValue={prefill?.job_id ?? ''}
            className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— Select job (optional) —</option>
            {surveyJobs.length > 0 && (
              <optgroup label="Survey Jobs">
                {surveyJobs.map((j) => <option key={j.id} value={j.id}>{j.job_no} — {j.label}</option>)}
              </optgroup>
            )}
            {constructionJobs.length > 0 && (
              <optgroup label="Construction Jobs">
                {constructionJobs.map((j) => <option key={j.id} value={j.id}>{j.job_no} — {j.label}</option>)}
              </optgroup>
            )}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="lpo_notes">Notes</Label>
          <textarea id="lpo_notes" name="notes" rows={2} defaultValue={prefill?.notes ?? ''}
            placeholder="Delivery instructions, payment terms..."
            className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
      </div>

      {/* Line Items */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Items Ordered</h3>
        <LineItemsEditor
          initialItems={prefill?.items ?? []}
          initialTax={prefill?.tax ?? 16}
        />
      </div>

      {state.error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{state.error}</div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}

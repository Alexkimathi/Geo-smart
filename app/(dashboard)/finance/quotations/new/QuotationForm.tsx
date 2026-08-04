'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LineItemsEditor } from '@/components/finance/LineItemsEditor'
import { JobSelector } from '@/components/finance/JobSelector'
import type { Client, FinanceDocument } from '@/types/database'
import type { JobOption } from '@/components/finance/JobSelector'
import type { FinanceFormState } from '@/app/(dashboard)/finance/actions'

interface Props {
  clients: Pick<Client, 'id' | 'name' | 'company'>[]
  jobs: JobOption[]
  quotation?: FinanceDocument
  action: (prev: FinanceFormState, formData: FormData) => Promise<FinanceFormState>
  successRedirect?: string   // edit mode: known ahead of time
  submitLabel?: string
}

export function QuotationForm({
  clients,
  jobs,
  quotation,
  action,
  successRedirect,
  submitLabel = 'Create Quotation',
}: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})

  useEffect(() => {
    if (state.success) {
      if (successRedirect) {
        router.push(successRedirect)
      } else if (state.docId) {
        router.push(`/finance/quotations/${state.docId}`)
      }
    }
  }, [state.success, state.docId, successRedirect, router])

  return (
    <form action={formAction} className="space-y-6">
      {/* Client + Job cascade */}
      <JobSelector
        clients={clients}
        jobs={jobs}
        initialClientId={quotation?.client_id}
        initialJobId={quotation?.job_id}
        initialJobType={quotation?.job_type}
      />

      {/* Valid Until */}
      <div className="space-y-1.5 max-w-xs">
        <Label htmlFor="due_date">Valid Until</Label>
        <Input
          id="due_date"
          name="due_date"
          type="date"
          defaultValue={quotation?.due_date ?? ''}
        />
      </div>

      {/* Line Items */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Line Items</h3>
        <LineItemsEditor
          initialItems={quotation?.line_items}
          initialTax={quotation?.tax ?? 0}
          hideUnit
        />
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
          {pending ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

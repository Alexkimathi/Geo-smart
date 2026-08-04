'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LineItemsEditor } from '@/components/finance/LineItemsEditor'
import { JobSelector } from '@/components/finance/JobSelector'
import type { Client, FinanceDocument } from '@/types/database'
import type { JobOption } from '@/components/finance/JobSelector'
import type { FinanceFormState } from '@/app/(dashboard)/finance/actions'

interface Props {
  clients: Pick<Client, 'id' | 'name' | 'company'>[]
  jobs: JobOption[]
  prefill?: FinanceDocument | null
  action: (prev: FinanceFormState, formData: FormData) => Promise<FinanceFormState>
  successRedirect?: string
  submitLabel?: string
}

export function InvoiceForm({
  clients,
  jobs,
  prefill,
  action,
  successRedirect,
  submitLabel = 'Create Invoice',
}: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})

  useEffect(() => {
    if (state.success) {
      if (successRedirect) {
        router.push(successRedirect)
      } else if (state.docId) {
        router.push(`/finance/invoices/${state.docId}`)
      }
    }
  }, [state.success, state.docId, successRedirect, router])

  return (
    <form action={formAction} className="space-y-6">
      {/* Client + Job cascade */}
      <JobSelector
        clients={clients}
        jobs={jobs}
        initialClientId={prefill?.client_id}
        initialJobId={prefill?.job_id}
        initialJobType={prefill?.job_type}
      />

      {/* Due Date */}
      <div className="space-y-1.5 max-w-xs">
        <Label htmlFor="due_date">Due Date</Label>
        <Input
          id="due_date"
          name="due_date"
          type="date"
          defaultValue={prefill?.due_date ?? ''}
        />
      </div>

      {/* Line Items */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Line Items</h3>
        <LineItemsEditor
          initialItems={prefill?.line_items}
          initialTax={prefill?.tax ?? 0}
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes / Payment Terms</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={prefill?.notes ?? ''}
          placeholder="Payment terms, bank details, conditions..."
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

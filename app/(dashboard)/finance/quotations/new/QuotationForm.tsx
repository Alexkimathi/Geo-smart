'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LineItemsEditor } from '@/components/finance/LineItemsEditor'
import { JobSelector } from '@/components/finance/JobSelector'
import type { Client, FinanceDocument, QuoteBankDetails } from '@/types/database'
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

  const bd: QuoteBankDetails | null = quotation?.bank_details ?? null

  return (
    <form action={formAction} className="space-y-6">

      {/* ── Quote To + Reference ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="quote_to">Quote To <span className="text-gray-400 font-normal">(free text)</span></Label>
          <Input
            id="quote_to"
            name="quote_to"
            placeholder="e.g. John Doe / ABC Company Ltd"
            defaultValue={quotation?.quote_to ?? ''}
          />
          <p className="text-xs text-gray-400">Use this when the recipient is not in your client list.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reference_no">Reference / LR No <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Input
            id="reference_no"
            name="reference_no"
            placeholder="e.g. LR No. 123/456"
            defaultValue={quotation?.reference_no ?? ''}
          />
        </div>
      </div>

      {/* ── Client + Job cascade (optional) ── */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Link to an existing client / job <span className="text-gray-400">(optional — skip if preparing a standalone quotation)</span></p>
        <JobSelector
          clients={clients}
          jobs={jobs}
          initialClientId={quotation?.client_id}
          initialJobId={quotation?.job_id}
          initialJobType={quotation?.job_type}
        />
      </div>

      {/* ── Valid Until ── */}
      <div className="space-y-1.5 max-w-xs">
        <Label htmlFor="due_date">Valid Until</Label>
        <Input
          id="due_date"
          name="due_date"
          type="date"
          defaultValue={quotation?.due_date ?? ''}
        />
      </div>

      {/* ── Line Items ── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Line Items</h3>
        <LineItemsEditor
          initialItems={quotation?.line_items}
          initialTax={quotation?.tax ?? 0}
          hideUnit
        />
      </div>

      {/* ── Bank Details ── */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Payment / Bank Details</h3>
          <p className="text-xs text-gray-400 mt-0.5">These will appear on the printed quotation. Fill in for this document only.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="bank_account_no">Account No</Label>
            <Input id="bank_account_no" name="bank_account_no" placeholder="e.g. 0310280133688" defaultValue={bd?.account_no ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bank_currency">Currency</Label>
            <Input id="bank_currency" name="bank_currency" placeholder="e.g. KSH" defaultValue={bd?.currency ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bank_name">Bank Name</Label>
            <Input id="bank_name" name="bank_name" placeholder="e.g. EQUITY BANK (KENYA) Ltd" defaultValue={bd?.bank_name ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bank_branch">Branch</Label>
            <Input id="bank_branch" name="bank_branch" placeholder="e.g. NGARA" defaultValue={bd?.branch ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bank_swift_code">SWIFT Code</Label>
            <Input id="bank_swift_code" name="bank_swift_code" placeholder="e.g. EQBLKENA" defaultValue={bd?.swift_code ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bank_code">Bank Code</Label>
            <Input id="bank_code" name="bank_code" placeholder="e.g. 068" defaultValue={bd?.bank_code ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bank_branch_code">Branch Code</Label>
            <Input id="bank_branch_code" name="bank_branch_code" placeholder="e.g. 031" defaultValue={bd?.branch_code ?? ''} />
          </div>
        </div>
      </div>

      {/* ── Notes ── */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes / Terms &amp; Conditions <span className="text-gray-400 font-normal">(optional)</span></Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="e.g. This quotation is valid for 30 days from the date of issue."
          defaultValue={quotation?.notes ?? ''}
          className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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

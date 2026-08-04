'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { recordPaymentAction } from '@/app/(dashboard)/finance/actions'

interface Props {
  invoiceId: string
}

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'M-Pesa', 'Cheque', 'Other'] as const

export function RecordPaymentForm({ invoiceId }: Props) {
  const router = useRouter()
  const action = recordPaymentAction.bind(null, invoiceId)
  const [state, formAction, pending] = useActionState(action, {})

  useEffect(() => {
    if (state.success) {
      router.refresh()
    }
  }, [state.success, router])

  const today = new Date().toISOString().split('T')[0]

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="payment_amount">Amount (KES) *</Label>
          <Input
            id="payment_amount"
            name="amount"
            type="number"
            min={0}
            step="0.01"
            required
            placeholder="0.00"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="payment_date">Payment Date *</Label>
          <Input
            id="payment_date"
            name="payment_date"
            type="date"
            defaultValue={today}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="payment_method">Method *</Label>
          <select
            id="payment_method"
            name="method"
            required
            className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="payment_reference">Reference / Receipt No.</Label>
          <Input
            id="payment_reference"
            name="reference"
            placeholder="TRX123456"
          />
        </div>
      </div>

      {state.error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
          Payment recorded successfully.
        </div>
      )}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Recording...' : 'Record Payment'}
      </Button>
    </form>
  )
}

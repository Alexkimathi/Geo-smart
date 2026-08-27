'use client'

import { useActionState } from 'react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import type { PlotFormState } from '@/app/(dashboard)/plots/actions'

interface Props {
  action: (prev: PlotFormState, formData: FormData) => Promise<PlotFormState>
  maxAmount: number
  onSuccess?: () => void
}

export function RecordPaymentForm({ action, maxAmount, onSuccess }: Props) {
  const [state, formAction, pending] = useActionState(action, {})

  useEffect(() => {
    if (state.success) onSuccess?.()
  }, [state.success, onSuccess])

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Payment recorded successfully.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount (KES) <span className="text-red-500">*</span>
          </label>
          <input
            name="amount"
            type="number"
            min="1"
            max={maxAmount}
            step="1"
            required
            className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={maxAmount.toLocaleString()}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            name="payment_date"
            type="date"
            required
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
          <select
            name="method"
            className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="M-Pesa">M-Pesa</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cash">Cash</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            name="payment_type"
            className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="installment">Installment</option>
            <option value="lump_sum">Lump Sum</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reference / M-Pesa Code</label>
          <input
            name="reference"
            className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. RGK2X4A1B0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sender Name (M-Pesa)</label>
          <input
            name="mpesa_name"
            className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Name from SMS"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <input
          name="notes"
          className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Recording…' : 'Record Payment'}
      </Button>
    </form>
  )
}

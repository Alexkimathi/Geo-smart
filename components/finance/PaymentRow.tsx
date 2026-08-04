'use client'

import { useState, useTransition, useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatDate, formatCurrency } from '@/lib/utils'
import { updatePaymentAction, deletePaymentAction } from '@/app/(dashboard)/finance/actions'
import type { Payment } from '@/types/database'

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'M-Pesa', 'Cheque', 'Other'] as const

interface Props {
  payment: Payment
  invoiceId: string
}

export function PaymentRow({ payment, invoiceId }: Props) {
  const [editing, setEditing] = useState(false)
  const [deleting, startDeleteTransition] = useTransition()
  const router = useRouter()

  const action = updatePaymentAction.bind(null, payment.id, invoiceId)
  const [state, formAction, saving] = useActionState(action, {})

  useEffect(() => {
    if (state.success) {
      setEditing(false)
      router.refresh()
    }
  }, [state.success, router])

  function handleDelete() {
    if (!confirm('Delete this payment? This cannot be undone.')) return
    startDeleteTransition(async () => {
      await deletePaymentAction(payment.id, invoiceId)
      router.refresh()
    })
  }

  if (editing) {
    return (
      <tr className="bg-blue-50">
        <td colSpan={5} className="py-2 px-1">
          <form action={formAction} className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1 min-w-[110px]">
              <label className="text-xs text-gray-500">Date</label>
              <Input
                name="payment_date"
                type="date"
                defaultValue={payment.payment_date}
                required
                className="h-8 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[120px]">
              <label className="text-xs text-gray-500">Method</label>
              <select
                name="method"
                defaultValue={payment.method}
                required
                className="flex h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 min-w-[110px]">
              <label className="text-xs text-gray-500">Reference</label>
              <Input
                name="reference"
                defaultValue={payment.reference ?? ''}
                placeholder="TRX123"
                className="h-8 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[110px]">
              <label className="text-xs text-gray-500">Amount (KES)</label>
              <Input
                name="amount"
                type="number"
                min={0}
                step="0.01"
                defaultValue={payment.amount}
                required
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-center gap-1 pb-0.5">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:text-emerald-800 border border-emerald-300 hover:bg-emerald-50 px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />{saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 hover:bg-gray-50 px-2.5 py-1.5 rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />Cancel
              </button>
            </div>
            {state.error && (
              <p className="w-full text-xs text-red-600 mt-1">{state.error}</p>
            )}
          </form>
        </td>
      </tr>
    )
  }

  return (
    <tr className={deleting ? 'opacity-50' : ''}>
      <td className="py-2 text-gray-600">{formatDate(payment.payment_date)}</td>
      <td className="py-2 text-gray-600">{payment.method}</td>
      <td className="py-2 text-gray-500 font-mono text-xs">{payment.reference || '—'}</td>
      <td className="py-2 text-right font-medium text-emerald-700">{formatCurrency(payment.amount)}</td>
      <td className="py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setEditing(true)}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit payment"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
            title="Delete payment"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

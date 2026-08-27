'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import type { PlotFormState } from '@/app/(dashboard)/plots/actions'

interface Props {
  action: (prev: PlotFormState, formData: FormData) => Promise<PlotFormState>
  plotPrice: number
  plotNo: string
}

export function ReserveForm({ action, plotPrice, plotNo }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})
  const [paymentPlan, setPaymentPlan] = useState<'installment' | 'lump_sum'>('installment')
  const [salePrice, setSalePrice] = useState(plotPrice)
  const [reservationFee, setReservationFee] = useState(0)
  const [installmentCount, setInstallmentCount] = useState(12)

  const remaining = salePrice - reservationFee
  const installmentAmount = paymentPlan === 'installment' && installmentCount > 0
    ? Math.ceil(remaining / installmentCount)
    : null

  useEffect(() => {
    if (state.success && state.id) {
      router.push(`/plots/reservations/${state.id}`)
    }
  }, [state.success, state.id, router])

  return (
    <form action={formAction} className="space-y-6 max-w-xl">
      {state.error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Buyer details */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Buyer Information</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              name="buyer_full_name"
              required
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="As per National ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              name="buyer_phone"
              required
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="07xx xxx xxx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">National ID No.</label>
            <input
              name="buyer_national_id"
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 12345678"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              name="buyer_email"
              type="email"
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Reservation details */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Reservation Details — Plot #{plotNo}</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sale Price (KES) <span className="text-red-500">*</span>
            </label>
            <input
              name="sale_price"
              type="number"
              min="1"
              step="1"
              value={salePrice}
              onChange={(e) => setSalePrice(Number(e.target.value))}
              required
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reservation Date <span className="text-red-500">*</span>
            </label>
            <input
              name="reservation_date"
              type="date"
              required
              defaultValue={new Date().toISOString().split('T')[0]}
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reservation Fee (KES)
            </label>
            <input
              name="reservation_fee"
              type="number"
              min="0"
              step="1"
              value={reservationFee}
              onChange={(e) => setReservationFee(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Plan</label>
            <select
              name="payment_plan"
              value={paymentPlan}
              onChange={(e) => setPaymentPlan(e.target.value as 'installment' | 'lump_sum')}
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="installment">Installments</option>
              <option value="lump_sum">Lump Sum</option>
            </select>
          </div>
        </div>

        {paymentPlan === 'installment' && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">No. of Installments</label>
              <input
                name="installment_count"
                type="number"
                min="1"
                value={installmentCount}
                onChange={(e) => setInstallmentCount(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                name="installment_frequency"
                className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            {installmentAmount !== null && (
              <div className="col-span-2 rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm">
                <span className="text-blue-700 font-medium">
                  Each installment: KES {installmentAmount.toLocaleString()}
                </span>
                <span className="text-blue-500 ml-2">
                  (KES {remaining.toLocaleString()} ÷ {installmentCount} months)
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* M-Pesa details for reservation fee */}
      {reservationFee > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">M-Pesa Confirmation (Reservation Fee)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">M-Pesa Code</label>
              <input
                name="mpesa_code"
                className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. RGK2X4A1B0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sender Name</label>
              <input
                name="mpesa_name"
                className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Name from M-Pesa SMS"
              />
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          name="notes"
          rows={2}
          className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Submitting…' : 'Submit Reservation'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <p className="text-xs text-gray-400">
        Reservation will be pending admin/manager approval before the plot is locked.
      </p>
    </form>
  )
}

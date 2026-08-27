'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import type { PlotFormState } from '@/app/(dashboard)/plots/actions'
import type { Plot } from '@/types/database'

interface Props {
  action: (prev: PlotFormState, formData: FormData) => Promise<PlotFormState>
  plot?: Plot
  redirectTo: string
}

export function PlotForm({ action, plot, redirectTo }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})

  useEffect(() => {
    if (state.success) router.push(state.id ? `/plots/plots/${state.id}` : redirectTo)
  }, [state.success, state.id, redirectTo, router])

  return (
    <form action={formAction} className="space-y-5 max-w-lg">
      {state.error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Plot No. <span className="text-red-500">*</span>
          </label>
          <input
            name="plot_no"
            defaultValue={plot?.plot_no}
            required
            className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 1, A2, Plot-05"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
          <input
            name="size_desc"
            defaultValue={plot?.size_desc ?? ''}
            className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 50x100 ft"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price (KES) <span className="text-red-500">*</span>
          </label>
          <input
            name="price"
            type="number"
            min="0"
            step="1000"
            defaultValue={plot?.price}
            required
            className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="650000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Area (m²)</label>
          <input
            name="area_sqm"
            type="number"
            min="0"
            step="0.01"
            defaultValue={plot?.area_sqm ?? ''}
            className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 424"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title Status</label>
        <input
          name="title_status"
          defaultValue={plot?.title_status ?? ''}
          className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. Freehold, Leasehold, Pending"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GPS Latitude</label>
          <input
            name="gps_lat"
            type="number"
            step="0.0000001"
            defaultValue={plot?.gps_lat ?? ''}
            className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="-0.1234567"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GPS Longitude</label>
          <input
            name="gps_lng"
            type="number"
            step="0.0000001"
            defaultValue={plot?.gps_lng ?? ''}
            className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="36.1234567"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          name="notes"
          defaultValue={plot?.notes ?? ''}
          rows={3}
          className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : plot ? 'Save Changes' : 'Add Plot'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

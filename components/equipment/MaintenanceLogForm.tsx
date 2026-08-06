'use client'

import { useActionState } from 'react'
import { useEffect, useRef } from 'react'
import { addMaintenanceLogAction } from '@/app/(dashboard)/equipment/actions'
import type { EquipmentFormState } from '@/app/(dashboard)/equipment/actions'

const initial: EquipmentFormState = {}

export function MaintenanceLogForm({ equipmentId }: { equipmentId: string }) {
  const boundAction = addMaintenanceLogAction.bind(null, equipmentId)
  const [state, formAction, isPending] = useActionState(boundAction, initial)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state.success])

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          Maintenance record added.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
          <input
            type="date"
            name="date"
            required
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Done By</label>
          <input
            type="text"
            name="done_by"
            placeholder="Technician name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
          <input
            type="text"
            name="description"
            required
            placeholder="What was done?"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Next Due Date</label>
          <input
            type="date"
            name="next_due_date"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving...' : 'Add Record'}
        </button>
      </div>
    </form>
  )
}

'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { EquipmentFormState } from '@/app/(dashboard)/equipment/actions'
import type { Equipment, Profile } from '@/types/database'

const EQUIPMENT_TYPES = [
  { value: 'total_station', label: 'Total Station' },
  { value: 'gps', label: 'GPS Receiver' },
  { value: 'level', label: 'Level' },
  { value: 'drone', label: 'Drone' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'material', label: 'Material' },
  { value: 'tool', label: 'Tool' },
  { value: 'other', label: 'Other' },
]

const CONDITIONS = [
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'under_maintenance', label: 'Under Maintenance' },
  { value: 'retired', label: 'Retired' },
]

interface Props {
  action: (prev: EquipmentFormState, formData: FormData) => Promise<EquipmentFormState>
  defaultValues?: Partial<Equipment>
  users: Pick<Profile, 'id' | 'full_name' | 'role'>[]
  submitLabel?: string
}

const initialState: EquipmentFormState = {}

export function EquipmentForm({ action, defaultValues, users, submitLabel = 'Save Equipment' }: Props) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(action, initialState)

  useEffect(() => {
    if (state.success && state.id) {
      router.push(`/equipment/${state.id}`)
    }
  }, [state.success, state.id, router])

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Equipment Name *</label>
          <input
            name="name"
            defaultValue={defaultValues?.name ?? ''}
            required
            placeholder="e.g. Leica TS16 Total Station"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
          <select
            name="type"
            defaultValue={defaultValues?.type ?? 'other'}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {EQUIPMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Condition */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Condition *</label>
          <select
            name="condition"
            defaultValue={defaultValues?.condition ?? 'good'}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Serial No */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Serial Number</label>
          <input
            name="serial_no"
            defaultValue={defaultValues?.serial_no ?? ''}
            placeholder="e.g. SN-12345"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Purchase Date */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Date</label>
          <input
            type="date"
            name="purchase_date"
            defaultValue={defaultValues?.purchase_date ?? ''}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Stock Qty */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Stock Quantity</label>
          <input
            type="number"
            name="stock_qty"
            min={0}
            defaultValue={defaultValues?.stock_qty ?? 1}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Min Stock */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Min Stock (alert below)</label>
          <input
            type="number"
            name="min_stock_qty"
            min={0}
            defaultValue={defaultValues?.min_stock_qty ?? 1}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Assigned To */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Assigned To</label>
          <select
            name="assigned_to_user_id"
            defaultValue={defaultValues?.assigned_to_user_id ?? ''}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Unassigned —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>
        </div>

        {/* Last Calibration */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Last Calibration Date</label>
          <input
            type="date"
            name="last_calibration_date"
            defaultValue={defaultValues?.last_calibration_date ?? ''}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Notes */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea
            name="notes"
            defaultValue={defaultValues?.notes ?? ''}
            rows={3}
            placeholder="Additional notes..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}

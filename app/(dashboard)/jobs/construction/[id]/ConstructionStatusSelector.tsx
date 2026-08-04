'use client'

import { useState } from 'react'
import { updateConstructionStatusAction } from '../actions'
import { ChevronDown } from 'lucide-react'

const STATUSES = [
  { value: 'Ongoing', label: 'Ongoing' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Handover', label: 'Handover' },
  { value: 'Tender', label: 'Tender' },
]

export function ConstructionStatusSelector({ jobId, currentStatus }: { jobId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)

  async function onChange(val: string) {
    setSaving(true)
    const result = await updateConstructionStatusAction(jobId, val)
    if (result.success) setStatus(val)
    setSaving(false)
  }

  return (
    <div className="relative inline-block">
      <select
        value={status}
        onChange={(e) => onChange(e.target.value)}
        disabled={saving}
        className="appearance-none h-8 rounded-md border border-gray-300 bg-white pl-3 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
    </div>
  )
}

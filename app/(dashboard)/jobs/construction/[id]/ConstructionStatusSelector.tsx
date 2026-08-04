'use client'

import { useState } from 'react'
import { updateConstructionStatusAction } from '../actions'
import { Pause, Play, CheckCircle2, Hammer, FileText, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACTIVE_STATUSES = [
  { value: 'Tender', label: 'Tender', icon: FileText, description: 'Bidding / tendering phase' },
  { value: 'Ongoing', label: 'Ongoing', icon: Hammer, description: 'Construction underway' },
  { value: 'Completed', label: 'Completed', icon: CheckCircle2, description: 'Work finished on site' },
  { value: 'Handover', label: 'Handover', icon: Home, description: 'Formal handover to client' },
]

const CAN_PAUSE: string[] = ['admin', 'manager']

export function ConstructionStatusSelector({
  jobId,
  currentStatus,
  userRole,
}: {
  jobId: string
  currentStatus: string
  userRole: string
}) {
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)

  const isOnHold = status === 'On Hold'
  const canPause = CAN_PAUSE.includes(userRole)

  async function updateStatus(val: string) {
    setSaving(true)
    const result = await updateConstructionStatusAction(jobId, val)
    if (result.success) setStatus(val)
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      {/* On Hold banner */}
      {isOnHold && (
        <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-sm text-amber-800">
          <Pause className="w-4 h-4 shrink-0" />
          <span className="flex-1">Job is currently paused.</span>
          <button
            onClick={() => updateStatus('Ongoing')}
            disabled={saving}
            className="inline-flex items-center gap-1 text-xs font-medium text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-md disabled:opacity-50 transition-colors"
          >
            <Play className="w-3 h-3" />
            Resume
          </button>
        </div>
      )}

      {/* Status buttons */}
      <div className={cn('grid grid-cols-2 gap-2', isOnHold && 'opacity-40 pointer-events-none select-none')}>
        {ACTIVE_STATUSES.map(({ value, label, icon: Icon, description }) => {
          const active = status === value
          return (
            <button
              key={value}
              onClick={() => updateStatus(value)}
              disabled={saving || active}
              title={description}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all',
                active
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium cursor-default'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600 cursor-pointer',
                saving && !active && 'opacity-50',
              )}
            >
              <Icon className={cn('w-3.5 h-3.5 shrink-0', active ? 'text-blue-500' : 'text-gray-400')} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Pause / Resume toggle — admin and manager only */}
      {canPause && (
        <div className="pt-1 border-t border-gray-100">
          {isOnHold ? (
            <button
              onClick={() => updateStatus('Ongoing')}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 px-3 py-2 rounded-md disabled:opacity-50 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              Resume to Ongoing
            </button>
          ) : (
            <button
              onClick={() => updateStatus('On Hold')}
              disabled={saving || status === 'Handover'}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100 px-3 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={status === 'Handover' ? 'Handed-over jobs cannot be paused' : 'Pause this job'}
            >
              <Pause className="w-3.5 h-3.5" />
              Pause / Put On Hold
            </button>
          )}
        </div>
      )}
      {!canPause && isOnHold && (
        <p className="pt-1 text-xs text-amber-600 border-t border-gray-100 mt-1">
          Contact an admin or manager to resume this job.
        </p>
      )}
    </div>
  )
}

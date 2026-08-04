'use client'

import { useState } from 'react'
import { updateSurveyStatusAction } from '../actions'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { key: 'New', label: 'New' },
  { key: 'In Progress', label: 'In Progress' },
  { key: 'QA', label: 'QA Review' },
  { key: 'Delivered', label: 'Delivered' },
  { key: 'Paid', label: 'Paid' },
]

export function SurveyStatusStepper({ jobId, currentStatus }: { jobId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)

  const currentIdx = STEPS.findIndex((s) => s.key === status)

  async function advance() {
    if (currentIdx >= STEPS.length - 1) return
    const next = STEPS[currentIdx + 1].key
    setLoading(true)
    const result = await updateSurveyStatusAction(jobId, next)
    if (result.success) setStatus(next)
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 text-sm">Workflow Progress</h2>
        {currentIdx < STEPS.length - 1 && (
          <button
            onClick={advance}
            disabled={loading}
            className="text-xs text-blue-600 hover:underline disabled:opacity-50"
          >
            {loading ? 'Updating...' : `Mark as "${STEPS[currentIdx + 1]?.label}"`}
          </button>
        )}
      </div>
      <div className="flex items-center">
        {STEPS.map((step, idx) => {
          const done = idx < currentIdx
          const active = idx === currentIdx
          return (
            <div key={step.key} className="flex-1 flex items-center">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors',
                  done && 'bg-blue-600 border-blue-600 text-white',
                  active && 'border-blue-600 text-blue-600 bg-blue-50',
                  !done && !active && 'border-gray-200 text-gray-400 bg-white'
                )}>
                  {done ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                <span className={cn(
                  'text-xs mt-1 text-center whitespace-nowrap',
                  active ? 'text-blue-600 font-medium' : done ? 'text-gray-500' : 'text-gray-400'
                )}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn('flex-1 h-0.5 mx-1 mb-4', idx < currentIdx ? 'bg-blue-600' : 'bg-gray-200')} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

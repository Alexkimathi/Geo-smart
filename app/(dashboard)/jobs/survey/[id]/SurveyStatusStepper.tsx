'use client'

import { useState } from 'react'
import { updateSurveyStatusAction } from '../actions'
import { Check, Pause, Play, AlertTriangle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { key: 'New', label: 'New' },
  { key: 'In Progress', label: 'In Progress' },
  { key: 'QA', label: 'QA Review' },
  { key: 'Delivered', label: 'Delivered' },
  { key: 'Paid', label: 'Paid' },
]

const CAN_PAUSE: string[] = ['admin', 'manager']

export function SurveyStatusStepper({
  jobId,
  currentStatus,
  userRole,
}: {
  jobId: string
  currentStatus: string
  userRole: string
}) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)
  const [confirmStep, setConfirmStep] = useState<string | null>(null)

  const isOnHold = status === 'On Hold'
  const currentIdx = STEPS.findIndex((s) => s.key === status)
  const canPause = CAN_PAUSE.includes(userRole)

  async function moveTo(newStatus: string) {
    setLoading(true)
    setConfirmStep(null)
    const result = await updateSurveyStatusAction(jobId, newStatus)
    if (result.success) setStatus(newStatus)
    setLoading(false)
  }

  function handleStepClick(stepKey: string, stepIdx: number) {
    if (loading || isOnHold || stepKey === status) return
    if (stepIdx < currentIdx) {
      setConfirmStep(stepKey)
    } else {
      moveTo(stepKey)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-gray-900 text-sm">Workflow</h2>
        {canPause && (
          isOnHold ? (
            <button
              onClick={() => moveTo('In Progress')}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              Resume Job
            </button>
          ) : (
            <button
              onClick={() => moveTo('On Hold')}
              disabled={loading || status === 'Paid'}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={status === 'Paid' ? 'Paid jobs cannot be paused' : 'Pause this job'}
            >
              <Pause className="w-3.5 h-3.5" />
              Pause Job
            </button>
          )
        )}
      </div>

      {/* Hint: backward navigation */}
      {!isOnHold && currentIdx > 0 && (
        <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
          <RotateCcw className="w-3 h-3" />
          Click a completed step to roll back
        </p>
      )}

      {/* On Hold banner */}
      {isOnHold && (
        <div className="mb-4 flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <Pause className="w-4 h-4 shrink-0" />
          <span>
            This job is paused.
            {canPause
              ? <> Click <strong>Resume Job</strong> to continue the workflow.</>
              : ' Contact an admin or manager to resume it.'}
          </span>
        </div>
      )}

      {/* Step indicators */}
      <div className={cn('flex items-start', isOnHold && 'opacity-40 pointer-events-none select-none')}>
        {STEPS.map((step, idx) => {
          const done = idx < currentIdx
          const active = idx === currentIdx
          const isBackward = done && !isOnHold
          const isForward = !done && !active && !isOnHold

          return (
            <div key={step.key} className="flex-1 flex items-center min-w-0">
              <div className="flex flex-col items-center w-full">
                <button
                  onClick={() => handleStepClick(step.key, idx)}
                  disabled={loading || isOnHold || step.key === status}
                  title={
                    isBackward
                      ? `Roll back to "${step.label}"`
                      : isForward
                      ? `Advance to "${step.label}"`
                      : step.label
                  }
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all',
                    // Completed steps — clearly clickable with strong hover
                    done && 'bg-blue-600 border-blue-600 text-white hover:bg-white hover:text-blue-600 cursor-pointer ring-offset-1 hover:ring-2 hover:ring-blue-400',
                    // Active step
                    active && 'border-blue-600 text-blue-600 bg-blue-50 cursor-default ring-2 ring-blue-100',
                    // Future steps — clickable but subtle
                    isForward && 'border-gray-200 text-gray-400 bg-white hover:border-blue-300 hover:text-blue-500 cursor-pointer',
                    // Future steps not yet reachable (just visual)
                    !done && !active && !isForward && 'border-gray-200 text-gray-300 bg-white cursor-default',
                  )}
                >
                  {done ? <Check className="w-4 h-4" /> : idx + 1}
                </button>
                <span className={cn(
                  'text-xs mt-1 text-center leading-tight px-0.5',
                  active ? 'text-blue-600 font-medium' : done ? 'text-gray-500' : 'text-gray-400'
                )}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn(
                  'flex-1 h-0.5 mx-1 mb-5 shrink-0',
                  idx < currentIdx ? 'bg-blue-600' : 'bg-gray-200'
                )} />
              )}
            </div>
          )
        })}
      </div>

      {/* Next step shortcut */}
      {!isOnHold && currentIdx >= 0 && currentIdx < STEPS.length - 1 && !confirmStep && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-gray-400">Next:</span>
          <button
            onClick={() => moveTo(STEPS[currentIdx + 1].key)}
            disabled={loading}
            className="text-xs text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50 font-medium"
          >
            {loading ? 'Updating...' : `Mark as "${STEPS[currentIdx + 1].label}" →`}
          </button>
        </div>
      )}

      {/* Backward confirmation */}
      {confirmStep && (
        <div className="mt-4 flex flex-wrap items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
          <span className="text-sm text-yellow-800 flex-1">
            Roll back to <strong>{confirmStep}</strong>? Progress after that step will be unmarked.
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => moveTo(confirmStep)}
              disabled={loading}
              className="text-xs font-medium text-white bg-yellow-600 hover:bg-yellow-700 px-3 py-1.5 rounded-md disabled:opacity-50"
            >
              {loading ? 'Moving...' : 'Confirm'}
            </button>
            <button
              onClick={() => setConfirmStep(null)}
              className="text-xs text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-md border border-gray-200 bg-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

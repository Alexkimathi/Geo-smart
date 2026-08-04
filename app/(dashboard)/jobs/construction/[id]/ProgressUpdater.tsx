'use client'

import { useState } from 'react'
import { updateProgressAction } from '../actions'
import { cn } from '@/lib/utils'

const MILESTONES = [
  { pct: 0, label: 'Start' },
  { pct: 25, label: 'Foundation' },
  { pct: 50, label: 'Structure' },
  { pct: 75, label: 'Roofing' },
  { pct: 90, label: 'Finishing' },
  { pct: 100, label: 'Complete' },
]

export function ProgressUpdater({
  jobId,
  currentProgress,
}: {
  jobId: string
  currentProgress: number
}) {
  const [progress, setProgress] = useState(currentProgress)
  const [saving, setSaving] = useState(false)

  const isDirty = progress !== currentProgress

  async function save() {
    setSaving(true)
    await updateProgressAction(jobId, progress)
    setSaving(false)
  }

  const activeMilestone = MILESTONES.slice().reverse().find((m) => progress >= m.pct)

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">Completion</p>
          {activeMilestone && (
            <p className="text-xs text-gray-400 mt-0.5">{activeMilestone.label}</p>
          )}
        </div>
        <span className="text-3xl font-bold text-gray-900 tabular-nums">{progress}%</span>
      </div>

      {/* Progress bar with milestone markers */}
      <div className="relative">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: progress === 100
                ? 'linear-gradient(90deg, #2563eb, #16a34a)'
                : 'linear-gradient(90deg, #2563eb, #3b82f6)',
            }}
          />
        </div>
        {/* Milestone tick marks */}
        <div className="relative mt-1">
          {MILESTONES.filter((m) => m.pct > 0 && m.pct < 100).map((m) => (
            <div
              key={m.pct}
              className="absolute flex flex-col items-center"
              style={{ left: `${m.pct}%`, transform: 'translateX(-50%)' }}
            >
              <div className={cn(
                'w-0.5 h-1.5 rounded-full',
                progress >= m.pct ? 'bg-blue-400' : 'bg-gray-300'
              )} />
            </div>
          ))}
        </div>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={progress}
        onChange={(e) => setProgress(Number(e.target.value))}
        className="w-full accent-blue-600"
      />

      {/* Milestone quick-set buttons */}
      <div>
        <p className="text-xs text-gray-400 mb-2">Quick set</p>
        <div className="flex flex-wrap gap-1.5">
          {MILESTONES.map((m) => (
            <button
              key={m.pct}
              onClick={() => setProgress(m.pct)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md border transition-colors',
                progress === m.pct
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600'
              )}
            >
              {m.label} ({m.pct}%)
            </button>
          ))}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={save}
        disabled={saving || !isDirty}
        className={cn(
          'w-full py-2 text-sm font-medium rounded-lg transition-colors',
          isDirty
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        )}
      >
        {saving ? 'Saving...' : isDirty ? `Save — ${progress}%` : 'No changes'}
      </button>
    </div>
  )
}

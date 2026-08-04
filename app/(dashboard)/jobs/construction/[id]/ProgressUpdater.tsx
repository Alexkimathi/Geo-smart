'use client'

import { useState } from 'react'
import { updateProgressAction } from '../actions'

export function ProgressUpdater({ jobId, currentProgress }: { jobId: string; currentProgress: number }) {
  const [progress, setProgress] = useState(currentProgress)
  const [saving, setSaving] = useState(false)

  async function save(val: number) {
    setSaving(true)
    await updateProgressAction(jobId, val)
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Completion</span>
        <span className="text-2xl font-bold text-gray-900">{progress}%</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="flex-1 accent-blue-600"
        />
        <button
          onClick={() => save(progress)}
          disabled={saving || progress === currentProgress}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Update'}
        </button>
      </div>
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, EyeOff } from 'lucide-react'

interface Props {
  jobId: string
  jobType: 'survey' | 'construction'
  userRole: string
  deleteAction: (jobId: string) => Promise<{ error?: string; success?: boolean }>
  archiveAction: (jobId: string) => Promise<{ error?: string; success?: boolean }>
}

export function JobActions({ jobId, jobType, userRole, deleteAction, archiveAction }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState<'delete' | 'archive' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = userRole === 'admin'
  const isManager = userRole === 'manager'
  const listPath = jobType === 'survey' ? '/jobs/survey' : '/jobs/construction'

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAction(jobId)
      if (result.error) {
        setError(result.error)
        setConfirming(null)
      } else {
        router.push(listPath)
      }
    })
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveAction(jobId)
      if (result.error) {
        setError(result.error)
        setConfirming(null)
      } else {
        router.push(listPath)
      }
    })
  }

  if (confirming === 'delete') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-600 font-medium">Permanently delete this job?</span>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="text-sm font-medium text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          {isPending ? 'Deleting...' : 'Yes, delete'}
        </button>
        <button
          onClick={() => setConfirming(null)}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-md border border-gray-200"
        >
          Cancel
        </button>
      </div>
    )
  }

  if (confirming === 'archive') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700 font-medium">Hide this job from all lists?</span>
        <button
          onClick={handleArchive}
          disabled={isPending}
          className="text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          {isPending ? 'Hiding...' : 'Yes, hide'}
        </button>
        <button
          onClick={() => setConfirming(null)}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-md border border-gray-200"
        >
          Cancel
        </button>
      </div>
    )
  }

  // Only admin and manager have any actions here
  if (!isAdmin && !isManager) return null

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-sm text-red-600">{error}</span>}
      {isAdmin && (
        <button
          onClick={() => setConfirming('delete')}
          className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-md border border-red-200 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      )}
      {isManager && (
        <button
          onClick={() => setConfirming('archive')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200 transition-colors"
        >
          <EyeOff className="w-4 h-4" />
          Hide
        </button>
      )}
    </div>
  )
}

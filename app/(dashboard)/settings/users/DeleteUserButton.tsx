'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteUserAction } from './actions'

export function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteUserAction(userId)
      if (result.error) {
        setError(result.error)
        setConfirming(false)
      } else {
        router.refresh()
      }
    })
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        {error && <span className="text-xs text-red-600">{error}</span>}
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-2.5 py-1.5 rounded-md disabled:opacity-50"
        >
          {isPending ? 'Removing...' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-md border border-gray-200"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 px-2.5 py-1.5 rounded-md border border-red-200 hover:bg-red-50 transition-colors"
    >
      <Trash2 className="w-3.5 h-3.5" />Remove
    </button>
  )
}

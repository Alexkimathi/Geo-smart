'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteDocumentAction } from '@/app/(dashboard)/finance/actions'

interface Props {
  docId: string
  docNo: string
  redirectTo: string   // e.g. '/finance/quotations'
}

export function DeleteDocumentButton({ docId, docNo, redirectTo }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleDelete() {
    if (!confirm(`Delete ${docNo}? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteDocumentAction(docId)
      if (result.error) {
        setError(result.error)
      } else {
        router.push(redirectTo)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleDelete}
        disabled={pending}
        className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-md border border-red-200 transition-colors disabled:opacity-50"
      >
        <Trash2 className="w-4 h-4" />
        {pending ? 'Deleting...' : 'Delete'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

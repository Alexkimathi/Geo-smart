'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteDocumentAction } from '@/app/(dashboard)/documents/actions'

interface Props {
  docId: string
  storagePath: string
}

export function DeleteDocumentButton({ docId, storagePath }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Delete this document? This cannot be undone.')) return
    startTransition(async () => {
      await deleteDocumentAction(docId, storagePath)
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
      title="Delete"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}

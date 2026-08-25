'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { deleteClientAction } from '../actions'

export function DeleteClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteClientAction(clientId)
      if (result.error) {
        setError(result.error)
        setConfirming(false)
      } else {
        router.push('/clients')
      }
    })
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-red-600">{error}</span>}
        <span className="text-sm text-gray-600">Delete {clientName}?</span>
        <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isPending}>
          {isPending ? 'Deleting...' : 'Confirm'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={isPending}>
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
      <Trash2 className="w-4 h-4" />
      Delete
    </Button>
  )
}

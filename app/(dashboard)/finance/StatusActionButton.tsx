'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { updateDocumentStatusAction } from '@/app/(dashboard)/finance/actions'
import type { FinanceDocStatus } from '@/types/database'

interface Props {
  docId: string
  status: FinanceDocStatus
  label: string
  variant?: 'default' | 'outline'
}

export function StatusActionButton({ docId, status, label, variant = 'default' }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleClick() {
    startTransition(async () => {
      const result = await updateDocumentStatusAction(docId, status)
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handleClick} disabled={pending} size="sm" variant={variant}>
        {pending ? 'Updating...' : label}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { convertQuotationAction } from '@/app/(dashboard)/finance/actions'

export function ConvertQuotationButton({ quotationId }: { quotationId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleConvert() {
    startTransition(async () => {
      const result = await convertQuotationAction(quotationId)
      if (result.error) {
        setError(result.error)
      } else if (result.docId) {
        router.push(`/finance/invoices/${result.docId}`)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handleConvert} disabled={pending} size="sm">
        <ArrowRight className="w-4 h-4" />
        {pending ? 'Converting...' : 'Convert to Invoice'}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

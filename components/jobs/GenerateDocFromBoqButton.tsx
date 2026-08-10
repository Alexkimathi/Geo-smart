'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { generateDocFromBoqAction } from '@/app/(dashboard)/finance/actions'
import { FileText, Loader2 } from 'lucide-react'

interface Props {
  jobId: string
  docType: 'Invoice' | 'Quotation'
}

export function GenerateDocFromBoqButton({ jobId, docType }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleClick() {
    setLoading(true)
    setError(null)
    const result = await generateDocFromBoqAction(jobId, 'construction', docType)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else if (result.docId) {
      const path = docType === 'Invoice' ? 'invoices' : 'quotations'
      router.push(`/finance/${path}/${result.docId}`)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <FileText className="w-3.5 h-3.5" />
        )}
        {loading ? `Generating ${docType}…` : `Generate ${docType} from BOQ`}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

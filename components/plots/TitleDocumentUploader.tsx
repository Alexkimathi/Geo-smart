'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, Upload, Trash2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteReservationDocAction } from '@/app/(dashboard)/plots/actions'
import type { ReservationDocument } from '@/types/database'

export const TITLE_CHECKLIST = [
  'Copy of National ID',
  'KRA PIN Certificate',
  'Signed Sale Agreement',
  'Full payment receipt',
  'Land Search Certificate',
  'Transfer documents',
]

interface Props {
  reservationId: string
  docs: ReservationDocument[]
  canUpload: boolean
}

export function TitleDocumentUploader({ reservationId, docs, canUpload }: Props) {
  const [localDocs, setLocalDocs] = useState<ReservationDocument[]>(docs)
  const [selectedType, setSelectedType] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadedTypes = new Set(localDocs.map((d) => d.document_type))
  const uploadedCount = TITLE_CHECKLIST.filter((item) => uploadedTypes.has(item)).length

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedType) return

    setUploading(true)
    setError(null)

    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${reservationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadErr } = await supabase.storage.from('reservation-docs').upload(path, file)
    if (uploadErr) {
      setError(uploadErr.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('reservation-docs').getPublicUrl(path)

    const { data: doc, error: dbErr } = await supabase
      .from('reservation_documents')
      .insert({
        reservation_id: reservationId,
        document_type: selectedType,
        url: publicUrl,
        file_name: file.name,
      })
      .select()
      .single()

    if (dbErr) {
      setError(dbErr.message)
      setUploading(false)
      return
    }

    setLocalDocs((prev) => [...prev, doc as ReservationDocument])
    setSelectedType('')
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleDelete(doc: ReservationDocument) {
    const result = await deleteReservationDocAction(doc.id, reservationId)
    if (result.error) { setError(result.error); return }
    setLocalDocs((prev) => prev.filter((d) => d.id !== doc.id))
  }

  return (
    <div>
      {/* Progress summary */}
      <p className="text-xs text-gray-500 mb-3">
        {uploadedCount} of {TITLE_CHECKLIST.length} documents provided
      </p>

      {/* Checklist */}
      <ul className="space-y-2 mb-5">
        {TITLE_CHECKLIST.map((item) => {
          const doc = localDocs.find((d) => d.document_type === item)
          return (
            <li key={item} className="flex items-center gap-2.5 text-sm">
              {doc ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span className={doc ? 'text-gray-800 font-medium' : 'text-gray-400'}>{item}</span>
              {doc && (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-xs text-blue-600 hover:underline shrink-0"
                  title={doc.file_name}
                >
                  <FileText className="w-3 h-3" />
                  View
                </a>
              )}
              {doc && canUpload && (
                <button
                  onClick={() => handleDelete(doc)}
                  className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                  title="Remove document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {/* Upload section */}
      {canUpload && (
        <div className="pt-4 border-t border-gray-100 space-y-2">
          <p className="text-xs font-medium text-gray-600">Upload a document</p>
          <div className="flex gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="flex-1 h-9 px-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select document…</option>
              {TITLE_CHECKLIST.map((item) => (
                <option key={item} value={item}>
                  {uploadedTypes.has(item) ? `✓ ${item}` : item}
                </option>
              ))}
            </select>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!selectedType || uploading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading…' : 'Choose file'}
            </Button>
          </div>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}

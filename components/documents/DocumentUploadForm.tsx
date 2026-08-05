'use client'

import { useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createDocumentAction } from '@/app/(dashboard)/documents/actions'
import type { SurveyJob, ConstructionJob } from '@/types/database'

const CATEGORIES = [
  'Survey Report',
  'Drawing',
  'Contract',
  'Site Photo',
  'Certificate',
  'BOQ',
  'Other',
]

type Job = Pick<SurveyJob, 'id' | 'job_no' | 'site_name'> & { job_type: 'survey' }
  | Pick<ConstructionJob, 'id' | 'job_no' | 'project_name'> & { job_type: 'construction' }

interface Props {
  jobs: Array<{ id: string; label: string; job_type: 'survey' | 'construction' }>
  defaultJobId?: string
  defaultJobType?: 'survey' | 'construction'
}

export function DocumentUploadForm({ jobs, defaultJobId, defaultJobType }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Other')
  const [jobId, setJobId] = useState(defaultJobId ?? '')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file && !name) setName(file.name.replace(/\.[^.]+$/, ''))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const file = fileRef.current?.files?.[0]
    if (!file) { setError('Please select a file'); return }
    if (!name.trim()) { setError('Please enter a document name'); return }

    setUploading(true)
    setProgress(0)

    // Determine job type from selected job
    const selectedJob = jobs.find((j) => j.id === jobId)
    const jobType = selectedJob?.job_type ?? defaultJobType ?? null

    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${jobType ?? 'general'}/${Date.now()}_${file.name}`

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, file, { upsert: false })

    setUploading(false)

    if (uploadError) { setError(uploadError.message); return }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(uploadData.path)

    setProgress(100)

    startTransition(async () => {
      const result = await createDocumentAction(
        name.trim(),
        category,
        publicUrl,
        file.size,
        file.type,
        jobType,
        jobId || null,
        null
      )
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setName('')
        setCategory('Other')
        setJobId(defaultJobId ?? '')
        setProgress(0)
        if (fileRef.current) fileRef.current.value = ''
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2">
          Document uploaded successfully.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* File picker */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">File</label>
          <input
            ref={fileRef}
            type="file"
            accept="*"
            onChange={handleFileChange}
            required
            className="block w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-200 rounded-lg p-1.5"
          />
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Document Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter document name"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Job */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Linked Job (optional)</label>
          <select
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— No job —</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Progress bar */}
      {(uploading || progress > 0) && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={uploading || isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Uploading...' : isPending ? 'Saving...' : 'Upload Document'}
        </button>
      </div>
    </form>
  )
}

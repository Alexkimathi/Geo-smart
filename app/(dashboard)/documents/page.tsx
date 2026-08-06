import { createServiceClient } from '@/lib/supabase/service'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { DocumentUploadForm } from '@/components/documents/DocumentUploadForm'
import { DeleteDocumentButton } from '@/components/documents/DeleteDocumentButton'
import { DocumentSearch } from '@/components/documents/DocumentSearch'
import { Download, FolderOpen, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import type { DocumentWithUploader, SurveyJob, ConstructionJob } from '@/types/database'

const CATEGORY_COLORS: Record<string, 'blue' | 'green' | 'yellow' | 'orange' | 'purple' | 'gray'> = {
  'Survey Report': 'blue',
  'Drawing': 'purple',
  'Contract': 'orange',
  'Site Photo': 'green',
  'Certificate': 'yellow',
  'BOQ': 'blue',
  'Other': 'gray',
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; job_id?: string; job_type?: string; q?: string }>
}) {
  const params = await searchParams
  // Accept both ?job= (from job detail pages) and ?job_id=
  const jobId = params.job ?? params.job_id ?? null
  const jobType = params.job_type ?? null
  const query = params.q?.toLowerCase() ?? ''

  const db = createServiceClient()

  const [
    { data: rawDocs },
    { data: surveyJobs },
    { data: constructionJobs },
  ] = await Promise.all([
    db
      .from('documents')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: DocumentWithUploader[] | null }>,
    db
      .from('survey_jobs')
      .select('id, job_no, site_name')
      .eq('is_archived', false)
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: Pick<SurveyJob, 'id' | 'job_no' | 'site_name'>[] | null }>,
    db
      .from('construction_jobs')
      .select('id, job_no, project_name')
      .eq('is_archived', false)
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: Pick<ConstructionJob, 'id' | 'job_no' | 'project_name'>[] | null }>,
  ])

  const allDocs = rawDocs ?? []

  // If a job is specified, show only that job's documents
  let docs = jobId
    ? allDocs.filter((d) => d.job_id === jobId)
    : allDocs

  // Apply text search on the main (unfiltered) page
  if (!jobId && query) {
    docs = docs.filter(
      (d) =>
        d.name.toLowerCase().includes(query) ||
        d.category.toLowerCase().includes(query)
    )
  }

  // Build job lookup for display
  const jobLookup = new Map<string, { no: string; name: string }>([
    ...(surveyJobs ?? []).map((j) => [j.id, { no: j.job_no, name: j.site_name }] as [string, { no: string; name: string }]),
    ...(constructionJobs ?? []).map((j) => [j.id, { no: j.job_no, name: j.project_name }] as [string, { no: string; name: string }]),
  ])

  // Job info for the filtered view header
  const jobInfo = jobId ? jobLookup.get(jobId) : null

  // Jobs list for the upload form
  const jobs = [
    ...(surveyJobs ?? []).map((j) => ({
      id: j.id,
      label: `${j.job_no} — ${j.site_name} [Survey]`,
      job_type: 'survey' as const,
    })),
    ...(constructionJobs ?? []).map((j) => ({
      id: j.id,
      label: `${j.job_no} — ${j.project_name} [Construction]`,
      job_type: 'construction' as const,
    })),
  ]

  // Suggestions for search (all docs, name + category)
  const suggestions = allDocs.map((d) => ({ id: d.id, name: d.name, category: d.category }))

  const isJobFiltered = !!jobId

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          {isJobFiltered && (
            <Link
              href="/documents"
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              <ChevronLeft className="w-4 h-4" />All Documents
            </Link>
          )}
          <h1 className="text-2xl font-bold text-gray-900">
            {isJobFiltered && jobInfo
              ? `Documents — ${jobInfo.no}`
              : 'Documents'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isJobFiltered && jobInfo
              ? jobInfo.name
              : `${docs.length} document${docs.length !== 1 ? 's' : ''}${query ? ' matching search' : ''}`}
          </p>
        </div>
        <FolderOpen className="w-8 h-8 text-gray-300 shrink-0" />
      </div>

      {/* Search bar — only on main page */}
      {!isJobFiltered && (
        <div className="mb-4">
          <DocumentSearch suggestions={suggestions} initialQuery={query} />
        </div>
      )}

      {/* Upload form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Upload Document</h2>
        <DocumentUploadForm
          jobs={jobs}
          defaultJobId={jobId ?? undefined}
          defaultJobType={jobType as 'survey' | 'construction' | undefined}
        />
      </div>

      {/* Documents table */}
      {docs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FolderOpen className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-lg font-medium">
            {isJobFiltered ? 'No documents for this job' : query ? 'No documents match your search' : 'No documents yet'}
          </p>
          <p className="text-sm mt-1">
            {isJobFiltered ? 'Upload the first document for this job above' : 'Upload your first document above'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                {!isJobFiltered && (
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Job</th>
                )}
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Uploaded by</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Size</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {docs.map((doc) => {
                const urlParts = doc.file_url.split('/documents/')
                const storagePath = urlParts[1] ?? doc.file_url
                const job = doc.job_id ? jobLookup.get(doc.job_id) : null

                return (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 block truncate max-w-[200px]">
                        {doc.name}
                      </span>
                      {doc.mime_type && (
                        <span className="text-xs text-gray-400">{doc.mime_type}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={CATEGORY_COLORS[doc.category] ?? 'gray'}>
                        {doc.category}
                      </Badge>
                    </td>
                    {!isJobFiltered && (
                      <td className="px-4 py-3 text-gray-500">
                        {job
                          ? <span className="font-mono text-xs">{job.no}</span>
                          : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-600">
                      {doc.profiles?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatBytes(doc.file_size)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <DeleteDocumentButton docId={doc.id} storagePath={storagePath} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

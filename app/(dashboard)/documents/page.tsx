import { createServiceClient } from '@/lib/supabase/service'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { DocumentUploadForm } from '@/components/documents/DocumentUploadForm'
import { DeleteDocumentButton } from '@/components/documents/DeleteDocumentButton'
import { Download, FolderOpen } from 'lucide-react'
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
  searchParams: Promise<{ job_id?: string; job_type?: string }>
}) {
  const { job_id, job_type } = await searchParams
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

  // Filter by job if query params present
  const docs = job_id
    ? (rawDocs ?? []).filter((d) => d.job_id === job_id)
    : (rawDocs ?? [])

  // Build job lookup for display
  const jobLookup = new Map<string, string>([
    ...(surveyJobs ?? []).map((j) => [j.id, j.job_no] as [string, string]),
    ...(constructionJobs ?? []).map((j) => [j.id, j.job_no] as [string, string]),
  ])

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

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {docs.length} document{docs.length !== 1 ? 's' : ''}
            {job_id && ' (filtered by job)'}
          </p>
        </div>
        <FolderOpen className="w-8 h-8 text-gray-300" />
      </div>

      {/* Upload form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Upload Document</h2>
        <DocumentUploadForm
          jobs={jobs}
          defaultJobId={job_id}
          defaultJobType={job_type as 'survey' | 'construction' | undefined}
        />
      </div>

      {/* Documents table */}
      {docs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FolderOpen className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-lg font-medium">No documents yet</p>
          <p className="text-sm mt-1">Upload your first document above</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Job</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Uploaded by</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Size</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {docs.map((doc) => {
                // Extract storage path from public URL for deletion
                const urlParts = doc.file_url.split('/documents/')
                const storagePath = urlParts[1] ?? doc.file_url

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
                    <td className="px-4 py-3 text-gray-500">
                      {doc.job_id
                        ? <span className="font-mono text-xs">{jobLookup.get(doc.job_id) ?? '—'}</span>
                        : '—'}
                    </td>
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

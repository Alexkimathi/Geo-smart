import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Calendar, MapPin, User, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { SurveyStatusStepper } from './SurveyStatusStepper'
import type { SurveyJob, Client } from '@/types/database'

const SURVEY_TYPE_LABELS: Record<string, string> = {
  Topo: 'Topographic Survey',
  Cadastral: 'Cadastral Survey',
  Control: 'Control Survey',
  'Setting Out': 'Setting Out',
}

const STATUS_COLORS: Record<string, 'gray' | 'blue' | 'yellow' | 'purple' | 'green'> = {
  New: 'gray',
  'In Progress': 'blue',
  QA: 'yellow',
  Delivered: 'purple',
  Paid: 'green',
}

export default async function SurveyJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: job } = await supabase
    .from('survey_jobs')
    .select('*, clients(id, name, company, phone, email)')
    .eq('id', id)
    .single() as unknown as {
      data: (SurveyJob & { clients: Pick<Client, 'id' | 'name' | 'company' | 'phone' | 'email'> | null }) | null
    }

  if (!job) notFound()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/jobs/survey" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" />Back to Survey Jobs
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold font-mono text-gray-900">{job.job_no}</h1>
            <Badge variant={STATUS_COLORS[job.status] ?? 'gray'} className="text-sm px-3 py-1">
              {job.status}
            </Badge>
          </div>
          <p className="text-gray-600">{job.site_name}</p>
          <p className="text-sm text-gray-400">Created {formatDate(job.created_at)}</p>
        </div>
        <Link href={`/jobs/survey/${id}/edit`} className="text-sm text-blue-600 hover:underline">Edit Job</Link>
      </div>

      {/* Status stepper */}
      <div className="mb-6">
        <SurveyStatusStepper jobId={id} currentStatus={job.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Job Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-gray-400">Survey Type</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5">
                  {SURVEY_TYPE_LABELS[job.survey_type] ?? job.survey_type}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">County</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5 flex items-center gap-1">
                  {job.county ? <><MapPin className="w-3.5 h-3.5 text-gray-400" />{job.county}</> : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Start Date</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />{formatDate(job.start_date)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">End Date</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />{formatDate(job.end_date)}
                </dd>
              </div>
            </dl>
            {job.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <dt className="text-xs text-gray-400 mb-1">Notes</dt>
                <dd className="text-sm text-gray-600">{job.notes}</dd>
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Documents</h2>
              <Link href={`/documents?job=${id}&job_type=survey`} className="text-xs text-blue-600 hover:underline">
                Manage documents
              </Link>
            </div>
            <div className="space-y-2">
              {job.report_file_url ? (
                <a href={job.report_file_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                  <FileText className="w-4 h-4" />Survey Report
                </a>
              ) : (
                <p className="text-sm text-gray-400">No report uploaded yet</p>
              )}
              {job.drawing_file_url && (
                <a href={job.drawing_file_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                  <FileText className="w-4 h-4" />Drawing File
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Client panel */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Client</h2>
            {job.clients ? (
              <div className="space-y-2">
                <Link href={`/clients/${job.clients.id}`} className="font-medium text-blue-600 hover:underline flex items-center gap-1">
                  <User className="w-4 h-4" />{job.clients.name}
                </Link>
                {job.clients.company && <p className="text-sm text-gray-500">{job.clients.company}</p>}
                {job.clients.phone && <p className="text-sm text-gray-600">{job.clients.phone}</p>}
                {job.clients.email && <p className="text-sm text-gray-600">{job.clients.email}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No client linked</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Calendar, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ProgressUpdater } from './ProgressUpdater'
import { ConstructionStatusSelector } from './ConstructionStatusSelector'
import type { ConstructionJob, Client } from '@/types/database'

const STATUS_COLORS: Record<string, 'blue' | 'green' | 'purple' | 'yellow'> = {
  Ongoing: 'blue', Completed: 'green', Handover: 'purple', Tender: 'yellow',
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  House: 'House', Commercial: 'Commercial', Road: 'Road', Tender: 'Tender',
}

export default async function ConstructionJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: job } = await supabase
    .from('construction_jobs')
    .select('*, clients(id, name, company, phone, email)')
    .eq('id', id)
    .single() as unknown as {
      data: (ConstructionJob & { clients: Pick<Client, 'id' | 'name' | 'company' | 'phone' | 'email'> | null }) | null
    }

  if (!job) notFound()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/jobs/construction" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" />Back to Construction Jobs
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold font-mono text-gray-900">{job.job_no}</h1>
            <Badge variant={STATUS_COLORS[job.status] ?? 'blue'} className="capitalize text-sm px-3 py-1">
              {job.status}
            </Badge>
          </div>
          <p className="text-gray-600 text-lg">{job.project_name}</p>
          <p className="text-sm text-gray-400">Created {formatDate(job.created_at)}</p>
        </div>
        <Link href={`/jobs/construction/${id}/edit`} className="text-sm text-blue-600 hover:underline">Edit Job</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Progress */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Progress</h2>
            <ProgressUpdater jobId={id} currentProgress={job.progress_pct} />
          </div>

          {/* Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Job Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-gray-400">Project Type</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5">
                  {PROJECT_TYPE_LABELS[job.project_type] ?? job.project_type}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Status</dt>
                <dd className="mt-0.5">
                  <ConstructionStatusSelector jobId={id} currentStatus={job.status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Contract Value</dt>
                <dd className="text-sm font-semibold text-gray-900 mt-0.5">{formatCurrency(job.contract_value)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">BOQ Total</dt>
                <dd className="text-sm font-semibold text-gray-900 mt-0.5">{formatCurrency(job.boq_total)}</dd>
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
        </div>

        <div className="space-y-4">
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

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Quick Links</h2>
            <div className="space-y-2">
              <Link href={`/finance/invoices?job=${id}&job_type=construction`} className="block text-sm text-blue-600 hover:underline">Invoices</Link>
              <Link href={`/documents?job=${id}&job_type=construction`} className="block text-sm text-blue-600 hover:underline">Documents</Link>
              <Link href={`/timesheets?job=${id}&job_type=construction`} className="block text-sm text-blue-600 hover:underline">Timesheets</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

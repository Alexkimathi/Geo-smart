import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Calendar, User, FileText,
  Hash, ClipboardList, TrendingUp, Pencil,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ProgressUpdater } from './ProgressUpdater'
import { ConstructionStatusSelector } from './ConstructionStatusSelector'
import { JobActions } from '@/components/jobs/JobActions'
import { JobNotes } from '@/components/jobs/JobNotes'
import { deleteConstructionJobAction, archiveConstructionJobAction } from '@/app/(dashboard)/jobs/construction/actions'
import type { ConstructionJob, Client, JobNoteWithProfile } from '@/types/database'

const STATUS_COLORS: Record<string, 'blue' | 'green' | 'purple' | 'yellow' | 'gray'> = {
  Ongoing: 'blue',
  Completed: 'green',
  Handover: 'purple',
  Tender: 'yellow',
  'On Hold': 'gray',
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  House: 'House Construction',
  Commercial: 'Commercial Construction',
  Road: 'Road Construction',
  Tender: 'Tender',
}

export default async function ConstructionJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createServiceClient()
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()

  const [{ data: job }, { data: profile }, { data: notes }] = await Promise.all([
    db
      .from('construction_jobs')
      .select('*, clients(id, name, company, phone, email, site_location, pin, contact_person)')
      .eq('id', id)
      .single() as unknown as Promise<{
        data: (ConstructionJob & {
          clients: Pick<Client, 'id' | 'name' | 'company' | 'phone' | 'email' | 'site_location' | 'pin' | 'contact_person'> | null
        }) | null
      }>,
    user
      ? db.from('profiles').select('role').eq('id', user.id).single() as unknown as Promise<{ data: { role: string } | null }>
      : Promise.resolve({ data: null }),
    db
      .from('job_notes')
      .select('*, profiles(full_name)')
      .eq('job_id', id)
      .eq('job_type', 'construction')
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: JobNoteWithProfile[] | null }>,
  ])

  if (!job) notFound()

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <Link href="/jobs/construction" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" />Back to Construction Jobs
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold font-mono text-gray-900">{job.job_no}</h1>
            <Badge variant={STATUS_COLORS[job.status] ?? 'blue'} className="text-sm px-3 py-1">
              {job.status}
            </Badge>
          </div>
          <p className="text-lg font-medium text-gray-800">{job.project_name}</p>
          <p className="text-xs text-gray-400 mt-1">Created {formatDate(job.created_at)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/jobs/construction/${id}/edit`}
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200 transition-colors"
          >
            <Pencil className="w-4 h-4" />Edit
          </Link>
          <JobActions
            jobId={id}
            jobType="construction"
            userRole={profile?.role ?? ''}
            deleteAction={deleteConstructionJobAction}
            archiveAction={archiveConstructionJobAction}
          />
        </div>
      </div>

      {/* Workflow: Progress + Status side by side */}
      <div className="mb-6 bg-white rounded-xl border border-gray-200 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />Progress
            </h2>
            <ProgressUpdater jobId={id} currentProgress={job.progress_pct} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-gray-400" />Status
            </h2>
            <ConstructionStatusSelector jobId={id} currentStatus={job.status} userRole={profile?.role ?? ''} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">

          {/* Job Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-gray-400" />Job Details
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Job Number</dt>
                <dd className="text-sm font-mono font-semibold text-gray-900 mt-1">{job.job_no}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Project Type</dt>
                <dd className="text-sm font-medium text-gray-900 mt-1">
                  {PROJECT_TYPE_LABELS[job.project_type] ?? job.project_type}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Project Name</dt>
                <dd className="text-sm font-medium text-gray-900 mt-1">{job.project_name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Contract Value</dt>
                <dd className="text-sm font-semibold text-gray-900 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                  {formatCurrency(job.contract_value)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">BOQ Total</dt>
                <dd className="text-sm font-semibold text-gray-900 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                  {formatCurrency(job.boq_total)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Start Date</dt>
                <dd className="text-sm font-medium text-gray-900 mt-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />{formatDate(job.start_date)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">End Date</dt>
                <dd className="text-sm font-medium text-gray-900 mt-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />{formatDate(job.end_date)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Last Updated</dt>
                <dd className="text-sm text-gray-600 mt-1">{formatDate(job.updated_at)}</dd>
              </div>
            </dl>

            {job.notes && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Notes</dt>
                <dd className="text-sm text-gray-700 whitespace-pre-wrap">{job.notes}</dd>
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />Documents
              </h2>
              <Link href={`/documents?job=${id}&job_type=construction`} className="text-xs text-blue-600 hover:underline">
                Manage documents
              </Link>
            </div>
            <p className="text-sm text-gray-400">No documents uploaded yet</p>
          </div>

          {/* Notes */}
          <JobNotes
            jobId={id}
            jobType="construction"
            initialNotes={notes ?? []}
            currentUserId={user?.id ?? ''}
            currentUserRole={profile?.role ?? ''}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Client */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />Client
            </h2>
            {job.clients ? (
              <div className="space-y-2">
                <Link href={`/clients/${job.clients.id}`}
                  className="font-medium text-blue-600 hover:underline block">
                  {job.clients.name}
                </Link>
                {job.clients.company && (
                  <p className="text-sm text-gray-500">{job.clients.company}</p>
                )}
                {job.clients.contact_person && (
                  <div>
                    <p className="text-xs text-gray-400">Contact Person</p>
                    <p className="text-sm text-gray-700">{job.clients.contact_person}</p>
                  </div>
                )}
                {job.clients.phone && (
                  <p className="text-sm text-gray-600">
                    <a href={`tel:${job.clients.phone}`} className="hover:underline">{job.clients.phone}</a>
                  </p>
                )}
                {job.clients.email && (
                  <p className="text-sm text-gray-600">
                    <a href={`mailto:${job.clients.email}`} className="hover:underline">{job.clients.email}</a>
                  </p>
                )}
                {job.clients.pin && (
                  <div>
                    <p className="text-xs text-gray-400">KRA PIN</p>
                    <p className="text-sm font-mono text-gray-700">{job.clients.pin}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No client linked</p>
            )}
          </div>

          {/* Quick links */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4 text-gray-400" />Quick Links
            </h2>
            <div className="space-y-2">
              <Link href={`/finance/invoices?job=${id}&job_type=construction`}
                className="block text-sm text-blue-600 hover:underline">Invoices</Link>
              <Link href={`/documents?job=${id}&job_type=construction`}
                className="block text-sm text-blue-600 hover:underline">Documents</Link>
              <Link href={`/timesheets?job=${id}&job_type=construction`}
                className="block text-sm text-blue-600 hover:underline">Timesheets</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

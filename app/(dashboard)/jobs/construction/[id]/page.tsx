import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Calendar, User, FileText,
  Hash, ClipboardList, TrendingUp, Pencil, Receipt, AlertTriangle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ProgressUpdater } from './ProgressUpdater'
import { ConstructionStatusSelector } from './ConstructionStatusSelector'
import { JobActions } from '@/components/jobs/JobActions'
import { JobNotes } from '@/components/jobs/JobNotes'
import { BoqEditor } from '@/components/finance/BoqEditor'
import { deleteConstructionJobAction, archiveConstructionJobAction } from '@/app/(dashboard)/jobs/construction/actions'
import type { ConstructionJob, Client, JobNoteWithProfile, Expense, BoqItem, Lpo, Timesheet } from '@/types/database'
import { JobClockInOut } from '@/components/timesheets/JobClockInOut'

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

export const dynamic = 'force-dynamic'

export default async function ConstructionJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createServiceClient()
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()

  const [{ data: job }, { data: profile }, { data: notes }, { data: expenses }, { data: invoices }, { data: lpos }, { data: boqItems }, { data: openTimesheet }] = await Promise.all([
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
      ? db.from('profiles').select('role, full_name').eq('id', user.id).single() as unknown as Promise<{ data: { role: string; full_name: string } | null }>
      : Promise.resolve({ data: null }),
    db
      .from('job_notes')
      .select('*, profiles(full_name)')
      .eq('job_id', id)
      .eq('job_type', 'construction')
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: JobNoteWithProfile[] | null }>,
    db
      .from('expenses')
      .select('*')
      .eq('job_id', id)
      .eq('job_type', 'construction')
      .order('expense_date', { ascending: false }) as unknown as Promise<{ data: Expense[] | null }>,
    db
      .from('finance_documents')
      .select('total, status')
      .eq('job_id', id)
      .eq('job_type', 'construction')
      .eq('type', 'Invoice') as unknown as Promise<{ data: { total: number; status: string }[] | null }>,
    db
      .from('lpos')
      .select('total, status')
      .eq('job_id', id)
      .eq('job_type', 'construction')
      .neq('status', 'Cancelled') as unknown as Promise<{ data: Pick<Lpo, 'total' | 'status'>[] | null }>,
    db
      .from('boq_items')
      .select('*')
      .eq('job_id', id)
      .eq('job_type', 'construction')
      .order('sort_order') as unknown as Promise<{ data: BoqItem[] | null }>,
    user
      ? db
          .from('timesheets')
          .select('*')
          .eq('user_id', user.id)
          .is('clock_out_time', null)
          .order('clock_in_time', { ascending: false })
          .limit(1)
          .maybeSingle() as unknown as Promise<{ data: Timesheet | null }>
      : Promise.resolve({ data: null }),
  ])

  if (!job) notFound()

  let activeJobLabel: string | null = null
  if (openTimesheet && openTimesheet.job_id !== id) {
    if (openTimesheet.job_type === 'survey') {
      const { data: aj } = await db.from('survey_jobs').select('job_no, site_name').eq('id', openTimesheet.job_id!).single()
      if (aj) activeJobLabel = `${aj.job_no} — ${aj.site_name}`
    } else if (openTimesheet.job_type === 'construction') {
      const { data: aj } = await db.from('construction_jobs').select('job_no, project_name').eq('id', openTimesheet.job_id!).single()
      if (aj) activeJobLabel = `${aj.job_no} — ${aj.project_name}`
    }
  }

  const totalInvoiced = (invoices ?? []).reduce((s, inv) => s + inv.total, 0)
  const totalExpenses = (expenses ?? []).reduce((s, e) => s + e.amount, 0)
  const totalLpos = (lpos ?? []).reduce((s, l) => s + l.total, 0)
  const totalCosts = totalExpenses + totalLpos
  const netMargin = totalInvoiced - totalCosts
  const marginPct = totalInvoiced > 0 ? (netMargin / totalInvoiced) * 100 : null

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

      {/* ── Budget vs Actual ────────────────────────────────────── */}
      {(job.contract_value > 0 || job.boq_total > 0) && (() => {
        const invoicedPct = job.contract_value > 0 ? Math.min((totalInvoiced / job.contract_value) * 100, 100) : 0
        const spentPct = job.boq_total > 0 ? (totalCosts / job.boq_total) * 100 : 0
        const isOverBudget = job.boq_total > 0 && totalCosts > job.boq_total
        const budgetRemaining = job.boq_total - totalCosts
        const revenueRemaining = job.contract_value - totalInvoiced
        return (
          <div className="mb-6 bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-5 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />Budget vs Actual
              {isOverBudget && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" />Over Budget
                </span>
              )}
            </h2>

            {/* 4 metric cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Contract Value</p>
                <p className="text-base font-bold text-gray-900">{formatCurrency(job.contract_value)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Revenue budget</p>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Invoiced</p>
                <p className="text-base font-bold text-gray-900">{formatCurrency(totalInvoiced)}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {job.contract_value > 0
                    ? <>{revenueRemaining >= 0 ? formatCurrency(revenueRemaining) + ' remaining' : formatCurrency(Math.abs(revenueRemaining)) + ' over'}</>
                    : 'Billed to client'}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">BOQ Budget</p>
                <p className="text-base font-bold text-gray-900">{formatCurrency(job.boq_total)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Planned cost</p>
              </div>
              <div className={`rounded-lg border p-3 ${isOverBudget ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Actual Costs</p>
                <p className={`text-base font-bold ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(totalCosts)}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {job.boq_total > 0
                    ? <>{budgetRemaining >= 0 ? formatCurrency(budgetRemaining) + ' remaining' : formatCurrency(Math.abs(budgetRemaining)) + ' over budget'}</>
                    : 'Expenses + LPOs'}
                </p>
              </div>
            </div>

            {/* Progress bars */}
            <div className="space-y-4">
              {job.contract_value > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>Revenue collected <span className="font-medium text-gray-700">{invoicedPct.toFixed(1)}%</span> of contract</span>
                    <span className="text-gray-400">{formatCurrency(totalInvoiced)} / {formatCurrency(job.contract_value)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${invoicedPct}%` }}
                    />
                  </div>
                </div>
              )}
              {job.boq_total > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>
                      Cost budget used{' '}
                      <span className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-gray-700'}`}>
                        {spentPct.toFixed(1)}%
                      </span>
                      {isOverBudget && ' — over budget'}
                    </span>
                    <span className="text-gray-400">{formatCurrency(totalCosts)} / {formatCurrency(job.boq_total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-red-500' : spentPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(spentPct, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

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

          {/* BOQ */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-gray-400" />Bill of Quantities (BOQ)
            </h2>
            <BoqEditor jobId={id} jobType="construction" initialItems={boqItems ?? []} />
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

          {/* Expenses */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-gray-400" />Expenses
              </h2>
              <Link href="/finance/expenses" className="text-xs text-blue-600 hover:underline">
                Add expense
              </Link>
            </div>
            {expenses && expenses.length > 0 ? (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Date</th>
                      <th className="text-left pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Category</th>
                      <th className="text-left pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Description</th>
                      <th className="text-right pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {expenses.map((e) => (
                      <tr key={e.id}>
                        <td className="py-2 text-gray-500 whitespace-nowrap">{formatDate(e.expense_date)}</td>
                        <td className="py-2">
                          <span className="text-xs font-medium text-gray-600 bg-gray-100 rounded px-1.5 py-0.5">{e.category}</span>
                        </td>
                        <td className="py-2 text-gray-700">{e.description}</td>
                        <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm font-semibold text-gray-900">
                  <span>Total Expenses</span>
                  <span>{formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">No expenses recorded for this job</p>
            )}
          </div>

          {/* Notes */}
          <JobNotes
            jobId={id}
            jobType="construction"
            initialNotes={notes ?? []}
            currentUserId={user?.id ?? ''}
            currentUserName={profile?.full_name ?? ''}
            currentUserRole={profile?.role ?? ''}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Clock In/Out — field staff only */}
          {user && ['surveyor', 'site_engineer'].includes(profile?.role ?? '') && (
            <JobClockInOut
              jobId={id}
              jobType="construction"
              userId={user.id}
              openTimesheet={openTimesheet}
              activeJobLabel={activeJobLabel}
            />
          )}

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

          {/* Profitability */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-gray-400" />Profitability
            </h2>
            <dl className="space-y-3">
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Invoiced</dt>
                <dd className="font-medium text-gray-900">{formatCurrency(totalInvoiced)}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Expenses</dt>
                <dd className="font-medium text-gray-900">{formatCurrency(totalExpenses)}</dd>
              </div>
              {totalLpos > 0 && (
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">LPOs</dt>
                  <dd className="font-medium text-gray-900">{formatCurrency(totalLpos)}</dd>
                </div>
              )}
              <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-semibold">
                <dt className={netMargin >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                  Net Margin
                </dt>
                <dd className={netMargin >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                  {formatCurrency(netMargin)}
                  {marginPct !== null && (
                    <span className="ml-1 text-xs font-normal opacity-75">
                      ({marginPct.toFixed(1)}%)
                    </span>
                  )}
                </dd>
              </div>
            </dl>
            {invoices?.length === 0 && (
              <p className="text-xs text-gray-400 mt-3">No invoices raised yet</p>
            )}
          </div>

          {/* Quick links */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4 text-gray-400" />Quick Links
            </h2>
            <div className="space-y-2">
              <Link href={`/finance/quotations?job=${id}&job_type=construction`}
                className="block text-sm text-blue-600 hover:underline">Quotations</Link>
              <Link href={`/finance/invoices?job=${id}&job_type=construction`}
                className="block text-sm text-blue-600 hover:underline">Invoices</Link>
              <Link href="/finance/expenses"
                className="block text-sm text-blue-600 hover:underline">Expenses</Link>
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

import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Calendar, AlertCircle, X } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { FinanceDocumentWithClient } from '@/types/database'

export const dynamic = 'force-dynamic'

const STATUS_COLORS: Record<string, 'gray' | 'blue' | 'yellow' | 'green' | 'red'> = {
  Draft: 'gray',
  Sent: 'blue',
  Paid: 'green',
  Overdue: 'red',
}

const STATUSES = ['Draft', 'Sent', 'Paid', 'Overdue']

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; job?: string; job_type?: string }>
}) {
  const { status, q, job, job_type } = await searchParams
  const db = createServiceClient()

  // Build the base query
  let query = db
    .from('finance_documents')
    .select('*, clients(id, name, company, phone, email)')
    .eq('type', 'Invoice')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  // Job-scoped filter — from quick links on job detail pages
  if (job) query = query.eq('job_id', job)
  if (job && job_type) query = query.eq('job_type', job_type)

  const { data: docs } = await query as unknown as { data: FinanceDocumentWithClient[] | null }

  // Fetch job label for context banner
  let jobLabel: string | null = null
  if (job && job_type) {
    if (job_type === 'survey') {
      const { data } = await db.from('survey_jobs').select('job_no, site_name').eq('id', job).single()
      if (data) jobLabel = `${data.job_no} — ${data.site_name}`
    } else {
      const { data } = await db.from('construction_jobs').select('job_no, project_name').eq('id', job).single()
      if (data) jobLabel = `${data.job_no} — ${data.project_name}`
    }
  }

  const filtered = q
    ? docs?.filter((d) =>
        d.doc_no.toLowerCase().includes(q.toLowerCase()) ||
        d.clients?.name?.toLowerCase().includes(q.toLowerCase()) ||
        d.clients?.company?.toLowerCase().includes(q.toLowerCase())
      )
    : docs

  // Build param string that preserves job filter for status tabs
  const jobParams = job ? `&job=${job}&job_type=${job_type}` : ''

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered?.length ?? 0} invoices</p>
        </div>
        <Link href="/finance/invoices/new" className="shrink-0">
          <Button><Plus className="w-4 h-4" /><span className="hidden sm:inline">New Invoice</span></Button>
        </Link>
      </div>

      {/* Job context banner */}
      {job && jobLabel && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4 text-sm">
          <span className="text-blue-800">
            Showing invoices for <span className="font-semibold font-mono">{jobLabel}</span>
          </span>
          <Link href="/finance/invoices" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium">
            <X className="w-3.5 h-3.5" />View all invoices
          </Link>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <form method="GET" className="w-full sm:w-auto">
          {job && <input type="hidden" name="job" value={job} />}
          {job_type && <input type="hidden" name="job_type" value={job_type} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search invoices..."
            className="pl-3 pr-4 h-9 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-52"
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/finance/invoices${jobParams ? `?${jobParams.slice(1)}` : ''}`}>
            <Button size="sm" variant={!status ? 'default' : 'outline'}>All</Button>
          </Link>
          {STATUSES.map((s) => (
            <Link key={s} href={`/finance/invoices?status=${s}${jobParams}`}>
              <Button size="sm" variant={status === s ? 'default' : 'outline'}>{s}</Button>
            </Link>
          ))}
        </div>
      </div>

      {!filtered || filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">
            {job ? 'No invoices for this job yet' : 'No invoices found'}
          </p>
          <p className="text-sm mt-1">
            {job
              ? 'Create an invoice and link it to this job'
              : 'Create your first invoice to get started'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Invoice No.</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Due Date</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Total</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((doc) => {
                const isOverdue = doc.status === 'Overdue' || (
                  doc.status === 'Sent' &&
                  doc.due_date &&
                  new Date(doc.due_date) < new Date()
                )
                return (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/finance/invoices/${doc.id}`} className="font-mono font-medium text-blue-600 hover:underline">
                        {doc.doc_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{doc.clients?.name ?? '—'}</p>
                      {doc.clients?.company && <p className="text-xs text-gray-400">{doc.clients.company}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        {isOverdue
                          ? <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                          : <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        }
                        <span className={isOverdue ? 'text-red-600' : ''}>
                          {formatDate(doc.due_date)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(doc.total)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[doc.status] ?? 'gray'}>{doc.status}</Badge>
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

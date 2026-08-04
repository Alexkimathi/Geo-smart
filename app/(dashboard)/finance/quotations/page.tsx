import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Calendar, ArrowRight, X } from 'lucide-react'
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

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; job?: string; job_type?: string }>
}) {
  const { status, q, job, job_type } = await searchParams
  const db = createServiceClient()

  let query = db
    .from('finance_documents')
    .select('*, clients(id, name, company, phone, email)')
    .eq('type', 'Quotation')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

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

  const jobParams = job ? `&job=${job}&job_type=${job_type}` : ''

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered?.length ?? 0} quotations</p>
        </div>
        <Link href="/finance/quotations/new">
          <Button><Plus className="w-4 h-4" />New Quotation</Button>
        </Link>
      </div>

      {/* Job context banner */}
      {job && jobLabel && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4 text-sm">
          <span className="text-blue-800">
            Showing quotations for <span className="font-semibold font-mono">{jobLabel}</span>
          </span>
          <Link href="/finance/quotations" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium">
            <X className="w-3.5 h-3.5" />View all quotations
          </Link>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <form method="GET">
          {job && <input type="hidden" name="job" value={job} />}
          {job_type && <input type="hidden" name="job_type" value={job_type} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search quotations..."
            className="pl-3 pr-4 h-9 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/finance/quotations${jobParams ? `?${jobParams.slice(1)}` : ''}`}>
            <Button size="sm" variant={!status ? 'default' : 'outline'}>All</Button>
          </Link>
          {STATUSES.map((s) => (
            <Link key={s} href={`/finance/quotations?status=${s}${jobParams}`}>
              <Button size="sm" variant={status === s ? 'default' : 'outline'}>{s}</Button>
            </Link>
          ))}
        </div>
      </div>

      {!filtered || filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">
            {job ? 'No quotations for this job yet' : 'No quotations found'}
          </p>
          <p className="text-sm mt-1">
            {job
              ? 'Create a quotation and link it to this job'
              : 'Create your first quotation to get started'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Doc No.</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Valid Until</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Total</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Converted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/finance/quotations/${doc.id}`} className="font-mono font-medium text-blue-600 hover:underline">
                      {doc.doc_no}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{doc.clients?.name ?? '—'}</p>
                    {doc.clients?.company && <p className="text-xs text-gray-400">{doc.clients.company}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {formatDate(doc.due_date)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatCurrency(doc.total)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_COLORS[doc.status] ?? 'gray'}>{doc.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {doc.converted_to ? (
                      <Link href={`/finance/invoices/${doc.converted_to}`}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <ArrowRight className="w-3 h-3" />Invoice
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

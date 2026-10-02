import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Paginator } from '@/components/ui/Paginator'
import { Plus } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { FinanceDocumentWithClient } from '@/types/database'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

const STATUS_COLORS: Record<string, 'gray' | 'blue' | 'yellow' | 'green' | 'red'> = {
  Draft: 'gray',
  Sent: 'blue',
  Paid: 'green',
  Overdue: 'red',
}

const STATUSES = ['Draft', 'Sent', 'Paid', 'Overdue']

function pageHref(params: Record<string, string | undefined>, p: number) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== 'page') sp.set(k, v)
  }
  if (p > 1) sp.set('page', String(p))
  const qs = sp.toString()
  return `/finance/credit-notes${qs ? `?${qs}` : ''}`
}

export default async function CreditNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>
}) {
  const { status, q, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const db = createServiceClient()

  let query = db
    .from('finance_documents')
    .select('*, clients(id, name, company, phone, email)')
    .eq('type', 'Credit Note')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data: docs } = await query as unknown as { data: FinanceDocumentWithClient[] | null }

  const filtered = q
    ? docs?.filter((d) =>
        d.doc_no.toLowerCase().includes(q.toLowerCase()) ||
        d.clients?.name?.toLowerCase().includes(q.toLowerCase()) ||
        d.clients?.company?.toLowerCase().includes(q.toLowerCase())
      )
    : docs

  const totalCount = filtered?.length ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const currentPage = Math.min(page, totalPages || 1)
  const paged = filtered?.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) ?? []

  const rawParams = { status, q, page: pageParam }
  const prevHref = currentPage > 1 ? pageHref(rawParams, currentPage - 1) : null
  const nextHref = currentPage < totalPages ? pageHref(rawParams, currentPage + 1) : null

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Credit Notes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalCount} credit note{totalCount !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/finance/credit-notes/new" className="shrink-0">
          <Button><Plus className="w-4 h-4" /><span className="hidden sm:inline">New Credit Note</span></Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <form method="GET" className="w-full sm:w-auto">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search credit notes..."
            className="pl-3 pr-4 h-9 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-52"
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          <Link href="/finance/credit-notes">
            <Button size="sm" variant={!status ? 'default' : 'outline'}>All</Button>
          </Link>
          {STATUSES.map((s) => (
            <Link key={s} href={`/finance/credit-notes?status=${s}`}>
              <Button size="sm" variant={status === s ? 'default' : 'outline'}>{s}</Button>
            </Link>
          ))}
        </div>
      </div>

      {paged.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No credit notes found</p>
          <p className="text-sm mt-1">Create your first credit note to get started</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Credit Note No.</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Client</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paged.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/finance/credit-notes/${doc.id}`} className="font-mono font-medium text-blue-600 hover:underline">
                        {doc.doc_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(doc.created_at)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{doc.clients?.name ?? '—'}</p>
                      {doc.clients?.company && <p className="text-xs text-gray-400">{doc.clients.company}</p>}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${doc.total < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatCurrency(doc.total)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[doc.status] ?? 'gray'}>{doc.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Paginator
            page={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            prevHref={prevHref}
            nextHref={nextHref}
          />
        </>
      )}
    </div>
  )
}

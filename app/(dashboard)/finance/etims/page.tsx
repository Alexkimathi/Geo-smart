import { createServiceClient } from '@/lib/supabase/service'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Paginator } from '@/components/ui/Paginator'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { EtimsDocument } from '@/types/database'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

const STATUS_COLORS: Record<string, 'gray' | 'blue'> = {
  Draft: 'gray',
  Final: 'blue',
}

function pageHref(p: number) {
  if (p <= 1) return '/finance/etims'
  return `/finance/etims?page=${p}`
}

export default async function EtimsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const db = createServiceClient()

  const { data: docs, count } = await db
    .from('etims_documents')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to) as unknown as { data: EtimsDocument[] | null; count: number | null }

  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const currentPage = Math.min(page, totalPages || 1)

  const prevHref = currentPage > 1 ? pageHref(currentPage - 1) : null
  const nextHref = currentPage < totalPages ? pageHref(currentPage + 1) : null

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">eTIMS Documents</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            KRA eTIMS tax invoices &mdash; {totalCount} document{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/finance/etims/new" className="shrink-0">
          <Button size="sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New eTIMS Document</span>
          </Button>
        </Link>
      </div>

      {totalCount === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No eTIMS documents yet</p>
          <p className="text-sm mt-1">Create your first KRA eTIMS tax invoice</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Invoice No</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Buyer</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(docs ?? []).map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/finance/etims/${doc.id}`} className="font-mono text-xs text-blue-600 hover:underline font-medium">
                        {doc.invoice_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(doc.invoice_date)}</td>
                    <td className="px-4 py-3 text-gray-900">
                      <span className="font-medium">{doc.buyer_name || '—'}</span>
                      {doc.buyer_pin && <span className="ml-1.5 text-xs text-gray-400 font-mono">{doc.buyer_pin}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[doc.status] ?? 'gray'}>{doc.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link href={`/finance/etims/${doc.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
                        <Link href={`/finance/etims/${doc.id}/edit`} className="text-xs text-gray-500 hover:text-gray-700">Edit</Link>
                        <Link href={`/finance/etims/${doc.id}/print`} target="_blank" className="text-xs text-gray-500 hover:text-gray-700">Print</Link>
                      </div>
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

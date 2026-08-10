import { createServiceClient } from '@/lib/supabase/service'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Paginator } from '@/components/ui/Paginator'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { Lpo, SurveyJob, ConstructionJob } from '@/types/database'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

const STATUS_COLORS: Record<string, 'gray' | 'blue' | 'green' | 'red'> = {
  Draft: 'gray', Sent: 'blue', Received: 'green', Cancelled: 'red',
}

function pageHref(p: number) {
  if (p <= 1) return '/finance/lpos'
  return `/finance/lpos?page=${p}`
}

export default async function LposPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const db = createServiceClient()

  const [{ data: lpos, count }, { data: surveyJobs }, { data: constructionJobs }] = await Promise.all([
    db
      .from('lpos')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to) as unknown as Promise<{ data: Lpo[] | null; count: number | null }>,
    db.from('survey_jobs').select('id, job_no, site_name') as unknown as Promise<{ data: Pick<SurveyJob, 'id' | 'job_no' | 'site_name'>[] | null }>,
    db.from('construction_jobs').select('id, job_no, project_name') as unknown as Promise<{ data: Pick<ConstructionJob, 'id' | 'job_no' | 'project_name'>[] | null }>,
  ])

  const jobMap = new Map<string, string>([
    ...(surveyJobs ?? []).map((j): [string, string] => [j.id, j.job_no]),
    ...(constructionJobs ?? []).map((j): [string, string] => [j.id, j.job_no]),
  ])

  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const currentPage = Math.min(page, totalPages || 1)

  const prevHref = currentPage > 1 ? pageHref(currentPage - 1) : null
  const nextHref = currentPage < totalPages ? pageHref(currentPage + 1) : null

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Local Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalCount} LPOs
          </p>
        </div>
        <Link href="/finance/lpos/new" className="shrink-0">
          <Button size="sm"><Plus className="w-4 h-4" /><span className="hidden sm:inline">New LPO</span></Button>
        </Link>
      </div>

      {totalCount === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No LPOs yet</p>
          <p className="text-sm mt-1">Create your first Local Purchase Order</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[580px] text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">LPO No.</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Supplier</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Job</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(lpos ?? []).map((lpo) => (
                  <tr key={lpo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/finance/lpos/${lpo.id}`} className="font-mono text-xs text-blue-600 hover:underline font-medium">
                        {lpo.lpo_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{lpo.supplier_name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      {lpo.job_id ? jobMap.get(lpo.job_id) ?? '—' : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(lpo.issued_date)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[lpo.status] ?? 'gray'}>{lpo.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(lpo.total)}</td>
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

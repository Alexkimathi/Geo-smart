import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Paginator } from '@/components/ui/Paginator'
import { Plus, MapPin, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { SurveyJob, Client } from '@/types/database'

const PAGE_SIZE = 20

const STATUS_COLORS: Record<string, 'gray' | 'blue' | 'yellow' | 'purple' | 'green'> = {
  New: 'gray',
  'In Progress': 'blue',
  QA: 'yellow',
  Delivered: 'purple',
  Paid: 'green',
  'On Hold': 'gray',
}

const SURVEY_TYPE_LABELS: Record<string, string> = {
  Topo: 'Topo',
  Cadastral: 'Cadastral',
  Control: 'Control',
  'Setting Out': 'Setting Out',
}

function pageHref(params: Record<string, string | undefined>, p: number) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== 'page') sp.set(k, v)
  }
  if (p > 1) sp.set('page', String(p))
  const qs = sp.toString()
  return `/jobs/survey${qs ? `?${qs}` : ''}`
}

export default async function SurveyJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>
}) {
  const { status, q, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const supabase = createServiceClient()

  let query = supabase
    .from('survey_jobs')
    .select('*, clients(id, name, company)')
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data: jobs, error: jobsError } = await query as unknown as {
    data: (SurveyJob & { clients: Pick<Client, 'id' | 'name' | 'company'> | null })[] | null
    error: { message: string } | null
  }
  if (jobsError) console.error('[survey jobs]', jobsError.message)

  const filtered = q
    ? jobs?.filter((j) =>
        j.job_no.toLowerCase().includes(q.toLowerCase()) ||
        j.clients?.name.toLowerCase().includes(q.toLowerCase()) ||
        j.site_name.toLowerCase().includes(q.toLowerCase())
      )
    : jobs

  const totalCount = filtered?.length ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const currentPage = Math.min(page, totalPages || 1)
  const paged = filtered?.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) ?? []

  const rawParams = { status, q, page: pageParam }
  const prevHref = currentPage > 1 ? pageHref(rawParams, currentPage - 1) : null
  const nextHref = currentPage < totalPages ? pageHref(rawParams, currentPage + 1) : null

  const statuses = ['New', 'In Progress', 'QA', 'Delivered', 'Paid']

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Survey Jobs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalCount} jobs</p>
        </div>
        <Link href="/jobs/survey/new" className="shrink-0">
          <Button><Plus className="w-4 h-4" /><span className="hidden sm:inline">New Survey Job</span></Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <form method="GET" className="w-full sm:w-auto">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search jobs..."
            className="pl-3 pr-4 h-9 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-52"
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          <Link href={q ? `/jobs/survey?q=${encodeURIComponent(q)}` : '/jobs/survey'}>
            <Button size="sm" variant={!status ? 'default' : 'outline'}>All</Button>
          </Link>
          {statuses.map((s) => (
            <Link key={s} href={`/jobs/survey?status=${encodeURIComponent(s)}${q ? `&q=${encodeURIComponent(q)}` : ''}`}>
              <Button size="sm" variant={status === s ? 'default' : 'outline'}>
                {s}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {paged.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No survey jobs found</p>
          <p className="text-sm mt-1">Create your first survey job to get started</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[580px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Job No.</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Site</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Start Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paged.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/jobs/survey/${job.id}`} className="font-mono font-medium text-blue-600 hover:underline">
                        {job.job_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{job.clients?.name ?? '—'}</p>
                      {job.clients?.company && <p className="text-xs text-gray-400">{job.clients.company}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {job.county && <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                        <span>{job.site_name}</span>
                        {job.county && <span className="text-gray-400">, {job.county}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="blue">{SURVEY_TYPE_LABELS[job.survey_type] ?? job.survey_type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {formatDate(job.start_date)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[job.status] ?? 'gray'}>
                        {job.status}
                      </Badge>
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

import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Calendar, TrendingUp } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { ConstructionJob, Client } from '@/types/database'

const STATUS_COLORS: Record<string, 'blue' | 'green' | 'purple' | 'yellow' | 'gray'> = {
  Ongoing: 'blue',
  Completed: 'green',
  Handover: 'purple',
  Tender: 'yellow',
  'On Hold': 'gray',
}

export default async function ConstructionJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { status, q } = await searchParams
  const supabase = createServiceClient()

  let query = supabase
    .from('construction_jobs')
    .select('*, clients(id, name, company)')
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data: jobs, error: jobsError } = await query as unknown as {
    data: (ConstructionJob & { clients: Pick<Client, 'id' | 'name' | 'company'> | null })[] | null
    error: { message: string } | null
  }
  if (jobsError) console.error('[construction jobs]', jobsError.message)

  const filtered = q
    ? jobs?.filter((j) =>
        j.job_no.toLowerCase().includes(q.toLowerCase()) ||
        j.clients?.name.toLowerCase().includes(q.toLowerCase()) ||
        j.project_name.toLowerCase().includes(q.toLowerCase())
      )
    : jobs

  const statuses = ['Ongoing', 'Completed', 'Handover', 'Tender']

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Construction Jobs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered?.length ?? 0} jobs</p>
        </div>
        <Link href="/jobs/construction/new" className="shrink-0">
          <Button><Plus className="w-4 h-4" /><span className="hidden sm:inline">New Construction Job</span></Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <form method="GET" className="w-full sm:w-auto">
          <input name="q" defaultValue={q} placeholder="Search jobs..."
            className="pl-3 pr-4 h-9 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-52" />
        </form>
        <div className="flex gap-2 flex-wrap">
          <Link href="/jobs/construction">
            <Button size="sm" variant={!status ? 'default' : 'outline'}>All</Button>
          </Link>
          {statuses.map((s) => (
            <Link key={s} href={`/jobs/construction?status=${s}`}>
              <Button size="sm" variant={status === s ? 'default' : 'outline'} className="capitalize">{s}</Button>
            </Link>
          ))}
        </div>
      </div>

      {!filtered || filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No construction jobs found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((job) => (
            <Link key={job.id} href={`/jobs/construction/${job.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono font-semibold text-blue-600 text-sm">{job.job_no}</p>
                  <p className="font-medium text-gray-900 mt-0.5">{job.project_name}</p>
                  <p className="text-sm text-gray-500">{job.clients?.name}</p>
                </div>
                <Badge variant={STATUS_COLORS[job.status] ?? 'blue'} className="capitalize shrink-0">
                  {job.status}
                </Badge>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span><span>{job.progress_pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${job.progress_pct}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />{formatDate(job.start_date)}
                </div>
                {job.contract_value > 0 && (
                  <div className="flex items-center gap-1 font-medium text-gray-600">
                    <TrendingUp className="w-3.5 h-3.5" />{formatCurrency(job.contract_value)}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

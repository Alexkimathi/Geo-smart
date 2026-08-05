import { createServiceClient } from '@/lib/supabase/service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { ClipboardList, Clock, Search, CheckCircle2, MapPin, Calendar } from 'lucide-react'
import Link from 'next/link'
import type { SurveyJob, Client } from '@/types/database'

type SurveyRow = Pick<SurveyJob, 'id' | 'job_no' | 'site_name' | 'survey_type' | 'status' | 'start_date' | 'county'> & {
  clients: Pick<Client, 'name'> | null
}

const STATUS_ORDER = ['New', 'In Progress', 'QA', 'Delivered', 'Paid', 'On Hold'] as const

const STATUS_BAR: Record<string, string> = {
  'New': 'bg-gray-400',
  'In Progress': 'bg-blue-500',
  'QA': 'bg-yellow-500',
  'Delivered': 'bg-purple-500',
  'Paid': 'bg-emerald-500',
  'On Hold': 'bg-gray-300',
}

const STATUS_BADGE: Record<string, 'gray' | 'blue' | 'yellow' | 'purple' | 'green'> = {
  'New': 'gray',
  'In Progress': 'blue',
  'QA': 'yellow',
  'Delivered': 'purple',
  'Paid': 'green',
  'On Hold': 'gray',
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
}

export async function SurveyDashboard({ name }: { name: string }) {
  const db = createServiceClient()
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0]

  const { data: jobs } = await db
    .from('survey_jobs')
    .select('id, job_no, site_name, survey_type, status, start_date, county, clients(name)')
    .eq('is_archived', false)
    .order('created_at', { ascending: false }) as unknown as { data: SurveyRow[] | null }

  const all = jobs ?? []
  const total = all.length
  const inProgress = all.filter(j => j.status === 'In Progress').length
  const qaCount = all.filter(j => j.status === 'QA').length
  const startedThisMonth = all.filter(j => j.start_date && j.start_date >= monthStart).length

  // Breakdown by status
  const byStatus: Record<string, number> = {}
  for (const j of all) byStatus[j.status] = (byStatus[j.status] ?? 0) + 1

  // Breakdown by type
  const byType: Record<string, number> = {}
  for (const j of all) byType[j.survey_type] = (byType[j.survey_type] ?? 0) + 1

  // Active jobs (New, In Progress, QA)
  const activeJobs = all.filter(j => ['New', 'In Progress', 'QA'].includes(j.status))

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good {greeting()}, {name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Survey Dashboard — {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{total}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 shrink-0">
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-blue-600 mt-0.5">{inProgress}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 shrink-0">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">QA Pending</p>
                <p className={`text-2xl font-bold mt-0.5 ${qaCount > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>{qaCount}</p>
              </div>
              <div className={`p-2.5 rounded-xl shrink-0 ${qaCount > 0 ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                <Search className={`w-5 h-5 ${qaCount > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Started This Month</p>
                <p className="text-2xl font-bold text-emerald-600 mt-0.5">{startedThisMonth}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Jobs by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {total === 0 ? (
              <p className="text-sm text-gray-400">No jobs yet. <Link href="/jobs/survey/new" className="text-blue-600 hover:underline">Create one.</Link></p>
            ) : (
              <div className="space-y-3">
                {STATUS_ORDER.filter(s => byStatus[s]).map(status => {
                  const count = byStatus[status]
                  const pct = Math.round((count / total) * 100)
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">{status}</span>
                        <span className="text-gray-500">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${STATUS_BAR[status] ?? 'bg-gray-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Jobs by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {total === 0 ? (
              <p className="text-sm text-gray-400">No jobs yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                  const pct = Math.round((count / total) * 100)
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">{type}</span>
                        <span className="text-gray-500">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Jobs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Active Jobs</CardTitle>
          <Link href="/jobs/survey" className="text-xs text-blue-600 hover:underline shrink-0">View all</Link>
        </CardHeader>
        <CardContent>
          {activeJobs.length === 0 ? (
            <p className="text-sm text-gray-400">
              No active jobs.{' '}
              <Link href="/jobs/survey/new" className="text-blue-600 hover:underline">Create a survey job.</Link>
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/survey/${job.id}`}
                  className="flex flex-col gap-1.5 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-mono font-semibold text-blue-600 truncate">{job.job_no}</span>
                    <Badge variant={STATUS_BADGE[job.status] ?? 'gray'} className="text-xs shrink-0">{job.status}</Badge>
                  </div>
                  <p className="text-xs font-medium text-gray-800 truncate">{job.site_name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{job.county ?? 'No county'}
                    </span>
                    <span>{job.survey_type}</span>
                    {job.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{formatDate(job.start_date)}
                      </span>
                    )}
                  </div>
                  {job.clients?.name && (
                    <p className="text-xs text-gray-500 truncate">{job.clients.name}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All jobs table */}
      {all.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">All Jobs</CardTitle>
            <Link href="/jobs/survey" className="text-xs text-blue-600 hover:underline shrink-0">Open list</Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Job No.</th>
                    <th className="text-left pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Site</th>
                    <th className="text-left pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide hidden sm:table-cell">Type</th>
                    <th className="text-left pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="text-left pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide hidden md:table-cell">Start</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {all.slice(0, 10).map((j) => (
                    <tr key={j.id} className="hover:bg-gray-50">
                      <td className="py-2.5">
                        <Link href={`/jobs/survey/${j.id}`} className="font-mono font-medium text-blue-600 hover:underline text-xs">{j.job_no}</Link>
                      </td>
                      <td className="py-2.5 text-xs text-gray-700 max-w-[140px] truncate">{j.site_name}</td>
                      <td className="py-2.5 text-xs text-gray-500 hidden sm:table-cell">{j.survey_type}</td>
                      <td className="py-2.5">
                        <Badge variant={STATUS_BADGE[j.status] ?? 'gray'} className="text-xs">{j.status}</Badge>
                      </td>
                      <td className="py-2.5 text-xs text-gray-400 hidden md:table-cell">{formatDate(j.start_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

import { createServiceClient } from '@/lib/supabase/service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { HardHat, TrendingUp, BarChart2, DollarSign, Calendar } from 'lucide-react'
import Link from 'next/link'
import type { ConstructionJob, Expense, Client } from '@/types/database'

type ConsRow = Pick<ConstructionJob, 'id' | 'job_no' | 'project_name' | 'project_type' | 'status' | 'progress_pct' | 'contract_value' | 'boq_total' | 'start_date' | 'end_date'> & {
  clients: Pick<Client, 'name'> | null
}

const STATUS_ORDER = ['Ongoing', 'Tender', 'Handover', 'Completed', 'On Hold'] as const

const STATUS_BAR: Record<string, string> = {
  'Ongoing': 'bg-blue-500',
  'Tender': 'bg-yellow-500',
  'Handover': 'bg-purple-500',
  'Completed': 'bg-emerald-500',
  'On Hold': 'bg-gray-300',
}

const STATUS_BADGE: Record<string, 'blue' | 'yellow' | 'purple' | 'green' | 'gray'> = {
  'Ongoing': 'blue',
  'Tender': 'yellow',
  'Handover': 'purple',
  'Completed': 'green',
  'On Hold': 'gray',
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
}

export async function ConstructionDashboard({ name }: { name: string }) {
  const db = createServiceClient()

  const [{ data: jobs }, { data: expenses }] = await Promise.all([
    db
      .from('construction_jobs')
      .select('id, job_no, project_name, project_type, status, progress_pct, contract_value, boq_total, start_date, end_date, clients(name)')
      .eq('is_archived', false)
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: ConsRow[] | null }>,
    db
      .from('expenses')
      .select('job_id, amount')
      .eq('job_type', 'construction') as unknown as Promise<{ data: Pick<Expense, 'job_id' | 'amount'>[] | null }>,
  ])

  const all = jobs ?? []
  const total = all.length
  const ongoing = all.filter(j => j.status === 'Ongoing').length
  const avgProgress = total > 0
    ? Math.round(all.reduce((s, j) => s + j.progress_pct, 0) / total)
    : 0
  const totalContractValue = all.reduce((s, j) => s + (j.contract_value ?? 0), 0)

  // Expenses by job
  const expensesByJob = new Map<string, number>()
  for (const e of expenses ?? []) {
    if (e.job_id) expensesByJob.set(e.job_id, (expensesByJob.get(e.job_id) ?? 0) + e.amount)
  }

  // Status breakdown
  const byStatus: Record<string, number> = {}
  for (const j of all) byStatus[j.status] = (byStatus[j.status] ?? 0) + 1

  // Active projects (Ongoing + Tender + Handover) for the progress section
  const activeProjects = all.filter(j => ['Ongoing', 'Tender', 'Handover'].includes(j.status))

  // Budget vs actual: jobs with contract value > 0
  const budgetRows = all
    .filter(j => j.contract_value > 0)
    .map(j => ({
      ...j,
      expenses: expensesByJob.get(j.id) ?? 0,
      margin: j.contract_value - (expensesByJob.get(j.id) ?? 0),
      spendPct: j.contract_value > 0
        ? Math.min(Math.round(((expensesByJob.get(j.id) ?? 0) / j.contract_value) * 100), 100)
        : 0,
    }))
    .sort((a, b) => b.contract_value - a.contract_value)
    .slice(0, 8)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good {greeting()}, {name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Construction Dashboard — {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{total}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 shrink-0"><HardHat className="w-5 h-5 text-blue-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Ongoing</p>
                <p className="text-2xl font-bold text-blue-600 mt-0.5">{ongoing}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 shrink-0"><BarChart2 className="w-5 h-5 text-blue-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Avg Progress</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{avgProgress}%</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 shrink-0"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Contract Value</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5 truncate">{formatCurrency(totalContractValue)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-violet-50 shrink-0"><DollarSign className="w-5 h-5 text-violet-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Projects with Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Active Projects</CardTitle>
          <Link href="/jobs/construction" className="text-xs text-blue-600 hover:underline shrink-0">View all</Link>
        </CardHeader>
        <CardContent>
          {activeProjects.length === 0 ? (
            <p className="text-sm text-gray-400">
              No active projects.{' '}
              <Link href="/jobs/construction/new" className="text-blue-600 hover:underline">Create one.</Link>
            </p>
          ) : (
            <div className="space-y-4">
              {activeProjects.map((job) => {
                const jobExpenses = expensesByJob.get(job.id) ?? 0
                const spendPct = job.contract_value > 0
                  ? Math.min(Math.round((jobExpenses / job.contract_value) * 100), 100)
                  : 0
                return (
                  <div key={job.id} className="border border-gray-100 rounded-xl p-4 hover:border-blue-200 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <Link href={`/jobs/construction/${job.id}`} className="text-sm font-mono font-semibold text-blue-600 hover:underline">
                            {job.job_no}
                          </Link>
                          <Badge variant={STATUS_BADGE[job.status] ?? 'gray'} className="text-xs">{job.status}</Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-800 truncate">{job.project_name}</p>
                        <p className="text-xs text-gray-500">{job.clients?.name} · {job.project_type}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {job.contract_value > 0 && (
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(job.contract_value)}</p>
                        )}
                        {job.end_date && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-0.5">
                            <Calendar className="w-3 h-3" />Due {formatDate(job.end_date)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Progress</span>
                        <span className="font-medium">{job.progress_pct}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${job.progress_pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Budget spend */}
                    {job.contract_value > 0 && (
                      <div className="space-y-1.5 mt-2">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Budget spent</span>
                          <span className={`font-medium ${spendPct > 90 ? 'text-red-600' : spendPct > 70 ? 'text-yellow-600' : 'text-gray-700'}`}>
                            {formatCurrency(jobExpenses)} / {formatCurrency(job.contract_value)} ({spendPct}%)
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${spendPct > 90 ? 'bg-red-500' : spendPct > 70 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                            style={{ width: `${spendPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Projects by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {total === 0 ? (
              <p className="text-sm text-gray-400">No projects yet.</p>
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

        {/* Budget vs Actual */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Budget vs Actual</CardTitle>
          </CardHeader>
          <CardContent>
            {budgetRows.length === 0 ? (
              <p className="text-sm text-gray-400">No jobs with contract values yet.</p>
            ) : (
              <div className="space-y-3">
                {budgetRows.map((row) => (
                  <div key={row.id}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <Link href={`/jobs/construction/${row.id}`} className="font-mono text-blue-600 hover:underline">
                        {row.job_no}
                      </Link>
                      <span className={`font-medium ${row.margin < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {row.spendPct}% spent
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mb-1">{row.project_name}</p>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${row.spendPct > 90 ? 'bg-red-500' : row.spendPct > 70 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                        style={{ width: `${row.spendPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>{formatCurrency(row.expenses)} spent</span>
                      <span>{formatCurrency(row.contract_value)} budget</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

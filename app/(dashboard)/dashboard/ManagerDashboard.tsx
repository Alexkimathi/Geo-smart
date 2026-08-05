import { createServiceClient } from '@/lib/supabase/service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Briefcase, TrendingUp, DollarSign, AlertTriangle, FileText } from 'lucide-react'
import Link from 'next/link'
import type { SurveyJob, ConstructionJob, FinanceDocument, Payment, Client } from '@/types/database'

type SurveyRow = Pick<SurveyJob, 'id' | 'job_no' | 'site_name' | 'status'> & { clients: Pick<Client, 'name'> | null }
type ConsRow = Pick<ConstructionJob, 'id' | 'job_no' | 'project_name' | 'status' | 'progress_pct'> & { clients: Pick<Client, 'name'> | null }
type InvRow = Pick<FinanceDocument, 'id' | 'doc_no' | 'total' | 'status' | 'due_date'> & { clients: Pick<Client, 'name'> | null }

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
}

function StatusBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600 w-24 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 w-4 text-right shrink-0">{count}</span>
    </div>
  )
}

export async function ManagerDashboard({ name }: { name: string }) {
  const db = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { data: surveyJobs },
    { data: constructionJobs },
    { data: invoices },
    { data: payments },
    { data: quotations },
    { data: recentSurvey },
    { data: recentConstruction },
  ] = await Promise.all([
    db.from('survey_jobs').select('id, status').eq('is_archived', false) as unknown as Promise<{ data: Pick<SurveyJob, 'id' | 'status'>[] | null }>,
    db.from('construction_jobs').select('id, status').eq('is_archived', false) as unknown as Promise<{ data: Pick<ConstructionJob, 'id' | 'status'>[] | null }>,
    db.from('finance_documents').select('id, doc_no, total, status, due_date, clients(name)').eq('type', 'Invoice') as unknown as Promise<{ data: InvRow[] | null }>,
    db.from('payments').select('invoice_id, amount') as unknown as Promise<{ data: Pick<Payment, 'invoice_id' | 'amount'>[] | null }>,
    db.from('finance_documents').select('total').eq('type', 'Quotation') as unknown as Promise<{ data: { total: number }[] | null }>,
    db.from('survey_jobs').select('id, job_no, site_name, status, clients(name)').eq('is_archived', false).order('created_at', { ascending: false }).limit(5) as unknown as Promise<{ data: SurveyRow[] | null }>,
    db.from('construction_jobs').select('id, job_no, project_name, status, progress_pct, clients(name)').eq('is_archived', false).order('created_at', { ascending: false }).limit(5) as unknown as Promise<{ data: ConsRow[] | null }>,
  ])

  // Payment totals
  const paidByInvoice = new Map<string, number>()
  for (const p of payments ?? []) {
    paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + p.amount)
  }

  const totalInvoiced = (invoices ?? []).reduce((s, i) => s + i.total, 0)
  const totalQuoted = (quotations ?? []).reduce((s, q) => s + q.total, 0)
  const totalCollected = [...paidByInvoice.values()].reduce((s, v) => s + v, 0)
  const outstanding = (invoices ?? []).reduce((s, i) => {
    const bal = i.total - (paidByInvoice.get(i.id) ?? 0)
    return bal > 0 ? s + bal : s
  }, 0)

  const activeJobs =
    (surveyJobs?.filter(j => !['Paid', 'On Hold'].includes(j.status)).length ?? 0) +
    (constructionJobs?.filter(j => !['Completed', 'Handover'].includes(j.status)).length ?? 0)

  const overdueInvoices = (invoices ?? [])
    .filter(i => i.due_date && i.due_date < today && i.status !== 'Paid')
    .map(i => ({ ...i, balance: i.total - (paidByInvoice.get(i.id) ?? 0) }))
    .filter(i => i.balance > 0)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))

  const surveyByStatus: Record<string, number> = {}
  for (const j of surveyJobs ?? []) surveyByStatus[j.status] = (surveyByStatus[j.status] ?? 0) + 1

  const consByStatus: Record<string, number> = {}
  for (const j of constructionJobs ?? []) consByStatus[j.status] = (consByStatus[j.status] ?? 0) + 1

  const surveyTotal = surveyJobs?.length ?? 0
  const consTotal = constructionJobs?.length ?? 0
  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good {greeting()}, {name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Active Jobs</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{activeJobs}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 shrink-0"><Briefcase className="w-5 h-5 text-blue-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Total Invoiced</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5 truncate">{formatCurrency(totalInvoiced)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-violet-50 shrink-0"><FileText className="w-5 h-5 text-violet-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Collected</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5 truncate">{formatCurrency(totalCollected)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 shrink-0"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Outstanding</p>
                <p className={`text-lg font-bold mt-0.5 truncate ${outstanding > 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(outstanding)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-red-50 shrink-0"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Pipeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Revenue Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Quoted', value: totalQuoted, cls: 'bg-blue-50 text-blue-700' },
              { label: 'Invoiced', value: totalInvoiced, cls: 'bg-violet-50 text-violet-700' },
              { label: 'Collected', value: totalCollected, cls: 'bg-emerald-50 text-emerald-700' },
              { label: 'Outstanding', value: outstanding, cls: 'bg-red-50 text-red-700' },
            ].map(({ label, value, cls }) => (
              <div key={label} className={`rounded-xl p-3 ${cls}`}>
                <p className="text-xs font-medium opacity-70">{label}</p>
                <p className="text-sm font-bold mt-0.5">{formatCurrency(value)}</p>
              </div>
            ))}
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Collection rate</span>
              <span className="font-medium">{collectionRate}% of invoiced</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${collectionRate}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Overdue Invoices</CardTitle>
            <Link href="/finance/invoices?status=Overdue" className="text-xs text-blue-600 hover:underline shrink-0">View all</Link>
          </CardHeader>
          <CardContent>
            {overdueInvoices.length === 0 ? (
              <p className="text-sm text-emerald-600 font-medium">No overdue invoices — all clear!</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {overdueInvoices.slice(0, 6).map((inv) => (
                  <li key={inv.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/finance/invoices/${inv.id}`} className="text-sm font-mono font-medium text-blue-600 hover:underline">
                        {inv.doc_no}
                      </Link>
                      <p className="text-xs text-gray-500 truncate">{inv.clients?.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-red-600">{formatCurrency(inv.balance)}</p>
                      <p className="text-xs text-gray-400">due {formatDate(inv.due_date)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Jobs by Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Jobs by Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Survey Jobs ({surveyTotal})
              </p>
              <div className="space-y-2">
                {surveyTotal === 0
                  ? <p className="text-xs text-gray-400">No survey jobs yet</p>
                  : Object.entries(surveyByStatus).map(([s, c]) => (
                    <StatusBar key={s} label={s} count={c} total={surveyTotal} />
                  ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Construction Jobs ({consTotal})
              </p>
              <div className="space-y-2">
                {consTotal === 0
                  ? <p className="text-xs text-gray-400">No construction jobs yet</p>
                  : Object.entries(consByStatus).map(([s, c]) => (
                    <StatusBar key={s} label={s} count={c} total={consTotal} />
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent Survey Jobs</CardTitle>
            <Link href="/jobs/survey" className="text-xs text-blue-600 hover:underline shrink-0">View all</Link>
          </CardHeader>
          <CardContent>
            {!recentSurvey?.length ? (
              <p className="text-sm text-gray-400">No survey jobs yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentSurvey.map((j) => (
                  <li key={j.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/jobs/survey/${j.id}`} className="text-sm font-mono font-medium text-blue-600 hover:underline">
                        {j.job_no}
                      </Link>
                      <p className="text-xs text-gray-500 truncate">{j.clients?.name} — {j.site_name}</p>
                    </div>
                    <Badge variant="gray" className="text-xs shrink-0">{j.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent Construction Jobs</CardTitle>
            <Link href="/jobs/construction" className="text-xs text-blue-600 hover:underline shrink-0">View all</Link>
          </CardHeader>
          <CardContent>
            {!recentConstruction?.length ? (
              <p className="text-sm text-gray-400">No construction jobs yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentConstruction.map((j) => (
                  <li key={j.id} className="py-2.5">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="min-w-0">
                        <Link href={`/jobs/construction/${j.id}`} className="text-sm font-mono font-medium text-blue-600 hover:underline">
                          {j.job_no}
                        </Link>
                        <p className="text-xs text-gray-500 truncate">{j.clients?.name} — {j.project_name}</p>
                      </div>
                      <Badge variant="blue" className="text-xs shrink-0 capitalize">{j.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${j.progress_pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 w-8 text-right">{j.progress_pct}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

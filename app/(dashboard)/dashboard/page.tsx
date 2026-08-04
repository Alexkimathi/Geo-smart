import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Briefcase, Users, ReceiptText, AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import type { SurveyJob, ConstructionJob, Client } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()

  const [
    { data: profile },
    { count: surveyCount },
    { count: constructionCount },
    { count: clientCount },
    { data: recentSurvey },
    { data: recentConstruction },
    { data: financeData },
  ] = await Promise.all([
    db.from('profiles').select('full_name, role').eq('id', user.id).single() as unknown as Promise<{ data: { full_name: string; role: string } | null }>,
    db.from('survey_jobs').select('*', { count: 'exact', head: true }),
    db.from('construction_jobs').select('*', { count: 'exact', head: true }),
    db.from('clients').select('*', { count: 'exact', head: true }),
    db.from('survey_jobs').select('id, job_no, status, site_name, clients(name)').order('created_at', { ascending: false }).limit(4) as unknown as Promise<{ data: (Pick<SurveyJob, 'id' | 'job_no' | 'status' | 'site_name'> & { clients: Pick<Client, 'name'> | null })[] | null }>,
    db.from('construction_jobs').select('id, job_no, status, project_name, progress_pct, clients(name)').order('created_at', { ascending: false }).limit(4) as unknown as Promise<{ data: (Pick<ConstructionJob, 'id' | 'job_no' | 'status' | 'project_name' | 'progress_pct'> & { clients: Pick<Client, 'name'> | null })[] | null }>,
    db.from('finance_documents').select('type, amount, total, status') as unknown as Promise<{ data: { type: string; amount: number; total: number; status: string }[] | null }>,
  ])

  const totalJobs = (surveyCount ?? 0) + (constructionCount ?? 0)
  const totalInvoiced = financeData?.filter(f => f.type === 'Invoice').reduce((s, f) => s + f.total, 0) ?? 0
  const totalPaid = financeData?.filter(f => f.type === 'Invoice' && f.status === 'Paid').reduce((s, f) => s + f.total, 0) ?? 0
  const overdueCount = financeData?.filter(f => f.type === 'Invoice' && f.status === 'Overdue').length ?? 0

  const statCards = [
    { label: 'Total Jobs', value: totalJobs, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Clients', value: clientCount ?? 0, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Invoiced', value: formatCurrency(totalInvoiced), icon: ReceiptText, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Total Collected', value: formatCurrency(totalPaid), icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Good morning, {profile?.full_name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Here's what's happening at Geo-smart today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${s.bg}`}>
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Survey Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Survey Jobs</CardTitle>
            <Link href="/jobs/survey" className="text-xs text-blue-600 hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {!recentSurvey || recentSurvey.length === 0 ? (
              <p className="text-sm text-gray-400">No survey jobs yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentSurvey.map((job) => (
                  <li key={job.id} className="py-3 flex items-center justify-between">
                    <div>
                      <Link href={`/jobs/survey/${job.id}`} className="text-sm font-mono font-medium text-blue-600 hover:underline">{job.job_no}</Link>
                      <p className="text-xs text-gray-500">{job.clients?.name ?? 'No client'} — {job.site_name}</p>
                    </div>
                    <Badge variant="gray" className="text-xs">{job.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Construction Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Construction Jobs</CardTitle>
            {overdueCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />{overdueCount} overdue invoice{overdueCount > 1 ? 's' : ''}
              </div>
            )}
            {overdueCount === 0 && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            <Link href="/jobs/construction" className="text-xs text-blue-600 hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {!recentConstruction || recentConstruction.length === 0 ? (
              <p className="text-sm text-gray-400">No construction jobs yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentConstruction.map((job) => (
                  <li key={job.id} className="py-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-3">
                      <Link href={`/jobs/construction/${job.id}`} className="text-sm font-mono font-medium text-blue-600 hover:underline">{job.job_no}</Link>
                      <p className="text-xs text-gray-500 truncate">{job.clients?.name ?? 'No client'} — {job.project_name}</p>
                      <div className="mt-1 h-1 bg-gray-100 rounded-full w-24">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${job.progress_pct}%` }} />
                      </div>
                    </div>
                    <Badge variant="blue" className="capitalize text-xs shrink-0">{job.status}</Badge>
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

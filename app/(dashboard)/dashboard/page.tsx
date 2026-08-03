import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Briefcase,
  Users,
  ReceiptText,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react'

async function getDashboardStats() {
  const supabase = await createClient()

  const [
    { count: activeJobsCount },
    { count: totalClientsCount },
    { data: overdueInvoices },
    { data: recentJobs },
    { data: invoiceSummary },
  ] = await Promise.all([
    supabase.from('jobs').select('*', { count: 'exact', head: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase
      .from('invoices')
      .select('id, invoice_number, total, amount_paid, due_date, clients(name)')
      .eq('status', 'overdue')
      .order('due_date', { ascending: true })
      .limit(5),
    supabase
      .from('jobs')
      .select('id, job_number, type, start_date, clients(name), survey_jobs(status), construction_jobs(status)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('invoices')
      .select('total, amount_paid, status') as unknown as Promise<{ data: { total: number; amount_paid: number; status: string }[] | null }>,
  ])

  const totalInvoiced = invoiceSummary?.reduce((s, i) => s + i.total, 0) ?? 0
  const totalPaid = invoiceSummary?.reduce((s, i) => s + i.amount_paid, 0) ?? 0
  const totalOutstanding = totalInvoiced - totalPaid

  return {
    activeJobsCount: activeJobsCount ?? 0,
    totalClientsCount: totalClientsCount ?? 0,
    overdueInvoices: overdueInvoices ?? [],
    recentJobs: recentJobs ?? [],
    totalInvoiced,
    totalPaid,
    totalOutstanding,
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single() as unknown as { data: { full_name: string; role: string } | null }

  const stats = await getDashboardStats()

  const statCards = [
    {
      label: 'Active Jobs',
      value: stats.activeJobsCount,
      icon: Briefcase,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Total Clients',
      value: stats.totalClientsCount,
      icon: Users,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Total Invoiced',
      value: formatCurrency(stats.totalInvoiced),
      icon: ReceiptText,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'Outstanding',
      value: formatCurrency(stats.totalOutstanding),
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Good morning, {profile?.full_name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Here's what's happening at Geo-smart today.
        </p>
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
        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentJobs.length === 0 ? (
              <p className="text-sm text-gray-400">No jobs yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {stats.recentJobs.map((job: any) => {
                  const status = job.survey_jobs?.[0]?.status ?? job.construction_jobs?.[0]?.status
                  return (
                    <li key={job.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{job.job_number}</p>
                        <p className="text-xs text-gray-500">{job.clients?.name ?? 'No client'}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize
                          ${job.type === 'survey' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                          {job.type}
                        </span>
                        {status && (
                          <p className="text-xs text-gray-400 mt-0.5 capitalize">{status.replace('_', ' ')}</p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Overdue Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Overdue Invoices</CardTitle>
            {stats.overdueInvoices.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                {stats.overdueInvoices.length} overdue
              </div>
            )}
          </CardHeader>
          <CardContent>
            {stats.overdueInvoices.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                No overdue invoices
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {stats.overdueInvoices.map((inv: any) => (
                  <li key={inv.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-500">{inv.clients?.name ?? '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">
                        {formatCurrency(inv.total - inv.amount_paid)}
                      </p>
                      <p className="text-xs text-gray-400">Due {formatDate(inv.due_date)}</p>
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

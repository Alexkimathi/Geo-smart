import { createServiceClient } from '@/lib/supabase/service'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { AlertCircle } from 'lucide-react'
import { ReportActions } from '@/components/finance/ReportActions'
import type { FinanceDocumentWithClient, Payment, SurveyJob, ConstructionJob, Expense, Client } from '@/types/database'

export const dynamic = 'force-dynamic'

const STATUS_COLORS: Record<string, 'gray' | 'blue' | 'green' | 'red'> = {
  Draft: 'gray', Sent: 'blue', Paid: 'green', Overdue: 'red',
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

export default async function ReportsPage() {
  const db = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { data: invoices },
    { data: payments },
    { data: surveyJobs },
    { data: constructionJobs },
    { data: expenses },
  ] = await Promise.all([
    db
      .from('finance_documents')
      .select('*, clients(id, name, company, phone, email)')
      .eq('type', 'Invoice')
      .order('due_date', { ascending: true }) as unknown as Promise<{ data: FinanceDocumentWithClient[] | null }>,
    db
      .from('payments')
      .select('invoice_id, amount') as unknown as Promise<{ data: Pick<Payment, 'invoice_id' | 'amount'>[] | null }>,
    db
      .from('survey_jobs')
      .select('id, job_no, site_name, survey_type, status, client_id, clients(name)')
      .eq('is_archived', false)
      .order('job_no') as unknown as Promise<{ data: (Pick<SurveyJob, 'id' | 'job_no' | 'site_name' | 'survey_type' | 'status'> & { clients: Pick<Client, 'name'> | null })[] | null }>,
    db
      .from('construction_jobs')
      .select('id, job_no, project_name, project_type, status, client_id, clients(name)')
      .eq('is_archived', false)
      .order('job_no') as unknown as Promise<{ data: (Pick<ConstructionJob, 'id' | 'job_no' | 'project_name' | 'project_type' | 'status'> & { clients: Pick<Client, 'name'> | null })[] | null }>,
    db
      .from('expenses')
      .select('job_id, job_type, amount') as unknown as Promise<{ data: Pick<Expense, 'job_id' | 'job_type' | 'amount'>[] | null }>,
  ])

  // ── Debtors: invoices with outstanding balance ────────────────
  const paidByInvoice = new Map<string, number>()
  for (const p of payments ?? []) {
    paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + p.amount)
  }

  const debtors = (invoices ?? [])
    .map((inv) => ({
      ...inv,
      totalPaid: paidByInvoice.get(inv.id) ?? 0,
      balance: inv.total - (paidByInvoice.get(inv.id) ?? 0),
      daysOverdue: inv.due_date && inv.due_date < today ? daysSince(inv.due_date) : 0,
    }))
    .filter((inv) => inv.balance > 0.005) // outstanding balance
    .sort((a, b) => b.daysOverdue - a.daysOverdue) // worst overdue first

  const totalOutstanding = debtors.reduce((s, d) => s + d.balance, 0)

  // ── P&L per Job ───────────────────────────────────────────────
  const invoicedByJob = new Map<string, number>()
  for (const inv of invoices ?? []) {
    invoicedByJob.set(inv.job_id ?? '', (invoicedByJob.get(inv.job_id ?? '') ?? 0) + inv.total)
  }

  const expensesByJob = new Map<string, number>()
  for (const e of expenses ?? []) {
    if (e.job_id) {
      expensesByJob.set(e.job_id, (expensesByJob.get(e.job_id) ?? 0) + e.amount)
    }
  }

  type PnlRow = {
    id: string; jobNo: string; name: string; type: string; status: string
    clientName: string; invoiced: number; expensesTotal: number; margin: number; marginPct: number | null
  }

  const pnlRows: PnlRow[] = [
    ...(surveyJobs ?? []).map((j) => {
      const invoiced = invoicedByJob.get(j.id) ?? 0
      const expensesTotal = expensesByJob.get(j.id) ?? 0
      const margin = invoiced - expensesTotal
      return {
        id: j.id, jobNo: j.job_no, name: j.site_name, type: j.survey_type,
        status: j.status, clientName: j.clients?.name ?? '—',
        invoiced, expensesTotal, margin,
        marginPct: invoiced > 0 ? (margin / invoiced) * 100 : null,
      }
    }),
    ...(constructionJobs ?? []).map((j) => {
      const invoiced = invoicedByJob.get(j.id) ?? 0
      const expensesTotal = expensesByJob.get(j.id) ?? 0
      const margin = invoiced - expensesTotal
      return {
        id: j.id, jobNo: j.job_no, name: j.project_name, type: j.project_type,
        status: j.status, clientName: j.clients?.name ?? '—',
        invoiced, expensesTotal, margin,
        marginPct: invoiced > 0 ? (margin / invoiced) * 100 : null,
      }
    }),
  ].sort((a, b) => a.margin - b.margin) // worst margin first

  const totalInvoiced = pnlRows.reduce((s, r) => s + r.invoiced, 0)
  const totalExpenses = pnlRows.reduce((s, r) => s + r.expensesTotal, 0)
  const totalMargin = totalInvoiced - totalExpenses

  const debtorsCsv = debtors.map((d) => ({
    clientName: d.clients?.name ?? '—',
    company: d.clients?.company ?? null,
    docNo: d.doc_no,
    dueDate: d.due_date ?? null,
    status: d.status,
    total: d.total,
    totalPaid: d.totalPaid,
    balance: d.balance,
    daysOverdue: d.daysOverdue,
  }))

  const pnlCsv = pnlRows.map((r) => ({
    jobNo: r.jobNo,
    name: r.name,
    clientName: r.clientName,
    type: r.type,
    status: r.status,
    invoiced: r.invoiced,
    expensesTotal: r.expensesTotal,
    margin: r.margin,
    marginPct: r.marginPct,
  }))

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Finance Reports</h1>
        <ReportActions debtors={debtorsCsv} pnlRows={pnlCsv} />
      </div>

      {/* ── Debtors Report ─────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Debtors Report</h2>
            <p className="text-sm text-gray-500 mt-0.5">Invoices with outstanding balances</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total Outstanding</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
          </div>
        </div>

        {debtors.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
            <p className="text-emerald-700 font-medium">No outstanding balances</p>
            <p className="text-sm text-emerald-600 mt-0.5">All invoices are fully settled</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Invoice</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Due Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Invoice Total</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Paid</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Balance Due</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Days Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {debtors.map((inv) => (
                  <tr key={inv.id} className={inv.daysOverdue > 0 ? 'bg-red-50/40' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{inv.clients?.name ?? '—'}</p>
                      {inv.clients?.company && <p className="text-xs text-gray-400">{inv.clients.company}</p>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">
                      <a href={`/finance/invoices/${inv.id}`} className="hover:underline">{inv.doc_no}</a>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(inv.due_date)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[inv.status] ?? 'gray'}>{inv.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(inv.total)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{formatCurrency(inv.totalPaid)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">{formatCurrency(inv.balance)}</td>
                    <td className="px-4 py-3 text-right">
                      {inv.daysOverdue > 0 ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />{inv.daysOverdue}d
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                  <td colSpan={6} className="px-4 py-3 text-gray-700">Total Outstanding</td>
                  <td className="px-4 py-3 text-right text-red-600">{formatCurrency(totalOutstanding)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* ── P&L per Job ────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">P&L per Job</h2>
            <p className="text-sm text-gray-500 mt-0.5">Revenue vs costs across all active jobs</p>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total Invoiced</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalInvoiced)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total Expenses</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Net Margin</p>
              <p className={`text-lg font-bold ${totalMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(totalMargin)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Job</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Invoiced</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Expenses</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Net Margin</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pnlRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">No jobs found</td>
                </tr>
              ) : pnlRows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <a href={`/jobs/${row.type.toLowerCase().includes('survey') || !['House','Commercial','Road','Tender'].includes(row.type) ? 'survey' : 'construction'}/${row.id}`}
                      className="font-mono text-xs text-blue-600 hover:underline">
                      {row.jobNo}
                    </a>
                    <p className="text-gray-700 text-xs mt-0.5 truncate max-w-[180px]">{row.name}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.clientName}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{row.type}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{row.status}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(row.invoiced)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(row.expensesTotal)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${row.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(row.margin)}
                  </td>
                  <td className={`px-4 py-3 text-right text-xs font-medium ${row.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {row.marginPct !== null ? `${row.marginPct.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                <td colSpan={4} className="px-4 py-3 text-gray-700">Total</td>
                <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(totalInvoiced)}</td>
                <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(totalExpenses)}</td>
                <td className={`px-4 py-3 text-right ${totalMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(totalMargin)}
                </td>
                <td className={`px-4 py-3 text-right text-xs ${totalMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {totalInvoiced > 0 ? `${((totalMargin / totalInvoiced) * 100).toFixed(1)}%` : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  )
}

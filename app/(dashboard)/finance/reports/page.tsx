import { createServiceClient } from '@/lib/supabase/service'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, TrendingUp, Wallet, ShoppingCart, AlertTriangle, DollarSign } from 'lucide-react'
import { ReportActions } from '@/components/finance/ReportActions'
import type { FinanceDocumentWithClient, Payment, SurveyJob, ConstructionJob, Expense, Lpo, Client } from '@/types/database'

export const dynamic = 'force-dynamic'

const STATUS_COLORS: Record<string, 'gray' | 'blue' | 'green' | 'red'> = {
  Draft: 'gray', Sent: 'blue', Paid: 'green', Overdue: 'red',
}

const LPO_STATUS_COLORS: Record<string, 'gray' | 'blue' | 'green' | 'red'> = {
  Sent: 'blue', Received: 'green',
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const { month, year } = await searchParams
  const db = createServiceClient()
  const today = new Date().toISOString().split('T')[0]
  const currentYear = new Date().getFullYear()

  // ── Period filter ─────────────────────────────────────────────
  const periodYear = year ? parseInt(year) : null
  const periodMonth = month ? parseInt(month) : null
  const hasPeriod =
    periodYear !== null && periodMonth !== null &&
    !isNaN(periodYear) && !isNaN(periodMonth) &&
    periodMonth >= 1 && periodMonth <= 12

  let startDate: string | undefined
  let endDate: string | undefined
  if (hasPeriod) {
    startDate = `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`
    const lastDay = new Date(periodYear!, periodMonth!, 0).getDate()
    endDate = `${periodYear}-${String(periodMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  }

  function inPeriod(dateStr: string | null): boolean {
    if (!hasPeriod) return true
    if (!dateStr) return false
    const d = dateStr.substring(0, 10)
    return d >= startDate! && d <= endDate!
  }

  // ── Queries ───────────────────────────────────────────────────
  const [
    { data: invoices },
    { data: payments },
    { data: quotations },
    { data: surveyJobs },
    { data: constructionJobs },
    { data: expenses },
    { data: lpos },
  ] = await Promise.all([
    db
      .from('finance_documents')
      .select('*, clients(id, name, company, phone, email)')
      .eq('type', 'Invoice')
      .order('due_date', { ascending: true }) as unknown as Promise<{ data: FinanceDocumentWithClient[] | null }>,
    db
      .from('payments')
      .select('invoice_id, amount, payment_date') as unknown as Promise<{ data: Pick<Payment, 'invoice_id' | 'amount' | 'payment_date'>[] | null }>,
    db
      .from('finance_documents')
      .select('total')
      .eq('type', 'Quotation') as unknown as Promise<{ data: { total: number }[] | null }>,
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
      .select('job_id, job_type, amount, category, expense_date') as unknown as Promise<{ data: Pick<Expense, 'job_id' | 'job_type' | 'amount' | 'category' | 'expense_date'>[] | null }>,
    db
      .from('lpos')
      .select('id, lpo_no, supplier_name, job_id, job_type, total, status, issued_date')
      .neq('status', 'Cancelled')
      .order('issued_date', { ascending: true }) as unknown as Promise<{ data: Pick<Lpo, 'id' | 'lpo_no' | 'supplier_name' | 'job_id' | 'job_type' | 'total' | 'status' | 'issued_date'>[] | null }>,
  ])

  // ── Period-filtered slices (for KPI, creditors, expense breakdown) ──
  const filteredInvoices = (invoices ?? []).filter((inv) => inPeriod(inv.created_at))
  const filteredPayments = (payments ?? []).filter((p) => inPeriod(p.payment_date))
  const filteredExpenses = (expenses ?? []).filter((e) => inPeriod(e.expense_date))
  const filteredLpos = (lpos ?? []).filter((l) => inPeriod(l.issued_date))

  // ── KPI values ────────────────────────────────────────────────
  const kpiRevenue = filteredInvoices.reduce((s, inv) => s + inv.total, 0)
  const kpiCollected = filteredPayments.reduce((s, p) => s + p.amount, 0)
  const kpiCosts =
    filteredExpenses.reduce((s, e) => s + e.amount, 0) +
    filteredLpos.reduce((s, l) => s + l.total, 0)

  // ── Revenue Pipeline (all-time) ──────────────────────────────
  const totalQuoted = (quotations ?? []).reduce((s, q) => s + q.total, 0)
  const totalInvoicedAll = (invoices ?? []).reduce((s, inv) => s + inv.total, 0)
  const totalCollectedAll = [...paidByInvoice.values()].reduce((s, v) => s + v, 0)
  const totalOutstandingAll = (invoices ?? []).reduce((s, inv) => {
    const bal = inv.total - (paidByInvoice.get(inv.id) ?? 0)
    return bal > 0.005 ? s + bal : s
  }, 0)
  const collectionRate = totalInvoicedAll > 0 ? Math.round((totalCollectedAll / totalInvoicedAll) * 100) : 0

  // ── Debtors: invoices with outstanding balance (always all-time) ──
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
    .filter((inv) => inv.balance > 0.005)
    .sort((a, b) => b.daysOverdue - a.daysOverdue)

  const totalOutstanding = debtors.reduce((s, d) => s + d.balance, 0)

  // ── Creditors: Sent/Received LPOs (period-filtered) ──────────
  const surveyJobMap = new Map<string, string>()
  const constructionJobMap = new Map<string, string>()
  for (const j of surveyJobs ?? []) surveyJobMap.set(j.id, j.job_no)
  for (const j of constructionJobs ?? []) constructionJobMap.set(j.id, j.job_no)

  const creditors = filteredLpos.filter((l) => l.status === 'Sent' || l.status === 'Received')
  const totalPayables = creditors.reduce((s, l) => s + l.total, 0)

  // ── Expense breakdown by category (period-filtered) ──────────
  const categoryMap = new Map<string, { count: number; total: number }>()
  for (const e of filteredExpenses) {
    const cat = e.category ?? 'Other'
    const existing = categoryMap.get(cat) ?? { count: 0, total: 0 }
    categoryMap.set(cat, { count: existing.count + 1, total: existing.total + e.amount })
  }
  const totalExpenseCost = filteredExpenses.reduce((s, e) => s + e.amount, 0)
  const expenseByCategory = Array.from(categoryMap.entries())
    .map(([category, { count, total }]) => ({
      category, count, total,
      pct: totalExpenseCost > 0 ? (total / totalExpenseCost) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)

  // ── P&L per Job (always all-time, unfiltered) ─────────────────
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

  const lposByJob = new Map<string, number>()
  for (const l of lpos ?? []) {
    if (l.job_id) {
      lposByJob.set(l.job_id, (lposByJob.get(l.job_id) ?? 0) + l.total)
    }
  }

  type PnlRow = {
    id: string; jobNo: string; name: string; type: string; status: string
    clientName: string; invoiced: number; costsTotal: number; margin: number; marginPct: number | null
  }

  const pnlRows: PnlRow[] = [
    ...(surveyJobs ?? []).map((j) => {
      const invoiced = invoicedByJob.get(j.id) ?? 0
      const costsTotal = (expensesByJob.get(j.id) ?? 0) + (lposByJob.get(j.id) ?? 0)
      const margin = invoiced - costsTotal
      return {
        id: j.id, jobNo: j.job_no, name: j.site_name, type: j.survey_type,
        status: j.status, clientName: j.clients?.name ?? '—',
        invoiced, costsTotal, margin,
        marginPct: invoiced > 0 ? (margin / invoiced) * 100 : null,
      }
    }),
    ...(constructionJobs ?? []).map((j) => {
      const invoiced = invoicedByJob.get(j.id) ?? 0
      const costsTotal = (expensesByJob.get(j.id) ?? 0) + (lposByJob.get(j.id) ?? 0)
      const margin = invoiced - costsTotal
      return {
        id: j.id, jobNo: j.job_no, name: j.project_name, type: j.project_type,
        status: j.status, clientName: j.clients?.name ?? '—',
        invoiced, costsTotal, margin,
        marginPct: invoiced > 0 ? (margin / invoiced) * 100 : null,
      }
    }),
  ].sort((a, b) => a.margin - b.margin)

  const totalInvoiced = pnlRows.reduce((s, r) => s + r.invoiced, 0)
  const totalCosts = pnlRows.reduce((s, r) => s + r.costsTotal, 0)
  const totalMargin = totalInvoiced - totalCosts

  // ── CSV data ──────────────────────────────────────────────────
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

  const creditorsCsv = creditors.map((l) => ({
    lpoNo: l.lpo_no,
    supplierName: l.supplier_name,
    jobNo: l.job_id
      ? (l.job_type === 'survey' ? surveyJobMap.get(l.job_id) : constructionJobMap.get(l.job_id)) ?? '—'
      : '—',
    issuedDate: l.issued_date,
    status: l.status,
    total: l.total,
  }))

  const pnlCsv = pnlRows.map((r) => ({
    jobNo: r.jobNo,
    name: r.name,
    clientName: r.clientName,
    type: r.type,
    status: r.status,
    invoiced: r.invoiced,
    costsTotal: r.costsTotal,
    margin: r.margin,
    marginPct: r.marginPct,
  }))

  const periodLabel = hasPeriod
    ? `${MONTHS[periodMonth! - 1]} ${periodYear}`
    : 'All Time'

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Finance Reports</h1>
        <ReportActions debtors={debtorsCsv} creditors={creditorsCsv} pnlRows={pnlCsv} />
      </div>

      {/* ── Period filter ───────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="month" className="text-xs font-medium text-gray-500 uppercase tracking-wide">Month</label>
            <select
              id="month"
              name="month"
              defaultValue={month ?? ''}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All months</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1)}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="year" className="text-xs font-medium text-gray-500 uppercase tracking-wide">Year</label>
            <select
              id="year"
              name="year"
              defaultValue={year ?? ''}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All years</option>
              {[0, 1, 2, 3].map((offset) => {
                const y = currentYear - offset
                return <option key={y} value={String(y)}>{y}</option>
              })}
            </select>
          </div>
          <button
            type="submit"
            className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Apply
          </button>
          {hasPeriod && (
            <a
              href="/finance/reports"
              className="h-9 px-4 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors inline-flex items-center"
            >
              Clear
            </a>
          )}
          {hasPeriod && (
            <p className="text-sm text-blue-600 font-medium ml-1 self-end pb-0.5">
              Showing: {periodLabel}
            </p>
          )}
        </form>
      </div>

      {/* ── KPI Summary Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Revenue</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpiRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1">{periodLabel} · invoiced</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Collected</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpiCollected)}</p>
          <p className="text-xs text-gray-400 mt-1">{periodLabel} · payments received</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Costs</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpiCosts)}</p>
          <p className="text-xs text-gray-400 mt-1">{periodLabel} · expenses + LPOs</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Outstanding</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
          <p className="text-xs text-gray-400 mt-1">All time · unpaid invoices</p>
        </div>
      </div>

      {/* ── Revenue Pipeline ────────────────────────────────────── */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Revenue Pipeline</h2>
          <p className="text-sm text-gray-500 mt-0.5">Quoted → Invoiced → Collected · all time</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="rounded-xl p-3 bg-blue-50">
              <p className="text-xs font-medium text-blue-700 opacity-70">Quoted</p>
              <p className="text-sm font-bold text-blue-700 mt-0.5">{formatCurrency(totalQuoted)}</p>
              <p className="text-xs text-blue-500 mt-1">Open quotations</p>
            </div>
            <div className="rounded-xl p-3 bg-violet-50">
              <p className="text-xs font-medium text-violet-700 opacity-70">Invoiced</p>
              <p className="text-sm font-bold text-violet-700 mt-0.5">{formatCurrency(totalInvoicedAll)}</p>
              <p className="text-xs text-violet-500 mt-1">All invoices raised</p>
            </div>
            <div className="rounded-xl p-3 bg-emerald-50">
              <p className="text-xs font-medium text-emerald-700 opacity-70">Collected</p>
              <p className="text-sm font-bold text-emerald-700 mt-0.5">{formatCurrency(totalCollectedAll)}</p>
              <p className="text-xs text-emerald-500 mt-1">Payments received</p>
            </div>
            <div className="rounded-xl p-3 bg-red-50">
              <p className="text-xs font-medium text-red-700 opacity-70">Outstanding</p>
              <p className="text-sm font-bold text-red-700 mt-0.5">{formatCurrency(totalOutstandingAll)}</p>
              <p className="text-xs text-red-500 mt-1">Unpaid balances</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Collection rate</span>
              <span className="font-medium">{collectionRate}% of invoiced</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${collectionRate}%` }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Debtors Report ─────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Debtors Report</h2>
            <p className="text-sm text-gray-500 mt-0.5">Invoices with outstanding balances · all time</p>
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
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
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

      {/* ── Creditors Report ────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Creditors Report</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Outstanding LPO obligations (Sent &amp; Received) · {periodLabel}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total Payables</p>
            <p className="text-xl font-bold text-amber-600">{formatCurrency(totalPayables)}</p>
          </div>
        </div>

        {creditors.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-gray-600 font-medium">No outstanding LPO obligations</p>
            <p className="text-sm text-gray-400 mt-0.5">
              {hasPeriod ? `No Sent or Received LPOs in ${periodLabel}` : 'No Sent or Received LPOs found'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">LPO No.</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Supplier</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Job</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {creditors.map((lpo) => {
                  const jobNo = lpo.job_id
                    ? (lpo.job_type === 'survey'
                      ? surveyJobMap.get(lpo.job_id)
                      : constructionJobMap.get(lpo.job_id)) ?? null
                    : null
                  return (
                    <tr key={lpo.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-blue-600">{lpo.lpo_no}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{lpo.supplier_name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{jobNo ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(lpo.issued_date)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={LPO_STATUS_COLORS[lpo.status] ?? 'gray'}>{lpo.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(lpo.total)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                  <td colSpan={5} className="px-4 py-3 text-gray-700">Total Payables</td>
                  <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(totalPayables)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* ── Expense Breakdown by Category ──────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Expenses by Category</h2>
            <p className="text-sm text-gray-500 mt-0.5">Breakdown of recorded expenses · {periodLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total Expenses</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalExpenseCost)}</p>
          </div>
        </div>

        {expenseByCategory.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-gray-600 font-medium">No expenses recorded</p>
            <p className="text-sm text-gray-400 mt-0.5">
              {hasPeriod ? `No expenses in ${periodLabel}` : 'No expenses found'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Count</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Total</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenseByCategory.map(({ category, count, total, pct }) => (
                  <tr key={category} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{count}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(total)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden hidden sm:block">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-gray-600 tabular-nums">{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                  <td className="px-4 py-3 text-gray-700">Total</td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {filteredExpenses.length}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(totalExpenseCost)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">100%</td>
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
            <h2 className="text-lg font-semibold text-gray-900">P&amp;L per Job</h2>
            <p className="text-sm text-gray-500 mt-0.5">Revenue vs costs across all active jobs · all time</p>
          </div>
          <div className="flex flex-wrap gap-4 text-right">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total Invoiced</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalInvoiced)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total Costs</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalCosts)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Net Margin</p>
              <p className={`text-lg font-bold ${totalMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(totalMargin)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Job</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Invoiced</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Costs</th>
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
                  <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(row.costsTotal)}</td>
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
                <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(totalCosts)}</td>
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

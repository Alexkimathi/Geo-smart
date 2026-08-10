import { createServiceClient } from '@/lib/supabase/service'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Paginator } from '@/components/ui/Paginator'
import type { Expense, SurveyJob, ConstructionJob } from '@/types/database'
import { AddExpenseForm } from './AddExpenseForm'

const PAGE_SIZE = 20

const CATEGORY_COLORS: Record<string, 'blue' | 'green' | 'yellow' | 'orange' | 'purple' | 'gray'> = {
  Labour: 'blue',
  Materials: 'green',
  Transport: 'yellow',
  Fuel: 'orange',
  Equipment: 'purple',
  Other: 'gray',
}

export type JobForExpense = {
  id: string
  job_no: string
  label: string
  job_type: 'survey' | 'construction'
}

function pageHref(p: number) {
  if (p <= 1) return '/finance/expenses'
  return `/finance/expenses?page=${p}`
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const db = createServiceClient()
  const [
    { data: expenses, count },
    { data: surveyJobs },
    { data: constructionJobs },
  ] = await Promise.all([
    db
      .from('expenses')
      .select('*', { count: 'exact' })
      .order('expense_date', { ascending: false })
      .range(from, to) as unknown as Promise<{ data: Expense[] | null; count: number | null }>,
    db
      .from('survey_jobs')
      .select('id, job_no, site_name, survey_type')
      .eq('is_archived', false)
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: Pick<SurveyJob, 'id' | 'job_no' | 'site_name' | 'survey_type'>[] | null }>,
    db
      .from('construction_jobs')
      .select('id, job_no, project_name, project_type')
      .eq('is_archived', false)
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: Pick<ConstructionJob, 'id' | 'job_no' | 'project_name' | 'project_type'>[] | null }>,
  ])

  const jobs: JobForExpense[] = [
    ...(surveyJobs ?? []).map((j) => ({
      id: j.id,
      job_no: j.job_no,
      label: `${j.job_no} — ${j.site_name} [${j.survey_type}]`,
      job_type: 'survey' as const,
    })),
    ...(constructionJobs ?? []).map((j) => ({
      id: j.id,
      job_no: j.job_no,
      label: `${j.job_no} — ${j.project_name} [${j.project_type}]`,
      job_type: 'construction' as const,
    })),
  ]

  const jobLookup = new Map<string, string>(jobs.map((j) => [j.id, j.job_no]))

  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const currentPage = Math.min(page, totalPages || 1)

  const prevHref = currentPage > 1 ? pageHref(currentPage - 1) : null
  const nextHref = currentPage < totalPages ? pageHref(currentPage + 1) : null

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalCount} expenses
          </p>
        </div>
      </div>

      {/* Add Expense Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Add Expense</h2>
        <AddExpenseForm jobs={jobs} />
      </div>

      {/* Expenses List */}
      {totalCount === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No expenses recorded</p>
          <p className="text-sm mt-1">Add your first expense above</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Job</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(expenses ?? []).map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500">{formatDate(expense.expense_date)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={CATEGORY_COLORS[expense.category] ?? 'gray'}>
                        {expense.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{expense.description}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {expense.job_id
                        ? <span className="font-mono text-xs">{jobLookup.get(expense.job_id) ?? expense.job_type}</span>
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(expense.amount)}
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

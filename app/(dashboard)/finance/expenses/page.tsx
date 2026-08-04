import { createServiceClient } from '@/lib/supabase/service'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { Expense, SurveyJob, ConstructionJob } from '@/types/database'
import { AddExpenseForm } from './AddExpenseForm'

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

export default async function ExpensesPage() {
  const db = createServiceClient()
  const [
    { data: expenses },
    { data: surveyJobs },
    { data: constructionJobs },
  ] = await Promise.all([
    db.from('expenses').select('*').order('expense_date', { ascending: false }) as unknown as Promise<{ data: Expense[] | null }>,
    db.from('survey_jobs').select('id, job_no, site_name, survey_type').eq('is_archived', false).order('created_at', { ascending: false }) as unknown as Promise<{ data: Pick<SurveyJob, 'id' | 'job_no' | 'site_name' | 'survey_type'>[] | null }>,
    db.from('construction_jobs').select('id, job_no, project_name, project_type').eq('is_archived', false).order('created_at', { ascending: false }) as unknown as Promise<{ data: Pick<ConstructionJob, 'id' | 'job_no' | 'project_name' | 'project_type'>[] | null }>,
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

  // Build lookup for job numbers to display in the list
  const jobLookup = new Map<string, string>(jobs.map((j) => [j.id, j.job_no]))

  const total = (expenses ?? []).reduce((s, e) => s + e.amount, 0)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {expenses?.length ?? 0} expenses · Total: {formatCurrency(total)}
          </p>
        </div>
      </div>

      {/* Add Expense Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Add Expense</h2>
        <AddExpenseForm jobs={jobs} />
      </div>

      {/* Expenses List */}
      {!expenses || expenses.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No expenses recorded</p>
          <p className="text-sm mt-1">Add your first expense above</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
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
              {expenses.map((expense) => (
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
      )}
    </div>
  )
}

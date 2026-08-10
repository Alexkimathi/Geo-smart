import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import { PrintButton } from '@/components/finance/PrintButton'
import type { ConstructionJob, Client, Expense, Lpo, BoqItem } from '@/types/database'

const PROJECT_TYPE_LABELS: Record<string, string> = {
  House: 'House Construction',
  Commercial: 'Commercial Construction',
  Road: 'Road Construction',
  Tender: 'Tender',
}

export default async function ConstructionJobPrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = createServiceClient()

  const [{ data: job }, { data: expenses }, { data: lpos }, { data: boqItems }] = await Promise.all([
    db
      .from('construction_jobs')
      .select('*, clients(id, name, company, phone, email, site_location, pin, contact_person)')
      .eq('id', id)
      .single() as unknown as Promise<{
        data: (ConstructionJob & {
          clients: Pick<Client, 'id' | 'name' | 'company' | 'phone' | 'email' | 'site_location' | 'pin' | 'contact_person'> | null
        }) | null
      }>,
    db
      .from('expenses')
      .select('*')
      .eq('job_id', id)
      .eq('job_type', 'construction')
      .order('expense_date') as unknown as Promise<{ data: Expense[] | null }>,
    db
      .from('lpos')
      .select('lpo_no, supplier_name, total, status, issued_date')
      .eq('job_id', id)
      .eq('job_type', 'construction')
      .neq('status', 'Cancelled') as unknown as Promise<{
        data: Pick<Lpo, 'lpo_no' | 'supplier_name' | 'total' | 'status' | 'issued_date'>[] | null
      }>,
    db
      .from('boq_items')
      .select('*')
      .eq('job_id', id)
      .eq('job_type', 'construction')
      .order('sort_order') as unknown as Promise<{ data: BoqItem[] | null }>,
  ])

  if (!job) notFound()

  const totalExpenses = (expenses ?? []).reduce((s, e) => s + e.amount, 0)
  const totalLpos = (lpos ?? []).reduce((s, l) => s + l.total, 0)
  const totalCosts = totalExpenses + totalLpos
  const boqTotal = (boqItems ?? []).reduce((s, b) => s + b.amount, 0)
  const printDate = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })

  const isOverBudget = boqTotal > 0 && totalCosts > boqTotal
  const spentPct = boqTotal > 0 ? Math.min((totalCosts / boqTotal) * 100, 100) : 0
  const invoicedPct = job.contract_value > 0 ? Math.min((0 / job.contract_value) * 100, 100) : 0

  return (
    <div className="min-h-screen bg-white">
      {/* Print button — hidden when printing */}
      <div className="no-print flex justify-end p-4 border-b border-gray-200 gap-3">
        <a
          href={`/jobs/construction/${id}`}
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
        >
          Back to Job
        </a>
        <PrintButton />
      </div>

      {/* Document */}
      <div className="max-w-3xl mx-auto p-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Geo-Smart Surveys Ltd</h1>
            <p className="text-sm text-gray-500 mt-1">Professional Surveying &amp; Construction Services</p>
            <p className="text-sm text-gray-500">Nairobi, Kenya</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold font-mono text-blue-700">{job.job_no}</p>
            <p className="text-sm font-semibold text-gray-600 mt-1 uppercase tracking-wide">Site Report</p>
            <p className="text-sm text-gray-500">Printed: {printDate}</p>
          </div>
        </div>

        {/* Status + Progress */}
        <div className="mb-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Status: <strong>{job.status}</strong></span>
            <span className="text-sm font-bold text-gray-900">Progress: {job.progress_pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${job.progress_pct}%` }} />
          </div>
        </div>

        {/* Job Details */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Project Details</p>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-500 w-40">Job Number</td>
                <td className="py-2 font-mono font-semibold text-gray-900">{job.job_no}</td>
                <td className="py-2 text-gray-500 w-40">Project Type</td>
                <td className="py-2 font-medium text-gray-900">
                  {PROJECT_TYPE_LABELS[job.project_type] ?? job.project_type}
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-500">Project Name</td>
                <td className="py-2 font-medium text-gray-900" colSpan={3}>{job.project_name}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-500">Contract Value</td>
                <td className="py-2 font-semibold text-gray-900">{formatCurrency(job.contract_value)}</td>
                <td className="py-2 text-gray-500">BOQ Budget</td>
                <td className="py-2 font-semibold text-gray-900">{formatCurrency(job.boq_total)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-500">Start Date</td>
                <td className="py-2 text-gray-900">{formatDate(job.start_date)}</td>
                <td className="py-2 text-gray-500">End Date</td>
                <td className="py-2 text-gray-900">{formatDate(job.end_date)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Client */}
        {job.clients && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Client</p>
            <p className="font-semibold text-gray-900">{job.clients.name}</p>
            {job.clients.company && <p className="text-sm text-gray-600">{job.clients.company}</p>}
            {job.clients.contact_person && <p className="text-sm text-gray-600">Contact: {job.clients.contact_person}</p>}
            {job.clients.phone && <p className="text-sm text-gray-600">{job.clients.phone}</p>}
            {job.clients.email && <p className="text-sm text-gray-600">{job.clients.email}</p>}
            {job.clients.site_location && <p className="text-sm text-gray-600">Site: {job.clients.site_location}</p>}
            {job.clients.pin && <p className="text-sm text-gray-600">KRA PIN: {job.clients.pin}</p>}
          </div>
        )}

        {/* Budget vs Actual Summary */}
        {(job.contract_value > 0 || job.boq_total > 0) && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Budget vs Actual {isOverBudget && <span className="text-red-600 ml-2">— OVER BUDGET</span>}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Contract Value</p>
                <p className="font-bold text-gray-900">{formatCurrency(job.contract_value)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">BOQ Budget</p>
                <p className="font-bold text-gray-900">{formatCurrency(job.boq_total)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Actual Costs</p>
                <p className={`font-bold ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(totalCosts)}</p>
                <p className="text-xs text-gray-400">{spentPct.toFixed(1)}% of BOQ</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Budget Remaining</p>
                <p className={`font-bold ${isOverBudget ? 'text-red-600' : 'text-emerald-700'}`}>
                  {isOverBudget ? `(${formatCurrency(totalCosts - job.boq_total)} over)` : formatCurrency(job.boq_total - totalCosts)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* BOQ */}
        {(boqItems ?? []).length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Bill of Quantities</p>
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Description</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">Qty</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">Unit</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Rate</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(boqItems ?? []).map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-gray-900">{item.description}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{item.quantity}</td>
                    <td className="px-3 py-2 text-center text-gray-500">{item.unit}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(item.unit_rate)}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                  <td colSpan={4} className="px-3 py-2 text-gray-700">BOQ Total</td>
                  <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(boqTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Expenses */}
        {(expenses ?? []).length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Expenses</p>
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Date</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Category</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Description</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(expenses ?? []).map((e) => (
                  <tr key={e.id}>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatDate(e.expense_date)}</td>
                    <td className="px-3 py-2 text-gray-600">{e.category}</td>
                    <td className="px-3 py-2 text-gray-900">{e.description}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                  <td colSpan={3} className="px-3 py-2 text-gray-700">Total Expenses</td>
                  <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(totalExpenses)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* LPOs */}
        {(lpos ?? []).length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Local Purchase Orders</p>
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">LPO No.</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Supplier</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Date</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(lpos ?? []).map((l, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-mono text-xs text-gray-700">{l.lpo_no}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{l.supplier_name}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatDate(l.issued_date)}</td>
                    <td className="px-3 py-2 text-gray-600">{l.status}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrency(l.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                  <td colSpan={4} className="px-3 py-2 text-gray-700">Total LPOs</td>
                  <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(totalLpos)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Notes */}
        {job.notes && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.notes}</p>
          </div>
        )}

        {/* Signature blocks */}
        <div className="mt-12 grid grid-cols-3 gap-8">
          <div>
            <div className="border-t-2 border-gray-300 pt-2">
              <p className="text-xs text-gray-400">Prepared By &amp; Date</p>
            </div>
          </div>
          <div>
            <div className="border-t-2 border-gray-300 pt-2">
              <p className="text-xs text-gray-400">Site Engineer &amp; Date</p>
            </div>
          </div>
          <div>
            <div className="border-t-2 border-gray-300 pt-2">
              <p className="text-xs text-gray-400">Approved By &amp; Date</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-10">
          Geo-Smart Surveys Ltd — {printDate}
        </p>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
      `}</style>
    </div>
  )
}

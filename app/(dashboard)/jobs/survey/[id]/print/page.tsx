import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import { PrintButton } from '@/components/finance/PrintButton'
import type { SurveyJob, Client, Expense, Lpo, Profile } from '@/types/database'

const SURVEY_TYPE_LABELS: Record<string, string> = {
  Topo: 'Topographic Survey',
  Cadastral: 'Cadastral Survey',
  Control: 'Control Survey',
  'Setting Out': 'Setting Out',
}

export default async function SurveyJobPrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = createServiceClient()

  const [{ data: job }, { data: expenses }, { data: lpos }] = await Promise.all([
    db
      .from('survey_jobs')
      .select('*, clients(id, name, company, phone, email, site_location, pin, contact_person)')
      .eq('id', id)
      .single() as unknown as Promise<{
        data: (SurveyJob & {
          clients: Pick<Client, 'id' | 'name' | 'company' | 'phone' | 'email' | 'site_location' | 'pin' | 'contact_person'> | null
        }) | null
      }>,
    db
      .from('expenses')
      .select('*')
      .eq('job_id', id)
      .eq('job_type', 'survey')
      .order('expense_date') as unknown as Promise<{ data: Expense[] | null }>,
    db
      .from('lpos')
      .select('lpo_no, supplier_name, total, status, issued_date')
      .eq('job_id', id)
      .eq('job_type', 'survey')
      .neq('status', 'Cancelled') as unknown as Promise<{
        data: Pick<Lpo, 'lpo_no' | 'supplier_name' | 'total' | 'status' | 'issued_date'>[] | null
      }>,
  ])

  if (!job) notFound()

  // Fetch team members if team_ids is populated
  let teamMembers: Pick<Profile, 'full_name' | 'role'>[] = []
  if (job.team_ids && job.team_ids.length > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('full_name, role')
      .in('id', job.team_ids) as unknown as { data: Pick<Profile, 'full_name' | 'role'>[] | null }
    teamMembers = profiles ?? []
  }

  // Fetch equipment if equipment_ids is populated
  let equipmentList: { name: string; type: string; serial_no: string | null }[] = []
  if (job.equipment_ids && job.equipment_ids.length > 0) {
    const { data: equip } = await db
      .from('equipment')
      .select('name, type, serial_no')
      .in('id', job.equipment_ids) as unknown as { data: { name: string; type: string; serial_no: string | null }[] | null }
    equipmentList = equip ?? []
  }

  const surveyFee = job.quoted_amount ?? 0
  const totalExpenses = (expenses ?? []).reduce((s, e) => s + e.amount, 0)
  const totalLpos = (lpos ?? []).reduce((s, l) => s + l.total, 0)
  const totalCosts = surveyFee + totalExpenses + totalLpos
  const printDate = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-white">
      {/* Print button — hidden when printing */}
      <div className="no-print flex justify-end p-4 border-b border-gray-200 gap-3">
        <a
          href={`/jobs/survey/${id}`}
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
            <p className="text-sm font-semibold text-gray-600 mt-1 uppercase tracking-wide">Job Card</p>
            <p className="text-sm text-gray-500">Printed: {printDate}</p>
          </div>
        </div>

        {/* Status banner */}
        <div className="mb-6 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Status</span>
          <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">{job.status}</span>
        </div>

        {/* Job Details */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Job Details</p>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-500 w-40">Job Number</td>
                <td className="py-2 font-mono font-semibold text-gray-900">{job.job_no}</td>
                <td className="py-2 text-gray-500 w-40">Survey Type</td>
                <td className="py-2 font-medium text-gray-900">
                  {SURVEY_TYPE_LABELS[job.survey_type] ?? job.survey_type}
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-500">Site Name</td>
                <td className="py-2 font-medium text-gray-900">{job.site_name}</td>
                <td className="py-2 text-gray-500">County</td>
                <td className="py-2 font-medium text-gray-900">{job.county ?? '—'}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-500">Start Date</td>
                <td className="py-2 text-gray-900">{formatDate(job.start_date)}</td>
                <td className="py-2 text-gray-500">End Date</td>
                <td className="py-2 text-gray-900">{formatDate(job.end_date)}</td>
              </tr>
              {surveyFee > 0 && (
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-500">Survey Type Fee</td>
                  <td className="py-2 font-semibold text-gray-900" colSpan={3}>{formatCurrency(surveyFee)}</td>
                </tr>
              )}
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

        {/* Team */}
        {teamMembers.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Assigned Team</p>
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Name</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teamMembers.map((m, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-medium text-gray-900">{m.full_name}</td>
                    <td className="px-3 py-2 text-gray-600 capitalize">{m.role.replace('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Equipment */}
        {equipmentList.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Equipment Used</p>
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Equipment</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Type</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Serial No.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {equipmentList.map((e, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-medium text-gray-900">{e.name}</td>
                    <td className="px-3 py-2 text-gray-600 capitalize">{e.type.replace('_', ' ')}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-500">{e.serial_no ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Project Costs — single unified breakdown */}
        {(surveyFee > 0 || (expenses ?? []).length > 0 || (lpos ?? []).length > 0) && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Project Costs</p>
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
                {/* Survey Type Fee row */}
                {surveyFee > 0 && (
                  <tr>
                    <td className="px-3 py-2 text-gray-500">—</td>
                    <td className="px-3 py-2 text-gray-600">Survey Fee</td>
                    <td className="px-3 py-2 text-gray-900">Survey Type Fee ({job.survey_type})</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrency(surveyFee)}</td>
                  </tr>
                )}
                {/* Expense rows */}
                {(expenses ?? []).map((e) => (
                  <tr key={e.id}>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatDate(e.expense_date)}</td>
                    <td className="px-3 py-2 text-gray-600">{e.category}</td>
                    <td className="px-3 py-2 text-gray-900">{e.description}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
                {/* LPO rows */}
                {(lpos ?? []).map((l, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatDate(l.issued_date)}</td>
                    <td className="px-3 py-2 text-gray-600">LPO — {l.lpo_no}</td>
                    <td className="px-3 py-2 text-gray-900">{l.supplier_name}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrency(l.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                  <td colSpan={3} className="px-3 py-2 text-gray-800">Total Costs</td>
                  <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(totalCosts)}</td>
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
              <p className="text-xs text-gray-400">Checked By &amp; Date</p>
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

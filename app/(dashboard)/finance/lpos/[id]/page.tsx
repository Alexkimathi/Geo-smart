import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatCurrency } from '@/lib/utils'
import { deleteLpoAction, updateLpoStatusAction } from '@/app/(dashboard)/finance/actions'
import type { Lpo, SurveyJob, ConstructionJob } from '@/types/database'

const STATUS_COLORS: Record<string, 'gray' | 'blue' | 'green' | 'red'> = {
  Draft: 'gray', Sent: 'blue', Received: 'green', Cancelled: 'red',
}

export default async function LpoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createServiceClient()
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()

  const [{ data: lpo }, { data: profile }] = await Promise.all([
    db.from('lpos').select('*').eq('id', id).single() as unknown as Promise<{ data: Lpo | null }>,
    user
      ? db.from('profiles').select('role').eq('id', user.id).single() as unknown as Promise<{ data: { role: string } | null }>
      : Promise.resolve({ data: null }),
  ])

  if (!lpo) notFound()

  const isAdmin = profile?.role === 'admin'

  // Fetch linked job label if present
  let jobLabel: string | null = null
  let jobHref: string | null = null
  if (lpo.job_id && lpo.job_type === 'survey') {
    const { data: j } = await db.from('survey_jobs').select('job_no, site_name').eq('id', lpo.job_id).single() as unknown as { data: Pick<SurveyJob, 'job_no' | 'site_name'> | null }
    if (j) { jobLabel = `${j.job_no} — ${j.site_name}`; jobHref = `/jobs/survey/${lpo.job_id}` }
  } else if (lpo.job_id && lpo.job_type === 'construction') {
    const { data: j } = await db.from('construction_jobs').select('job_no, project_name').eq('id', lpo.job_id).single() as unknown as { data: Pick<ConstructionJob, 'job_no' | 'project_name'> | null }
    if (j) { jobLabel = `${j.job_no} — ${j.project_name}`; jobHref = `/jobs/construction/${lpo.job_id}` }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <Link href="/finance/lpos" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" />Back to LPOs
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold font-mono text-gray-900">{lpo.lpo_no}</h1>
            <Badge variant={STATUS_COLORS[lpo.status] ?? 'gray'} className="text-sm px-3 py-1">{lpo.status}</Badge>
          </div>
          <p className="text-sm text-gray-500">Supplier: <span className="font-medium text-gray-800">{lpo.supplier_name}</span></p>
          {jobLabel && jobHref && (
            <Link href={jobHref} className="text-sm text-blue-600 hover:underline">Linked to {jobLabel}</Link>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link href={`/finance/lpos/${id}/edit`}>
            <Button variant="outline" size="sm"><Pencil className="w-4 h-4" />Edit</Button>
          </Link>
          {(lpo.status === 'Draft' || lpo.status === 'Sent') && (
            <form action={async () => {
              'use server'
              await updateLpoStatusAction(id, lpo.status === 'Draft' ? 'Sent' : 'Received')
            }}>
              <Button type="submit" variant="outline" size="sm">
                {lpo.status === 'Draft' ? 'Mark as Sent' : 'Mark Received'}
              </Button>
            </form>
          )}
          {isAdmin && (
            <form action={async () => {
              'use server'
              await deleteLpoAction(id)
            }}>
              <Button type="submit" variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                Delete
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Line Items */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Items Ordered</h2>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Description</th>
                  <th className="text-center pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide w-16">Qty</th>
                  <th className="text-center pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide w-16">Unit</th>
                  <th className="text-right pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide w-28">Unit Price</th>
                  <th className="text-right pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lpo.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2.5 text-gray-800">{item.description}</td>
                    <td className="py-2.5 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-2.5 text-center text-gray-500">{item.unit || '—'}</td>
                    <td className="py-2.5 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                    <td className="py-2.5 text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5 max-w-xs ml-auto">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span><span>{formatCurrency(lpo.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax ({lpo.tax}%)</span><span>{formatCurrency(lpo.total - lpo.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-gray-900 pt-1.5 border-t border-gray-100">
                <span>Total</span><span>{formatCurrency(lpo.total)}</span>
              </div>
            </div>
          </div>

          {lpo.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-2">Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{lpo.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Details</h2>
            <dl className="space-y-2.5">
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Issue Date</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5">{formatDate(lpo.issued_date)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Status</dt>
                <dd className="mt-0.5"><Badge variant={STATUS_COLORS[lpo.status] ?? 'gray'}>{lpo.status}</Badge></dd>
              </div>
              {jobLabel && jobHref && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide">Linked Job</dt>
                  <dd className="text-sm mt-0.5">
                    <Link href={jobHref} className="text-blue-600 hover:underline">{jobLabel}</Link>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Created</dt>
                <dd className="text-sm text-gray-700 mt-0.5">{formatDate(lpo.created_at)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

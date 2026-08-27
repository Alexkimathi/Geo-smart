import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ReservationStatusBadge, PlotStatusBadge } from '@/components/plots/PlotStatusBadge'
import { RecordPaymentForm } from '@/components/plots/RecordPaymentForm'
import { TitleDocumentUploader } from '@/components/plots/TitleDocumentUploader'
import {
  approveReservationAction,
  cancelReservationAction,
  recordPaymentAction,
  deletePaymentAction,
  markTransferredAction,
} from '@/app/(dashboard)/plots/actions'
import { ArrowLeft, Trash2, CheckCircle } from 'lucide-react' // CheckCircle still used in Approve button
import type { PlotReservation, Plot, PlotProject, PlotBuyer, PlotPayment, ReservationDocument, ReservationStatus } from '@/types/database'

export default async function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createServiceClient()

  const [{ data: reservation }, { data: reservationDocs }] = await Promise.all([
    db
      .from('plot_reservations')
      .select(`*, plots(*, plot_projects(*)), plot_buyers(*), plot_payments(*)`)
      .eq('id', id)
      .single() as unknown as Promise<{
        data: PlotReservation & {
          plots: Plot & { plot_projects: PlotProject }
          plot_buyers: PlotBuyer
          plot_payments: PlotPayment[]
        } | null
      }>,
    db
      .from('reservation_documents')
      .select('*')
      .eq('reservation_id', id)
      .order('created_at') as unknown as Promise<{ data: ReservationDocument[] | null }>,
  ])

  if (!reservation) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user!.id).single()
  const canApprove = profile?.role === 'admin' || profile?.role === 'manager'

  const payments = (reservation.plot_payments ?? []).sort(
    (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
  )
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const balance = Number(reservation.sale_price) - totalPaid
  const paidPct = Math.min(100, Math.round((totalPaid / Number(reservation.sale_price)) * 100))

  // 30-day default check
  const lastPayment = payments.filter(p => p.payment_type !== 'reservation_fee').at(-1)
  let daysOverdue: number | null = null
  if (reservation.status === 'active' && lastPayment) {
    const lastDate = new Date(lastPayment.payment_date)
    const deadline = new Date(lastDate)
    deadline.setDate(deadline.getDate() + 30)
    const today = new Date()
    if (today > deadline) {
      daysOverdue = Math.floor((today.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24))
    }
  }

  // Inline server action closures (capture id/plotId from scope)
  const plot = reservation.plots
  const plotId = plot?.id ?? ''

  async function approve(_: FormData) {
    'use server'
    await approveReservationAction(id)
  }
  async function cancel(_: FormData) {
    'use server'
    await cancelReservationAction(id)
  }
  async function transfer(_: FormData) {
    'use server'
    await markTransferredAction(plotId)
  }

  const paymentAction = recordPaymentAction.bind(null, id)

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <Link href="/plots/reservations" className="mt-1 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">
              Plot #{plot?.plot_no} — {reservation.plot_buyers?.full_name}
            </h1>
            <ReservationStatusBadge status={reservation.status as ReservationStatus} />
          </div>
          <p className="text-sm text-gray-500 mt-1">{plot?.plot_projects?.name}</p>
        </div>

        {canApprove && reservation.status === 'pending_approval' && (
          <div className="flex gap-2 shrink-0">
            <form action={approve}>
              <Button size="sm" type="submit">
                <CheckCircle className="w-4 h-4" /> Approve
              </Button>
            </form>
            <form action={cancel}>
              <Button size="sm" variant="outline" type="submit" className="text-red-600 hover:text-red-700">
                Reject
              </Button>
            </form>
          </div>
        )}
        {canApprove && reservation.status === 'active' && (
          <form action={cancel}>
            <Button size="sm" variant="outline" type="submit" className="text-red-600 shrink-0">
              Cancel Reservation
            </Button>
          </form>
        )}
      </div>

      {daysOverdue !== null && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-300 px-4 py-3 text-sm text-red-700 font-medium">
          Overdue by {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} — last payment was more than 30 days ago
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {/* Buyer info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Buyer</h2>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-gray-500 text-xs">Name</dt><dd className="font-medium">{reservation.plot_buyers?.full_name}</dd></div>
            <div><dt className="text-gray-500 text-xs">Phone</dt><dd>{reservation.plot_buyers?.phone}</dd></div>
            {reservation.plot_buyers?.email && <div><dt className="text-gray-500 text-xs">Email</dt><dd>{reservation.plot_buyers.email}</dd></div>}
            {reservation.plot_buyers?.national_id && <div><dt className="text-gray-500 text-xs">National ID</dt><dd className="font-mono">{reservation.plot_buyers.national_id}</dd></div>}
          </dl>
        </div>

        {/* Plot info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Plot</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500 text-xs">Plot No.</dt>
              <dd className="font-medium">#{plot?.plot_no}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 text-xs">Size</dt>
              <dd>{plot?.size_desc ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 text-xs">Status</dt>
              <dd>{plot && <PlotStatusBadge status={plot.status} />}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 text-xs">Payment Plan</dt>
              <dd className="capitalize">
                {reservation.payment_plan === 'installment'
                  ? `${reservation.installment_count}x ${reservation.installment_frequency}`
                  : 'Lump sum'}
              </dd>
            </div>
          </dl>
          {plot?.status === 'sold' && canApprove && (
            <form action={transfer} className="mt-3">
              <button type="submit" className="w-full text-xs py-1.5 rounded border border-blue-300 text-blue-700 hover:bg-blue-50">
                Mark as Transferred
              </button>
            </form>
          )}
        </div>

        {/* Financial summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Financials</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500 text-xs">Sale Price</dt>
              <dd className="font-semibold">KES {Number(reservation.sale_price).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 text-xs">Total Paid</dt>
              <dd className="text-green-700 font-semibold">KES {totalPaid.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 text-xs">Balance</dt>
              <dd className={`font-semibold ${balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {balance > 0 ? `KES ${balance.toLocaleString()}` : 'Fully Paid'}
              </dd>
            </div>
            {reservation.payment_plan === 'installment' && reservation.installment_amount && (
              <div className="flex justify-between">
                <dt className="text-gray-500 text-xs">Per installment</dt>
                <dd>KES {Number(reservation.installment_amount).toLocaleString()}</dd>
              </div>
            )}
          </dl>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{paidPct}% paid</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${paidPct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${paidPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Title deed document checklist */}
      {!['cancelled', 'defaulted'].includes(reservation.status) && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Title Deed Checklist</h2>
          <TitleDocumentUploader
            reservationId={id}
            docs={reservationDocs ?? []}
            canUpload={canApprove}
          />
        </div>
      )}

      {/* Payment ledger */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Payment Ledger</h2>

        {payments.length === 0 ? (
          <p className="text-sm text-gray-400">No payments recorded yet</p>
        ) : (
          <table className="w-full text-sm mb-4">
            <thead className="text-xs text-gray-500 uppercase border-b border-gray-100">
              <tr>
                <th className="pb-2 text-left">Date</th>
                <th className="pb-2 text-left">Type</th>
                <th className="pb-2 text-left">Method</th>
                <th className="pb-2 text-left">Reference</th>
                <th className="pb-2 text-right">Amount (KES)</th>
                {canApprove && <th className="pb-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map((payment) => {
                async function deletePayment(_: FormData) {
                  'use server'
                  await deletePaymentAction(payment.id, id)
                }
                return (
                  <tr key={payment.id}>
                    <td className="py-2.5 text-gray-700">
                      {new Date(payment.payment_date).toLocaleDateString('en-KE')}
                    </td>
                    <td className="py-2.5 text-gray-600 capitalize">
                      {payment.payment_type.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 text-gray-600">{payment.method}</td>
                    <td className="py-2.5">
                      {payment.reference ? (
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                          {payment.reference}
                        </span>
                      ) : '—'}
                      {payment.mpesa_name && <span className="text-xs text-gray-400 ml-1">({payment.mpesa_name})</span>}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-green-700">
                      {Number(payment.amount).toLocaleString()}
                    </td>
                    {canApprove && (
                      <td className="py-2.5 text-right">
                        <form action={deletePayment}>
                          <button type="submit" className="text-gray-400 hover:text-red-600 transition-colors" title="Delete payment">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-200">
              <tr>
                <td colSpan={4} className="pt-2 text-sm font-semibold text-gray-700">Total Paid</td>
                <td className="pt-2 text-right font-bold text-green-700">
                  {totalPaid.toLocaleString()}
                </td>
                {canApprove && <td />}
              </tr>
            </tfoot>
          </table>
        )}

        {/* Record payment form (active reservations only) */}
        {reservation.status === 'active' && balance > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <h3 className="font-medium text-gray-900 mb-3">Record New Payment</h3>
            <RecordPaymentForm action={paymentAction} maxAmount={balance} />
          </div>
        )}
      </div>

      {/* Notes */}
      {reservation.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-2">Notes</h2>
          <p className="text-sm text-gray-700">{reservation.notes}</p>
        </div>
      )}
    </div>
  )
}

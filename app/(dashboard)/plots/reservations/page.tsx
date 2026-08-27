import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import { ReservationStatusBadge } from '@/components/plots/PlotStatusBadge'
import { CheckCircle, XCircle } from 'lucide-react'
import { approveReservationAction, cancelReservationAction } from '@/app/(dashboard)/plots/actions'
import { createClient } from '@/lib/supabase/server'
import type { ReservationStatus } from '@/types/database'

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const db = createServiceClient()

  let query = db
    .from('plot_reservations')
    .select(`
      *,
      plots(id, plot_no, price, plot_projects(id, name)),
      plot_buyers(id, full_name, phone, national_id),
      plot_payments(amount)
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data: reservations } = await query

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user!.id).single()
  const canApprove = profile?.role === 'admin' || profile?.role === 'manager'

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
          <p className="text-sm text-gray-500 mt-0.5">{reservations?.length ?? 0} total</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['', 'pending_approval', 'active', 'completed', 'defaulted', 'cancelled'] as const).map((s) => (
          <Link
            key={s}
            href={s ? `/plots/reservations?status=${s}` : '/plots/reservations'}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              (status ?? '') === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === '' ? 'All' : s === 'pending_approval' ? 'Pending Approval' : s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      {!reservations || reservations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium">No reservations found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Plot</th>
                <th className="px-4 py-3 text-left">Buyer</th>
                <th className="px-4 py-3 text-right">Sale Price</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date</th>
                {canApprove && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(reservations as any[]).map((res) => {
                const totalPaid = (res.plot_payments ?? []).reduce(
                  (sum: number, p: { amount: number }) => sum + Number(p.amount), 0
                )
                const balance = Number(res.sale_price) - totalPaid
                const isDefault = res.status === 'active' && (() => {
                  const payments = (res.plot_payments ?? []) as { amount: number }[]
                  if (payments.length === 0) return false
                  // Check 30-day rule based on latest payment in plot_payments
                  // Note: we don't have payment_date here in this query - just flag with count
                  return false
                })()

                return (
                  <tr key={res.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/plots/reservations/${res.id}`} className="font-medium text-blue-600 hover:underline">
                        #{res.plots?.plot_no}
                      </Link>
                      <p className="text-xs text-gray-500">{res.plots?.plot_projects?.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{res.plot_buyers?.full_name}</p>
                      <p className="text-xs text-gray-500">{res.plot_buyers?.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {Number(res.sale_price).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-green-700 font-medium">
                      {totalPaid.toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {balance > 0 ? balance.toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <ReservationStatusBadge status={res.status as ReservationStatus} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(res.reservation_date).toLocaleDateString('en-KE')}
                    </td>
                    {canApprove && (
                      <td className="px-4 py-3">
                        {res.status === 'pending_approval' && (
                          <div className="flex gap-1">
                            <form action={async () => { 'use server'; await approveReservationAction(res.id) }}>
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700"
                                title="Approve"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Approve
                              </button>
                            </form>
                            <form action={async () => { 'use server'; await cancelReservationAction(res.id) }}>
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                                title="Reject"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </form>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

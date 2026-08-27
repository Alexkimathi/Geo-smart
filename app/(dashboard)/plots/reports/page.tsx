import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PlotReportActions } from '@/components/plots/PlotReportActions'
import { ReservationStatusBadge } from '@/components/plots/PlotStatusBadge'
import type { ReservationStatus } from '@/types/database'

export const dynamic = 'force-dynamic'

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

export default async function PlotReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'manager') redirect('/plots/projects')

  // Fetch all plots with project info
  const { data: plots } = await db
    .from('plots')
    .select('id, plot_no, size_desc, price, status, plot_projects(id, name)')

  // Fetch all active/completed reservations with payments
  const { data: reservations } = await db
    .from('plot_reservations')
    .select(`
      id, plot_id, sale_price, reservation_date, status, payment_plan,
      plot_buyers(full_name, phone),
      plots(plot_no, plot_projects(name)),
      plot_payments(amount, payment_date, payment_type)
    `)
    .in('status', ['pending_approval', 'active', 'completed', 'defaulted'])
    .order('reservation_date', { ascending: false })

  // Compute financial aggregates
  const allPayments = (reservations ?? []).flatMap((r: any) =>
    (r.plot_payments ?? []).map((p: any) => ({ ...p, reservationId: r.id }))
  )
  const totalRevenue = allPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0)

  const statusCounts = (plots ?? []).reduce((acc: Record<string, number>, p: any) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Build reservation summaries for the table + Excel export
  const resSummaries = (reservations ?? []).map((res: any) => {
    const payments = (res.plot_payments ?? []) as { amount: number; payment_date: string; payment_type: string }[]
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0)
    const balance = Number(res.sale_price) - totalPaid
    const installmentPayments = payments.filter(p => p.payment_type !== 'reservation_fee')
    const lastPayment = installmentPayments.sort(
      (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
    )[0]
    const daysOverdue = lastPayment ? Math.max(0, daysSince(lastPayment.payment_date) - 30) : 0
    const isDefaulting = res.status === 'active' && daysOverdue > 0

    return {
      id: res.id,
      project: res.plots?.plot_projects?.name ?? '—',
      plotNo: res.plots?.plot_no ?? '—',
      buyerName: res.plot_buyers?.full_name ?? '—',
      buyerPhone: res.plot_buyers?.phone ?? '—',
      salePrice: Number(res.sale_price),
      totalPaid,
      balance,
      lastPaymentDate: lastPayment?.payment_date ?? '—',
      reservationDate: res.reservation_date,
      reservationStatus: res.status as ReservationStatus,
      isDefaulting,
      daysOverdue,
    }
  })

  const totalOutstanding = resSummaries
    .filter((r) => r.reservationStatus === 'active' || r.reservationStatus === 'pending_approval')
    .reduce((sum, r) => sum + r.balance, 0)

  const defaulters = resSummaries.filter((r) => r.isDefaulting)

  // Data for Excel export
  const reportRows = resSummaries.map((r) => ({
    project: r.project,
    plotNo: r.plotNo,
    size: (plots ?? []).find((p: any) => p.plot_no === r.plotNo)?.size_desc ?? '',
    price: (plots ?? []).find((p: any) => p.plot_no === r.plotNo)?.price ?? 0,
    status: (plots ?? []).find((p: any) => p.plot_no === r.plotNo)?.status ?? '',
    buyerName: r.buyerName,
    buyerPhone: r.buyerPhone,
    salePrice: r.salePrice,
    totalPaid: r.totalPaid,
    balance: r.balance,
    reservationDate: r.reservationDate,
    lastPaymentDate: r.lastPaymentDate,
    reservationStatus: r.reservationStatus,
  }))

  const defaulterRows = defaulters.map((d) => ({
    project: d.project,
    plotNo: d.plotNo,
    buyerName: d.buyerName,
    buyerPhone: d.buyerPhone,
    salePrice: d.salePrice,
    totalPaid: d.totalPaid,
    balance: d.balance,
    lastPaymentDate: d.lastPaymentDate,
    daysOverdue: d.daysOverdue,
  }))

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plots Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-KE', { dateStyle: 'long' })}
          </p>
        </div>
        <PlotReportActions rows={reportRows} defaulters={defaulterRows} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Available', value: statusCounts['available'] ?? 0, color: 'bg-green-50 border-green-200 text-green-800' },
          { label: 'Reserved', value: statusCounts['reserved'] ?? 0, color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
          { label: 'Sold', value: statusCounts['sold'] ?? 0, color: 'bg-red-50 border-red-200 text-red-800' },
          { label: 'Transferred', value: statusCounts['transferred'] ?? 0, color: 'bg-blue-50 border-blue-200 text-blue-800' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl border p-4 ${color}`}>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-sm font-medium mt-0.5">{label} Plots</p>
          </div>
        ))}
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total Revenue Collected</p>
          <p className="text-2xl font-bold text-green-700 mt-1">KES {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total Outstanding Balance</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">KES {totalOutstanding.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Active Defaulters</p>
          <p className={`text-2xl font-bold mt-1 ${defaulters.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {defaulters.length}
          </p>
        </div>
      </div>

      {/* Defaulters section */}
      {defaulters.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-red-700 mb-3">
            Defaulters ({defaulters.length})
          </h2>
          <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-red-50 text-red-700 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Plot</th>
                  <th className="px-4 py-3 text-left">Buyer</th>
                  <th className="px-4 py-3 text-right">Sale Price</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-left">Last Payment</th>
                  <th className="px-4 py-3 text-right">Days Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50">
                {defaulters.map((d) => (
                  <tr key={d.id} className="bg-red-50/50">
                    <td className="px-4 py-3">
                      <span className="font-medium">#{d.plotNo}</span>
                      <p className="text-xs text-gray-500">{d.project}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{d.buyerName}</p>
                      <p className="text-xs text-gray-500">{d.buyerPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-right">{d.salePrice.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-green-700">{d.totalPaid.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-red-700 font-semibold">{d.balance.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{d.lastPaymentDate}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-700">{d.daysOverdue}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All reservations table */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">All Reservations</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Plot</th>
                <th className="px-4 py-3 text-left">Buyer</th>
                <th className="px-4 py-3 text-right">Sale Price</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Reserved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {resSummaries.map((res) => (
                <tr key={res.id} className={res.isDefaulting ? 'bg-red-50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3">
                    <span className="font-medium">#{res.plotNo}</span>
                    <p className="text-xs text-gray-500">{res.project}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{res.buyerName}</p>
                    <p className="text-xs text-gray-500">{res.buyerPhone}</p>
                  </td>
                  <td className="px-4 py-3 text-right">{res.salePrice.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-green-700 font-medium">{res.totalPaid.toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right font-medium ${res.balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {res.balance > 0 ? res.balance.toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <ReservationStatusBadge status={res.reservationStatus} />
                    {res.isDefaulting && (
                      <span className="ml-1 text-xs text-red-600 font-medium">{res.daysOverdue}d overdue</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(res.reservationDate).toLocaleDateString('en-KE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {resSummaries.length === 0 && (
            <p className="text-center py-10 text-gray-400 text-sm">No reservations yet</p>
          )}
        </div>
      </div>
    </div>
  )
}

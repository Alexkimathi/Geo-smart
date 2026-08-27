import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import { User, Phone, CreditCard } from 'lucide-react'
import { ReservationStatusBadge } from '@/components/plots/PlotStatusBadge'
import type { PlotBuyer, ReservationStatus } from '@/types/database'

export default async function BuyersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const db = createServiceClient()

  const { data: buyers } = await db
    .from('plot_buyers')
    .select(`
      *,
      plot_reservations(
        id, status, sale_price,
        plots(id, plot_no, plot_projects(id, name))
      )
    `)
    .order('created_at', { ascending: false }) as unknown as {
      data: (PlotBuyer & {
        plot_reservations: {
          id: string
          status: ReservationStatus
          sale_price: number
          plots: { id: string; plot_no: string; plot_projects: { id: string; name: string } }
        }[]
      })[] | null
    }

  const filtered = q
    ? (buyers ?? []).filter(
        (b) =>
          b.full_name.toLowerCase().includes(q.toLowerCase()) ||
          b.phone.includes(q) ||
          (b.national_id ?? '').includes(q)
      )
    : (buyers ?? [])

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plot Buyers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} buyers</p>
        </div>
      </div>

      {/* Search */}
      <form method="GET" className="mb-6">
        <div className="relative max-w-sm">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name, phone, or ID…"
            className="w-full pl-9 pr-4 h-10 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </form>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No buyers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((buyer) => {
            const activeRes = buyer.plot_reservations?.filter(
              (r) => r.status === 'active' || r.status === 'pending_approval'
            ) ?? []
            const completedRes = buyer.plot_reservations?.filter(
              (r) => r.status === 'completed'
            ) ?? []

            return (
              <div key={buyer.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{buyer.full_name}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                      <Phone className="w-3.5 h-3.5" />
                      {buyer.phone}
                    </div>
                    {buyer.national_id && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <CreditCard className="w-3 h-3" />
                        {buyer.national_id}
                      </div>
                    )}
                  </div>
                </div>

                {buyer.plot_reservations && buyer.plot_reservations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Reservations</p>
                    {buyer.plot_reservations.slice(0, 3).map((res) => (
                      <Link
                        key={res.id}
                        href={`/plots/reservations/${res.id}`}
                        className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-gray-50"
                      >
                        <span className="text-blue-600 font-medium">
                          #{res.plots?.plot_no} — {res.plots?.plot_projects?.name}
                        </span>
                        <ReservationStatusBadge status={res.status} />
                      </Link>
                    ))}
                  </div>
                )}

                {!buyer.plot_reservations?.length && (
                  <p className="text-xs text-gray-400">No reservations</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

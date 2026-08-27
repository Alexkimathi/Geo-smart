import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PlotStatusBadge } from '@/components/plots/PlotStatusBadge'
import { PhotoUploader } from '@/components/plots/PhotoUploader'
import { ArrowLeft, Pencil, MapPin } from 'lucide-react'
import type { Plot, PlotProject, PlotPhoto, PlotReservation, PlotBuyer } from '@/types/database'

export default async function PlotDetailPage({ params }: { params: Promise<{ plotId: string }> }) {
  const { plotId } = await params
  const db = createServiceClient()

  const { data: plot } = await db
    .from('plots')
    .select('*, plot_projects(*)')
    .eq('id', plotId)
    .single() as unknown as { data: (Plot & { plot_projects: PlotProject }) | null }

  if (!plot) notFound()

  const [{ data: photos }, { data: activeReservation }] = await Promise.all([
    db.from('plot_photos').select('*').eq('plot_id', plotId).order('created_at') as unknown as { data: PlotPhoto[] | null },
    db
      .from('plot_reservations')
      .select('*, plot_buyers(*)')
      .eq('plot_id', plotId)
      .in('status', ['pending_approval', 'active', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single() as unknown as { data: (PlotReservation & { plot_buyers: PlotBuyer }) | null },
  ])

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user!.id).single()
  const canEdit = profile?.role === 'admin' || profile?.role === 'manager'

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Back + header */}
      <div className="flex items-start gap-3 mb-6">
        <Link href={`/plots/projects/${plot.plot_projects?.id}`} className="mt-1 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">Plot #{plot.plot_no}</h1>
            <PlotStatusBadge status={plot.status} />
          </div>
          {plot.plot_projects && (
            <Link href={`/plots/projects/${plot.plot_projects.id}`} className="flex items-center gap-1 text-sm text-blue-600 hover:underline mt-1">
              <MapPin className="w-3.5 h-3.5" />
              {plot.plot_projects.name}
            </Link>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {canEdit && (
            <Link href={`/plots/plots/${plotId}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="w-4 h-4" />
                Edit
              </Button>
            </Link>
          )}
          {plot.status === 'available' && (
            <Link href={`/plots/plots/${plotId}/reserve`}>
              <Button size="sm">Reserve Plot</Button>
            </Link>
          )}
          {plot.status === 'sold' && canEdit && (
            <form action={`/plots/plots/${plotId}/transfer`} method="POST">
              <Button variant="outline" size="sm" type="submit">Mark Transferred</Button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Plot Details</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Price</dt>
              <dd className="font-semibold text-gray-900">KES {Number(plot.price).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Size</dt>
              <dd className="text-gray-900">{plot.size_desc ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Area</dt>
              <dd className="text-gray-900">{plot.area_sqm ? `${plot.area_sqm} m²` : '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Title Status</dt>
              <dd className="text-gray-900">{plot.title_status ?? '—'}</dd>
            </div>
            {plot.gps_lat && plot.gps_lng && (
              <div className="flex justify-between">
                <dt className="text-gray-500">GPS</dt>
                <dd className="text-gray-900 font-mono text-xs">{plot.gps_lat}, {plot.gps_lng}</dd>
              </div>
            )}
          </dl>
          {plot.notes && (
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700">{plot.notes}</p>
            </div>
          )}
        </div>

        {/* Active reservation summary */}
        {activeReservation && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Current Reservation</h2>
              <Link href={`/plots/reservations/${activeReservation.id}`} className="text-xs text-blue-600 hover:underline">
                View ledger →
              </Link>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Buyer</dt>
                <dd className="font-medium text-gray-900">{activeReservation.plot_buyers?.full_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Phone</dt>
                <dd className="text-gray-900">{activeReservation.plot_buyers?.phone}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Sale Price</dt>
                <dd className="font-semibold">KES {Number(activeReservation.sale_price).toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Payment Plan</dt>
                <dd className="text-gray-900 capitalize">
                  {activeReservation.payment_plan === 'installment'
                    ? `${activeReservation.installment_count} installments (${activeReservation.installment_frequency})`
                    : 'Lump sum'}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      {/* Photos */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Photos</h2>
        <PhotoUploader
          plotId={plotId}
          projectId={plot.plot_projects?.id ?? ''}
          photos={photos ?? []}
          canUpload={canEdit}
        />
      </div>
    </div>
  )
}

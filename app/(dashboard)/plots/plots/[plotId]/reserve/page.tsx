import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ReserveForm } from '@/components/plots/ReserveForm'
import { createReservationAction } from '@/app/(dashboard)/plots/actions'
import type { Plot, PlotProject } from '@/types/database'

export default async function ReservePlotPage({ params }: { params: Promise<{ plotId: string }> }) {
  const { plotId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data: plot } = await db
    .from('plots')
    .select('*, plot_projects(*)')
    .eq('id', plotId)
    .single() as unknown as { data: (Plot & { plot_projects: PlotProject }) | null }

  if (!plot) notFound()
  if (plot.status !== 'available') redirect(`/plots/plots/${plotId}`)

  const action = createReservationAction.bind(null, plotId)

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reserve Plot #{plot.plot_no}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {plot.plot_projects?.name} — Asking price: KES {Number(plot.price).toLocaleString()}
        </p>
      </div>
      <ReserveForm action={action} plotPrice={plot.price} plotNo={plot.plot_no} />
    </div>
  )
}

import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { PlotForm } from '@/components/plots/PlotForm'
import { PhotoUploader } from '@/components/plots/PhotoUploader'
import { updatePlotAction } from '@/app/(dashboard)/plots/actions'
import type { Plot, PlotProject, PlotPhoto } from '@/types/database'

export default async function EditPlotPage({ params }: { params: Promise<{ plotId: string }> }) {
  const { plotId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'manager') redirect(`/plots/plots/${plotId}`)

  const [{ data: plot }, { data: photos }] = await Promise.all([
    db.from('plots').select('*, plot_projects(*)').eq('id', plotId).single() as unknown as Promise<{ data: (Plot & { plot_projects: PlotProject }) | null }>,
    db.from('plot_photos').select('*').eq('plot_id', plotId).order('created_at') as unknown as Promise<{ data: PlotPhoto[] | null }>,
  ])

  if (!plot) notFound()

  const action = updatePlotAction.bind(null, plotId, plot.project_id)

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Plot #{plot.plot_no}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{plot.plot_projects?.name}</p>
      </div>
      <PlotForm action={action} plot={plot} redirectTo={`/plots/plots/${plotId}`} />

      <div className="mt-8 border-t border-gray-200 pt-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Photos</h2>
        <PhotoUploader
          plotId={plotId}
          projectId={plot.project_id}
          photos={photos ?? []}
          canUpload
        />
      </div>
    </div>
  )
}

import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PlotStatusBadge } from '@/components/plots/PlotStatusBadge'
import { Plus, Pencil, MapPin, ArrowLeft } from 'lucide-react'
import type { PlotProject, Plot } from '@/types/database'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createServiceClient()

  const { data: project } = await db
    .from('plot_projects')
    .select('*')
    .eq('id', id)
    .single() as { data: PlotProject | null }

  if (!project) notFound()

  const { data: plots } = await db
    .from('plots')
    .select('*')
    .eq('project_id', id)
    .order('plot_no') as { data: Plot[] | null }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user!.id).single()
  const canEdit = profile?.role === 'admin' || profile?.role === 'manager'

  const allPlots = plots ?? []
  const counts = {
    total: allPlots.length,
    available: allPlots.filter((p) => p.status === 'available').length,
    reserved: allPlots.filter((p) => p.status === 'reserved').length,
    sold: allPlots.filter((p) => p.status === 'sold').length,
    transferred: allPlots.filter((p) => p.status === 'transferred').length,
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Back + header */}
      <div className="flex items-start gap-4 mb-6">
        <Link href="/plots/projects" className="mt-1 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              project.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {project.status === 'active' ? 'Active' : 'Completed'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
            <MapPin className="w-3.5 h-3.5" />
            {project.location}, {project.county}
          </div>
          {project.description && (
            <p className="text-sm text-gray-600 mt-1">{project.description}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2 shrink-0">
            <Link href={`/plots/projects/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="w-4 h-4" />
                Edit
              </Button>
            </Link>
            <Link href={`/plots/projects/${id}/plots/new`}>
              <Button size="sm">
                <Plus className="w-4 h-4" />
                Add Plot
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Available', count: counts.available, color: 'text-green-700 bg-green-50 border-green-200' },
          { label: 'Reserved', count: counts.reserved, color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
          { label: 'Sold', count: counts.sold, color: 'text-red-700 bg-red-50 border-red-200' },
          { label: 'Transferred', count: counts.transferred, color: 'text-blue-700 bg-blue-50 border-blue-200' },
        ].map(({ label, count, color }) => (
          <div key={label} className={`rounded-lg border p-3 text-center ${color}`}>
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-xs font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Plots grid */}
      {allPlots.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium">No plots added yet</p>
          {canEdit && (
            <Link href={`/plots/projects/${id}/plots/new`} className="mt-3 inline-block">
              <Button size="sm">
                <Plus className="w-4 h-4" />
                Add First Plot
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {allPlots.map((plot) => (
            <Link
              key={plot.id}
              href={`/plots/plots/${plot.id}`}
              className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all text-center"
            >
              <p className="font-bold text-gray-900 text-lg">#{plot.plot_no}</p>
              {plot.size_desc && <p className="text-xs text-gray-500 mt-0.5">{plot.size_desc}</p>}
              <p className="text-sm font-semibold text-gray-700 mt-2">
                KES {Number(plot.price).toLocaleString()}
              </p>
              <div className="mt-2 flex justify-center">
                <PlotStatusBadge status={plot.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

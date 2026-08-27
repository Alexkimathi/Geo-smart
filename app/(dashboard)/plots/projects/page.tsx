import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, MapPin, Layers } from 'lucide-react'
import type { PlotProject } from '@/types/database'

export default async function ProjectsPage() {
  const db = createServiceClient()

  const { data: projects } = await db
    .from('plot_projects')
    .select('*, plots(id, status)')
    .order('created_at', { ascending: false }) as unknown as {
      data: (PlotProject & { plots: { id: string; status: string }[] })[] | null
    }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plot Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects?.length ?? 0} projects</p>
        </div>
        <Link href="/plots/projects/new">
          <Button>
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </Link>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No projects yet</p>
          <p className="text-sm mt-1">Create your first plot project to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => {
            const plots = project.plots ?? []
            const counts = {
              total: plots.length,
              available: plots.filter((p) => p.status === 'available').length,
              reserved: plots.filter((p) => p.status === 'reserved').length,
              sold: plots.filter((p) => p.status === 'sold').length,
              transferred: plots.filter((p) => p.status === 'transferred').length,
            }
            return (
              <Link
                key={project.id}
                href={`/plots/projects/${project.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {project.location}, {project.county}
                    </div>
                  </div>
                  <span className={`ml-2 shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    project.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {project.status === 'active' ? 'Active' : 'Completed'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
                  <Layers className="w-3.5 h-3.5" />
                  {counts.total} plots total
                </div>

                {/* Status bar */}
                {counts.total > 0 && (
                  <div className="space-y-2">
                    <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                      {counts.available > 0 && (
                        <div className="bg-green-400" style={{ width: `${(counts.available / counts.total) * 100}%` }} />
                      )}
                      {counts.reserved > 0 && (
                        <div className="bg-yellow-400" style={{ width: `${(counts.reserved / counts.total) * 100}%` }} />
                      )}
                      {counts.sold > 0 && (
                        <div className="bg-red-400" style={{ width: `${(counts.sold / counts.total) * 100}%` }} />
                      )}
                      {counts.transferred > 0 && (
                        <div className="bg-blue-400" style={{ width: `${(counts.transferred / counts.total) * 100}%` }} />
                      )}
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500">
                      {counts.available > 0 && <span className="text-green-700">{counts.available} available</span>}
                      {counts.reserved > 0 && <span className="text-yellow-700">{counts.reserved} reserved</span>}
                      {counts.sold > 0 && <span className="text-red-700">{counts.sold} sold</span>}
                      {counts.transferred > 0 && <span className="text-blue-700">{counts.transferred} transferred</span>}
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import { PlotStatusBadge } from '@/components/plots/PlotStatusBadge'
import { Search } from 'lucide-react'
import type { PlotWithProject } from '@/types/database'

export default async function AllPlotsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; project?: string }>
}) {
  const { q, status, project: projectFilter } = await searchParams
  const db = createServiceClient()

  let query = db
    .from('plots')
    .select('*, plot_projects(id, name, location)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (projectFilter) query = query.eq('project_id', projectFilter)

  const { data: plots } = await query as unknown as { data: PlotWithProject[] | null }

  // Client-side search filter (plot_no, size_desc)
  const filtered = q
    ? (plots ?? []).filter((p) =>
        p.plot_no.toLowerCase().includes(q.toLowerCase()) ||
        (p.plot_projects?.name ?? '').toLowerCase().includes(q.toLowerCase())
      )
    : (plots ?? [])

  const { data: projects } = await db.from('plot_projects').select('id, name').order('name')

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Plots</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} plots</p>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search plot no. or project…"
            className="pl-9 pr-4 h-10 w-64 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          name="status"
          defaultValue={status ?? ''}
          className="h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="reserved">Reserved</option>
          <option value="sold">Sold</option>
          <option value="transferred">Transferred</option>
        </select>
        <select
          name="project"
          defaultValue={projectFilter ?? ''}
          className="h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Projects</option>
          {(projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 px-4 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          Filter
        </button>
        {(q || status || projectFilter) && (
          <Link
            href="/plots/plots"
            className="h-10 px-4 inline-flex items-center rounded-md border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
          >
            Clear
          </Link>
        )}
      </form>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium">No plots found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Plot No.</th>
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-left">Size</th>
                <th className="px-4 py-3 text-right">Price (KES)</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((plot) => (
                <tr key={plot.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/plots/plots/${plot.id}`} className="font-semibold text-blue-600 hover:underline">
                      #{plot.plot_no}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {plot.plot_projects ? (
                      <Link href={`/plots/projects/${plot.plot_projects.id}`} className="hover:underline">
                        {plot.plot_projects.name}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{plot.size_desc ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">{Number(plot.price).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">{plot.title_status ?? '—'}</td>
                  <td className="px-4 py-3">
                    <PlotStatusBadge status={plot.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

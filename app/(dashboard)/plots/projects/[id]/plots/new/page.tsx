import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { PlotForm } from '@/components/plots/PlotForm'
import { createPlotAction } from '@/app/(dashboard)/plots/actions'
import type { PlotProject } from '@/types/database'

export default async function NewPlotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'manager') redirect(`/plots/projects/${id}`)

  const { data: project } = await db
    .from('plot_projects')
    .select('*')
    .eq('id', id)
    .single() as { data: PlotProject | null }

  if (!project) notFound()

  const action = createPlotAction.bind(null, id)

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Plot</h1>
        <p className="text-sm text-gray-500 mt-0.5">{project.name}</p>
      </div>
      <PlotForm action={action} redirectTo={`/plots/projects/${id}`} />
    </div>
  )
}

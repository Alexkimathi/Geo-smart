import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { ProjectForm } from '@/components/plots/ProjectForm'
import { createProjectAction } from '@/app/(dashboard)/plots/actions'

export default async function NewProjectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'manager') redirect('/plots/projects')

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Project</h1>
        <p className="text-sm text-gray-500 mt-0.5">Create a new plot scheme or land project</p>
      </div>
      <ProjectForm action={createProjectAction} />
    </div>
  )
}

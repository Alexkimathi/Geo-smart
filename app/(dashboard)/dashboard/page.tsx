import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { ManagerDashboard } from './ManagerDashboard'
import { SurveyDashboard } from './SurveyDashboard'
import { ConstructionDashboard } from './ConstructionDashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data: profile } = await db
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single() as unknown as { data: { full_name: string; role: string } | null }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const role = profile?.role ?? 'manager'

  if (role === 'surveyor') return <SurveyDashboard name={firstName} />
  if (role === 'site_engineer') return <ConstructionDashboard name={firstName} />
  return <ManagerDashboard name={firstName} />
}

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'

// Block surveyors from accessing any finance route
export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as unknown as { data: { role: string } | null }

  if (profile?.role === 'surveyor') redirect('/dashboard')

  return <>{children}</>
}

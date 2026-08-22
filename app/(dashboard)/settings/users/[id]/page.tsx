import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { EditUserForm } from './EditUserForm'
import type { Profile } from '@/types/database'

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data: myProfile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'admin' && myProfile?.role !== 'manager') redirect('/dashboard')

  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single() as unknown as { data: Profile | null }

  if (!profile) notFound()

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <Link href="/settings/users" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" />Back to Users
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Edit User</h1>
      <p className="text-sm text-gray-500 mb-6 font-mono">{profile.email}</p>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <EditUserForm profile={profile} isSelf={id === user.id} />
      </div>
    </div>
  )
}

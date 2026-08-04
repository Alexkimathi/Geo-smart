import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { NewUserForm } from './NewUserForm'

export default async function NewUserPage() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <Link href="/settings/users" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" />Back to Users
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Add User</h1>
      <p className="text-sm text-gray-500 mb-6">Create a new team member account. They can log in immediately with the password you set.</p>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <NewUserForm />
      </div>
    </div>
  )
}

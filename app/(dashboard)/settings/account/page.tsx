import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { UpdateProfileForm } from './UpdateProfileForm'
import { ChangePasswordForm } from './ChangePasswordForm'
import type { Profile } from '@/types/database'

export default async function AccountPage() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as unknown as { data: Profile | null }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">My Account</h1>
      <p className="text-sm text-gray-500 mb-6">{user.email}</p>

      <div className="space-y-4">
        {/* Editable profile */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Profile</h2>
          {profile ? (
            <UpdateProfileForm profile={profile} email={user.email ?? ''} />
          ) : (
            <p className="text-sm text-gray-400">Profile not found. Contact your administrator.</p>
          )}
        </div>

        {/* Change password */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Change Password</h2>
          <p className="text-sm text-gray-500 mb-4">Choose a new password for your account.</p>
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  )
}

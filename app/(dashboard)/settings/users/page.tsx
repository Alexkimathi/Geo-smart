import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, UserCog } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { DeleteUserButton } from './DeleteUserButton'
import type { Profile } from '@/types/database'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  surveyor: 'Surveyor',
  site_engineer: 'Site Engineer',
  accountant: 'Accountant',
}

const ROLE_COLORS: Record<string, 'blue' | 'purple' | 'green' | 'yellow' | 'gray'> = {
  admin: 'purple',
  manager: 'blue',
  surveyor: 'green',
  site_engineer: 'yellow',
  accountant: 'gray',
}

export default async function UsersPage() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data: myProfile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'admin') redirect('/dashboard')

  const { data: users } = await db
    .from('profiles')
    .select('*')
    .order('full_name') as unknown as { data: Profile[] | null }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users?.length ?? 0} team members</p>
        </div>
        <Link
          href="/settings/users/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />Add User
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users?.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {u.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{u.full_name}</span>
                    {u.id === user.id && (
                      <span className="text-xs text-gray-400">(you)</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={ROLE_COLORS[u.role] ?? 'gray'}>
                    {ROLE_LABELS[u.role] ?? u.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.phone ?? '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(u.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/settings/users/${u.id}`}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2.5 py-1.5 rounded-md border border-blue-200 hover:bg-blue-50 transition-colors"
                    >
                      <UserCog className="w-3.5 h-3.5" />Edit
                    </Link>
                    {u.id !== user.id && (
                      <DeleteUserButton userId={u.id} userName={u.full_name} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

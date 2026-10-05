import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { BankAccountForm } from './BankAccountForm'
import { createBankAccountAction } from '../actions'

export default async function NewBankAccountPage() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data: myProfile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'admin' && myProfile?.role !== 'manager') redirect('/dashboard')

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href="/settings/bank-accounts" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" />Back to Bank Accounts
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Bank Account</h1>
        <p className="text-sm text-gray-500 mt-0.5">This account will be available to select on all finance documents.</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <BankAccountForm action={createBankAccountAction} />
      </div>
    </div>
  )
}

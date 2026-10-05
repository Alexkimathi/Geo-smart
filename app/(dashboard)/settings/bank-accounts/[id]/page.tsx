import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { EditBankAccountForm } from './EditBankAccountForm'
import { updateBankAccountAction } from '../actions'
import type { BankAccount } from '@/types/database'

export default async function EditBankAccountPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data: myProfile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'admin' && myProfile?.role !== 'manager') redirect('/dashboard')

  const { data: bankAccount } = await db
    .from('bank_accounts')
    .select('*')
    .eq('id', id)
    .single() as unknown as { data: BankAccount | null }

  if (!bankAccount) notFound()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href="/settings/bank-accounts" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" />Back to Bank Accounts
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Bank Account</h1>
        <p className="text-sm text-gray-500 mt-0.5">{bankAccount.account_name}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <EditBankAccountForm
          bankAccount={bankAccount}
          action={updateBankAccountAction.bind(null, id)}
        />
      </div>
    </div>
  )
}

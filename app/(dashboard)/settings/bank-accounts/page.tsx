import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DeleteBankAccountButton } from './DeleteBankAccountButton'
import type { BankAccount } from '@/types/database'

export default async function BankAccountsPage() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data: myProfile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'admin' && myProfile?.role !== 'manager') redirect('/dashboard')

  const { data: bankAccounts } = await db
    .from('bank_accounts')
    .select('*')
    .order('sort_order')
    .order('account_name') as unknown as { data: BankAccount[] | null }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Accounts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{bankAccounts?.length ?? 0} account{bankAccounts?.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/settings/bank-accounts/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />Add Bank Account
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Account Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Bank</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Account No</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Currency</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">SWIFT</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Bank / Branch Code</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(bankAccounts ?? []).length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No bank accounts yet. Add one to get started.
                </td>
              </tr>
            ) : (
              (bankAccounts ?? []).map((ba: BankAccount) => (
                <tr key={ba.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{ba.account_name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{ba.bank_name}</div>
                    {ba.branch && <div className="text-xs text-gray-400">{ba.branch}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600">{ba.account_no}</td>
                  <td className="px-4 py-3 text-gray-500">{ba.currency ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{ba.swift_code ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">
                    {ba.bank_code && ba.branch_code ? `${ba.bank_code} / ${ba.branch_code}` : (ba.bank_code ?? ba.branch_code ?? '—')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={ba.is_active ? 'green' : 'gray'}>
                      {ba.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/settings/bank-accounts/${ba.id}`}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2.5 py-1.5 rounded-md border border-blue-200 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />Edit
                      </Link>
                      <DeleteBankAccountButton id={ba.id} name={ba.account_name} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

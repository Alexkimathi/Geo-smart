'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { BankAccount } from '@/types/database'

interface Props {
  action: (prev: { error?: string; success?: boolean }, formData: FormData) => Promise<{ error?: string; success?: boolean }>
  bankAccount?: BankAccount
}

export function BankAccountForm({ action, bankAccount }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})

  useEffect(() => {
    if (state.success) {
      router.push('/settings/bank-accounts')
    }
  }, [state.success, router])

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="account_name">Account Name *</Label>
          <Input
            id="account_name"
            name="account_name"
            required
            placeholder="e.g. Powamax General Electricals"
            defaultValue={bankAccount?.account_name ?? ''}
          />
          <p className="text-xs text-gray-400">Friendly label shown in dropdowns on finance documents.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bank_name">Bank Name *</Label>
          <Input
            id="bank_name"
            name="bank_name"
            required
            placeholder="e.g. I&M BANK (KENYA) Ltd"
            defaultValue={bankAccount?.bank_name ?? ''}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="branch">Branch <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Input
            id="branch"
            name="branch"
            placeholder="e.g. WESTLANDS"
            defaultValue={bankAccount?.branch ?? ''}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="account_no">Account No *</Label>
          <Input
            id="account_no"
            name="account_no"
            required
            placeholder="e.g. 06310133306350"
            defaultValue={bankAccount?.account_no ?? ''}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="currency">Currency <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Input
            id="currency"
            name="currency"
            placeholder="e.g. KSH"
            defaultValue={bankAccount?.currency ?? ''}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="swift_code">SWIFT Code <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Input
            id="swift_code"
            name="swift_code"
            placeholder="e.g. IMBLKENA"
            defaultValue={bankAccount?.swift_code ?? ''}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bank_code">Bank Code <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Input
            id="bank_code"
            name="bank_code"
            placeholder="e.g. 057"
            defaultValue={bankAccount?.bank_code ?? ''}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="branch_code">Branch Code <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Input
            id="branch_code"
            name="branch_code"
            placeholder="e.g. 063"
            defaultValue={bankAccount?.branch_code ?? ''}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sort_order">Sort Order</Label>
          <Input
            id="sort_order"
            name="sort_order"
            type="number"
            min="0"
            placeholder="0"
            defaultValue={bankAccount?.sort_order ?? 0}
          />
          <p className="text-xs text-gray-400">Lower number appears first in the dropdown.</p>
        </div>
      </div>

      {state.error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : bankAccount ? 'Save Changes' : 'Add Bank Account'}
        </Button>
      </div>
    </form>
  )
}

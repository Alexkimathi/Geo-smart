'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { BankAccount } from '@/types/database'

interface Props {
  bankAccount: BankAccount
  action: (prev: { error?: string; success?: boolean }, formData: FormData) => Promise<{ error?: string; success?: boolean }>
}

export function EditBankAccountForm({ bankAccount, action }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="account_name">Account Name *</Label>
          <Input
            id="account_name"
            name="account_name"
            required
            defaultValue={bankAccount.account_name}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bank_name">Bank Name *</Label>
          <Input
            id="bank_name"
            name="bank_name"
            required
            defaultValue={bankAccount.bank_name}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="branch">Branch <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Input
            id="branch"
            name="branch"
            defaultValue={bankAccount.branch ?? ''}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="account_no">Account No *</Label>
          <Input
            id="account_no"
            name="account_no"
            required
            defaultValue={bankAccount.account_no}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="currency">Currency <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Input
            id="currency"
            name="currency"
            defaultValue={bankAccount.currency ?? ''}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="swift_code">SWIFT Code <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Input
            id="swift_code"
            name="swift_code"
            defaultValue={bankAccount.swift_code ?? ''}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bank_code">Bank Code <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Input
            id="bank_code"
            name="bank_code"
            defaultValue={bankAccount.bank_code ?? ''}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="branch_code">Branch Code <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Input
            id="branch_code"
            name="branch_code"
            defaultValue={bankAccount.branch_code ?? ''}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sort_order">Sort Order</Label>
          <Input
            id="sort_order"
            name="sort_order"
            type="number"
            min="0"
            defaultValue={bankAccount.sort_order}
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <input
            id="is_active"
            name="is_active"
            type="checkbox"
            defaultChecked={bankAccount.is_active}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <Label htmlFor="is_active" className="cursor-pointer">Active (shown in document dropdowns)</Label>
        </div>
      </div>

      {state.error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          Bank account updated successfully.
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}

'use client'

import { useState, useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createExpenseAction } from '@/app/(dashboard)/finance/actions'
import type { JobForExpense } from './page'

const CATEGORIES = ['Labour', 'Materials', 'Transport', 'Fuel', 'Equipment', 'Other'] as const

interface Props {
  jobs: JobForExpense[]
}

export function AddExpenseForm({ jobs }: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, pending] = useActionState(createExpenseAction, {})
  const [jobType, setJobType] = useState<'survey' | 'construction' | ''>('')

  const filteredJobs = jobs.filter((j) => j.job_type === jobType)

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
      setJobType('')
      router.refresh()
    }
  }, [state.success, router])

  const today = new Date().toISOString().split('T')[0]

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="exp_category">Category *</Label>
          <select
            id="exp_category"
            name="category"
            required
            className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="exp_description">Description *</Label>
          <Input
            id="exp_description"
            name="description"
            required
            placeholder="Brief description of the expense"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exp_amount">Amount (KES) *</Label>
          <Input
            id="exp_amount"
            name="amount"
            type="number"
            min={0}
            step="0.01"
            required
            placeholder="0.00"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exp_date">Date *</Label>
          <Input
            id="exp_date"
            name="expense_date"
            type="date"
            defaultValue={today}
            required
          />
        </div>

        {/* Job Type selector */}
        <div className="space-y-1.5">
          <Label htmlFor="exp_job_type">Job Type</Label>
          <select
            id="exp_job_type"
            name="job_type"
            value={jobType}
            onChange={(e) => setJobType(e.target.value as typeof jobType)}
            className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— No job link —</option>
            <option value="survey">Survey Job</option>
            <option value="construction">Construction Job</option>
          </select>
        </div>

        {/* Specific job picker — shown when a type is selected */}
        {jobType && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="exp_job_id">
              {jobType === 'survey' ? 'Survey Job' : 'Construction Job'}
            </Label>
            <select
              id="exp_job_id"
              name="job_id"
              required
              className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Select a job —</option>
              {filteredJobs.map((j) => (
                <option key={j.id} value={j.id}>{j.label}</option>
              ))}
              {filteredJobs.length === 0 && (
                <option disabled>No active {jobType} jobs found</option>
              )}
            </select>
          </div>
        )}
      </div>

      {state.error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
          Expense added.
        </div>
      )}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Adding...' : 'Add Expense'}
      </Button>
    </form>
  )
}

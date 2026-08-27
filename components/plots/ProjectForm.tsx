'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { KENYA_COUNTIES } from '@/lib/kenya-counties'
import type { PlotFormState } from '@/app/(dashboard)/plots/actions'
import type { PlotProject } from '@/types/database'

interface Props {
  action: (prev: PlotFormState, formData: FormData) => Promise<PlotFormState>
  project?: PlotProject
  redirectTo?: string
}

export function ProjectForm({ action, project, redirectTo = '/plots/projects' }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})

  useEffect(() => {
    if (state.success) router.push(redirectTo)
  }, [state.success, redirectTo, router])

  return (
    <form action={formAction} className="space-y-5 max-w-lg">
      {state.error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Project Name <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          defaultValue={project?.name}
          required
          className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. Nanyuki Municipality Block 7/178"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location <span className="text-red-500">*</span>
        </label>
        <input
          name="location"
          defaultValue={project?.location}
          required
          className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. Nanyuki Town"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          County <span className="text-red-500">*</span>
        </label>
        <select
          name="county"
          defaultValue={project?.county ?? ''}
          required
          className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select county…</option>
          {KENYA_COUNTIES.map((c) => (
            <option key={c.code} value={c.name}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          name="description"
          defaultValue={project?.description ?? ''}
          rows={3}
          className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Optional notes about this project"
        />
      </div>

      {project && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            name="status"
            defaultValue={project.status}
            className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : project ? 'Save Changes' : 'Create Project'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Briefcase } from 'lucide-react'

export interface JobOption {
  id: string
  job_no: string
  label: string
  job_type: 'survey' | 'construction'
  client_id: string | null
}

interface Props {
  clients: { id: string; name: string; company: string | null }[]
  jobs: JobOption[]
  /** Pre-selected values (e.g. when converting a quotation) */
  initialClientId?: string | null
  initialJobId?: string | null
  initialJobType?: 'survey' | 'construction' | null
}

export function JobSelector({ clients, jobs, initialClientId, initialJobId, initialJobType }: Props) {
  const [clientId, setClientId] = useState(initialClientId ?? '')
  const [selectedJob, setSelectedJob] = useState<{ id: string; type: string } | null>(
    initialJobId && initialJobType ? { id: initialJobId, type: initialJobType } : null
  )

  const clientJobs = clientId ? jobs.filter((j) => j.client_id === clientId) : []

  function handleClientChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setClientId(e.target.value)
    setSelectedJob(null)
  }

  function handleJobChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    if (!val) {
      setSelectedJob(null)
      return
    }
    const job = jobs.find((j) => j.id === val)
    if (job) setSelectedJob({ id: job.id, type: job.job_type })
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Hidden form fields consumed by the server action */}
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="job_id" value={selectedJob?.id ?? ''} />
      <input type="hidden" name="job_type" value={selectedJob?.type ?? ''} />

      {/* Client */}
      <div className="space-y-1.5">
        <Label htmlFor="sel_client_id">Client</Label>
        <select
          id="sel_client_id"
          value={clientId}
          onChange={handleClientChange}
          className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— Select client —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.company ? ` (${c.company})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Job — shown once a client is selected */}
      <div className="space-y-1.5">
        <Label htmlFor="sel_job_id">
          Linked Job <span className="text-gray-400 font-normal">(optional)</span>
        </Label>
        {clientId ? (
          clientJobs.length > 0 ? (
            <select
              id="sel_job_id"
              value={selectedJob?.id ?? ''}
              onChange={handleJobChange}
              className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— No job link —</option>
              {clientJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.job_no} — {j.label}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex h-9 items-center gap-2 rounded-md border border-dashed border-gray-200 px-3 text-sm text-gray-400">
              <Briefcase className="w-4 h-4" />
              No jobs found for this client
            </div>
          )
        ) : (
          <div className="flex h-9 items-center rounded-md border border-dashed border-gray-200 px-3 text-sm text-gray-400">
            Select a client first
          </div>
        )}
      </div>
    </div>
  )
}

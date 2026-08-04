import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ConstructionJobForm } from '@/components/jobs/ConstructionJobForm'
import { updateConstructionJobAction } from '@/app/(dashboard)/jobs/construction/actions'
import type { ConstructionJob, Client } from '@/types/database'

export default async function EditConstructionJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createServiceClient()

  const [{ data: job }, { data: clients }] = await Promise.all([
    db
      .from('construction_jobs')
      .select('*')
      .eq('id', id)
      .single() as unknown as Promise<{ data: ConstructionJob | null }>,
    db
      .from('clients')
      .select('id, name, company')
      .order('name') as unknown as Promise<{ data: Pick<Client, 'id' | 'name' | 'company'>[] | null }>,
  ])

  if (!job) notFound()

  const action = updateConstructionJobAction.bind(null, id)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link
        href={`/jobs/construction/${id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ChevronLeft className="w-4 h-4" />Back to Job
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Construction Job</h1>
        <p className="text-sm text-gray-500 mt-0.5 font-mono">{job.job_no}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <ConstructionJobForm
          clients={(clients ?? []) as Client[]}
          job={job}
          action={action}
        />
      </div>
    </div>
  )
}

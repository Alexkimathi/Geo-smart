import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { LpoForm } from '../../LpoForm'
import { updateLpoAction } from '@/app/(dashboard)/finance/actions'
import type { Lpo, SurveyJob, ConstructionJob } from '@/types/database'
import type { JobOption } from '@/components/finance/JobSelector'

export default async function EditLpoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createServiceClient()

  const [{ data: lpo }, { data: surveyJobs }, { data: constructionJobs }] = await Promise.all([
    db.from('lpos').select('*').eq('id', id).single() as unknown as Promise<{ data: Lpo | null }>,
    db.from('survey_jobs').select('id, job_no, site_name, survey_type, client_id').eq('is_archived', false).order('created_at', { ascending: false }) as unknown as Promise<{ data: Pick<SurveyJob, 'id' | 'job_no' | 'site_name' | 'survey_type' | 'client_id'>[] | null }>,
    db.from('construction_jobs').select('id, job_no, project_name, project_type, client_id').eq('is_archived', false).order('created_at', { ascending: false }) as unknown as Promise<{ data: Pick<ConstructionJob, 'id' | 'job_no' | 'project_name' | 'project_type' | 'client_id'>[] | null }>,
  ])

  if (!lpo) notFound()

  const jobs: JobOption[] = [
    ...(surveyJobs ?? []).map((j) => ({ id: j.id, job_no: j.job_no, label: `${j.site_name} [${j.survey_type}]`, job_type: 'survey' as const, client_id: j.client_id })),
    ...(constructionJobs ?? []).map((j) => ({ id: j.id, job_no: j.job_no, label: `${j.project_name} [${j.project_type}]`, job_type: 'construction' as const, client_id: j.client_id })),
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href={`/finance/lpos/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" />Back to {lpo.lpo_no}
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit LPO</h1>
        <p className="text-sm text-gray-500 font-mono mt-0.5">{lpo.lpo_no}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <LpoForm jobs={jobs} prefill={lpo} action={updateLpoAction.bind(null, id)} successRedirect={`/finance/lpos/${id}`} submitLabel="Save Changes" />
      </div>
    </div>
  )
}

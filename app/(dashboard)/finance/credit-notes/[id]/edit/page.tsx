import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { CreditNoteForm } from '../../new/CreditNoteForm'
import { updateCreditNoteAction } from '@/app/(dashboard)/finance/actions'
import type { Client, SurveyJob, ConstructionJob, FinanceDocument } from '@/types/database'
import type { JobOption } from '@/components/finance/JobSelector'

export default async function EditCreditNotePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = createServiceClient()

  const [{ data: doc }, { data: clients }, { data: surveyJobs }, { data: constructionJobs }] =
    await Promise.all([
      db
        .from('finance_documents')
        .select('*')
        .eq('id', id)
        .eq('type', 'Credit Note')
        .single() as unknown as Promise<{ data: FinanceDocument | null }>,
      db.from('clients').select('id, name, company').order('name') as unknown as Promise<{
        data: Pick<Client, 'id' | 'name' | 'company'>[] | null
      }>,
      db
        .from('survey_jobs')
        .select('id, job_no, site_name, survey_type, client_id')
        .eq('is_archived', false)
        .order('created_at', { ascending: false }) as unknown as Promise<{
        data: Pick<SurveyJob, 'id' | 'job_no' | 'site_name' | 'survey_type' | 'client_id'>[] | null
      }>,
      db
        .from('construction_jobs')
        .select('id, job_no, project_name, project_type, client_id')
        .eq('is_archived', false)
        .order('created_at', { ascending: false }) as unknown as Promise<{
        data: Pick<ConstructionJob, 'id' | 'job_no' | 'project_name' | 'project_type' | 'client_id'>[] | null
      }>,
    ])

  if (!doc) notFound()

  const jobs: JobOption[] = [
    ...(surveyJobs ?? []).map((j) => ({
      id: j.id,
      job_no: j.job_no,
      label: `${j.site_name} [${j.survey_type}]`,
      job_type: 'survey' as const,
      client_id: j.client_id,
    })),
    ...(constructionJobs ?? []).map((j) => ({
      id: j.id,
      job_no: j.job_no,
      label: `${j.project_name} [${j.project_type}]`,
      job_type: 'construction' as const,
      client_id: j.client_id,
    })),
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link
        href={`/finance/credit-notes/${id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ChevronLeft className="w-4 h-4" />Back to {doc.doc_no}
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Credit Note</h1>
        <p className="text-sm text-gray-500 font-mono mt-0.5">{doc.doc_no}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <CreditNoteForm
          clients={clients ?? []}
          jobs={jobs}
          prefill={doc}
          action={updateCreditNoteAction.bind(null, id)}
          successRedirect={`/finance/credit-notes/${id}`}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  )
}

import { createServiceClient } from '@/lib/supabase/service'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { InvoiceForm } from './InvoiceForm'
import { createDocumentAction } from '@/app/(dashboard)/finance/actions'
import type { Client, SurveyJob, ConstructionJob, FinanceDocument } from '@/types/database'
import type { JobOption } from '@/components/finance/JobSelector'

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams
  const db = createServiceClient()

  const [{ data: clients }, { data: surveyJobs }, { data: constructionJobs }, quotationResult] =
    await Promise.all([
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
      from
        ? (db
            .from('finance_documents')
            .select('*')
            .eq('id', from)
            .eq('type', 'Quotation')
            .single() as unknown as Promise<{ data: FinanceDocument | null }>)
        : Promise.resolve({ data: null }),
    ])

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

  const prefill = quotationResult.data

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/finance/invoices" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" />Back to Invoices
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
        {prefill && (
          <p className="text-sm text-blue-600 mt-0.5">Pre-filled from quotation {prefill.doc_no}</p>
        )}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <InvoiceForm
          clients={clients ?? []}
          jobs={jobs}
          prefill={prefill}
          action={createDocumentAction.bind(null, 'Invoice')}
        />
      </div>
    </div>
  )
}

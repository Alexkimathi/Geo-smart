import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { SurveyJobForm } from '@/components/jobs/SurveyJobForm'
import { createSurveyJobAction } from '../actions'
import type { Client } from '@/types/database'

export default async function NewSurveyJobPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const { client: clientId } = await searchParams
  const supabase = createServiceClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('name') as unknown as { data: Client[] }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/jobs/survey" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" />
        Back to Survey Jobs
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Survey Job</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <SurveyJobForm
          clients={clients ?? []}
          defaultClientId={clientId}
          action={createSurveyJobAction}
        />
      </div>
    </div>
  )
}

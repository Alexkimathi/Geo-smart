import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { EtimsForm } from '@/components/finance/EtimsForm'
import { updateEtimsDocumentAction } from '../../actions'
import type { EtimsDocument, Client } from '@/types/database'

export default async function EditEtimsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = createServiceClient()

  const [{ data: doc }, { data: clients }] = await Promise.all([
    db
      .from('etims_documents')
      .select('*')
      .eq('id', id)
      .single() as unknown as Promise<{ data: EtimsDocument | null }>,
    db
      .from('clients')
      .select('id, name, company, pin')
      .order('name') as unknown as Promise<{ data: Pick<Client, 'id' | 'name' | 'company' | 'pin'>[] | null }>,
  ])

  if (!doc) notFound()

  const boundAction = updateEtimsDocumentAction.bind(null, id)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <Link href={`/finance/etims/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" />Back to document
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit eTIMS Document</h1>
        <p className="text-sm text-gray-500 mt-0.5 font-mono">{doc.invoice_no}</p>
      </div>

      <EtimsForm
        clients={clients ?? []}
        action={boundAction}
        prefill={doc}
        submitLabel="Save Changes"
      />
    </div>
  )
}

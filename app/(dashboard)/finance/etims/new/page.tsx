import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { EtimsForm } from '@/components/finance/EtimsForm'
import { createEtimsDocumentAction } from '../actions'
import type { Client, LineItem } from '@/types/database'

type InvoiceOption = {
  id: string
  doc_no: string
  client_id: string | null
  line_items: LineItem[]
  clients: Pick<Client, 'id' | 'name' | 'pin'> | null
}

export default async function NewEtimsPage() {
  const db = createServiceClient()

  const [{ data: clients }, { data: invoices }] = await Promise.all([
    db.from('clients').select('id, name, company, pin').order('name') as unknown as
      Promise<{ data: Pick<Client, 'id' | 'name' | 'company' | 'pin'>[] | null }>,
    db.from('finance_documents')
      .select('id, doc_no, client_id, line_items, clients(id, name, pin)')
      .eq('type', 'Invoice')
      .order('created_at', { ascending: false })
      .limit(100) as unknown as Promise<{ data: InvoiceOption[] | null }>,
  ])

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <Link href="/finance/etims" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" />Back to eTIMS
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New eTIMS Document</h1>
        <p className="text-sm text-gray-500 mt-0.5">Create a KRA eTIMS compliant tax invoice</p>
      </div>

      <EtimsForm
        clients={clients ?? []}
        invoices={invoices ?? []}
        action={createEtimsDocumentAction}
        submitLabel="Create eTIMS Document"
      />
    </div>
  )
}

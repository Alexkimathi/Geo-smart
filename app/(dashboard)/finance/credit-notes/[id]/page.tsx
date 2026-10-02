import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Printer, Mail, Phone, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatCurrency } from '@/lib/utils'
import { StatusActionButton } from '../../StatusActionButton'
import { DeleteDocumentButton } from '@/components/finance/DeleteDocumentButton'
import type { FinanceDocumentWithClient } from '@/types/database'

const STATUS_COLORS: Record<string, 'gray' | 'blue' | 'yellow' | 'green' | 'red'> = {
  Draft: 'gray',
  Sent: 'blue',
  Paid: 'green',
  Overdue: 'red',
}

export default async function CreditNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = createServiceClient()
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()

  const [{ data: doc }, { data: profile }] = await Promise.all([
    db
      .from('finance_documents')
      .select('*, clients(id, name, company, phone, email)')
      .eq('id', id)
      .eq('type', 'Credit Note')
      .single() as unknown as Promise<{ data: FinanceDocumentWithClient | null }>,
    user
      ? db.from('profiles').select('role').eq('id', user.id).single() as unknown as Promise<{ data: { role: string } | null }>
      : Promise.resolve({ data: null }),
  ])

  if (!doc) notFound()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager'

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <Link href="/finance/credit-notes" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" />Back to Credit Notes
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold font-mono text-gray-900">{doc.doc_no}</h1>
            <Badge variant={STATUS_COLORS[doc.status] ?? 'gray'} className="text-sm px-3 py-1">
              {doc.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-500">Credit Note Date: {formatDate(doc.created_at)}</p>
          {doc.due_date && (
            <p className="text-sm text-gray-500">Date: {formatDate(doc.due_date)}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link href={`/finance/credit-notes/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="w-4 h-4" />Edit
            </Button>
          </Link>
          {doc.status === 'Draft' && (
            <StatusActionButton docId={id} status="Sent" label="Mark as Sent" variant="outline" />
          )}
          <Link href={`/finance/credit-notes/${id}/print`} target="_blank">
            <Button variant="outline" size="sm">
              <Printer className="w-4 h-4" />Print Credit Note
            </Button>
          </Link>
          {isAdmin && (
            <DeleteDocumentButton docId={id} docNo={doc.doc_no} redirectTo="/finance/credit-notes" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-4">
          {/* Line Items */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Line Items</h2>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Description</th>
                  <th className="text-center pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide w-16">Qty</th>
                  <th className="text-center pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide w-16">Unit</th>
                  <th className="text-right pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide w-28">Unit Price</th>
                  <th className="text-right pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {doc.line_items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2.5 text-gray-800">{item.description}</td>
                    <td className="py-2.5 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-2.5 text-center text-gray-500">{item.unit || '—'}</td>
                    <td className="py-2.5 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                    <td className={`py-2.5 text-right font-medium ${item.amount < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5 max-w-xs ml-auto">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span><span>{formatCurrency(doc.amount)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{doc.tax <= 100 ? `VAT (${doc.tax}%)` : 'VAT'}</span>
                <span>{formatCurrency(doc.total - doc.amount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-gray-100">
                <span className="text-gray-900">Total</span>
                <span className={doc.total < 0 ? 'text-red-600' : 'text-gray-900'}>{formatCurrency(doc.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {doc.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-2">Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{doc.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Client */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Client</h2>
            {doc.clients ? (
              <div className="space-y-1.5">
                <Link href={`/clients/${doc.clients.id}`} className="font-medium text-blue-600 hover:underline block">
                  {doc.clients.name}
                </Link>
                {doc.clients.company && <p className="text-sm text-gray-500">{doc.clients.company}</p>}
                {doc.clients.phone && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />{doc.clients.phone}
                  </div>
                )}
                {doc.clients.email && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />{doc.clients.email}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No client linked</p>
            )}
          </div>

          {/* Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Details</h2>
            <dl className="space-y-2.5">
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Credit Note No.</dt>
                <dd className="text-sm font-mono font-medium text-gray-900 mt-0.5">{doc.doc_no}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Status</dt>
                <dd className="mt-0.5">
                  <Badge variant={STATUS_COLORS[doc.status] ?? 'gray'}>{doc.status}</Badge>
                </dd>
              </div>
              {doc.job_type && (
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide">Linked Job</dt>
                  <dd className="text-sm text-gray-900 mt-0.5 capitalize">{doc.job_type}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import { PrintButton } from '@/components/finance/PrintButton'
import type { FinanceDocumentWithClient, Payment } from '@/types/database'

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = createServiceClient()

  const [{ data: doc }, { data: payments }] = await Promise.all([
    db
      .from('finance_documents')
      .select('*, clients(id, name, company, phone, email)')
      .eq('id', id)
      .eq('type', 'Invoice')
      .single() as unknown as Promise<{ data: FinanceDocumentWithClient | null }>,
    db
      .from('payments')
      .select('*')
      .eq('invoice_id', id)
      .order('payment_date') as unknown as Promise<{ data: Payment[] | null }>,
  ])

  if (!doc) notFound()

  const totalPaid = (payments ?? []).reduce((sum, p) => sum + p.amount, 0)
  const balanceDue = doc.total - totalPaid

  return (
    <div className="min-h-screen bg-white">
      {/* Print button — hidden when printing */}
      <div className="no-print flex justify-end p-4 border-b border-gray-200">
        <PrintButton />
      </div>

      {/* Document */}
      <div className="max-w-3xl mx-auto p-10">
        {/* Company Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Geo-Smart Surveys Ltd</h1>
            <p className="text-sm text-gray-500 mt-1">Professional Surveying &amp; Construction Services</p>
            <p className="text-sm text-gray-500">Nairobi, Kenya</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold font-mono text-blue-700">{doc.doc_no}</p>
            <p className="text-sm text-gray-500 mt-1">INVOICE</p>
            <p className="text-sm text-gray-500">Date: {formatDate(doc.created_at)}</p>
            {doc.due_date && (
              <p className="text-sm text-gray-500">Due: {formatDate(doc.due_date)}</p>
            )}
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Bill To</p>
          {doc.clients ? (
            <div>
              <p className="font-semibold text-gray-900">{doc.clients.name}</p>
              {doc.clients.company && <p className="text-sm text-gray-600">{doc.clients.company}</p>}
              {doc.clients.phone && <p className="text-sm text-gray-600">{doc.clients.phone}</p>}
              {doc.clients.email && <p className="text-sm text-gray-600">{doc.clients.email}</p>}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No client specified</p>
          )}
        </div>

        {/* Line Items */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-gray-900">
              <th className="text-left pb-2 font-semibold text-gray-900">Description</th>
              <th className="text-center pb-2 font-semibold text-gray-900 w-16">Qty</th>
              <th className="text-center pb-2 font-semibold text-gray-900 w-16">Unit</th>
              <th className="text-right pb-2 font-semibold text-gray-900 w-28">Unit Price</th>
              <th className="text-right pb-2 font-semibold text-gray-900 w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.line_items.map((item, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2.5 text-gray-800">{item.description}</td>
                <td className="py-2.5 text-center text-gray-600">{item.quantity}</td>
                <td className="py-2.5 text-center text-gray-500">{item.unit || '—'}</td>
                <td className="py-2.5 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                <td className="py-2.5 text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-64 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span>{formatCurrency(doc.amount)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax ({doc.tax}%)</span>
              <span>{formatCurrency(doc.total - doc.amount)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t-2 border-gray-900">
              <span>TOTAL</span><span>{formatCurrency(doc.total)}</span>
            </div>
            {totalPaid > 0 && (
              <>
                <div className="flex justify-between text-sm text-emerald-700">
                  <span>Amount Paid</span><span>({formatCurrency(totalPaid)})</span>
                </div>
                {balanceDue > 0 && (
                  <div className="flex justify-between text-sm font-bold text-red-700">
                    <span>BALANCE DUE</span><span>{formatCurrency(balanceDue)}</span>
                  </div>
                )}
                {balanceDue < 0 && (
                  <div className="flex justify-between text-sm font-bold text-blue-700">
                    <span>CREDIT / OVERPAYMENT</span><span>{formatCurrency(Math.abs(balanceDue))}</span>
                  </div>
                )}
                {balanceDue === 0 && (
                  <div className="flex justify-between text-sm font-bold text-emerald-700">
                    <span>BALANCE DUE</span><span>SETTLED</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Payment History */}
        {payments && payments.length > 0 && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Payment History</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left pb-1.5 text-xs text-gray-500">Date</th>
                  <th className="text-left pb-1.5 text-xs text-gray-500">Method</th>
                  <th className="text-left pb-1.5 text-xs text-gray-500">Reference</th>
                  <th className="text-right pb-1.5 text-xs text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-600">{formatDate(p.payment_date)}</td>
                    <td className="py-1.5 text-gray-600">{p.method}</td>
                    <td className="py-1.5 text-gray-500 font-mono text-xs">{p.reference || '—'}</td>
                    <td className="py-1.5 text-right text-emerald-700 font-medium">{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Notes / Payment Terms */}
        {doc.notes && (
          <div className="mb-8 p-4 border border-gray-200 rounded-lg">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Payment Terms &amp; Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{doc.notes}</p>
          </div>
        )}

        {/* Bank Details placeholder */}
        <div className="mb-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Bank Details</p>
          <p className="text-sm text-gray-700">Bank: Equity Bank Kenya</p>
          <p className="text-sm text-gray-700">Account Name: Geo-Smart Surveys Ltd</p>
          <p className="text-sm text-gray-700">Account No: XXXX XXXX XXXX</p>
        </div>

        {/* Signature */}
        <div className="mt-12 grid grid-cols-2 gap-8">
          <div>
            <div className="border-t-2 border-gray-300 pt-2">
              <p className="text-xs text-gray-400">Authorised Signature &amp; Date</p>
            </div>
          </div>
          <div>
            <div className="border-t-2 border-gray-300 pt-2">
              <p className="text-xs text-gray-400">Received By &amp; Date</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-12">
          Thank you for your business — Geo-Smart Surveys Ltd
        </p>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
      `}</style>
    </div>
  )
}

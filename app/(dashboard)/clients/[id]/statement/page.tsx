import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import { PrintButton } from '@/components/finance/PrintButton'
import type { Client, FinanceDocumentWithClient, Payment } from '@/types/database'

export default async function ClientStatementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = createServiceClient()

  const [{ data: client }, { data: invoices }, { data: payments }] = await Promise.all([
    db
      .from('clients')
      .select('*')
      .eq('id', id)
      .single() as unknown as Promise<{ data: Client | null }>,
    db
      .from('finance_documents')
      .select('*, clients(id, name, company, phone, email)')
      .eq('type', 'Invoice')
      .eq('client_id', id)
      .order('created_at', { ascending: true }) as unknown as Promise<{ data: FinanceDocumentWithClient[] | null }>,
    db
      .from('payments')
      .select('*')
      .order('payment_date', { ascending: true }) as unknown as Promise<{ data: Payment[] | null }>,
  ])

  if (!client) notFound()

  const paidByInvoice = new Map<string, Payment[]>()
  for (const p of payments ?? []) {
    const existing = paidByInvoice.get(p.invoice_id) ?? []
    paidByInvoice.set(p.invoice_id, [...existing, p])
  }

  const statementRows = (invoices ?? []).map((inv) => {
    const invPayments = paidByInvoice.get(inv.id) ?? []
    const totalPaid = invPayments.reduce((s, p) => s + p.amount, 0)
    const balance = inv.total - totalPaid
    const today = new Date().toISOString().split('T')[0]
    const daysOverdue = inv.due_date && inv.due_date < today && balance > 0
      ? Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86_400_000)
      : 0
    return { inv, invPayments, totalPaid, balance, daysOverdue }
  })

  const totalInvoiced = statementRows.reduce((s, r) => s + r.inv.total, 0)
  const totalPaidAll = statementRows.reduce((s, r) => s + r.totalPaid, 0)
  const totalOutstanding = statementRows.reduce((s, r) => s + Math.max(r.balance, 0), 0)
  const printDate = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-white">
      {/* Print button */}
      <div className="no-print flex justify-end p-4 border-b border-gray-200 gap-3">
        <a
          href={`/clients/${id}`}
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
        >
          Back to Client
        </a>
        <PrintButton />
      </div>

      <div className="max-w-3xl mx-auto p-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Geo-Smart Surveys Ltd</h1>
            <p className="text-sm text-gray-500 mt-1">Professional Surveying &amp; Construction Services</p>
            <p className="text-sm text-gray-500">Nairobi, Kenya</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-800">Statement of Account</p>
            <p className="text-sm text-gray-500 mt-1">As at {printDate}</p>
          </div>
        </div>

        {/* Client info */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Statement For</p>
          <p className="font-semibold text-gray-900 text-lg">{client.name}</p>
          {client.company && <p className="text-sm text-gray-600">{client.company}</p>}
          {client.contact_person && <p className="text-sm text-gray-600">Attn: {client.contact_person}</p>}
          {client.phone && <p className="text-sm text-gray-600">{client.phone}</p>}
          {client.email && <p className="text-sm text-gray-600">{client.email}</p>}
          {client.pin && <p className="text-sm text-gray-600">KRA PIN: {client.pin}</p>}
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-3 bg-violet-50 rounded-lg text-center">
            <p className="text-xs font-medium text-violet-600 mb-1">Total Invoiced</p>
            <p className="font-bold text-violet-900">{formatCurrency(totalInvoiced)}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-center">
            <p className="text-xs font-medium text-emerald-600 mb-1">Total Paid</p>
            <p className="font-bold text-emerald-900">{formatCurrency(totalPaidAll)}</p>
          </div>
          <div className={`p-3 rounded-lg text-center ${totalOutstanding > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
            <p className={`text-xs font-medium mb-1 ${totalOutstanding > 0 ? 'text-red-600' : 'text-gray-600'}`}>Balance Due</p>
            <p className={`font-bold ${totalOutstanding > 0 ? 'text-red-900' : 'text-gray-900'}`}>
              {formatCurrency(totalOutstanding)}
            </p>
          </div>
        </div>

        {/* Invoices */}
        {statementRows.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="font-medium">No invoices found for this client</p>
          </div>
        ) : (
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Invoice History</p>
            {statementRows.map(({ inv, invPayments, totalPaid, balance, daysOverdue }) => (
              <div key={inv.id} className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                {/* Invoice header row */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-blue-700 text-sm">{inv.doc_no}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700'
                      : inv.status === 'Overdue' || daysOverdue > 0 ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                    }`}>{daysOverdue > 0 && inv.status !== 'Paid' ? 'Overdue' : inv.status}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Invoice Date: {formatDate(inv.created_at)}</p>
                    {inv.due_date && <p className="text-xs text-gray-500">Due: {formatDate(inv.due_date)}</p>}
                    {daysOverdue > 0 && <p className="text-xs text-red-600 font-medium">{daysOverdue} days overdue</p>}
                  </div>
                </div>

                {/* Line items */}
                <table className="w-full text-sm">
                  <tbody>
                    {inv.line_items.map((item, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="px-4 py-2 text-gray-700">{item.description}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                    {inv.tax > 0 && (
                      <tr className="border-b border-gray-100">
                        <td className="px-4 py-2 text-gray-500 text-xs">Tax ({inv.tax}%)</td>
                        <td className="px-4 py-2 text-right text-gray-500 text-xs">{formatCurrency(inv.total - inv.amount)}</td>
                      </tr>
                    )}
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 font-semibold text-gray-900">Invoice Total</td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-900">{formatCurrency(inv.total)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Payments */}
                {invPayments.length > 0 && (
                  <div className="px-4 py-2 border-t border-gray-100 bg-emerald-50/50">
                    {invPayments.map((p) => (
                      <div key={p.id} className="flex justify-between text-xs py-0.5">
                        <span className="text-emerald-700">Payment — {p.method} · {formatDate(p.payment_date)}{p.reference ? ` · Ref: ${p.reference}` : ''}</span>
                        <span className="text-emerald-700 font-medium">({formatCurrency(p.amount)})</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Balance */}
                <div className={`px-4 py-2 border-t flex justify-between text-sm font-semibold ${
                  balance <= 0 ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                  : 'border-red-100 bg-red-50 text-red-700'
                }`}>
                  <span>Balance Due</span>
                  <span>{balance <= 0 ? 'SETTLED' : formatCurrency(balance)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Total outstanding */}
        <div className={`p-4 rounded-xl border-2 ${totalOutstanding > 0 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-gray-700">Total Amount Due</p>
              <p className="text-xs text-gray-500 mt-0.5">Please remit payment at your earliest convenience</p>
            </div>
            <p className={`text-2xl font-bold ${totalOutstanding > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              {totalOutstanding <= 0 ? 'FULLY SETTLED' : formatCurrency(totalOutstanding)}
            </p>
          </div>
        </div>

        {/* Bank details */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Bank Details</p>
          <p className="text-sm text-gray-700">Bank: Equity Bank Kenya</p>
          <p className="text-sm text-gray-700">Account Name: Geo-Smart Surveys Ltd</p>
          <p className="text-sm text-gray-700">Account No: XXXX XXXX XXXX</p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-10">
          This statement was generated on {printDate} — Geo-Smart Surveys Ltd
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

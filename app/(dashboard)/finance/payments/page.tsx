import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { Client, FinanceDocument, Payment } from '@/types/database'

type PaymentRow = Payment & {
  finance_documents: (Pick<FinanceDocument, 'id' | 'doc_no'> & {
    clients: Pick<Client, 'id' | 'name'> | null
  }) | null
}

const METHOD_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'gray' | 'purple'> = {
  Cash: 'green',
  'Bank Transfer': 'blue',
  'M-Pesa': 'yellow',
  Cheque: 'gray',
  Other: 'purple',
}

export default async function PaymentsPage() {
  const db = createServiceClient()
  const { data: payments } = await db
    .from('payments')
    .select('*, finance_documents(id, doc_no, clients(id, name))')
    .order('payment_date', { ascending: false }) as unknown as { data: PaymentRow[] | null }

  const total = (payments ?? []).reduce((s, p) => s + p.amount, 0)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {payments?.length ?? 0} payments · Total collected: {formatCurrency(total)}
        </p>
      </div>

      {!payments || payments.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No payments recorded</p>
          <p className="text-sm mt-1">
            Record payments on individual{' '}
            <Link href="/finance/invoices" className="text-blue-600 hover:underline">invoices</Link>
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Invoice</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Method</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Reference</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">{formatDate(payment.payment_date)}</td>
                  <td className="px-4 py-3">
                    {payment.finance_documents ? (
                      <Link
                        href={`/finance/invoices/${payment.finance_documents.id}`}
                        className="font-mono font-medium text-blue-600 hover:underline"
                      >
                        {payment.finance_documents.doc_no}
                      </Link>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {payment.finance_documents?.clients?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={METHOD_COLORS[payment.method] ?? 'gray'}>
                      {payment.method}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {payment.reference ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                    {formatCurrency(payment.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

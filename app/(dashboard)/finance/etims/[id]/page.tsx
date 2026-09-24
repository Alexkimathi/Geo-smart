import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Pencil, Printer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatCurrency } from '@/lib/utils'
import { EtimsDeleteButton } from '@/components/finance/EtimsDeleteButton'
import type { EtimsDocument } from '@/types/database'

const STATUS_COLORS: Record<string, 'gray' | 'blue'> = {
  Draft: 'gray',
  Final: 'blue',
}

function fmt(n: number) {
  return n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function EtimsDetailPage({
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
      .from('etims_documents')
      .select('*')
      .eq('id', id)
      .single() as unknown as Promise<{ data: EtimsDocument | null }>,
    user
      ? db.from('profiles').select('role').eq('id', user.id).single() as unknown as Promise<{ data: { role: string } | null }>
      : Promise.resolve({ data: null }),
  ])

  if (!doc) notFound()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager'

  // Tax summary grouping
  const taxGroups: Record<string, { taxable: number; tax: number; total: number }> = {}
  for (const item of doc.line_items) {
    if (!taxGroups[item.rate]) taxGroups[item.rate] = { taxable: 0, tax: 0, total: 0 }
    taxGroups[item.rate].taxable += item.amt_excl_tax
    taxGroups[item.rate].tax += item.tax_amt
    taxGroups[item.rate].total += item.amt_incl_tax
  }
  const grandTotal = Object.values(taxGroups).reduce(
    (acc, v) => ({ taxable: acc.taxable + v.taxable, tax: acc.tax + v.tax, total: acc.total + v.total }),
    { taxable: 0, tax: 0, total: 0 }
  )

  const invoiceDateDisplay = new Date(doc.invoice_date).toLocaleString('en-KE', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <Link href="/finance/etims" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" />Back to eTIMS
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold font-mono text-gray-900">{doc.invoice_no}</h1>
            <Badge variant={STATUS_COLORS[doc.status] ?? 'gray'} className="text-sm px-3 py-1">
              {doc.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-500">{invoiceDateDisplay}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link href={`/finance/etims/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="w-4 h-4" />Edit
            </Button>
          </Link>
          <Link href={`/finance/etims/${id}/print`} target="_blank">
            <Button variant="outline" size="sm">
              <Printer className="w-4 h-4" />Print
            </Button>
          </Link>
          {isAdmin && (
            <EtimsDeleteButton docId={id} invoiceNo={doc.invoice_no} redirectTo="/finance/etims" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-4">
          {/* Seller / Buyer */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Invoice From</p>
                <p className="font-medium text-gray-900">{doc.seller_name}</p>
                <p className="text-gray-500 font-mono text-xs mt-0.5">PIN: {doc.seller_pin}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Invoice To</p>
                <p className="font-medium text-gray-900">{doc.buyer_name || '—'}</p>
                <p className="text-gray-500 font-mono text-xs mt-0.5">PIN: {doc.buyer_pin || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Invoice Info</p>
                <p className="text-gray-700"><span className="font-medium">No:</span> {doc.invoice_no}</p>
                <p className="text-gray-500 text-xs mt-0.5">{invoiceDateDisplay}</p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Line Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Code</th>
                    <th className="text-left pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Description</th>
                    <th className="text-right pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Qty × Price</th>
                    <th className="text-center pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Rate</th>
                    <th className="text-right pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Excl. Tax</th>
                    <th className="text-right pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Tax</th>
                    <th className="text-right pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Incl. Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {doc.line_items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2.5 text-gray-500 font-mono text-xs">{item.item_code || '—'}</td>
                      <td className="py-2.5 text-gray-800">{item.description}</td>
                      <td className="py-2.5 text-right text-gray-600 text-xs tabular-nums">
                        {item.qty} × {fmt(item.unit_price)}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{item.rate}</span>
                      </td>
                      <td className="py-2.5 text-right text-gray-600 tabular-nums">{fmt(item.amt_excl_tax)}</td>
                      <td className="py-2.5 text-right text-gray-600 tabular-nums">{fmt(item.tax_amt)}</td>
                      <td className="py-2.5 text-right font-medium text-gray-900 tabular-nums">{fmt(item.amt_incl_tax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tax Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Tax Summary</h2>
            <table className="text-sm border border-gray-100 rounded w-full max-w-md">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Tax Rate</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Taxable Amt</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Tax Amt</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Total Amt</th>
                </tr>
              </thead>
              <tbody>
                {(['16%', '0%', 'Ex.', 'NV'] as const).map(rate => {
                  const g = taxGroups[rate]
                  if (!g || g.total === 0) return null
                  return (
                    <tr key={rate} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium">{rate}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(g.taxable)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(g.tax)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(g.total)}</td>
                    </tr>
                  )
                })}
                <tr className="border-t-2 border-gray-300 font-semibold bg-gray-50">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(grandTotal.taxable)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(grandTotal.tax)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(grandTotal.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SCU Information */}
          {(doc.scu_id || doc.cu_invoice_no || doc.internal_data || doc.receipt_signature || doc.qr_code_data) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">SCU Information</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {doc.scu_id && (
                  <div>
                    <dt className="text-xs text-gray-400 uppercase tracking-wide">SCU ID</dt>
                    <dd className="font-medium text-gray-900 mt-0.5 font-mono">{doc.scu_id}</dd>
                  </div>
                )}
                {doc.cu_invoice_no && (
                  <div>
                    <dt className="text-xs text-gray-400 uppercase tracking-wide">CU Invoice No.</dt>
                    <dd className="font-medium text-gray-900 mt-0.5 font-mono">{doc.cu_invoice_no}</dd>
                  </div>
                )}
                {doc.internal_data && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-gray-400 uppercase tracking-wide">Internal Data</dt>
                    <dd className="font-medium text-gray-900 mt-0.5 font-mono text-xs break-all">{doc.internal_data}</dd>
                  </div>
                )}
                {doc.receipt_signature && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-gray-400 uppercase tracking-wide">Receipt Signature</dt>
                    <dd className="font-medium text-gray-900 mt-0.5 font-mono text-xs break-all">{doc.receipt_signature}</dd>
                  </div>
                )}
                {doc.qr_code_data && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-gray-400 uppercase tracking-wide">QR Code Data</dt>
                    <dd className="font-medium text-gray-900 mt-0.5 font-mono text-xs break-all">{doc.qr_code_data}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Details</h2>
            <dl className="space-y-2.5 text-sm">
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Status</dt>
                <dd className="mt-0.5">
                  <Badge variant={STATUS_COLORS[doc.status] ?? 'gray'}>{doc.status}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Invoice Date</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{invoiceDateDisplay}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Created</dt>
                <dd className="text-gray-600 mt-0.5">{formatDate(doc.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Grand Total (Incl. Tax)</dt>
                <dd className="text-lg font-bold text-gray-900 mt-0.5">{formatCurrency(grandTotal.total)}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Link href={`/finance/etims/${id}/print`} target="_blank" className="block">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Printer className="w-4 h-4" />Print / Save PDF
                </Button>
              </Link>
              <Link href={`/finance/etims/${id}/edit`} className="block">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Pencil className="w-4 h-4" />Edit Document
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

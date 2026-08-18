import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import { PrintButton } from '@/components/finance/PrintButton'
import type { FinanceDocumentWithClient } from '@/types/database'

export default async function QuotationPrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = createServiceClient()

  const { data: doc } = await db
    .from('finance_documents')
    .select('*, clients(id, name, company, phone, email)')
    .eq('id', id)
    .eq('type', 'Quotation')
    .single() as unknown as { data: FinanceDocumentWithClient | null }

  if (!doc) notFound()

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="no-print flex justify-end p-4 border-b border-gray-200 bg-white">
        <PrintButton />
      </div>

      <div className="max-w-3xl mx-auto my-8 print:my-0 print:max-w-none">
        <div className="bg-white shadow-lg print:shadow-none">

          <div className="p-8 pb-6">

            {/* ── Company Header ──────────────────────────────────── */}
            <div className="flex items-start gap-5 mb-5">
              {/* Logo — replace this div with <img src="/logo.png"> once you have the file */}
              <div
                className="shrink-0 flex items-center justify-center rounded-full text-white font-black text-xs text-center leading-tight"
                style={{ width: 80, height: 80, backgroundColor: '#7B1818', flexShrink: 0 }}
              >
                <span style={{ fontSize: 9, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  GEREC<br />SURVEY &amp;<br />ENG.
                </span>
              </div>
              {/* Company info */}
              <div className="flex-1">
                <h1 className="text-base font-extrabold text-gray-900 leading-tight uppercase tracking-wide">
                  Geo-Smart Engineering &amp; Real Estate Contractors Ltd
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  Real Estate Agency &nbsp;|&nbsp; Project Management &nbsp;|&nbsp; General Construction
                </p>
                <p className="text-xs text-gray-400 mt-0.5">P.O Box Nairobi, Kenya</p>
              </div>
              {/* Document type */}
              <div className="text-right shrink-0">
                <h2 className="text-3xl font-extrabold uppercase" style={{ color: '#B91C1C' }}>
                  QUOTATION
                </h2>
                <p className="text-xs text-gray-500 mt-1 font-mono">{doc.doc_no}</p>
              </div>
            </div>

            <hr className="border-gray-300 mb-5" />

            {/* ── Quoted To + Date info ───────────────────────────── */}
            <div className="mb-5">
              <div className="text-white text-xs font-bold uppercase tracking-widest px-4 py-2" style={{ backgroundColor: '#7B1818' }}>
                Quoted To
              </div>
              <div className="grid grid-cols-2 gap-4 border border-t-0 border-gray-200 px-4 py-3">
                <div>
                  {doc.clients ? (
                    <>
                      <p className="font-semibold text-gray-900 text-sm">{doc.clients.name}</p>
                      {doc.clients.company && <p className="text-xs text-gray-600 mt-0.5">{doc.clients.company}</p>}
                      {doc.clients.phone && <p className="text-xs text-gray-600">{doc.clients.phone}</p>}
                      {doc.clients.email && <p className="text-xs text-gray-600">{doc.clients.email}</p>}
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">No client specified</p>
                  )}
                </div>
                <div className="text-right text-xs text-gray-600 space-y-1">
                  <p><span className="font-semibold text-gray-700">Date:</span> {formatDate(doc.created_at)}</p>
                  <p><span className="font-semibold text-gray-700">Quote No:</span> {doc.doc_no}</p>
                  {doc.due_date && (
                    <p><span className="font-semibold text-gray-700">Valid Until:</span> {formatDate(doc.due_date)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Line Items ──────────────────────────────────────── */}
            <table className="w-full text-sm mb-1 border border-gray-200">
              <thead>
                <tr className="text-white" style={{ backgroundColor: '#1A5C2A' }}>
                  <th className="text-left px-4 py-2.5 font-semibold">Description</th>
                  <th className="text-center px-3 py-2.5 font-semibold w-16">Qty</th>
                  <th className="text-center px-3 py-2.5 font-semibold w-16">Unit</th>
                  <th className="text-right px-3 py-2.5 font-semibold w-28">Unit Price</th>
                  <th className="text-right px-4 py-2.5 font-semibold w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {doc.line_items.map((item, i) => (
                  <tr key={i} className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                    <td className="px-4 py-2.5 text-gray-800">{item.description}</td>
                    <td className="px-3 py-2.5 text-center text-gray-600">{item.quantity}</td>
                    <td className="px-3 py-2.5 text-center text-gray-500 text-xs">{item.unit || '—'}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── Bottom section: Terms + Totals ──────────────────── */}
            <div className="grid grid-cols-2 gap-6 mt-4 mb-6">
              {/* Terms / Notes */}
              <div>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Terms &amp; Conditions</p>
                {doc.notes ? (
                  <p className="text-xs text-gray-600 whitespace-pre-wrap">{doc.notes}</p>
                ) : (
                  <p className="text-xs text-gray-400">This quotation is valid for the period stated above.</p>
                )}
              </div>

              {/* Totals */}
              <div>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-600">Subtotal</td>
                      <td className="py-1.5 text-right text-gray-800">{formatCurrency(doc.amount)}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-600">{doc.tax <= 100 ? `VAT (${doc.tax}%)` : 'VAT'}</td>
                      <td className="py-1.5 text-right text-gray-800">{formatCurrency(doc.total - doc.amount)}</td>
                    </tr>
                    <tr>
                      <td className="pt-2 font-bold text-gray-900">Total</td>
                      <td className="pt-2 text-right font-bold text-gray-900">{formatCurrency(doc.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Signature Blocks ────────────────────────────────── */}
            <div className="mt-8 grid grid-cols-2 gap-12">
              <div>
                <div className="border-t-2 border-gray-300 pt-2">
                  <p className="text-xs text-gray-400">Authorised Signature &amp; Date</p>
                </div>
              </div>
              <div>
                <div className="border-t-2 border-gray-300 pt-2">
                  <p className="text-xs text-gray-400">Client Signature &amp; Date</p>
                </div>
              </div>
            </div>

            {/* ── Thank You ───────────────────────────────────────── */}
            <p className="text-center text-base font-extrabold uppercase mt-8 tracking-widest" style={{ color: '#B91C1C' }}>
              Thank You For Considering Our Services
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @page { margin: 0; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  )
}

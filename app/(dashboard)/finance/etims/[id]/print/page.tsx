import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { PrintButton } from '@/components/finance/PrintButton'
import { EtimsQrCode } from '@/components/finance/EtimsQrCode'
import type { EtimsDocument, EtimsLineItem } from '@/types/database'

// Match official KRA format: "0.00" for zero, no trailing decimals for whole numbers
function fmtNum(n: number): string {
  if (n === 0) return '0.00'
  if (Number.isInteger(n)) return n.toLocaleString('en-KE')
  return n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// KSh prefix — tax summary totals
function fmtKsh(n: number): string {
  if (n === 0) return 'KSh 0.00'
  if (Number.isInteger(n)) return 'KSh ' + n.toLocaleString('en-KE')
  return 'KSh ' + n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatEtimsDatetime(iso: string): string {
  const d = new Date(iso)
  const dd   = String(d.getDate()).padStart(2, '0')
  const mm   = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh   = String(d.getHours()).padStart(2, '0')
  const min  = String(d.getMinutes()).padStart(2, '0')
  const ss   = String(d.getSeconds()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`
}

function calcTax(items: EtimsLineItem[]) {
  // The tax summary always shows 16%, 0%, Ex. rows (even if zero)
  const rows = {
    '16%': { taxable: 0, tax: 0, total: 0 },
    '0%':  { taxable: 0, tax: 0, total: 0 },
    'Ex.': { taxable: 0, tax: 0, total: 0 },
  } as Record<string, { taxable: number; tax: number; total: number }>

  const grand = { taxable: 0, tax: 0, total: 0 }
  for (const item of items) {
    if (rows[item.rate]) {
      rows[item.rate].taxable += item.amt_excl_tax
      rows[item.rate].tax     += item.tax_amt
      rows[item.rate].total   += item.amt_incl_tax
    }
    // Grand total includes ALL items (NV and others)
    grand.taxable += item.amt_excl_tax
    grand.tax     += item.tax_amt
    grand.total   += item.amt_incl_tax
  }
  return { rows, grand }
}

// Outer box is provided by a wrapping <div> — cells only need column separators + header bottom
const TH = ({ children, align = 'left', first = false }: { children: React.ReactNode; align?: string; first?: boolean }) => (
  <th style={{
    borderLeft: first ? 'none' : '1px solid #000',
    borderBottom: '1px solid #000',
    padding: '5px 6px',
    textAlign: align as 'left' | 'center' | 'right',
    fontWeight: 700,
    fontSize: 10,
    background: 'white',
    whiteSpace: 'nowrap',
  }}>{children}</th>
)

const TD = ({ children, align = 'left', first = false }: { children: React.ReactNode; align?: string; first?: boolean }) => (
  <td style={{
    borderLeft: first ? 'none' : '1px solid #000',
    padding: '5px 6px',
    textAlign: align as 'left' | 'center' | 'right',
    fontSize: 10,
    color: '#000',
    verticalAlign: 'top',
  }}>{children}</td>
)

export default async function EtimssPrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = createServiceClient()

  const { data: doc } = await db
    .from('etims_documents')
    .select('*')
    .eq('id', id)
    .single() as unknown as { data: EtimsDocument | null }

  if (!doc) notFound()

  const { rows: taxRows, grand } = calcTax(doc.line_items)
  const dtStr = formatEtimsDatetime(doc.invoice_date)
  // Height of empty area below items (no horizontal lines — only column dividers)
  const emptyAreaHeight = doc.line_items.length < 10
    ? (10 - doc.line_items.length) * 26
    : 0

  return (
    <div style={{ minHeight: '100vh', background: '#e5e5e5', fontFamily: 'Arial, Helvetica, sans-serif' }}>

      {/* ── Print controls ─────────────────────────────────── */}
      <div className="no-print" style={{
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12,
        padding: '10px 16px', background: 'white', borderBottom: '1px solid #ccc',
      }}>
        <span style={{ fontSize: 13, color: '#555', fontFamily: 'monospace' }}>{doc.invoice_no}</span>
        <PrintButton />
      </div>

      {/* ── Paper ──────────────────────────────────────────── */}
      <div style={{ maxWidth: 794, margin: '24px auto 40px', padding: '0 0' }}>
        <div style={{ background: 'white', padding: '32px 36px 36px', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>

          {/* ════════════════════════════════════════════════
              eTIMS LOGO
          ════════════════════════════════════════════════ */}
          <div style={{ marginBottom: 20 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/etims-logo.svg"
              alt="eTIMS"
              style={{ height: 70, width: 'auto' }}
            />
          </div>

          {/* ════════════════════════════════════════════════
              THREE HEADER BOXES — separate, box3 pushed right
              Official layout: [FROM] [TO]          [INVOICE NO]
          ════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 14, fontSize: 11 }}>
            {/* INVOICE FROM */}
            <div style={{
              border: '1px solid #000', padding: '8px 10px',
              width: 210, flexShrink: 0, lineHeight: 1.6,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>INVOICE FROM</div>
              <div>PIN: {doc.seller_pin}</div>
              <div>NAME: {doc.seller_name}</div>
            </div>

            {/* INVOICE TO */}
            <div style={{
              border: '1px solid #000', padding: '8px 10px',
              width: 210, flexShrink: 0, lineHeight: 1.6,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>INVOICE TO</div>
              <div>PIN: {doc.buyer_pin || '—'}</div>
              <div>NAME: {doc.buyer_name || '—'}</div>
            </div>

            {/* INVOICE NO — pushed to the right edge */}
            <div style={{
              border: '1px solid #000', padding: '8px 10px',
              marginLeft: 'auto', flexShrink: 0, lineHeight: 1.6, minWidth: 240,
            }}>
              <div style={{ marginBottom: 2 }}>INVOICE NO: {doc.invoice_no}</div>
              <div>Date : {dtStr}</div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════
              LINE ITEMS TABLE
              Outer box = wrapping div border.
              Cells only carry: borderLeft (column separators) + TH borderBottom (header rule).
              No top/bottom on body cells → zero horizontal lines in the body.
          ════════════════════════════════════════════════ */}
          <div style={{ border: '1px solid #000' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <TH first>Item Code</TH>
                  <TH>Item Description</TH>
                  <TH align="center">Qty x Unit Price</TH>
                  <TH align="center">Rate</TH>
                  <TH align="right">Amt excl. Tax</TH>
                  <TH align="right">Tax Amt</TH>
                  <TH align="right">Amt incl. Tax</TH>
                </tr>
              </thead>
              <tbody>
                {doc.line_items.map((item, i) => (
                  <tr key={i}>
                    <TD first>{item.item_code || ''}</TD>
                    <TD>{item.description}</TD>
                    <TD align="center">{item.qty} x {fmtNum(item.unit_price)}</TD>
                    <TD align="center">{item.rate}</TD>
                    <TD align="right">{fmtNum(item.amt_excl_tax)}</TD>
                    <TD align="right">{fmtNum(item.tax_amt)}</TD>
                    <TD align="right">{fmtNum(item.amt_incl_tax)}</TD>
                  </tr>
                ))}
                {/* Empty area: column separators only — no top/bottom borders = no horizontal lines */}
                {emptyAreaHeight > 0 && (
                  <tr>
                    {[0,1,2,3,4,5,6].map((c) => (
                      <td key={c} style={{
                        borderLeft: c === 0 ? 'none' : '1px solid #000',
                        height: emptyAreaHeight,
                        padding: 0,
                      }} />
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ════════════════════════════════════════════════
              BOTTOM: SCU INFORMATION (left) + TAX SUMMARY (right)
          ════════════════════════════════════════════════ */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 14 }}>
            <tbody>
              <tr style={{ verticalAlign: 'top' }}>

                {/* ── SCU INFORMATION ──────────────────────── */}
                <td style={{ width: '52%', paddingRight: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 4 }}>SCU INFORMATION</div>

                  {/* Top dashes — clipped cleanly by the td boundary */}
                  <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', fontSize: 10, marginBottom: 5 }}>
                    {'-'.repeat(60)}
                  </div>

                  {/* SCU text + QR side by side */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 10, lineHeight: 1.6 }}>
                      <div>Date : {dtStr}</div>
                      {doc.scu_id && <div>SCU ID : {doc.scu_id}</div>}
                      {doc.cu_invoice_no && (
                        <>
                          <div>&nbsp;</div>
                          <div>CU INVOICE NO. : {doc.cu_invoice_no}</div>
                        </>
                      )}
                      {doc.internal_data && (
                        <>
                          <div>&nbsp;</div>
                          <div style={{ wordBreak: 'break-all' }}>Internal Data : {doc.internal_data}</div>
                        </>
                      )}
                      {doc.receipt_signature && (
                        <>
                          <div>&nbsp;</div>
                          <div style={{ wordBreak: 'break-all' }}>Receipt Signature : {doc.receipt_signature}</div>
                        </>
                      )}
                      {!doc.scu_id && !doc.cu_invoice_no && !doc.internal_data && !doc.receipt_signature && (
                        <div style={{ color: '#999', fontStyle: 'italic' }}>SCU data not yet available</div>
                      )}
                    </div>

                    {doc.qr_code_data && (
                      <div style={{ flexShrink: 0 }}>
                        <EtimsQrCode value={doc.qr_code_data} size={100} />
                      </div>
                    )}
                  </div>

                  {/* Bottom dashes */}
                  <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', fontSize: 10, marginTop: 5, marginBottom: 4 }}>
                    {'-'.repeat(60)}
                  </div>

                  <div style={{ fontSize: 10 }}>Powered by eTIMS</div>
                </td>

                {/* ── TAX SUMMARY ──────────────────────────── */}
                <td style={{ width: '48%' }}>
                  <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 6 }}>TAX SUMMARY</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'left',  fontWeight: 700 }}>Tax Rate</th>
                        <th style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'right', fontWeight: 700 }}>Taxable Amt</th>
                        <th style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'right', fontWeight: 700 }}>Tax Amt</th>
                        <th style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'right', fontWeight: 700 }}>Total Amt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['16%', '0%', 'Ex.'] as const).map((rate) => {
                        const g = taxRows[rate]!
                        return (
                          <tr key={rate}>
                            <td style={{ border: '1px solid #000', padding: '4px 5px' }}>{rate}</td>
                            <td style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'right' }}>{fmtKsh(g.taxable)}</td>
                            <td style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'right' }}>{fmtKsh(g.tax)}</td>
                            <td style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'right' }}>{fmtKsh(g.total)}</td>
                          </tr>
                        )
                      })}
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '4px 5px', fontWeight: 700 }}>Totals</td>
                        <td style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'right', fontWeight: 700 }}>{fmtKsh(grand.taxable)}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'right', fontWeight: 700 }}>{fmtKsh(grand.tax)}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 5px', textAlign: 'right', fontWeight: 700 }}>{fmtKsh(grand.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>

              </tr>
            </tbody>
          </table>

        </div>
      </div>

      <style>{`
        @page { size: A4; margin: 8mm; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  )
}

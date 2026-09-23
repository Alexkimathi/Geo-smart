'use client'

import { FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FinanceDocumentWithClient, Payment } from '@/types/database'

// ── Company constants ──────────────────────────────────────────────────────────
const CO_NAME    = 'GEO-SMART ENGINEERING & REAL ESTATE CONTRACTORS LIMITED'
const CO_DEALS   = 'Deals In: Spatial Research Consultants, Planning, Valuation, Cadastral Survey, Topographical Survey, Engineering Survey, Tilting Survey, Survey Research, Property Management, Real Estate Agency, Project Management, General Construction Contractors'
const CO_CONTACT = 'P.O BOX 307-00600, NAIROBI  |  Tel: +254 722 123 456  |  Email: geosmart2016@gmail.com'

// ── Brand colours (ARGB) ───────────────────────────────────────────────────────
const RED   = { argb: 'FFB91C1C' } as const
const BLUE  = { argb: 'FF1E3A8A' } as const
const WHITE = { argb: 'FFFFFFFF' } as const
const GRAY  = { argb: 'FF4B5563' } as const
const GREEN_BG = { argb: 'FF1A5C2A' } as const
const RED_BG   = { argb: 'FF7B1818' } as const

interface Props {
  doc: FinanceDocumentWithClient
  payments?: Payment[]
}

/**
 * Adds the company letterhead to the top of `ws`.
 *
 * Layout (all rows are 1-indexed to ExcelJS conventions):
 *   Col A   – logo image overlay (rows 1-6)
 *   Col B:Z – header text cells (merged to `lastCol`)
 *
 *   Row 1  – Company name  (red bold 13pt)
 *   Row 2-4 – Deals In…   (blue italic 8.5pt, wraps)
 *   Row 5  – Contact info  (gray 8pt)
 *   Row 6  – Doc title     (red bold 11pt)
 *   Row 7  – empty spacer
 *
 * Returns the first data row index (8).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function addHeader(ws: any, lastCol: number, docType: string, docNo: string, logoId: number | null) {
  // ── Row heights ──────────────────────────────────────────────
  ws.getRow(1).height = 22   // company name
  ws.getRow(2).height = 14
  ws.getRow(3).height = 32   // deals-in text (wraps here)
  ws.getRow(4).height = 14
  ws.getRow(5).height = 14   // contact
  ws.getRow(6).height = 16   // doc title
  ws.getRow(7).height = 8    // spacer

  // ── Logo column ──────────────────────────────────────────────
  ws.getColumn(1).width = 14  // col A – logo space only
  if (logoId !== null) {
    ws.addImage(logoId, {
      tl: { col: 0, row: 0 },   // 0-based: start of col A, row 1
      br: { col: 1, row: 6 },   // 0-based: end of col A, after row 6
    })
  }

  // ── Row 1: Company name ──────────────────────────────────────
  ws.mergeCells(1, 2, 1, lastCol)
  const nameCell = ws.getCell(1, 2)
  nameCell.value = CO_NAME
  nameCell.font  = { bold: true, size: 13, color: RED }
  nameCell.alignment = { vertical: 'middle' }

  // ── Rows 2-4: Deals In ───────────────────────────────────────
  ws.mergeCells(2, 2, 4, lastCol)
  const dealsCell = ws.getCell(2, 2)
  dealsCell.value = CO_DEALS
  dealsCell.font  = { italic: true, size: 8.5, color: BLUE }
  dealsCell.alignment = { vertical: 'middle', wrapText: true }
  // Blue top + bottom borders (matching Word doc style)
  dealsCell.border = {
    top:    { style: 'medium', color: BLUE },
    bottom: { style: 'medium', color: BLUE },
  }

  // ── Row 5: Contact ───────────────────────────────────────────
  ws.mergeCells(5, 2, 5, lastCol)
  const contactCell = ws.getCell(5, 2)
  contactCell.value = CO_CONTACT
  contactCell.font  = { size: 8, color: GRAY }
  contactCell.alignment = { vertical: 'middle' }

  // ── Row 6: Document title ────────────────────────────────────
  ws.mergeCells(6, 2, 6, lastCol)
  const titleCell = ws.getCell(6, 2)
  titleCell.value = `${docType.toUpperCase()}   No: ${docNo}`
  titleCell.font  = { bold: true, size: 11, color: RED }
  titleCell.alignment = { vertical: 'middle' }

  return 8  // first data row
}

export function DownloadExcelButton({ doc, payments }: Props) {
  async function handleDownload() {
    // Dynamic import keeps the heavy bundle out of the initial page load
    const ExcelJSModule = await import('exceljs')
    const ExcelJS = ExcelJSModule.default ?? ExcelJSModule
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wb: any = new (ExcelJS as any).Workbook()

    const isInvoice = doc.type === 'Invoice'

    // ── Fetch logo ───────────────────────────────────────────────
    let logoId: number | null = null
    try {
      const res = await fetch('/logo.png')
      const buf = await res.arrayBuffer()
      logoId = wb.addImage({ buffer: buf, extension: 'png' })
    } catch {
      // proceed without logo if fetch fails
    }

    // ══════════════════════════════════════════════════════════════
    // Sheet 1: Summary
    // ══════════════════════════════════════════════════════════════
    const wsSummary = wb.addWorksheet('Summary')
    wsSummary.getColumn(2).width = 22   // label
    wsSummary.getColumn(3).width = 52   // value

    await addHeader(wsSummary, 3, doc.type, doc.doc_no, logoId)

    const summaryRows: [string, string | number | null][] = [
      ['Document No.',                  doc.doc_no],
      ['Status',                        doc.status],
      ['Date Created',                  doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''],
      [isInvoice ? 'Due Date' : 'Valid Until', doc.due_date ? new Date(doc.due_date).toLocaleDateString() : ''],
    ]
    if (doc.paid_date)    summaryRows.push(['Paid Date',     new Date(doc.paid_date).toLocaleDateString()])
    if (doc.reference_no) summaryRows.push(['Reference No.', doc.reference_no])
    summaryRows.push(['', ''])
    summaryRows.push(['Client', doc.clients?.name ?? doc.quote_to ?? ''])
    if (doc.clients?.company) summaryRows.push(['Company', doc.clients.company])
    if (doc.clients?.phone)   summaryRows.push(['Phone',   doc.clients.phone])
    if (doc.clients?.email)   summaryRows.push(['Email',   doc.clients.email])
    if (doc.notes) { summaryRows.push(['', '']); summaryRows.push(['Notes / Terms', doc.notes]) }

    let r = 8
    for (const [label, value] of summaryRows) {
      const row = wsSummary.getRow(r)
      row.getCell(2).value = label
      row.getCell(3).value = value
      if (label) {
        row.getCell(2).font = { bold: true, size: 9, color: GRAY }
        row.getCell(3).font = { size: 9 }
      }
      row.height = 14
      r++
    }

    // ══════════════════════════════════════════════════════════════
    // Sheet 2: Line Items
    // ══════════════════════════════════════════════════════════════
    const wsItems = wb.addWorksheet('Line Items')
    wsItems.getColumn(2).width = 44   // Description
    wsItems.getColumn(3).width = 10   // Qty
    wsItems.getColumn(4).width = 10   // Unit
    wsItems.getColumn(5).width = 16   // Unit Price
    wsItems.getColumn(6).width = 16   // Amount

    await addHeader(wsItems, 6, doc.type, doc.doc_no, logoId)

    // Column header row (row 8)
    const itemHdrRow = wsItems.getRow(8)
    itemHdrRow.height = 16
    const itemCols = ['', 'Description', 'Qty', 'Unit', 'Unit Price', 'Amount']
    itemCols.forEach((h, i) => {
      if (!h) return
      const cell = itemHdrRow.getCell(i + 1)
      cell.value = h
      cell.font  = { bold: true, color: WHITE, size: 9 }
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: GREEN_BG }
      cell.alignment = { horizontal: i >= 4 ? 'right' : (i >= 2 ? 'center' : 'left'), vertical: 'middle' }
    })

    // Data rows
    r = 9
    for (const item of doc.line_items) {
      const row = wsItems.getRow(r)
      row.height = 14
      row.getCell(2).value = item.description
      row.getCell(3).value = item.quantity;  row.getCell(3).alignment = { horizontal: 'center' }
      row.getCell(4).value = item.unit || ''; row.getCell(4).alignment = { horizontal: 'center' }
      row.getCell(5).value = item.unit_price; row.getCell(5).alignment = { horizontal: 'right' }
      row.getCell(6).value = item.amount;     row.getCell(6).alignment = { horizontal: 'right' }
      r++
    }

    // Totals
    const taxAmount = doc.total - doc.amount
    r++ // blank row
    for (const [label, val] of [
      ['Subtotal',                                          doc.amount],
      [doc.tax <= 100 ? `VAT (${doc.tax}%)` : 'VAT',      taxAmount],
      ['TOTAL',                                            doc.total],
    ] as [string, number][]) {
      const row = wsItems.getRow(r)
      row.height = 14
      row.getCell(5).value = label;  row.getCell(5).font = { bold: label === 'TOTAL', size: 9 }; row.getCell(5).alignment = { horizontal: 'right' }
      row.getCell(6).value = val;    row.getCell(6).font = { bold: label === 'TOTAL', size: 9 }; row.getCell(6).alignment = { horizontal: 'right' }
      r++
    }

    // ══════════════════════════════════════════════════════════════
    // Sheet 3: Payments (invoices only)
    // ══════════════════════════════════════════════════════════════
    if (isInvoice && payments && payments.length > 0) {
      const wsPayments = wb.addWorksheet('Payments')
      wsPayments.getColumn(2).width = 14   // Date
      wsPayments.getColumn(3).width = 16   // Method
      wsPayments.getColumn(4).width = 22   // Reference
      wsPayments.getColumn(5).width = 28   // Notes
      wsPayments.getColumn(6).width = 14   // Amount

      await addHeader(wsPayments, 6, doc.type, doc.doc_no, logoId)

      const pmtHdrRow = wsPayments.getRow(8)
      pmtHdrRow.height = 16
      const pmtCols = ['', 'Date', 'Method', 'Reference', 'Notes', 'Amount']
      pmtCols.forEach((h, i) => {
        if (!h) return
        const cell = pmtHdrRow.getCell(i + 1)
        cell.value = h
        cell.font  = { bold: true, color: WHITE, size: 9 }
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: RED_BG }
        cell.alignment = { vertical: 'middle' }
      })

      const totalPaid  = payments.reduce((sum, p) => sum + p.amount, 0)
      const balanceDue = doc.total - totalPaid

      r = 9
      for (const p of payments) {
        const row = wsPayments.getRow(r)
        row.height = 14
        row.getCell(2).value = new Date(p.payment_date).toLocaleDateString()
        row.getCell(3).value = p.method
        row.getCell(4).value = p.reference || ''
        row.getCell(5).value = p.notes || ''
        row.getCell(6).value = p.amount; row.getCell(6).alignment = { horizontal: 'right' }
        r++
      }

      r++ // blank row
      for (const [label, val] of [
        ['Invoice Total', doc.total],
        ['Total Paid',    totalPaid],
        ['Balance Due',   balanceDue],
      ] as [string, number][]) {
        const row = wsPayments.getRow(r)
        row.height = 14
        row.getCell(5).value = label; row.getCell(5).font = { bold: true, size: 9 }; row.getCell(5).alignment = { horizontal: 'right' }
        row.getCell(6).value = val;   row.getCell(6).font = { bold: true, size: 9 }; row.getCell(6).alignment = { horizontal: 'right' }
        r++
      }
    }

    // ── Write & download ─────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer()
    const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href       = url
    a.download   = `${doc.doc_no}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      <FileSpreadsheet className="w-4 h-4" />Export Excel
    </Button>
  )
}

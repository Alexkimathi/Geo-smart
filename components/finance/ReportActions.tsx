'use client'

import { Download, FileSpreadsheet, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import * as XLSX from 'xlsx'

export interface DebtorCsvRow {
  clientName: string
  company: string | null
  docNo: string
  dueDate: string | null
  status: string
  total: number
  totalPaid: number
  balance: number
  daysOverdue: number
}

export interface CreditorCsvRow {
  lpoNo: string
  supplierName: string
  jobNo: string
  issuedDate: string | null
  status: string
  total: number
}

export interface PnlCsvRow {
  jobNo: string
  name: string
  clientName: string
  type: string
  status: string
  invoiced: number
  costsTotal: number
  margin: number
  marginPct: number | null
}

interface Props {
  debtors: DebtorCsvRow[]
  creditors: CreditorCsvRow[]
  pnlRows: PnlCsvRow[]
}

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows
    .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportActions({ debtors, creditors, pnlRows }: Props) {
  const today = new Date().toISOString().split('T')[0]

  function downloadDebtors() {
    const header = ['Client', 'Company', 'Invoice No.', 'Due Date', 'Status', 'Invoice Total', 'Paid', 'Balance Due', 'Days Overdue']
    const data = debtors.map((d) => [
      d.clientName, d.company ?? '', d.docNo, d.dueDate ?? '',
      d.status, d.total.toFixed(2), d.totalPaid.toFixed(2), d.balance.toFixed(2),
      d.daysOverdue > 0 ? String(d.daysOverdue) : '0',
    ])
    downloadCsv(`debtors-report-${today}.csv`, [header, ...data])
  }

  function downloadCreditors() {
    const header = ['LPO No.', 'Supplier', 'Job', 'Date Issued', 'Status', 'Amount']
    const data = creditors.map((c) => [
      c.lpoNo, c.supplierName, c.jobNo, c.issuedDate ?? '',
      c.status, c.total.toFixed(2),
    ])
    downloadCsv(`creditors-report-${today}.csv`, [header, ...data])
  }

  function downloadPnl() {
    const header = ['Job No.', 'Job Name', 'Client', 'Type', 'Status', 'Invoiced', 'Costs', 'Net Margin', 'Margin %']
    const data = pnlRows.map((r) => [
      r.jobNo, r.name, r.clientName, r.type, r.status,
      r.invoiced.toFixed(2), r.costsTotal.toFixed(2), r.margin.toFixed(2),
      r.marginPct !== null ? `${r.marginPct.toFixed(1)}%` : '',
    ])
    downloadCsv(`pnl-report-${today}.csv`, [header, ...data])
  }

  function downloadExcel() {
    const wb = XLSX.utils.book_new()

    // Sheet 1: Debtors
    const debtorRows: (string | number)[][] = [
      ['Client', 'Company', 'Invoice No.', 'Due Date', 'Status', 'Invoice Total', 'Paid', 'Balance Due', 'Days Overdue'],
      ...debtors.map((d) => [
        d.clientName, d.company ?? '', d.docNo, d.dueDate ?? '',
        d.status, d.total, d.totalPaid, d.balance, d.daysOverdue,
      ]),
    ]
    const wsDebtors = XLSX.utils.aoa_to_sheet(debtorRows)
    wsDebtors['!cols'] = [20, 20, 14, 12, 10, 14, 14, 14, 12].map((w) => ({ wch: w }))
    XLSX.utils.book_append_sheet(wb, wsDebtors, 'Debtors')

    // Sheet 2: Creditors
    const creditorRows: (string | number)[][] = [
      ['LPO No.', 'Supplier', 'Job', 'Date Issued', 'Status', 'Amount'],
      ...creditors.map((c) => [
        c.lpoNo, c.supplierName, c.jobNo, c.issuedDate ?? '',
        c.status, c.total,
      ]),
    ]
    const wsCreditors = XLSX.utils.aoa_to_sheet(creditorRows)
    wsCreditors['!cols'] = [14, 24, 12, 12, 10, 14].map((w) => ({ wch: w }))
    XLSX.utils.book_append_sheet(wb, wsCreditors, 'Creditors')

    // Sheet 3: P&L per Job
    const pnlRowsData: (string | number)[][] = [
      ['Job No.', 'Job Name', 'Client', 'Type', 'Status', 'Invoiced', 'Costs', 'Net Margin', 'Margin %'],
      ...pnlRows.map((r) => [
        r.jobNo, r.name, r.clientName, r.type, r.status,
        r.invoiced, r.costsTotal, r.margin,
        r.marginPct !== null ? r.marginPct / 100 : '',
      ]),
    ]
    const wsPnl = XLSX.utils.aoa_to_sheet(pnlRowsData)
    wsPnl['!cols'] = [12, 28, 20, 16, 12, 14, 14, 14, 10].map((w) => ({ wch: w }))
    // Format the Margin % column as percentage
    const pnlDataRows = pnlRows.length
    for (let i = 1; i <= pnlDataRows; i++) {
      const cell = wsPnl[XLSX.utils.encode_cell({ r: i, c: 8 })]
      if (cell && typeof cell.v === 'number') cell.z = '0.0%'
    }
    XLSX.utils.book_append_sheet(wb, wsPnl, 'P&L per Job')

    XLSX.writeFile(wb, `finance-reports-${today}.xlsx`)
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="w-4 h-4" />Print / PDF
      </Button>
      <Button variant="outline" size="sm" onClick={downloadDebtors}>
        <Download className="w-4 h-4" />Debtors CSV
      </Button>
      <Button variant="outline" size="sm" onClick={downloadCreditors}>
        <Download className="w-4 h-4" />Creditors CSV
      </Button>
      <Button variant="outline" size="sm" onClick={downloadPnl}>
        <Download className="w-4 h-4" />P&amp;L CSV
      </Button>
      <Button variant="outline" size="sm" onClick={downloadExcel}>
        <FileSpreadsheet className="w-4 h-4" />Export Excel
      </Button>
    </div>
  )
}

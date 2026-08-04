'use client'

import { Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

export interface PnlCsvRow {
  jobNo: string
  name: string
  clientName: string
  type: string
  status: string
  invoiced: number
  expensesTotal: number
  margin: number
  marginPct: number | null
}

interface Props {
  debtors: DebtorCsvRow[]
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

export function ReportActions({ debtors, pnlRows }: Props) {
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

  function downloadPnl() {
    const header = ['Job No.', 'Job Name', 'Client', 'Type', 'Status', 'Invoiced', 'Expenses', 'Net Margin', 'Margin %']
    const data = pnlRows.map((r) => [
      r.jobNo, r.name, r.clientName, r.type, r.status,
      r.invoiced.toFixed(2), r.expensesTotal.toFixed(2), r.margin.toFixed(2),
      r.marginPct !== null ? `${r.marginPct.toFixed(1)}%` : '',
    ])
    downloadCsv(`pnl-report-${today}.csv`, [header, ...data])
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="w-4 h-4" />Print / PDF
      </Button>
      <Button variant="outline" size="sm" onClick={downloadDebtors}>
        <Download className="w-4 h-4" />Debtors CSV
      </Button>
      <Button variant="outline" size="sm" onClick={downloadPnl}>
        <Download className="w-4 h-4" />P&amp;L CSV
      </Button>
    </div>
  )
}

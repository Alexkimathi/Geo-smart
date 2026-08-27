'use client'

import { FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import * as XLSX from 'xlsx'

export interface PlotReportRow {
  project: string
  plotNo: string
  size: string
  price: number
  status: string
  buyerName: string
  buyerPhone: string
  salePrice: number
  totalPaid: number
  balance: number
  reservationDate: string
  lastPaymentDate: string
  reservationStatus: string
}

export interface DefaulterRow {
  project: string
  plotNo: string
  buyerName: string
  buyerPhone: string
  salePrice: number
  totalPaid: number
  balance: number
  lastPaymentDate: string
  daysOverdue: number
}

interface Props {
  rows: PlotReportRow[]
  defaulters: DefaulterRow[]
}

export function PlotReportActions({ rows, defaulters }: Props) {
  const today = new Date().toISOString().split('T')[0]

  function downloadExcel() {
    const wb = XLSX.utils.book_new()

    // Sheet 1: All Plots Summary
    const plotRows: (string | number)[][] = [
      ['Project', 'Plot No.', 'Size', 'Asking Price', 'Plot Status', 'Buyer', 'Phone', 'Sale Price', 'Total Paid', 'Balance', 'Reservation Date', 'Last Payment', 'Reservation Status'],
      ...rows.map((r) => [
        r.project, r.plotNo, r.size, r.price, r.status,
        r.buyerName, r.buyerPhone, r.salePrice, r.totalPaid, r.balance,
        r.reservationDate, r.lastPaymentDate, r.reservationStatus,
      ]),
    ]
    const wsPlots = XLSX.utils.aoa_to_sheet(plotRows)
    wsPlots['!cols'] = [24, 10, 12, 14, 12, 22, 14, 14, 14, 14, 14, 14, 16].map((w) => ({ wch: w }))
    XLSX.utils.book_append_sheet(wb, wsPlots, 'Plots Summary')

    // Sheet 2: Defaulters
    if (defaulters.length > 0) {
      const defRows: (string | number)[][] = [
        ['Project', 'Plot No.', 'Buyer', 'Phone', 'Sale Price', 'Total Paid', 'Balance', 'Last Payment', 'Days Overdue'],
        ...defaulters.map((d) => [
          d.project, d.plotNo, d.buyerName, d.buyerPhone,
          d.salePrice, d.totalPaid, d.balance, d.lastPaymentDate, d.daysOverdue,
        ]),
      ]
      const wsDefaults = XLSX.utils.aoa_to_sheet(defRows)
      wsDefaults['!cols'] = [24, 10, 22, 14, 14, 14, 14, 14, 12].map((w) => ({ wch: w }))
      XLSX.utils.book_append_sheet(wb, wsDefaults, 'Defaulters')
    }

    XLSX.writeFile(wb, `plots-report-${today}.xlsx`)
  }

  return (
    <Button variant="outline" size="sm" onClick={downloadExcel}>
      <FileSpreadsheet className="w-4 h-4" />
      Export Excel
    </Button>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Save } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { saveBoqAction } from '@/app/(dashboard)/finance/actions'
import type { BoqItem } from '@/types/database'

interface Props {
  jobId: string
  jobType: 'survey' | 'construction'
  initialItems: BoqItem[]
}

type Row = Omit<BoqItem, 'created_at'> & { _key: string }

function newRow(order: number): Row {
  return {
    _key: `${Date.now()}-${order}`,
    id: '',
    job_id: '',
    job_type: 'construction',
    description: '',
    unit: '',
    quantity: 1,
    unit_rate: 0,
    amount: 0,
    sort_order: order,
  }
}

export function BoqEditor({ jobId, jobType, initialItems }: Props) {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>(
    initialItems.length > 0
      ? initialItems.map((item) => ({ ...item, _key: item.id }))
      : [newRow(0)]
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function updateRow(key: string, field: keyof Row, value: string | number) {
    setRows((prev) => prev.map((r) => {
      if (r._key !== key) return r
      const updated = { ...r, [field]: value }
      if (field === 'quantity' || field === 'unit_rate') {
        updated.amount = Number(updated.quantity) * Number(updated.unit_rate)
      }
      return updated
    }))
    setSaved(false)
  }

  function addRow() {
    setRows((prev) => [...prev, newRow(prev.length)])
    setSaved(false)
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r._key !== key))
    setSaved(false)
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveBoqAction(jobId, jobType, rows.map((r, i) => ({
        id: r.id,
        description: r.description,
        unit: r.unit,
        quantity: r.quantity,
        unit_rate: r.unit_rate,
        amount: r.amount,
        sort_order: i,
      })))
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setError(null)
        router.refresh()
      }
    })
  }

  const subtotal = rows.reduce((s, r) => s + r.amount, 0)

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="hidden sm:grid grid-cols-[1fr_80px_80px_110px_110px_36px] gap-2 px-1">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Description</span>
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Unit</span>
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Qty</span>
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Unit Rate</span>
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Amount</span>
        <span />
      </div>

      {rows.map((row) => (
        <div key={row._key} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_80px_110px_110px_36px] gap-2 items-center">
          <Input
            placeholder="Description"
            value={row.description}
            onChange={(e) => updateRow(row._key, 'description', e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            placeholder="unit"
            value={row.unit}
            onChange={(e) => updateRow(row._key, 'unit', e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            type="number" min={0} step="any"
            value={row.quantity}
            onChange={(e) => updateRow(row._key, 'quantity', parseFloat(e.target.value) || 0)}
            className="h-8 text-sm"
          />
          <Input
            type="number" min={0} step="0.01"
            value={row.unit_rate}
            onChange={(e) => updateRow(row._key, 'unit_rate', parseFloat(e.target.value) || 0)}
            className="h-8 text-sm"
          />
          <div className="h-8 flex items-center justify-end text-sm font-medium text-gray-700">
            {formatCurrency(row.amount)}
          </div>
          <button
            type="button"
            onClick={() => removeRow(row._key)}
            className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {/* Subtotal */}
      <div className="flex justify-between items-center text-sm font-semibold text-gray-900 pt-2 border-t border-gray-100">
        <span className="text-gray-500 font-normal">BOQ Total</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />Add row
        </button>
        <Button size="sm" onClick={handleSave} disabled={isPending} className="ml-auto">
          <Save className="w-3.5 h-3.5" />{isPending ? 'Saving...' : 'Save BOQ'}
        </Button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {saved && <p className="text-xs text-emerald-600">BOQ saved successfully.</p>}
    </div>
  )
}

'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { LineItem } from '@/types/database'

interface Props {
  initialItems?: LineItem[]
  initialTax?: number
  hideUnit?: boolean
}

const emptyRow = (): LineItem => ({
  description: '',
  quantity: 1,
  unit: '',
  unit_price: 0,
  amount: 0,
})

export function LineItemsEditor({ initialItems, initialTax = 0, hideUnit = false }: Props) {
  const [items, setItems] = useState<LineItem[]>(
    initialItems && initialItems.length > 0 ? initialItems : [emptyRow()]
  )
  const [tax, setTax] = useState(initialTax)

  const updateRow = useCallback((index: number, field: keyof LineItem, value: string | number) => {
    setItems((prev) => {
      const next = [...prev]
      const row = { ...next[index], [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        row.amount = Number(row.quantity) * Number(row.unit_price)
      }
      next[index] = row
      return next
    })
  }, [])

  const addRow = () => setItems((prev) => [...prev, emptyRow()])
  const removeRow = (index: number) =>
    setItems((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== index))

  const subtotal = items.reduce((s, r) => s + r.amount, 0)
  const taxAmount = subtotal * (tax / 100)
  const total = subtotal + taxAmount

  return (
    <div className="space-y-3">
      {/* Hidden JSON payload for form submission */}
      <input type="hidden" name="line_items" value={JSON.stringify(items)} />

      {/* Desktop table header (hidden on mobile) */}
      <div
        className={`hidden sm:grid gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide px-1 ${
          hideUnit
            ? 'grid-cols-[1fr_80px_110px_110px_36px]'
            : 'grid-cols-[1fr_80px_80px_110px_110px_36px]'
        }`}
      >
        <span>Description</span>
        <span>Qty</span>
        {!hideUnit && <span>Unit</span>}
        <span>Unit Price</span>
        <span className="text-right">Amount</span>
        <span />
      </div>

      {/* Rows */}
      {items.map((item, i) => (
        <div key={i}>
          {/* Mobile card layout */}
          <div className="sm:hidden border border-gray-100 rounded-lg p-3 space-y-2 relative bg-white">
            <button
              type="button"
              onClick={() => removeRow(i)}
              disabled={items.length === 1}
              className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <Input
              placeholder="Service description"
              value={item.description}
              onChange={(e) => updateRow(i, 'description', e.target.value)}
              className="h-9 text-sm pr-8"
            />
            <div className={`grid gap-2 ${hideUnit ? 'grid-cols-2' : 'grid-cols-3'}`}>
              <div>
                <p className="text-xs text-gray-400 mb-1">Qty</p>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  placeholder="1"
                  value={item.quantity || ''}
                  onChange={(e) => updateRow(i, 'quantity', parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm text-center"
                />
              </div>
              {!hideUnit && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Unit</p>
                  <Input
                    placeholder="ea"
                    value={item.unit}
                    onChange={(e) => updateRow(i, 'unit', e.target.value)}
                    className="h-8 text-sm text-center"
                  />
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 mb-1">Unit Price</p>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  placeholder="0.00"
                  value={item.unit_price || ''}
                  onChange={(e) => updateRow(i, 'unit_price', parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm text-right"
                />
              </div>
            </div>
            <div className="flex justify-between items-center text-sm pt-1 border-t border-gray-100">
              <span className="text-xs text-gray-400">Amount</span>
              <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
            </div>
          </div>

          {/* Desktop row layout */}
          <div
            className={`hidden sm:grid gap-2 items-center ${
              hideUnit
                ? 'grid-cols-[1fr_80px_110px_110px_36px]'
                : 'grid-cols-[1fr_80px_80px_110px_110px_36px]'
            }`}
          >
            <Input
              placeholder="Service description"
              value={item.description}
              onChange={(e) => updateRow(i, 'description', e.target.value)}
              className="h-9 text-sm"
            />
            <Input
              type="number"
              min={0}
              step="any"
              placeholder="1"
              value={item.quantity || ''}
              onChange={(e) => updateRow(i, 'quantity', parseFloat(e.target.value) || 0)}
              className="h-9 text-sm text-center"
            />
            {!hideUnit && (
              <Input
                placeholder="ea"
                value={item.unit}
                onChange={(e) => updateRow(i, 'unit', e.target.value)}
                className="h-9 text-sm text-center"
              />
            )}
            <Input
              type="number"
              min={0}
              step="any"
              placeholder="0.00"
              value={item.unit_price || ''}
              onChange={(e) => updateRow(i, 'unit_price', parseFloat(e.target.value) || 0)}
              className="h-9 text-sm text-right"
            />
            <div className="h-9 flex items-center justify-end text-sm font-medium text-gray-900">
              {formatCurrency(item.amount)}
            </div>
            <button
              type="button"
              onClick={() => removeRow(i)}
              disabled={items.length === 1}
              className="flex items-center justify-center w-8 h-8 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addRow} className="mt-1">
        <Plus className="w-4 h-4" />Add Line Item
      </Button>

      {/* Totals */}
      <div className="mt-4 border-t border-gray-100 pt-4 space-y-2 max-w-xs ml-auto">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm text-gray-600">
          <label htmlFor="tax_pct" className="whitespace-nowrap">Tax (%)</label>
          <div className="flex items-center gap-2">
            <Input
              id="tax_pct"
              name="tax"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={tax}
              onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
              className="h-8 w-20 text-sm text-right"
            />
            <span className="text-gray-500 w-24 text-right">{formatCurrency(taxAmount)}</span>
          </div>
        </div>
        <div className="flex justify-between text-sm font-semibold text-gray-900 pt-2 border-t border-gray-100">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}

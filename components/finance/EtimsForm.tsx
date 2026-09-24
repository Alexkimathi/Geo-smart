'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, FileText } from 'lucide-react'
import type { EtimsFormState } from '@/app/(dashboard)/finance/etims/actions'
import type { EtimsDocument, EtimsLineItem, EtimsRate, Client, LineItem } from '@/types/database'

type ClientOption = Pick<Client, 'id' | 'name' | 'company' | 'pin'>

type InvoiceOption = {
  id: string
  doc_no: string
  client_id: string | null
  line_items: LineItem[]
  clients: Pick<Client, 'id' | 'name' | 'pin'> | null
}

interface Props {
  clients: ClientOption[]
  invoices?: InvoiceOption[]
  action: (prev: EtimsFormState, formData: FormData) => Promise<EtimsFormState>
  prefill?: EtimsDocument | null
  submitLabel?: string
}

const RATE_OPTIONS: EtimsRate[] = ['NV', '16%', '0%', 'Ex.']

function calcAmounts(qty: number, unitPrice: number, rate: string) {
  const base = qty * unitPrice
  if (rate === '16%') {
    const tax = base * 0.16
    return { amt_excl_tax: base, tax_amt: tax, amt_incl_tax: base + tax }
  }
  return { amt_excl_tax: base, tax_amt: 0, amt_incl_tax: base }
}

function defaultItem(): EtimsLineItem {
  return { item_code: '', description: '', qty: 1, unit_price: 0, rate: '16%', amt_excl_tax: 0, tax_amt: 0, amt_incl_tax: 0 }
}

function invoiceLineToEtims(line: LineItem): EtimsLineItem {
  const qty = line.quantity
  const unit_price = line.unit_price
  const rate: EtimsRate = '16%'
  const { amt_excl_tax, tax_amt, amt_incl_tax } = calcAmounts(qty, unit_price, rate)
  return { item_code: '', description: line.description, qty, unit_price, rate, amt_excl_tax, tax_amt, amt_incl_tax }
}

function fmt(n: number) {
  return n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function EtimsForm({ clients, invoices = [], action, prefill, submitLabel = 'Save Document' }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})
  const [items, setItems] = useState<EtimsLineItem[]>(() =>
    prefill?.line_items?.length ? prefill.line_items : [defaultItem()]
  )
  const [buyerPin, setBuyerPin] = useState(prefill?.buyer_pin ?? '')
  const [buyerName, setBuyerName] = useState(prefill?.buyer_name ?? '')
  const [selectedClientId, setSelectedClientId] = useState(prefill?.client_id ?? '')
  const [importedInvoiceId, setImportedInvoiceId] = useState('')

  function handleImportInvoice(invoiceId: string) {
    setImportedInvoiceId(invoiceId)
    if (!invoiceId) return
    const inv = invoices.find(i => i.id === invoiceId)
    if (!inv) return
    // Pre-fill buyer from client linked to the invoice
    if (inv.clients) {
      setBuyerPin(inv.clients.pin ?? '')
      setBuyerName(inv.clients.name)
      setSelectedClientId(inv.clients.id)
    }
    // Convert invoice line items to eTIMS line items
    if (inv.line_items?.length) {
      setItems(inv.line_items.map(invoiceLineToEtims))
    }
  }

  useEffect(() => {
    if (state.success) {
      router.push(`/finance/etims/${state.docId}`)
    }
  }, [state.success, state.docId, router])

  function updateItem(index: number, field: keyof EtimsLineItem, value: string | number) {
    setItems(prev => {
      const next = [...prev]
      const cur = next[index]
      const updated = { ...cur, [field]: value }
      const qty = field === 'qty' ? Number(value) : Number(cur.qty)
      const unitPrice = field === 'unit_price' ? Number(value) : Number(cur.unit_price)
      const rate = field === 'rate' ? String(value) : cur.rate
      const { amt_excl_tax, tax_amt, amt_incl_tax } = calcAmounts(qty, unitPrice, rate)
      next[index] = { ...updated, amt_excl_tax, tax_amt, amt_incl_tax }
      return next
    })
  }

  function handleClientChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const clientId = e.target.value
    setSelectedClientId(clientId)
    if (!clientId) return
    const client = clients.find(c => c.id === clientId)
    if (client) {
      setBuyerPin(client.pin ?? '')
      setBuyerName(client.name)
    }
  }

  // Tax summary grouping
  const taxGroups: Record<string, { taxable: number; tax: number; total: number }> = {}
  for (const item of items) {
    if (!taxGroups[item.rate]) taxGroups[item.rate] = { taxable: 0, tax: 0, total: 0 }
    taxGroups[item.rate].taxable += item.amt_excl_tax
    taxGroups[item.rate].tax += item.tax_amt
    taxGroups[item.rate].total += item.amt_incl_tax
  }
  const grandTotals = Object.values(taxGroups).reduce(
    (acc, v) => ({ taxable: acc.taxable + v.taxable, tax: acc.tax + v.tax, total: acc.total + v.total }),
    { taxable: 0, tax: 0, total: 0 }
  )

  const defaultDate = prefill?.invoice_date
    ? new Date(prefill.invoice_date).toISOString().slice(0, 16)
    : new Date().toISOString().slice(0, 16)

  return (
    <form action={formAction} className="space-y-8">
      {/* Serialised line items — read by the server action */}
      <input type="hidden" name="line_items" value={JSON.stringify(items)} />

      {/* ── Import from Invoice ─────────────────────────── */}
      {invoices.length > 0 && (
        <section className="bg-blue-50 rounded-xl border border-blue-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-blue-800">Import from Existing Invoice</h3>
          </div>
          <p className="text-xs text-blue-600 mb-3">
            Select an invoice to pre-fill the buyer and line items. You can edit or add items after importing.
          </p>
          <select
            value={importedInvoiceId}
            onChange={e => handleImportInvoice(e.target.value)}
            className="flex h-9 w-full max-w-sm rounded-md border border-blue-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Select invoice to import —</option>
            {invoices.map(inv => (
              <option key={inv.id} value={inv.id}>
                {inv.doc_no}{inv.clients ? ` — ${inv.clients.name}` : ''}
              </option>
            ))}
          </select>
          {importedInvoiceId && (
            <p className="mt-2 text-xs text-blue-700">
              Imported {items.length} line item{items.length !== 1 ? 's' : ''}. Edit below or add more.
            </p>
          )}
        </section>
      )}

      {/* ── Invoice Info ───────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Invoice Info</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="invoice_no">Invoice No *</Label>
            <Input id="invoice_no" name="invoice_no" required placeholder="e.g. INV-2024-001" defaultValue={prefill?.invoice_no ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invoice_date">Date &amp; Time *</Label>
            <Input id="invoice_date" name="invoice_date" type="datetime-local" required defaultValue={defaultDate} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <select name="status" id="status" defaultValue={prefill?.status ?? 'Draft'}
              className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="Draft">Draft</option>
              <option value="Final">Final</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── Invoice From ───────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Invoice From (Seller)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="seller_pin">Seller PIN *</Label>
            <Input id="seller_pin" name="seller_pin" required defaultValue={prefill?.seller_pin ?? 'P051695050L'} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seller_name">Seller Name *</Label>
            <Input id="seller_name" name="seller_name" required defaultValue={prefill?.seller_name ?? 'GEO-SMART ENGINEERING REAL ESTATE CONTRACTORS LTD'} />
          </div>
        </div>
      </section>

      {/* ── Invoice To ─────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Invoice To (Buyer)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="client_id">Client (optional — pre-fills PIN &amp; name)</Label>
            <select id="client_id" name="client_id" onChange={handleClientChange}
              value={selectedClientId}
              className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Select client to pre-fill —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.company ? ` (${c.company})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="buyer_pin">Buyer PIN</Label>
            <Input
              id="buyer_pin" name="buyer_pin"
              placeholder="e.g. A000000000B"
              value={buyerPin}
              onChange={e => setBuyerPin(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="buyer_name">Buyer Name *</Label>
            <Input
              id="buyer_name" name="buyer_name" required
              placeholder="e.g. ABC Company Ltd"
              value={buyerName}
              onChange={e => setBuyerName(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ── Line Items ─────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Line Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Item Code</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Description</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Qty</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Unit Price</th>
                <th className="text-center px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Rate</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Excl. Tax</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Tax Amt</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Incl. Tax</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, i) => (
                <tr key={i}>
                  <td className="px-2 py-1.5">
                    <input type="text" value={item.item_code}
                      onChange={e => updateItem(i, 'item_code', e.target.value)}
                      placeholder="Code"
                      className="w-24 h-8 rounded border border-gray-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-2 py-1.5 min-w-[160px]">
                    <input type="text" value={item.description}
                      onChange={e => updateItem(i, 'description', e.target.value)}
                      placeholder="Description"
                      className="w-full h-8 rounded border border-gray-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" value={item.qty} min={0} step="any"
                      onChange={e => updateItem(i, 'qty', parseFloat(e.target.value) || 0)}
                      className="w-20 h-8 rounded border border-gray-200 px-2 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" value={item.unit_price} min={0} step="any"
                      onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-28 h-8 rounded border border-gray-200 px-2 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={item.rate}
                      onChange={e => updateItem(i, 'rate', e.target.value)}
                      className="h-8 rounded border border-gray-200 px-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                      {RATE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-1.5 text-right text-gray-600 text-xs tabular-nums">{fmt(item.amt_excl_tax)}</td>
                  <td className="px-3 py-1.5 text-right text-gray-600 text-xs tabular-nums">{fmt(item.tax_amt)}</td>
                  <td className="px-3 py-1.5 text-right font-medium text-gray-900 text-xs tabular-nums">{fmt(item.amt_incl_tax)}</td>
                  <td className="px-2 py-1.5">
                    <button type="button" onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => setItems(prev => [...prev, defaultItem()])}
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors">
          <Plus className="w-4 h-4" />Add item
        </button>
      </section>

      {/* ── Tax Summary (preview) ──────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Tax Summary (auto-calculated)</h3>
        <div className="overflow-x-auto">
          <table className="text-sm border border-gray-200 rounded w-full max-w-xl">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Tax Rate</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Taxable Amt</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Tax Amt</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Total Amt</th>
              </tr>
            </thead>
            <tbody>
              {(['16%', '0%', 'Ex.', 'NV'] as EtimsRate[]).map(rate => {
                const g = taxGroups[rate]
                if (!g || g.total === 0) return null
                return (
                  <tr key={rate} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-medium">{rate}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(g.taxable)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(g.tax)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(g.total)}</td>
                  </tr>
                )
              })}
              <tr className="border-t-2 border-gray-300 font-semibold bg-gray-50">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmt(grandTotals.taxable)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmt(grandTotals.tax)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmt(grandTotals.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── SCU Information ────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">SCU Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="scu_id">SCU ID</Label>
            <Input id="scu_id" name="scu_id" placeholder="e.g. SCU001" defaultValue={prefill?.scu_id ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu_invoice_no">CU Invoice No.</Label>
            <Input id="cu_invoice_no" name="cu_invoice_no" placeholder="Can mirror Invoice No" defaultValue={prefill?.cu_invoice_no ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="internal_data">Internal Data</Label>
            <Input id="internal_data" name="internal_data" placeholder="Internal data string" defaultValue={prefill?.internal_data ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="receipt_signature">Receipt Signature</Label>
            <Input id="receipt_signature" name="receipt_signature" placeholder="Receipt signature" defaultValue={prefill?.receipt_signature ?? ''} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="qr_code_data">QR Code Data</Label>
            <Input id="qr_code_data" name="qr_code_data" placeholder="String to encode in QR code" defaultValue={prefill?.qr_code_data ?? ''} />
          </div>
        </div>
      </section>

      {state.error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

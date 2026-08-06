import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Pencil, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { MaintenanceLogForm } from '@/components/equipment/MaintenanceLogForm'
import { DeleteEquipmentButton } from '@/components/equipment/DeleteEquipmentButton'
import type { EquipmentWithUser, MaintenanceLog, Profile } from '@/types/database'

const TYPE_LABELS: Record<string, string> = {
  total_station: 'Total Station',
  gps: 'GPS Receiver',
  level: 'Level',
  drone: 'Drone',
  vehicle: 'Vehicle',
  material: 'Material',
  tool: 'Tool',
  other: 'Other',
}

const CONDITION_COLORS: Record<string, 'green' | 'yellow' | 'red' | 'orange' | 'gray'> = {
  good: 'green',
  fair: 'yellow',
  poor: 'red',
  under_maintenance: 'orange',
  retired: 'gray',
}

const CONDITION_LABELS: Record<string, string> = {
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  under_maintenance: 'Under Maintenance',
  retired: 'Retired',
}

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = createServiceClient()

  const [{ data: item }, { data: logs }] = await Promise.all([
    db
      .from('equipment')
      .select('*, profiles(full_name)')
      .eq('id', id)
      .single() as unknown as Promise<{ data: EquipmentWithUser | null }>,
    db
      .from('maintenance_logs')
      .select('*')
      .eq('equipment_id', id)
      .order('date', { ascending: false }) as unknown as Promise<{ data: MaintenanceLog[] | null }>,
  ])

  if (!item) notFound()

  const isLow = item.stock_qty < item.min_stock_qty

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <Link href="/equipment" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" />Back to Equipment
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
            <Badge variant={CONDITION_COLORS[item.condition] ?? 'gray'}>
              {CONDITION_LABELS[item.condition] ?? item.condition}
            </Badge>
          </div>
          <p className="text-sm text-gray-500">{TYPE_LABELS[item.type] ?? item.type}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/equipment/${id}/edit`}
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200 transition-colors"
          >
            <Pencil className="w-4 h-4" />Edit
          </Link>
          <DeleteEquipmentButton equipmentId={id} name={item.name} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Details</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Serial Number</dt>
                <dd className="text-sm font-mono font-medium text-gray-900 mt-1">{item.serial_no ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Type</dt>
                <dd className="text-sm font-medium text-gray-900 mt-1">{TYPE_LABELS[item.type] ?? item.type}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Purchase Date</dt>
                <dd className="text-sm text-gray-700 mt-1">{formatDate(item.purchase_date)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Last Calibration</dt>
                <dd className="text-sm text-gray-700 mt-1">{formatDate(item.last_calibration_date)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Stock Qty</dt>
                <dd className={`text-sm font-medium mt-1 ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                  {item.stock_qty} {isLow && <span className="text-xs">(min: {item.min_stock_qty})</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Assigned To</dt>
                <dd className="text-sm text-gray-700 mt-1">{item.profiles?.full_name ?? 'Unassigned'}</dd>
              </div>
              {item.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-gray-400 uppercase tracking-wide">Notes</dt>
                  <dd className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{item.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Maintenance Log */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-gray-400" />Maintenance Log
            </h2>

            {logs && logs.length > 0 ? (
              <div className="space-y-3 mb-5">
                {logs.map((log) => (
                  <div key={log.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{formatDate(log.date)}</span>
                      {log.next_due_date && (
                        <span className="text-xs text-orange-600 font-medium">
                          Next due: {formatDate(log.next_due_date)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{log.description}</p>
                    {log.done_by && (
                      <p className="text-xs text-gray-400 mt-1">By: {log.done_by}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-5">No maintenance records yet</p>
            )}

            {/* Add Maintenance Form */}
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Add Maintenance Record</h3>
              <MaintenanceLogForm equipmentId={id} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Status</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Condition</dt>
                <dd className="mt-1">
                  <Badge variant={CONDITION_COLORS[item.condition] ?? 'gray'}>
                    {CONDITION_LABELS[item.condition] ?? item.condition}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Stock</dt>
                <dd className={`text-sm font-semibold mt-1 ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                  {item.stock_qty} / min {item.min_stock_qty}
                  {isLow && <span className="ml-1 text-xs font-normal">(Low stock)</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Added</dt>
                <dd className="text-sm text-gray-700 mt-1">{formatDate(item.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Last Updated</dt>
                <dd className="text-sm text-gray-700 mt-1">{formatDate(item.updated_at)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

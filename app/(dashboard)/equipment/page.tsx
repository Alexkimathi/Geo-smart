import { createServiceClient } from '@/lib/supabase/service'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Package, Plus, AlertTriangle, CheckCircle, Users, CalendarClock } from 'lucide-react'
import type { EquipmentWithUser } from '@/types/database'

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

function isCalibrationDue(date: string | null): boolean {
  if (!date) return false
  return new Date(date) < new Date()
}

export default async function EquipmentPage() {
  const db = createServiceClient()

  const { data: equipment } = await db
    .from('equipment')
    .select('*, profiles(full_name)')
    .order('name') as unknown as { data: EquipmentWithUser[] | null }

  const items = equipment ?? []

  const totalAssets = items.length
  const assigned = items.filter((e) => e.assigned_to_user_id).length
  const lowStock = items.filter((e) => e.stock_qty < e.min_stock_qty).length
  const calibrationDue = items.filter((e) => isCalibrationDue(e.last_calibration_date)).length

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipment</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalAssets} assets registered</p>
        </div>
        <Link
          href="/equipment/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />Add Equipment
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Assets</p>
              <p className="text-2xl font-bold text-gray-900">{totalAssets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Assigned</p>
              <p className="text-2xl font-bold text-gray-900">{assigned}</p>
            </div>
          </div>
        </div>

        <div className={`bg-white rounded-xl border p-4 ${lowStock > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${lowStock > 0 ? 'bg-red-100' : 'bg-gray-50'}`}>
              <AlertTriangle className={`w-4 h-4 ${lowStock > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Low Stock</p>
              <p className={`text-2xl font-bold ${lowStock > 0 ? 'text-red-600' : 'text-gray-900'}`}>{lowStock}</p>
            </div>
          </div>
        </div>

        <div className={`bg-white rounded-xl border p-4 ${calibrationDue > 0 ? 'border-orange-200 bg-orange-50' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${calibrationDue > 0 ? 'bg-orange-100' : 'bg-gray-50'}`}>
              <CalendarClock className={`w-4 h-4 ${calibrationDue > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Calibration Due</p>
              <p className={`text-2xl font-bold ${calibrationDue > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{calibrationDue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-lg font-medium">No equipment registered</p>
          <p className="text-sm mt-1">Add your first asset above</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Serial No</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Condition</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned To</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Stock</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Calibration</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => {
                const isLow = item.stock_qty < item.min_stock_qty
                const calDue = isCalibrationDue(item.last_calibration_date)

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50 transition-colors ${isLow ? 'bg-red-50/40' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/equipment/${item.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{TYPE_LABELS[item.type] ?? item.type}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.serial_no ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={CONDITION_COLORS[item.condition] ?? 'gray'}>
                        {CONDITION_LABELS[item.condition] ?? item.condition}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.profiles?.full_name ?? <span className="text-gray-400">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-medium ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                        {item.stock_qty}
                      </span>
                      {isLow && (
                        <AlertTriangle className="w-3 h-3 text-red-500 inline ml-1" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.last_calibration_date ? (
                        <span className={`text-xs flex items-center gap-1 ${calDue ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                          {calDue
                            ? <><AlertTriangle className="w-3 h-3" />Overdue</>
                            : <><CheckCircle className="w-3 h-3 text-emerald-500" />{formatDate(item.last_calibration_date)}</>
                          }
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/equipment/${item.id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

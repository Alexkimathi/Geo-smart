import { createServiceClient } from '@/lib/supabase/service'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ChevronLeft, Package, User, Wrench, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import type { EquipmentWithUser, SurveyJob, ConstructionJob, MaintenanceLog } from '@/types/database'

export const dynamic = 'force-dynamic'

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

export default async function EquipmentReportPage() {
  const db = createServiceClient()

  const [
    { data: equipment },
    { data: surveyJobs },
    { data: constructionJobs },
    { data: maintenanceLogs },
  ] = await Promise.all([
    db
      .from('equipment')
      .select('*, profiles(full_name)')
      .order('name') as unknown as Promise<{ data: EquipmentWithUser[] | null }>,
    db
      .from('survey_jobs')
      .select('id, job_no, site_name, survey_type, status, equipment_ids')
      .eq('is_archived', false) as unknown as Promise<{
        data: Pick<SurveyJob, 'id' | 'job_no' | 'site_name' | 'survey_type' | 'status' | 'equipment_ids'>[] | null
      }>,
    db
      .from('construction_jobs')
      .select('id, job_no, project_name, project_type, status')
      .eq('is_archived', false) as unknown as Promise<{
        data: Pick<ConstructionJob, 'id' | 'job_no' | 'project_name' | 'project_type' | 'status'>[] | null
      }>,
    db
      .from('maintenance_logs')
      .select('*')
      .order('date', { ascending: false }) as unknown as Promise<{ data: MaintenanceLog[] | null }>,
  ])

  const items = equipment ?? []

  // Build a map: equipment_id → active survey jobs that reference it
  const surveyJobsByEquip = new Map<string, typeof surveyJobs>()
  for (const job of surveyJobs ?? []) {
    for (const eid of (job.equipment_ids ?? [])) {
      const existing = surveyJobsByEquip.get(eid) ?? []
      surveyJobsByEquip.set(eid, [...existing, job])
    }
  }

  // Build maintenance logs map: equipment_id → logs
  const logsByEquip = new Map<string, MaintenanceLog[]>()
  for (const log of maintenanceLogs ?? []) {
    const existing = logsByEquip.get(log.equipment_id) ?? []
    logsByEquip.set(log.equipment_id, [...existing, log])
  }

  const totalItems = items.length
  const assigned = items.filter((e) => e.assigned_to_user_id).length
  const activeOnJobs = items.filter((e) => (surveyJobsByEquip.get(e.id) ?? []).length > 0).length
  const calibrationDue = items.filter((e) => isCalibrationDue(e.last_calibration_date)).length

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/equipment" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ChevronLeft className="w-4 h-4" />Back to Equipment
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Equipment Utilization Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">Current assignments, active jobs, and maintenance history</p>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Assets</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
          <p className="text-xs text-gray-400 mt-1">Equipment items</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <User className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{assigned}</p>
          <p className="text-xs text-gray-400 mt-1">To staff members</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-violet-600" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active on Jobs</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{activeOnJobs}</p>
          <p className="text-xs text-gray-400 mt-1">Linked to active jobs</p>
        </div>

        <div className={`bg-white border rounded-xl p-4 ${calibrationDue > 0 ? 'border-red-200' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${calibrationDue > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
              <AlertTriangle className={`w-4 h-4 ${calibrationDue > 0 ? 'text-red-500' : 'text-gray-400'}`} />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Calibration Due</p>
          </div>
          <p className={`text-2xl font-bold ${calibrationDue > 0 ? 'text-red-600' : 'text-gray-900'}`}>{calibrationDue}</p>
          <p className="text-xs text-gray-400 mt-1">Need attention</p>
        </div>
      </div>

      {/* Equipment Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto mb-8">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Equipment Register</h2>
          <p className="text-sm text-gray-500 mt-0.5">All equipment with current assignment and job utilization</p>
        </div>

        {items.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No equipment found</p>
          </div>
        ) : (
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Equipment</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Condition</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned To</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Active Jobs</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Calibration</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((equip) => {
                const activeJobs = surveyJobsByEquip.get(equip.id) ?? []
                const calDue = isCalibrationDue(equip.last_calibration_date)
                const lowStock = equip.stock_qty < equip.min_stock_qty
                return (
                  <tr key={equip.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/equipment/${equip.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {equip.name}
                      </Link>
                      {equip.serial_no && (
                        <p className="text-xs text-gray-400 font-mono mt-0.5">S/N: {equip.serial_no}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {TYPE_LABELS[equip.type] ?? equip.type}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={CONDITION_COLORS[equip.condition] ?? 'gray'}>
                        {CONDITION_LABELS[equip.condition] ?? equip.condition}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {equip.profiles?.full_name ? (
                        <span className="text-gray-900 font-medium">{equip.profiles.full_name}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {activeJobs.length > 0 ? (
                        <div className="space-y-0.5">
                          {activeJobs.map((j) => (
                            <div key={j.id}>
                              <Link href={`/jobs/survey/${j.id}`}
                                className="text-xs text-blue-600 hover:underline font-mono">
                                {j.job_no}
                              </Link>
                              <span className="text-xs text-gray-400 ml-1 truncate">{j.site_name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {equip.last_calibration_date ? (
                        <div>
                          <span className={`text-xs ${calDue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                            {formatDate(equip.last_calibration_date)}
                          </span>
                          {calDue && (
                            <p className="text-xs text-red-500 flex items-center gap-0.5 mt-0.5">
                              <AlertTriangle className="w-3 h-3" />Overdue
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Not recorded</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${lowStock ? 'text-red-600' : 'text-gray-900'}`}>
                        {equip.stock_qty}
                      </span>
                      <span className="text-xs text-gray-400">/{equip.min_stock_qty} min</span>
                      {lowStock && (
                        <p className="text-xs text-red-500 mt-0.5">Low stock</p>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Maintenance History */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Maintenance History</h2>
          <p className="text-sm text-gray-500 mt-0.5">Logged maintenance and calibration events</p>
        </div>

        {(maintenanceLogs ?? []).length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
            <Wrench className="w-6 h-6 mx-auto mb-2 text-gray-300" />
            <p className="text-gray-500 font-medium">No maintenance logs recorded</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Equipment</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Done By</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Next Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(maintenanceLogs ?? []).map((log) => {
                  const equip = items.find((e) => e.id === log.equipment_id)
                  const nextDuePast = log.next_due_date && new Date(log.next_due_date) < new Date()
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {equip ? (
                          <Link href={`/equipment/${equip.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                            {equip.name}
                          </Link>
                        ) : (
                          <span className="text-gray-400 text-xs font-mono">{log.equipment_id.slice(0, 8)}…</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(log.date)}</td>
                      <td className="px-4 py-3 text-gray-700">{log.description}</td>
                      <td className="px-4 py-3 text-gray-600">{log.done_by ?? '—'}</td>
                      <td className="px-4 py-3">
                        {log.next_due_date ? (
                          <div className="flex items-center gap-1">
                            {nextDuePast && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                            <span className={nextDuePast ? 'text-red-600 font-medium' : 'text-gray-600'}>
                              {formatDate(log.next_due_date)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

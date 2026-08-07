import { formatDate } from '@/lib/utils'
import type { TimesheetWithProfile } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { DeleteTimesheetButton } from './DeleteTimesheetButton'
import type { JobOption } from '@/app/(dashboard)/timesheets/page'

interface Props {
  timesheets: TimesheetWithProfile[]
  jobOptions: JobOption[]
  showStaffColumn: boolean
  canDelete: boolean
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
}

export function TimesheetTable({ timesheets, jobOptions, showStaffColumn, canDelete }: Props) {
  const jobMap = new Map(jobOptions.map((j) => [j.id, j.label]))

  if (timesheets.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg font-medium">No timesheet entries yet</p>
        <p className="text-sm mt-1">Clock in to start tracking time on a job</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Date
            </th>
            {showStaffColumn && (
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Staff
              </th>
            )}
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Job
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Clock In
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Clock Out
            </th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Hours
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Notes
            </th>
            {canDelete && <th className="w-10 px-4 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {timesheets.map((ts) => {
            const isActive = !!ts.clock_in_time && !ts.clock_out_time
            const jobLabel = ts.job_id ? (jobMap.get(ts.job_id) ?? ts.job_type) : ts.job_type ?? '—'

            return (
              <tr key={ts.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {formatDate(ts.date)}
                </td>

                {showStaffColumn && (
                  <td className="px-4 py-3 text-gray-900">
                    {ts.profiles?.full_name ?? '—'}
                  </td>
                )}

                <td className="px-4 py-3 max-w-[200px]">
                  <span className="text-gray-900 text-xs truncate block" title={jobLabel ?? undefined}>
                    {jobLabel}
                  </span>
                  <span className="text-xs text-gray-400 uppercase">{ts.job_type}</span>
                </td>

                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                  {formatTime(ts.clock_in_time)}
                  {ts.clock_in_lat != null && (
                    <span
                      className="ml-1 text-xs text-gray-400"
                      title={`${ts.clock_in_lat.toFixed(5)}, ${ts.clock_in_lng?.toFixed(5)}`}
                    >
                      📍
                    </span>
                  )}
                </td>

                <td className="px-4 py-3 whitespace-nowrap">
                  {isActive ? (
                    <Badge variant="yellow">Active</Badge>
                  ) : (
                    <>
                      {formatTime(ts.clock_out_time)}
                      {ts.clock_out_lat != null && (
                        <span
                          className="ml-1 text-xs text-gray-400"
                          title={`${ts.clock_out_lat.toFixed(5)}, ${ts.clock_out_lng?.toFixed(5)}`}
                        >
                          📍
                        </span>
                      )}
                    </>
                  )}
                </td>

                <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                  {ts.hours != null ? `${ts.hours.toFixed(1)}h` : '—'}
                </td>

                <td className="px-4 py-3 text-gray-500 max-w-xs">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{ts.notes ?? '—'}</span>
                    {ts.site_photo_url && (
                      <a
                        href={ts.site_photo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline text-xs shrink-0"
                      >
                        Photo
                      </a>
                    )}
                  </div>
                </td>

                {canDelete && (
                  <td className="px-4 py-3">
                    <DeleteTimesheetButton id={ts.id} />
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

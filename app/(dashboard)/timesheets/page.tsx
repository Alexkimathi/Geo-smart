import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { TimesheetWithProfile, Profile } from '@/types/database'
import { TimesheetTable } from '@/components/timesheets/TimesheetTable'
import { AddManualTimesheetForm } from '@/components/timesheets/AddManualTimesheetForm'

export type JobOption = {
  id: string
  label: string
  job_type: 'survey' | 'construction'
}

export default async function TimesheetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()

  const [
    { data: profile },
    { data: surveyJobs },
    { data: constructionJobs },
  ] = await Promise.all([
    db.from('profiles').select('*').eq('id', user.id).single(),
    db
      .from('survey_jobs')
      .select('id, job_no, site_name')
      .eq('is_archived', false)
      .order('created_at', { ascending: false }),
    db
      .from('construction_jobs')
      .select('id, job_no, project_name')
      .eq('is_archived', false)
      .order('created_at', { ascending: false }),
  ])

  if (!profile) redirect('/login')

  const isManager = ['admin', 'manager'].includes(profile.role)
  const isAccountant = profile.role === 'accountant'
  const isFieldStaff = !isManager && !isAccountant

  // Fetch timesheets
  let timesheets: TimesheetWithProfile[] = []
  if (isManager || isAccountant) {
    const { data } = await db
      .from('timesheets')
      .select('*, profiles(full_name, role)')
      .order('date', { ascending: false })
      .order('clock_in_time', { ascending: false })
      .limit(200)
    timesheets = (data as TimesheetWithProfile[]) ?? []
  } else {
    const { data } = await db
      .from('timesheets')
      .select('*, profiles(full_name, role)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('clock_in_time', { ascending: false })
      .limit(100)
    timesheets = (data as TimesheetWithProfile[]) ?? []
  }

  // Active session for field staff (any open timesheet today)
  const today = new Date().toISOString().split('T')[0]
  const activeSession = isFieldStaff
    ? (timesheets.find((t) => t.date === today && !!t.clock_in_time && !t.clock_out_time) ?? null)
    : null

  // Job options for lookup + manager manual-entry form
  const jobOptions: JobOption[] = [
    ...(surveyJobs ?? []).map((j) => ({
      id: j.id,
      label: `${j.job_no} — ${j.site_name}`,
      job_type: 'survey' as const,
    })),
    ...(constructionJobs ?? []).map((j) => ({
      id: j.id,
      label: `${j.job_no} — ${j.project_name}`,
      job_type: 'construction' as const,
    })),
  ]

  // Job label lookup for active session link
  const activeJobLabel = activeSession?.job_id
    ? (jobOptions.find((j) => j.id === activeSession.job_id)?.label ?? null)
    : null

  // Staff profiles for manager manual-entry form
  let staffProfiles: Pick<Profile, 'id' | 'full_name' | 'role'>[] = []
  if (isManager) {
    const { data } = await db.from('profiles').select('id, full_name, role').order('full_name')
    staffProfiles = data ?? []
  }

  const totalHours = timesheets.reduce((sum, t) => sum + (t.hours ?? 0), 0)
  const activeCount = timesheets.filter((t) => !!t.clock_in_time && !t.clock_out_time).length

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timesheets</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isManager || isAccountant
              ? `${timesheets.length} entries · ${totalHours.toFixed(1)} total hours · ${activeCount} active now`
              : `${timesheets.length} entries · ${totalHours.toFixed(1)} total hours`}
          </p>
        </div>
      </div>

      {/* Field staff: active session banner */}
      {isFieldStaff && activeSession && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-700">You are currently clocked in</p>
              {activeJobLabel && (
                <p className="text-xs text-gray-600 mt-0.5">{activeJobLabel}</p>
              )}
            </div>
          </div>
          {activeSession.job_id && (
            <Link
              href={`/jobs/${activeSession.job_type}/${activeSession.job_id}`}
              className="shrink-0 px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Go to Job → Clock Out
            </Link>
          )}
        </div>
      )}

      {/* Field staff: no active session nudge */}
      {isFieldStaff && !activeSession && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-600">
            Not clocked in.{' '}
            <span className="text-gray-500">Open a job to clock in.</span>
          </p>
        </div>
      )}

      {/* Manager: manual entry form */}
      {isManager && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Add Manual Entry</h2>
          <AddManualTimesheetForm jobs={jobOptions} staffProfiles={staffProfiles} />
        </div>
      )}

      {/* History table */}
      <TimesheetTable
        timesheets={timesheets}
        jobOptions={jobOptions}
        showStaffColumn={isManager || isAccountant}
        canDelete={isManager}
      />
    </div>
  )
}

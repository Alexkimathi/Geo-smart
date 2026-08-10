import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { TimesheetWithProfile, Profile } from '@/types/database'
import { TimesheetTable } from '@/components/timesheets/TimesheetTable'
import { AddManualTimesheetForm } from '@/components/timesheets/AddManualTimesheetForm'
import { Paginator } from '@/components/ui/Paginator'

export type JobOption = {
  id: string
  label: string
  job_type: 'survey' | 'construction'
}

const PAGE_SIZE = 25

function pageHref(p: number) {
  if (p <= 1) return '/timesheets'
  return `/timesheets?page=${p}`
}

export default async function TimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

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

  // Fetch paginated timesheets
  let timesheets: TimesheetWithProfile[] = []
  let totalCount = 0
  if (isManager || isAccountant) {
    const { data, count } = await db
      .from('timesheets')
      .select('*, profiles(full_name, role)', { count: 'exact' })
      .order('date', { ascending: false })
      .order('clock_in_time', { ascending: false })
      .range(from, to) as unknown as { data: TimesheetWithProfile[] | null; count: number | null }
    timesheets = data ?? []
    totalCount = count ?? 0
  } else {
    const { data, count } = await db
      .from('timesheets')
      .select('*, profiles(full_name, role)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('clock_in_time', { ascending: false })
      .range(from, to) as unknown as { data: TimesheetWithProfile[] | null; count: number | null }
    timesheets = data ?? []
    totalCount = count ?? 0
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const currentPage = Math.min(page, totalPages || 1)
  const prevHref = currentPage > 1 ? pageHref(currentPage - 1) : null
  const nextHref = currentPage < totalPages ? pageHref(currentPage + 1) : null

  // Active session for field staff — separate targeted query so banner shows on all pages
  const today = new Date().toISOString().split('T')[0]
  let activeSession: TimesheetWithProfile | null = null
  if (isFieldStaff) {
    const { data: openRows } = await db
      .from('timesheets')
      .select('*, profiles(full_name, role)')
      .eq('user_id', user.id)
      .eq('date', today)
      .not('clock_in_time', 'is', null)
      .is('clock_out_time', null)
      .limit(1) as unknown as { data: TimesheetWithProfile[] | null }
    activeSession = openRows?.[0] ?? null
  }

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
    ? (jobOptions.find((j) => j.id === activeSession!.job_id)?.label ?? null)
    : null

  // Staff profiles for manager manual-entry form
  let staffProfiles: Pick<Profile, 'id' | 'full_name' | 'role'>[] = []
  if (isManager) {
    const { data } = await db.from('profiles').select('id, full_name, role').order('full_name')
    staffProfiles = data ?? []
  }

  const activeCount = timesheets.filter((t) => !!t.clock_in_time && !t.clock_out_time).length

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timesheets</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isManager || isAccountant
              ? `${totalCount} entries · ${activeCount} active now`
              : `${totalCount} entries`}
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

      <Paginator
        page={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        prevHref={prevHref}
        nextHref={nextHref}
      />
    </div>
  )
}

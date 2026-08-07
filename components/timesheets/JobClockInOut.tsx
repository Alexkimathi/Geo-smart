'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { clockInAction, clockOutAction } from '@/app/(dashboard)/timesheets/actions'
import type { Timesheet } from '@/types/database'
import { Clock, ArrowRight } from 'lucide-react'

interface Props {
  jobId: string
  jobType: 'survey' | 'construction'
  userId: string
  openTimesheet: Timesheet | null
  activeJobLabel?: string | null
}

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

async function getGPS(): Promise<GeolocationCoordinates | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      () => resolve(null),
      { timeout: 8000, enableHighAccuracy: true }
    )
  })
}

export function JobClockInOut({ jobId, jobType, userId, openTimesheet, activeJobLabel }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showClockOutForm, setShowClockOutForm] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const photoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!openTimesheet?.clock_in_time) return
    const clockInMs = new Date(openTimesheet.clock_in_time).getTime()
    const tick = () => setElapsed(Date.now() - clockInMs)
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [openTimesheet?.clock_in_time])

  async function handleClockIn() {
    setError(null)
    const coords = await getGPS()
    startTransition(async () => {
      const result = await clockInAction(
        jobType,
        jobId,
        coords?.latitude ?? null,
        coords?.longitude ?? null,
        null
      )
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  async function handleClockOut() {
    if (!openTimesheet) return
    setError(null)

    let photoUrl: string | null = null
    if (photoFile) {
      setUploading(true)
      const supabase = createClient()
      const path = `${userId}/${Date.now()}_${photoFile.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('timesheets')
        .upload(path, photoFile, { upsert: false })
      setUploading(false)
      if (uploadError) { setError(uploadError.message); return }
      const { data: { publicUrl } } = supabase.storage
        .from('timesheets')
        .getPublicUrl(uploadData.path)
      photoUrl = publicUrl
    }

    const coords = await getGPS()
    startTransition(async () => {
      const result = await clockOutAction(
        openTimesheet.id,
        coords?.latitude ?? null,
        coords?.longitude ?? null,
        photoUrl,
        notes || null
      )
      if (result.error) {
        setError(result.error)
      } else {
        setNotes('')
        setPhotoFile(null)
        setShowClockOutForm(false)
        if (photoRef.current) photoRef.current.value = ''
        router.refresh()
      }
    })
  }

  // ── Clocked in (this job or another) ─────────────────────────────
  if (openTimesheet?.clock_in_time && !openTimesheet.clock_out_time) {
    const isSameJob = openTimesheet.job_id === jobId

    // Shared clock-out form used by both states
    const clockOutForm = (
      <>
        {!showClockOutForm ? (
          <button
            onClick={() => setShowClockOutForm(true)}
            className={`w-full py-2 text-white text-sm font-medium rounded-lg transition-colors ${
              isSameJob
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            Clock Out
          </button>
        ) : (
          <div className="space-y-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Work done today (optional)..."
              className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none bg-white ${
                isSameJob ? 'focus:ring-emerald-500' : 'focus:ring-amber-500'
              }`}
            />
            <div>
              <label className="block text-xs text-gray-500 mb-1">Site photo (optional)</label>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                className={`block w-full text-xs text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium border border-gray-200 rounded-lg p-1 ${
                  isSameJob
                    ? 'file:bg-emerald-50 file:text-emerald-700'
                    : 'file:bg-amber-50 file:text-amber-700'
                }`}
              />
            </div>
            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowClockOutForm(false); setError(null) }}
                className="flex-1 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClockOut}
                disabled={isPending || uploading}
                className={`flex-1 py-1.5 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors ${
                  isSameJob
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {uploading ? 'Uploading...' : isPending ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </>
    )

    if (isSameJob) {
      return (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-sm font-semibold text-emerald-700">On Site</span>
            </div>
            <span className="text-xl font-mono font-bold text-emerald-700 tabular-nums">
              {formatDuration(elapsed)}
            </span>
          </div>

          <p className="text-xs text-gray-500 mb-3">
            Clocked in at{' '}
            <span className="font-medium">
              {new Date(openTimesheet.clock_in_time).toLocaleTimeString('en-KE', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {openTimesheet.clock_in_lat != null && (
              <span className="text-emerald-600 ml-1">· GPS ✓</span>
            )}
          </p>

          {clockOutForm}
        </div>
      )
    }

    // Different job — show link to the job where they're clocked in
    const activeJobHref = openTimesheet.job_id
      ? `/jobs/${openTimesheet.job_type}/${openTimesheet.job_id}`
      : null

    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="text-sm font-semibold text-amber-700">Clocked in elsewhere</span>
        </div>
        <p className="text-xs text-gray-600 mb-3">
          You are currently clocked into:<br />
          <span className="font-medium">{activeJobLabel ?? 'another job'}</span>
        </p>
        {activeJobHref ? (
          <Link
            href={activeJobHref}
            className="flex items-center justify-center gap-1.5 w-full py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
          >
            Go to that job to clock out <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <p className="text-xs text-gray-400">Clock out from your active job first.</p>
        )}
      </div>
    )
  }

  // ── Not clocked in ────────────────────────────────────────────────
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-gray-400" />
        <h2 className="font-semibold text-gray-900 text-sm">Attendance</h2>
      </div>
      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 mb-2">{error}</p>
      )}
      <button
        onClick={handleClockIn}
        disabled={isPending}
        className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Getting location...' : 'Clock In'}
      </button>
      <p className="text-xs text-gray-400 text-center mt-1.5">
        GPS location captured automatically
      </p>
    </div>
  )
}

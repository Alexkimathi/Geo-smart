'use client'

import { useState, useEffect, useTransition, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { clockInAction, clockOutAction } from '@/app/(dashboard)/timesheets/actions'
import type { Timesheet } from '@/types/database'
import type { JobOption } from '@/app/(dashboard)/timesheets/page'

interface Props {
  openTimesheet: Timesheet | null
  jobs: JobOption[]
  userId: string
}

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

async function getGPS(): Promise<{ coords: GeolocationCoordinates | null; denied?: boolean }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve({ coords: null }); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ coords: pos.coords }),
      (err) => resolve({ coords: null, denied: err.code === 1 }),
      { timeout: 12000, enableHighAccuracy: false, maximumAge: 60000 }
    )
  })
}

export function ClockInCard({ openTimesheet, jobs, userId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'fetching' | 'ok' | 'unavailable'>('idle')

  // Clock-in form state
  const [jobType, setJobType] = useState<'survey' | 'construction' | ''>('')
  const [jobId, setJobId] = useState('')
  const [notes, setNotes] = useState('')

  // Clock-out form state
  const [outNotes, setOutNotes] = useState(openTimesheet?.notes ?? '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!photoFile) { setPhotoPreview(null); return }
    const url = URL.createObjectURL(photoFile)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

  // Live timer
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!openTimesheet?.clock_in_time) return
    const clockInMs = new Date(openTimesheet.clock_in_time).getTime()
    const tick = () => setElapsed(Date.now() - clockInMs)
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [openTimesheet?.clock_in_time])

  const filteredJobs = jobs.filter((j) => j.job_type === jobType)

  async function handleClockIn() {
    if (!jobType || !jobId) { setError('Please select a job'); return }
    setError(null)
    setGpsStatus('fetching')
    const { coords, denied } = await getGPS()
    if (denied) {
      setGpsStatus('idle')
      setError('Location access is blocked. Please allow location in your browser settings and try again.')
      return
    }
    setGpsStatus(coords ? 'ok' : 'unavailable')
    startTransition(async () => {
      const result = await clockInAction(
        jobType as 'survey' | 'construction',
        jobId,
        coords?.latitude ?? null,
        coords?.longitude ?? null,
        notes || null
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

    setGpsStatus('fetching')
    const { coords, denied } = await getGPS()
    if (denied) {
      setGpsStatus('idle')
      setError('Location access is blocked. Please allow location in your browser settings and try again.')
      return
    }
    setGpsStatus(coords ? 'ok' : 'unavailable')

    startTransition(async () => {
      const result = await clockOutAction(
        openTimesheet.id,
        coords?.latitude ?? null,
        coords?.longitude ?? null,
        photoUrl,
        outNotes || null
      )
      if (result.error) {
        setError(result.error)
      } else {
        setPhotoFile(null)
        setOutNotes('')
        if (photoRef.current) photoRef.current.value = ''
        router.refresh()
      }
    })
  }

  // ── Clocked-in state ──────────────────────────────────────────────
  if (openTimesheet?.clock_in_time && !openTimesheet.clock_out_time) {
    const jobLabel =
      jobs.find((j) => j.id === openTimesheet.job_id)?.label ??
      `${openTimesheet.job_type} job`

    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4 gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-sm font-medium text-emerald-700">Clocked In</span>
            </div>
            <p className="text-gray-900 font-medium truncate">{jobLabel}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              Since{' '}
              {new Date(openTimesheet.clock_in_time).toLocaleTimeString('en-KE', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            {openTimesheet.clock_in_lat != null && (
              <p className="text-xs text-emerald-600 font-mono mt-0.5">
                📍 {openTimesheet.clock_in_lat.toFixed(5)}, {openTimesheet.clock_in_lng?.toFixed(5)}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-mono font-bold text-emerald-700 tabular-nums">
              {formatDuration(elapsed)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={outNotes}
              onChange={(e) => setOutNotes(e.target.value)}
              rows={2}
              placeholder="Add any site notes..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Site Photo (optional)
            </label>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 border border-gray-200 rounded-lg p-1.5 bg-white"
            />
            {photoPreview && (
              <div className="mt-2 relative inline-block">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="h-24 w-auto rounded-lg border border-gray-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => { setPhotoFile(null); if (photoRef.current) photoRef.current.value = '' }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center hover:bg-gray-900"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleClockOut}
            disabled={isPending || uploading || gpsStatus === 'fetching'}
            className="w-full py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading
              ? 'Uploading photo...'
              : gpsStatus === 'fetching'
              ? 'Getting location...'
              : isPending
              ? 'Clocking out...'
              : 'Clock Out'}
          </button>
          {gpsStatus === 'unavailable' && (
            <p className="text-xs text-amber-500 text-center mt-1">
              Location unavailable — entry will be saved without coordinates
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── Not clocked in state ──────────────────────────────────────────
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="font-semibold text-gray-900 mb-4">Clock In</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Job Type *</label>
          <select
            value={jobType}
            onChange={(e) => {
              setJobType(e.target.value as typeof jobType)
              setJobId('')
            }}
            className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Select type —</option>
            <option value="survey">Survey Job</option>
            <option value="construction">Construction Job</option>
          </select>
        </div>

        {jobType && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Job *</label>
            <select
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Select job —</option>
              {filteredJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.label}
                </option>
              ))}
              {filteredJobs.length === 0 && (
                <option disabled>No active {jobType} jobs</option>
              )}
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Notes (optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Planned work for today..."
            className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      <div className="mt-4">
        <button
          onClick={handleClockIn}
          disabled={isPending || gpsStatus === 'fetching' || !jobId}
          className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {gpsStatus === 'fetching' ? 'Getting location...' : isPending ? 'Clocking in...' : 'Clock In'}
        </button>
        <p className="text-xs text-center mt-2">
          {gpsStatus === 'idle' && <span className="text-gray-400">GPS location will be captured automatically</span>}
          {gpsStatus === 'fetching' && <span className="text-blue-500">Acquiring GPS coordinates...</span>}
          {gpsStatus === 'ok' && <span className="text-emerald-600">Location captured</span>}
          {gpsStatus === 'unavailable' && <span className="text-amber-500">Location unavailable — entry will be saved without coordinates</span>}
        </p>
      </div>
    </div>
  )
}

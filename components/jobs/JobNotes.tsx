'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Send, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { getInitials } from '@/lib/utils'
import { addJobNoteAction, deleteJobNoteAction } from '@/app/(dashboard)/jobs/notes-actions'
import type { JobNoteWithProfile } from '@/types/database'

interface Props {
  jobId: string
  jobType: 'survey' | 'construction'
  initialNotes: JobNoteWithProfile[]
  currentUserId: string
  currentUserName: string
  currentUserRole: string
}

export function JobNotes({ jobId, jobType, initialNotes, currentUserId, currentUserName, currentUserRole }: Props) {
  const router = useRouter()
  const [notes, setNotes] = useState(initialNotes)
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Sync when server re-renders with updated data
  useEffect(() => {
    setNotes(initialNotes)
  }, [initialNotes])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed || isPending) return

    // Optimistically add the note immediately so the user sees it right away
    const optimisticNote: JobNoteWithProfile = {
      id: `optimistic-${Date.now()}`,
      job_id: jobId,
      job_type: jobType,
      content: trimmed,
      created_by: currentUserId,
      created_at: new Date().toISOString(),
      profiles: { full_name: currentUserName || 'You' },
    }
    setNotes((prev) => [optimisticNote, ...prev])
    setContent('')
    setError(null)

    startTransition(async () => {
      const result = await addJobNoteAction(jobId, jobType, trimmed)
      if (result.error) {
        // Roll back the optimistic note on error
        setNotes((prev) => prev.filter((n) => n.id !== optimisticNote.id))
        setContent(trimmed)
        setError(result.error)
      } else {
        // Refresh to get the real note (with correct id) from the server
        router.refresh()
      }
    })
  }

  function handleDelete(noteId: string) {
    setDeletingId(noteId)
    startTransition(async () => {
      const result = await deleteJobNoteAction(noteId, jobId, jobType)
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
      setDeletingId(null)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-gray-400" />
        Notes
        {notes.length > 0 && (
          <span className="text-xs font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
            {notes.length}
          </span>
        )}
      </h2>

      {/* Note list */}
      <div className="space-y-3 mb-5">
        {notes.length === 0 ? (
          <p className="text-sm text-gray-400">No notes yet. Add one below.</p>
        ) : (
          notes.map((note) => {
            const isOwn = note.created_by === currentUserId
            const canDelete = isOwn || currentUserRole === 'admin'
            const authorName = note.profiles?.full_name ?? 'Unknown'

            return (
              <div key={note.id} className="flex gap-3 group">
                {/* Avatar */}
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                  {getInitials(authorName)}
                </div>

                {/* Bubble */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-gray-800">{authorName}</span>
                    <span className="text-xs text-gray-400">{formatDate(note.created_at, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(note.id)}
                        disabled={deletingId === note.id}
                        className="ml-auto opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity disabled:opacity-50"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{note.content}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add note form */}
      <form onSubmit={handleSubmit} className="border-t border-gray-100 pt-4">
        {error && (
          <p className="text-xs text-red-600 mb-2">{error}</p>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a note, recommendation, or update..."
            rows={2}
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit(e as unknown as React.FormEvent)
              }
            }}
          />
          <button
            type="submit"
            disabled={isPending || !content.trim()}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            {isPending ? 'Posting...' : 'Post'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Tip: Ctrl+Enter to post</p>
      </form>
    </div>
  )
}

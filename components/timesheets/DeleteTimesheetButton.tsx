'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteTimesheetAction } from '@/app/(dashboard)/timesheets/actions'
import { Trash2 } from 'lucide-react'

interface Props {
  id: string
}

export function DeleteTimesheetButton({ id }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Delete this timesheet entry?')) return
    startTransition(async () => {
      await deleteTimesheetAction(id)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
      title="Delete entry"
    >
      <Trash2 size={14} />
    </button>
  )
}

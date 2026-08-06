'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteEquipmentAction } from '@/app/(dashboard)/equipment/actions'

interface Props {
  equipmentId: string
  name: string
}

export function DeleteEquipmentButton({ equipmentId, name }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteEquipmentAction(equipmentId)
      if (!result.error) router.push('/equipment')
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-md border border-red-200 disabled:opacity-40 transition-colors"
    >
      <Trash2 className="w-4 h-4" />
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  )
}

import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { EquipmentForm } from '@/components/equipment/EquipmentForm'
import { updateEquipmentAction } from '@/app/(dashboard)/equipment/actions'
import type { Equipment, Profile } from '@/types/database'

export default async function EditEquipmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = createServiceClient()

  const [{ data: item }, { data: users }] = await Promise.all([
    db.from('equipment').select('*').eq('id', id).single() as unknown as Promise<{ data: Equipment | null }>,
    db.from('profiles').select('id, full_name, role').order('full_name') as unknown as Promise<{ data: Pick<Profile, 'id' | 'full_name' | 'role'>[] | null }>,
  ])

  if (!item) notFound()

  const boundAction = updateEquipmentAction.bind(null, id)

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <Link href={`/equipment/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" />Back to {item.name}
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Equipment</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <EquipmentForm
          action={boundAction}
          defaultValues={item}
          users={users ?? []}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  )
}

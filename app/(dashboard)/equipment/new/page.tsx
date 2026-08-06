import { createServiceClient } from '@/lib/supabase/service'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { EquipmentForm } from '@/components/equipment/EquipmentForm'
import { createEquipmentAction } from '@/app/(dashboard)/equipment/actions'
import type { Profile } from '@/types/database'

export default async function NewEquipmentPage() {
  const db = createServiceClient()
  const { data: users } = await db
    .from('profiles')
    .select('id, full_name, role')
    .order('full_name') as unknown as { data: Pick<Profile, 'id' | 'full_name' | 'role'>[] | null }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <Link href="/equipment" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" />Back to Equipment
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Equipment</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <EquipmentForm
          action={createEquipmentAction}
          users={users ?? []}
          submitLabel="Add Equipment"
        />
      </div>
    </div>
  )
}

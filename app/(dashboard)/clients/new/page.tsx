import { createClientAction } from '../actions'
import { ClientForm } from '@/components/clients/ClientForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function NewClientPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" />
        Back to Clients
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Client</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <ClientForm action={createClientAction} />
      </div>
    </div>
  )
}

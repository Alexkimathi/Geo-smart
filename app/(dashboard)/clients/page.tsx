import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Paginator } from '@/components/ui/Paginator'
import { Plus, Search, Phone, Mail, MapPin } from 'lucide-react'
import type { Client } from '@/types/database'

const PAGE_SIZE = 12

function pageHref(q: string | undefined, p: number) {
  const sp = new URLSearchParams()
  if (q) sp.set('q', q)
  if (p > 1) sp.set('page', String(p))
  const qs = sp.toString()
  return `/clients${qs ? `?${qs}` : ''}`
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = createServiceClient()

  let query = supabase
    .from('clients')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (q) {
    query = query.or(`name.ilike.%${q}%,company.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
  }

  query = query.range(from, to)

  const { data: clients, count } = await query as unknown as { data: Client[] | null; count: number | null }

  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const currentPage = Math.min(page, totalPages || 1)

  const prevHref = currentPage > 1 ? pageHref(q, currentPage - 1) : null
  const nextHref = currentPage < totalPages ? pageHref(q, currentPage + 1) : null

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalCount} total clients</p>
        </div>
        <Link href="/clients/new">
          <Button>
            <Plus className="w-4 h-4" />
            Add Client
          </Button>
        </Link>
      </div>

      {/* Search */}
      <form method="GET" className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search clients..."
            className="w-full pl-9 pr-4 h-10 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </form>

      {/* Clients grid */}
      {!clients || clients.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No clients yet</p>
          <p className="text-sm mt-1">Add your first client to get started</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{client.name}</h3>
                    {client.company && (
                      <p className="text-sm text-gray-500">{client.company}</p>
                    )}
                  </div>
                  {client.pin && (
                    <Badge variant="gray" className="text-xs shrink-0">
                      {client.pin}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5">
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      {client.phone}
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      {client.email}
                    </div>
                  )}
                  {client.site_location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      {client.site_location}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <Paginator
            page={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            prevHref={prevHref}
            nextHref={nextHref}
          />
        </>
      )}
    </div>
  )
}

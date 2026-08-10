import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginatorProps {
  page: number
  totalPages: number
  totalCount: number
  pageSize: number
  prevHref: string | null
  nextHref: string | null
}

export function Paginator({
  page,
  totalPages,
  totalCount,
  pageSize,
  prevHref,
  nextHref,
}: PaginatorProps) {
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  return (
    <div className="flex items-center justify-between px-1 pt-4">
      <p className="text-xs text-gray-500">
        Showing <span className="font-medium text-gray-700">{from}–{to}</span> of{' '}
        <span className="font-medium text-gray-700">{totalCount}</span>
      </p>

      <div className="flex items-center gap-1">
        {prevHref ? (
          <Link
            href={prevHref}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />Prev
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-300 border border-gray-100 rounded-lg cursor-not-allowed">
            <ChevronLeft className="w-3.5 h-3.5" />Prev
          </span>
        )}

        <span className="px-3 py-1.5 text-xs text-gray-600 font-medium">
          {page} / {totalPages}
        </span>

        {nextHref ? (
          <Link
            href={nextHref}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Next<ChevronRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-300 border border-gray-100 rounded-lg cursor-not-allowed">
            Next<ChevronRight className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  )
}

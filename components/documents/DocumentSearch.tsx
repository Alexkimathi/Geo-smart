'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

interface Suggestion {
  id: string
  name: string
  category: string
}

interface Props {
  suggestions: Suggestion[]
  initialQuery: string
}

export function DocumentSearch({ suggestions, initialQuery }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim().length > 0
    ? suggestions.filter((s) =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.category.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : []

  function applySearch(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value.trim()) {
      params.set('q', value.trim())
    } else {
      params.delete('q')
    }
    router.push(`${pathname}?${params.toString()}`)
    setOpen(false)
  }

  function handleSelect(suggestion: Suggestion) {
    setQuery(suggestion.name)
    applySearch(suggestion.name)
  }

  function handleClear() {
    setQuery('')
    applySearch('')
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter') applySearch(query) }}
          placeholder="Search documents..."
          className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 flex items-center justify-between gap-3"
              >
                <span className="text-gray-900 truncate">{s.name}</span>
                <span className="text-xs text-gray-400 shrink-0">{s.category}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

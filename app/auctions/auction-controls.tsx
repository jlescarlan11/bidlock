'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useRef, useEffect, useState } from 'react'

type SortOption = 'ending_soon' | 'newest' | 'lowest_bid' | 'highest_bid'

export default function AuctionControls({
  q,
  sort,
  count,
}: {
  q: string
  sort: SortOption
  count: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [inputValue, setInputValue] = useState(q)

  function pushParams(updates: Partial<{ q: string; sort: string; page: string }>) {
    const params = new URLSearchParams()
    const newQ = 'q' in updates ? (updates.q ?? '') : q
    const newSort = 'sort' in updates ? (updates.sort ?? 'ending_soon') : sort
    if (newQ) params.set('q', newQ)
    if (newSort !== 'ending_soon') params.set('sort', newSort)
    params.set('page', updates.page ?? '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleSearch(value: string) {
    setInputValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => pushParams({ q: value, page: '1' }), 300)
  }

  useEffect(() => {
    if (!debounceRef.current) setInputValue(q)
  }, [q])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className="mb-8">
      {/* Header row: live badge + heading + sort */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <h1 className="display text-5xl lg:text-6xl font-extrabold leading-[0.95]">
            What&apos;s on the block.
          </h1>
          <p className="text-base text-gray-600 mt-3 max-w-xl">
            Bid early. Bid late. Just don&apos;t bid more than it&apos;s worth to you.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="sort" className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            Sort
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => pushParams({ sort: e.target.value, page: '1' })}
            className="select-chevron h-10 rounded-full border-2 border-gray-900 bg-white pl-4 pr-9 text-sm font-semibold text-gray-900 cursor-pointer focus:outline-none focus:ring-4 focus:ring-orange-200"
          >
            <option value="ending_soon">Ending soon</option>
            <option value="newest">Newest first</option>
            <option value="lowest_bid">Lowest bid</option>
            <option value="highest_bid">Highest bid</option>
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
          </svg>
          <input
            type="search"
            value={inputValue}
            placeholder="Search jackets, phones, cameras…"
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full h-11 pl-11 pr-4 rounded-full border border-gray-300 bg-white text-sm placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-4 focus:ring-orange-100 transition"
          />
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between pb-6 border-b border-gray-900/10">
        <p className="text-sm text-gray-600">
          Showing <span className="font-bold text-gray-900">{count}</span>{' '}
          auction{count !== 1 ? 's' : ''}
          {q && <span className="text-gray-400"> for &ldquo;{q}&rdquo;</span>}
        </p>
        {q && (
          <a href="/auctions" className="text-xs font-semibold text-gray-700 hover:text-gray-900">
            Clear ×
          </a>
        )}
      </div>
    </div>
  )
}

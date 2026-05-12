'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useRef } from 'react'

type SortOption = 'ending_soon' | 'newest' | 'lowest_bid' | 'highest_bid'

export default function AuctionControls({
  q,
  sort,
}: {
  q: string
  sort: SortOption
}) {
  const router = useRouter()
  const pathname = usePathname()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => pushParams({ q: value, page: '1' }), 300)
  }

  return (
    <div className="flex gap-3 items-center">
      <input
        type="search"
        defaultValue={q}
        placeholder="Search auctions…"
        onChange={(e) => handleSearch(e.target.value)}
        className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <select
        value={sort}
        onChange={(e) => pushParams({ sort: e.target.value, page: '1' })}
        className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="ending_soon">Ending soon</option>
        <option value="newest">Newest</option>
        <option value="lowest_bid">Lowest bid</option>
        <option value="highest_bid">Highest bid</option>
      </select>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import Link from 'next/link'
import ListingCard from '@/components/listing-card'
import AuctionControls from './auction-controls'

const PAGE_SIZE = 20

export const metadata = {
  title: 'Live Auctions — BidLock',
}

const SORT_MAP: Record<string, { column: string; ascending: boolean }> = {
  ending_soon: { column: 'ends_at', ascending: true },
  newest:      { column: 'created_at', ascending: false },
  lowest_bid:  { column: 'current_bid', ascending: true },
  highest_bid: { column: 'current_bid', ascending: false },
}

type SearchParams = { q?: string; sort?: string; page?: string }

export default async function AuctionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { q = '', sort = 'ending_soon', page: pageStr = '1' } = await searchParams
  const page = Math.max(1, parseInt(pageStr, 10) || 1)
  const { column, ascending } = SORT_MAP[sort] ?? SORT_MAP.ending_soon

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = db
    .from('listings')
    .select(
      'id, title, current_bid, retail_price, ends_at, view_count, listing_photos(storage_path, display_order), bids(id), profiles!auctioneer_id(username)',
      { count: 'exact' }
    )
    .eq('status', 'live')
    .order(column, { ascending })
    .range(from, to)

  if (q) query = query.ilike('title', `%${q}%`)

  const { data: rawListings, count } = await query

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listings = (rawListings ?? []).map((listing: any) => ({
    id: listing.id,
    title: listing.title,
    current_bid: listing.current_bid,
    retail_price: listing.retail_price ?? null,
    ends_at: listing.ends_at,
    bid_count: (listing.bids ?? []).length,
    view_count: listing.view_count ?? 0,
    seller_username: listing.profiles?.username ?? null,
    listing_photos: (listing.listing_photos ?? []).sort(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any, b: any) => a.display_order - b.display_order
    ),
  }))

  function pageHref(p: number) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (sort !== 'ending_soon') params.set('sort', sort)
    params.set('page', String(p))
    return `/auctions?${params.toString()}`
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted mb-8" />}>
        <AuctionControls
          q={q}
          sort={sort as 'ending_soon' | 'newest' | 'lowest_bid' | 'highest_bid'}
          count={count ?? 0}
        />
      </Suspense>

      {listings.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-4" aria-hidden="true">🔨</p>
          {q ? (
            <>
              <p className="font-bold text-gray-900 mb-1">No auctions match your search.</p>
              <Link
                href="/auctions"
                className="text-sm font-semibold text-gray-700 hover:text-gray-900 mt-2 inline-block"
              >
                Clear filters
              </Link>
            </>
          ) : (
            <>
              <p className="font-bold text-gray-900 mb-1">No live auctions right now</p>
              <p className="text-sm text-gray-500 mt-1">Check back soon — new items drop daily.</p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {listings.map((listing: any) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex justify-center items-center gap-6 mt-10">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="text-sm font-medium text-primary hover:underline">
                  ← Prev
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground opacity-40">← Prev</span>
              )}
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              {page < totalPages ? (
                <Link href={pageHref(page + 1)} className="text-sm font-medium text-primary hover:underline">
                  Next →
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground opacity-40">Next →</span>
              )}
            </div>
          ) : (
            <div className="mt-12 text-center">
              <div className="inline-flex flex-col items-center gap-3">
                <p className="text-sm text-gray-500">
                  You&apos;re caught up — that&apos;s all {count ?? 0} auction{(count ?? 0) !== 1 ? 's' : ''} for now.
                </p>
                <Link
                  href="/listings/new"
                  className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-bold px-6 py-3 rounded-full hover:bg-gray-800 transition-colors"
                >
                  Got something to sell? List it →
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

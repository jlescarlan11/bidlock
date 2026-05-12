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
      'id, title, current_bid, ends_at, listing_photos(storage_path, display_order), bids(created_at)',
      { count: 'exact' }
    )
    .eq('status', 'live')
    .order(column, { ascending })
    .range(from, to)

  if (q) query = query.ilike('title', `%${q}%`)

  const { data: rawListings, count } = await query

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listings = (rawListings ?? []).map((listing: any) => {
    const bidRows: { created_at: string }[] = listing.bids ?? []
    const bid_count = bidRows.length
    const last_bid_at =
      bidRows.length > 0
        ? bidRows.reduce(
            (max: string, b: any) => (b.created_at > max ? b.created_at : max),
            bidRows[0].created_at
          )
        : null
    return {
      id: listing.id,
      title: listing.title,
      current_bid: listing.current_bid,
      ends_at: listing.ends_at,
      bid_count,
      last_bid_at,
      listing_photos: (listing.listing_photos ?? []).sort(
        (a: any, b: any) => a.display_order - b.display_order
      ),
    }
  })

  function pageHref(p: number) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (sort !== 'ending_soon') params.set('sort', sort)
    params.set('page', String(p))
    return `/auctions?${params.toString()}`
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Live Auctions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {count ?? 0} live {(count ?? 0) === 1 ? 'auction' : 'auctions'}
        </p>
      </div>

      <div className="mb-6">
        <Suspense fallback={<div className="h-9 w-full animate-pulse rounded-lg bg-muted" />}>
          <AuctionControls q={q} sort={sort as 'ending_soon' | 'newest' | 'lowest_bid' | 'highest_bid'} />
        </Suspense>
      </div>

      {listings.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-3" aria-hidden="true">🔨</p>
          {q ? (
            <>
              <p className="font-bold text-foreground mb-1">No auctions match your search.</p>
              <Link
                href="/auctions"
                className="text-primary text-sm font-medium mt-2 inline-block hover:underline"
              >
                Clear filters
              </Link>
            </>
          ) : (
            <>
              <p className="font-bold text-foreground mb-1">No live auctions right now.</p>
              <p className="text-sm text-muted-foreground mt-1">Check back soon — new items drop daily.</p>
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

          {totalPages > 1 && (
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
          )}
        </>
      )}
    </div>
  )
}

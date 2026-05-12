import { createClient } from '@/lib/supabase/server'
import ListingCard from '@/components/listing-card'
import LandingHero from '@/components/landing-hero'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Fetch teaser listings and all live IDs for stats in parallel
  const [
    { data: rawTeaser },
    { data: allLive },
    { count: itemsSold },
    { data: soldListings },
  ] = await Promise.all([
    db
      .from('listings')
      .select('id, title, current_bid, ends_at, listing_photos(storage_path, display_order), bids(created_at)')
      .eq('status', 'live')
      .order('ends_at', { ascending: true })
      .limit(4),
    db.from('listings').select('id').eq('status', 'live'),
    db.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'ended').not('winner_id', 'is', null),
    db.from('listings').select('current_bid').eq('status', 'ended').not('winner_id', 'is', null),
  ])

  const liveIds = (allLive ?? []).map((l: any) => l.id)

  const { count: activeBids } = liveIds.length > 0
    ? await db.from('bids').select('id', { count: 'exact', head: true }).in('listing_id', liveIds)
    : { count: 0 }

  const totalSold = (soldListings ?? []).reduce((sum: number, l: any) => sum + Number(l.current_bid), 0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teaserListings = (rawTeaser ?? []).map((listing: any) => {
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

  const stats = {
    itemsSold: itemsSold ?? 0,
    activeBids: activeBids ?? 0,
    totalSold,
  }

  return (
    <main>
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
        <LandingHero stats={stats} />

        {/* Trust strip */}
        <div className="py-4">
          <div className="max-w-7xl mx-auto px-6 flex justify-center flex-wrap gap-x-8 gap-y-2 opacity-50">
            {[
              { emoji: '🔒', label: 'Secure GCash payments' },
              { emoji: '🇵🇭', label: 'PH-verified sellers' },
              { emoji: '🛡️', label: 'Buyer protection' },
              { emoji: '⚡', label: 'New auctions daily' },
            ].map(({ emoji, label }) => (
              <span key={label} className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                <span aria-hidden="true">{emoji}</span> {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Live right now teaser */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-foreground">Live right now</h2>
          <Link
            href="/auctions"
            className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Browse all auctions <span aria-hidden="true">→</span>
          </Link>
        </div>
        {teaserListings.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-4xl mb-3" aria-hidden="true">🔨</p>
            <p className="font-bold text-foreground mb-1">No live auctions right now</p>
            <p className="text-sm text-muted-foreground">Check back soon — new items drop daily.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {teaserListings.map((listing: any) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      {/* Reassurance — "Before you bid" */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <p className="text-[11px] font-bold tracking-[0.18em] text-primary uppercase text-center mb-3">
          Before you bid
        </p>
        <h2 className="text-3xl font-black text-foreground text-center mb-10">
          Simple. Transparent. Fair.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            {
              icon: '🎯',
              title: "Bid only what you'd happily pay",
              body: "No surprise fees. Winning bid + GCash transfer. That's it.",
            },
            {
              icon: '😌',
              title: 'Lose? No charge.',
              body: 'We only collect when you win. No deposits, no holds, no stress.',
            },
            {
              icon: '📦',
              title: 'Win? Pay in 24 hours.',
              body: 'Quick GCash transfer, seller ships, item arrives. Simple as that.',
            },
          ].map(({ icon, title, body }) => (
            <div key={title} className="bg-muted rounded-2xl p-6 border border-border hover:border-primary/40 transition-colors">
              <p className="text-3xl mb-4" aria-hidden="true">{icon}</p>
              <p className="text-base font-extrabold text-foreground mb-2 leading-snug">{title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

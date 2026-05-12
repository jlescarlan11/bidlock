import { createClient } from '@/lib/supabase/server'
import ListingCard from '@/components/listing-card'
import LandingHero from '@/components/landing-hero'

export default async function HomePage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: rawListings } = await db
    .from('listings')
    .select('id, title, current_bid, ends_at, listing_photos(storage_path, display_order), bids(created_at)')
    .eq('status', 'live')
    .order('ends_at', { ascending: true })

  const liveIds = (rawListings ?? []).map((l: any) => l.id)

  const [
    { count: itemsSold },
    { data: soldListings },
    { count: activeBids },
  ] = await Promise.all([
    db.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'ended').not('winner_id', 'is', null),
    db.from('listings').select('current_bid').eq('status', 'ended').not('winner_id', 'is', null),
    liveIds.length > 0
      ? db.from('bids').select('id', { count: 'exact', head: true }).in('listing_id', liveIds)
      : Promise.resolve({ count: 0, data: null, error: null }),
  ])

  const totalSold = (soldListings ?? []).reduce((sum: number, l: any) => sum + Number(l.current_bid), 0)

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

  const stats = {
    itemsSold: itemsSold ?? 0,
    activeBids: activeBids ?? 0,
    totalSold,
  }

  return (
    <main>
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
        <LandingHero listings={listings} stats={stats} />

        {/* Trust strip */}
        <div className="py-4">
          <div className="max-w-7xl mx-auto px-6 flex justify-center flex-wrap gap-x-8 gap-y-2">
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
              title: 'Win? Pay typically within 24 hours.',
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

      {/* Live auctions grid — anchor target for hero CTA */}
      <section id="live-auctions" className="max-w-7xl mx-auto px-6 pb-16">
        <div className="border-t border-border pt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-foreground flex items-center gap-3">
              Live Auctions
              <span className="bg-orange-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide">
                LIVE
              </span>
            </h2>
          </div>
          {!listings.length && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3" aria-hidden="true">🔨</p>
              <p className="font-bold text-foreground mb-1">No live auctions right now</p>
              <p className="text-sm text-muted-foreground">Check back soon — new items drop daily.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((listing: any) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

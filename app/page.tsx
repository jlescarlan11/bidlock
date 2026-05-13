import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import LandingHero from '@/components/landing-hero'
import HomepageListingCard from '@/components/homepage-listing-card'
import Countdown from '@/components/countdown'
import { cardGradient } from '@/lib/utils/card-gradient'
import { formatPHP } from '@/lib/utils/currency'

export default async function HomePage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [
    { data: rawTeaser, count: liveCount },
    { count: totalBids },
    { count: totalListings },
    { count: newToday },
  ] = await Promise.all([
    // 4 teaser cards + live count in one query
    db.from('listings')
      .select(
        'id, title, current_bid, retail_price, ends_at, created_at, view_count, listing_photos(storage_path, display_order), bids(id), profiles!auctioneer_id(username)',
        { count: 'exact' }
      )
      .eq('status', 'live')
      .order('ends_at', { ascending: true })
      .limit(4),

    // Total bids across the platform
    db.from('bids').select('id', { count: 'exact', head: true }),

    // Total live + ended listings (denominator for avg)
    db.from('listings')
      .select('id', { count: 'exact', head: true })
      .in('status', ['live', 'ended']),

    // Listings created in the last 24 hours
    db.from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'live')
      .gte('created_at', new Date(Date.now() - 86_400_000).toISOString()),
  ])

  const avgBidsPerItem =
    (totalListings ?? 0) > 0
      ? Math.round((totalBids ?? 0) / (totalListings ?? 1))
      : 0

  const stats = {
    liveCount: liveCount ?? 0,
    avgBidsPerItem,
    newToday: newToday ?? 0,
  }

  // The featured hero card is the first (soonest-ending) live listing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const featured = (rawTeaser ?? [])[0] as any ?? null

  type HomepageListing = {
    id: string
    title: string
    current_bid: number
    retail_price: number | null
    ends_at: string
    view_count: number
    bid_count: number
    seller_name: string | null
    listing_photos: { storage_path: string; display_order: number }[]
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teaserListings: HomepageListing[] = (rawTeaser ?? []).map((l: any) => ({
    id: l.id,
    title: l.title,
    current_bid: l.current_bid,
    retail_price: l.retail_price ?? null,
    ends_at: l.ends_at,
    view_count: l.view_count ?? 0,
    bid_count: (l.bids ?? []).length,
    seller_name: l.profiles?.username ?? null,
    listing_photos: (l.listing_photos ?? []).sort(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any, b: any) => a.display_order - b.display_order
    ),
  }))

  const featuredData = featured
    ? {
        id: featured.id,
        title: featured.title,
        current_bid: featured.current_bid,
        retail_price: featured.retail_price ?? null,
        ends_at: featured.ends_at,
        view_count: featured.view_count ?? 0,
        bid_count: (featured.bids ?? []).length,
        seller_name: featured.profiles?.username ?? null,
        listing_photos: (featured.listing_photos ?? []).sort(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a: any, b: any) => a.display_order - b.display_order
        ),
      }
    : null

  const featuredPhotoUrl = featuredData?.listing_photos[0]
    ? supabase.storage
        .from('listing-photos')
        .getPublicUrl(featuredData.listing_photos[0].storage_path).data.publicUrl
    : null

  const isEndingSoon = featuredData
    ? (new Date(featuredData.ends_at).getTime() - Date.now()) < 3_600_000
    : false

  return (
    <main>
      {/* Hero + featured card — two-column on lg */}
      <div className="relative bg-[#FDFBF6] overflow-hidden min-h-[calc(100vh-3.5rem)] flex flex-col justify-center">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          aria-hidden="true"
        />
        <div className="relative max-w-7xl mx-auto w-full px-6 py-16 grid lg:grid-cols-12 lg:gap-10 items-center">
          <div className="lg:col-span-7">
            <LandingHero stats={stats} />
          </div>

          {/* Featured card */}
          <div className="lg:col-span-5 mt-10 lg:mt-0">
            {featuredData ? (
              <div className="relative">
                <div className="absolute -top-4 -left-4 z-20 bg-orange-500 text-white text-xs font-extrabold px-3 py-1.5 rounded-full rotate-[-8deg] shadow-lg">
                  🔥 HOT RIGHT NOW
                </div>
                <div className="bg-white rounded-3xl border-2 border-gray-900 p-5 shadow-[8px_8px_0_0_rgba(17,24,39,1)]">
                  <div className={`aspect-[4/3] bg-gradient-to-br ${cardGradient(featuredData.id)} rounded-2xl mb-4 relative overflow-hidden flex items-center justify-center`}>
                    {featuredPhotoUrl ? (
                      <Image
                        src={featuredPhotoUrl}
                        alt={featuredData.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 40vw"
                      />
                    ) : null}
                    <span className={`absolute top-3 left-3 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${isEndingSoon ? 'bg-red-500' : 'bg-orange-500'}`}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-white ticker" aria-hidden="true" />
                      {isEndingSoon ? 'ENDING SOON' : 'LIVE'}
                    </span>
                  </div>

                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{featuredData.title}</p>
                      {featuredData.seller_name && (
                        <p className="text-xs text-gray-500 mt-0.5">@{featuredData.seller_name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Current bid</p>
                      <p className="display text-2xl font-extrabold text-gray-900">
                        {formatPHP(featuredData.current_bid)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-600 mb-4">
                    <span>
                      <span className="font-bold text-gray-900">{featuredData.bid_count} bid{featuredData.bid_count !== 1 ? 's' : ''}</span>
                      {' · '}{featuredData.view_count} 👀
                    </span>
                    <span className={isEndingSoon ? 'text-red-600 font-bold' : ''}>
                      <Countdown endsAt={featuredData.ends_at} />
                    </span>
                  </div>

                  <Link
                    href={`/listings/${featuredData.id}`}
                    className="block w-full text-center bg-orange-500 text-white text-sm font-bold py-3 rounded-full hover:bg-orange-600 transition-colors"
                  >
                    Place a bid →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border-2 border-gray-200 p-8 text-center">
                <p className="text-4xl mb-3" aria-hidden="true">🔨</p>
                <p className="font-bold text-gray-900 mb-1">No live auctions right now</p>
                <p className="text-sm text-gray-500">Check back soon — new items drop daily.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trust marquee */}
      <section className="border-y border-gray-900/10 bg-white py-4 overflow-hidden">
        <div className="flex marquee whitespace-nowrap" aria-label="Trust signals">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-10 px-5 text-sm font-medium text-gray-700" aria-hidden={i === 2 ? 'true' : undefined}>
              <span className="flex items-center gap-2">🔒 Secure GCash payments</span>
              <span className="text-gray-300" aria-hidden="true">●</span>
              <span className="flex items-center gap-2">🇵🇭 PH-verified sellers</span>
              <span className="text-gray-300" aria-hidden="true">●</span>
              <span className="flex items-center gap-2">🛡 Buyer protection on every win</span>
              <span className="text-gray-300" aria-hidden="true">●</span>
              <span className="flex items-center gap-2">⚡ New auctions every hour</span>
              <span className="text-gray-300" aria-hidden="true">●</span>
              <span className="flex items-center gap-2">💸 Lose? No charge. Ever.</span>
              <span className="text-gray-300" aria-hidden="true">●</span>
            </div>
          ))}
        </div>
      </section>

      {/* Live right now */}
      <section className="max-w-7xl mx-auto px-6 py-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs font-extrabold tracking-[0.18em] text-orange-600 uppercase mb-2">Live right now</p>
            <h2 className="display text-4xl font-extrabold text-gray-900">What&apos;s on the block</h2>
          </div>
          <Link
            href="/auctions"
            className="hidden sm:inline-flex text-sm font-semibold text-gray-900 hover:text-orange-600 transition-colors"
          >
            See all {stats.liveCount} →
          </Link>
        </div>

        {/* State filter chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { label: 'All', href: '/auctions', active: true },
            { label: '🔥 Ending soon', href: '/auctions?sort=ending_soon', active: false },
            { label: '✨ Just listed', href: '/auctions?sort=just_listed', active: false },
            { label: '💸 Under ₱500', href: '/auctions?sort=under_500', active: false },
          ].map(({ label, href, active }) => (
            <Link
              key={label}
              href={href}
              className={`text-xs font-bold px-4 py-2 rounded-full transition-colors ${
                active
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-400'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {teaserListings.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-4xl mb-3" aria-hidden="true">🔨</p>
            <p className="font-bold text-gray-900 mb-1">No live auctions right now</p>
            <p className="text-sm text-gray-500">Check back soon — new items drop daily.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {teaserListings.map((listing) => (
              <HomepageListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        <div className="mt-6 sm:hidden text-center">
          <Link href="/auctions" className="text-sm font-semibold text-gray-900 underline underline-offset-4 decoration-orange-500 decoration-2">
            See all {stats.liveCount} auctions →
          </Link>
        </div>
      </section>

      {/* Before you bid */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <p className="text-xs font-extrabold tracking-[0.18em] text-orange-600 uppercase mb-3">Before you bid</p>
          <h2 className="display text-4xl lg:text-5xl font-extrabold text-gray-900 mb-3">Simple. Transparent. Fair.</h2>
          <p className="text-base text-gray-600">No deposits, no holds, no surprise fees. We only make money when you win.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: '🎯',
              title: "Bid only what you'd happily pay.",
              body: "Winning bid + GCash transfer. That's the whole math.",
              bg: 'bg-violet-50 border-violet-100 hover:border-violet-300',
            },
            {
              icon: '😌',
              title: 'Lose? No charge.',
              body: "We don't hold deposits. We don't take card details. Walk away free.",
              bg: 'bg-orange-50 border-orange-100 hover:border-orange-300',
            },
            {
              icon: '📦',
              title: 'Win? Pay within 24 hours.',
              body: 'Quick GCash transfer. Seller ships. Item arrives. Done.',
              bg: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300',
            },
          ].map(({ icon, title, body, bg }) => (
            <div key={title} className={`rounded-3xl p-7 border-2 transition-colors ${bg}`}>
              <div className="text-5xl mb-5" aria-hidden="true">{icon}</div>
              <p className="display text-xl font-extrabold text-gray-900 mb-2 leading-tight">{title}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Seller CTA */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-gray-900 text-white rounded-3xl p-8 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            aria-hidden="true"
          />
          <div className="relative">
            <p className="text-xs font-extrabold tracking-[0.18em] text-orange-400 uppercase mb-2">For sellers</p>
            <h3 className="display text-3xl lg:text-4xl font-extrabold mb-3 leading-tight max-w-lg">
              Got stuff to sell? List in 60 seconds.
            </h3>
            <p className="text-sm text-gray-400 max-w-md">
              Snap a photo, set a starting price, pick an end time. We handle the rest. No listing fees.
            </p>
          </div>
          <Link
            href="/listings/new"
            className="relative shrink-0 inline-flex items-center gap-2 bg-orange-500 text-white px-7 py-4 rounded-full text-base font-bold hover:bg-orange-600 transition-colors"
          >
            Start selling →
          </Link>
        </div>
      </section>
    </main>
  )
}

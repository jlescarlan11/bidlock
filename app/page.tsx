import { createClient } from '@/lib/supabase/server'
import ListingCard from '@/components/listing-card'
import LandingHero from '@/components/landing-hero'

export default async function HomePage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: listings } = await db
    .from('listings')
    .select('id, title, current_bid, ends_at, listing_photos(storage_path, display_order)')
    .eq('status', 'live')
    .order('ends_at', { ascending: true })

  return (
    <>
      <LandingHero />

      {/* Trust strip */}
      <div className="bg-violet-100 py-2.5 px-6 flex justify-center flex-wrap gap-x-6 gap-y-1.5">
        {[
          '🔒 Secure GCash payments',
          '🇵🇭 PH-verified sellers',
          '🛡️ Buyer protection',
          '⚡ New auctions daily',
        ].map((item) => (
          <span key={item} className="text-[11px] font-semibold text-violet-800">
            {item}
          </span>
        ))}
      </div>

      {/* Reassurance — "Before you bid" */}
      <section className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-[13px] font-bold tracking-[0.12em] text-gray-400 uppercase text-center mb-5">
          Before you bid
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div key={title} className="bg-white rounded-2xl p-5 border border-violet-100">
              <p className="text-2xl mb-2.5">{icon}</p>
              <p className="text-sm font-extrabold text-stone-950 mb-1.5 leading-snug">{title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live auctions grid — anchor target for hero CTA */}
      <section id="live-auctions" className="max-w-2xl mx-auto px-6 pb-12">
        <div className="border-t border-violet-100 pt-8">
          <h2 className="text-xl font-extrabold mb-4 flex items-center gap-2 text-stone-950">
            Live Auctions
            <span className="bg-orange-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wide">
              LIVE
            </span>
          </h2>
          {!listings?.length && (
            <p className="text-muted-foreground">No live auctions right now. Check back soon.</p>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {listings?.map((listing: any) => (
              <ListingCard
                key={listing.id}
                listing={{
                  ...listing,
                  listing_photos: (listing.listing_photos ?? []).sort(
                    (a: any, b: any) => a.display_order - b.display_order
                  ),
                }}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import HeroCarousel, { type CarouselListing } from './hero-carousel'
import { cardGradient } from '@/lib/utils/card-gradient'

type HeroListing = {
  id: string
  title: string
  current_bid: number
  ends_at: string
  listing_photos: { storage_path: string; display_order: number }[]
}

export default async function LandingHero({ listings }: { listings: HeroListing[] }) {
  const supabase = await createClient()

  const carouselListings: CarouselListing[] = listings.slice(0, 10).map(listing => {
    const photo = listing.listing_photos[0]
    const photoUrl = photo
      ? supabase.storage.from('listing-photos').getPublicUrl(photo.storage_path).data.publicUrl
      : null
    return {
      id: listing.id,
      title: listing.title,
      current_bid: listing.current_bid,
      ends_at: listing.ends_at,
      photoUrl,
      gradient: cardGradient(listing.id),
    }
  })

  return (
    <section className="bg-violet-50 min-h-[calc(100vh-3.5rem)] flex items-center">
      <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-16">

        {/* Left — text + CTAs + stats */}
        <div>
          <p className="text-[11px] font-bold tracking-[0.18em] text-primary uppercase mb-5">
            Live Auctions · PH
          </p>
          <h1 className="text-5xl lg:text-7xl font-black leading-[1.05] mb-6 text-foreground">
            Going once.<br />
            Going twice.<br />
            <span className="text-primary">Yours.</span>
          </h1>
          <div className="flex items-center gap-5 mb-10">
            <a
              href="#live-auctions"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 rounded-full text-[15px] font-bold hover:bg-primary/90 active:scale-95 transition-all"
            >
              <span aria-hidden="true">🔨</span> Place a Bid
            </a>
            <Link
              href="/listings/new"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Sell an item <span aria-hidden="true">→</span>
            </Link>
          </div>
          {/* Social proof strip */}
          <div className="flex items-center gap-6">
            <div>
              <p className="text-2xl font-black text-foreground leading-none">2.3K+</p>
              <p className="text-xs text-muted-foreground mt-1">Items sold</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="text-2xl font-black text-foreground leading-none">847</p>
              <p className="text-xs text-muted-foreground mt-1">Active bids</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="text-2xl font-black text-foreground leading-none">₱4.2M+</p>
              <p className="text-xs text-muted-foreground mt-1">Total sold</p>
            </div>
          </div>
        </div>

        {/* Right — carousel + tagline */}
        <div>
          <HeroCarousel listings={carouselListings} />
          <p className="text-sm text-muted-foreground text-center mt-4 leading-relaxed">
            Win real items at real prices. Pay instantly via GCash. No deposits, no stress.
          </p>
        </div>

      </div>
    </section>
  )
}

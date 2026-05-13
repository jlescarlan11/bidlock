import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import Countdown from './countdown'
import { formatPHP } from '@/lib/utils/currency'
import { cardGradient } from '@/lib/utils/card-gradient'

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

type BadgeState = 'ending_soon' | 'steal' | 'hot' | 'live'

function getCardState(endsAt: string, bidCount: number): { badge: BadgeState; urgent: boolean } {
  const msLeft = new Date(endsAt).getTime() - Date.now()
  if (msLeft <= 0) return { badge: 'live', urgent: false }
  const hoursLeft = msLeft / 3_600_000
  const urgent = hoursLeft < 1
  if (urgent && bidCount > 0) return { badge: 'ending_soon', urgent: true }
  if (bidCount === 0 && hoursLeft < 24) return { badge: 'steal', urgent: false }
  if (bidCount >= 5) return { badge: 'hot', urgent: false }
  return { badge: 'live', urgent: false }
}

export default async function HomepageListingCard({ listing }: { listing: HomepageListing }) {
  const supabase = await createClient()
  const photo = listing.listing_photos[0]
  const photoUrl = photo
    ? supabase.storage.from('listing-photos').getPublicUrl(photo.storage_path).data.publicUrl
    : null

  const { badge, urgent } = getCardState(listing.ends_at, listing.bid_count)
  const hasNoBids = listing.bid_count === 0
  const showStrikethrough = listing.retail_price != null && listing.retail_price > listing.current_bid
  const bidLabel = hasNoBids
    ? 'No bids yet'
    : `${listing.bid_count} bid${listing.bid_count !== 1 ? 's' : ''}`
  const subline = listing.seller_name ? `${bidLabel} · @${listing.seller_name}` : bidLabel

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="block bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-gray-900 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className={`aspect-[4/3] bg-gradient-to-br ${cardGradient(listing.id)} relative overflow-hidden`}>
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, 25vw"
          />
        ) : null}

        {badge === 'ending_soon' && (
          <span className="absolute top-2.5 left-2.5 bg-red-500 text-white text-[10px] font-extrabold px-2 py-1 rounded-full flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-white ticker" aria-hidden="true" />
            ENDING SOON
          </span>
        )}
        {badge === 'steal' && (
          <span className="absolute top-2.5 left-2.5 bg-emerald-500 text-white text-[10px] font-extrabold px-2 py-1 rounded-full">
            🌱 STEAL ALERT
          </span>
        )}
        {badge === 'hot' && (
          <span className="absolute top-2.5 left-2.5 bg-pink-500 text-white text-[10px] font-extrabold px-2 py-1 rounded-full flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-white ticker" aria-hidden="true" />
            🔥 HOT
          </span>
        )}
        {badge === 'live' && (
          <span className="absolute top-2.5 left-2.5 bg-orange-500 text-white text-[10px] font-extrabold px-2 py-1 rounded-full flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-white ticker" aria-hidden="true" />
            LIVE
          </span>
        )}

        <span
          className={[
            'absolute top-2.5 right-2.5 text-[10px] px-2 py-1 rounded-full backdrop-blur-sm',
            urgent
              ? 'bg-white/95 text-red-600 font-extrabold'
              : 'bg-black/75 text-white font-bold',
          ].join(' ')}
        >
          ⏱ <Countdown endsAt={listing.ends_at} />
        </span>

        {listing.view_count >= 5 && (
          <span className="absolute bottom-2.5 left-2.5 bg-white/95 backdrop-blur-sm text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {listing.view_count} 👀
          </span>
        )}
      </div>

      <div className="p-3.5">
        <p className="text-sm font-bold text-gray-900 line-clamp-1">{listing.title}</p>
        <p className="text-[11px] text-gray-500 mb-2">{subline}</p>
        <div>
          {showStrikethrough && (
            <p className="text-[10px] text-gray-400 line-through leading-none">
              {formatPHP(listing.retail_price!)}
            </p>
          )}
          <p className="display text-lg font-extrabold text-gray-900 leading-tight mt-0.5">
            {formatPHP(listing.current_bid)}
          </p>
        </div>
      </div>
    </Link>
  )
}

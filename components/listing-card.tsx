import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import Countdown from './countdown'
import { formatPHP } from '@/lib/utils/currency'
import { cardGradient } from '@/lib/utils/card-gradient'

type Props = {
  listing: {
    id: string
    title: string
    current_bid: number
    ends_at: string
    bid_count: number
    last_bid_at: string | null
    listing_photos: { storage_path: string; display_order: number }[]
  }
}

// Card-level heat treatment is time-only. bid_count is expressed through the
// bid pill, not the card background — popularity ≠ urgency.
function getCardState(endsAt: string) {
  const hoursLeft = (new Date(endsAt).getTime() - Date.now()) / 3_600_000
  const isHot  = hoursLeft < 1
  const isWarm = !isHot && hoursLeft < 24
  const timerVariant: 'gray' | 'amber' | 'red' =
    isHot ? 'red' : isWarm ? 'amber' : 'gray'
  return { isHot, isWarm, timerVariant }
}

// Activity text rules per spec:
// - 0 bids → "No bids yet" (always)
// - hot + last bid within 60m → "last bid Xm ago"
// - everything else → null (slot rendered empty)
function getActivityText(
  bidCount: number,
  lastBidAt: string | null,
  isHot: boolean
): string | null {
  if (bidCount === 0) return 'No bids yet'
  if (!isHot || !lastBidAt) return null
  const minutesAgo = (Date.now() - new Date(lastBidAt).getTime()) / 60_000
  if (minutesAgo < 1) return 'last bid just now'
  return minutesAgo < 60 ? `last bid ${Math.round(minutesAgo)}m ago` : null
}

const timerPillClass: Record<'gray' | 'amber' | 'red', string> = {
  gray:  'bg-black/60 text-white',
  amber: 'bg-amber-600/90 text-white',
  red:   'bg-red-600/90 text-white',
}

export default async function ListingCard({ listing }: Props) {
  const supabase = await createClient()
  const photo = listing.listing_photos[0]
  const photoUrl = photo
    ? supabase.storage.from('listing-photos').getPublicUrl(photo.storage_path).data.publicUrl
    : null

  const { isHot, isWarm, timerVariant } = getCardState(listing.ends_at)
  const isHeated = isWarm || isHot

  const bidPillLabel =
    listing.bid_count > 99 ? '99+' : `${listing.bid_count} bids`
  const activityText = getActivityText(
    listing.bid_count,
    listing.last_bid_at,
    isHot
  )

  return (
    <Link
      href={`/listings/${listing.id}`}
      className={[
        'group block rounded-2xl border overflow-hidden',
        'hover:shadow-xl hover:shadow-violet-200/60 hover:-translate-y-1 hover:border-primary/30',
        'transition-all duration-200 ease-out',
        isHeated ? 'bg-amber-50/30 border-amber-200' : 'bg-card border-border',
      ].join(' ')}
    >
      {/* Image — aspect-[4/3] per spec (was aspect-square) */}
      <div
        className={`aspect-[4/3] bg-gradient-to-br ${cardGradient(listing.id)} relative overflow-hidden`}
      >
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={listing.title}
            fill
            className="object-cover group-hover:scale-[1.04] transition-transform duration-300 ease-out"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl opacity-20" aria-hidden="true">
              🏷️
            </span>
          </div>
        )}

        {/* Timer pill — color shifts with state; dot pulses only on hot */}
        <div className="absolute top-2.5 right-2.5">
          <div
            className={`${timerPillClass[timerVariant]} transition-colors duration-300 text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 leading-none backdrop-blur-md`}
          >
            <span
              className={[
                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                timerVariant === 'red'
                  ? 'bg-white [animation:bid-pulse_2s_ease-in-out_infinite]'
                  : 'bg-orange-400',
              ].join(' ')}
              aria-hidden="true"
            />
            <Countdown endsAt={listing.ends_at} />
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>

      {/* Info section */}
      <div
        className={[
          'p-3.5',
          isHeated ? 'border-t-2 border-amber-300' : 'border-t-2 border-transparent',
        ].join(' ')}
      >
        {/* Title anchors the card — item identity before price */}
        <p className="text-sm font-bold text-foreground line-clamp-2 leading-snug mb-2">
          {listing.title}
        </p>

        {/* Price + bid count on same row */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-xl font-black text-primary leading-none">
            {formatPHP(listing.current_bid)}
          </p>
          {listing.bid_count > 0 && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
              {bidPillLabel}
            </span>
          )}
        </div>

        {/* Activity line — ALWAYS rendered (h-4 reserves slot so card height never shifts).
            Text is conditional; the element is not. */}
        <p
          className={[
            'h-4 text-[10px] leading-4',
            activityText === 'No bids yet'
              ? 'text-gray-400'
              : 'text-amber-600 font-semibold',
          ].join(' ')}
        >
          {activityText ?? ''}
        </p>
      </div>
    </Link>
  )
}

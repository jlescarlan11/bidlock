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
  ends_at: string
  view_count: number
  bid_count: number
  seller_name: string | null
  listing_photos: { storage_path: string; display_order: number }[]
}

function isEndingSoon(endsAt: string): boolean {
  return (new Date(endsAt).getTime() - Date.now()) < 3_600_000
}

export default async function HomepageListingCard({ listing }: { listing: HomepageListing }) {
  const supabase = await createClient()
  const photo = listing.listing_photos[0]
  const photoUrl = photo
    ? supabase.storage.from('listing-photos').getPublicUrl(photo.storage_path).data.publicUrl
    : null

  const ending = isEndingSoon(listing.ends_at)
  const gradient = cardGradient(listing.id)

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="block bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-gray-900 transition-all duration-200 hover:-translate-y-1 hover:rotate-[-0.5deg]"
    >
      <div className={`aspect-square bg-gradient-to-br ${gradient} relative flex items-center justify-center`}>
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, 25vw"
          />
        ) : null}

        {/* LIVE / ENDING SOON badge */}
        <span className={`absolute top-2.5 left-2.5 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${ending ? 'bg-red-500' : 'bg-orange-500'}`}>
          <span className="inline-block w-1 h-1 rounded-full bg-white ticker" />
          {ending ? 'ENDING SOON' : 'LIVE'}
        </span>

        {/* View count */}
        <span className="absolute bottom-2.5 left-2.5 bg-white/90 backdrop-blur-sm text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
          {listing.view_count} 👀
        </span>
      </div>

      <div className="p-3.5">
        <p className="text-sm font-bold text-gray-900 truncate">{listing.title}</p>
        <p className="text-[11px] text-gray-500 mb-2.5">
          {listing.bid_count} bid{listing.bid_count !== 1 ? 's' : ''}
          {listing.seller_name ? ` · @${listing.seller_name}` : ''}
        </p>
        <div className="flex items-end justify-between">
          <p className="display text-lg font-extrabold text-gray-900 leading-tight">
            {formatPHP(listing.current_bid)}
          </p>
          <span className={`text-[10px] font-bold ${ending ? 'text-red-600' : 'text-gray-500'}`}>
            <Countdown endsAt={listing.ends_at} />
          </span>
        </div>
      </div>
    </Link>
  )
}

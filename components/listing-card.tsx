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
    listing_photos: { storage_path: string; display_order: number }[]
  }
}

export default async function ListingCard({ listing }: Props) {
  const supabase = await createClient()
  const photo = listing.listing_photos[0]
  const photoUrl = photo
    ? supabase.storage.from('listing-photos').getPublicUrl(photo.storage_path).data.publicUrl
    : null

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="block bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md hover:border-primary/30 transition-all"
    >
      <div className={`aspect-square bg-gradient-to-br ${cardGradient(listing.id)} relative`}>
        {photoUrl && (
          <Image src={photoUrl} alt={listing.title} fill className="object-cover" />
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="font-bold text-sm text-foreground line-clamp-2">{listing.title}</p>
        <p className="text-xs text-orange-600 font-semibold flex items-center gap-1">
          <span aria-hidden="true">⏱</span>
          <Countdown endsAt={listing.ends_at} />
        </p>
        <p className="text-base font-black text-primary">{formatPHP(listing.current_bid)}</p>
      </div>
    </Link>
  )
}

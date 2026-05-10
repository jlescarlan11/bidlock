import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import Countdown from './countdown'
import { formatPHP } from '@/lib/utils/currency'

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
    <Link href={`/listings/${listing.id}`} className="block rounded-lg border overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-square bg-muted relative">
        {photoUrl ? (
          <Image src={photoUrl} alt={listing.title} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No photo</div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="font-semibold text-sm line-clamp-2">{listing.title}</p>
        <p className="text-sm">{formatPHP(listing.current_bid)}</p>
        <p className="text-xs text-muted-foreground">
          <Countdown endsAt={listing.ends_at} />
        </p>
      </div>
    </Link>
  )
}

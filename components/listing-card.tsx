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

const CARD_GRADIENTS = [
  'from-violet-100 to-purple-50',
  'from-orange-100 to-amber-50',
  'from-teal-100 to-emerald-50',
  'from-rose-100 to-pink-50',
  'from-blue-100 to-sky-50',
  'from-yellow-100 to-lime-50',
]

function cardGradient(id: string) {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return CARD_GRADIENTS[hash % CARD_GRADIENTS.length]
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
      className="block bg-white rounded-2xl border border-violet-100 overflow-hidden hover:shadow-md hover:border-violet-200 transition-all"
    >
      <div className={`aspect-square bg-gradient-to-br ${cardGradient(listing.id)} relative`}>
        {photoUrl && (
          <Image src={photoUrl} alt={listing.title} fill className="object-cover" />
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="font-bold text-sm text-stone-900 line-clamp-2">{listing.title}</p>
        <p className="text-xs text-orange-600 font-semibold flex items-center gap-1">
          <span aria-hidden="true">⏱</span>
          <Countdown endsAt={listing.ends_at} />
        </p>
        <p className="text-base font-black text-violet-600">{formatPHP(listing.current_bid)}</p>
      </div>
    </Link>
  )
}

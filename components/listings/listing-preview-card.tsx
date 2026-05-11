'use client'

import { Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPHP } from '@/lib/utils/currency'

type Props = {
  title: string
  starting_bid: number
  duration_days: number
  photoUrl?: string
}

export function ListingPreviewCard({ title, starting_bid, duration_days, photoUrl }: Props) {
  return (
    <div className="group rounded-2xl border overflow-hidden bg-card hover:shadow-xl hover:shadow-violet-200/60 hover:-translate-y-1 hover:border-primary/30 transition-all duration-200 ease-out">

      {/* Image area — placeholder until photoUrl is provided */}
      <div className={cn('aspect-[4/3] relative overflow-hidden', !photoUrl && 'bg-gray-100 opacity-60')}>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
            <Camera className="text-gray-400" size={28} aria-hidden="true" />
            <p className="text-xs text-gray-400">Add photos in step 2</p>
          </div>
        )}

        {/* Timer pill — mirrors ListingCard gray state */}
        <div className="absolute top-2.5 right-2.5">
          {duration_days > 0 ? (
            <div className="bg-black/60 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 leading-none backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" aria-hidden="true" />
              Ends in {duration_days}d
            </div>
          ) : (
            <div className="bg-gray-500/60 text-white/60 text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 leading-none backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" aria-hidden="true" />
              Ends in —d
            </div>
          )}
        </div>

        <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>

      {/* Card body — mirrors ListingCard info section */}
      <div className="p-3.5 border-t-2 border-transparent">
        {title ? (
          <p className="text-sm font-bold text-foreground line-clamp-2 leading-snug mb-2">{title}</p>
        ) : (
          <p className="text-sm font-bold text-gray-400 line-clamp-2 leading-snug mb-2">Your listing title</p>
        )}

        <div className="flex items-center justify-between gap-2 mb-1">
          {starting_bid > 0 ? (
            <p className="text-xl font-black text-primary leading-none">{formatPHP(starting_bid)}</p>
          ) : (
            <p className="text-xl font-black text-gray-400 leading-none">{formatPHP(0)}</p>
          )}
        </div>

        {/* Activity line — always h-4 reserved slot, mirrors real card */}
        <p className="h-4 text-[10px] leading-4 text-gray-400 opacity-60">No bids yet</p>
      </div>
    </div>
  )
}

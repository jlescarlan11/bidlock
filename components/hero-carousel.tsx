'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Countdown from './countdown'
import { formatPHP } from '@/lib/utils/currency'

export type CarouselListing = {
  id: string
  title: string
  current_bid: number
  ends_at: string
  photoUrl: string | null
  gradient: string
}

const VISIBLE = 3
const INTERVAL_MS = 5000

export default function HeroCarousel({ listings }: { listings: CarouselListing[] }) {
  const total = listings.length
  const canSlide = total > VISIBLE

  // Clone first VISIBLE items at end for seamless infinite loop
  const extended = canSlide ? [...listings, ...listings.slice(0, VISIBLE)] : listings
  const extLen = extended.length

  const [current, setCurrent] = useState(0)
  const [animated, setAnimated] = useState(true)

  useEffect(() => {
    if (!canSlide) return
    const timer = setInterval(() => setCurrent(c => c + 1), INTERVAL_MS)
    return () => clearInterval(timer)
  }, [canSlide])

  // Snap back from clone zone after slide finishes
  useEffect(() => {
    if (current >= total) {
      const snap = setTimeout(() => {
        setAnimated(false)
        setCurrent(0)
      }, 440)
      return () => clearTimeout(snap)
    }
  }, [current, total])

  // Re-enable animation one frame after snap
  useEffect(() => {
    if (!animated) {
      const reenable = setTimeout(() => setAnimated(true), 30)
      return () => clearTimeout(reenable)
    }
  }, [animated])

  if (!listings.length) {
    return (
      <div className="hidden lg:flex flex-col items-center justify-center py-20 text-center">
        <p className="text-4xl mb-3" aria-hidden="true">🔨</p>
        <p className="font-semibold text-foreground mb-1">No live auctions yet</p>
        <p className="text-sm text-muted-foreground">Be the first to list something!</p>
      </div>
    )
  }

  // Center of the visible window is always current + 1
  const centerIdx = current + 1

  return (
    /* py-8 gives the scale(1.15) center card room to breathe without being clipped */
    <div className="hidden lg:block overflow-hidden py-8">
      {/*
        Track: (extLen / VISIBLE) × container width.
        Each slot: (1 / extLen) of track = (1 / VISIBLE) of container = 33.3%.
        Padding on slots creates visual gap without breaking translation math.
        Per-slot scale creates the coverflow depth effect.
      */}
      <div
        className="flex"
        style={{
          width: `${(extLen / VISIBLE) * 100}%`,
          transform: `translateX(-${(current / extLen) * 100}%)`,
          transition: animated ? 'transform 440ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        }}
      >
        {extended.map(({ id, title, current_bid, ends_at, photoUrl, gradient }, i) => {
          const dist = i - centerIdx          // -1 = left, 0 = center, +1 = right
          const isCenter = dist === 0
          const scale = isCenter ? 1.15 : 0.88
          const brightness = isCenter ? 1 : 0.65

          return (
            <div
              key={`${id}-${i}`}
              className={`relative px-2 shrink-0 ${isCenter ? 'z-20' : 'z-10'}`}
              style={{
                width: `${100 / extLen}%`,
                transform: `scale(${scale})`,
                filter: `brightness(${brightness})`,
                transition: animated
                  ? 'transform 440ms cubic-bezier(0.4, 0, 0.2, 1), filter 440ms ease'
                  : 'none',
              }}
            >
              <Link
                href={`/listings/${id}`}
                className="group relative rounded-2xl overflow-hidden block aspect-[3/4]"
              >
                {/* Background */}
                <div className="absolute inset-0">
                  <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
                  {photoUrl && (
                    <Image
                      src={photoUrl}
                      alt={title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </div>

                {/* Subtle full-card dark overlay — makes text readable on any image */}
                <div className="absolute inset-0 bg-black/15" />
                {/* Full scrim — hover only */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Info panel */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  {/* Title — always visible */}
                  <p className="text-white font-normal text-xs line-clamp-2 text-center [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">{title}</p>
                  {/* Countdown + price — hover only */}
                  <div className="overflow-hidden max-h-0 group-hover:max-h-24 transition-all duration-300 ease-out">
                    <div className="flex items-center justify-center gap-1.5 mt-1.5">
                      <span className="inline-block w-1 h-1 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
                      <span className="text-orange-400 text-[10px]">
                        <Countdown endsAt={ends_at} />
                      </span>
                    </div>
                    <p className="text-white text-xs font-medium text-center mt-1">{formatPHP(current_bid)}</p>
                    <p className="text-white/60 text-[10px] text-center mt-0.5">Current bid</p>
                  </div>
                </div>
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}

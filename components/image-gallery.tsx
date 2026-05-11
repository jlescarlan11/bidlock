'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cardGradient } from '@/lib/utils/card-gradient'

type Props = {
  photos: string[]
  title: string
  listingId: string
}

export default function ImageGallery({ photos, title, listingId }: Props) {
  const [selected, setSelected] = useState(0)

  if (photos.length === 0) {
    return (
      <div className={`aspect-[4/3] rounded-xl bg-gradient-to-br ${cardGradient(listingId)}`} />
    )
  }

  return (
    <div className="space-y-3">
      <div className="aspect-[4/3] relative rounded-xl overflow-hidden bg-muted">
        <Image
          src={photos[selected]}
          alt={title}
          fill
          className="object-cover"
          priority
        />
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden relative transition-all ${
                i === selected
                  ? 'ring-2 ring-primary ring-offset-2'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <Image
                src={url}
                alt={`${title} — photo ${i + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

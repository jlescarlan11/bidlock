'use client'

import { useEffect } from 'react'
import { incrementViewCount } from '@/lib/actions/listings'

export default function ViewCounter({ listingId }: { listingId: string }) {
  useEffect(() => {
    incrementViewCount(listingId)
  }, [listingId])

  return null
}

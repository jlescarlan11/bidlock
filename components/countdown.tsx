'use client'

import { useState, useEffect } from 'react'
import { formatTimeRemaining } from '@/lib/utils/time'

export default function Countdown({ endsAt }: { endsAt: string }) {
  const [display, setDisplay] = useState(formatTimeRemaining(endsAt))

  useEffect(() => {
    const interval = setInterval(() => setDisplay(formatTimeRemaining(endsAt)), 1000)
    return () => clearInterval(interval)
  }, [endsAt])

  return <span>{display}</span>
}

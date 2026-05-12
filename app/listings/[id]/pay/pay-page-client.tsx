'use client'

import { useRef, useState, useEffect, type ReactNode } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PayPageClientProps = {
  gcashNumber: string
  left: ReactNode
  right: ReactNode
}

export function PayPageClient({ gcashNumber, left, right }: PayPageClientProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [isCardVisible, setIsCardVisible] = useState(true)
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Observe the sentinel at the bottom of the left column.
  // The sentinel is zero-height, so threshold:0 fires when it fully enters/exits
  // the viewport — which happens when the payment details card is fully scrolled past.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsCardVisible(entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleCopy = async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    try {
      await navigator.clipboard.writeText(gcashNumber)
    } catch {
      const el = document.createElement('textarea')
      el.value = gcashNumber
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      const success = document.execCommand('copy')
      document.body.removeChild(el)
      if (!success) throw new Error('execCommand copy failed')
    }
    setCopied(true)
    timerRef.current = setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      {/* Sticky mobile bar — only on mobile (md:hidden), only when card is scrolled past */}
      {!isCardVisible && (
        <div className="md:hidden fixed top-0 inset-x-0 z-50 bg-white border-b shadow-sm px-4 py-2 flex items-center justify-between">
          <span className="font-mono text-sm">{gcashNumber}</span>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1 shrink-0"
            aria-label={copied ? 'Copied GCash number' : 'Copy GCash number'}
            onClick={handleCopy}
          >
            {copied ? (
              <><Check size={14} className="text-green-600" /><span className="text-green-600">Copied</span></>
            ) : (
              <><Copy size={14} /><span>Copy</span></>
            )}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:max-w-[560px] md:mx-auto lg:max-w-none lg:grid-cols-2 lg:gap-12">
        {/* Left column — sentinel appended after card so observer fires when card exits */}
        <div>
          {left}
          <div ref={sentinelRef} />
        </div>
        {/* Right column */}
        {right}
      </div>
    </>
  )
}

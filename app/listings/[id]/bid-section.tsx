'use client'

import { useState, useEffect } from 'react'
import { formatPHP } from '@/lib/utils/currency'
import { formatTimeRemaining, formatRelativeTime } from '@/lib/utils/time'
import { minBidAmount } from '@/lib/validators/bid'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type Props = {
  listingId: string
  currentBid: number
  endsAt: string | null
  status: string
  auctioneer_id: string
  userId: string | null
  bidCount: number
  lastBidAt: string | null
  sellerName: string | null
}

export default function BidSection({
  listingId,
  currentBid: initialBid,
  endsAt,
  status,
  auctioneer_id,
  userId,
  bidCount: initialBidCount,
  lastBidAt: initialLastBidAt,
  sellerName,
}: Props) {
  const [currentBid, setCurrentBid] = useState(initialBid)
  const [bidCount, setBidCount] = useState(initialBidCount)
  const [lastBidAt, setLastBidAt] = useState(initialLastBidAt)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`bid-panel:${listingId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids', filter: `listing_id=eq.${listingId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          setCurrentBid(payload.new.amount)
          setBidCount((c) => c + 1)
          setLastBidAt(payload.new.created_at)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [listingId])

  const hoursLeft = endsAt ? (new Date(endsAt).getTime() - Date.now()) / 36e5 : Infinity
  const timerVariant = hoursLeft < 1 ? 'red' : hoursLeft < 24 ? 'amber' : 'gray'
  const showPulse = timerVariant === 'red'

  const canBid = status === 'live' && !!userId && userId !== auctioneer_id
  const minBid = minBidAmount(currentBid)

  const activityText =
    bidCount === 0
      ? 'No bids yet'
      : `${bidCount} bid${bidCount === 1 ? '' : 's'}${lastBidAt ? ` · last bid ${formatRelativeTime(lastBidAt)}` : ''}`

  const timerPillClass =
    timerVariant === 'red'
      ? 'bg-red-600 text-white'
      : timerVariant === 'amber'
      ? 'bg-amber-600 text-white'
      : 'bg-black/60 text-white'

  function handleBidPlaced(amount: number) {
    setCurrentBid(amount)
    setBidCount((c) => c + 1)
    setLastBidAt(new Date().toISOString())
  }

  return (
    <>
      {/* Desktop bid panel */}
      <div className="hidden md:block bg-card border border-border rounded-xl p-6 space-y-4">
        {/* Current bid block */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Current bid</p>
            <p className="text-4xl font-black text-foreground">{formatPHP(currentBid)}</p>
            <p className="text-sm text-muted-foreground mt-1">{activityText}</p>
          </div>
          {endsAt && (
            <TimerPill endsAt={endsAt} pillClass={timerPillClass} showPulse={showPulse} />
          )}
        </div>

        <div className="border-t border-border" />

        {/* Bid input */}
        {canBid ? (
          <BidForm
            listingId={listingId}
            minBid={minBid}
            currentBid={currentBid}
            onBidPlaced={handleBidPlaced}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Sign in to place a bid.</p>
        )}

        {/* Seller info */}
        {sellerName && (
          <p className="text-sm text-muted-foreground">Sold by {sellerName}</p>
        )}
      </div>

      {/* Mobile sticky bar */}
      {status === 'live' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-lg px-4 py-3 md:hidden">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Current bid</p>
              <p className="text-lg font-black text-foreground">{formatPHP(currentBid)}</p>
            </div>
            {endsAt && (
              <TimerPill endsAt={endsAt} pillClass={timerPillClass} showPulse={showPulse} />
            )}
          </div>
          {canBid && (
            <BidFormCompact
              listingId={listingId}
              minBid={minBid}
              currentBid={currentBid}
              onBidPlaced={handleBidPlaced}
            />
          )}
        </div>
      )}
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TimerPill({
  endsAt,
  pillClass,
  showPulse,
}: {
  endsAt: string
  pillClass: string
  showPulse: boolean
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${pillClass}`}>
      {showPulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-white [animation:bid-pulse_1.2s_ease-in-out_infinite]" />
      )}
      <span suppressHydrationWarning>{formatTimeRemaining(endsAt)}</span>
    </span>
  )
}

function BidForm({
  listingId,
  minBid,
  currentBid,
  onBidPlaced,
}: {
  listingId: string
  minBid: number
  currentBid: number
  onBidPlaced: (amount: number) => void
}) {
  const [amount, setAmount] = useState(String(Math.ceil(minBid)))
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { placeBid } = await import('@/lib/actions/bids') as any
    setPending(true)
    const fd = new FormData()
    fd.set('listing_id', listingId)
    fd.set('amount', amount)
    const result = await placeBid(fd)
    setPending(false)
    setConfirming(false)
    if (result?.error) { setError(result.error); return }
    onBidPlaced(Number(amount))
    setAmount(String(Math.ceil(minBidAmount(Number(amount)))))
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Minimum bid: {formatPHP(minBid)}</p>
      <div className="flex gap-2">
        <Input
          type="number"
          value={amount}
          onChange={(e) => { setAmount((e.target as HTMLInputElement).value); setError('') }}
          className="flex-1"
          min={Math.ceil(minBid)}
          step="1"
        />
        <Button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={Number(amount) < minBid}
        >
          Place bid
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {confirming && (
        <div className="border rounded-lg p-3 bg-muted space-y-2">
          <p className="text-sm font-semibold">Confirm bid of {formatPHP(Number(amount))}?</p>
          <div className="flex gap-2 items-center">
            <button onClick={() => setConfirming(false)} className="text-sm underline">Cancel</button>
            <Button onClick={handleConfirm} disabled={pending} size="sm">
              {pending ? 'Placing…' : 'Confirm'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function BidFormCompact({
  listingId,
  minBid,
  currentBid,
  onBidPlaced,
}: {
  listingId: string
  minBid: number
  currentBid: number
  onBidPlaced: (amount: number) => void
}) {
  const [amount, setAmount] = useState(String(Math.ceil(minBid)))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function handlePlace() {
    if (Number(amount) < minBid) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { placeBid } = await import('@/lib/actions/bids') as any
    setPending(true)
    const fd = new FormData()
    fd.set('listing_id', listingId)
    fd.set('amount', amount)
    const result = await placeBid(fd)
    setPending(false)
    if (result?.error) { setError(result.error); return }
    onBidPlaced(Number(amount))
    setAmount(String(Math.ceil(minBidAmount(Number(amount)))))
    setError('')
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input
          type="number"
          value={amount}
          onChange={(e) => { setAmount((e.target as HTMLInputElement).value); setError('') }}
          className="flex-1"
          min={Math.ceil(minBid)}
          step="1"
        />
        <Button
          type="button"
          onClick={handlePlace}
          disabled={Number(amount) < minBid || pending}
        >
          {pending ? 'Placing…' : 'Place bid'}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

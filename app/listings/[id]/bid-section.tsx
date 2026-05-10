'use client'

import { useState } from 'react'
import { formatPHP } from '@/lib/utils/currency'
import { minBidAmount } from '@/lib/validators/bid'

type Bid = {
  id: string
  amount: number
  created_at: string
  profiles: { display_name: string | null } | null
}

type Props = {
  listingId: string
  currentBid: number
  endsAt: string | null
  status: string
  auctioneer_id: string
  userId: string | null
  initialBids: Bid[]
}

export default function BidSection({
  listingId, currentBid: initialBid, endsAt, status,
  auctioneer_id, userId, initialBids,
}: Props) {
  const [bids, setBids] = useState(initialBids)
  const [currentBid, setCurrentBid] = useState(initialBid)

  const canBid = status === 'live' && userId && userId !== auctioneer_id
  const minBid = minBidAmount(currentBid)

  return (
    <div className="space-y-4">
      {canBid && (
        <BidForm
          listingId={listingId}
          minBid={minBid}
          currentBid={currentBid}
          onBidPlaced={(amount) => {
            setCurrentBid(amount)
            setBids((prev) => [
              {
                id: crypto.randomUUID(),
                amount,
                created_at: new Date().toISOString(),
                profiles: null,
              },
              ...prev,
            ])
          }}
        />
      )}

      <div>
        <h3 className="font-semibold mb-2">Recent bids</h3>
        {bids.length === 0 && <p className="text-sm text-muted-foreground">No bids yet.</p>}
        <div className="space-y-2">
          {bids.map((bid) => (
            <div key={bid.id} className="flex justify-between text-sm">
              <span>{bid.profiles?.display_name ?? 'Anonymous'}</span>
              <span className="font-medium">{formatPHP(bid.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BidForm({
  listingId, minBid, currentBid, onBidPlaced,
}: {
  listingId: string
  minBid: number
  currentBid: number
  onBidPlaced: (a: number) => void
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
        <input
          type="number"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setError('') }}
          className="border rounded px-3 py-2 flex-1 text-sm"
          min={Math.ceil(minBid)}
          step="1"
        />
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={Number(amount) < minBid}
          className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          Place bid
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {confirming && (
        <div className="border rounded-lg p-3 bg-muted space-y-2">
          <p className="text-sm font-semibold">Confirm bid of {formatPHP(Number(amount))}?</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirming(false)} className="text-sm underline">Cancel</button>
            <button onClick={handleConfirm} disabled={pending} className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm">
              {pending ? 'Placing…' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

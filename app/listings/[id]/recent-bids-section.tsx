'use client'

import { useState, useEffect } from 'react'
import { formatPHP } from '@/lib/utils/currency'
import { formatRelativeTime } from '@/lib/utils/time'
import { createClient } from '@/lib/supabase/client'

type Bid = {
  id: string
  amount: number
  created_at: string
  bidder_id: string
  profiles: { display_name: string | null } | null
}

type Props = {
  listingId: string
  initialBids: Bid[]
  userId: string | null
  enableRealtime: boolean
}

export default function RecentBidsSection({
  listingId,
  initialBids,
  userId,
  enableRealtime,
}: Props) {
  const [bids, setBids] = useState(initialBids)

  useEffect(() => {
    if (!enableRealtime) return
    const supabase = createClient()
    const channel = supabase
      .channel(`recent-bids:${listingId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids', filter: `listing_id=eq.${listingId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const newBid: Bid = {
            id: payload.new.id,
            amount: payload.new.amount,
            created_at: payload.new.created_at,
            bidder_id: payload.new.bidder_id,
            profiles: null,
          }
          setBids((prev) => [newBid, ...prev.slice(0, 19)])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [listingId, enableRealtime])

  return (
    <div>
      <h2 className="text-lg font-bold mb-3">Recent bids</h2>
      {bids.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No bids yet. Be the first.
        </p>
      ) : (
        <div>
          {bids.map((bid) => {
            const isMe = !!userId && bid.bidder_id === userId
            return (
              <div
                key={bid.id}
                className="flex justify-between items-start py-3 border-b border-border last:border-0"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {bid.profiles?.display_name ?? 'Anonymous'}
                    </span>
                    {isMe && (
                      <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatRelativeTime(bid.created_at)}
                  </p>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {formatPHP(bid.amount)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

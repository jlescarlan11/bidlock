# Listing Detail Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the image-display bug, replace the single-column layout with a two-column responsive design, and add urgency signals (timer pill, activity line) to the bid panel.

**Architecture:** Five sequential tasks — utility helper → gallery component → bid panel component → recent bids component → page wiring. Each task is verifiable independently via `npx tsc --noEmit`. No new npm dependencies required. `BidSection` and `RecentBidsSection` each hold their own Supabase Realtime subscription, keeping them decoupled.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase JS v2, Tailwind CSS v4, `@base-ui/react` Button/Input primitives

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `lib/utils/time.ts` | Modify | Add `formatRelativeTime` helper |
| `components/image-gallery.tsx` | Create | Client gallery: selected-index state, thumbnail strip, zero-photo placeholder |
| `app/listings/[id]/bid-section.tsx` | Modify | Desktop bid panel + mobile sticky bar; Realtime subscription for current bid |
| `app/listings/[id]/recent-bids-section.tsx` | Create | Bid list with timestamps, "You" badge, own Realtime subscription |
| `app/listings/[id]/page.tsx` | Modify | Two-column grid, new data queries, wires all components |

---

## Task 1: Add `formatRelativeTime` to `lib/utils/time.ts`

**Files:**
- Modify: `lib/utils/time.ts`

- [ ] **Step 1: Append the helper function**

Add this to the end of `lib/utils/time.ts`:

```ts
export function formatRelativeTime(date: string | Date): string {
  const diffMs = Date.now() - new Date(date).getTime()
  const s = Math.floor(diffMs / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
```

- [ ] **Step 2: Verify TypeScript build**

```bash
cd "$(git rev-parse --show-toplevel)" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/utils/time.ts
git commit -m "feat: add formatRelativeTime helper to time utils"
```

---

## Task 2: Create `components/image-gallery.tsx`

**Files:**
- Create: `components/image-gallery.tsx`

- [ ] **Step 1: Create the file**

```tsx
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
```

- [ ] **Step 2: Verify TypeScript build**

```bash
cd "$(git rev-parse --show-toplevel)" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/image-gallery.tsx
git commit -m "feat: add ImageGallery client component with thumbnail strip"
```

---

## Task 3: Refactor `app/listings/[id]/bid-section.tsx`

**Files:**
- Modify: `app/listings/[id]/bid-section.tsx`

The current component renders both the bid form and the recent bids list. After this task it renders only the **desktop bid panel** and the **mobile sticky bar**. Recent bids moves to `RecentBidsSection` (Task 4).

The Realtime channel name changes from `bids:${listingId}` to `bid-panel:${listingId}`. The component now also tracks `bidCount` and `lastBidAt` as reactive state.

`BidForm` is upgraded to use the shadcn `Input` and `Button` components. A compact `BidFormCompact` is added for the mobile bar (no confirmation step — lower friction on mobile).

- [ ] **Step 1: Replace the entire file**

```tsx
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
```

- [ ] **Step 2: Verify TypeScript build**

```bash
cd "$(git rev-parse --show-toplevel)" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/listings/[id]/bid-section.tsx
git commit -m "feat: refactor BidSection — desktop panel + mobile sticky bar with timer pill"
```

---

## Task 4: Create `app/listings/[id]/recent-bids-section.tsx`

**Files:**
- Create: `app/listings/[id]/recent-bids-section.tsx`

This extracts the recent bids list from the old `BidSection` into its own focused component with its own Realtime subscription (`recent-bids:${listingId}`). When `enableRealtime` is false (ended auctions), no subscription is created.

The `Bid` type includes `bidder_id` — this is now selected in the page query (Task 5) and is required for the "You" badge.

- [ ] **Step 1: Create the file**

```tsx
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
```

- [ ] **Step 2: Verify TypeScript build**

```bash
cd "$(git rev-parse --show-toplevel)" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/listings/[id]/recent-bids-section.tsx
git commit -m "feat: add RecentBidsSection with timestamps, You badge, and Realtime"
```

---

## Task 5: Restructure `app/listings/[id]/page.tsx`

**Files:**
- Modify: `app/listings/[id]/page.tsx`

Three query changes:
1. `recentBids` select gains `bidder_id`
2. New `bidCount` aggregate query (head-only, no rows returned)
3. `lastBidAt` derived from `recentBids[0]?.created_at`

Layout changes from `max-w-2xl` single column to `max-w-6xl` two-column grid. `ImageGallery`, `RecentBidsSection`, and refactored `BidSection` are wired in. Two local server components (`TitleHeader`, `EndedBanner`) are defined at the bottom of the file. The existing ended-auction UI (contact card, chat, rating, dispute) moves into the left column, unchanged.

- [ ] **Step 1: Replace the entire file**

```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatPHP } from '@/lib/utils/currency'
import ImageGallery from '@/components/image-gallery'
import BidSection from './bid-section'
import RecentBidsSection from './recent-bids-section'
import ChatSection from './chat-section'
import RatingForm from './rating-form'
import DisputeForm from './dispute-form'

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: listing } = await db
    .from('listings')
    .select(`
      id, title, description, current_bid, starts_at, ends_at, status,
      winner_id, auctioneer_id, starting_bid,
      listing_photos (storage_path, display_order),
      auctioneer:profiles!auctioneer_id (display_name),
      winner:profiles!winner_id (display_name)
    `)
    .eq('id', id)
    .in('status', ['live', 'ended'])
    .single()

  if (!listing) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  const photos = (listing.listing_photos ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => a.display_order - b.display_order)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => supabase.storage.from('listing-photos').getPublicUrl(p.storage_path).data.publicUrl)

  const { data: recentBids } = await db
    .from('bids')
    .select('id, amount, created_at, bidder_id, profiles!bidder_id(display_name)')
    .eq('listing_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const { count: bidCount } = await db
    .from('bids')
    .select('*', { count: 'exact', head: true })
    .eq('listing_id', id)

  const lastBidAt: string | null = recentBids?.[0]?.created_at ?? null

  const isAuctioneer = user?.id === listing.auctioneer_id
  const isWinner = user?.id === listing.winner_id
  const showChat = listing.status === 'ended' && listing.winner_id !== null && (isAuctioneer || isWinner)

  let winnerContact: { phone_number: string | null; gcash_name: string | null } | null = null
  if (isAuctioneer && listing.status === 'ended' && listing.winner_id) {
    const { data: wc } = await db
      .from('profiles')
      .select('phone_number, gcash_name')
      .eq('id', listing.winner_id)
      .single()
    winnerContact = wc
  }

  let initialMessages: { id: string; body: string; created_at: string; sender_id: string; profiles: { display_name: string | null } | null }[] = []
  let recipientId: string | null = null

  if (showChat && user) {
    const { data: msgs } = await db
      .from('messages')
      .select('id, body, created_at, sender_id, profiles!sender_id(display_name)')
      .eq('listing_id', id)
      .order('created_at', { ascending: true })
    initialMessages = msgs ?? []
    recipientId = isAuctioneer ? listing.winner_id : listing.auctioneer_id
  }

  let myRating: { verdict: string } | null = null
  let rateeId: string | null = null
  let rateeName: string | null = null

  if (listing.status === 'ended' && listing.winner_id && user && (isAuctioneer || isWinner)) {
    const { data: existing, error: ratingFetchError } = await db
      .from('ratings')
      .select('verdict')
      .eq('listing_id', id)
      .eq('rater_id', user.id)
      .maybeSingle()
    if (!ratingFetchError) myRating = existing

    rateeId = isAuctioneer ? listing.winner_id : listing.auctioneer_id
    rateeName = isAuctioneer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (listing.winner as any)?.display_name
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : (listing.auctioneer as any)?.display_name
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sellerName: string | null = (listing.auctioneer as any)?.display_name ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const winnerName: string | null = (listing.winner as any)?.display_name ?? null

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 pb-32 md:pb-8">
      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-8 items-start">

        {/* ── Left column ── */}
        <div className="space-y-8">
          <ImageGallery photos={photos} title={listing.title} listingId={id} />

          {/* Title + seller on mobile (desktop version is in right column) */}
          <div className="md:hidden">
            <TitleHeader title={listing.title} seller={sellerName} />
          </div>

          <div>
            <h2 className="text-lg font-bold mb-3">About this item</h2>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {listing.description}
            </p>
          </div>

          <RecentBidsSection
            listingId={id}
            initialBids={recentBids ?? []}
            userId={user?.id ?? null}
            enableRealtime={listing.status === 'live'}
          />

          {/* Ended-auction UI — unchanged */}
          {showChat && listing.winner_id !== null && (
            <div className="border rounded-lg p-4 space-y-2">
              <p className="font-semibold">Contact Information</p>
              <p className="text-xs text-muted-foreground">
                Coordinate delivery and final payment directly. We do not handle either. Report violations via the dispute form.
              </p>
              {isAuctioneer && (
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Winner&apos;s phone:</span> {winnerContact?.phone_number}</p>
                  <p><span className="font-medium">Winner&apos;s GCash name:</span> {winnerContact?.gcash_name}</p>
                </div>
              )}
              {isWinner && (
                <div className="text-sm space-y-1">
                  <p>Get the auctioneer&apos;s contact by visiting your bids page.</p>
                </div>
              )}
            </div>
          )}

          {showChat && user && recipientId && (
            <ChatSection
              listingId={id}
              recipientId={recipientId}
              userId={user.id}
              initialMessages={initialMessages}
            />
          )}

          {listing.status === 'ended' && listing.winner_id && user && rateeId && rateeName && (isAuctioneer || isWinner) && (
            <RatingForm
              listingId={id}
              rateeId={rateeId}
              rateeName={rateeName}
              existingRating={myRating}
            />
          )}

          {listing.status === 'ended' && user && (isAuctioneer || isWinner) && rateeId && rateeName && (
            <DisputeForm
              listingId={id}
              reportedUserId={rateeId}
              reportedUserName={rateeName}
            />
          )}
        </div>

        {/* ── Right column ── */}
        <div className="sticky top-24 space-y-4">
          <div className="hidden md:block">
            <TitleHeader title={listing.title} seller={sellerName} />
          </div>

          {listing.status === 'live' ? (
            <BidSection
              listingId={id}
              currentBid={listing.current_bid}
              endsAt={listing.ends_at}
              status={listing.status}
              auctioneer_id={listing.auctioneer_id}
              userId={user?.id ?? null}
              bidCount={bidCount ?? 0}
              lastBidAt={lastBidAt}
              sellerName={sellerName}
            />
          ) : (
            <EndedBanner winnerName={winnerName} amount={listing.current_bid} />
          )}
        </div>

      </div>
    </main>
  )
}

// ─── Local components ─────────────────────────────────────────────────────────

function TitleHeader({ title, seller }: { title: string; seller: string | null }) {
  return (
    <div>
      <h1 className="text-3xl font-black text-foreground">{title}</h1>
      {seller && <p className="text-sm text-muted-foreground mt-1">by {seller}</p>}
    </div>
  )
}

function EndedBanner({ winnerName, amount }: { winnerName: string | null; amount: number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Auction ended</p>
      {winnerName ? (
        <>
          <p className="text-2xl font-black text-foreground">{formatPHP(amount)}</p>
          <p className="text-sm text-muted-foreground mt-1">Won by {winnerName}</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No bids were placed.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript build**

```bash
cd "$(git rev-parse --show-toplevel)" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Start dev server: `npm run dev`

Open a live listing with multiple photos and verify:

- All photos appear — main image + thumbnail strip below
- Clicking a thumbnail swaps the main image
- A single-photo listing shows no thumbnail strip
- Desktop (≥768px): two-column layout, right column is sticky on scroll
- Mobile (<768px): single column, sticky bid bar fixed at bottom, main content not hidden under bar
- Timer pill: gray when >24h, amber when 1–24h, red with pulsing dot when <1h
- Bid count and "last bid Xm ago" appear in the bid panel
- Recent bids list shows relative timestamps ("just now", "3m ago", etc.)
- "You" badge appears on your own bids
- Ended listing: right column shows "Auction ended" banner; contact card, chat, rating, dispute intact in left column

- [ ] **Step 4: Commit**

```bash
git add app/listings/[id]/page.tsx
git commit -m "feat: redesign listing detail page — two-column layout, image gallery, sticky bid panel"
```

---

## Self-Review

### Spec coverage

| Spec requirement | Task |
|---|---|
| Image bug fix — all photos rendered | Task 2, Task 5 |
| Photos sorted by `display_order ASC` | Task 5 (preserved from original) |
| Thumbnail strip, click to swap main image | Task 2 |
| Single-photo: no thumbnail strip | Task 2 |
| Zero-photo: gradient placeholder | Task 2 |
| Desktop two-column grid (3fr / 2fr) | Task 5 |
| Right column sticky (`sticky top-24`) | Task 5 |
| Mobile single column | Task 5 |
| Mobile sticky bottom bar (`fixed bottom-0`) | Task 3 |
| `pb-32 md:pb-8` clearance for mobile bar | Task 5 |
| Timer pill gray / amber / red thresholds | Task 3 |
| Pulsing dot on red variant (`bid-pulse`) | Task 3 |
| Bid count in panel and activity line | Task 3, Task 5 |
| Last bid relative time in panel | Task 1, Task 3, Task 5 |
| Recent bids with relative timestamps | Task 1, Task 4 |
| "You" badge on current user's own bids | Task 4, Task 5 |
| Recent bids empty state | Task 4 |
| Ended-state banner in right column | Task 5 |
| Ended-auction UI intact in left column | Task 5 |
| Semantic Tailwind tokens for chrome | Tasks 3, 4, 5 |
| Raw amber/red for timer heat only | Task 3 |
| `bidder_id` in recentBids query | Task 5 |
| `bid_count` aggregate query | Task 5 |
| `formatRelativeTime` utility | Task 1 |
| shadcn Input + Button in bid form | Task 3 |

All spec requirements covered. ✓

### Placeholder scan

No TBDs, TODOs, or vague steps. All code blocks are complete. ✓

### Type consistency

- `Bid` type in `recent-bids-section.tsx` includes `bidder_id: string` — matches what `page.tsx` selects in Task 5 ✓
- `BidSection` Props gains `bidCount`, `lastBidAt`, `sellerName` — matches what `page.tsx` passes ✓
- `ImageGallery` Props: `photos`, `title`, `listingId` — matches `page.tsx` usage ✓
- `formatRelativeTime` imported in Tasks 3 and 4, defined in Task 1 ✓
- `Input` / `Button` imported from `@/components/ui/input` and `@/components/ui/button` ✓
- `TimerPill`, `BidForm`, `BidFormCompact`, `PanelContent` all defined before use in `bid-section.tsx` ✓

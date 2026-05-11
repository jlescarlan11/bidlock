# Listing Detail Page Redesign

**Date:** 2026-05-11  
**Status:** Approved  
**Files:** `app/listings/[id]/page.tsx`, `app/listings/[id]/bid-section.tsx`, `components/image-gallery.tsx`, `lib/utils/time.ts`

---

## Problem

Three issues on `app/listings/[id]/page.tsx`:

1. **Image bug** — `listing_photos` is fetched and sorted correctly, but only `photos[0]` is rendered. All other photos are silently dropped.
2. **Layout** — Single-column `max-w-2xl`, no hierarchy, no visual weight separating the bid action from informational content.
3. **No urgency signal** — A listing ending in 47 minutes looks identical to one ending in 3 days.

---

## Goals

The page has two equally important jobs: inform the user about the item, and convince them to bid right now. Layout decisions serve both.

---

## Layout

### Desktop

Two-column grid below the nav:

```
max-w-6xl mx-auto
grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-8

Left (60%)              Right (40%)
─────────────────       ─────────────────────
Image gallery           Title + "by [seller]"
Description             ─────────────────────
Recent bids             Bid panel (sticky)
Ended-auction UI        
```

Right column is `sticky top-24` so it stays visible while the user scrolls through the gallery and description.

### Mobile

Single column, top to bottom:

```
Image gallery
Title + "by [seller]"
Description
Recent bids
Ended-auction UI
[pb-32 spacer]
```

The desktop bid panel is `hidden md:block`. A compressed sticky bottom bar (`md:hidden`, `fixed bottom-0 left-0 right-0 z-40`) handles the bid action on mobile.

---

## Image Gallery (`components/image-gallery.tsx`)

New client component. Replaces the current `photos[0]`-only render.

**Props:**
```ts
type Props = {
  photos: string[]   // public URLs, pre-sorted by display_order ASC
  title: string
}
```

**Behavior:**
- `useState<number>(0)` tracks selected index
- Main image: `aspect-[4/3] rounded-xl overflow-hidden relative`, full width of left column
- Thumbnail strip: rendered only when `photos.length > 1`
  - Each thumb: `~80px square`, `rounded-lg`, `object-cover`
  - Active thumb: `ring-2 ring-primary ring-offset-2`
  - Clicking a thumb sets selected index → main image swaps
- Zero photos: render the `cardGradient` placeholder div (`aspect-[4/3] rounded-xl bg-gradient-to-br ${cardGradient(id)}`)

---

## Title + Seller Header

```
[Title — text-3xl font-black text-foreground]
by [seller] — text-sm text-muted-foreground
```

- **Desktop:** inside the right column, above the bid panel
- **Mobile:** between the image gallery and description; `md:hidden` on this instance, `hidden md:block` on the right-column instance

---

## Bid Panel (right column, desktop)

Container: `bg-card border border-border rounded-xl p-6`  
Sticky: `sticky top-24`  
Hidden on mobile: `hidden md:block`

The existing `BidSection` component (already `'use client'` with Realtime subscription) is refactored to render the bid panel. The panel is structured top to bottom:

### 1. Current bid block

```
CURRENT BID                          [timer pill]
₱5,000.00
14 bids · last bid 3m ago
```

- Eyebrow: `text-xs uppercase tracking-wider text-muted-foreground`
- Price: `text-4xl font-black text-foreground`
- Activity line: `text-sm text-muted-foreground`
  - Format: `{bidCount} bid{s} · last bid {relativeTime}` or `No bids yet`

**Timer pill** (top-right of the block):

```ts
const hoursLeft = (new Date(ends_at).getTime() - Date.now()) / 36e5
const timerVariant = hoursLeft < 1 ? 'red' : hoursLeft < 24 ? 'amber' : 'gray'
const showPulse = hoursLeft < 1
```

| Variant | Classes |
|---------|---------|
| gray    | `bg-black/60 text-white` |
| amber   | `bg-amber-600 text-white` |
| red     | `bg-red-600 text-white` + pulsing dot (`bid-pulse` keyframe) |

Since `BidSection` is already a client component, `timerVariant` is computed live — it will be reactive to elapsed time without an additional ticker (or can share the `Countdown` ticker).

### 2. Divider

`border-t border-border`

### 3. Bid input section

```
Minimum bid: ₱5,250.00

[Input — flex-1]     [Place bid — Button primary]
```

- Uses `components/ui/Input` and `components/ui/Button`
- Input + button on same row (`flex gap-2`)
- The existing confirm-step dialog is preserved

### 4. Seller info

`text-sm text-muted-foreground` — "Sold by [seller name]"

---

## Mobile Sticky Bid Bar

New client component: inline in `bid-section.tsx` or extracted as `MobileBidBar`.  
`fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-lg px-4 py-3 md:hidden`

Two rows:
```
[Current bid — text-sm font-bold]     [timer pill]
[Input — flex-1]                      [Place bid]
```

Main content area gets `pb-32 md:pb-0` to prevent the sticky bar from covering the bottom of the page.

---

## Description Block (left column)

```
About this item       ← text-lg font-bold mb-3
[body text]           ← text-foreground leading-relaxed whitespace-pre-wrap
```

No card wrapper, no border — plain typography only.

---

## Recent Bids (left column)

```
Recent bids           ← text-lg font-bold mb-3
```

Each row: `flex justify-between py-3 border-b border-border`

Left side:
```
[display name]  [You badge — optional]
[relative time — text-xs text-muted-foreground]
```

Right side: `font-medium` bid amount

**"You" badge:** `bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium` — shown when `bid.bidder_id === userId`. Requires adding `bidder_id` to the recentBids select (see Data Layer Changes).

**Empty state:** `"No bids yet. Be the first."` — centered, `text-sm text-muted-foreground`

**Timestamps:** use `formatRelativeTime` from `lib/utils/time.ts` (new helper, see below).

---

## Ended State (right column)

When `status === 'ended'`, the right column shows a simple ended banner in the same container:

```
bg-card border border-border rounded-xl p-6

Auction ended         ← text-sm uppercase tracking-wider text-muted-foreground
Won by [name]         ← font-bold
for ₱X,XXX            ← text-2xl font-black
```

Or, if no winner: `"No bids were placed."` in muted text.

The existing ended-auction UI (contact card, chat, rating form, dispute form) stays in the **left column**, below the description, unchanged.

---

## Data Layer Changes

### `app/listings/[id]/page.tsx`

**Already working (no change):**
- `listing_photos (storage_path, display_order)` — all rows fetched, sorted in JS
- `auctioneer:profiles!auctioneer_id(display_name)` — seller name

**Update recentBids select** — add `bidder_id` so "You" badge can compare against `userId`:
```ts
.select('id, amount, created_at, bidder_id, profiles!bidder_id(display_name)')
```

**Add: bid count**

```ts
const { count: bidCount } = await db
  .from('bids')
  .select('*', { count: 'exact', head: true })
  .eq('listing_id', id)
```

**Derive: last_bid_at**

```ts
const lastBidAt = recentBids?.[0]?.created_at ?? null
```

**Pass to BidSection:** `bidCount`, `lastBidAt`, `sellerName`

---

## New Utility: `formatRelativeTime`

Added to `lib/utils/time.ts`:

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

No new dependencies needed.

---

## Token Convention

Chrome elements use semantic tokens only:

| Element | Token |
|---------|-------|
| Panel background | `bg-card` |
| Panel border | `border-border` |
| Body text | `text-foreground` |
| Secondary text | `text-muted-foreground` |
| Dividers | `border-border` |
| "You" badge | `bg-primary/10 text-primary` |

Timer pill heat colors stay raw (`bg-amber-600`, `bg-red-600`) — same convention as the listing card.

---

## Acceptance Criteria

1. A listing with 5 photos shows all 5 — main image + 4 thumbnails. Clicking a thumb swaps the main image.
2. A listing with 1 photo shows no thumbnail strip.
3. A listing with 0 photos shows the gradient placeholder.
4. Desktop: two-column layout, right column sticky on scroll.
5. Mobile: single column, sticky bid bar at bottom. Main content not obscured.
6. Timer pill shows gray / amber / red at the correct thresholds. Red variant has pulsing dot.
7. Bid count and last bid time render in the bid panel (and mobile bar).
8. Recent bids show `formatRelativeTime` timestamps and a "You" badge for the current user's own bids.
9. Ended listings show the auction-ended banner in the right column; ended-auction UI (contact, chat, rating, dispute) is intact in the left column.
10. No raw `bg-violet-*` or `text-gray-*` on chrome elements.

---

## Out of Scope

- Real-time bid updates (Realtime channel already exists — preserve, don't expand)
- Watch / favorite button
- Share button
- Edit listing for sellers

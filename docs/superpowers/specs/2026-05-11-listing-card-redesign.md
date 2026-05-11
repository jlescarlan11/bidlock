# Listing Card Redesign

**Date:** 2026-05-11
**Status:** Approved

## Problem

The current `ListingCard` component (`components/listing-card.tsx`) has four structural issues:

1. **Inverted information hierarchy.** The "CURRENT BID" label appears first, then price, then title. Title is the item identity — it should anchor the card. Price is the hero number but it shouldn't be the first thing read.
2. **No activity signal.** A listing with 14 bids ending in 47 minutes looks identical to a listing with 0 bids ending in 3 days. Auction UX lives on perceived liveness.
3. **Timer urgency not felt.** The countdown pill is informational but not reactive — it looks the same whether the auction ends in 2 days or 2 minutes. Urgency must be environmental, not just numeric.
4. **Info section feels tacked on.** The `p-3.5` area below the image has no visual hierarchy beyond font size. It reads as an afterthought rather than a designed section.

## Solution

Approach B: Structured Panel — same image-on-top layout with the info section restructured and a three-state progressive heat treatment system.

---

## Visual Structure

### Info section (all states)

```
[ IMAGE (aspect-ratio 4:3) ]
─────────────────────────────  ← amber border-top on warm/hot cards
 Title (font-bold, line-clamp-2)
 ₱10,500.00        14 bids ←── bid pill, only when bid_count > 0
 last bid 3m ago              ←── activity line (reserved slot, conditionally populated)
```

**Removed:** The `CURRENT BID` label and the `h-px` divider.

**Image ratio change:** `aspect-square` → `aspect-[4/3]`. Gives the info section more breathing room and matches the standard product card ratio.

---

## Three States

### Cold (default, ~95% of cards)

Triggers: any card.

| Element | Treatment |
|---|---|
| Card border | `border-border` (unchanged) |
| Card background | `bg-card` (unchanged) |
| Info border-top | none |
| Timer pill | `bg-black/60` dark gray |
| Timer dot | static orange (`bg-orange-400`) |
| Bid pill | hidden (no bids) |
| Activity line | "No bids yet" in `text-gray-400` (muted — must not pull eye) |

### Warm (heat treatment level 1)

Triggers: `bid_count >= 10` OR `ends_at < 24h` (either condition is sufficient).

| Element | Treatment |
|---|---|
| Card border | `border-amber-200` |
| Card background | `bg-amber-50/30` (barely visible — if you can see it on a single card, it's too much) |
| Info border-top | `border-t-2 border-amber-300` |
| Timer pill | amber `bg-amber-600/88` when `ends_at < 24h`, otherwise unchanged |
| Bid pill | amber `bg-amber-100 text-amber-800`, capped at "99+" for bid_count > 99 |
| Activity line | empty slot (reserved height — prevents grid height jitter) |

**Contrast note:** The warm card uses an amber gradient image placeholder. Verify that the amber timer pill (`bg-amber-600`) has sufficient contrast against the lightest part of the image at the top edge. The pill has `backdrop-blur` which helps, but this must be checked with a real bright image.

### Hot (heat treatment level 2)

Triggers: `ends_at < 1h`.

Inherits all warm treatment, plus:

| Element | Treatment |
|---|---|
| Timer pill | red `bg-red-600/92` |
| Timer dot | white `bg-white`, pulsing — `animate-pulse` duration **2s**, opacity swing 1→0.3 (subtle, not notification-spam) |
| Activity line | "last bid Xm ago" in `text-amber-600 font-semibold`, **only if** `last_bid_at` is within the last 60 minutes. Otherwise empty (reserved). |

**Bid pill stays amber on hot cards.** Red is the timer's signal. Escalating the bid pill to red too would dilute the timer's singular urgency.

---

## State Logic (pseudo-code)

```ts
const hoursLeft = (new Date(ends_at).getTime() - Date.now()) / 36e5

const isHot  = hoursLeft < 1
const isWarm = !isHot && (hoursLeft < 24 || bid_count >= 10)

const timerVariant = isHot ? 'red' : hoursLeft < 24 ? 'amber' : 'gray'

const showBidPill   = bid_count > 0
const bidPillLabel  = bid_count > 99 ? '99+' : `${bid_count} bids`

const minutesSinceLastBid = last_bid_at
  ? (Date.now() - new Date(last_bid_at).getTime()) / 60000
  : null

const activityText = bid_count === 0
  ? 'No bids yet'
  : isHot && minutesSinceLastBid !== null && minutesSinceLastBid < 60
    ? `last bid ${Math.round(minutesSinceLastBid)}m ago`
    : null   // empty — slot still rendered for height reservation
```

---

## Data Changes

The component currently receives:

```ts
{
  id: string
  title: string
  current_bid: number
  ends_at: string
  listing_photos: { storage_path: string; display_order: number }[]
}
```

Two new fields are required:

```ts
  bid_count: number          // COUNT of bids on this listing
  last_bid_at: string | null // MAX(created_at) from bids, null if no bids
```

Both are cheap to fetch. The `bids` table has `bids_listing_id_idx ON bids (listing_id, created_at DESC)` — a single aggregation join suffices:

```sql
SELECT
  l.*,
  COUNT(b.id)         AS bid_count,
  MAX(b.created_at)   AS last_bid_at
FROM listings l
LEFT JOIN bids b ON b.listing_id = l.id
GROUP BY l.id
```

This join must be added wherever listings are fetched for grid display (currently `app/page.tsx` and any other listing feed pages).

---

## Implementation Notes

- **Height reservation for activity line:** The activity line `<p>` must always render, even when empty. Use `min-h-[1rem]` or equivalent — do not conditionally omit the element. This prevents grid cards from jitching height between states.
- **Pulse timing:** Use Tailwind's `animate-pulse` but override duration via `[animation-duration:2s]` — the default 2s is fine but confirm it doesn't feel urgent on a crowded grid. Pulse is reserved for `isHot` only.
- **`99+` cap:** `bid_count > 99 ? '99+' : \`${bid_count} bids\`` prevents the amber pill from widening beyond its designed width and pushing the price text.
- **Amber pill contrast on warm image placeholders:** Card gradient placeholders for warm state are `from-amber-100 to-amber-200`. The pill `bg-amber-600` at 88% opacity should be dark enough to read — verify visually and adjust to `bg-amber-700` if needed.
- **`CURRENT BID` label:** Remove entirely. The peso sign + `font-black` price communicates the same thing without the noise.

---

## Files to Change

| File | Change |
|---|---|
| `components/listing-card.tsx` | Full restructure per spec |
| `app/page.tsx` | Add `bid_count`, `last_bid_at` to listings query |
| Any other listing feed pages | Same query addition |

---

## Out of Scope

- Mobile viewport testing (noted as a risk for the price+pill row at narrow widths — handle in follow-up QA)
- Real-time bid count updates on the card (Realtime channel work is separate)
- Listing detail page card changes

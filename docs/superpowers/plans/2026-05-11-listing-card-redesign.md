# Listing Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `ListingCard` with a title-first layout, three-state heat treatment (cold/warm/hot), bid activity signals, and a pulsing timer for endings under 1 hour.

**Architecture:** Three independent changes — a CSS keyframe addition, a query extension in the page, and a full component rewrite. Tasks can be done sequentially; each leaves the app in a working state. State logic is computed inline in the component from two new fields (`bid_count`, `last_bid_at`) passed from the page.

**Tech Stack:** Next.js App Router (server components), Supabase JS client, Tailwind CSS v4 (CSS-based config — no `tailwind.config.ts`), TypeScript.

---

## File Map

| File | Change |
|---|---|
| `app/globals.css` | Add `@keyframes bid-pulse` for the hot-state timer dot |
| `app/page.tsx` | Extend `.select()` to include `bids(created_at)`; add mapping to derive `bid_count` and `last_bid_at` |
| `components/listing-card.tsx` | Full rewrite: new Props type, state helpers, restructured JSX |

---

## Task 1: Add `bid-pulse` keyframe to `app/globals.css`

**Files:**
- Modify: `app/globals.css`

Tailwind's built-in `animate-pulse` swings opacity `1 → 0.5`. The spec calls for `1 → 0.3`. This requires a custom keyframe applied via Tailwind's arbitrary-value syntax: `[animation:bid-pulse_2s_ease-in-out_infinite]`.

- [ ] **Step 1: Add the keyframe at the end of `app/globals.css`**

Append after the closing `}` of the `@layer base` block (currently the last block in the file, around line 134):

```css
@keyframes bid-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
```

- [ ] **Step 2: Verify TypeScript build still passes**

```bash
npx tsc --noEmit
```

Expected: no errors. (CSS changes don't affect TypeScript, but this establishes the baseline check for subsequent tasks.)

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add bid-pulse keyframe for hot-state timer dot"
```

---

## Task 2: Extend listings query and map bid stats in `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

The Supabase embedded-relation syntax (`bids(created_at)`) fetches all bid timestamps for each listing in a single round-trip. `bid_count` and `last_bid_at` are derived from this in JS before passing to `ListingCard`. The existing `liveIds` derivation and stats queries are unchanged.

- [ ] **Step 1: Replace the listings `select` to include embedded bids**

In `app/page.tsx`, change lines 10–14:

```ts
// Before:
const { data: listings } = await db
  .from('listings')
  .select('id, title, current_bid, ends_at, listing_photos(storage_path, display_order)')
  .eq('status', 'live')
  .order('ends_at', { ascending: true })
```

```ts
// After:
const { data: rawListings } = await db
  .from('listings')
  .select('id, title, current_bid, ends_at, listing_photos(storage_path, display_order), bids(created_at)')
  .eq('status', 'live')
  .order('ends_at', { ascending: true })
```

- [ ] **Step 2: Update `liveIds` to derive from `rawListings`**

Change line 16:

```ts
// Before:
const liveIds = (listings ?? []).map((l: any) => l.id)

// After:
const liveIds = (rawListings ?? []).map((l: any) => l.id)
```

- [ ] **Step 3: Add bid-stat mapping after the stats `Promise.all` block**

After line 30 (the `totalSold` declaration), add:

```ts
const listings = (rawListings ?? []).map((listing: any) => {
  const bidRows: { created_at: string }[] = listing.bids ?? []
  const bid_count = bidRows.length
  const last_bid_at =
    bidRows.length > 0
      ? bidRows.reduce(
          (max: string, b: any) => (b.created_at > max ? b.created_at : max),
          bidRows[0].created_at
        )
      : null
  return {
    id: listing.id,
    title: listing.title,
    current_bid: listing.current_bid,
    ends_at: listing.ends_at,
    bid_count,
    last_bid_at,
    listing_photos: (listing.listing_photos ?? []).sort(
      (a: any, b: any) => a.display_order - b.display_order
    ),
  }
})
```

- [ ] **Step 4: Simplify the `ListingCard` render — pre-sorting is now done in the mapping above**

Find the `listings?.map(...)` block in the JSX (around line 114) and replace it:

```tsx
// Before:
{listings?.map((listing: any) => (
  <ListingCard
    key={listing.id}
    listing={{
      ...listing,
      listing_photos: (listing.listing_photos ?? []).sort(
        (a: any, b: any) => a.display_order - b.display_order
      ),
    }}
  />
))}
```

```tsx
// After:
{listings.map((listing) => (
  <ListingCard key={listing.id} listing={listing} />
))}
```

Also update the empty-state guard (around line 106) to use `listings` instead of `listings?.length`:

```tsx
// Before:
{!listings?.length && (

// After:
{!listings.length && (
```

And the `LandingHero` call (line 41):

```tsx
// Before:
<LandingHero listings={listings ?? []} stats={stats} />

// After:
<LandingHero listings={listings} stats={stats} />
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat: extend listings query with bid_count and last_bid_at"
```

---

## Task 3: Rewrite `components/listing-card.tsx`

**Files:**
- Modify: `components/listing-card.tsx`

Full rewrite. The component gains two new Props fields, two pure helper functions for state derivation, and a restructured JSX layout matching the spec: title → price+pill row → activity line (always rendered).

- [ ] **Step 1: Replace the entire file with the redesigned component**

```tsx
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import Countdown from './countdown'
import { formatPHP } from '@/lib/utils/currency'
import { cardGradient } from '@/lib/utils/card-gradient'

type Props = {
  listing: {
    id: string
    title: string
    current_bid: number
    ends_at: string
    bid_count: number
    last_bid_at: string | null
    listing_photos: { storage_path: string; display_order: number }[]
  }
}

// Card-level heat treatment is time-only. bid_count is expressed through the
// bid pill, not the card background — popularity ≠ urgency.
function getCardState(endsAt: string) {
  const hoursLeft = (new Date(endsAt).getTime() - Date.now()) / 3_600_000
  const isHot  = hoursLeft < 1
  const isWarm = !isHot && hoursLeft < 24
  const timerVariant: 'gray' | 'amber' | 'red' =
    isHot ? 'red' : hoursLeft < 24 ? 'amber' : 'gray'
  return { isHot, isWarm, timerVariant }
}

// Activity text rules per spec:
// - 0 bids → "No bids yet" (always)
// - hot + last bid within 60m → "last bid Xm ago"
// - everything else → null (slot rendered empty)
function getActivityText(
  bidCount: number,
  lastBidAt: string | null,
  isHot: boolean
): string | null {
  if (bidCount === 0) return 'No bids yet'
  if (!isHot || !lastBidAt) return null
  const minutesAgo = (Date.now() - new Date(lastBidAt).getTime()) / 60_000
  return minutesAgo < 60 ? `last bid ${Math.round(minutesAgo)}m ago` : null
}

const timerPillClass: Record<'gray' | 'amber' | 'red', string> = {
  gray:  'bg-black/60 text-white',
  amber: 'bg-amber-600/90 text-white',
  red:   'bg-red-600/90 text-white',
}

export default async function ListingCard({ listing }: Props) {
  const supabase = await createClient()
  const photo = listing.listing_photos[0]
  const photoUrl = photo
    ? supabase.storage.from('listing-photos').getPublicUrl(photo.storage_path).data.publicUrl
    : null

  const { isHot, isWarm, timerVariant } = getCardState(listing.ends_at)
  const isHeated = isWarm || isHot

  const bidPillLabel =
    listing.bid_count > 99 ? '99+' : `${listing.bid_count} bids`
  const activityText = getActivityText(
    listing.bid_count,
    listing.last_bid_at,
    isHot
  )

  return (
    <Link
      href={`/listings/${listing.id}`}
      className={[
        'group block rounded-2xl border overflow-hidden',
        'hover:shadow-xl hover:shadow-violet-200/60 hover:-translate-y-1 hover:border-primary/30',
        'transition-all duration-200 ease-out',
        isHeated ? 'bg-amber-50/30 border-amber-200' : 'bg-card border-border',
      ].join(' ')}
    >
      {/* Image — aspect-[4/3] per spec (was aspect-square) */}
      <div
        className={`aspect-[4/3] bg-gradient-to-br ${cardGradient(listing.id)} relative overflow-hidden`}
      >
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={listing.title}
            fill
            className="object-cover group-hover:scale-[1.04] transition-transform duration-300 ease-out"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl opacity-20" aria-hidden="true">
              🏷️
            </span>
          </div>
        )}

        {/* Timer pill — color shifts with state; dot pulses only on hot */}
        <div className="absolute top-2.5 right-2.5">
          <div
            className={`${timerPillClass[timerVariant]} transition-colors duration-300 text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 leading-none backdrop-blur-md`}
          >
            <span
              className={[
                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                timerVariant === 'red'
                  ? 'bg-white [animation:bid-pulse_2s_ease-in-out_infinite]'
                  : 'bg-orange-400',
              ].join(' ')}
              aria-hidden="true"
            />
            <Countdown endsAt={listing.ends_at} />
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>

      {/* Info section */}
      <div
        className={[
          'p-3.5',
          isHeated ? 'border-t-2 border-amber-300' : 'border-t-2 border-transparent',
        ].join(' ')}
      >
        {/* Title anchors the card — item identity before price */}
        <p className="text-sm font-bold text-foreground line-clamp-2 leading-snug mb-2">
          {listing.title}
        </p>

        {/* Price + bid count on same row */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-xl font-black text-primary leading-none">
            {formatPHP(listing.current_bid)}
          </p>
          {listing.bid_count > 0 && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
              {bidPillLabel}
            </span>
          )}
        </div>

        {/* Activity line — ALWAYS rendered (h-4 reserves slot so card height never shifts).
            Text is conditional; the element is not. */}
        <p
          className={[
            'h-4 text-[10px] leading-4',
            activityText === 'No bids yet'
              ? 'text-gray-400'
              : 'text-amber-600 font-semibold',
          ].join(' ')}
        >
          {activityText ?? ''}
        </p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see `Type '...' is not assignable to type '...'` on the `listing` prop at the `ListingCard` call site in `app/page.tsx`, verify that the mapped object in Task 2 Step 3 includes all required fields: `id`, `title`, `current_bid`, `ends_at`, `bid_count`, `last_bid_at`, `listing_photos`.

- [ ] **Step 3: Start dev server and do visual check**

```bash
npm run dev
```

Open `http://localhost:3000`. In the Live Auctions grid:

| Check | What to look for |
|---|---|
| Cold card | White background, dark-gray timer pill with static orange dot, "No bids yet" in muted gray, no bid pill |
| Card with bids (if seed data has any) | Amber bid pill right of price ("X bids"), activity line visible only if hot + recent |
| Ending soon (< 24h) | Amber card border + subtle warm background, amber timer pill |
| Image hover | Image scales 1.04× |
| Title wrapping | Long titles line-clamp at 2 lines without pushing layout |
| Bid pill at "99+" | If you have a listing with 100+ bids, pill shows "99+" and doesn't widen |
| Activity line height | All cards in a row should be identical height — no height shift between cold and hot cards |

- [ ] **Step 4: Seed a warm/hot card if needed**

If no listings in your local database are ending within 24h, update one temporarily via Supabase Studio or SQL:

```sql
UPDATE listings
SET ends_at = now() + interval '30 minutes'
WHERE id = '<any-live-listing-id>';
```

This will trigger the hot state (red pill, pulsing dot). Verify the pulse animation is subtle (~2s, opacity doesn't drop below perceptible). Revert after check.

- [ ] **Step 5: Commit**

```bash
git add components/listing-card.tsx
git commit -m "feat: redesign listing card — title-first layout with three-state heat treatment"
```

---

## Self-Review Against Spec

| Spec requirement | Task |
|---|---|
| Title above price | Task 3 |
| `aspect-[4/3]` image | Task 3 |
| Remove `CURRENT BID` label | Task 3 |
| Timer pill: gray → amber → red by time | Task 3 (`getCardState`) |
| Timer dot pulses only on hot, 2s, 0.3 opacity | Task 1 + Task 3 |
| Bid pill: amber, shows when `bid_count > 0` | Task 3 |
| Bid pill capped at 99+ | Task 3 |
| Card-level heat treatment: `ends_at < 24h` only | Task 3 (`isWarm`/`isHot`) |
| Warm: amber border + `bg-amber-50/30` | Task 3 |
| Activity line always rendered (`h-4`) | Task 3 |
| "No bids yet" in `text-gray-400` | Task 3 |
| "last bid Xm ago" only on hot + last_bid_at < 60m | Task 3 (`getActivityText`) |
| `bid_count` and `last_bid_at` from DB | Task 2 |
| `bid-pulse` keyframe in globals.css | Task 1 |
| `transition-colors duration-300` on card shell | Task 3 |
| `transition-colors duration-300` on timer pill | Task 3 |
| Heat treatment colors NOT tokenized | Task 3 (raw Tailwind amber/red classes) |

# My Bids Page — Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `app/me/bids/page.tsx` to show enriched bid cards with thumbnails, Winning/Outbid/No-other-bids status badges, deduplicated listings, and a `max-w-7xl` container aligned to the site header.

**Architecture:** Single server component file — all changes stay in `app/me/bids/page.tsx`. The page fetches bids + photos + other-bid-counts in the server function, deduplicates by listing, builds thumbnail URLs, then passes enriched data to inline `Section` and `BidCard` components.

**Tech Stack:** Next.js 16 App Router, Supabase JS v2, Tailwind CSS, shadcn/ui `Badge`, `next/image`, `@/lib/utils/currency` (formatPHP), `@/lib/utils/time` (formatTimeRemaining)

---

## File Structure

| File | Change |
|---|---|
| `app/me/bids/page.tsx` | Full rewrite — query, dedup, photo URLs, new components |

No other files touched.

---

## Task 1: Update the data query — add photos, deduplication, other-bid-counts

**Files:**
- Modify: `app/me/bids/page.tsx`

- [ ] **Step 1: Replace the bids query to include listing photos**

In `MyBidsPage`, change the `.select(...)` call from:

```ts
const { data: bids } = await db
  .from('bids')
  .select(`
    id, amount, created_at,
    listings (id, title, status, current_bid, winner_id, ends_at)
  `)
  .eq('bidder_id', user.id)
  .order('created_at', { ascending: false })
```

to:

```ts
const { data: bids } = await db
  .from('bids')
  .select(`
    id, amount, created_at,
    listings (id, title, status, current_bid, winner_id, ends_at,
      listing_photos (storage_path, display_order)
    )
  `)
  .eq('bidder_id', user.id)
  .order('created_at', { ascending: false })
```

- [ ] **Step 2: Add client-side deduplication (one row per listing, most recent bid)**

After the bids fetch, add:

```ts
const seen = new Set<string>()
const deduped = (bids ?? []).filter((b: any) => {
  const id = b.listings?.id
  if (!id || seen.has(id)) return false
  seen.add(id)
  return true
})
```

Bids are already ordered by `created_at DESC` so the first occurrence of each `listing.id` is the most recent bid.

- [ ] **Step 3: Build thumbnail URLs from listing_photos**

After dedup, add:

```ts
const bidsWithThumbs = deduped.map((bid: any) => {
  const photos: any[] = bid.listings?.listing_photos ?? []
  const firstPhoto = photos.sort((a: any, b: any) => a.display_order - b.display_order)[0]
  const thumbnailUrl = firstPhoto
    ? supabase.storage.from('listing-photos').getPublicUrl(firstPhoto.storage_path).data.publicUrl
    : null
  return { ...bid, thumbnailUrl }
})
```

- [ ] **Step 4: Fetch other-bid-counts for active listings**

After building `bidsWithThumbs`, add:

```ts
const activeListingIds: string[] = bidsWithThumbs
  .filter((b: any) => b.listings?.status === 'live')
  .map((b: any) => b.listings?.id)
  .filter(Boolean)

const otherBidListings = new Set<string>()
if (activeListingIds.length > 0) {
  const { data: otherBids } = await db
    .from('bids')
    .select('listing_id')
    .neq('bidder_id', user.id)
    .in('listing_id', activeListingIds)
  ;(otherBids ?? []).forEach((b: any) => otherBidListings.add(b.listing_id))
}
```

- [ ] **Step 5: Update the active/won/lost filters to use `bidsWithThumbs`**

Replace:
```ts
const active = bids?.filter(...) ?? []
const won = bids?.filter(...) ?? []
const lost = bids?.filter(...) ?? []
```

with:
```ts
const active = bidsWithThumbs.filter((b: any) => b.listings?.status === 'live')
const won = bidsWithThumbs.filter((b: any) => b.listings?.status === 'ended' && b.listings?.winner_id === user.id)
const lost = bidsWithThumbs.filter((b: any) => b.listings?.status === 'ended' && b.listings?.winner_id !== null && b.listings?.winner_id !== user.id)
```

- [ ] **Step 6: Pass `otherBidListings` to the Active Section**

Update the JSX to pass the set:

```tsx
<Section title="Active" items={active} userId={user.id} otherBidListings={otherBidListings} />
<Section title="Won" items={won} userId={user.id} otherBidListings={new Set()} />
<Section title="Lost" items={lost} userId={user.id} otherBidListings={new Set()} />
```

- [ ] **Step 7: Verify the build compiles**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock" && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors (warnings about `any` are fine).

- [ ] **Step 8: Commit**

```bash
git add app/me/bids/page.tsx
git commit -m "feat(mybids): add photos, dedup, and other-bid-count to query"
```

---

## Task 2: Add helper functions

**Files:**
- Modify: `app/me/bids/page.tsx`

Add these three pure functions above the `MyBidsPage` export. They have no side effects and can be verified by inspection.

- [ ] **Step 1: Add `getInitials`**

```ts
function getInitials(title: string): string {
  return title
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}
```

Verify mentally: `getInitials("Gray Jacket")` → `"GJ"`, `getInitials("Canvas Backpack Pro")` → `"CB"`, `getInitials("Ring")` → `"R"`.

- [ ] **Step 2: Add `getBidStatus`**

```ts
type BidStatus = 'winning' | 'outbid' | 'no-other-bids'

function getBidStatus(
  bidAmount: number,
  currentBid: number,
  hasOtherBids: boolean
): BidStatus {
  if (!hasOtherBids) return 'no-other-bids'
  return bidAmount >= currentBid ? 'winning' : 'outbid'
}
```

Verify mentally:
- `getBidStatus(10500, 10500, true)` → `'winning'`
- `getBidStatus(10000, 10500, true)` → `'outbid'`
- `getBidStatus(10500, 10500, false)` → `'no-other-bids'`

- [ ] **Step 3: Add `formatEndedDate`**

```ts
function formatEndedDate(endsAt: string): string {
  return new Date(endsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
```

Verify mentally: `formatEndedDate("2026-05-09T12:00:00Z")` → `"May 9"`.

- [ ] **Step 4: Commit**

```bash
git add app/me/bids/page.tsx
git commit -m "feat(mybids): add getInitials, getBidStatus, and formatEndedDate helpers"
```

---

## Task 3: Rebuild the `BidCard` and `Section` components

**Files:**
- Modify: `app/me/bids/page.tsx`

Replace the existing `Section` function entirely with two new components: `BidCard` and `Section`.

- [ ] **Step 1: Add `Image` and `formatTimeRemaining` imports at the top of the file**

Add to the import block (Task 5 will do a final pass, but add these now before writing BidCard):

```ts
import Image from 'next/image'
import { formatTimeRemaining } from '@/lib/utils/time'
```

Also remove the `Badge` import — the new BidCard uses `<span>` elements for badge pills instead.

- [ ] **Step 2: Add the `BidCard` component**

Add this below the helper functions and above `Section`:

```tsx
import Image from 'next/image'
import { formatTimeRemaining } from '@/lib/utils/time'

function BidCard({
  bid,
  userId,
  hasOtherBids,
}: {
  bid: any
  userId: string
  hasOtherBids: boolean
}) {
  const listing = bid.listings as any
  if (!listing) return null

  const isActive = listing.status === 'live'
  const isWon = listing.status === 'ended' && listing.winner_id === userId

  // Subtitle text
  let subtitle: string
  if (isActive) {
    const remaining = formatTimeRemaining(listing.ends_at)
    subtitle = remaining === 'Ended' ? 'Ended' : `Ends in ${remaining}`
  } else {
    const endedDate = formatEndedDate(listing.ends_at)
    if (!isWon && listing.winner_id !== null) {
      subtitle = `Ended ${endedDate} · Sold for ${formatPHP(listing.current_bid)}`
    } else {
      subtitle = `Ended ${endedDate}`
    }
  }

  // Badge
  let badgeLabel: string
  let badgeClass: string
  if (isActive) {
    const status = getBidStatus(bid.amount, listing.current_bid, hasOtherBids)
    if (status === 'winning') {
      badgeLabel = 'Winning'
      badgeClass = 'bg-green-100 text-green-700 border-green-200'
    } else if (status === 'outbid') {
      badgeLabel = 'Outbid'
      badgeClass = 'bg-amber-100 text-amber-700 border-amber-200'
    } else {
      badgeLabel = 'No other bids'
      badgeClass = 'bg-muted text-muted-foreground border-border'
    }
  } else if (isWon) {
    badgeLabel = 'Won'
    badgeClass = 'bg-green-100 text-green-700 border-green-200'
  } else {
    badgeLabel = 'Lost'
    badgeClass = 'bg-muted text-muted-foreground border-border'
  }

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm transition-colors hover:bg-muted/40"
    >
      {/* Thumbnail */}
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[9px] bg-muted">
        {bid.thumbnailUrl ? (
          <Image
            src={bid.thumbnailUrl}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-bold text-muted-foreground">
            {getInitials(listing.title)}
          </span>
        )}
      </div>

      {/* Title + subtitle */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{listing.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>

      {/* Amount + badge */}
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold">{formatPHP(bid.amount)}</p>
        <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeClass}`}>
          {badgeLabel}
        </span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Replace the `Section` component**

Replace the existing `Section` function with:

```tsx
function Section({
  title,
  items,
  userId,
  otherBidListings,
}: {
  title: string
  items: any[]
  userId: string
  otherBidListings: Set<string>
}) {
  return (
    <div>
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title} · {items.length}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No {title.toLowerCase()} auctions yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((bid: any) => (
            <BidCard
              key={bid.id}
              bid={bid}
              userId={userId}
              hasOtherBids={otherBidListings.has(bid.listings?.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify the build compiles**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock" && npm run build 2>&1 | tail -20
```

Expected: clean build, no errors.

- [ ] **Step 5: Commit**

```bash
git add app/me/bids/page.tsx
git commit -m "feat(mybids): rebuild BidCard and Section with thumbnails and status badges"
```

---

## Task 4: Update the page container and section headers

**Files:**
- Modify: `app/me/bids/page.tsx`

- [ ] **Step 1: Update the page wrapper div**

Change:
```tsx
<div className="max-w-2xl mx-auto p-4 pt-8 space-y-8">
  <h1 className="text-2xl font-bold">My Bids</h1>
```

to:
```tsx
<div className="max-w-7xl mx-auto p-4 pt-8 space-y-8">
  <h1 className="text-2xl font-bold">My Bids</h1>
```

- [ ] **Step 2: Start the dev server and verify the page visually**

```bash
npm run dev
```

Open `http://localhost:3000/me/bids` and confirm:
- Container stretches to match the header width
- Each bid shows a thumbnail (or initials fallback)
- Active bids show Winning / Outbid / No other bids badge
- Won bids show green "Won" badge
- Lost bids show gray "Lost" badge with "Sold for ₱X" in the subtitle
- Section headers read "ACTIVE · N", "WON · N", "LOST · N"
- Empty sections show "No X auctions yet." (not "None.")
- Each card is a clickable link to the listing

- [ ] **Step 3: Commit**

```bash
git add app/me/bids/page.tsx
git commit -m "feat(mybids): align container to max-w-7xl matching header width"
```

---

## Task 5: Add the `next/image` import and `formatTimeRemaining` import

> Note: The imports for `Image` and `formatTimeRemaining` were referenced in Task 3 but need to be confirmed at the top of the file.

**Files:**
- Modify: `app/me/bids/page.tsx`

- [ ] **Step 1: Update imports at the top of the file**

The final import block should be:

```ts
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatPHP } from '@/lib/utils/currency'
import { formatTimeRemaining } from '@/lib/utils/time'
```

Remove the `Badge` import from shadcn — we're using inline `<span>` elements for badges now (more control over pill styling without variant overrides).

- [ ] **Step 2: Verify build is clean**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock" && npm run build 2>&1 | tail -20
```

Expected: no errors. Any `@typescript-eslint/no-explicit-any` warnings are acceptable — this file already uses that pattern.

- [ ] **Step 3: Final commit**

```bash
git add app/me/bids/page.tsx
git commit -m "feat(mybids): finalize imports for Image and formatTimeRemaining"
```

---

## Final file shape (reference)

After all tasks, `app/me/bids/page.tsx` should look like this (abridged):

```ts
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatPHP } from '@/lib/utils/currency'
import { formatTimeRemaining } from '@/lib/utils/time'

// --- helpers ---
function getInitials(title: string): string { ... }
type BidStatus = 'winning' | 'outbid' | 'no-other-bids'
function getBidStatus(bidAmount, currentBid, hasOtherBids): BidStatus { ... }
function formatEndedDate(endsAt: string): string { ... }

// --- page ---
export default async function MyBidsPage() {
  // 1. auth
  // 2. bids query (with listing_photos)
  // 3. dedup
  // 4. build thumbnailUrls
  // 5. fetch otherBidListings
  // 6. filter active/won/lost
  // 7. render <Section> ×3
}

// --- components ---
function BidCard({ bid, userId, hasOtherBids }) { ... }
function Section({ title, items, userId, otherBidListings }) { ... }
```

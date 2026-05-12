# My Listings Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `app/me/listings/page.tsx` to show seller listings grouped into urgency-ordered sections with thumbnail cards and color-coded status badges, matching the My Bids page design language.

**Architecture:** Single file rewrite of `app/me/listings/page.tsx`. All helper functions and sub-components (ListingCard, Section, CancelledSection) live in the same file following the My Bids page pattern. No new files created, no shared components extracted.

**Tech Stack:** Next.js App Router (RSC), Tailwind CSS, Supabase JS client, `next/image`, existing utilities (`formatPHP` from `lib/utils/currency`, `formatTimeRemaining` from `lib/utils/time`)

---

## File Map

| File | Action |
|---|---|
| `app/me/listings/page.tsx` | Complete rewrite — all tasks modify this file |

---

### Task 1: Update imports and add helper functions

Replace the current file top (imports + `statusLabel` constant) with the new version that adds `Image`, the urgency-tint helper, subtitle builder, and badge class helper.

**Files:**
- Modify: `app/me/listings/page.tsx`

- [ ] **Step 1: Replace the file content up through the statusLabel constant**

Open `app/me/listings/page.tsx`. Replace everything from line 1 through the closing `}` of `statusLabel` (currently ends around line 14) with:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatPHP } from '@/lib/utils/currency'
import { formatTimeRemaining } from '@/lib/utils/time'

function getInitials(title: string): string {
  return title
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function formatEndedDate(endsAt: string): string {
  const d = new Date(endsAt)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getSubtitle(listing: any): string {
  switch (listing.status) {
    case 'pending_payment':
      return 'Listing fee due — pay to go live'
    case 'rejected':
      return listing.rejection_reason ?? 'Rejected'
    case 'awaiting_review':
      return 'Submitted — awaiting admin review'
    case 'live': {
      const remaining = formatTimeRemaining(listing.ends_at)
      return remaining === 'Ended' ? 'Ended' : `Ends in ${remaining}`
    }
    case 'ended': {
      const date = formatEndedDate(listing.ends_at)
      const prefix = date ? `Ended ${date}` : 'Ended'
      return listing.winner_id
        ? `${prefix} · Sold for ${formatPHP(listing.current_bid)}`
        : `${prefix} · No bids`
    }
    case 'cancelled':
      return 'Cancelled'
    default:
      return ''
  }
}

function getBadgeClasses(status: string): string {
  switch (status) {
    case 'pending_payment': return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'rejected':        return 'bg-red-100 text-red-700 border-red-200'
    case 'awaiting_review': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'live':            return 'bg-green-100 text-green-700 border-green-200'
    default:                return 'bg-muted text-muted-foreground border-border'
  }
}

function getPlaceholderClass(status: string): string {
  switch (status) {
    case 'pending_payment': return 'bg-amber-50 text-amber-400'
    case 'rejected':        return 'bg-red-50 text-red-300'
    case 'awaiting_review': return 'bg-blue-50 text-blue-300'
    default:                return 'bg-muted text-muted-foreground'
  }
}

const statusLabel: Record<string, string> = {
  pending_payment: 'Pending payment',
  awaiting_review: 'Under review',
  rejected:        'Rejected',
  live:            'Live',
  ended:           'Ended',
  cancelled:       'Cancelled',
}
```

- [ ] **Step 2: Verify the build still compiles**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing errors unrelated to `page.tsx`).

---

### Task 2: Add the ListingCard component

Insert `ListingCard` after the `statusLabel` constant and before the existing `MyListingsPage` function.

**Files:**
- Modify: `app/me/listings/page.tsx`

- [ ] **Step 1: Add the ListingCard function after statusLabel**

Insert this block between the `statusLabel` closing brace and the `export default async function MyListingsPage()` line:

```tsx
function ListingCard({
  listing,
  thumbnailUrl,
}: {
  listing: any
  thumbnailUrl: string | null
}) {
  const isPendingPayment = listing.status === 'pending_payment'
  const isLinked = ['rejected', 'live', 'ended'].includes(listing.status)

  const cardHref = isPendingPayment
    ? `/listings/${listing.id}/pay`
    : `/listings/${listing.id}`

  const subtitleClass =
    listing.status === 'pending_payment'
      ? 'text-amber-800'
      : listing.status === 'rejected'
      ? 'text-destructive'
      : 'text-muted-foreground'

  const placeholderClass = getPlaceholderClass(listing.status)

  const inner = (
    <>
      <div
        className={`relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[9px] ${
          thumbnailUrl ? 'bg-muted' : placeholderClass
        }`}
      >
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="52px"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-bold">
            {getInitials(listing.title)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{listing.title}</p>
        <p className={`mt-0.5 truncate text-xs ${subtitleClass}`}>
          {getSubtitle(listing)}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-bold">{formatPHP(listing.current_bid)}</p>
        <span
          className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${getBadgeClasses(listing.status)}`}
        >
          {statusLabel[listing.status] ?? listing.status}
        </span>
        {isPendingPayment && (
          <span className="mt-1 block rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
            Pay now
          </span>
        )}
      </div>
    </>
  )

  const base = 'flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm'

  if (isPendingPayment || isLinked) {
    return (
      <Link href={cardHref} className={`${base} transition-colors hover:bg-muted/40`}>
        {inner}
      </Link>
    )
  }

  return <div className={base}>{inner}</div>
}
```

- [ ] **Step 2: Verify build**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

---

### Task 3: Add Section and CancelledSection components

Insert both section components after `ListingCard` and before `MyListingsPage`.

**Files:**
- Modify: `app/me/listings/page.tsx`

- [ ] **Step 1: Add Section and CancelledSection functions**

Insert this block after the `ListingCard` closing brace, before `export default async function MyListingsPage()`:

```tsx
function Section({ title, items }: { title: string; items: any[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title} · {items.length}
      </h2>
      <div className="space-y-2">
        {items.map((listing: any) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            thumbnailUrl={listing.thumbnailUrl}
          />
        ))}
      </div>
    </div>
  )
}

function CancelledSection({ items }: { items: any[] }) {
  if (items.length === 0) return null
  return (
    <details>
      <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">
        Show cancelled ({items.length})
      </summary>
      <div className="mt-2.5 space-y-2">
        {items.map((listing: any) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            thumbnailUrl={listing.thumbnailUrl}
          />
        ))}
      </div>
    </details>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

---

### Task 4: Rewrite MyListingsPage

Replace the entire `export default async function MyListingsPage()` function with the new version: updated query, thumbnail resolution, grouping, and section rendering.

**Files:**
- Modify: `app/me/listings/page.tsx`

- [ ] **Step 1: Replace the MyListingsPage function**

Delete everything from `export default async function MyListingsPage()` to the end of the file and replace with:

```tsx
export default async function MyListingsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: listings } = await db
    .from('listings')
    .select(`
      id, title, current_bid, status, created_at, ends_at,
      rejection_reason, winner_id,
      listing_photos(storage_path, display_order)
    `)
    .eq('auctioneer_id', user.id)
    .order('created_at', { ascending: false })

  const withThumbs = (listings ?? []).map((listing: any) => {
    const photos: any[] = listing.listing_photos ?? []
    const first = [...photos].sort((a: any, b: any) => a.display_order - b.display_order)[0]
    const thumbnailUrl = first
      ? supabase.storage.from('listing-photos').getPublicUrl(first.storage_path).data.publicUrl
      : null
    return { ...listing, thumbnailUrl }
  })

  const pendingPayment = withThumbs.filter((l: any) => l.status === 'pending_payment')
  const rejected       = withThumbs.filter((l: any) => l.status === 'rejected')
  const underReview    = withThumbs.filter((l: any) => l.status === 'awaiting_review')
  const live           = withThumbs.filter((l: any) => l.status === 'live')
  const ended          = withThumbs.filter((l: any) => l.status === 'ended')
  const cancelled      = withThumbs.filter((l: any) => l.status === 'cancelled')

  const allEmpty = withThumbs.length === 0

  return (
    <div className="max-w-7xl mx-auto p-4 pt-8 space-y-8">
      <h1 className="text-2xl font-bold">My Listings</h1>
      {allEmpty && (
        <p className="text-muted-foreground">You haven&apos;t listed anything yet.</p>
      )}
      <Section title="Pending Payment" items={pendingPayment} />
      <Section title="Rejected"        items={rejected} />
      <Section title="Under Review"    items={underReview} />
      <Section title="Live"            items={live} />
      <Section title="Ended"           items={ended} />
      <CancelledSection items={cancelled} />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

---

### Task 5: Browser verification and commit

Confirm the page renders correctly in the dev server, then commit.

**Files:**
- No code changes in this task

- [ ] **Step 1: Start dev server if not already running**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock" && npm run dev
```

Open `http://localhost:3000/me/listings` in the browser.

- [ ] **Step 2: Verify each section**

Check the following in the browser:

| Check | Expected |
|---|---|
| Container width | Matches the header — no narrow column |
| Pending Payment section | Amber border on cards, "Pay now" amber pill visible, whole card is clickable to /pay |
| Rejected section | Red border, rejection reason shown as subtitle in red |
| Under Review section | Blue badge, no link/hover |
| Live section | Green badge, "Ends in X" subtitle, whole card links to listing |
| Ended section | Gray badge, "Ended [date] · Sold for ₱X" or "No bids" subtitle |
| Cancelled toggle | "Show cancelled (N)" collapses/expands correctly |
| Empty state | If no listings: "You haven't listed anything yet." |
| Thumbnails | Photo where available; initials fallback with tinted bg otherwise |
| Empty sections | Sections with 0 items are hidden entirely |

- [ ] **Step 3: Commit**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock" && git add app/me/listings/page.tsx && git commit -m "$(cat <<'EOF'
feat(my-listings): rebuild page with urgency-ordered sections and thumbnail cards

- Sections: Pending Payment → Rejected → Under Review → Live → Ended → Cancelled (collapsed)
- ListingCard: 52×52 thumbnail with initials fallback, contextual subtitle, color-coded badge
- Pending Payment: amber border, Pay now pill CTA, card links to /pay
- Rejected: red border + rejection reason inline; card links to listing
- Ended: distinguishes sold (Sold for ₱X) vs no-winner (No bids)
- Container: max-w-7xl matching header width

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

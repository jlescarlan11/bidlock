# Auctions Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated `/auctions` page with a 5-column grid, search + sort via URL params, and pagination (20/page); update the homepage to show a 4-card teaser instead of the full carousel.

**Architecture:** Approach B (URL-driven). A thin `"use client"` component handles search/sort inputs and pushes URL params; `app/auctions/page.tsx` is a server component that reads those params and renders the grid server-side. Homepage keeps a "Live right now" teaser fetching the 4 soonest-ending listings.

**Tech Stack:** Next.js 15+ App Router (searchParams is a `Promise` — always `await` it), Supabase JS, Tailwind CSS, existing `ListingCard` component.

> **Note:** This project has no test framework installed. TDD steps are omitted. Verify each task by running `npm run build` and checking the UI in the browser.

---

## File Map

| File | Action |
|---|---|
| `app/auctions/auction-controls.tsx` | **Create** — `"use client"` search input + sort dropdown |
| `app/auctions/page.tsx` | **Create** — server component, reads searchParams, renders grid |
| `components/nav.tsx` | **Modify** — update "Auctions" href (×2) |
| `components/landing-hero.tsx` | **Modify** — remove `listings` prop + HeroCarousel |
| `app/page.tsx` | **Modify** — remove carousel data fetch, add teaser section |

---

## Task 1: Update nav link

**Files:**
- Modify: `components/nav.tsx:28,40`

- [ ] **Step 1: Update both Auctions hrefs**

In `components/nav.tsx`, change both occurrences of `href="/#live-auctions"` to `href="/auctions"`:

```tsx
// Authenticated variant (line ~28)
<Link href="/auctions" className="text-muted-foreground hover:text-foreground transition-colors">Auctions</Link>

// Unauthenticated variant (line ~40)
<Link href="/auctions" className="text-muted-foreground hover:text-foreground transition-colors">Auctions</Link>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: no TypeScript or build errors.

- [ ] **Step 3: Commit**

```bash
git add components/nav.tsx
git commit -m "feat(nav): point Auctions link to /auctions"
```

---

## Task 2: Create AuctionControls client component

**Files:**
- Create: `app/auctions/auction-controls.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useRef } from 'react'

type SortOption = 'ending_soon' | 'newest' | 'lowest_bid' | 'highest_bid'

export default function AuctionControls({
  q,
  sort,
}: {
  q: string
  sort: SortOption
}) {
  const router = useRouter()
  const pathname = usePathname()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function pushParams(updates: Partial<{ q: string; sort: string; page: string }>) {
    const params = new URLSearchParams()
    const newQ = 'q' in updates ? (updates.q ?? '') : q
    const newSort = 'sort' in updates ? (updates.sort ?? 'ending_soon') : sort
    if (newQ) params.set('q', newQ)
    if (newSort !== 'ending_soon') params.set('sort', newSort)
    params.set('page', updates.page ?? '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => pushParams({ q: value, page: '1' }), 300)
  }

  return (
    <div className="flex gap-3 items-center">
      <input
        type="search"
        defaultValue={q}
        placeholder="Search auctions…"
        onChange={(e) => handleSearch(e.target.value)}
        className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <select
        value={sort}
        onChange={(e) => pushParams({ sort: e.target.value, page: '1' })}
        className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="ending_soon">Ending soon</option>
        <option value="newest">Newest</option>
        <option value="lowest_bid">Lowest bid</option>
        <option value="highest_bid">Highest bid</option>
      </select>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/auctions/auction-controls.tsx
git commit -m "feat(auctions): add AuctionControls client component"
```

---

## Task 3: Create /auctions page

**Files:**
- Create: `app/auctions/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import Link from 'next/link'
import ListingCard from '@/components/listing-card'
import AuctionControls from './auction-controls'

const PAGE_SIZE = 20

const SORT_MAP: Record<string, { column: string; ascending: boolean }> = {
  ending_soon: { column: 'ends_at', ascending: true },
  newest:      { column: 'created_at', ascending: false },
  lowest_bid:  { column: 'current_bid', ascending: true },
  highest_bid: { column: 'current_bid', ascending: false },
}

type SearchParams = { q?: string; sort?: string; page?: string }

export default async function AuctionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { q = '', sort = 'ending_soon', page: pageStr = '1' } = await searchParams
  const page = Math.max(1, parseInt(pageStr, 10) || 1)
  const { column, ascending } = SORT_MAP[sort] ?? SORT_MAP.ending_soon

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = db
    .from('listings')
    .select(
      'id, title, current_bid, ends_at, listing_photos(storage_path, display_order), bids(created_at)',
      { count: 'exact' }
    )
    .eq('status', 'live')
    .order(column, { ascending })
    .range(from, to)

  if (q) query = query.ilike('title', `%${q}%`)

  const { data: rawListings, count } = await query

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  function pageHref(p: number) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (sort !== 'ending_soon') params.set('sort', sort)
    params.set('page', String(p))
    return `/auctions?${params.toString()}`
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Live Auctions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {count ?? 0} {(count ?? 0) === 1 ? 'item' : 'items'} ending soon
        </p>
      </div>

      <div className="mb-6">
        <Suspense>
          <AuctionControls q={q} sort={sort as 'ending_soon' | 'newest' | 'lowest_bid' | 'highest_bid'} />
        </Suspense>
      </div>

      {listings.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-3" aria-hidden="true">🔨</p>
          <p className="font-bold text-foreground mb-1">No auctions match your search.</p>
          <Link
            href="/auctions"
            className="text-primary text-sm font-medium mt-2 inline-block hover:underline"
          >
            Clear filters
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {listings.map((listing: any) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-6 mt-10">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="text-sm font-medium text-primary hover:underline">
                  ← Prev
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground opacity-40">← Prev</span>
              )}
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              {page < totalPages ? (
                <Link href={pageHref(page + 1)} className="text-sm font-medium text-primary hover:underline">
                  Next →
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground opacity-40">Next →</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build and check in browser**

```bash
npm run build && npm run dev
```

Open `http://localhost:3000/auctions`. Confirm:
- Grid of live listings renders
- Search input filters results (debounced)
- Sort dropdown reorders results
- Pagination shows when there are > 20 listings
- Empty state shows when no listings match

- [ ] **Step 3: Commit**

```bash
git add app/auctions/page.tsx
git commit -m "feat(auctions): add /auctions page with search, sort, and pagination"
```

---

## Task 4: Update LandingHero — remove carousel

**Files:**
- Modify: `components/landing-hero.tsx`

> **Important:** Complete Task 5 immediately after this task. Removing the `listings` prop will cause a TypeScript error in `app/page.tsx` until Task 5 is done. Do not commit Task 4 in isolation — commit Tasks 4 and 5 together.

- [ ] **Step 1: Replace landing-hero.tsx**

Replace the entire file with:

```tsx
import Link from 'next/link'

type HeroStats = {
  itemsSold: number
  activeBids: number
  totalSold: number
}

function formatStat(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M+`
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}K+`
  return String(n)
}

export default function LandingHero({ stats }: { stats: HeroStats }) {
  return (
    <section className="bg-violet-50 flex-1 flex items-center">
      <div className="max-w-7xl mx-auto px-6 w-full py-16">
        <p className="text-[11px] font-bold tracking-[0.18em] text-primary uppercase mb-5">
          Live Auctions · PH
        </p>
        <h1 className="text-5xl lg:text-7xl font-black leading-[1.05] mb-6 text-foreground">
          Going once.<br />
          Going twice.<br />
          <span className="text-primary">Yours.</span>
        </h1>
        <div className="flex items-center gap-5 mb-10">
          <Link
            href="/auctions"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 rounded-full text-[15px] font-bold hover:bg-primary/90 active:scale-95 transition-all"
          >
            <span aria-hidden="true">🔨</span> Place a Bid
          </Link>
          <Link
            href="/listings/new"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Sell an item <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-2xl font-black text-foreground leading-none">{formatStat(stats.itemsSold)}</p>
            <p className="text-xs text-muted-foreground mt-1">Items sold</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <p className="text-2xl font-black text-foreground leading-none">{formatStat(stats.activeBids)}</p>
            <p className="text-xs text-muted-foreground mt-1">Active bids</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <p className="text-2xl font-black text-foreground leading-none">₱{formatStat(stats.totalSold)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total sold</p>
          </div>
        </div>
      </div>
    </section>
  )
}
```

Key changes from the original:
- Removed `HeroListing` type, `HeroCarousel` import, `cardGradient` import, `createClient` import
- No longer `async` (no Supabase call needed)
- `listings` prop removed — only `stats` remains
- Right column (carousel) replaced by nothing — hero is now single-column, left-aligned
- "Place a Bid" CTA updated from `href="#live-auctions"` to `href="/auctions"`

Proceed immediately to Task 5 before committing.

---

## Task 5: Update homepage — remove carousel data, add teaser

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace app/page.tsx**

```tsx
import { createClient } from '@/lib/supabase/server'
import ListingCard from '@/components/listing-card'
import LandingHero from '@/components/landing-hero'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Fetch teaser listings and all live IDs for stats in parallel
  const [
    { data: rawTeaser },
    { data: allLive },
    { count: itemsSold },
    { data: soldListings },
  ] = await Promise.all([
    db
      .from('listings')
      .select('id, title, current_bid, ends_at, listing_photos(storage_path, display_order), bids(created_at)')
      .eq('status', 'live')
      .order('ends_at', { ascending: true })
      .limit(4),
    db.from('listings').select('id').eq('status', 'live'),
    db.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'ended').not('winner_id', 'is', null),
    db.from('listings').select('current_bid').eq('status', 'ended').not('winner_id', 'is', null),
  ])

  const liveIds = (allLive ?? []).map((l: any) => l.id)

  const { count: activeBids } = liveIds.length > 0
    ? await db.from('bids').select('id', { count: 'exact', head: true }).in('listing_id', liveIds)
    : { count: 0 }

  const totalSold = (soldListings ?? []).reduce((sum: number, l: any) => sum + Number(l.current_bid), 0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teaserListings = (rawTeaser ?? []).map((listing: any) => {
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

  const stats = {
    itemsSold: itemsSold ?? 0,
    activeBids: activeBids ?? 0,
    totalSold,
  }

  return (
    <main>
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
        <LandingHero stats={stats} />

        {/* Trust strip */}
        <div className="py-4">
          <div className="max-w-7xl mx-auto px-6 flex justify-center flex-wrap gap-x-8 gap-y-2 opacity-50">
            {[
              { emoji: '🔒', label: 'Secure GCash payments' },
              { emoji: '🇵🇭', label: 'PH-verified sellers' },
              { emoji: '🛡️', label: 'Buyer protection' },
              { emoji: '⚡', label: 'New auctions daily' },
            ].map(({ emoji, label }) => (
              <span key={label} className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                <span aria-hidden="true">{emoji}</span> {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Live right now teaser */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-foreground">Live right now</h2>
          <Link
            href="/auctions"
            className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Browse all auctions <span aria-hidden="true">→</span>
          </Link>
        </div>
        {teaserListings.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-4xl mb-3" aria-hidden="true">🔨</p>
            <p className="font-bold text-foreground mb-1">No live auctions right now</p>
            <p className="text-sm text-muted-foreground">Check back soon — new items drop daily.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {teaserListings.map((listing: any) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      {/* Reassurance — "Before you bid" */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <p className="text-[11px] font-bold tracking-[0.18em] text-primary uppercase text-center mb-3">
          Before you bid
        </p>
        <h2 className="text-3xl font-black text-foreground text-center mb-10">
          Simple. Transparent. Fair.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            {
              icon: '🎯',
              title: "Bid only what you'd happily pay",
              body: "No surprise fees. Winning bid + GCash transfer. That's it.",
            },
            {
              icon: '😌',
              title: 'Lose? No charge.',
              body: 'We only collect when you win. No deposits, no holds, no stress.',
            },
            {
              icon: '📦',
              title: 'Win? Pay in 24 hours.',
              body: 'Quick GCash transfer, seller ships, item arrives. Simple as that.',
            },
          ].map(({ icon, title, body }) => (
            <div key={title} className="bg-muted rounded-2xl p-6 border border-border hover:border-primary/40 transition-colors">
              <p className="text-3xl mb-4" aria-hidden="true">{icon}</p>
              <p className="text-base font-extrabold text-foreground mb-2 leading-snug">{title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
```

Key changes from the original:
- `rawListings` (all live) replaced by `rawTeaser` (top 4 only)
- `allLive` query added to get all live IDs for `activeBids` stat accuracy
- All four initial fetches parallelized in a single `Promise.all`
- `LandingHero` called without `listings` prop
- `#live-auctions` section removed entirely
- New "Live right now" teaser section added (4-col grid, no wrapper card)

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: no TypeScript or build errors.

- [ ] **Step 3: Check homepage in browser**

```bash
npm run dev
```

Open `http://localhost:3000`. Confirm:
- Hero renders (single column, tagline + stats + CTAs)
- "Place a Bid" CTA navigates to `/auctions`
- "Live right now" teaser shows up to 4 listing cards below the trust strip
- "Browse all auctions →" link navigates to `/auctions`
- "Before you bid" section still renders below the teaser
- No carousel or `#live-auctions` section visible

- [ ] **Step 4: Commit Tasks 4 and 5 together**

```bash
git add components/landing-hero.tsx app/page.tsx
git commit -m "feat(home): replace hero carousel with teaser section, add Live right now grid"
```

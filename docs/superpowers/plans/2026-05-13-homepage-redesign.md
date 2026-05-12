# Homepage Redesign + Global Rebrand — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the BidLock homepage to a two-column editorial layout with warm cream base, replace the violet brand with a gray-900 / orange-500 scheme, add Bricolage Grotesque + Inter fonts sitewide, and ship a static `/how` page.

**Architecture:** Global design tokens live in `app/globals.css` (Tailwind v4 CSS-first config). Fonts are injected via `next/font/google` CSS variables and registered in `@theme inline`. New homepage components are isolated — `HomepageListingCard` is separate from the existing `ListingCard` used on `/auctions`.

**Tech Stack:** Next.js App Router (Tailwind v4), `next/font/google`, Supabase JS, `components/countdown.tsx` (existing, reused)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/009_profile_username.sql` | Create | Add unique `username` column to profiles |
| `supabase/migrations/010_view_count.sql` | Create | Add `view_count` column + `increment_listing_view` RPC |
| `app/globals.css` | Modify | CSS token rebrand + font registration + animations |
| `app/layout.tsx` | Modify | Replace font, apply bg-background, add Footer |
| `components/footer.tsx` | Create | Sitewide footer |
| `lib/actions/listings.ts` | Modify | Add `incrementViewCount` server action |
| `components/listings/view-counter.tsx` | Create | Client component that fires view increment on mount |
| `app/listings/[id]/page.tsx` | Modify | Mount ViewCounter |
| `components/homepage-listing-card.tsx` | Create | Homepage-specific card (not used on /auctions) |
| `components/landing-hero.tsx` | Modify | Full rewrite — two-column hero |
| `app/page.tsx` | Modify | New queries, new page sections |
| `app/how/page.tsx` | Create | Static "How it works" page |

---

## Task 1: Schema migration — profiles username

**Files:**
- Create: `supabase/migrations/009_profile_username.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/009_profile_username.sql`:

```sql
-- Add unique username to profiles
ALTER TABLE profiles ADD COLUMN username TEXT UNIQUE;

-- Normalise on write: lowercase, trim whitespace
CREATE OR REPLACE FUNCTION normalise_username()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.username := lower(trim(NEW.username));
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_normalise_username
  BEFORE INSERT OR UPDATE OF username ON profiles
  FOR EACH ROW
  WHEN (NEW.username IS NOT NULL)
  EXECUTE FUNCTION normalise_username();
```

The column is nullable so existing rows are unaffected. Users set their username via the profile edit page (existing flow, separate PR).

- [ ] **Step 2: Apply the migration locally**

```bash
npx supabase db push
```

Expected: migration applies cleanly. If CLI is unavailable, run in the Supabase dashboard SQL editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/009_profile_username.sql
git commit -m "feat(db): add unique username column to profiles"
```

---

## Task 2: Schema migration — view_count + increment RPC

**Files:**
- Create: `supabase/migrations/010_view_count.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/010_view_count.sql`:

```sql
-- Add view counter to listings
ALTER TABLE listings ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;

-- Atomic increment RPC (avoids read-modify-write race)
CREATE OR REPLACE FUNCTION increment_listing_view(p_listing_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE listings SET view_count = view_count + 1 WHERE id = p_listing_id;
$$;
```

- [ ] **Step 2: Apply the migration locally**

```bash
npx supabase db push
```

Expected: migration applies cleanly, no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/010_view_count.sql
git commit -m "feat(db): add view_count to listings + increment_listing_view RPC"
```

---

## Task 3: Global design tokens + fonts

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update `app/layout.tsx`**

Replace the `Plus_Jakarta_Sans` import and font application. The new fonts use CSS variables so both can be injected on `<html>` simultaneously:

```tsx
import type { Metadata } from 'next'
import { Inter, Bricolage_Grotesque } from 'next/font/google'
import { Toaster } from 'sonner'
import Nav from '@/components/nav'
import NavWrapper from '@/components/nav-wrapper'
import Footer from '@/components/footer'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-bricolage',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'BidLock',
    template: '%s — BidLock',
  },
  description: 'Philippine auction marketplace — bid on real items, pay via GCash.',
  openGraph: {
    type: 'website',
    siteName: 'BidLock',
    title: 'BidLock',
    description: 'Philippine auction marketplace — bid on real items, pay via GCash.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable} scroll-smooth`}>
      <body className={`${inter.className} bg-background`}>
        <NavWrapper><Nav /></NavWrapper>
        {children}
        <Footer />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Update `:root` color tokens in `app/globals.css`**

Replace the entire `:root` block (lines 5–48 of the current file):

```css
:root {
  --background:           #FDFBF6;
  --foreground:           var(--color-stone-950);
  --primary:              var(--color-gray-900);
  --primary-foreground:   #FAFAFA;
  --muted:                var(--color-stone-50);
  --muted-foreground:     var(--color-gray-500);
  --card:                 var(--color-white);
  --card-foreground:      var(--color-stone-950);
  --border:               var(--color-gray-200);
  --input:                var(--color-gray-200);
  --ring:                 var(--color-gray-900);
  --secondary:            var(--color-gray-100);
  --secondary-foreground: var(--color-gray-900);
  --accent:               var(--color-gray-100);
  --accent-foreground:    var(--color-gray-900);
  --destructive:          var(--color-red-600);
  --radius:    0.5rem;
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;

  --popover:              var(--color-white);
  --popover-foreground:   var(--color-stone-950);

  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);

  --sidebar:                      var(--color-stone-50);
  --sidebar-foreground:           var(--color-stone-950);
  --sidebar-primary:              var(--color-gray-900);
  --sidebar-primary-foreground:   var(--color-white);
  --sidebar-accent:               var(--color-gray-100);
  --sidebar-accent-foreground:    var(--color-gray-900);
  --sidebar-border:               var(--color-gray-200);
  --sidebar-ring:                 var(--color-gray-900);
}
```

- [ ] **Step 3: Update `@theme inline` font entries and register display font**

In the `@theme inline` block, replace the existing font lines:
```css
  --font-sans:    var(--font-sans);
  --font-mono:    var(--font-geist-mono);
  --font-heading: var(--font-sans);
```
with:
```css
  --font-sans:    var(--font-inter);
  --font-mono:    var(--font-geist-mono);
  --font-display: var(--font-bricolage);
```

- [ ] **Step 4: Add animations and `.display` utility after the `@theme inline` block**

Append to `app/globals.css` after the closing `}` of `@theme inline`:

```css
/* Display font utility — Bricolage Grotesque with optical sizing */
.display {
  font-family: var(--font-bricolage);
  font-variation-settings: "opsz" 96;
  letter-spacing: -0.03em;
}

/* Live dot pulse */
.ticker {
  animation: pulse-dot 1.4s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.6; transform: scale(0.85); }
}

/* SVG scribble draw-on */
.scribble {
  stroke-dasharray: 200;
  stroke-dashoffset: 200;
  animation: draw 1.2s ease-out 0.4s forwards;
}
@keyframes draw {
  to { stroke-dashoffset: 0; }
}

/* Trust marquee infinite scroll */
.marquee {
  animation: marquee-scroll 30s linear infinite;
}
@keyframes marquee-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: builds cleanly. If font variable names cause TypeScript errors, they won't — `next/font/google` exports are typed correctly.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat(brand): global rebrand — cream bg, gray-900 primary, orange accent, Bricolage Grotesque + Inter"
```

---

## Task 4: Footer component

**Files:**
- Create: `components/footer.tsx`

(Layout already imports `Footer` from Task 2 Step 1 — this task provides the implementation.)

- [ ] **Step 1: Create `components/footer.tsx`**

```tsx
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-gray-900/10 mt-8">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <span className="display text-xl font-extrabold">BidLock</span>
          <p className="text-xs text-gray-500 mt-1">Real items. Real prices. PH-made.</p>
        </div>
        <div className="flex items-center gap-6 text-xs text-gray-600">
          <Link href="/terms" className="hover:text-gray-900">Terms</Link>
          <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
          <Link href="/help" className="hover:text-gray-900">Help</Link>
          <Link href="/contact" className="hover:text-gray-900">Contact</Link>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/footer.tsx app/layout.tsx
git commit -m "feat: add Footer component to global layout"
```

---

## Task 5: View counter — server action + client component + listing detail wire-up

**Files:**
- Modify: `lib/actions/listings.ts`
- Create: `components/listings/view-counter.tsx`
- Modify: `app/listings/[id]/page.tsx`

- [ ] **Step 1: Add `incrementViewCount` to `lib/actions/listings.ts`**

Open `lib/actions/listings.ts` and append at the bottom:

```ts
export async function incrementViewCount(listingId: string): Promise<void> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).rpc('increment_listing_view', { p_listing_id: listingId })
}
```

Make sure `createClient` is already imported at the top of this file (it will be — this follows the existing pattern in the file).

- [ ] **Step 2: Create `components/listings/view-counter.tsx`**

```tsx
'use client'

import { useEffect } from 'react'
import { incrementViewCount } from '@/lib/actions/listings'

export default function ViewCounter({ listingId }: { listingId: string }) {
  useEffect(() => {
    incrementViewCount(listingId)
  }, [listingId])

  return null
}
```

- [ ] **Step 3: Mount ViewCounter in the listing detail page**

Open `app/listings/[id]/page.tsx`. Near the top of the returned JSX (inside the outermost element, before the first visible content), add:

```tsx
import ViewCounter from '@/components/listings/view-counter'

// Inside the JSX return, as the first child:
<ViewCounter listingId={listing.id} />
```

The `listing.id` variable name may differ — use whatever the page uses for the listing's UUID.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/listings.ts components/listings/view-counter.tsx app/listings/[id]/page.tsx
git commit -m "feat: track listing page views via increment_listing_view RPC"
```

---

## Task 6: HomepageListingCard component

**Files:**
- Create: `components/homepage-listing-card.tsx`

This component is a pure presentational server component (photo URL resolution happens inside, like `ListingCard`).

- [ ] **Step 1: Create `components/homepage-listing-card.tsx`**

```tsx
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import Countdown from './countdown'
import { formatPHP } from '@/lib/utils/currency'
import { cardGradient } from '@/lib/utils/card-gradient'

type HomepageListing = {
  id: string
  title: string
  current_bid: number
  ends_at: string
  view_count: number
  bid_count: number
  seller_name: string | null
  listing_photos: { storage_path: string; display_order: number }[]
}

function isEndingSoon(endsAt: string): boolean {
  return (new Date(endsAt).getTime() - Date.now()) < 3_600_000
}

export default async function HomepageListingCard({ listing }: { listing: HomepageListing }) {
  const supabase = await createClient()
  const photo = listing.listing_photos[0]
  const photoUrl = photo
    ? supabase.storage.from('listing-photos').getPublicUrl(photo.storage_path).data.publicUrl
    : null

  const ending = isEndingSoon(listing.ends_at)
  const gradient = cardGradient(listing.id)

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="block bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-gray-900 transition-all duration-200 hover:-translate-y-1 hover:rotate-[-0.5deg]"
    >
      <div className={`aspect-square bg-gradient-to-br ${gradient} relative flex items-center justify-center`}>
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, 25vw"
          />
        ) : null}

        {/* LIVE / ENDING SOON badge */}
        <span className={`absolute top-2.5 left-2.5 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${ending ? 'bg-red-500' : 'bg-orange-500'}`}>
          <span className="inline-block w-1 h-1 rounded-full bg-white ticker" />
          {ending ? 'ENDING SOON' : 'LIVE'}
        </span>

        {/* View count */}
        <span className="absolute bottom-2.5 left-2.5 bg-white/90 backdrop-blur-sm text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
          {listing.view_count} 👀
        </span>
      </div>

      <div className="p-3.5">
        <p className="text-sm font-bold text-gray-900 truncate">{listing.title}</p>
        <p className="text-[11px] text-gray-500 mb-2.5">
          {listing.bid_count} bid{listing.bid_count !== 1 ? 's' : ''}
          {listing.seller_name ? ` · @${listing.seller_name}` : ''}
        </p>
        <div className="flex items-end justify-between">
          <p className="display text-lg font-extrabold text-gray-900 leading-tight">
            {formatPHP(listing.current_bid)}
          </p>
          <span className={`text-[10px] font-bold ${ending ? 'text-red-600' : 'text-gray-500'}`}>
            <Countdown endsAt={listing.ends_at} />
          </span>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/homepage-listing-card.tsx
git commit -m "feat: add HomepageListingCard component for homepage teaser grid"
```

---

## Task 7: LandingHero rewrite

**Files:**
- Modify: `components/landing-hero.tsx`

This is a full rewrite. The component stays a server component (no client interactivity needed — countdown is only in `page.tsx`'s featured card).

- [ ] **Step 1: Rewrite `components/landing-hero.tsx`**

```tsx
import Link from 'next/link'

type HeroStats = {
  liveCount: number
  avgBidsPerItem: number
  newToday: number
}

export default function LandingHero({ stats }: { stats: HeroStats }) {
  return (
    <section className="relative overflow-hidden bg-[#FDFBF6]">
      {/* Dot-grid decoration */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-12">
        {/* Live badge */}
        <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-900 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 ticker" aria-hidden="true" />
          {stats.liveCount} auction{stats.liveCount !== 1 ? 's' : ''} live right now
        </div>

        <h1 className="display text-6xl lg:text-8xl font-extrabold leading-[0.95] mb-6 text-gray-900">
          Going once.<br />
          Going twice.<br />
          <span className="relative inline-block">
            <span className="relative z-10">Yours.</span>
            <svg
              className="absolute -bottom-2 left-0 w-full"
              viewBox="0 0 300 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                className="scribble"
                d="M5 12 Q 80 2, 150 10 T 295 8"
                stroke="#F97316"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </span>
        </h1>

        <p className="text-lg text-gray-700 mb-8 max-w-xl leading-relaxed">
          Score steals on phones, watches, cameras, sneakers, and more.
          Starting bids from <span className="font-bold text-gray-900">₱1</span>. Pay via GCash when you win.
        </p>

        <div className="flex flex-wrap items-center gap-4 mb-10">
          <Link
            href="/auctions"
            className="group inline-flex items-center gap-2 bg-gray-900 text-white px-7 py-4 rounded-full text-base font-bold hover:bg-gray-800 transition-all"
          >
            Browse live auctions
            <span className="inline-block transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
          </Link>
          <Link
            href="/how"
            className="text-sm font-semibold text-gray-700 hover:text-gray-900 underline underline-offset-4 decoration-orange-500 decoration-2"
          >
            How does it work?
          </Link>
        </div>

        {/* Stat strip */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="flex items-baseline gap-2">
            <span className="display text-2xl font-extrabold text-gray-900">{stats.liveCount}</span>
            <span className="text-xs text-gray-600">live now</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-gray-300" aria-hidden="true" />
          <div className="flex items-baseline gap-2">
            <span className="display text-2xl font-extrabold text-gray-900">{stats.avgBidsPerItem}</span>
            <span className="text-xs text-gray-600">avg. bids/item</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-gray-300" aria-hidden="true" />
          <div className="flex items-baseline gap-2">
            <span className="display text-2xl font-extrabold text-gray-900">{stats.newToday}</span>
            <span className="text-xs text-gray-600">new today</span>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landing-hero.tsx
git commit -m "feat: rewrite LandingHero — two-column editorial layout with scribble animation"
```

---

## Task 8: Homepage `app/page.tsx` rewrite

**Files:**
- Modify: `app/page.tsx`

This is a full rewrite of the page. It wires all the data queries and assembles the sections.

- [ ] **Step 1: Rewrite `app/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import LandingHero from '@/components/landing-hero'
import HomepageListingCard from '@/components/homepage-listing-card'
import Countdown from '@/components/countdown'
import { cardGradient } from '@/lib/utils/card-gradient'
import { formatPHP } from '@/lib/utils/currency'

export default async function HomePage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [
    { data: rawTeaser, count: liveCount },
    { count: totalBids },
    { count: totalListings },
    { count: newToday },
  ] = await Promise.all([
    // 4 teaser cards + live count in one query
    db.from('listings')
      .select(
        'id, title, current_bid, ends_at, created_at, view_count, listing_photos(storage_path, display_order), bids(id), profiles!auctioneer_id(username)',
        { count: 'exact' }
      )
      .eq('status', 'live')
      .order('ends_at', { ascending: true })
      .limit(4),

    // Total bids across the platform
    db.from('bids').select('id', { count: 'exact', head: true }),

    // Total live + ended listings (denominator for avg)
    db.from('listings')
      .select('id', { count: 'exact', head: true })
      .in('status', ['live', 'ended']),

    // Listings created in the last 24 hours
    db.from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'live')
      .gte('created_at', new Date(Date.now() - 86_400_000).toISOString()),
  ])

  const avgBidsPerItem =
    (totalListings ?? 0) > 0
      ? Math.round((totalBids ?? 0) / (totalListings ?? 1))
      : 0

  const stats = {
    liveCount: liveCount ?? 0,
    avgBidsPerItem,
    newToday: newToday ?? 0,
  }

  // The featured hero card is the first (soonest-ending) live listing
  const featured = (rawTeaser ?? [])[0] ?? null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teaserListings = (rawTeaser ?? []).map((l: any) => ({
    id: l.id,
    title: l.title,
    current_bid: l.current_bid,
    ends_at: l.ends_at,
    view_count: l.view_count ?? 0,
    bid_count: (l.bids ?? []).length,
    seller_name: l.profiles?.username ?? null,
    listing_photos: (l.listing_photos ?? []).sort(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any, b: any) => a.display_order - b.display_order
    ),
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const featuredData = featured
    ? {
        id: featured.id,
        title: featured.title,
        current_bid: featured.current_bid,
        ends_at: featured.ends_at,
        view_count: featured.view_count ?? 0,
        bid_count: (featured.bids ?? []).length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        seller_name: (featured as any).profiles?.username ?? null,
        listing_photos: (featured.listing_photos ?? []).sort(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a: any, b: any) => a.display_order - b.display_order
        ),
      }
    : null

  const featuredPhotoUrl = featuredData?.listing_photos[0]
    ? supabase.storage
        .from('listing-photos')
        .getPublicUrl(featuredData.listing_photos[0].storage_path).data.publicUrl
    : null

  const isEndingSoon = featuredData
    ? (new Date(featuredData.ends_at).getTime() - Date.now()) < 3_600_000
    : false

  return (
    <main>
      {/* Hero */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-10 lg:items-center max-w-7xl mx-auto px-6 pt-16 pb-12 relative">
        {/* Dot-grid */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          aria-hidden="true"
        />

        <div className="lg:col-span-7 relative">
          <LandingHero stats={stats} />
        </div>

        {/* Featured card */}
        <div className="lg:col-span-5 relative mt-10 lg:mt-0">
          {featuredData ? (
            <div className="relative">
              <div className="absolute -top-4 -left-4 z-20 bg-orange-500 text-white text-xs font-extrabold px-3 py-1.5 rounded-full rotate-[-8deg] shadow-lg">
                🔥 HOT RIGHT NOW
              </div>
              <div className="bg-white rounded-3xl border-2 border-gray-900 p-5 shadow-[8px_8px_0_0_rgba(17,24,39,1)]">
                <div className={`aspect-[4/3] bg-gradient-to-br ${cardGradient(featuredData.id)} rounded-2xl mb-4 relative overflow-hidden flex items-center justify-center`}>
                  {featuredPhotoUrl ? (
                    <Image
                      src={featuredPhotoUrl}
                      alt={featuredData.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 40vw"
                    />
                  ) : null}
                  <span className={`absolute top-3 left-3 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${isEndingSoon ? 'bg-red-500' : 'bg-orange-500'}`}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-white ticker" aria-hidden="true" />
                    {isEndingSoon ? 'ENDING SOON' : 'LIVE'}
                  </span>
                </div>

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{featuredData.title}</p>
                    {featuredData.seller_name && (
                      <p className="text-xs text-gray-500 mt-0.5">@{featuredData.seller_name}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Current bid</p>
                    <p className="display text-2xl font-extrabold text-gray-900">
                      {formatPHP(featuredData.current_bid)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600 mb-4">
                  <span>
                    <span className="font-bold text-gray-900">{featuredData.bid_count} bid{featuredData.bid_count !== 1 ? 's' : ''}</span>
                    {' · '}{featuredData.view_count} 👀
                  </span>
                  <span className={isEndingSoon ? 'text-red-600 font-bold' : ''}>
                    <Countdown endsAt={featuredData.ends_at} />
                  </span>
                </div>

                <Link
                  href={`/listings/${featuredData.id}`}
                  className="block w-full text-center bg-orange-500 text-white text-sm font-bold py-3 rounded-full hover:bg-orange-600 transition-colors"
                >
                  Place a bid →
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border-2 border-gray-200 p-8 text-center">
              <p className="text-4xl mb-3" aria-hidden="true">🔨</p>
              <p className="font-bold text-gray-900 mb-1">No live auctions right now</p>
              <p className="text-sm text-gray-500">Check back soon — new items drop daily.</p>
            </div>
          )}
        </div>
      </div>

      {/* Trust marquee */}
      <section className="border-y border-gray-900/10 bg-white py-4 overflow-hidden">
        <div className="flex marquee whitespace-nowrap" aria-label="Trust signals">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-10 px-5 text-sm font-medium text-gray-700" aria-hidden={i === 2 ? 'true' : undefined}>
              <span className="flex items-center gap-2">🔒 Secure GCash payments</span>
              <span className="text-gray-300" aria-hidden="true">●</span>
              <span className="flex items-center gap-2">🇵🇭 PH-verified sellers</span>
              <span className="text-gray-300" aria-hidden="true">●</span>
              <span className="flex items-center gap-2">🛡 Buyer protection on every win</span>
              <span className="text-gray-300" aria-hidden="true">●</span>
              <span className="flex items-center gap-2">⚡ New auctions every hour</span>
              <span className="text-gray-300" aria-hidden="true">●</span>
              <span className="flex items-center gap-2">💸 Lose? No charge. Ever.</span>
              <span className="text-gray-300" aria-hidden="true">●</span>
            </div>
          ))}
        </div>
      </section>

      {/* Live right now */}
      <section className="max-w-7xl mx-auto px-6 py-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs font-extrabold tracking-[0.18em] text-orange-600 uppercase mb-2">Live right now</p>
            <h2 className="display text-4xl font-extrabold text-gray-900">What&apos;s on the block</h2>
          </div>
          <Link
            href="/auctions"
            className="hidden sm:inline-flex text-sm font-semibold text-gray-900 hover:text-orange-600 transition-colors"
          >
            See all {stats.liveCount} →
          </Link>
        </div>

        {/* State filter chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { label: 'All', href: '/auctions', active: true },
            { label: '🔥 Ending soon', href: '/auctions?sort=ending_soon', active: false },
            { label: '✨ Just listed', href: '/auctions?sort=just_listed', active: false },
            { label: '💸 Under ₱500', href: '/auctions?sort=under_500', active: false },
          ].map(({ label, href, active }) => (
            <Link
              key={label}
              href={href}
              className={`text-xs font-bold px-4 py-2 rounded-full transition-colors ${
                active
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-400'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {teaserListings.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-4xl mb-3" aria-hidden="true">🔨</p>
            <p className="font-bold text-gray-900 mb-1">No live auctions right now</p>
            <p className="text-sm text-gray-500">Check back soon — new items drop daily.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {teaserListings.map((listing) => (
              <HomepageListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        <div className="mt-6 sm:hidden text-center">
          <Link href="/auctions" className="text-sm font-semibold text-gray-900 underline underline-offset-4 decoration-orange-500 decoration-2">
            See all {stats.liveCount} auctions →
          </Link>
        </div>
      </section>

      {/* Before you bid */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <p className="text-xs font-extrabold tracking-[0.18em] text-orange-600 uppercase mb-3">Before you bid</p>
          <h2 className="display text-4xl lg:text-5xl font-extrabold text-gray-900 mb-3">Simple. Transparent. Fair.</h2>
          <p className="text-base text-gray-600">No deposits, no holds, no surprise fees. We only make money when you win.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: '🎯',
              title: "Bid only what you'd happily pay.",
              body: 'Winning bid + GCash transfer. That\'s the whole math.',
              bg: 'bg-violet-50 border-violet-100 hover:border-violet-300',
            },
            {
              icon: '😌',
              title: 'Lose? No charge.',
              body: "We don't hold deposits. We don't take card details. Walk away free.",
              bg: 'bg-orange-50 border-orange-100 hover:border-orange-300',
            },
            {
              icon: '📦',
              title: 'Win? Pay within 24 hours.',
              body: 'Quick GCash transfer. Seller ships. Item arrives. Done.',
              bg: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300',
            },
          ].map(({ icon, title, body, bg }) => (
            <div key={title} className={`rounded-3xl p-7 border-2 transition-colors ${bg}`}>
              <div className="text-5xl mb-5" aria-hidden="true">{icon}</div>
              <p className="display text-xl font-extrabold text-gray-900 mb-2 leading-tight">{title}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Seller CTA */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-gray-900 text-white rounded-3xl p-8 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            aria-hidden="true"
          />
          <div className="relative">
            <p className="text-xs font-extrabold tracking-[0.18em] text-orange-400 uppercase mb-2">For sellers</p>
            <h3 className="display text-3xl lg:text-4xl font-extrabold mb-3 leading-tight max-w-lg">
              Got stuff to sell? List in 60 seconds.
            </h3>
            <p className="text-sm text-gray-400 max-w-md">
              Snap a photo, set a starting price, pick an end time. We handle the rest. No listing fees.
            </p>
          </div>
          <Link
            href="/listings/new"
            className="relative shrink-0 inline-flex items-center gap-2 bg-orange-500 text-white px-7 py-4 rounded-full text-base font-bold hover:bg-orange-600 transition-colors"
          >
            Start selling →
          </Link>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Run build to check for type errors**

```bash
npm run build
```

Expected: clean build. Common issues to fix if they appear:
- `profiles!auctioneer_id` join syntax — if PostgREST returns an error at runtime, the FK hint may need to be `profiles!listings_auctioneer_id_fkey`. Test at runtime after deploy.
- Missing `view_count` in query — if migration hasn't been applied, this field returns `null`; handled by `?? 0`.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: rewrite homepage — two-column hero, marquee, state chips, seller CTA"
```

---

## Task 9: `/how` page

**Files:**
- Create: `app/how/page.tsx`

- [ ] **Step 1: Create `app/how/page.tsx`**

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'Learn how to bid and sell on BidLock — the Philippine auction marketplace.',
}

const buyerSteps = [
  { icon: '🔍', title: 'Browse live auctions', body: 'Scroll the live listings. Filter by ending soon, just listed, or price.' },
  { icon: '💬', title: 'Place a bid', body: 'Enter any amount above the current bid. No deposits, no card holds.' },
  { icon: '🏆', title: 'Win when time runs out', body: 'Highest bidder when the clock hits zero wins. That\'s it.' },
  { icon: '💸', title: 'Pay via GCash', body: 'Send the winning amount via GCash within 24 hours.' },
  { icon: '📦', title: 'Receive your item', body: 'Seller ships to you. You get what you won.' },
]

const sellerSteps = [
  { icon: '📸', title: 'Snap a photo', body: 'Take a clear photo of your item. Good photos get more bids.' },
  { icon: '✍️', title: 'Set your starting bid', body: "Pick a price you'd happily accept even if only one person bids." },
  { icon: '⏱', title: 'Choose an end time', body: 'Set how long the auction runs — 1 hour, 6 hours, 24 hours, or more.' },
  { icon: '📣', title: 'Watch the bids roll in', body: 'Buyers compete. You watch. No action needed from you.' },
  { icon: '✅', title: 'Collect payment', body: 'Winner sends GCash. You ship. Done.' },
]

function StepList({ steps }: { steps: typeof buyerSteps }) {
  return (
    <ol className="space-y-8">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-5">
          <div className="shrink-0 flex flex-col items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-xs font-extrabold">
              {i + 1}
            </span>
            {i < steps.length - 1 && (
              <div className="w-px flex-1 bg-gray-200 min-h-[24px]" aria-hidden="true" />
            )}
          </div>
          <div className="pb-2">
            <span className="text-3xl" aria-hidden="true">{step.icon}</span>
            <p className="display text-lg font-extrabold text-gray-900 mt-2 mb-1">{step.title}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

export default function HowItWorksPage() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-16">
      {/* Hero */}
      <div className="text-center mb-16 max-w-2xl mx-auto">
        <p className="text-xs font-extrabold tracking-[0.18em] text-orange-600 uppercase mb-3">How it works</p>
        <h1 className="display text-5xl lg:text-6xl font-extrabold text-gray-900 mb-4">Winning made simple.</h1>
        <p className="text-lg text-gray-600">No confusing rules. No hidden fees. Just bid, win, pay, done.</p>
      </div>

      {/* Two-column steps */}
      <div className="grid md:grid-cols-2 gap-16 mb-20">
        <div>
          <h2 className="display text-2xl font-extrabold text-gray-900 mb-8">I want to win something</h2>
          <StepList steps={buyerSteps} />
        </div>
        <div>
          <h2 className="display text-2xl font-extrabold text-gray-900 mb-8">I want to sell something</h2>
          <StepList steps={sellerSteps} />
        </div>
      </div>

      {/* CTA strip */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-gray-900 text-white rounded-3xl p-8 flex flex-col gap-4">
          <p className="display text-2xl font-extrabold">Ready to bid?</p>
          <p className="text-sm text-gray-400">Live auctions running right now. Jump in.</p>
          <Link
            href="/auctions"
            className="self-start inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-full text-sm font-bold hover:bg-gray-100 transition-colors"
          >
            Browse live auctions →
          </Link>
        </div>
        <div className="bg-orange-500 text-white rounded-3xl p-8 flex flex-col gap-4">
          <p className="display text-2xl font-extrabold">Ready to sell?</p>
          <p className="text-sm text-orange-100">List your item in 60 seconds. No listing fees.</p>
          <Link
            href="/listings/new"
            className="self-start inline-flex items-center gap-2 bg-white text-orange-600 px-6 py-3 rounded-full text-sm font-bold hover:bg-orange-50 transition-colors"
          >
            List an item →
          </Link>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/how/page.tsx
git commit -m "feat: add /how static page — buyer and seller step-by-step guide"
```

---

## Task 10: Final build verification

- [ ] **Step 1: Full build**

```bash
npm run build
```

Expected: `✓ Compiled successfully`. Zero TypeScript errors, zero ESLint errors.

- [ ] **Step 2: Check for violet primary references that should have been migrated**

```bash
grep -r "text-primary\|bg-primary\|border-primary\|ring-primary" app/ components/ --include="*.tsx" | grep -v node_modules
```

These references now resolve to gray-900 (the new `--primary`). Scan the output and verify no component looks visually broken at the new primary color. The auctions page, listing detail, auth pages, and admin pages all use `text-primary` for links/accents — they will now render as dark gray instead of violet. That's expected per the global rebrand spec.

- [ ] **Step 3: Commit if any cleanup fixes were needed**

```bash
git add -A
git commit -m "fix: post-rebrand cleanup — resolve any remaining violet primary references"
```

---

## Self-Review Notes

**Spec coverage:**
- ✅ Global tokens (background, primary, border, fonts, animations)
- ✅ Schema migration (view_count + RPC)
- ✅ Hero two-column layout with scribble
- ✅ Stat strip (live count, avg bids, new today)
- ✅ Featured hero card with Countdown reuse
- ✅ Trust marquee
- ✅ State filter chips
- ✅ HomepageListingCard (gradient bg, LIVE/ENDING SOON badge, view_count, seller handle)
- ✅ Before You Bid (3 tinted cards)
- ✅ Seller CTA (dark card, dot grid)
- ✅ Footer
- ✅ /how page (buyer steps, seller steps, CTA strip)
- ✅ ViewCounter wired to listing detail page

**Known runtime verification needed:**
- `profiles!auctioneer_id` PostgREST FK hint — if it fails, change to `profiles!listings_auctioneer_id_fkey`
- `view_count` column will be 0 for all rows until traffic hits listing detail pages — expected behaviour

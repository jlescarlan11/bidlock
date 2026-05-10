# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hero, trust strip, and reassurance section above the existing live-auctions grid on `app/page.tsx`, turning the homepage into a full landing page.

**Architecture:** All new sections are static (no data fetching). The hero is extracted to `components/landing-hero.tsx` because it has enough markup to be unwieldy inline. The trust strip and reassurance section are inlined in `app/page.tsx` since they're short. The existing auctions grid gets `id="live-auctions"` so the hero CTA can smooth-scroll to it. Smooth scroll is enabled via `scroll-behavior: smooth` on the `<html>` element in `app/layout.tsx`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript. No test framework — verification uses `pnpm build` for type safety and manual browser QA.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `components/landing-hero.tsx` | Static hero section — headline, single CTA, non-interactive preview card |
| Modify | `app/page.tsx` | Import hero, add trust strip + reassurance inline, anchor the auctions section |
| Modify | `app/layout.tsx` | Add `scroll-smooth` class to `<html>` |

---

## Task 1: Create `LandingHero` component

**Files:**
- Create: `components/landing-hero.tsx`

- [ ] **Step 1: Create the file**

```tsx
import Link from 'next/link'

export default function LandingHero() {
  return (
    <section className="bg-violet-50 px-6 py-10">
      <div className="max-w-2xl mx-auto flex gap-6 items-center">
        {/* Left — text + CTAs */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold tracking-[0.15em] text-violet-600 uppercase mb-2.5">
            Live Auctions · PH
          </p>
          <h1 className="text-4xl font-black leading-[1.1] mb-3 text-stone-950">
            Going once.<br />
            Going twice.<br />
            <span className="text-violet-600">Yours.</span>
          </h1>
          <p className="text-[15px] text-gray-500 mb-5 leading-relaxed">
            Win real items at real prices.<br />
            Pay instantly via GCash.
          </p>
          <a
            href="#live-auctions"
            className="inline-flex items-center gap-1.5 bg-violet-600 text-white px-6 py-3 rounded-full text-[15px] font-bold hover:bg-violet-700 transition-colors"
          >
            🔨 Place a Bid
          </a>
          <Link
            href="/listings/new"
            className="block mt-2.5 text-xs text-violet-600 hover:underline"
          >
            Got something to sell? List it here →
          </Link>
        </div>

        {/* Right — non-interactive proof-of-life card */}
        <div className="w-40 shrink-0 bg-white rounded-2xl border border-violet-100 p-3.5 shadow-sm">
          <p className="text-[11px] font-bold text-orange-600 mb-2 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
            04:32 left
          </p>
          <div className="bg-violet-50 rounded-xl h-20 flex items-center justify-center text-4xl mb-2">
            ⌚
          </div>
          <p className="text-xs font-bold text-stone-950 mb-1">Vintage Seiko Watch</p>
          <p className="text-[10px] text-gray-400 mb-1.5">14 bids so far</p>
          <p className="text-lg font-black text-orange-600">₱2,450</p>
          <p className="text-[9px] text-gray-400 mt-0.5">Current bid</p>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: build succeeds with no TypeScript errors. If it fails, check import paths.

- [ ] **Step 3: Commit**

```bash
git add components/landing-hero.tsx
git commit -m "feat: add LandingHero component"
```

---

## Task 2: Integrate hero, trust strip, and reassurance into `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

The existing file returns a single `<main>` with the auctions grid. Replace the entire return value with the structure below. The data-fetching logic at the top of the component stays unchanged.

- [ ] **Step 1: Replace the return statement in `app/page.tsx`**

Keep everything above the `return` (the `createClient`, `db` cast, and `listings` query) exactly as-is. Replace only the `return (...)`:

```tsx
import { createClient } from '@/lib/supabase/server'
import ListingCard from '@/components/listing-card'
import LandingHero from '@/components/landing-hero'

export default async function HomePage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: listings } = await db
    .from('listings')
    .select('id, title, current_bid, ends_at, listing_photos(storage_path, display_order)')
    .eq('status', 'live')
    .order('ends_at', { ascending: true })

  return (
    <>
      <LandingHero />

      {/* Trust strip */}
      <div className="bg-violet-100 py-2.5 px-6 flex justify-center flex-wrap gap-x-6 gap-y-1.5">
        {[
          '🔒 Secure GCash payments',
          '🇵🇭 PH-verified sellers',
          '🛡️ Buyer protection',
          '⚡ New auctions daily',
        ].map((item) => (
          <span key={item} className="text-[11px] font-semibold text-violet-800">
            {item}
          </span>
        ))}
      </div>

      {/* Reassurance — "Before you bid" */}
      <section className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-[13px] font-bold tracking-[0.12em] text-gray-400 uppercase text-center mb-5">
          Before you bid
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div key={title} className="bg-white rounded-2xl p-5 border border-violet-100">
              <p className="text-2xl mb-2.5">{icon}</p>
              <p className="text-sm font-extrabold text-stone-950 mb-1.5 leading-snug">{title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live auctions grid — anchor target for hero CTA */}
      <section id="live-auctions" className="max-w-2xl mx-auto px-6 pb-12">
        <div className="border-t border-violet-100 pt-8">
          <h2 className="text-xl font-extrabold mb-4 flex items-center gap-2 text-stone-950">
            Live Auctions
            <span className="bg-orange-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wide">
              LIVE
            </span>
          </h2>
          {!listings?.length && (
            <p className="text-muted-foreground">No live auctions right now. Check back soon.</p>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
          </div>
        </div>
      </section>
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: build succeeds. If `LandingHero` import fails, confirm the file exists at `components/landing-hero.tsx`.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: integrate landing hero, trust strip, and reassurance into homepage"
```

---

## Task 3: Enable smooth scroll and final browser QA

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Add `scroll-smooth` to the `<html>` element in `app/layout.tsx`**

Change:
```tsx
<html lang="en">
```
To:
```tsx
<html lang="en" className="scroll-smooth">
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

Expected: clean build. No new errors.

- [ ] **Step 3: Browser QA**

```bash
pnpm dev
```

Open `http://localhost:3000`. Check in order:

1. **Hero renders** — headline reads "Going once. Going twice. Yours." with "Yours." in violet
2. **Preview card** — coral pulsing timer dot visible, no "Bid Now" button present
3. **CTA scroll** — click "🔨 Place a Bid", page smooth-scrolls to the live auctions section
4. **Trust strip** — four claims visible, no stats/counts
5. **Reassurance cards** — "Before you bid" heading, three cards with correct emoji (🎯 / 😌 / 📦)
6. **Mobile** — resize to ~375px, confirm preview card stacks below text and reassurance cards go single-column
7. **Seller link** — "Got something to sell? List it here →" links to `/listings/new` (can be a 404 if the route doesn't exist, but the `href` must be correct)

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: enable smooth scroll for landing page CTA anchor"
```

---

## Known migration point

The hero CTA is `<a href="#live-auctions">` (smooth-scroll, same page). If a separate `/auctions` route is introduced later, change this to:

```tsx
import Link from 'next/link'
// ...
<Link href="/auctions" className="...">🔨 Place a Bid</Link>
```

This is a deliberate early-stage choice — not an oversight.

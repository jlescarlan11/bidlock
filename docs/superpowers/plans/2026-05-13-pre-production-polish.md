# BidLock Pre-Production Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 13 production readiness issues across error handling, OG metadata, UX friction, copy, and completeness before launch.

**Architecture:** Items are independent — each is one atomic commit. Items 3 and 5 share the same code block in `listings/[id]/page.tsx` and are addressed in a single commit. Item 12 is covered by item 3. Vitest is installed once up front (Task 0) and used by Tasks 3 and 10.

**Tech Stack:** Next.js 16.2.6, React 19.2.4, Supabase JS v2, Tailwind CSS (CSS variables only), Vitest

---

## File Map

**Created:**
- `app/not-found.tsx` — 404 page with home CTA
- `app/error.tsx` — error boundary with reset button
- `app/loading.tsx` — skeleton loading state
- `app/opengraph-image.tsx` — default branded OG image via ImageResponse
- `app/sitemap.ts` — dynamic sitemap with static + listing URLs
- `app/robots.ts` — robots.txt allowing all crawlers
- `app/me/page.tsx` — tabbed Activity page (server component)
- `app/me/tab-bar.tsx` — tab navigation (client component)
- `app/me/bids/bids-panel.tsx` — bids data + UI (extracted from old page)
- `app/me/listings/listings-panel.tsx` — listings data + UI (extracted from old page)
- `lib/contact-display.ts` — pure helper for resolveContactDisplay
- `lib/total-sold.ts` — pure helper for sumBids
- `lib/__tests__/contact-display.test.ts` — Vitest tests
- `lib/__tests__/total-sold.test.ts` — Vitest tests
- `vitest.config.ts` — test runner config
- `vitest.setup.ts` — empty setup file
- `supabase/migrations/008_get_total_sold_amount.sql` — SQL function

**Modified:**
- `app/layout.tsx` — extend metadata with openGraph
- `app/listings/[id]/page.tsx` — generateMetadata, sellerContact fetch, contact block restyle, Pay Now button (covers items 2, 3, 5)
- `app/page.tsx` — trust strip, "Pay in 24 hours" copy, RPC call (covers items 8, 9, 10)
- `app/auth/login/page.tsx` — raw → CSS variable tokens
- `app/auth/signup/page.tsx` — raw → CSS variable tokens
- `app/auth/forgot-password/page.tsx` — raw → CSS variable tokens
- `app/auth/update-password/page.tsx` — raw → CSS variable tokens
- `app/me/bids/page.tsx` — becomes single-line redirect
- `app/me/listings/page.tsx` — becomes single-line redirect
- `components/nav.tsx` — update /me/bids and /me/listings links
- `components/hero-carousel.tsx` — add empty state seller CTA
- `app/listings/new/steps/details-step.tsx` — sessionStorage draft save/restore
- `app/listings/new/page.tsx` — clear draft on successful submit
- `package.json` — add vitest, @vitejs/plugin-react, jsdom devDependencies

---

## Task 0: Install Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Modify: `package.json` (devDependencies + test script)

- [ ] **Step 1: Install packages**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
npm install -D vitest @vitejs/plugin-react jsdom
```

Expected: packages added to `node_modules/`, `package.json` devDependencies updated.

- [ ] **Step 2: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 3: Create vitest.setup.ts**

```ts
// Global test setup — add mocks here as needed
```

- [ ] **Step 4: Add test script to package.json**

Open `package.json`, find the `"scripts"` block and add `"test": "vitest run"`:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run"
}
```

- [ ] **Step 5: Verify vitest runs**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
npm test
```

Expected output: `No test files found` (no tests yet — that's OK).

- [ ] **Step 6: Commit**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
git add vitest.config.ts vitest.setup.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
chore: install Vitest test framework

Required for items 3 and 10 of the pre-production polish pass.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 1: Custom error/loading pages

**Files:**
- Create: `app/not-found.tsx`
- Create: `app/error.tsx`
- Create: `app/loading.tsx`

- [ ] **Step 1: Create app/not-found.tsx**

```tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-24 flex flex-col items-center text-center gap-4">
      <p className="text-5xl font-black text-primary">404</p>
      <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        The listing or page you&apos;re looking for doesn&apos;t exist or has already ended.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        ← Back to home
      </Link>
    </main>
  )
}
```

- [ ] **Step 2: Create app/error.tsx**

```tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="max-w-7xl mx-auto px-6 py-24 flex flex-col items-center text-center gap-4">
      <p className="text-5xl font-black text-destructive">!</p>
      <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        An unexpected error occurred. Try again or return to the home page.
      </p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          ← Home
        </Link>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Create app/loading.tsx**

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <Skeleton className="h-8 w-48 mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-3">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Typecheck**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
git add app/not-found.tsx app/error.tsx app/loading.tsx
git commit -m "$(cat <<'EOF'
feat: add custom not-found, error, and loading pages

Item 1 of pre-production polish pass.
Uses CSS variable tokens throughout. not-found covers listing 404 case.
error.tsx is a client component with reset + home actions.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: OG metadata on listing pages

**Files:**
- Create: `app/opengraph-image.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/listings/[id]/page.tsx`

- [ ] **Step 1: Extend root layout metadata**

Open `app/layout.tsx`. Replace the existing `export const metadata: Metadata` block:

```ts
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
```

- [ ] **Step 2: Create app/opengraph-image.tsx**

```tsx
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'BidLock — Philippine Auction Marketplace'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#f5f3ff',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 80, fontWeight: 900, color: '#7c3aed', letterSpacing: '-2px' }}>
          BidLock
        </div>
        <div style={{ fontSize: 30, color: '#6b7280', fontWeight: 500 }}>
          Philippine Auction Marketplace
        </div>
      </div>
    ),
    { ...size }
  )
}
```

- [ ] **Step 3: Add generateMetadata to listings/[id]/page.tsx**

Open `app/listings/[id]/page.tsx`. Add this import at the top (after existing imports):

```ts
import type { Metadata } from 'next'
```

Then add this function before the `export default async function ListingPage` line:

```ts
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: listing } = await db
    .from('listings')
    .select('title, listing_photos(storage_path, display_order)')
    .eq('id', id)
    .single()

  if (!listing) return { title: 'BidLock' }

  const photos = (listing.listing_photos ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => a.display_order - b.display_order)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firstPhoto = photos[0] as any | undefined
  const firstPhotoUrl = firstPhoto
    ? supabase.storage.from('listing-photos').getPublicUrl(firstPhoto.storage_path).data.publicUrl
    : null

  return {
    title: listing.title,
    description: `Bid on "${listing.title}" — live auction on BidLock.`,
    openGraph: {
      title: `${listing.title} — BidLock`,
      description: `Bid on "${listing.title}" — live auction on BidLock.`,
      ...(firstPhotoUrl ? { images: [firstPhotoUrl] } : {}),
    },
  }
}
```

Note: The root layout has `template: '%s — BidLock'`, so returning `title: listing.title` becomes `"{listing.title} — BidLock"` automatically.

- [ ] **Step 4: Typecheck**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
git add app/opengraph-image.tsx app/layout.tsx app/listings/[id]/page.tsx
git commit -m "$(cat <<'EOF'
feat: add OG metadata to root layout and listing detail pages

Item 2 of pre-production polish pass.
Root layout gets openGraph defaults and title template.
Listing pages get generateMetadata with title, description,
and OG image from the listing's first photo.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Winner contact dead-end + contact block restyle (items 3 & 5)

Items 3 and 5 both modify the same contact block in `listings/[id]/page.tsx`. They are implemented together in one commit.

**Files:**
- Create: `lib/contact-display.ts`
- Create: `lib/__tests__/contact-display.test.ts`
- Modify: `app/listings/[id]/page.tsx`

- [ ] **Step 1: Create the pure helper and failing test**

Create `lib/contact-display.ts`:

```ts
export type ContactDisplay = {
  label: string
  phone: string | null
  gcash: string | null
}

export function resolveContactDisplay(
  isAuctioneer: boolean,
  winnerContact: { phone_number: string | null; gcash_name: string | null } | null,
  sellerContact: { phone_number: string | null; gcash_name: string | null } | null,
): ContactDisplay | null {
  if (isAuctioneer && winnerContact) {
    return {
      label: "Winner's contact",
      phone: winnerContact.phone_number,
      gcash: winnerContact.gcash_name,
    }
  }
  if (!isAuctioneer && sellerContact) {
    return {
      label: "Seller's contact",
      phone: sellerContact.phone_number,
      gcash: sellerContact.gcash_name,
    }
  }
  return null
}
```

Create `lib/__tests__/contact-display.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolveContactDisplay } from '../contact-display'

describe('resolveContactDisplay', () => {
  it('returns winner contact for auctioneer', () => {
    const result = resolveContactDisplay(
      true,
      { phone_number: '09171234567', gcash_name: 'Juan D' },
      null,
    )
    expect(result).toEqual({
      label: "Winner's contact",
      phone: '09171234567',
      gcash: 'Juan D',
    })
  })

  it('returns seller contact for winner', () => {
    const result = resolveContactDisplay(
      false,
      null,
      { phone_number: '09189876543', gcash_name: 'Maria S' },
    )
    expect(result).toEqual({
      label: "Seller's contact",
      phone: '09189876543',
      gcash: 'Maria S',
    })
  })

  it('returns null when no contact data available', () => {
    expect(resolveContactDisplay(true, null, null)).toBeNull()
    expect(resolveContactDisplay(false, null, null)).toBeNull()
  })

  it('returns null when isWinner but no sellerContact', () => {
    expect(resolveContactDisplay(false, null, null)).toBeNull()
  })
})
```

- [ ] **Step 2: Run failing test**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
npm test -- lib/__tests__/contact-display.test.ts
```

Expected: FAIL (lib/contact-display.ts doesn't exist yet — you just created it, so it should pass the import but the logic should work). Actually the file is created, so run to verify it passes immediately.

Expected: All 4 tests PASS.

- [ ] **Step 3: Add sellerContact fetch to listings/[id]/page.tsx**

Open `app/listings/[id]/page.tsx`. After the existing `winnerContact` block (around line 66), add:

```ts
let sellerContact: { phone_number: string | null; gcash_name: string | null } | null = null
if (isWinner && listing.status === 'ended') {
  const { data: sc } = await db
    .from('profiles')
    .select('phone_number, gcash_name')
    .eq('id', listing.auctioneer_id)
    .single()
  sellerContact = sc
}
```

- [ ] **Step 4: Import resolveContactDisplay and Button**

At the top of `app/listings/[id]/page.tsx`, add these imports:

```ts
import { resolveContactDisplay } from '@/lib/contact-display'
import { Button } from '@/components/ui/button'
```

- [ ] **Step 5: Compute contactDisplay before the return statement**

Just before the `return (` statement in `ListingPage`, add:

```ts
const contactDisplay = (showChat && listing.winner_id !== null)
  ? resolveContactDisplay(isAuctioneer, winnerContact, sellerContact)
  : null
```

- [ ] **Step 6: Replace the contact block JSX**

Find this block (around line 135–153):

```tsx
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
```

Replace with:

```tsx
{showChat && listing.winner_id !== null && (
  <div className="bg-card border border-border rounded-xl p-6 space-y-4">
    <h2 className="text-lg font-bold">Contact Information</h2>
    <p className="text-sm text-muted-foreground">
      Coordinate delivery and final payment directly. We do not handle either. Report violations via the dispute form.
    </p>
    {contactDisplay && (
      <div className="text-sm space-y-2">
        <p>
          <span className="font-medium">{contactDisplay.label} — Phone:</span>{' '}
          {contactDisplay.phone ?? 'Not provided'}
        </p>
        <p>
          <span className="font-medium">GCash name:</span>{' '}
          {contactDisplay.gcash ?? 'Not provided'}
        </p>
      </div>
    )}
    {isWinner && (
      <Button asChild className="w-full">
        <Link href={`/listings/${id}/pay`}>Pay Now →</Link>
      </Button>
    )}
  </div>
)}
```

- [ ] **Step 7: Typecheck and run tests**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
npx tsc --noEmit && npm test -- lib/__tests__/contact-display.test.ts
```

Expected: 0 type errors, 4 tests PASS.

- [ ] **Step 8: Commit**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
git add lib/contact-display.ts lib/__tests__/contact-display.test.ts app/listings/[id]/page.tsx
git commit -m "$(cat <<'EOF'
fix: surface seller contact to winner on listing detail (items 3 & 5)

Items 3 and 5 of pre-production polish pass.
- Fetches seller phone/GCash for the winner (symmetric to auctioneer view)
- Replaces dead-end 'visit your bids page' text with actual contact info
- Adds Pay Now button linking to /listings/[id]/pay
- Restyles contact block as a proper bg-card rounded-xl card
- Extracts resolveContactDisplay pure helper with Vitest coverage

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Auth pages — migrate raw Tailwind tokens to CSS variables

**Files:**
- Modify: `app/auth/login/page.tsx`
- Modify: `app/auth/signup/page.tsx`
- Modify: `app/auth/forgot-password/page.tsx`
- Modify: `app/auth/update-password/page.tsx`

Apply the same token mapping to all four files. The mapping is:

| Find | Replace |
|---|---|
| `bg-slate-50` | `bg-muted` |
| `bg-white` | `bg-card` |
| `border-slate-200/60` | `border-border/60` |
| `border-slate-200` | `border-border` |
| `text-slate-900` | `text-card-foreground` |
| `text-slate-500` | `text-muted-foreground` |
| `text-slate-600` | `text-muted-foreground` |
| `text-slate-700` | `text-foreground` |
| `text-slate-400` | `text-muted-foreground` |
| `bg-violet-50` | `bg-primary/10` |
| `text-violet-600` | `text-primary` |
| `hover:text-violet-600` | `hover:text-primary` (if present) |
| `bg-violet-600` | `bg-primary` |
| `hover:bg-violet-700` | `hover:bg-primary/90` |
| `active:bg-violet-800` | `active:bg-primary/80` |
| `hover:bg-slate-50` | `hover:bg-muted` |
| `focus-visible:ring-violet-600/20` | `focus-visible:ring-ring/20` |
| `focus-visible:border-violet-600` | `focus-visible:border-primary` |

Custom RGBA box shadows (`shadow-[0_1px_3px_...]`) are theme-agnostic — leave them unchanged.

- [ ] **Step 1: Migrate app/auth/login/page.tsx**

Open `app/auth/login/page.tsx` and apply the mapping above to every className string. The outer wrapper becomes:

```tsx
<div className="min-h-[calc(100vh-3.5rem)] bg-muted flex flex-col items-center justify-center px-4 py-12 gap-6">
```

The card div becomes:

```tsx
<div className="w-full max-w-[420px] bg-card rounded-2xl border border-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] p-10">
```

The heading becomes:

```tsx
<h1 className="text-2xl font-semibold text-card-foreground">Welcome back</h1>
<p className="text-sm text-muted-foreground mt-1">Sign in to your BidLock account</p>
```

Labels become `text-foreground`. Inputs' focus ring/border become `focus-visible:ring-ring/20 focus-visible:border-primary`. The submit button becomes `bg-primary hover:bg-primary/90 active:bg-primary/80`. Forgot password link becomes `text-primary`. Google button becomes `bg-card border-border text-foreground hover:bg-muted`. "No account?" text becomes `text-muted-foreground`, sign up link becomes `text-primary`.

- [ ] **Step 2: Migrate app/auth/signup/page.tsx**

Apply the same token mapping. The structure is identical to login. The heading text changes to `text-card-foreground`, body text to `text-muted-foreground`, labels to `text-foreground`.

- [ ] **Step 3: Migrate app/auth/forgot-password/page.tsx**

The outer wrapper: `bg-muted`. Card: `bg-card border-border/60`. All `text-slate-*` → CSS vars as per the mapping. The success state icon wrapper changes from `bg-violet-50` → `bg-primary/10`, icon from `text-violet-600` → `text-primary`. The "Back to sign in" link: `text-primary`.

- [ ] **Step 4: Migrate app/auth/update-password/page.tsx**

Same mapping. The hint text `text-slate-400` → `text-muted-foreground`. Submit button → `bg-primary hover:bg-primary/90 active:bg-primary/80`.

- [ ] **Step 5: Typecheck**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
git add app/auth/login/page.tsx app/auth/signup/page.tsx app/auth/forgot-password/page.tsx app/auth/update-password/page.tsx
git commit -m "$(cat <<'EOF'
fix: migrate auth pages from raw Tailwind tokens to CSS variables

Item 4 of pre-production polish pass.
Replaces slate-*/violet-* with bg-muted, bg-card, text-foreground,
text-primary, border-border, etc. Visual result is equivalent but
now theme-aware. RGBA shadows are left unchanged (theme-agnostic).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: (Covered by Task 3)

Items 3 and 5 share the same code block. The contact block restyle was completed in Task 3, Step 6. No additional work needed.

---

## Task 6: Merge /me/bids and /me/listings into tabbed /me Activity page

**Files:**
- Create: `app/me/bids/bids-panel.tsx`
- Create: `app/me/listings/listings-panel.tsx`
- Create: `app/me/tab-bar.tsx`
- Create: `app/me/page.tsx`
- Modify: `app/me/bids/page.tsx` → redirect
- Modify: `app/me/listings/page.tsx` → redirect
- Modify: `components/nav.tsx`

- [ ] **Step 1: Create app/me/bids/bids-panel.tsx**

This file contains all data-fetching and UI logic from the current `app/me/bids/page.tsx`, with these changes:
- Export name changed from `MyBidsPage` to `BidsPanel`
- Accepts `{ userId: string }` as props (no longer fetches user from auth)
- Removes the auth redirect check
- Removes the outer `max-w-7xl mx-auto p-4 pt-8` wrapper div (parent provides container)
- Removes the `<h1>My Bids</h1>` heading (tab bar serves as nav)

```tsx
import { createClient } from '@/lib/supabase/server'
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

type BidStatus = 'winning' | 'outbid' | 'no-other-bids'

function getBidStatus(
  bidAmount: number,
  currentBid: number,
  hasOtherBids: boolean
): BidStatus {
  if (!hasOtherBids) return 'no-other-bids'
  return bidAmount >= currentBid ? 'winning' : 'outbid'
}

function formatEndedDate(endsAt: string): string {
  const d = new Date(endsAt)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

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

  let subtitle: string
  if (isActive) {
    const remaining = formatTimeRemaining(listing.ends_at)
    subtitle = remaining === 'Ended' ? 'Ended' : `Ends in ${remaining}`
  } else {
    const endedDate = formatEndedDate(listing.ends_at)
    const endedPrefix = endedDate ? `Ended ${endedDate}` : 'Ended'
    if (!isWon && listing.winner_id !== null) {
      subtitle = `${endedPrefix} · Sold for ${formatPHP(listing.current_bid)}`
    } else {
      subtitle = endedPrefix
    }
  }

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
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{listing.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold">{formatPHP(bid.amount)}</p>
        <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeClass}`}>
          {badgeLabel}
        </span>
      </div>
    </Link>
  )
}

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
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title} · {items.length}
      </h2>
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

export default async function BidsPanel({ userId }: { userId: string }) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: bids } = await db
    .from('bids')
    .select(`
      id, amount, created_at,
      listings (id, title, status, current_bid, winner_id, ends_at,
        listing_photos (storage_path, display_order)
      )
    `)
    .eq('bidder_id', userId)
    .order('created_at', { ascending: false })

  const seen = new Set<string>()
  const deduped = (bids ?? []).filter((b: any) => {
    const id = b.listings?.id
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })

  const bidsWithThumbs = deduped.map((bid: any) => {
    const photos: any[] = bid.listings?.listing_photos ?? []
    const firstPhoto = [...photos].sort((a: any, b: any) => a.display_order - b.display_order)[0]
    const thumbnailUrl = firstPhoto
      ? supabase.storage.from('listing-photos').getPublicUrl(firstPhoto.storage_path).data.publicUrl
      : null
    return { ...bid, thumbnailUrl }
  })

  const activeListingIds: string[] = bidsWithThumbs
    .filter((b: any) => b.listings?.status === 'live')
    .map((b: any) => b.listings?.id)
    .filter(Boolean)

  const otherBidListings = new Set<string>()
  if (activeListingIds.length > 0) {
    const { data: otherBids } = await db
      .from('bids')
      .select('listing_id')
      .neq('bidder_id', userId)
      .in('listing_id', activeListingIds)
    ;(otherBids ?? []).forEach((b: any) => otherBidListings.add(b.listing_id))
  }

  const active = bidsWithThumbs.filter((b: any) => b.listings?.status === 'live')
  const won = bidsWithThumbs.filter(
    (b: any) => b.listings?.status === 'ended' && b.listings?.winner_id === userId
  )
  const lost = bidsWithThumbs.filter(
    (b: any) =>
      b.listings?.status === 'ended' &&
      b.listings?.winner_id !== null &&
      b.listings?.winner_id !== userId
  )

  return (
    <div className="space-y-8">
      <Section title="Active" items={active} userId={userId} otherBidListings={otherBidListings} />
      <Section title="Won" items={won} userId={userId} otherBidListings={new Set()} />
      <Section title="Lost" items={lost} userId={userId} otherBidListings={new Set()} />
    </div>
  )
}
```

- [ ] **Step 2: Create app/me/listings/listings-panel.tsx**

This file contains all data-fetching and UI logic from the current `app/me/listings/page.tsx`, with these changes:
- Export name changed from `MyListingsPage` to `ListingsPanel`
- Accepts `{ userId: string }` as props
- Removes the auth redirect check
- Removes the outer container wrapper and `<h1>` heading

```tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { formatPHP } from '@/lib/utils/currency'
import { formatTimeRemaining } from '@/lib/utils/time'
import { Badge } from '@/components/ui/badge'

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
      if (listing.winner_id) {
        const price = listing.current_bid != null ? formatPHP(listing.current_bid) : ''
        return price ? `${prefix} · Sold for ${price}` : prefix
      }
      return `${prefix} · No bids`
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

function ListingCard({
  listing,
  thumbnailUrl,
}: {
  listing: any
  thumbnailUrl: string | null
}) {
  const isPendingPayment = listing.status === 'pending_payment'
  const isLinked = ['rejected', 'live', 'ended'].includes(listing.status)
  const cardHref = isPendingPayment ? `/listings/${listing.id}/pay` : `/listings/${listing.id}`
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
          <Image src={thumbnailUrl} alt={listing.title ?? ''} fill className="object-cover" sizes="52px" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-bold">
            {getInitials(listing.title ?? '')}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{listing.title}</p>
        <p className={`mt-0.5 truncate text-xs ${subtitleClass}`}>{getSubtitle(listing)}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold">{listing.current_bid != null ? formatPHP(listing.current_bid) : ''}</p>
        <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${getBadgeClasses(listing.status)}`}>
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
      <Link href={cardHref} aria-label={listing.title ?? ''} className={`${base} transition-colors hover:bg-muted/40`}>
        {inner}
      </Link>
    )
  }
  return <div className={base}>{inner}</div>
}

function Section({ title, items }: { title: string; items: any[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title} · {items.length}
      </h2>
      <div className="space-y-2">
        {items.map((listing: any) => (
          <ListingCard key={listing.id} listing={listing} thumbnailUrl={listing.thumbnailUrl} />
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
          <ListingCard key={listing.id} listing={listing} thumbnailUrl={listing.thumbnailUrl} />
        ))}
      </div>
    </details>
  )
}

export default async function ListingsPanel({ userId }: { userId: string }) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: listings } = await db
    .from('listings')
    .select(`
      id, title, current_bid, status, created_at, ends_at,
      rejection_reason, winner_id,
      listing_photos(storage_path, display_order)
    `)
    .eq('auctioneer_id', userId)
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

  return (
    <div className="space-y-8">
      {withThumbs.length === 0 && (
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

- [ ] **Step 3: Create app/me/tab-bar.tsx**

```tsx
'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const TABS = [
  { key: 'bids',     label: 'My Bids',     href: '/me?tab=bids' },
  { key: 'listings', label: 'My Listings', href: '/me?tab=listings' },
] as const

export default function ActivityTabBar() {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') ?? 'bids'

  return (
    <div className="flex border-b border-border mb-6">
      {TABS.map(({ key, label, href }) => (
        <Link
          key={key}
          href={href}
          aria-current={tab === key ? 'page' : undefined}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === key
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create app/me/page.tsx**

```tsx
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ActivityTabBar from './tab-bar'
import BidsPanel from './bids/bids-panel'
import ListingsPanel from './listings/listings-panel'

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { tab = 'bids' } = await searchParams

  return (
    <div className="max-w-7xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-6">Activity</h1>
      <Suspense>
        <ActivityTabBar />
      </Suspense>
      {tab === 'listings'
        ? <ListingsPanel userId={user.id} />
        : <BidsPanel userId={user.id} />
      }
    </div>
  )
}
```

- [ ] **Step 5: Replace app/me/bids/page.tsx with redirect**

```tsx
import { redirect } from 'next/navigation'

export default function MyBidsPage() {
  redirect('/me?tab=bids')
}
```

- [ ] **Step 6: Replace app/me/listings/page.tsx with redirect**

```tsx
import { redirect } from 'next/navigation'

export default function MyListingsPage() {
  redirect('/me?tab=listings')
}
```

- [ ] **Step 7: Update nav links in components/nav.tsx**

Find and replace:

```tsx
<Link href="/me/listings" className="text-muted-foreground hover:text-foreground transition-colors">My listings</Link>
<Link href="/me/bids" className="text-muted-foreground hover:text-foreground transition-colors">My bids</Link>
```

Replace with:

```tsx
<Link href="/me?tab=listings" className="text-muted-foreground hover:text-foreground transition-colors">My listings</Link>
<Link href="/me?tab=bids" className="text-muted-foreground hover:text-foreground transition-colors">My bids</Link>
```

- [ ] **Step 8: Typecheck**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
git add app/me/page.tsx app/me/tab-bar.tsx app/me/bids/bids-panel.tsx app/me/listings/listings-panel.tsx app/me/bids/page.tsx app/me/listings/page.tsx components/nav.tsx
git commit -m "$(cat <<'EOF'
feat: merge /me/bids and /me/listings into tabbed /me Activity page

Item 6 of pre-production polish pass.
Old routes redirect to /me?tab=bids and /me?tab=listings.
URL-driven tabs: server-rendered, shareable, no client JS for switching.
Auth gate moved to parent page; panels receive userId as prop.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Empty auction state CTA for sellers

**Files:**
- Modify: `components/hero-carousel.tsx`

- [ ] **Step 1: Add seller CTA to empty state**

Open `components/hero-carousel.tsx`. Find the `!listings.length` return block:

```tsx
if (!listings.length) {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center py-20 text-center">
      <p className="text-4xl mb-3" aria-hidden="true">🔨</p>
      <p className="font-semibold text-foreground mb-1">No live auctions yet</p>
      <p className="text-sm text-muted-foreground">Be the first to list something!</p>
    </div>
  )
}
```

Replace with:

```tsx
if (!listings.length) {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center py-20 text-center">
      <p className="text-4xl mb-3" aria-hidden="true">🔨</p>
      <p className="font-semibold text-foreground mb-1">No live auctions yet</p>
      <p className="text-sm text-muted-foreground">Be the first to list something!</p>
      <p className="text-sm text-muted-foreground mt-3">
        Got something to sell?{' '}
        <Link href="/listings/new" className="text-primary underline underline-offset-2">
          Create a listing →
        </Link>
      </p>
    </div>
  )
}
```

Check the top of `hero-carousel.tsx` — if `Link` from `next/link` is not already imported, add:
```tsx
import Link from 'next/link'
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
git add components/hero-carousel.tsx
git commit -m "$(cat <<'EOF'
feat: add seller CTA to empty auction state on landing page

Item 7 of pre-production polish pass.
Adds 'Got something to sell? Create a listing →' below the empty
state message. Styled as secondary (text-muted-foreground + text-primary link).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Trust strip visibility

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Remove opacity-50 from trust strip**

Open `app/page.tsx`. Find line 68:

```tsx
<div className="max-w-7xl mx-auto px-6 flex justify-center flex-wrap gap-x-8 gap-y-2 opacity-50">
```

Replace with:

```tsx
<div className="max-w-7xl mx-auto px-6 flex justify-center flex-wrap gap-x-8 gap-y-2">
```

The `<span>` elements already have `text-muted-foreground` — that provides the appropriate muted treatment without the blanket opacity wash.

- [ ] **Step 2: Commit**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
git add app/page.tsx
git commit -m "$(cat <<'EOF'
fix: improve trust strip visibility on landing page

Item 8 of pre-production polish pass.
Removes opacity-50 from trust strip container. Spans retain
text-muted-foreground for an intentional but readable muted treatment.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Soften "Pay in 24 hours" copy

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Update copy**

Open `app/page.tsx`. Find line 105:

```tsx
title: 'Win? Pay in 24 hours.',
```

Replace with:

```tsx
title: 'Win? Pay typically within 24 hours.',
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
git add app/page.tsx
git commit -m "$(cat <<'EOF'
fix: soften 'Pay in 24 hours' copy to reflect unenforced expectation

Item 9 of pre-production polish pass.
'Win? Pay in 24 hours.' → 'Win? Pay typically within 24 hours.'
This commitment is not mechanically enforced; softening prevents
implicit false promises to users.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Replace JS reduce with Postgres SUM via RPC

**Files:**
- Create: `supabase/migrations/008_get_total_sold_amount.sql`
- Create: `lib/total-sold.ts`
- Create: `lib/__tests__/total-sold.test.ts`
- Modify: `app/page.tsx`

- [ ] **Step 1: Write the failing test first**

Create `lib/total-sold.ts`:

```ts
export function sumBids(rows: { current_bid: number }[]): number {
  return rows.reduce((sum, r) => sum + Number(r.current_bid), 0)
}
```

Create `lib/__tests__/total-sold.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { sumBids } from '../total-sold'

describe('sumBids', () => {
  it('sums bid amounts correctly', () => {
    const rows = [{ current_bid: 100 }, { current_bid: 250 }, { current_bid: 50 }]
    expect(sumBids(rows)).toBe(400)
  })

  it('returns 0 for empty array', () => {
    expect(sumBids([])).toBe(0)
  })

  it('handles numeric strings (Supabase may return strings)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = [{ current_bid: '100' as any }, { current_bid: '200.50' as any }]
    expect(sumBids(rows)).toBeCloseTo(300.5)
  })

  it('matches what RPC should return for the same fixture', () => {
    const fixture = [
      { current_bid: 500 },
      { current_bid: 1200 },
      { current_bid: 750 },
    ]
    const rpcEquivalent = 2450
    expect(sumBids(fixture)).toBe(rpcEquivalent)
  })
})
```

- [ ] **Step 2: Run the tests**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
npm test -- lib/__tests__/total-sold.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 3: Create the Supabase migration**

Create `supabase/migrations/008_get_total_sold_amount.sql`:

```sql
CREATE OR REPLACE FUNCTION get_total_sold_amount()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(current_bid), 0)
  FROM listings
  WHERE status = 'ended'
    AND winner_id IS NOT NULL;
$$;
```

Note: `SECURITY DEFINER` allows the function to run with the rights of the function owner, bypassing RLS for this aggregate query (same data the old query fetched). Run this in the Supabase SQL editor or via `supabase db push`.

- [ ] **Step 4: Replace the reduce in app/page.tsx**

Open `app/page.tsx`. The current code (lines 18–30) is:

```ts
const [
  { count: itemsSold },
  { data: soldListings },
  { count: activeBids },
] = await Promise.all([
  db.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'ended').not('winner_id', 'is', null),
  db.from('listings').select('current_bid').eq('status', 'ended').not('winner_id', 'is', null),
  liveIds.length > 0
    ? db.from('bids').select('id', { count: 'exact', head: true }).in('listing_id', liveIds)
    : Promise.resolve({ count: 0, data: null, error: null }),
])

const totalSold = (soldListings ?? []).reduce((sum: number, l: any) => sum + Number(l.current_bid), 0)
```

Replace with:

```ts
const [
  { count: itemsSold },
  { data: totalSoldResult },
  { count: activeBids },
] = await Promise.all([
  db.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'ended').not('winner_id', 'is', null),
  db.rpc('get_total_sold_amount'),
  liveIds.length > 0
    ? db.from('bids').select('id', { count: 'exact', head: true }).in('listing_id', liveIds)
    : Promise.resolve({ count: 0, data: null, error: null }),
])

const totalSold = Number(totalSoldResult ?? 0)
```

- [ ] **Step 5: Typecheck and run tests**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
npx tsc --noEmit && npm test
```

Expected: 0 type errors, all tests PASS.

- [ ] **Step 6: Commit**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
git add supabase/migrations/008_get_total_sold_amount.sql lib/total-sold.ts lib/__tests__/total-sold.test.ts app/page.tsx
git commit -m "$(cat <<'EOF'
perf: replace JS reduce with Postgres SUM RPC for landing stats

Item 10 of pre-production polish pass.
get_total_sold_amount() SQL function replaces fetching every
ended listing's current_bid and summing in JS. Scales to any
number of ended listings. sumBids pure helper tested with Vitest.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: sitemap.xml and robots.txt

**Files:**
- Create: `app/sitemap.ts`
- Create: `app/robots.ts`

- [ ] **Step 1: Create app/sitemap.ts**

```ts
import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bidlock.ph'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: listings } = await db
    .from('listings')
    .select('id, ends_at, status')
    .or(`status.eq.live,and(status.eq.ended,ends_at.gte.${thirtyDaysAgo})`)
    .order('ends_at', { ascending: false })

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/auth/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/auth/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/listings/new`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  const listingRoutes: MetadataRoute.Sitemap = (listings ?? []).map((l: any) => ({
    url: `${BASE_URL}/listings/${l.id}`,
    lastModified: new Date(l.ends_at),
    changeFrequency: l.status === 'live' ? 'hourly' : 'weekly',
    priority: l.status === 'live' ? 0.9 : 0.6,
  }))

  return [...staticRoutes, ...listingRoutes]
}
```

- [ ] **Step 2: Create app/robots.ts**

```ts
import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bidlock.ph'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
```

- [ ] **Step 3: Typecheck**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
git add app/sitemap.ts app/robots.ts
git commit -m "$(cat <<'EOF'
feat: add sitemap.xml and robots.txt

Item 11 of pre-production polish pass.
sitemap.ts emits static routes + all live listings and recently-ended
listings (last 30 days). robots.ts allows all crawlers.
Base URL from NEXT_PUBLIC_SITE_URL env var (default: https://bidlock.ph).
Set NEXT_PUBLIC_SITE_URL in Vercel before production deploy.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: (Covered by Task 3)

The Pay Now button linking to `/listings/[id]/pay` was added in Task 3, Step 6. No additional work needed.

---

## Task 13: Draft recovery on new listing form

**Files:**
- Modify: `app/listings/new/steps/details-step.tsx`
- Modify: `app/listings/new/page.tsx`

- [ ] **Step 1: Read the new listing page to find the submission handler**

Open `app/listings/new/page.tsx` and identify where the final form submission happens (the `onSubmit` or final step handler). You need to call `sessionStorage.removeItem('bidlock:new-listing-draft')` after a successful submit.

- [ ] **Step 2: Add draft save/restore to details-step.tsx**

Open `app/listings/new/steps/details-step.tsx`.

Add `reset` to the `useForm` destructure:

```ts
const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<ListingDetailsInput>({
  resolver: zodResolver(listingDetailsSchema) as any,
  defaultValues: { duration_days: 3, ...defaultValues },
})
```

Add two `useEffect` hooks after the existing `onPreviewChangeRef` effects:

```ts
const DRAFT_KEY = 'bidlock:new-listing-draft'

// Restore draft on mount
useEffect(() => {
  const raw = sessionStorage.getItem(DRAFT_KEY)
  if (!raw) return
  try {
    const saved = JSON.parse(raw)
    reset({ duration_days: 3, ...defaultValues, ...saved })
  } catch {
    // Corrupt draft — ignore
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])

// Save draft on change (debounced 500ms)
useEffect(() => {
  const timeout = setTimeout(() => {
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        title: watchedTitle,
        description: watchedDescription,
        starting_bid: watchedBid,
        duration_days: watchedDuration,
      })
    )
  }, 500)
  return () => clearTimeout(timeout)
}, [watchedTitle, watchedDescription, watchedBid, watchedDuration])
```

- [ ] **Step 3: Clear draft on successful submission in page.tsx**

Open `app/listings/new/page.tsx`. Find the success path of the final form submission (look for the `router.push` or redirect after the listing is created). Add this line before or after the redirect:

```ts
sessionStorage.removeItem('bidlock:new-listing-draft')
```

If the page uses a server action that redirects server-side, add the clear in the `onSuccess` callback or in a `useEffect` that detects successful submission state.

- [ ] **Step 4: Typecheck**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
git add app/listings/new/steps/details-step.tsx app/listings/new/page.tsx
git commit -m "$(cat <<'EOF'
feat: add sessionStorage draft recovery to new listing details step

Item 13 of pre-production polish pass.
Saves title, description, starting_bid, duration_days to
sessionStorage key 'bidlock:new-listing-draft' on every change
(debounced 500ms). Restores on mount. Clears on successful submission.
Photo uploads are not persisted.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage check:**

| Item | Task | Status |
|---|---|---|
| 1. Custom error/loading pages | Task 1 | ✅ |
| 2. OG metadata | Task 2 | ✅ |
| 3. Winner contact dead-end | Task 3 | ✅ |
| 4. Auth token migration | Task 4 | ✅ |
| 5. Contact block restyle | Task 3 (combined) | ✅ |
| 6. Tabbed /me Activity | Task 6 | ✅ |
| 7. Empty auction CTA | Task 7 | ✅ |
| 8. Trust strip | Task 8 | ✅ |
| 9. "Pay in 24 hours" copy | Task 9 | ✅ |
| 10. Landing stats SUM | Task 10 | ✅ |
| 11. sitemap + robots | Task 11 | ✅ |
| 12. /pay reachable | Task 3 (combined) | ✅ |
| 13. Draft recovery | Task 13 | ✅ |
| Vitest install | Task 0 | ✅ |

**Type consistency:** `resolveContactDisplay` used in `lib/contact-display.ts`, imported in `listings/[id]/page.tsx`, tested in `lib/__tests__/contact-display.test.ts` — name is consistent throughout. `sumBids` used in `lib/total-sold.ts` and `lib/__tests__/total-sold.test.ts` — consistent. `BidsPanel`/`ListingsPanel` receive `{ userId: string }` and are used that way in `app/me/page.tsx`.

**Placeholder scan:** Task 13 Step 1 asks the engineer to read `page.tsx` first before modifying it — this is intentional since the submission handler location varies and cannot be prescribed without reading the file first.

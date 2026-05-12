# BidLock Pre-Production Polish Pass

**Date:** 2026-05-13  
**Scope:** 13 items across production gaps, UX friction, copy/micro-polish, and completeness/edge cases.

---

## Constraints

- **Design tokens only.** All new/changed UI uses CSS variables (`bg-muted`, `text-foreground`, `text-primary`, etc.). No raw Tailwind color classes (`slate-*`, `violet-*`).
- **Atomic commits.** One commit per numbered item. Conventional commit prefix. Item number in commit body.
- **Tests via Vitest.** Install Vitest + jsdom. Tests for item 3 (pure contact-resolution logic) and item 10 (SUM query). Visual/copy changes (items 4, 5, 7, 8, 9) have no tests.
- **No scope creep.** Tangential findings noted in final report only.
- **Verify before completing.** Typecheck, lint, and tests after each fix.

---

## Section A — Production Gaps

### Item 1 — Custom error/loading pages

Three new root-level files. All use CSS variables exclusively.

**`app/not-found.tsx`** — Server component.
- Layout: `max-w-7xl mx-auto px-6`, vertically centered in viewport.
- Heading: "Page not found" with a short subline acknowledging listing context ("The listing or page you're looking for doesn't exist or has ended.").
- CTA: `<Link href="/">← Back to home</Link>` styled as a primary button.

**`app/error.tsx`** — Client component (`'use client'`).
- Props: `{ error: Error & { digest?: string }; reset: () => void }`.
- Heading: "Something went wrong" with a generic subline.
- Two actions: "Try again" button (calls `reset()`), "← Back to home" link.
- No raw error details exposed to UI.

**`app/loading.tsx`** — Server component.
- Uses `Skeleton` from `components/ui/skeleton.tsx`.
- Renders a skeleton approximating the listing grid: header skeleton + 3-column card skeletons (3 cards).
- Wrapped in `max-w-7xl mx-auto px-6 py-8`.

---

### Item 2 — OG metadata on listing pages

**Root layout (`app/layout.tsx`):**
- Extend existing `metadata` export with:
  ```ts
  openGraph: {
    type: 'website',
    siteName: 'BidLock',
    title: 'BidLock',
    description: 'Philippine auction marketplace',
  }
  ```
- Add `app/opengraph-image.tsx` using Next.js `ImageResponse` — a simple text-only branded card showing "BidLock" logotype + "Philippine Auction Marketplace" tagline. No static PNG required.

**`app/listings/[id]/page.tsx`:**
- Add `generateMetadata({ params })` that fetches `{ title, listing_photos }` for the listing.
- Returns:
  ```ts
  {
    title: `${listing.title} — BidLock`,
    description: `Bid on "${listing.title}" — live auction on BidLock.`,
    openGraph: {
      title: `${listing.title} — BidLock`,
      images: firstPhotoUrl ? [firstPhotoUrl] : [],
    }
  }
  ```
- Falls back to `{ title: 'BidLock' }` if listing not found (graceful — `notFound()` is called separately in the page component).

---

### Item 3 — Winner contact dead-end + Pay Now

**Data fetching addition in `app/listings/[id]/page.tsx`:**
- Add `sellerContact: { phone_number: string | null; gcash_name: string | null } | null = null`.
- Fetch when `isWinner && listing.status === 'ended'`:
  ```ts
  const { data: sc } = await db
    .from('profiles')
    .select('phone_number, gcash_name')
    .eq('id', listing.auctioneer_id)
    .single()
  sellerContact = sc
  ```
- Symmetric to existing `winnerContact` fetch for `isAuctioneer`.

**Contact block (`isWinner` branch, currently line ~148):**
- Replace dead-end "visit your bids page" text with:
  - Seller's phone number
  - Seller's GCash name
  - "Pay Now" `<Link href={`/listings/${id}/pay`}>` rendered as a primary `Button`, full-width, below contact fields.

**Pure helper for testability:**
- Extract `resolveContactDisplay(isAuctioneer, winnerContact, sellerContact)` → `{ label: string; phone: string | null; gcash: string | null }`.
- Used by the contact block JSX.
- Tested in Vitest with both `isAuctioneer=true` and `isWinner=true` fixtures.

---

## Section B — UX Friction

### Item 4 — Auth pages: raw token migration

Files: `app/auth/login/page.tsx`, `app/auth/signup/page.tsx`, `app/auth/forgot-password/page.tsx`, `app/auth/update-password/page.tsx`.

Token mapping:

| Raw token | CSS variable |
|---|---|
| `bg-slate-50` | `bg-muted` |
| `bg-white` | `bg-card` |
| `border-slate-200/60`, `border-slate-200` | `border-border` |
| `text-slate-900` | `text-card-foreground` |
| `text-slate-500` | `text-muted-foreground` |
| `text-slate-700` | `text-foreground` |
| `violet-600` (bg, text, border, ring) | `primary` / `ring-ring` |
| `focus-visible:ring-violet-600/20` | `focus-visible:ring-ring/20` |
| `focus-visible:border-violet-600` | `focus-visible:border-primary` |

Custom RGBA box shadows are kept as-is (theme-agnostic values).

---

### Item 5 — Contact block restyle

Location: `app/listings/[id]/page.tsx` line ~136.

**Before:** `<div className="border rounded-lg p-4 space-y-2">`

**After:** `<div className="bg-card border border-border rounded-xl p-6 space-y-4">`

- Section heading: `<h2 className="text-lg font-bold">Contact Information</h2>` — matches "About this item" heading style.
- Disclaimer text: keeps existing copy, styled as `text-sm text-muted-foreground`.
- Contact fields: `text-sm space-y-2` with `font-medium` labels.
- Visual weight signals to the user this is the most important post-auction content.

---

### Item 6 — Tabbed /me Activity page

**New files:**
- `app/me/bids/bids-panel.tsx` — server component. Contains all data-fetching + UI logic currently in `app/me/bids/page.tsx`.
- `app/me/listings/listings-panel.tsx` — server component. Contains all data-fetching + UI logic currently in `app/me/listings/page.tsx`.
- `app/me/tab-bar.tsx` — client component. Reads `useSearchParams().get('tab')` to detect active tab. Renders two `<Link>` tabs styled after `AdminTabBar` pattern. `aria-current="page"` on active tab.
- `app/me/page.tsx` — server component. Reads `searchParams.tab` (default: `'bids'`). Renders `<TabBar />` + conditionally renders `<BidsPanel />` or `<ListingsPanel />`.

**Modified files:**
- `app/me/bids/page.tsx` → becomes `redirect('/me?tab=bids')`.
- `app/me/listings/page.tsx` → becomes `redirect('/me?tab=listings')`.
- `components/nav.tsx` → update links from `/me/listings` and `/me/bids` to `/me?tab=listings` and `/me?tab=bids`.

**Page title:** "Activity" with subtitle showing the active tab label.

---

### Item 7 — Empty auction state CTA

Location: `components/hero-carousel.tsx`, inside the `!listings.length` return branch.

Add below the existing "Be the first to list something!" line:
```tsx
<p className="text-sm text-muted-foreground mt-3">
  Got something to sell?{' '}
  <Link href="/listings/new" className="text-primary underline underline-offset-2">
    Create a listing →
  </Link>
</p>
```

Styled as secondary — does not compete with the primary page message.

---

## Section C — Copy & Micro-polish

### Item 8 — Trust strip visibility

Location: `app/page.tsx:68`.

Remove `opacity-50` from the container div. The `<span>` elements already carry `text-muted-foreground` — this alone provides an intentional muted treatment without the blanket opacity wash that renders the trust signals nearly unreadable.

---

### Item 9 — "Pay in 24 hours" copy

Location: `components/landing-hero.tsx`.

Change: `'Win? Pay in 24 hours.'` → `'Win? Pay typically within 24 hours.'`

No other changes. Whether to build a cron-based payment reminder is noted as a follow-up (see Final Report section).

---

### Item 10 — Landing stats: Postgres SUM via RPC

**Migration:** `supabase/migrations/<timestamp>_get_total_sold_amount.sql`
```sql
CREATE OR REPLACE FUNCTION get_total_sold_amount()
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(current_bid), 0)
  FROM listings
  WHERE status = 'ended'
    AND winner_id IS NOT NULL;
$$;
```

**`app/page.tsx`:** Replace:
```ts
db.from('listings').select('current_bid').eq('status', 'ended').not('winner_id', 'is', null)
// + .reduce(...)
```
With:
```ts
db.rpc('get_total_sold_amount')
```

**Vitest setup:**
- `vitest.config.ts` + `vitest.setup.ts` at project root.
- Test file: `lib/__tests__/total-sold.test.ts`.
- Extracts a pure `sumBids(rows: { current_bid: number }[])` helper.
- Tests: fixture produces correct sum; empty array produces 0; matches RPC mock return value.

---

## Section D — Completeness / Edge Cases

### Item 11 — sitemap.xml and robots.txt

**`app/sitemap.ts`** — `MetadataRoute.Sitemap`
- Base URL: `process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bidlock.ph'`.
- Static routes: `/`, `/auth/login`, `/auth/signup`, `/listings/new`.
- Dynamic: all `live` listings + `ended` listings from the last 30 days. Each with `lastModified: listing.ends_at`.
- Uses Supabase server client (no auth needed — public data).

**`app/robots.ts`** — `MetadataRoute.Robots`
- `rules: { userAgent: '*', allow: '/' }`.
- `sitemap: '${base}/sitemap.xml'`.

Note: `NEXT_PUBLIC_SITE_URL` must be set as a Vercel env var before the sitemap is production-correct.

---

### Item 12 — /pay reachable from listing detail

Covered entirely by item 3. The "Pay Now" button added to the winner contact block links to `/listings/[id]/pay`. No separate work.

---

### Item 13 — Draft recovery on new listing form

Location: `app/listings/new/steps/details-step.tsx`.

**On mount:**
```ts
useEffect(() => {
  const raw = sessionStorage.getItem('bidlock:new-listing-draft')
  if (!raw) return
  try {
    const saved = JSON.parse(raw)
    reset({ ...defaultValues, ...saved })
  } catch { /* ignore corrupt draft */ }
}, [])
```

**On change (debounced 500ms):**
```ts
useEffect(() => {
  const timeout = setTimeout(() => {
    sessionStorage.setItem('bidlock:new-listing-draft', JSON.stringify({
      title: watchedTitle,
      description: watchedDescription,
      starting_bid: watchedBid,
      duration_days: watchedDuration,
    }))
  }, 500)
  return () => clearTimeout(timeout)
}, [watchedTitle, watchedDescription, watchedBid, watchedDuration])
```

**On successful submission** (`app/listings/new/page.tsx`):
```ts
sessionStorage.removeItem('bidlock:new-listing-draft')
```

Photo uploads are explicitly excluded. Only text fields are persisted.

---

## Final Report Template

When implementation is complete, the report covers:

- **Status per item** — ✅ done / ⚠️ done with caveat / ❌ skipped (with reason)
- **Files changed** — grouped by item
- **Commits** — in order
- **Test results** — typecheck, lint, Vitest pass/fail
- **Tangential issues** — spotted but not fixed
- **Follow-ups** — including payment reminder cron assessment (item 9)

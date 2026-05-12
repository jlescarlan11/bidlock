# Auctions Page — Design Spec

**Date:** 2026-05-13
**Status:** Approved

## Overview

Add a dedicated `/auctions` page so the homepage doesn't accumulate auction listings as the catalog grows. The homepage keeps a small teaser section; the full browsable grid lives at `/auctions`.

---

## /auctions Page

### Architecture

- `app/auctions/page.tsx` — server component; reads `searchParams`, queries Supabase, renders the full page
- `app/auctions/auction-controls.tsx` — `"use client"` component; search input + sort dropdown; wrapped in `<Suspense>` inside `page.tsx`

### URL params

`/auctions?q=keyword&sort=ending_soon&page=2`

| Param | Values | Default |
|---|---|---|
| `q` | any string | `""` (no filter) |
| `sort` | `ending_soon`, `newest`, `lowest_bid`, `highest_bid` | `ending_soon` |
| `page` | integer ≥ 1 | `1` |

### Data query

```
SELECT id, title, current_bid, ends_at, listing_photos, bids
FROM listings
WHERE status = 'live'
  AND title ILIKE '%{q}%'
ORDER BY {sort_column}
RANGE [{(page-1)*20}, {page*20-1}]
```

Sort column mapping:
- `ending_soon` → `ends_at ASC`
- `newest` → `created_at DESC`
- `lowest_bid` → `current_bid ASC`
- `highest_bid` → `current_bid DESC`

Also fetch total count for pagination.

### Layout

- **Page header:** "Live Auctions" h1 + result count subtitle (e.g. "42 items ending soon")
- **Controls row:** search input (left, flex-1) + sort dropdown (right); client component, debounced 300ms on search, both push to `router.push()` with updated params
- **Grid:** 5 columns on desktop (`grid-cols-5`), responsive to 2 on mobile (`grid-cols-2`); 20 listings per page; reuses existing `ListingCard` component unchanged
- **Pagination:** centered Prev / "Page X of Y" / Next row; Prev disabled on page 1, Next disabled on last page
- **Empty state:** inline message — "No auctions match your search." with a "Clear filters" link that resets to `/auctions`

### Width

`max-w-7xl mx-auto px-6` — matches the rest of the app.

---

## Homepage Changes

### Hero

`LandingHero` loses its `listings` prop and no longer renders `HeroCarousel`. Hero becomes marketing-only: tagline, stats, CTA buttons. `hero-carousel.tsx` is left in place but no longer rendered.

### "Live right now" teaser section

New section added between the trust strip and the existing "Before you bid" section.

- Fetches the **4** soonest-ending live listings (`ends_at ASC LIMIT 4`)
- Renders a 4-column grid of `ListingCard` components — no wrapper card, no border, no padding container; cards sit flush in the `max-w-7xl mx-auto px-6` section
- Section heading: "Live right now" (left) + "Browse all auctions →" link to `/auctions` (right)
- No wrapper card — heading and grid sit directly in the section container, consistent with the rest of the homepage

### Homepage data fetch

`app/page.tsx` stops fetching all live listings for the carousel. Instead fetches:
1. Top 4 live listings for the teaser (new, small query)
2. Stats (items sold, active bids, total sold) — unchanged

---

## Nav Update

`components/nav.tsx` — update "Auctions" `href` from `/#live-auctions` to `/auctions` in both the authenticated and unauthenticated variants.

---

## Files Summary

| File | Change |
|---|---|
| `app/auctions/page.tsx` | **New** — server component, full auctions grid |
| `app/auctions/auction-controls.tsx` | **New** — client component, search + sort |
| `app/page.tsx` | **Modified** — remove carousel data fetch, add teaser section |
| `components/landing-hero.tsx` | **Modified** — remove listings prop + HeroCarousel |
| `components/nav.tsx` | **Modified** — update Auctions href |
| `components/listing-card.tsx` | **Untouched** — reused as-is |
| `components/hero-carousel.tsx` | **Untouched** — no longer rendered, not deleted |
| All `/me/*`, `/admin/*`, `/listings/*` | **Untouched** |

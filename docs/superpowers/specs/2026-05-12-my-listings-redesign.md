# My Listings Page Redesign

**Date:** 2026-05-12
**File:** `app/me/listings/page.tsx`

## Problem

The current My Listings page is a flat chronological list in a `max-w-2xl` container. It mixes "needs action now" listings with "wrapped up last week" listings, uses plain outline badges with no color coding, has no thumbnails, and renders actions as small underlined links. The narrow container breaks from the `max-w-7xl` header width.

## Design Goals

- Surface seller tasks immediately — what needs doing before they have to think
- Match the My Bids page design language (same mental model on both sides of the marketplace)
- Consistent container width with the rest of the app (`max-w-7xl`)

## Layout

`max-w-7xl mx-auto p-4 pt-8` — matches header and My Bids page.

Sections stacked vertically with `space-y-8`. Section headers use the same pattern as My Bids: `text-xs font-semibold uppercase tracking-widest text-muted-foreground`.

Empty sections are hidden entirely (not shown as "0").

## Section Order (urgency-first)

1. **Pending Payment** — seller must pay listing fee; nothing happens until they do
2. **Rejected** — platform said no; seller must read feedback and act
3. **Under Review** — awareness only; platform is processing
4. **Live** — ongoing auctions; the bulk in an active account
5. **Ended** — closed auctions; useful history
6. **Cancelled** — terminal, no follow-up; collapsed by default

Section headers include the count: `Pending Payment · 2`.

### Cancelled collapse

Implemented with `<details><summary>Show cancelled ({n})</summary>...cards</details>`. No client component needed. Count is always visible in the summary text.

## Card Design

Each card is a flex row: `flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm`.

```
[ 52×52 thumb ] [ title + subtitle (flex-1) ] [ price + badge/CTA (shrink-0) ]
```

### Thumbnail

52×52 rounded (`rounded-[9px]`), sourced from `listing_photos` table (sorted by `display_order`, first photo). Fallback: initials computed from listing title (same `getInitials` helper as My Bids), displayed in a tinted placeholder square.

Placeholder tint matches urgency tier:
- Pending Payment: `bg-amber-50 text-amber-400`
- Rejected: `bg-red-50 text-red-300`
- Under Review: `bg-blue-50 text-blue-300`
- Live / Ended / Cancelled: `bg-muted text-muted-foreground`

### Title

`text-sm font-semibold truncate`

### Subtitle

Contextual per section:

| Section | Subtitle | Color |
|---|---|---|
| Pending Payment | "Listing fee due — pay to go live" | `text-amber-800` |
| Rejected | The `rejection_reason` text | `text-destructive` |
| Under Review | "Submitted — awaiting admin review" | `text-muted-foreground` |
| Live | "Ends in X" via `formatTimeRemaining(ends_at)` | `text-muted-foreground` |
| Ended (winner) | "Ended [Mon DD] · Sold for ₱X" | `text-muted-foreground` |
| Ended (no winner) | "Ended [Mon DD] · No bids" | `text-muted-foreground` |
| Cancelled | "Cancelled" | `text-muted-foreground` |

`formatTimeRemaining` is imported from `lib/utils/time.ts` (already exists).  
`formatEndedDate` (Mon DD format) is inlined — same pattern as My Bids page.

**No "due by" date on Pending Payment** — the `listings` table has no payment deadline field.

### Price

`text-sm font-bold` — the `current_bid` formatted with `formatPHP`.

### Status badge

Pill shape: `rounded-full border px-2 py-0.5 text-[10px] font-medium`

| Status | Classes |
|---|---|
| Pending Payment | `bg-amber-100 text-amber-700 border-amber-200` |
| Rejected | `bg-red-100 text-red-700 border-red-200` |
| Under Review | `bg-blue-100 text-blue-700 border-blue-200` |
| Live | `bg-green-100 text-green-700 border-green-200` |
| Ended | `bg-muted text-muted-foreground border-border` |
| Cancelled | `bg-muted text-muted-foreground border-border` |

### CTA

Only Pending Payment has an active CTA — a filled amber pill button: `bg-amber-500 text-white px-2.5 py-0.5 rounded-full text-[11px] font-semibold` linking to `/listings/{id}/pay`.

All other cards (Rejected, Live, Ended) are wrapped in a `<Link href="/listings/{id}">` making the entire card clickable, with `hover:bg-muted/40 transition-colors` on the card element. Under Review and Cancelled are not linked (no useful destination) — render as `<div>`, no hover style, no pointer cursor.

Pending Payment cards are also wrapped in a Link to the pay page so the whole card is clickable — the "Pay now" pill is a visual affordance only, not a separate `<a>`.

## Data

### Query changes

Add to the existing select:
- `winner_id` — to distinguish Ended (sold) vs Ended (no bids)
- `listing_photos(storage_path, display_order)` — for thumbnails

Full select:
```
id, title, current_bid, status, created_at, ends_at, rejection_reason, winner_id,
listing_photos(storage_path, display_order)
```

### Thumbnail resolution

Same pattern as My Bids: sort `listing_photos` by `display_order`, take first, call `supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl`.

### Grouping

Group listings client-side (in the RSC) using `Array.filter` into six buckets after resolving thumbnails. No SQL grouping needed.

## Component Structure

All code stays in `app/me/listings/page.tsx` — no new files, matching the My Bids pattern:

- Helper functions: `getInitials`, `formatEndedDate` (inlined — not shared to avoid coupling)
- `ListingCard` component (function in same file)
- `Section` component (function in same file, handles hidden-if-empty logic)
- `CancelledSection` component (function in same file, wraps `<details>`)
- Default export: `MyListingsPage` (RSC)

## Empty State

If the user has no listings at all (all six buckets empty), show:
```
<p className="text-muted-foreground">You haven't listed anything yet.</p>
```

## Reuse from My Bids

- `formatPHP` from `lib/utils/currency`
- `formatTimeRemaining` from `lib/utils/time`
- `getInitials` pattern (inlined copy, not imported — same decision as My Bids)
- Section header pattern: `text-xs font-semibold uppercase tracking-widest text-muted-foreground`
- Card shape: `rounded-xl border bg-white p-3 shadow-sm`
- Badge pill shape and color system

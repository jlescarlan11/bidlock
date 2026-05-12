# My Bids Page — UI/UX Redesign

**Date:** 2026-05-12  
**Route:** `/me/bids`  
**File:** `app/me/bids/page.tsx`

---

## Goal

Replace the minimal list with a scannable, information-rich bid tracker. Users should be able to open the page and immediately know: what am I bidding on, am I winning or losing each one, and what happened to past bids.

---

## Layout

- Container: `max-w-7xl mx-auto` — matches the site header width (consistent with the new listing and pay pages)
- Padding: `px-4 pt-8` (existing)
- Three vertical sections stacked: Active → Won → Lost
- No tabs, no summary strip — sections are always visible for scroll-scanning and Ctrl+F

### Section headers

Format: `ACTIVE · 4` — uppercase, small, muted label with inline count. Replaces the current `Active (4)` heading weight.

---

## Data layer

### Query change: deduplicate by listing

The current query returns one row per bid, so bidding on the same listing multiple times produces duplicate cards. Fix: after fetching, deduplicate in the server component by keeping only the latest bid per `listing.id`:

```ts
const seen = new Set<string>()
const deduped = (bids ?? []).filter((b: any) => {
  const id = b.listings?.id
  if (!id || seen.has(id)) return false
  seen.add(id)
  return true
})
```

Since bids are already ordered by `created_at DESC`, the first occurrence of each `listing.id` is the most recent bid. This is simple and correct at typical user scale. For large datasets, prefer a Postgres `DISTINCT ON (listing_id)` RPC instead.

### Additional fields

Extend the listings join to include `image_url` and a bid count for the "No other bids" state:

```ts
listings (id, title, status, current_bid, winner_id, ends_at, image_url)
```

For the bid count, add a second query or a subquery count of other bidders per listing:

```ts
// After fetching deduped bids, for each active listing:
// count of bids where listing_id = X and bidder_id != user.id
```

In practice, add `other_bid_count` as a computed column or fetch it via a separate `.select('listing_id, count()').neq('bidder_id', user.id)` aggregation, then join in the server component. The "No other bids" state is true when `other_bid_count === 0`.

---

## Bid card

Each bid is rendered as a full-width card that links to the listing detail page (`/listings/[id]`). The entire card is the tap target.

### Layout (horizontal flex)

```
[ Thumbnail ] [ Title + Subtitle ]  [ Amount + Badge ]
```

- **Thumbnail** — 56×56px, `rounded-[9px]`, `object-cover`
  - If `image_url` is present: render `<Image>` from Supabase storage
  - Fallback: gray tile with the listing title's initials (first two words, first letter each), e.g. "Gray Jacket" → "GJ"
- **Title** — `text-sm font-semibold`, truncated with `truncate`
- **Subtitle** — `text-xs text-muted-foreground` — content varies by section (see below)
- **Amount** — `text-sm font-bold` — the user's bid (`bid.amount`)
- **Badge** — small pill, right-aligned under the amount

---

## Section-specific content

### Active

Subtitle: `Ends in {relative time}` derived from `listing.ends_at`  
Badge states (determined by comparing `bid.amount` to `listing.current_bid`):

| Condition | Label | Style |
|---|---|---|
| `other_bid_count === 0` | No other bids | Gray pill (`bg-muted text-muted-foreground`) |
| `other_bid_count > 0` and `bid.amount >= listing.current_bid` | Winning | Green pill (`bg-green-100 text-green-700`) |
| `other_bid_count > 0` and `bid.amount < listing.current_bid` | Outbid | Amber pill (`bg-amber-100 text-amber-700`) |

Priority: check "No other bids" first. "Winning" and "Outbid" only apply when there is at least one competing bid.

### Won

Subtitle: `Ended {date}` (e.g. "Ended May 10")  
Badge: green pill — `Won`

### Lost

Subtitle: `Ended {date} · Sold for {formatPHP(listing.current_bid)}`  
Badge: gray pill — `Lost`

---

## Empty states

When a section has zero items, render:

```
No {section} auctions yet.
```

e.g. "No won auctions yet." — plain `text-sm text-muted-foreground`, no border, no icon. Replaces the current "None." placeholder.

---

## What does NOT change

- Server component — page remains `async`, no client component needed
- Auth guard — `if (!user) redirect('/auth/login')` stays
- Filter logic — Active/Won/Lost categorization by `listing.status` and `listing.winner_id` is unchanged
- Route — still `/me/bids`
- No real-time subscription — this is a history page; live updates are on the listing detail page

---

## Out of scope

- Bid history per listing (expandable rows) — belongs on the listing detail page
- Tab navigation between sections
- Summary stat tiles
- Pagination — not needed at typical user scale

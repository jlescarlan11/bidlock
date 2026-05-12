# Homepage Redesign + Global Rebrand

**Date:** 2026-05-13  
**Status:** Approved — ready for implementation planning

---

## Overview

Full redesign of the BidLock homepage (`app/page.tsx`, `components/landing-hero.tsx`) from a centered single-column violet layout to a two-column editorial layout with a warm cream base. Accompanied by a global rebrand of color tokens and typography applied sitewide.

---

## 1. Global Design Tokens (sitewide)

### Colors

| Token | Old | New | Usage |
|---|---|---|---|
| `--background` | `#FFFFFF` | `#FDFBF6` | Warm cream base |
| `--primary` | violet-600 | `#1F1F1F` (gray-900) | Primary action buttons, active chips |
| `--primary-foreground` | near-white | `#FAFAFA` | Text on primary buttons |
| Orange accent | — | `orange-500` (#F97316) | Live dots, badges, scribble, energy CTAs |

The violet color family is retired as a brand primary. It survives only as a decorative card tint (`violet-50`/`violet-100`) in the "Before you bid" section.

### Typography

Two fonts loaded via `next/font/google` in `app/layout.tsx`:

- **Bricolage Grotesque** — display/headline font. Weights: 400, 500, 700, 800. Optical size: 12–96. Letter spacing: `-0.03em`. Applied via a `font-display` CSS utility class.
- **Inter** — body font. Weights: 400, 500, 600, 700. Applied as the default `font-sans`.

Both font CSS variables are set on `<html>` via Next.js font variable injection.

### Animations (add to `globals.css`)

```css
.ticker { animation: pulse-dot 1.4s ease-in-out infinite; }
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}

.scribble { stroke-dasharray: 200; stroke-dashoffset: 200; animation: draw 1.2s ease-out 0.4s forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }

.marquee { animation: scroll 30s linear infinite; }
@keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
```

`card-tilt` hover effect via Tailwind `transition-transform` with `hover:-translate-y-1`.

---

## 2. Schema Migration

**One column added to `listings`:**

```sql
ALTER TABLE listings ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;
```

Increment strategy: called from a server action on the listing detail page load (client component `useEffect` → server action). On the homepage, the value is read-only for display.

---

## 3. Homepage Layout

### 3a. Hero (two-column, `lg:grid-cols-12`)

**Left column (`lg:col-span-7`):**

- Live badge pill: `● X auctions live right now` (orange-500 dot, orange-100 bg, orange-900 text). Count is real: `COUNT(*) WHERE status = 'live'`.
- H1 in Bricolage Grotesque, `text-6xl lg:text-8xl`, `leading-[0.95]`:
  ```
  Going once.
  Going twice.
  Yours.
  ```
  "Yours." has an animated SVG scribble underline in `orange-500` drawn via CSS `stroke-dashoffset` animation.
- Subheading: `text-lg text-gray-700`. "Score steals on phones, watches, cameras, sneakers, and more. Starting bids from **₱1**. Pay via GCash when you win."
- CTAs:
  - Primary: `bg-gray-900 text-white` rounded-full — "Browse live auctions →"
  - Secondary: underlined link with `decoration-orange-500` — "How does it work?" → `/how` (see Section 6)
- Stat strip (3 numbers, separated by small dots):
  - **Live now**: `COUNT(*) WHERE status = 'live'`
  - **Avg. bids/item**: Two parallel Supabase COUNT queries, integer division, computed in-page:
    ```ts
    const [{ count: totalBids }, { count: totalListings }] = await Promise.all([
      db.from('bids').select('id', { count: 'exact', head: true }),
      db.from('listings').select('id', { count: 'exact', head: true })
        .in('status', ['live', 'ended']),
    ])
    const avgBidsPerItem = totalListings > 0 ? Math.round(totalBids / totalListings) : 0
    ```
    `totalBids` counts all rows in the `bids` table (every bid belongs to a listing). `totalListings` counts listings where `status IN ('live', 'ended')` — "ended" means the auction closed regardless of whether there was a winner. Falls back to `0` when no listings exist.
  - **New today**: `COUNT(*) WHERE status = 'live' AND created_at > NOW() - INTERVAL '24h'`, displayed as "X today"

**Right column (`lg:col-span-5`):**

Featured auction card — the single live listing ending soonest. Shown as a white card with `border-2 border-gray-900 shadow-[8px_8px_0_0_rgba(17,24,39,1)]` (neo-brutalist shadow).

Card contents:
- "🔥 HOT RIGHT NOW" sticker badge (orange-500, rotated -8deg)
- Listing photo (or gradient placeholder if none)
- "ENDING SOON" badge with pulsing dot if `ends_at < NOW() + 1hr`, else "LIVE"
- Listing title + `@seller_username`
- Current bid (Bricolage Grotesque, large)
- `X bids · Y 👀` from `bid_count` + `view_count`
- Countdown timer (red if < 1hr remaining) — reuse the existing countdown display from `AuctionControls` or extract the timer logic into a shared `CountdownTimer` client component
- "Bid ₱X →" button (orange-500) — links to the listing detail page

If no live listings exist, the right column shows a placeholder card with copy "No live auctions right now. Check back soon."

### 3b. Trust Marquee

White background, `border-y border-gray-900/10`. Two identical rows of trust signals (second marked `aria-hidden`) animated with `marquee` class for infinite scroll.

Signals: 🔒 Secure GCash payments · 🇵🇭 PH-verified sellers · 🛡 Buyer protection on every win · ⚡ New auctions every hour · 💸 Lose? No charge. Ever.

### 3c. Live Right Now

Section header:
- Eyebrow: `LIVE RIGHT NOW` in `text-xs font-extrabold tracking-[0.18em] text-orange-600 uppercase`
- H2: "What's on the block" in Bricolage Grotesque `text-4xl font-extrabold`
- "See all X →" right-aligned link (hidden on mobile)

**State filter chips** (replace category tabs — these are links, no homepage filtering):

| Label | Route |
|---|---|
| All | `/auctions` |
| 🔥 Ending soon | `/auctions?sort=ending_soon` |
| ✨ Just listed | `/auctions?sort=just_listed` |
| 💸 Under ₱500 | `/auctions?sort=under_500` |

Active chip (`All` by default on homepage): `bg-gray-900 text-white`. Others: `bg-white border border-gray-200 text-gray-700`.

**Listing cards** (4-card grid, `grid-cols-2 lg:grid-cols-4`):

Each card is a new `HomepageListingCard` component (separate from the existing `ListingCard` used on `/auctions`):

- Rounded-2xl, white bg, gray-200 border, `hover:border-gray-900`
- `card-tilt` hover: `translateY(-4px) rotate(-0.5deg)`
- Image area: listing photo OR gradient placeholder (cycling through `violet-100→violet-50`, `orange-100→amber-50`, `emerald-100→teal-50`, `pink-100→rose-50`)
- LIVE badge (orange-500) or ENDING SOON badge (red-500) with pulsing dot
- `view_count 👀` chip bottom-left of image (white/90 backdrop-blur)
- Card body: title (truncated), `X bids · @seller_handle`, `current_bid` (Bricolage Grotesque), time remaining (red if < 1hr)
- No strikethrough price. No retail price. No watching vs views distinction — just show `view_count`.

Data query for the 4 cards: `SELECT ... FROM listings WHERE status = 'live' ORDER BY ends_at ASC LIMIT 4`, joined to `profiles` for `username`, joined to `listing_photos` for first photo.

Mobile: "See all X auctions →" link below grid.

### 3d. Before You Bid

Centered eyebrow + H2 + subheading. 3-card grid (`md:grid-cols-3`):

| Card | Background | Copy |
|---|---|---|
| 🎯 | `bg-violet-50 border-violet-100` | "Bid only what you'd happily pay." / "Winning bid + GCash transfer. That's the whole math." |
| 😌 | `bg-orange-50 border-orange-100` | "Lose? No charge." / "We don't hold deposits. We don't take card details. Walk away free." |
| 📦 | `bg-emerald-50 border-emerald-100` | "Win? Pay within 24 hours." / "Quick GCash transfer. Seller ships. Item arrives. Done." |

All cards: `rounded-3xl p-7 border-2 hover:border-*-300 transition-colors`. Titles in Bricolage Grotesque `text-xl font-extrabold`.

### 3e. Seller CTA

Dark card inside `max-w-7xl` container. `bg-gray-900 text-white rounded-3xl p-8 lg:p-12`. Dot-grid decorative overlay (`radial-gradient(#fff 1px, transparent 1px)` at 6% opacity).

- Eyebrow: "FOR SELLERS" in orange-400
- H3: "Got stuff to sell? List in 60 seconds." (Bricolage Grotesque, `text-3xl lg:text-4xl`)
- Body: "Snap a photo, set a starting price, pick an end time. We handle the rest. No listing fees."
- CTA: `bg-orange-500 hover:bg-orange-600` rounded-full — "Start selling →" → `/listings/new`

### 3f. Footer

`border-t border-gray-900/10`. Two-column flex row:
- Left: BidLock wordmark (Bricolage Grotesque) + "Real items. Real prices. PH-made."
- Right: Terms / Privacy / Help / Contact links (`text-xs text-gray-600`)

---

## 4. `/how` Page (`app/how/page.tsx`)

Static server component, no data fetching. Same `#FDFBF6` background and brand tokens as the rest of the app.

### Layout

**Hero:**
- Eyebrow: "HOW IT WORKS" (orange-600)
- H1: "Winning made simple." (Bricolage Grotesque, `text-5xl lg:text-6xl`)
- Subheading: "No confusing rules. No hidden fees. Just bid, win, pay, done."

**Two-column step sections** (`md:grid-cols-2 gap-16`), one for buyers, one for sellers:

**For buyers** — heading "I want to win something" (gray-900):

| Step | Icon | Title | Body |
|---|---|---|---|
| 1 | 🔍 | Browse live auctions | Scroll the live listings. Filter by ending soon, just listed, or price. |
| 2 | 💬 | Place a bid | Enter any amount above the current bid. No deposits, no card holds. |
| 3 | 🏆 | Win when time runs out | Highest bidder when the clock hits zero wins. That's it. |
| 4 | 💸 | Pay via GCash | Send the winning amount via GCash within 24 hours. |
| 5 | 📦 | Receive your item | Seller ships to you. You get what you won. |

**For sellers** — heading "I want to sell something":

| Step | Icon | Title | Body |
|---|---|---|---|
| 1 | 📸 | Snap a photo | Take a clear photo of your item. Good photos get more bids. |
| 2 | ✍️ | Set your starting bid | Pick a price you'd happily accept even if only one person bids. |
| 3 | ⏱ | Choose an end time | Set how long the auction runs — 1 hour, 6 hours, 24 hours, or more. |
| 4 | 📣 | Watch the bids roll in | Buyers compete. You watch. No action needed from you. |
| 5 | ✅ | Collect payment | Winner sends GCash. You ship. Done. |

**CTA strip at bottom:**
- Left card (`bg-gray-900 text-white`): "Ready to bid?" → "Browse live auctions" button → `/auctions`
- Right card (`bg-orange-500 text-white`): "Ready to sell?" → "List an item" button → `/listings/new`

### Step component

Each step rendered as: step number chip (small, orange-100 text-orange-700) + icon (large, `text-4xl`) + bold title + body text. No borders — spacing does the separation.

---

## 5. Component Changes

| File | Change |
|---|---|
| `app/layout.tsx` | Add Bricolage Grotesque + Inter via `next/font/google`; inject CSS variables; apply `font-sans` and `font-display` |
| `app/globals.css` | Update `--background`, `--primary`, `--primary-foreground`; add ticker/scribble/marquee animations; add `.display` and `.font-display` utility |
| `tailwind.config.ts` | Register `fontFamily.display` and `fontFamily.sans` using CSS variables from Next.js font injection |
| `components/landing-hero.tsx` | Full rewrite to two-column layout |
| `app/page.tsx` | New data queries (featured card, avg bids, new today, view_count in teasers), new sections |
| `components/homepage-listing-card.tsx` | New component — homepage-specific card style (separate from `/auctions` ListingCard) |
| `app/how/page.tsx` | New static page — "How it works" for buyers and sellers |

---

## 6. Out of Scope

- The `/auctions` page sort query params (`?sort=ending_soon` etc.) — chips just link there, the auctions page handles sorting in a follow-up.
- Category taxonomy on listings — no `category` column added.
- Real-time "watching" — `view_count` is cumulative page views, not concurrent viewers.
- Nav changes — current nav stays as-is; nav redesign is a separate task if needed.
- `/how` page content localization or CMS — copy is hardcoded for now.

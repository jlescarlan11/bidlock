# BidLock Landing Page — Design Spec

**Date:** 2026-05-11  
**Status:** Approved  
**Scope:** Modify `app/page.tsx` — add hero, trust strip, and reassurance section above the existing live auctions grid.

---

## Overview

The homepage absorbs the landing page (Option B from brainstorming). There is no separate marketing route. Visitors land on a single scrollable page: hero → trust strip → reassurance → live auctions grid.

This keeps the conversion path direct: the primary CTA smooth-scrolls to the auctions grid on the same page. No route change, no loading state, no commitment to a separate `/auctions` route.

**Known migration point:** If a separate `/auctions` route is introduced later, the CTA `<a href="#live-auctions">` must flip to a `<Link href="/auctions">` router push. The smooth-scroll is a deliberate early-stage choice, not an oversight.

---

## Page Structure

```
<Nav />                    ← existing component, unchanged
<HeroSection />            ← new
<TrustStrip />             ← new
<ReassuranceSection />     ← new
<section id="live-auctions">
  <h2>Live Auctions</h2>
  <ListingCard /> grid     ← existing, unchanged
</section>
```

All new sections are added inside `app/page.tsx`. No new route files.

---

## Color System

| Role | Color | Tailwind approx |
|---|---|---|
| Brand / primary | Electric violet | `violet-600` (#7c3aed) |
| Urgency accent | Coral / orange | `orange-600` (#ea580c) |
| Hero background tint | Soft violet | `violet-50` (#faf5ff) |
| Trust strip background | Violet tint | `violet-100` (#ede9fe) |
| Cards | White | `white` |
| Body text | Near-black | `stone-950` (#0f0e17) |
| Secondary text | Gray | `gray-500` |

Violet carries: headline accent ("Yours."), primary CTA, eyebrow label, card borders, price in listings.  
Coral carries: countdown timers, current bid price in the preview card, live badge — urgency moments only.

---

## Section 1: Hero

**Layout:** Two-column split. Text on the left, non-interactive auction preview card on the right. On mobile, card moves below text (stacked).

### Left — text

| Element | Content |
|---|---|
| Eyebrow | `LIVE AUCTIONS · PH` — violet, uppercase, tight letter-spacing |
| Headline | `Going once. Going twice.` (black) + `Yours.` (violet) |
| Subtext | `Win real items at real prices. Pay instantly via GCash.` |
| Primary CTA | `🔨 Place a Bid` — violet pill button, `<a href="#live-auctions">`, smooth scroll |
| Secondary CTA | `Got something to sell? List it here →` — small text link below button, routes to `/listings/new` |

The primary CTA is the only interactive element in the hero with an outbound action. One decision, one path.

### Right — auction preview card

A static, non-interactive card that proves auctions are real and happening. It is not a second CTA.

| Element | Notes |
|---|---|
| Timer | `⏱ 04:32 left` in coral, pulsing dot |
| Item image | Placeholder or first photo of a featured listing |
| Item title | e.g. "Vintage Seiko Watch" |
| Bid count | `14 bids so far` in muted gray |
| Current bid | `₱2,450` in coral (urgency signal) |
| Label | `Current bid` in muted gray |
| Button | **None.** No "Bid Now" button — single CTA on left is unambiguous |

The preview card can start as hardcoded static content. A future iteration could populate it from the highest-activity live listing, but this is not in scope here.

---

## Section 2: Trust Strip

A single horizontal band of four promises. No metrics, no counts — all claims that remain true without an analytics dependency.

```
🔒 Secure GCash payments  ·  🇵🇭 PH-verified sellers  ·  🛡️ Buyer protection  ·  ⚡ New auctions daily
```

Background: violet-100. Text: violet-800. No links. Full-width, centered items, wraps on mobile.

If/when BidLock has a genuinely impressive stat (e.g., 10,000+ bids), one signal can be swapped out. Until then, all four are promises.

---

## Section 3: Reassurance — "Before you bid"

Section eyebrow: `BEFORE YOU BID` (uppercase, muted gray, centered). Three white cards in a row (stacks to single column on mobile). Each card: emoji → bold title → body copy.

| # | Emoji | Title | Body |
|---|---|---|---|
| 1 | 🎯 | Bid only what you'd happily pay | No surprise fees. Winning bid + GCash transfer. That's it. |
| 2 | 😌 | Lose? No charge. | We only collect when you win. No deposits, no holds, no stress. |
| 3 | 📦 | Win? Pay in 24 hours. | Quick GCash transfer, seller ships, item arrives. Simple as that. |

Framing rationale: "Before you bid" earns the scroll by answering the first-time visitor's real question — not "how does an auction work" (they know), but "what's the catch with *this* platform." These three cards remove the three most common barriers to placing a first bid.

Card borders: violet-100. No icons other than the emoji. No links.

---

## Section 4: Live Auctions Grid

No changes to the existing grid or `<ListingCard />` component. The only addition is `id="live-auctions"` on the wrapping section so the hero CTA scroll anchor resolves.

Section heading: `Live Auctions` + a coral `LIVE` badge (pill, no animation needed).

---

## Responsive behavior

| Breakpoint | Hero | Reassurance cards | Auctions grid |
|---|---|---|---|
| Mobile (`< sm`) | Stacked (text above card) | Single column | 2 columns (existing) |
| Tablet (`sm`) | Stacked or split | 3 columns | 3 columns |
| Desktop (`md+`) | Split | 3 columns | 3 columns |

---

## What is not in scope

- "How it works" steps (rejected — reassurance cards do this job better)
- Stats / social proof metrics (rejected — early-stage risk)
- A separate `/landing` or `/welcome` route
- Any changes to Nav, ListingCard, or the auctions data fetch
- Populating the preview card from a live database query (future iteration)

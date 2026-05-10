# BidLock — Design Spec
_Date: 2026-05-10_

## Overview

BidLock is a production-ready auction/bidding web app targeting the Philippine market. Auctioneers pay a listing fee via GCash (manually verified by an admin) to publish auctions. Bidders compete in real time. The platform handles the listing lifecycle, bidding, winner reveal, and post-auction coordination — but deliberately keeps payments and delivery off-platform.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript, Server Components by default) |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Supabase (Postgres, Auth, Storage, Realtime, RLS) |
| Auth | Email/password + Google OAuth via Supabase Auth |
| Forms | react-hook-form + zod |
| State | Server Components + Server Actions; minimal client state |
| Package manager | pnpm |
| Deployment | Vercel + Supabase cloud |

**Folder structure:** `/app`, `/components`, `/lib`, `/lib/supabase`, `/lib/validators`, `/lib/actions`, `/types`

**Two Supabase clients — never mix them:**
- `lib/supabase/server.ts` — Server Components, Server Actions, Route Handlers (reads session cookie)
- `lib/supabase/client.ts` — Client Components only (browser, for Realtime subscriptions)

**Env validation:** zod schema in `lib/env.ts`, validated at startup. Path alias `@/*`.

---

## Architecture

```
Browser (Client)
  React Client Components — Realtime bid/chat updates, countdown timers, confirm dialogs
  Supabase JS Client (lib/supabase/client.ts) — Realtime subscriptions only
        ↕ HTTP / WebSocket
Next.js 15 — Vercel Edge + Node
  Server Components — data fetching, HTML rendering (default)
  Server Actions — placeBid, createListing, submitProof, etc.
  Middleware — session refresh, route guards (/admin, /me, /listings/new)
  Route Handler — /api/cron/finalize-auctions (Vercel Cron)
        ↕ Supabase SDK (server-side)
Supabase (Cloud)
  Postgres — 9 tables + RLS + place_bid() RPC + finalize_auctions()
  Auth — email/password + Google OAuth, session cookies
  Storage — listing-photos (public), payment-proofs (private)
  Realtime — bids channel (detail page) + messages channel (chat)
```

**Invariant:** All writes go through Server Actions. RLS is a safety net — Server Actions validate first. The `place_bid()` Postgres function runs in a single transaction with `SELECT … FOR UPDATE` to prevent concurrent bid races.

---

## Roles

A user has one auth account with two capabilities: **auctioneer** (creates listings) and **bidder** (places bids). No role toggle — capability is implied by action. A separate `is_admin` boolean on the profile gates `/admin`.

---

## Data Model

### profiles
```
id            uuid PK (references auth.users)
display_name  text
phone_number  text (PH format 09XXXXXXXXX)
gcash_name    text
is_admin      boolean default false
strike_count  int default 0
banned_until  timestamptz nullable
permabanned   boolean default false
created_at    timestamptz
```
Profile must be complete (phone + gcash_name) before user can list or bid.

### listings
```
id                  uuid PK
auctioneer_id       uuid FK profiles
title               text (5–100)
description         text (20–2000)
starting_bid        numeric (min ₱1)
current_bid         numeric (default = starting_bid)
current_bidder_id   uuid FK profiles nullable
duration_days       int enum(1,3,7)
status              enum(pending_payment, awaiting_review, rejected, live, ended, cancelled)
rejection_reason    text nullable
payment_proof_url   text nullable (Supabase Storage path)
payment_reference   text nullable (GCash reference number)
listing_fee         numeric (snapshotted from settings at creation time)
starts_at           timestamptz nullable (set on admin approval)
ends_at             timestamptz nullable (set on admin approval; extended by anti-snipe)
winner_id           uuid FK profiles nullable
created_at          timestamptz
```

### listing_photos
```
id            uuid PK
listing_id    uuid FK listings
storage_path  text
display_order int (0–4)
```
Max 5 per listing, min 1.

### bids
```
id          uuid PK
listing_id  uuid FK listings
bidder_id   uuid FK profiles
amount      numeric
created_at  timestamptz
```

### ratings
```
id          uuid PK
listing_id  uuid FK listings (unique with rater_id)
rater_id    uuid FK profiles
ratee_id    uuid FK profiles
verdict     enum(up, down)
comment     text nullable (max 500)
```
Only creatable after listing.status = 'ended', only between auctioneer ↔ winner.

### disputes
```
id                uuid PK
listing_id        uuid FK listings
reporter_id       uuid FK profiles
reported_user_id  uuid FK profiles
reason            text (20–1000)
status            enum(open, dismissed, upheld)
admin_note        text nullable
created_at        timestamptz
resolved_at       timestamptz nullable
```
When admin marks `upheld`: increment `strike_count`. strikes ≥ 3 → `banned_until = now() + 7 days`. strikes ≥ 5 → `permabanned = true`.

### messages
```
id            uuid PK
listing_id    uuid FK listings
sender_id     uuid FK profiles
recipient_id  uuid FK profiles
body          text (1–1000)
created_at    timestamptz
read_at       timestamptz nullable
```
Available only between auctioneer and winner, after listing ends with a winner.

### notifications
```
id          uuid PK
user_id     uuid FK profiles
listing_id  uuid FK listings nullable
type        text (e.g. auction_ended)
read_at     timestamptz nullable
created_at  timestamptz
```
Spec references "in-app notification row" without defining the table. This minimal schema satisfies that requirement.

### settings (single row, id = 1)
```
id            int (always 1)
listing_fee   numeric default 50
gcash_qr_url  text
gcash_number  text
gcash_name    text
```

---

## Storage Buckets

| Bucket | Access |
|---|---|
| `listing-photos` | Public read |
| `payment-proofs` | Private — owner + admins only |

---

## RLS Policies

- **profiles:** read own + `display_name` of others; update own.
- **listings:** all read `live`/`ended`; auctioneer reads own at any status; admin reads all. Insert by authenticated non-banned users. Update by owner while `pending_payment`/`awaiting_review` (limited fields); admin updates status fields.
- **bids:** insert by authenticated non-banned non-owner; read by participants + admins; `live`/`ended` listings' bids readable by all.
- **ratings:** read all; insert only when conditions met (validated server-side too).
- **disputes:** insert by authenticated; read own + admin.
- **messages:** read/insert by sender or recipient only.
- **settings:** read all authenticated; update admin only.

Always validate again in Server Actions — do not rely on RLS alone.

---

## Listing Lifecycle

### Status machine
```
pending_payment → awaiting_review → live → ended
                                  ↘ rejected (admin rejects with reason)
pending_payment or awaiting_review → cancelled (auctioneer withdraws)
```

### Steps
1. **Create listing** — Server Action: form (title, description, starting_bid, duration, photos). Photos to `listing-photos/{listing_id}/{order}.jpg`. Status = `pending_payment`. `listing_fee` snapshotted from settings. Redirect to payment page.
2. **Submit payment proof** — upload screenshot to `payment-proofs/{user_id}/{listing_id}.jpg`, enter GCash reference. Status → `awaiting_review`.
3. **Admin review** — approve: status `live`, `starts_at = now()`, `ends_at = now() + duration_days`. Reject: status `rejected` + reason. Publicly visible only when `live` or `ended`.
4. **Bidding** — Server Action `placeBid(listingId, amount)` calls `place_bid(listing_id, bidder_id, amount)` RPC in a single transaction (`SELECT … FOR UPDATE`). Updates `current_bid`, `current_bidder_id`. Anti-snipe: if `ends_at − now() < 2 min`, extend `ends_at` by 2 minutes.
5. **Finalization** — Vercel Cron hits `/api/cron/finalize-auctions`. Calls `finalize_auctions()` Postgres function: sets `status = 'ended'`, `winner_id = current_bidder_id` (null if no bids), inserts notification rows.
6. **Post-auction** — listing page shows contact card (phone + GCash name) and chat panel to auctioneer ↔ winner. Ratings and disputes unlock.

---

## Realtime

- **Bids channel:** subscribe filtered by `listing_id` on detail page → re-render current bid + history.
- **Messages channel:** subscribe filtered by `listing_id` for post-auction chat.

---

## Pages

| Route | Description |
|---|---|
| `/` | Live auction feed, sorted by `ends_at` asc. Cards: photo, title, current bid, countdown, bid count. |
| `/listings/[id]` | Detail: gallery, description, current bid, bid history (last 10), countdown, bid form. After end: winner reveal, contact card, chat, rating form. |
| `/listings/new` | Create wizard: details → photos → review (3 steps). |
| `/listings/[id]/pay` | GCash QR + proof upload. |
| `/me/listings` | My listings, all statuses. |
| `/me/bids` | Listings I've bid on: won / lost / active. |
| `/me/profile` | Edit display_name, phone, gcash_name. |
| `/auth/login` `/auth/signup` `/auth/callback` | Auth pages + OAuth callback. |
| `/admin` | Dashboard counts. |
| `/admin/listings` | awaiting_review queue. |
| `/admin/disputes` | Open dispute queue. |
| `/admin/users` | Search users, view strikes, manual ban/unban. |
| `/admin/settings` | Edit listing_fee, GCash details, upload QR image. |

---

## Auth Flow

- After signup or first OAuth login: redirect to `/me/profile` if profile incomplete.
- Middleware gates: `/admin/*` requires `is_admin`; `/me/*` and `/listings/new` require auth + complete profile + not banned.
- Banned users can view and message but cannot list or bid.

---

## Validation (zod schemas in `lib/validators/`)

| Field | Rule |
|---|---|
| phone_number | `/^09\d{9}$/` |
| gcash_name | 2–60 chars |
| title | 5–100 chars |
| description | 20–2000 chars |
| starting_bid | positive numeric, max ₱1,000,000 |
| duration_days | enum [1, 3, 7] |
| photos | 1–5 files, each ≤ 5 MB, jpg/png/webp |
| bid amount | ≥ current_bid + max(current_bid × 0.05, ₱10) |

---

## Error Handling

- Server Actions return `{ error: string } | { data: T }` — never throw to the client.
- `place_bid()` raises typed Postgres exceptions (e.g. `bid_too_low`, `auction_ended`) mapped to user-facing messages in the Server Action.
- All action results (success + error) surfaced via `sonner` toasts.
- Form errors shown inline via react-hook-form.
- Banned or incomplete-profile users are redirected by middleware, not shown 403s.

---

## UI/UX Conventions

- Mobile-first. Most users are on phones.
- Peso formatting: `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })`.
- Time remaining: `2d 4h 12m` style; under 1 hour → `mm:ss` ticking.
- Empty states for every list.
- Loading skeletons, not spinners.
- Confirm dialog before placing a bid showing the exact amount.
- Disclaimers:
  - On `/listings/new`: _"Listing fees are non-refundable once your auction goes live."_
  - On `/listings/[id]` after end: _"Coordinate delivery and final payment directly. We do not handle either. Report violations via the dispute form."_

---

## What NOT to build (MVP scope)

- No automated payment integration — GCash is fully manual + admin-verified.
- No automated payout — delivery and final payment are off-platform.
- No email notifications — in-app only.
- No mobile app — web only, mobile-responsive.
- No bidding by auctioneer on their own listing.

---

## Phased Delivery Plan

### Phase 1 — Foundation (deliverables 1–3)
Deploy gate: users can sign up, log in with Google, and complete their profile.

1. Project scaffold: Next.js 15, pnpm, Tailwind, shadcn/ui, path aliases, env validation
2. SQL migration: all 9 tables, enums, indexes, RLS policies, `place_bid()` + `finalize_auctions()` Postgres functions, storage buckets
3. Auth pages (login, signup, OAuth callback) + middleware + profile completion gate

### Phase 2 — Core Auction Loop (deliverables 4–8)
Deploy gate: full auction loop works end-to-end. Usable product.

4. Listing creation flow: wizard (3 steps: details → photos → review) + photo upload to Storage + payment page (GCash QR display + proof upload + reference number) → `awaiting_review`
5. Admin review queue — approve (→ `live`, sets `starts_at`/`ends_at`) / reject with reason
6. Public feed + listing detail page (read-only: gallery, bid history, countdown)
7. Bidding: Server Action + `place_bid()` RPC + Realtime bid updates + anti-snipe
8. Auction finalization cron + winner reveal + contact card

### Phase 3 — Social & Trust Layer (deliverables 9–12)
Deploy gate: fully complete MVP with trust and moderation.

9. Post-auction chat (Realtime, auctioneer ↔ winner only)
10. Ratings (up/down + comment, both sides)
11. Disputes + strike system + ban enforcement update in middleware
12. Admin tools: user management, dispute queue, settings page

---

## After Each Deliverable

Write a `STEP_N.md` summarising what was built, schema changes, and decisions made. Stop and ask before deviating from the spec.

# Build a Bidding/Auction Web App (PH market, GCash-based listing fees)

You are building a production-ready MVP. Read the entire spec before writing code. Follow the stack and conventions exactly. Do not invent features outside this spec.

## Stack
- **Framework**: Next.js 15 (App Router, TypeScript, Server Components by default)
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Postgres, Auth, Storage, Realtime, RLS)
- **Auth**: Email/password + Google OAuth via Supabase Auth
- **Forms**: react-hook-form + zod
- **State**: Server Components + Server Actions; minimal client state
- **Deployment target**: Vercel + Supabase cloud

## Project Setup
- Use `pnpm`
- Folder structure: `/app`, `/components`, `/lib`, `/lib/supabase`, `/lib/validators`, `/lib/actions`, `/types`
- Two Supabase clients: `lib/supabase/server.ts` (Server Components, Route Handlers, Server Actions) and `lib/supabase/client.ts` (Client Components only)
- Validated env via zod in `lib/env.ts`
- Path alias `@/*`

## Roles
A user has one auth account but two capabilities: they can be both a **bidder** and an **auctioneer**. No role toggle at signup. Capability is implied by action (listing an item = acting as auctioneer; bidding = acting as bidder).

A separate `is_admin` boolean on the profile gates the `/admin` route.

## Core Domain

### Profiles
- `id` (uuid, references `auth.users`)
- `display_name` (text)
- `phone_number` (text, PH format `09XXXXXXXXX`, validated)
- `gcash_name` (text, the name registered on their GCash)
- `is_admin` (boolean, default false)
- `strike_count` (int, default 0)
- `banned_until` (timestamptz, nullable)
- `permabanned` (boolean, default false)
- `created_at`

Enforce: profile must be complete (phone + gcash_name) before user can list or bid.

### Listings (Auctions)
- `id` (uuid)
- `auctioneer_id` (uuid, FK profiles)
- `title` (text, 5–100 chars)
- `description` (text, 20–2000 chars)
- `starting_bid` (numeric, min ₱1)
- `current_bid` (numeric, default = starting_bid)
- `current_bidder_id` (uuid, nullable, FK profiles)
- `duration_days` (int, enum: 1, 3, 7)
- `status` (enum: `pending_payment`, `awaiting_review`, `rejected`, `live`, `ended`, `cancelled`)
- `rejection_reason` (text, nullable)
- `payment_proof_url` (text, nullable, Supabase Storage path)
- `payment_reference` (text, nullable, GCash reference number)
- `listing_fee` (numeric, snapshotted from settings at listing time)
- `starts_at` (timestamptz, nullable, set when admin approves)
- `ends_at` (timestamptz, nullable, set when admin approves; can be extended by anti-snipe)
- `winner_id` (uuid, nullable, FK profiles)
- `created_at`

### Listing Photos
- `id`, `listing_id`, `storage_path`, `display_order` (0–4)
- Max 5 per listing, min 1

### Bids
- `id`, `listing_id`, `bidder_id`, `amount` (numeric), `created_at`
- A bid is valid only if:
  - listing.status = 'live'
  - now() < listing.ends_at
  - amount >= current_bid + max(current_bid * 0.05, 10)
  - bidder_id != listing.auctioneer_id
  - bidder is not banned
- On valid bid: update `listings.current_bid`, `current_bidder_id`. If now() > ends_at - interval '2 minutes', extend `ends_at` by 2 minutes (anti-snipe).

### Ratings
- `id`, `listing_id` (unique with rater_id), `rater_id`, `ratee_id`, `verdict` (enum: `up`, `down`), `comment` (text, nullable, max 500)
- Created only after listing.status = 'ended' and only between auctioneer ↔ winner.

### Disputes
- `id`, `listing_id`, `reporter_id`, `reported_user_id`, `reason` (text, 20–1000), `status` (enum: `open`, `dismissed`, `upheld`), `admin_note` (text, nullable), `created_at`, `resolved_at`
- When admin marks `upheld`, increment `reported_user_id`'s `strike_count`. Apply ban policy:
  - strikes >= 3 → set `banned_until` = now() + 7 days
  - strikes >= 5 → set `permabanned` = true
- Banned users cannot list or bid; they can still view and message.

### Messages (Chat)
- `id`, `listing_id`, `sender_id`, `recipient_id`, `body` (text, 1–1000), `created_at`, `read_at` (nullable)
- Available only between auctioneer and winner, only after listing ends with a winner.
- Use Supabase Realtime to subscribe per-listing.

### Settings (single-row admin-controlled table)
- `id` (always 1), `listing_fee` (numeric, default 50), `gcash_qr_url` (text), `gcash_number` (text), `gcash_name` (text)

## Storage Buckets
- `listing-photos` (public read)
- `payment-proofs` (private, only owner + admins can read)

## RLS Policies (must implement explicitly)
- Profiles: read own + minimal public fields (display_name) of others; update own.
- Listings: read everyone for status in ('live','ended'); auctioneer reads own at any status; admin reads all. Insert by authenticated non-banned users only. Update by owner only while `pending_payment` or `awaiting_review` (limited fields); admin can update status fields.
- Bids: insert by authenticated non-banned non-owner; read by listing participants and admins; bids on live/ended listings readable by all.
- Ratings: read all; insert only when allowed (validated server-side too).
- Disputes: insert by authenticated; read own + admin.
- Messages: read/insert by sender or recipient only.
- Settings: read all authenticated; update admin only.

Always validate again in Server Actions; do not rely on RLS alone.

## Listing Lifecycle (the heart of the app)

1. **Create listing** (Server Action): user fills form (title, description, starting_bid, duration, photos). Photos uploaded to `listing-photos` keyed by `listing_id/order.jpg`. Listing inserted with `status='pending_payment'`, `listing_fee` snapshotted from settings. User redirected to a payment page showing the GCash QR + amount + GCash name + reference instructions ("use your username as the message").

2. **Submit payment proof**: user uploads screenshot (to `payment-proofs/{user_id}/{listing_id}.jpg`) and enters GCash reference number. Status → `awaiting_review`.

3. **Admin review** (`/admin/listings`): admin sees queue of `awaiting_review`. Approves → status `live`, sets `starts_at = now()`, `ends_at = now() + duration_days`. Rejects → status `rejected` with reason. Listing becomes publicly visible only when `live` or `ended`.

4. **Bidding**: implement as a Server Action `placeBid(listingId, amount)`. Wrap the validation + update in a Postgres function `place_bid(listing_id uuid, bidder_id uuid, amount numeric)` called via RPC, executed in a single transaction with `SELECT ... FOR UPDATE` on the listing row to prevent races. Function returns the new state or raises a typed error.

5. **Auction end**: a cron job (Vercel Cron hitting `/api/cron/finalize-auctions`, or a Supabase scheduled edge function) finalizes any `live` listings where `ends_at < now()`:
   - If `current_bidder_id` is null → status `ended`, no winner.
   - Else → status `ended`, `winner_id = current_bidder_id`.
   - Notify both parties (in-app notification row; skip email for MVP).

6. **Post-auction**: on the listing page, both auctioneer and winner now see each other's `phone_number` and `gcash_name`. Chat unlocks. Ratings can be submitted by either side.

## Pages

- `/` — feed of live auctions, sorted by `ends_at` ascending. Cards show photo, title, current bid, time remaining (client-side countdown), bid count.
- `/listings/[id]` — detail page. Photo gallery, description, current bid, bid history (last 10), countdown, bid form (if eligible). After end: winner reveal, contact card, chat panel, rating form.
- `/listings/new` — create listing wizard (3 steps: details → photos → review).
- `/listings/[id]/pay` — GCash QR + proof submission.
- `/me/listings` — my listings (all statuses).
- `/me/bids` — listings I've bid on, grouped by won/lost/active.
- `/me/profile` — edit display_name, phone, gcash_name.
- `/auth/login`, `/auth/signup`, `/auth/callback` (for OAuth).
- `/admin` — dashboard counts.
- `/admin/listings` — review queue.
- `/admin/disputes` — dispute queue.
- `/admin/users` — search, view strikes, manual ban/unban.
- `/admin/settings` — edit listing_fee, GCash details, upload QR.

## Auth Flow
- Supabase Auth with email/password and Google OAuth.
- After signup or first OAuth login, redirect to `/me/profile` if profile incomplete.
- Middleware (`middleware.ts`) refreshes session and gates `/admin/*` (require `is_admin`), `/me/*` and `/listings/new` (require auth + complete profile + not banned).

## Validation Rules (zod schemas in `lib/validators/`)
- Phone: `/^09\d{9}$/`
- GCash name: 2–60 chars
- Title: 5–100, Description: 20–2000
- Starting bid: positive number, max ₱1,000,000
- Duration: enum [1, 3, 7]
- Photos: 1–5, each ≤ 5MB, jpg/png/webp
- Bid amount: enforce 5% / ₱10 floor server-side

## Anti-Snipe Detail
In `place_bid` SQL function, after successful bid update:
```sql
IF (ends_at - now()) < interval '2 minutes' THEN
  UPDATE listings SET ends_at = now() + interval '2 minutes' WHERE id = listing_id;
END IF;
```

## Realtime
- Subscribe to `bids` filtered by `listing_id` on the detail page → re-render current bid + history.
- Subscribe to `messages` filtered by `listing_id` for chat.

## UI/UX Conventions
- Mobile-first. Most users are on phones.
- Peso formatting via `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })`.
- Time remaining as `2d 4h 12m` style; under 1 hour show `mm:ss` ticking.
- Empty states for every list.
- Toast notifications for action results (sonner).
- Confirm dialog before placing a bid showing the exact amount.
- Loading skeletons, not spinners.

## What NOT to build
- No payment integration. GCash is fully manual + admin-verified.
- No automated payout to auctioneer. Item delivery + final payment are off-platform; the app is explicit about this.
- No email notifications for MVP (in-app only).
- No mobile app. Web only, mobile-responsive.
- No bidding by auctioneer on own listing.

## Disclaimers (show in UI)
- On `/listings/new`: "Listing fees are non-refundable once your auction goes live."
- On `/listings/[id]` after end: "Coordinate delivery and final payment directly. We do not handle either. Report violations via the dispute form."

## Deliverables (build in this order)
1. Project scaffold + Supabase client setup + env validation
2. SQL migration: all tables, enums, indexes, RLS policies, `place_bid` function, `finalize_auctions` function
3. Auth pages + middleware + profile completion gate
4. Listing creation flow (form → photos → payment page → proof submission)
5. Admin review queue
6. Public feed + listing detail (read-only)
7. Bidding (Server Action + RPC + Realtime)
8. Auction finalization cron + winner reveal + contact card
9. Chat (Realtime)
10. Ratings
11. Disputes + strike system + ban enforcement in middleware
12. Admin: users, disputes, settings

After each step, write a brief `STEP_N.md` summarizing what was built, schema changes, and any decisions made. Stop and ask before deviating from the spec.
# Public Profile Page — Design Spec

**Date:** 2026-05-13  
**Feature:** `/users/[username]` — shareable public profile page  
**Status:** Approved, ready for implementation

---

## Overview

Every BidLock user gets a public-facing profile page at `/users/[username]`. The page shows their identity, trust signals (ratings), and auction activity (live and recently ended listings). The "View public profile →" link in `/me/profile` activates once the user sets a username.

---

## 1. Route & Architecture

**Route:** `app/users/[username]/page.tsx`  
**Type:** Async server component (no client-side interactivity)  
**Revalidation:** `export const revalidate = 60` (60-second stale-while-revalidate)

### Fetch sequence

```
1. Query profiles WHERE username = $1 (exact match, lowercase)
   └─ Not found → notFound()
   └─ Found → profile: { id, display_name, username, created_at }

2. Promise.all([
     fetchRatings(profile.id),   // latest 20, newest-first
     fetchListings(profile.id),  // live (all) + ended (latest 20)
   ])
   └─ Each wrapped in try/catch
   └─ On error: console.error server-side, render empty state to user
```

### Username lookup

The URL parameter is lowercased in the route handler before querying. Query uses exact match (`WHERE username = $1`) — not ILIKE. The DB trigger in migration `009_profile_username.sql` guarantees all stored usernames are already lowercase.

### Revalidation triggers

Beyond the 60s window, `revalidatePath('/users/<username>')` is called explicitly from:
- `upsertProfile` server action (when user updates their profile)
- Ratings server action (when a rating is submitted for this user)

---

## 2. Data Queries

### Profile
```sql
SELECT id, display_name, username, created_at
FROM profiles
WHERE username = $1
```
Excluded: `phone_number`, `gcash_name`, `is_admin`, `strike_count`, `banned_until`, `permabanned`

### Ratings

> **Prerequisite migration:** The `ratings` table has no `created_at` column in the current schema. A new migration (`010_ratings_created_at.sql`) adds `created_at timestamptz NOT NULL DEFAULT now()` before this feature can be built.

```sql
SELECT r.verdict, r.comment, r.created_at, p.display_name AS rater_display_name
FROM ratings r
JOIN profiles p ON p.id = r.rater_id
WHERE r.ratee_id = $1
ORDER BY r.created_at DESC
LIMIT 20
```
Aggregate computed in JS from the result array: count `up` and `down`. Positive percentage = `Math.round(up / (up + down) * 100)` — only shown when `up + down > 0`.

### Listings
```sql
-- Live listings (all, soonest ending first)
SELECT id, title, status, ends_at, current_bid, bid_count, last_bid_at,
       listing_photos (storage_path, display_order)
FROM listings
WHERE auctioneer_id = $1 AND status = 'live'
ORDER BY ends_at ASC

-- Ended listings (latest 20)
SELECT id, title, status, ends_at, current_bid, winner_id,
       listing_photos (storage_path, display_order)
FROM listings
WHERE auctioneer_id = $1 AND status = 'ended'
ORDER BY ends_at DESC
LIMIT 20
```

---

## 3. Page Layout

Two-column layout matching the existing `/me/profile` pattern.

### Left: Identity card (fixed width, `w-56`)

| Element | Source | Notes |
|---|---|---|
| Avatar | First letter of `display_name`; fallback: first letter of `username` | Primary brand color background, white text |
| Display name | `profiles.display_name` | — |
| `@username` chip | `profiles.username` | Subdued badge style |
| Member since | `profiles.created_at` | Formatted: "May 2026" |
| Rating summary | Computed from ratings array | `"👍 12  👎 2"` — links to #ratings anchor below |

If ratings query fails, rating summary is omitted from the identity card without error.

### Right: Main content (`flex-1`)

**Section 1 — Live Auctions**  
Visible only if the user has at least one live listing. Uses the existing `ListingCard` component (already handles countdown, heat state, bid pill). Grid layout matching `/auctions` page.

**Section 2 — Recent Sales**  
Inline card grid for ended listings. Each card:
- Thumbnail (first photo; placeholder if none)
- Title
- Price: "Sold for ₱X" if `winner_id` is not null; "No bids" if `winner_id` is null
- Time: `formatDistanceToNow` (date-fns) for ≤30 days ("3 days ago"), absolute date (`Apr 12`) for >30 days

Hidden entirely if the user has no ended listings.

**Section 3 — Ratings** (below listings, full width, id="ratings")  
Summary bar: "14 ratings · 85% positive"  
Rating cards (latest 20): verdict icon (👍/👎), comment text, rater display name, relative time  
Empty state: "No ratings yet" — rendered for both zero ratings and query failure (logged server-side).

---

## 4. Username Field in `/me/profile`

### Profile form changes

New `username` field added to the existing `ProfileForm`, above `display_name`.

- **Label:** Username
- **Placeholder:** `your_handle`
- **Hint (below field):** `Your public URL: bidlock.ph/users/<username>` — updates live as the user types (client-side preview only, no availability check)
- **Once saved:** "View public profile →" in the identity card becomes a real `<Link href="/users/<username>">` instead of a disabled `<span>`

### Validation

Applied in both the Zod schema (`lib/validators/profile.ts`) and server action (`upsertProfile`).

**Rules:**
- Required if provided (field is optional — user can leave username blank)
- 3–20 characters
- Alphanumeric and underscores only: `/^[a-z0-9_]+$/` (post-lowercase)
- Not in reserved words list (see below)

**Reserved words** (blocked at validator level):
```
admin, me, api, users, auctions, listings, login, signup,
verify-email, callback, settings, notifications, search,
home, about, terms, privacy, support, help, 404, 500,
null, undefined, root, system
```

**Uniqueness:** Enforced by the DB unique constraint (migration `009_profile_username.sql`). The server action returns a field-level error `"This username is already taken."` on unique violation. No client-side debounced availability check for v1.

**Case:** Stored lowercase (DB trigger normalizes on write). The form submits whatever the user typed; the server action passes it through Zod, then the DB trigger lowercases it.

**Changing username:** Allowed. The old URL returns 404 — no redirect history for v1.

---

## 5. SEO / Metadata

```ts
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Fetch profile (same query as page, Next.js deduplicates via fetch cache)
  return {
    title: `${display_name} (@${username}) · BidLock`,
    description: `View ${display_name}'s live auctions and seller ratings on BidLock.`,
  }
}
```

No dynamic OG image for v1.

---

## 6. Error & Edge States

| Scenario | Behavior |
|---|---|
| Username not found | `notFound()` → renders `not-found.tsx` |
| Profile found, no listings | Both listing sections hidden |
| Profile found, no ratings | "No ratings yet" empty state |
| Ratings query fails | `console.error` server-side; render "No ratings yet" to user |
| Listings query fails | `console.error` server-side; render no listings sections |
| display_name is blank | Avatar shows first letter of username; display name renders as `—` |

---

## 7. Testing

**Unit test:** `lib/validators/profile.ts` username validator — pure logic, high value.  
Test cases: valid usernames, reserved words, too short, too long, invalid characters, mixed case input (should pass after lowercasing).

No unit tests for the server component itself. Manual QA covers: profile with no listings, no ratings, both, and a 404 username.

---

## 8. Files Touched

| File | Change |
|---|---|
| `supabase/migrations/010_ratings_created_at.sql` | New — add `created_at` to ratings table |
| `app/users/[username]/page.tsx` | New — public profile server component |
| `lib/validators/profile.ts` | Add `username` field with rules + reserved word list |
| `lib/actions/profile.ts` | Add `username` to `upsertProfile`; call `revalidatePath` |
| `lib/actions/ratings.ts` | Add `revalidatePath('/users/<username>')` after rating write |
| `app/me/profile/profile-form.tsx` | Add username input field with URL preview hint |
| `app/me/profile/page.tsx` | Activate "View public profile →" link when username is set |

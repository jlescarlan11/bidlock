# Public Profile Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/users/[username]` — a public profile page showing identity, ratings, and auction listings — and wire it up via a new username field in `/me/profile`.

**Architecture:** Server component at `app/users/[username]/page.tsx` fetches profile by exact-match lowercase username, then runs ratings + listings queries in parallel. Username validation lives in `lib/validators/profile.ts` with a reserved-words check. The profile form gains a username input with a live URL preview hint.

**Tech Stack:** Next.js App Router (server components), Supabase JS client, Zod v4, Vitest, date-fns, Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/010_ratings_created_at.sql` | Create | Add `created_at` column to `ratings` table |
| `lib/validators/profile.ts` | Modify | Add `usernameSchema` export + `username` field to `profileSchema` |
| `lib/__tests__/username-validator.test.ts` | Create | Unit tests for username validation rules |
| `lib/actions/profile.ts` | Modify | Accept `username` in `upsertProfile`, handle unique violation, revalidate |
| `lib/actions/ratings.ts` | Modify | Revalidate ratee's public profile after successful rating |
| `app/me/profile/profile-form.tsx` | Modify | Add username input field with live URL preview hint |
| `app/me/profile/page.tsx` | Modify | Fetch + pass `username`; activate public profile link |
| `app/users/[username]/page.tsx` | Create | Public profile server component |

---

## Task 1: Migration — add `created_at` to ratings

**Files:**
- Create: `supabase/migrations/010_ratings_created_at.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/010_ratings_created_at.sql
ALTER TABLE ratings ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
```

- [ ] **Step 2: Apply to remote database**

```bash
npx supabase db push
```

Expected: `Applying migration 010_ratings_created_at.sql...` with no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/010_ratings_created_at.sql
git commit -m "feat(db): add created_at to ratings table"
```

---

## Task 2: Username validator + unit tests

**Files:**
- Modify: `lib/validators/profile.ts`
- Create: `lib/__tests__/username-validator.test.ts`

- [ ] **Step 1: Update the validator**

Replace the entire contents of `lib/validators/profile.ts`:

```ts
import { z } from 'zod'

const RESERVED_USERNAMES = new Set([
  'admin', 'me', 'api', 'users', 'auctions', 'listings', 'login', 'signup',
  'verify-email', 'callback', 'settings', 'notifications', 'search',
  'home', 'about', 'terms', 'privacy', 'support', 'help', '404', '500',
  'null', 'undefined', 'root', 'system',
])

export const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be 20 characters or fewer')
  .regex(/^[a-z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
  .refine(v => !RESERVED_USERNAMES.has(v), 'That username is not available')

export const profileSchema = z.object({
  display_name: z.string().min(2, 'Display name must be at least 2 characters').max(60, 'Display name must be 60 characters or fewer'),
  phone_number: z.string().min(1, 'Phone number is required').regex(/^09\d{9}$/, 'Must be in format 09XXXXXXXXX'),
  gcash_name: z.string().trim().min(2, 'GCash name must be at least 2 characters').max(60, 'GCash name must be 60 characters or fewer'),
  username: usernameSchema.optional(),
})

export type ProfileInput = z.infer<typeof profileSchema>
```

- [ ] **Step 2: Write the tests**

Create `lib/__tests__/username-validator.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { usernameSchema } from '../validators/profile'

function parse(value: string) {
  return usernameSchema.safeParse(value)
}

describe('usernameSchema', () => {
  it('accepts a valid lowercase alphanumeric username', () => {
    expect(parse('johndoe').success).toBe(true)
  })

  it('accepts underscores', () => {
    expect(parse('john_doe_123').success).toBe(true)
  })

  it('accepts minimum length of 3', () => {
    expect(parse('abc').success).toBe(true)
  })

  it('accepts maximum length of 20', () => {
    expect(parse('a'.repeat(20)).success).toBe(true)
  })

  it('rejects username shorter than 3 characters', () => {
    const result = parse('ab')
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Username must be at least 3 characters')
  })

  it('rejects username longer than 20 characters', () => {
    const result = parse('a'.repeat(21))
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Username must be 20 characters or fewer')
  })

  it('rejects uppercase letters', () => {
    const result = parse('JohnDoe')
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Username can only contain letters, numbers, and underscores')
  })

  it('rejects spaces', () => {
    expect(parse('john doe').success).toBe(false)
  })

  it('rejects hyphens', () => {
    expect(parse('john-doe').success).toBe(false)
  })

  it('rejects reserved word: admin', () => {
    const result = parse('admin')
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('That username is not available')
  })

  it('rejects reserved word: me', () => {
    expect(parse('me').success).toBe(false)
  })

  it('rejects reserved word: users', () => {
    expect(parse('users').success).toBe(false)
  })

  it('rejects reserved word: settings', () => {
    expect(parse('settings').success).toBe(false)
  })

  it('rejects reserved word: null', () => {
    expect(parse('null').success).toBe(false)
  })
})
```

- [ ] **Step 3: Run tests — verify they pass**

```bash
npx vitest run lib/__tests__/username-validator.test.ts
```

Expected: 14 tests pass, 0 fail.

- [ ] **Step 4: Commit**

```bash
git add lib/validators/profile.ts lib/__tests__/username-validator.test.ts
git commit -m "feat(validators): add usernameSchema with reserved-word check"
```

---

## Task 3: Update `upsertProfile` server action

**Files:**
- Modify: `lib/actions/profile.ts`

- [ ] **Step 1: Replace the file contents**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { profileSchema } from '@/lib/validators/profile'

export async function upsertProfile(
  _prevState: { error: string } | { success: true } | undefined,
  formData: FormData,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Normalize username before validation: lowercase, empty string → undefined
  const rawUsername = (formData.get('username') as string | null)?.trim().toLowerCase()
  const usernameInput = rawUsername === '' ? undefined : rawUsername

  const parsed = profileSchema.safeParse({
    display_name: formData.get('display_name'),
    phone_number: formData.get('phone_number'),
    gcash_name: formData.get('gcash_name'),
    username: usernameInput,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Fetch current username to revalidate the old public profile URL if it changes
  const { data: current } = await db
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle()

  const { error } = await db
    .from('profiles')
    .upsert({ id: user.id, ...parsed.data })

  if (error?.code === '23505') return { error: 'That username is already taken.' }
  if (error) return { error: error.message }

  revalidatePath('/me/profile')

  // Revalidate the old public profile URL so stale pages are evicted
  if (current?.username) revalidatePath(`/users/${current.username}`)

  // Revalidate the new URL if username was set/changed
  if (parsed.data.username) revalidatePath(`/users/${parsed.data.username}`)

  return { success: true as const }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/actions/profile.ts
git commit -m "feat(actions): add username to upsertProfile with revalidation"
```

---

## Task 4: Update `submitRating` to revalidate public profile

**Files:**
- Modify: `lib/actions/ratings.ts`

- [ ] **Step 1: Add revalidation after successful rating insert**

In `lib/actions/ratings.ts`, replace the lines after the successful insert:

Find this block (lines 53–54):
```ts
  revalidatePath(`/listings/${parsed.data.listing_id}`)
  return { success: true }
```

Replace with:
```ts
  revalidatePath(`/listings/${parsed.data.listing_id}`)

  // Revalidate the ratee's public profile so their rating summary refreshes
  const { data: ratee } = await db
    .from('profiles')
    .select('username')
    .eq('id', parsed.data.ratee_id)
    .maybeSingle()
  if (ratee?.username) revalidatePath(`/users/${ratee.username}`)

  return { success: true }
```

- [ ] **Step 2: Commit**

```bash
git add lib/actions/ratings.ts
git commit -m "feat(actions): revalidate public profile after rating submission"
```

---

## Task 5: Add username field to profile form

**Files:**
- Modify: `app/me/profile/profile-form.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
'use client'

import { useActionState, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { upsertProfile } from '@/lib/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  profile: {
    display_name: string | null
    phone_number: string | null
    gcash_name: string | null
    username: string | null
  } | null
}

export default function ProfileForm({ profile }: Props) {
  const [state, action, pending] = useActionState(upsertProfile, undefined)
  const [username, setUsername] = useState(profile?.username ?? '')
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number ?? '')
  const [gcashName, setGcashName] = useState(profile?.gcash_name ?? '')

  useEffect(() => {
    if (state && 'success' in state) toast.success('Profile saved.')
    if (state && 'error' in state) toast.error(state.error)
  }, [state])

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          placeholder="your_handle"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {username.trim()
            ? `Your public URL: bidlock.ph/users/${username.trim().toLowerCase()}`
            : 'Set a username to get a public profile URL'}
        </p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="display_name">Display name</Label>
        <Input id="display_name" name="display_name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="phone_number">Phone number</Label>
        <Input id="phone_number" name="phone_number" type="tel" inputMode="numeric" placeholder="09XXXXXXXXX" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="gcash_name">GCash name</Label>
        <Input id="gcash_name" name="gcash_name" value={gcashName} onChange={(e) => setGcashName(e.target.value)} required />
        <p className="text-xs text-muted-foreground">The name registered on your GCash account</p>
      </div>
      <div className="border-t border-border pt-5 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/me/profile/profile-form.tsx
git commit -m "feat(profile): add username field with live URL preview"
```

---

## Task 6: Activate public profile link in `/me/profile`

**Files:**
- Modify: `app/me/profile/page.tsx`

- [ ] **Step 1: Update the select query to include `username`**

Find (line 22–25):
```ts
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('display_name, phone_number, gcash_name')
    .eq('id', user.id)
```

Replace with:
```ts
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('display_name, phone_number, gcash_name, username')
    .eq('id', user.id)
```

- [ ] **Step 2: Add the Link import and replace the disabled span**

Add to imports at the top of the file:
```ts
import Link from 'next/link'
```

Find (line 50–52):
```tsx
          <span className="text-sm font-medium text-muted-foreground/50 cursor-not-allowed select-none">
            View public profile →
          </span>
```

Replace with:
```tsx
          {profile?.username ? (
            <Link
              href={`/users/${profile.username}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              View public profile →
            </Link>
          ) : (
            <span className="text-sm font-medium text-muted-foreground/50 cursor-not-allowed select-none">
              View public profile →
            </span>
          )}
```

- [ ] **Step 3: Pass `username` to ProfileForm**

Find:
```tsx
          <ProfileForm profile={profile} />
```

The `profile` object now includes `username` from the updated select — no change needed to the prop itself, but update the `ProfileForm` select type. ProfileForm's Props type already has `username: string | null` from Task 5, so this works automatically.

- [ ] **Step 4: Commit**

```bash
git add app/me/profile/page.tsx
git commit -m "feat(profile): activate public profile link when username is set"
```

---

## Task 7: Build the public profile page

**Files:**
- Create: `app/users/[username]/page.tsx`

- [ ] **Step 1: Install date-fns**

```bash
npm install date-fns
```

Expected: package added to `package.json` and `package-lock.json`.

- [ ] **Step 2: Create the page file**

Create `app/users/[username]/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import ListingCard from '@/components/listing-card'
import { formatPHP } from '@/lib/utils/currency'
import { formatDistanceToNow, differenceInDays, format } from 'date-fns'
import type { Metadata } from 'next'

export const revalidate = 60

type Props = { params: Promise<{ username: string }> }

function getInitial(displayName: string | null, username: string): string {
  const src = displayName?.trim() || username
  return src[0].toUpperCase()
}

function formatMemberSince(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatEndedTime(endsAt: string): string {
  const date = new Date(endsAt)
  if (differenceInDays(new Date(), date) > 30) return format(date, 'MMM d')
  return formatDistanceToNow(date, { addSuffix: true })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: profile } = await db
    .from('profiles')
    .select('display_name, username')
    .eq('username', username.toLowerCase())
    .maybeSingle()
  if (!profile) return { title: 'Profile not found · BidLock' }
  const name = profile.display_name ?? `@${profile.username}`
  return {
    title: `${name} (@${profile.username}) · BidLock`,
    description: `View ${name}'s live auctions and seller ratings on BidLock.`,
  }
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: profile } = await db
    .from('profiles')
    .select('id, display_name, username, created_at')
    .eq('username', username.toLowerCase())
    .maybeSingle()

  if (!profile) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ratings: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let liveListings: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let endedListings: any[] = []

  const [ratingsRes, liveRes, endedRes] = await Promise.all([
    db
      .from('ratings')
      .select('verdict, comment, created_at, rater:rater_id(display_name)')
      .eq('ratee_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20),
    db
      .from('listings')
      .select('id, title, current_bid, ends_at, listing_photos(storage_path, display_order), bids(created_at)')
      .eq('auctioneer_id', profile.id)
      .eq('status', 'live')
      .order('ends_at', { ascending: true }),
    db
      .from('listings')
      .select('id, title, ends_at, current_bid, winner_id, listing_photos(storage_path, display_order)')
      .eq('auctioneer_id', profile.id)
      .eq('status', 'ended')
      .order('ends_at', { ascending: false })
      .limit(20),
  ])

  if (ratingsRes.error) {
    console.error('[public-profile] ratings fetch failed:', ratingsRes.error)
  } else {
    ratings = ratingsRes.data ?? []
  }

  if (liveRes.error) {
    console.error('[public-profile] live listings fetch failed:', liveRes.error)
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    liveListings = (liveRes.data ?? []).map((listing: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bidRows: { created_at: string }[] = listing.bids ?? []
      const bid_count = bidRows.length
      const last_bid_at = bidRows.length > 0
        ? bidRows.reduce(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (max: string, b: any) => (b.created_at > max ? b.created_at : max),
            bidRows[0].created_at,
          )
        : null
      return {
        id: listing.id,
        title: listing.title,
        current_bid: listing.current_bid,
        ends_at: listing.ends_at,
        bid_count,
        last_bid_at,
        listing_photos: (listing.listing_photos ?? []).sort(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a: any, b: any) => a.display_order - b.display_order,
        ),
      }
    })
  }

  if (endedRes.error) {
    console.error('[public-profile] ended listings fetch failed:', endedRes.error)
  } else {
    endedListings = endedRes.data ?? []
  }

  const upCount = ratings.filter((r: any) => r.verdict === 'up').length
  const downCount = ratings.filter((r: any) => r.verdict === 'down').length
  const totalRatings = upCount + downCount
  const positivePercent = totalRatings > 0 ? Math.round((upCount / totalRatings) * 100) : null

  const initial = getInitial(profile.display_name, profile.username)
  const memberSince = formatMemberSince(profile.created_at)

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Identity card */}
        <div className="w-full md:w-56 shrink-0 bg-white border border-border rounded-xl shadow-sm p-6 text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl font-bold tracking-tight">{initial}</span>
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">{profile.display_name ?? '—'}</p>
          <p className="text-xs text-muted-foreground mb-2">@{profile.username}</p>
          {totalRatings > 0 && (
            <a href="#ratings" className="inline-block text-xs text-muted-foreground hover:text-foreground mb-2">
              👍 {upCount}&nbsp;&nbsp;👎 {downCount}
            </a>
          )}
          <div className="border-t border-border my-4" />
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Member since</p>
          <p className="text-sm text-muted-foreground">{memberSince}</p>
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-10">
          {liveListings.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-foreground mb-4">Live Auctions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {liveListings.map((listing: any) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            </section>
          )}

          {endedListings.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-foreground mb-4">Recent Sales</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {endedListings.map((listing: any) => {
                  const photo = (listing.listing_photos ?? []).sort(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (a: any, b: any) => a.display_order - b.display_order,
                  )[0]
                  const photoUrl = photo
                    ? supabase.storage.from('listing-photos').getPublicUrl(photo.storage_path).data.publicUrl
                    : null
                  return (
                    <Link
                      key={listing.id}
                      href={`/listings/${listing.id}`}
                      className="bg-white border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-square bg-muted relative">
                        {photoUrl ? (
                          <Image src={photoUrl} alt={listing.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No photo</div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold text-foreground line-clamp-2 mb-1">{listing.title}</p>
                        <p className="text-sm font-bold text-primary">
                          {listing.winner_id ? `Sold for ${formatPHP(listing.current_bid)}` : 'No bids'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatEndedTime(listing.ends_at)}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          <section id="ratings">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-bold text-foreground">Ratings</h2>
              {positivePercent !== null && (
                <span className="text-xs text-muted-foreground">
                  {totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'} · {positivePercent}% positive
                </span>
              )}
            </div>
            {ratings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ratings yet.</p>
            ) : (
              <div className="space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {ratings.map((rating: any, i: number) => (
                  <div key={i} className="bg-white border border-border rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-lg leading-none">{rating.verdict === 'up' ? '👍' : '👎'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-xs font-semibold text-foreground">
                            {rating.rater?.display_name ?? 'Unknown user'}
                          </p>
                          {rating.created_at && (
                            <p className="text-xs text-muted-foreground shrink-0">
                              {formatDistanceToNow(new Date(rating.created_at), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                        {rating.comment && (
                          <p className="text-sm text-muted-foreground">{rating.comment}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run the build to verify no type errors**

```bash
npm run build
```

Expected: build completes with no errors. If TypeScript errors appear on the `any` casts, check that all `// eslint-disable-next-line` comments are on the line immediately above the affected expression.

- [ ] **Step 4: Manual QA checklist**

Test these scenarios in the browser (start dev server with `npm run dev`):

| Scenario | Expected |
|---|---|
| `/users/nonexistent` | 404 page |
| `/users/UPPERCASE` | Treated as lowercase — same profile loads |
| User with no listings, no ratings | Identity card only; no listing sections; "No ratings yet" |
| User with live listings | Live Auctions grid shows with countdown timers |
| User with ended listings (winner) | "Sold for ₱X" on card |
| User with ended listings (no winner) | "No bids" on card |
| Ended listing >30 days ago | Shows absolute date e.g. "Apr 12" |
| User has ratings | Summary chip in identity card; rating cards below listings |
| Profile with no display_name | Avatar shows first letter of username; display name renders `—` |

- [ ] **Step 5: Commit**

```bash
git add app/users/[username]/page.tsx package.json package-lock.json
git commit -m "feat: add public profile page at /users/[username]"
```

---

## Task 8: Final wiring check

- [ ] **Step 1: Set a username in `/me/profile` and verify the link activates**

1. Go to `/me/profile`
2. Enter a username (e.g. `testuser`) and save
3. Verify the "View public profile →" link is now clickable
4. Click it — should navigate to `/users/testuser` showing your profile

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: all tests pass including the new username validator tests.

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -p
git commit -m "fix: address QA findings from public profile integration"
```

# BidLock Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the Next.js 15 project, apply the full database schema to Supabase, and implement auth + profile completion gate so users can sign up, log in (email or Google), and complete their profile.

**Architecture:** Next.js 15 App Router with Server Components by default. All writes go through Server Actions. Two Supabase clients: `lib/supabase/server.ts` (server-side, cookie-based) and `lib/supabase/client.ts` (browser, Realtime only). Middleware refreshes sessions and guards routes.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, @supabase/ssr, react-hook-form, zod, sonner, pnpm

---

## File Map

| File | Purpose |
|---|---|
| `lib/env.ts` | Zod-validated env vars — fails at startup if missing |
| `lib/supabase/server.ts` | Server-side Supabase client (Server Components, Actions, Route Handlers) |
| `lib/supabase/client.ts` | Browser Supabase client (Client Components, Realtime only) |
| `types/database.ts` | Generated Supabase DB types |
| `middleware.ts` | Session refresh + route guards |
| `supabase/migrations/001_schema.sql` | All tables, enums, indexes, RLS policies |
| `supabase/migrations/002_functions.sql` | `place_bid()` and `finalize_auctions()` Postgres functions |
| `supabase/migrations/003_seed.sql` | Settings row seed (listing_fee=50) |
| `lib/validators/profile.ts` | Zod schema for profile fields |
| `lib/actions/profile.ts` | `upsertProfile` Server Action |
| `app/layout.tsx` | Root layout with Toaster |
| `app/auth/login/page.tsx` | Login page (email + Google OAuth) |
| `app/auth/signup/page.tsx` | Signup page |
| `app/auth/callback/route.ts` | OAuth callback handler |
| `app/me/profile/page.tsx` | Profile completion / edit page |
| `app/(protected)/layout.tsx` | Layout that verifies auth + complete profile |
| `components/ui/` | shadcn/ui components (added per-task) |
| `.env.local.example` | Template for required env vars |

---

## Task 1: Scaffold the project

**Files:**
- Create: project root (via CLI)
- Create: `.env.local.example`
- Create: `lib/env.ts`

- [ ] **Step 1: Create the Next.js app**

```bash
pnpm create next-app@latest bidlock \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*" \
  --no-turbopack
cd bidlock
```

- [ ] **Step 2: Install dependencies**

```bash
pnpm add @supabase/ssr @supabase/supabase-js react-hook-form @hookform/resolvers zod sonner
pnpm add -D supabase
```

- [ ] **Step 3: Init shadcn/ui**

```bash
pnpm dlx shadcn@latest init -d
```
Select: New York style, zinc base color, CSS variables yes.

Add the components used throughout the app:
```bash
pnpm dlx shadcn@latest add button input label textarea select card badge toast dialog form skeleton separator avatar dropdown-menu
```

- [ ] **Step 4: Create `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=a-random-secret-for-cron-auth
```

Copy to `.env.local` and fill in your Supabase project values.

- [ ] **Step 5: Create `lib/env.ts`**

```typescript
import { z } from 'zod'

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(1),
})

export const env = schema.parse(process.env)
```

- [ ] **Step 6: Create `lib/supabase/server.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 7: Create `lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 8: Create placeholder `types/database.ts`** (will be replaced after migration)

```typescript
export type Database = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
```

- [ ] **Step 9: Verify the app builds**

```bash
pnpm build
```
Expected: Build completes with no errors.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 app with Supabase clients and env validation"
```

---

## Task 2: Database schema migration

**Files:**
- Create: `supabase/migrations/001_schema.sql`
- Create: `supabase/migrations/002_functions.sql`
- Create: `supabase/migrations/003_seed.sql`
- Modify: `types/database.ts` (regenerate after applying)

- [ ] **Step 1: Init Supabase CLI**

```bash
pnpm dlx supabase init
```

- [ ] **Step 2: Create `supabase/migrations/001_schema.sql`**

```sql
-- Enums
CREATE TYPE listing_status AS ENUM (
  'pending_payment', 'awaiting_review', 'rejected',
  'live', 'ended', 'cancelled'
);
CREATE TYPE dispute_status AS ENUM ('open', 'dismissed', 'upheld');
CREATE TYPE rating_verdict AS ENUM ('up', 'down');

-- Profiles (auto-created via trigger on auth.users insert)
CREATE TABLE profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name  text,
  phone_number  text,
  gcash_name    text,
  is_admin      boolean NOT NULL DEFAULT false,
  strike_count  int NOT NULL DEFAULT 0,
  banned_until  timestamptz,
  permabanned   boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Settings (single row)
CREATE TABLE settings (
  id            int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  listing_fee   numeric NOT NULL DEFAULT 50,
  gcash_qr_url  text NOT NULL DEFAULT '',
  gcash_number  text NOT NULL DEFAULT '',
  gcash_name    text NOT NULL DEFAULT ''
);

-- Listings
CREATE TABLE listings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auctioneer_id       uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  title               text NOT NULL,
  description         text NOT NULL,
  starting_bid        numeric NOT NULL,
  current_bid         numeric NOT NULL,
  current_bidder_id   uuid REFERENCES profiles,
  duration_days       int NOT NULL,
  status              listing_status NOT NULL DEFAULT 'pending_payment',
  rejection_reason    text,
  payment_proof_url   text,
  payment_reference   text,
  listing_fee         numeric NOT NULL,
  starts_at           timestamptz,
  ends_at             timestamptz,
  winner_id           uuid REFERENCES profiles,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX listings_status_idx ON listings (status);
CREATE INDEX listings_ends_at_idx ON listings (ends_at) WHERE status = 'live';

-- Listing photos
CREATE TABLE listing_photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    uuid NOT NULL REFERENCES listings ON DELETE CASCADE,
  storage_path  text NOT NULL,
  display_order int NOT NULL,
  CONSTRAINT display_order_range CHECK (display_order BETWEEN 0 AND 4),
  UNIQUE (listing_id, display_order)
);

-- Bids
CREATE TABLE bids (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES listings ON DELETE CASCADE,
  bidder_id   uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  amount      numeric NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bids_listing_id_idx ON bids (listing_id, created_at DESC);

-- Ratings
CREATE TABLE ratings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES listings ON DELETE CASCADE,
  rater_id    uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  ratee_id    uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  verdict     rating_verdict NOT NULL,
  comment     text,
  UNIQUE (listing_id, rater_id)
);

-- Disputes
CREATE TABLE disputes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        uuid NOT NULL REFERENCES listings ON DELETE CASCADE,
  reporter_id       uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  reported_user_id  uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  reason            text NOT NULL,
  status            dispute_status NOT NULL DEFAULT 'open',
  admin_note        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  resolved_at       timestamptz
);

-- Messages
CREATE TABLE messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    uuid NOT NULL REFERENCES listings ON DELETE CASCADE,
  sender_id     uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  recipient_id  uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  body          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  read_at       timestamptz
);

CREATE INDEX messages_listing_id_idx ON messages (listing_id, created_at ASC);

-- Notifications
CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  listing_id  uuid REFERENCES listings ON DELETE CASCADE,
  type        text NOT NULL,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_id_idx ON notifications (user_id, created_at DESC);

-- Storage buckets (run in Supabase dashboard or via CLI)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('listing-photos', 'listing-photos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_read_public" ON profiles FOR SELECT USING (true); -- display_name only (filter in app)
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Settings
CREATE POLICY "settings_read_authenticated" ON settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "settings_update_admin" ON settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Listings: read live/ended by all, own at any status, admin reads all
CREATE POLICY "listings_read_public" ON listings FOR SELECT USING (
  status IN ('live', 'ended')
);
CREATE POLICY "listings_read_own" ON listings FOR SELECT USING (
  auth.uid() = auctioneer_id
);
CREATE POLICY "listings_read_admin" ON listings FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "listings_insert_authenticated" ON listings FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND phone_number IS NOT NULL
    AND gcash_name IS NOT NULL
    AND permabanned = false
    AND (banned_until IS NULL OR banned_until < now())
  )
);
CREATE POLICY "listings_update_owner_pending" ON listings FOR UPDATE USING (
  auth.uid() = auctioneer_id AND status IN ('pending_payment', 'awaiting_review')
);
CREATE POLICY "listings_update_admin" ON listings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Listing photos
CREATE POLICY "photos_read_public" ON listing_photos FOR SELECT USING (true);
CREATE POLICY "photos_insert_owner" ON listing_photos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND auctioneer_id = auth.uid())
);
CREATE POLICY "photos_delete_owner" ON listing_photos FOR DELETE USING (
  EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND auctioneer_id = auth.uid())
);

-- Bids
CREATE POLICY "bids_read_public" ON bids FOR SELECT USING (
  EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND status IN ('live', 'ended'))
);
CREATE POLICY "bids_read_participant" ON bids FOR SELECT USING (
  auth.uid() = bidder_id OR
  EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND auctioneer_id = auth.uid())
);
CREATE POLICY "bids_read_admin" ON bids FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Ratings
CREATE POLICY "ratings_read_all" ON ratings FOR SELECT USING (true);
CREATE POLICY "ratings_insert_participant" ON ratings FOR INSERT WITH CHECK (
  auth.uid() = rater_id AND
  EXISTS (
    SELECT 1 FROM listings
    WHERE id = listing_id
    AND status = 'ended'
    AND (auctioneer_id = auth.uid() OR winner_id = auth.uid())
  )
);

-- Disputes
CREATE POLICY "disputes_insert_authenticated" ON disputes FOR INSERT WITH CHECK (
  auth.uid() = reporter_id AND auth.uid() IS NOT NULL
);
CREATE POLICY "disputes_read_own" ON disputes FOR SELECT USING (
  auth.uid() = reporter_id OR auth.uid() = reported_user_id
);
CREATE POLICY "disputes_read_admin" ON disputes FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "disputes_update_admin" ON disputes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Messages
CREATE POLICY "messages_read_participant" ON messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);
CREATE POLICY "messages_insert_participant" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);

-- Notifications
CREATE POLICY "notifications_read_own" ON notifications FOR SELECT USING (
  auth.uid() = user_id
);
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (
  auth.uid() = user_id
);
```

- [ ] **Step 3: Create `supabase/migrations/002_functions.sql`**

```sql
-- place_bid: atomic bid placement with race protection
CREATE OR REPLACE FUNCTION place_bid(
  p_listing_id uuid,
  p_bidder_id  uuid,
  p_amount     numeric
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_listing  listings%ROWTYPE;
  v_min_bid  numeric;
BEGIN
  SELECT * INTO v_listing FROM listings WHERE id = p_listing_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found';
  END IF;
  IF v_listing.status != 'live' THEN
    RAISE EXCEPTION 'auction_not_live';
  END IF;
  IF now() >= v_listing.ends_at THEN
    RAISE EXCEPTION 'auction_ended';
  END IF;
  IF p_bidder_id = v_listing.auctioneer_id THEN
    RAISE EXCEPTION 'bidder_is_auctioneer';
  END IF;

  v_min_bid := v_listing.current_bid + GREATEST(v_listing.current_bid * 0.05, 10);
  IF p_amount < v_min_bid THEN
    RAISE EXCEPTION 'bid_too_low';
  END IF;

  INSERT INTO bids (listing_id, bidder_id, amount)
  VALUES (p_listing_id, p_bidder_id, p_amount);

  UPDATE listings
  SET current_bid = p_amount, current_bidder_id = p_bidder_id
  WHERE id = p_listing_id;

  IF (v_listing.ends_at - now()) < interval '2 minutes' THEN
    UPDATE listings SET ends_at = now() + interval '2 minutes' WHERE id = p_listing_id;
  END IF;

  RETURN json_build_object('success', true, 'amount', p_amount);
END;
$$;

-- finalize_auctions: called by cron to end expired live listings
CREATE OR REPLACE FUNCTION finalize_auctions()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_listing  listings%ROWTYPE;
  v_count    int := 0;
BEGIN
  FOR v_listing IN
    SELECT * FROM listings
    WHERE status = 'live' AND ends_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE listings
    SET status = 'ended', winner_id = current_bidder_id
    WHERE id = v_listing.id;

    INSERT INTO notifications (user_id, listing_id, type)
    VALUES (v_listing.auctioneer_id, v_listing.id, 'auction_ended');

    IF v_listing.current_bidder_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, listing_id, type)
      VALUES (v_listing.current_bidder_id, v_listing.id, 'auction_won');
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
```

- [ ] **Step 4: Create `supabase/migrations/003_seed.sql`**

```sql
INSERT INTO settings (id, listing_fee, gcash_qr_url, gcash_number, gcash_name)
VALUES (1, 50, '', '', '')
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 5: Apply migrations to your Supabase project**

Option A — Supabase dashboard (SQL editor): paste and run each file in order (001, 002, 003).

Option B — Supabase CLI:
```bash
pnpm dlx supabase link --project-ref YOUR_PROJECT_REF
pnpm dlx supabase db push
```

- [ ] **Step 6: Create storage buckets in Supabase dashboard**

Go to Storage → New bucket:
1. Name: `listing-photos`, toggle **Public** ON
2. Name: `payment-proofs`, toggle **Public** OFF

Add storage RLS policies for `payment-proofs`:
```sql
-- payment-proofs: owner can upload/read, admins can read
CREATE POLICY "proof_upload_owner" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "proof_read_owner" ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "proof_read_admin" ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));
```

- [ ] **Step 7: Generate TypeScript types**

```bash
pnpm dlx supabase gen types typescript \
  --project-id YOUR_PROJECT_REF \
  --schema public \
  > types/database.ts
```

- [ ] **Step 8: Commit**

```bash
git add supabase/ types/database.ts
git commit -m "feat: add database schema, RLS policies, and Postgres functions"
```

---

## Task 3: Middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Create `middleware.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — required for Server Components to read the session
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // /admin/* — requires is_admin
  if (path.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // /me/* and /listings/new — requires auth + complete profile
  const requiresAuth = path.startsWith('/me/') || path.startsWith('/listings/new')
  if (requiresAuth) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_number, gcash_name, permabanned, banned_until')
      .eq('id', user.id)
      .single()

    // Incomplete profile → redirect to profile page (but not if already going there)
    const profileIncomplete = !profile?.phone_number || !profile?.gcash_name
    if (profileIncomplete && !path.startsWith('/me/profile')) {
      return NextResponse.redirect(new URL('/me/profile', request.url))
    }

    // Banned users cannot list or bid
    const isBanned = profile?.permabanned ||
      (profile?.banned_until && new Date(profile.banned_until) > new Date())
    if (isBanned && path.startsWith('/listings/new')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add middleware for session refresh and route guards"
```

---

## Task 4: Auth pages

**Files:**
- Create: `lib/validators/auth.ts`
- Create: `lib/actions/auth.ts`
- Create: `app/auth/login/page.tsx`
- Create: `app/auth/signup/page.tsx`
- Create: `app/auth/callback/route.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `lib/validators/auth.ts`**

```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  display_name: z.string().min(2).max(60),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
```

- [ ] **Step 2: Create `lib/actions/auth.ts`**

```typescript
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, signupSchema } from '@/lib/validators/auth'

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: 'Invalid email or password format.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: error.message }

  redirect('/')
}

export async function signup(formData: FormData) {
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    display_name: formData.get('display_name'),
  })
  if (!parsed.success) return { error: 'Please check your inputs.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.display_name } },
  })
  if (error) return { error: error.message }

  redirect('/me/profile')
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  })
  if (error) return { error: error.message }
  if (data.url) redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}
```

Add `NEXT_PUBLIC_SITE_URL=http://localhost:3000` to `.env.local` and `.env.local.example`.

- [ ] **Step 3: Create `app/auth/callback/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/me/profile`)
}
```

- [ ] **Step 4: Update `app/layout.tsx` to include Toaster**

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BidLock',
  description: 'Philippine auction marketplace',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Create `app/auth/login/page.tsx`**

```typescript
'use client'

import { useActionState } from 'react'
import { login, signInWithGoogle } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in to BidLock</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={action} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <form action={signInWithGoogle}>
            <Button type="submit" variant="outline" className="w-full">
              Continue with Google
            </Button>
          </form>
          <p className="text-sm text-center text-muted-foreground">
            No account?{' '}
            <Link href="/auth/signup" className="underline">Sign up</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 6: Create `app/auth/signup/page.tsx`**

```typescript
'use client'

import { useActionState } from 'react'
import { signup, signInWithGoogle } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined)

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={action} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="display_name">Display name</Label>
              <Input id="display_name" name="display_name" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={6} />
            </div>
            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <form action={signInWithGoogle}>
            <Button type="submit" variant="outline" className="w-full">
              Continue with Google
            </Button>
          </form>
          <p className="text-sm text-center text-muted-foreground">
            Have an account?{' '}
            <Link href="/auth/login" className="underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 7: Verify auth flow manually**

```bash
pnpm dev
```

1. Go to `http://localhost:3000/auth/signup` — create a test account
2. Confirm you land on `/me/profile` (redirect after signup)
3. Sign out, go to `/auth/login`, sign back in — confirm redirect to `/`
4. In Supabase dashboard → Authentication → Users, confirm user exists
5. In Supabase dashboard → Table Editor → profiles, confirm row was auto-created by trigger

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add auth pages (email + Google OAuth) and session middleware"
```

---

## Task 5: Profile page

**Files:**
- Create: `lib/validators/profile.ts`
- Create: `lib/actions/profile.ts`
- Create: `app/me/profile/page.tsx`

- [ ] **Step 1: Create `lib/validators/profile.ts`**

```typescript
import { z } from 'zod'

export const profileSchema = z.object({
  display_name: z.string().min(2).max(60),
  phone_number: z.string().regex(/^09\d{9}$/, 'Must be in format 09XXXXXXXXX'),
  gcash_name: z.string().min(2).max(60),
})

export type ProfileInput = z.infer<typeof profileSchema>
```

- [ ] **Step 2: Create `lib/actions/profile.ts`**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { profileSchema } from '@/lib/validators/profile'

export async function upsertProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const parsed = profileSchema.safeParse({
    display_name: formData.get('display_name'),
    phone_number: formData.get('phone_number'),
    gcash_name: formData.get('gcash_name'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error } = await supabase
    .from('profiles')
    .update(parsed.data)
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/me/profile')
  return { success: true }
}
```

- [ ] **Step 3: Create `app/me/profile/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './profile-form'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, phone_number, gcash_name')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-md mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
      <ProfileForm profile={profile} />
    </div>
  )
}
```

- [ ] **Step 4: Create `app/me/profile/profile-form.tsx`**

```typescript
'use client'

import { useActionState } from 'react'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { upsertProfile } from '@/lib/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  profile: { display_name: string | null; phone_number: string | null; gcash_name: string | null } | null
}

export default function ProfileForm({ profile }: Props) {
  const [state, action, pending] = useActionState(upsertProfile, undefined)

  useEffect(() => {
    if (state?.success) toast.success('Profile saved.')
    if (state?.error) toast.error(state.error)
  }, [state])

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="display_name">Display name</Label>
        <Input id="display_name" name="display_name" defaultValue={profile?.display_name ?? ''} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="phone_number">Phone number</Label>
        <Input id="phone_number" name="phone_number" placeholder="09XXXXXXXXX" defaultValue={profile?.phone_number ?? ''} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="gcash_name">GCash name</Label>
        <Input id="gcash_name" name="gcash_name" defaultValue={profile?.gcash_name ?? ''} required />
        <p className="text-xs text-muted-foreground">The name registered on your GCash account</p>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 5: Verify profile gate manually**

1. Log in with your test account
2. Visit `http://localhost:3000/me/bids` (profile is incomplete) — confirm redirect to `/me/profile`
3. Fill in phone + GCash name → save
4. Visit `/me/bids` again — confirm you can now access it (even though it's empty)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add profile page with completion gate"
```

---

## Phase 1 Deploy Checkpoint

- [ ] Push to Vercel: connect repo in Vercel dashboard, add env vars (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app)
- [ ] In Supabase dashboard → Authentication → URL Configuration: add `https://your-app.vercel.app/auth/callback` to Redirect URLs
- [ ] In Google Cloud Console (if using Google OAuth): add the Vercel URL as an authorized redirect URI
- [ ] Smoke test on production: sign up, complete profile, sign out, sign in with email

```bash
git push origin main
```

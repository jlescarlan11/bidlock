# UI Consistency — Semantic Token Layer + Tailwind-Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the missing shadcn CSS token layer with a violet brand palette, migrate landing page components from raw color classes to semantic tokens, remove static inline styles from the hero carousel, and de-dupe the shared gradient utility.

**Architecture:** All brand color decisions live in `globals.css` `:root`. Tailwind utilities (`bg-primary`, `bg-muted`, `text-foreground`, etc.) map to those CSS vars via `@theme inline`. Components reference tokens — never raw colors — except deliberate one-off design surfaces (hero background, trust strip, gradients). Inner pages already use shadcn tokens; they pick up the brand automatically once the token layer is in place.

**Tech Stack:** Next.js 15 (App Router), Tailwind CSS v4 (`@import "tailwindcss"`), shadcn/ui base-nova style, TypeScript, pnpm

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app/globals.css` | Modify | CSS variable foundation + `@theme inline` |
| `components/hero-carousel.tsx` | Modify | Remove static inline styles, keep dynamic ones |
| `lib/utils/card-gradient.ts` | **Create** | Shared gradient array + hash function |
| `components/landing-hero.tsx` | Modify | Import shared gradient, migrate raw colors to tokens |
| `components/listing-card.tsx` | Modify | Import shared gradient, migrate raw colors to tokens |
| `app/page.tsx` | Modify | Migrate raw colors to tokens |
| `components/nav.tsx` | Modify | Migrate raw colors to tokens |
| `components/nav-wrapper.tsx` | Modify | Migrate border color to token |

---

### Task 1: Token Foundation

**Files:**
- Modify: `app/globals.css`

The Input component (`components/ui/input.tsx`) uses `border border-input` for its border — so `--input` maps to the border color, not the background. Set it to `violet-100` so input borders match card borders.

- [ ] **Step 1: Replace contents of `app/globals.css`**

Current file is only `@import "tailwindcss";`. Replace with:

```css
@import "tailwindcss";

:root {
  --background:           var(--color-white);
  --foreground:           var(--color-stone-950);
  --primary:              var(--color-violet-600);
  --primary-foreground:   var(--color-white);
  --muted:                var(--color-stone-50);
  --muted-foreground:     var(--color-gray-500);
  --card:                 var(--color-white);
  --card-foreground:      var(--color-stone-950);
  --border:               var(--color-violet-100);
  --input:                var(--color-violet-100);
  --ring:                 var(--color-violet-600);
  --secondary:            var(--color-violet-100);
  --secondary-foreground: var(--color-violet-900);
  --accent:               var(--color-violet-100);
  --accent-foreground:    var(--color-violet-900);
  --destructive:          var(--color-red-600);
  --radius:    0.5rem;
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}

@theme inline {
  --color-background:           var(--background);
  --color-foreground:           var(--foreground);
  --color-primary:              var(--primary);
  --color-primary-foreground:   var(--primary-foreground);
  --color-muted:                var(--muted);
  --color-muted-foreground:     var(--muted-foreground);
  --color-card:                 var(--card);
  --color-card-foreground:      var(--card-foreground);
  --color-border:               var(--border);
  --color-input:                var(--input);
  --color-ring:                 var(--ring);
  --color-secondary:            var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-accent:               var(--accent);
  --color-accent-foreground:    var(--accent-foreground);
  --color-destructive:          var(--destructive);
  --radius-sm:                  var(--radius-sm);
  --radius-md:                  var(--radius-md);
  --radius-lg:                  var(--radius-lg);
  --radius-xl:                  var(--radius-xl);
}
```

- [ ] **Step 2: Start the dev server**

```bash
pnpm dev
```

Open `http://localhost:3000`. Verify these things one by one before moving to the next task:

- Landing page: hero section still violet-50 background, carousel still works, trust strip still dark violet
- Scroll down — reassurance cards now stone-50 background (light gray, not violet) with violet-100 borders — this is expected
- Nav logo is violet — it uses raw `text-violet-600` still; will be updated in Task 6
- Open `http://localhost:3000/auth/login` — card should now have a visible white background and visible borders (were transparent before)
- **Opacity check:** hover a reassurance card and inspect whether `hover:border-violet-300` still renders correctly (it will; it hasn't been changed yet)

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -F - <<'EOF'
feat: wire up CSS token foundation — violet brand via @theme inline

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
```

---

### Task 2: Carousel Cleanup

**Files:**
- Modify: `components/hero-carousel.tsx`

Four `style={{}}` blocks exist. Static properties move to `className`. Dynamic ones (computed from runtime state) stay in `style`.

- [ ] **Step 1: Fix the track `<div>` — remove `display: 'flex'`**

Find this block (around line 79):
```tsx
<div
  style={{
    display: 'flex',
    width: `${(extLen / VISIBLE) * 100}%`,
    transform: `translateX(-${(current / extLen) * 100}%)`,
    transition: animated ? 'transform 440ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
  }}
>
```

Replace with:
```tsx
<div
  className="flex"
  style={{
    width: `${(extLen / VISIBLE) * 100}%`,
    transform: `translateX(-${(current / extLen) * 100}%)`,
    transition: animated ? 'transform 440ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
  }}
>
```

- [ ] **Step 2: Fix the slot `<div>` — remove `padding`, `flexShrink`, `zIndex`**

Find this block (around line 94):
```tsx
<div
  key={`${id}-${i}`}
  style={{
    width: `${100 / extLen}%`,
    padding: '0 8px',
    flexShrink: 0,
    zIndex: isCenter ? 20 : 10,
    transform: `scale(${scale})`,
    filter: `brightness(${brightness})`,
    transition: animated
      ? 'transform 440ms cubic-bezier(0.4, 0, 0.2, 1), filter 440ms ease'
      : 'none',
  }}
>
```

Replace with:
```tsx
<div
  key={`${id}-${i}`}
  className={`px-2 shrink-0 ${isCenter ? 'z-20' : 'z-10'}`}
  style={{
    width: `${100 / extLen}%`,
    transform: `scale(${scale})`,
    filter: `brightness(${brightness})`,
    transition: animated
      ? 'transform 440ms cubic-bezier(0.4, 0, 0.2, 1), filter 440ms ease'
      : 'none',
  }}
>
```

- [ ] **Step 3: Fix the `<Link>` — remove `aspectRatio` and `display`**

Find:
```tsx
<Link
  href={`/listings/${id}`}
  style={{ aspectRatio: '3/4', display: 'block' }}
  className="group relative rounded-2xl overflow-hidden"
>
```

Replace with:
```tsx
<Link
  href={`/listings/${id}`}
  className="group relative rounded-2xl overflow-hidden block aspect-[3/4]"
>
```

- [ ] **Step 4: Fix the title `<p>` — remove `textShadow`**

Find:
```tsx
<p
  className="text-white font-normal text-xs line-clamp-2 text-center"
  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
>{title}</p>
```

Replace with:
```tsx
<p className="text-white font-normal text-xs line-clamp-2 text-center [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">{title}</p>
```

- [ ] **Step 5: Verify carousel still works**

On `http://localhost:3000` with dev server running:
- Carousel slides automatically every 5 seconds
- Center card is visibly larger (scale 1.15) and brighter than side cards
- Hovering a card reveals countdown timer and price
- Card titles are readable (text shadow visible on bright images)
- No layout shift or clipping

- [ ] **Step 6: Commit**

```bash
git add components/hero-carousel.tsx
git commit -F - <<'EOF'
refactor: carousel static inline styles → Tailwind classes

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
```

---

### Task 3: Extract Shared Gradient Utility

**Files:**
- Create: `lib/utils/card-gradient.ts`

Uses the 6-gradient set currently in `listing-card.tsx`. Landing hero currently has 4 — it gets the extra two for free.

- [ ] **Step 1: Create `lib/utils/card-gradient.ts`**

```ts
export const CARD_GRADIENTS = [
  'from-violet-100 to-purple-50',
  'from-orange-100 to-amber-50',
  'from-teal-100 to-emerald-50',
  'from-rose-100 to-pink-50',
  'from-blue-100 to-sky-50',
  'from-yellow-100 to-lime-50',
]

export function cardGradient(id: string): string {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return CARD_GRADIENTS[hash % CARD_GRADIENTS.length]
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/utils/card-gradient.ts
git commit -F - <<'EOF'
feat: extract shared cardGradient utility

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
```

---

### Task 4: Migrate `landing-hero.tsx` and `listing-card.tsx`

**Files:**
- Modify: `components/landing-hero.tsx`
- Modify: `components/listing-card.tsx`

- [ ] **Step 1: Replace `components/landing-hero.tsx`**

Delete the local `CARD_GRADIENTS` array and `cardGradient` function. Add the import. Replace raw colors with tokens. `bg-violet-50` on the section stays raw — it's a deliberate hero design surface, not a generic muted zone.

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import HeroCarousel, { type CarouselListing } from './hero-carousel'
import { cardGradient } from '@/lib/utils/card-gradient'

type HeroListing = {
  id: string
  title: string
  current_bid: number
  ends_at: string
  listing_photos: { storage_path: string; display_order: number }[]
}

export default async function LandingHero({ listings }: { listings: HeroListing[] }) {
  const supabase = await createClient()

  const carouselListings: CarouselListing[] = listings.slice(0, 10).map(listing => {
    const photo = listing.listing_photos[0]
    const photoUrl = photo
      ? supabase.storage.from('listing-photos').getPublicUrl(photo.storage_path).data.publicUrl
      : null
    return {
      id: listing.id,
      title: listing.title,
      current_bid: listing.current_bid,
      ends_at: listing.ends_at,
      photoUrl,
      gradient: cardGradient(listing.id),
    }
  })

  return (
    <section className="bg-violet-50 min-h-[calc(100vh-3.5rem)] flex items-center">
      <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-16">

        {/* Left — text + CTAs + stats */}
        <div>
          <p className="text-[11px] font-bold tracking-[0.18em] text-primary uppercase mb-5">
            Live Auctions · PH
          </p>
          <h1 className="text-5xl lg:text-7xl font-black leading-[1.05] mb-6 text-foreground">
            Going once.<br />
            Going twice.<br />
            <span className="text-primary">Yours.</span>
          </h1>
          <div className="flex items-center gap-5 mb-10">
            <a
              href="#live-auctions"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 rounded-full text-[15px] font-bold hover:bg-primary/90 active:scale-95 transition-all"
            >
              <span aria-hidden="true">🔨</span> Place a Bid
            </a>
            <Link
              href="/listings/new"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Sell an item <span aria-hidden="true">→</span>
            </Link>
          </div>
          {/* Social proof strip */}
          <div className="flex items-center gap-6">
            <div>
              <p className="text-2xl font-black text-foreground leading-none">2.3K+</p>
              <p className="text-xs text-muted-foreground mt-1">Items sold</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="text-2xl font-black text-foreground leading-none">847</p>
              <p className="text-xs text-muted-foreground mt-1">Active bids</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="text-2xl font-black text-foreground leading-none">₱4.2M+</p>
              <p className="text-xs text-muted-foreground mt-1">Total sold</p>
            </div>
          </div>
        </div>

        {/* Right — carousel + tagline */}
        <div>
          <HeroCarousel listings={carouselListings} />
          <p className="text-sm text-muted-foreground text-center mt-4 leading-relaxed">
            Win real items at real prices. Pay instantly via GCash. No deposits, no stress.
          </p>
        </div>

      </div>
    </section>
  )
}
```

- [ ] **Step 2: Replace `components/listing-card.tsx`**

Delete the local `CARD_GRADIENTS` and `cardGradient`. Add the import. Replace raw colors with tokens.

```tsx
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import Countdown from './countdown'
import { formatPHP } from '@/lib/utils/currency'
import { cardGradient } from '@/lib/utils/card-gradient'

type Props = {
  listing: {
    id: string
    title: string
    current_bid: number
    ends_at: string
    listing_photos: { storage_path: string; display_order: number }[]
  }
}

export default async function ListingCard({ listing }: Props) {
  const supabase = await createClient()
  const photo = listing.listing_photos[0]
  const photoUrl = photo
    ? supabase.storage.from('listing-photos').getPublicUrl(photo.storage_path).data.publicUrl
    : null

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="block bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md hover:border-primary/30 transition-all"
    >
      <div className={`aspect-square bg-gradient-to-br ${cardGradient(listing.id)} relative`}>
        {photoUrl && (
          <Image src={photoUrl} alt={listing.title} fill className="object-cover" />
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="font-bold text-sm text-foreground line-clamp-2">{listing.title}</p>
        <p className="text-xs text-orange-600 font-semibold flex items-center gap-1">
          <span aria-hidden="true">⏱</span>
          <Countdown endsAt={listing.ends_at} />
        </p>
        <p className="text-base font-black text-primary">{formatPHP(listing.current_bid)}</p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Verify in browser**

On `http://localhost:3000`:
- Hero left column: headings stone-950 (`text-foreground`), eyebrow and CTA violet, stats dividers violet-100
- Hero CTA button: still violet-600
- Stats numbers: stone-950
- Tagline below carousel: gray-500 (`text-muted-foreground`)
- Listing cards grid: white card background, violet-100 border, price in violet-600, hover border darkens slightly
- Carousel gradient backgrounds still render (now pulls from 6-color set)

- [ ] **Step 4: Commit**

```bash
git add components/landing-hero.tsx components/listing-card.tsx
git commit -F - <<'EOF'
refactor: migrate landing-hero + listing-card to shared gradient and semantic tokens

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
```

---

### Task 5: Migrate `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

Make these targeted class replacements. Trust strip block (`bg-violet-900`, `text-violet-200`) is untouched.

- [ ] **Step 1: Update the "Before you bid" eyebrow (line 38)**

```tsx
// Before
<p className="text-[11px] font-bold tracking-[0.18em] text-violet-500 uppercase text-center mb-3">

// After
<p className="text-[11px] font-bold tracking-[0.18em] text-primary uppercase text-center mb-3">
```

- [ ] **Step 2: Update the "Simple. Transparent. Fair." heading (line 41)**

```tsx
// Before
<h2 className="text-3xl font-black text-stone-950 text-center mb-10">

// After
<h2 className="text-3xl font-black text-foreground text-center mb-10">
```

- [ ] **Step 3: Update the reassurance cards (line 62)**

```tsx
// Before
<div key={title} className="bg-violet-50 rounded-2xl p-6 border border-violet-100 hover:border-violet-300 transition-colors">

// After
<div key={title} className="bg-muted rounded-2xl p-6 border border-border hover:border-primary/40 transition-colors">
```

Note: `hover:border-primary/40` renders as violet-600 at 40% opacity — visually close to violet-300 but not identical. Acceptable drift. If it looks wrong in the browser, revert the hover class to `hover:border-violet-300`.

- [ ] **Step 4: Update the reassurance card body text (line 65)**

```tsx
// Before
<p className="text-sm text-gray-500 leading-relaxed">{body}</p>

// After
<p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
```

- [ ] **Step 5: Update the "Live Auctions" heading (line 75)**

```tsx
// Before
<h2 className="text-2xl font-black text-stone-950 flex items-center gap-3">

// After
<h2 className="text-2xl font-black text-foreground flex items-center gap-3">
```

- [ ] **Step 6: Verify in browser**

On `http://localhost:3000` scroll past the hero:
- "Before you bid" eyebrow: primary violet
- "Simple. Transparent. Fair." heading: stone-950 (`text-foreground`)
- Reassurance cards: stone-50 background, violet-100 border
- Hover a reassurance card: border darkens toward violet-600/40
- "Live Auctions" heading: stone-950
- Trust strip: unchanged — dark violet band, violet-200 text

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx
git commit -F - <<'EOF'
refactor: migrate app/page.tsx raw colors to semantic tokens

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
```

---

### Task 6: Migrate `nav.tsx` and `nav-wrapper.tsx`

**Files:**
- Modify: `components/nav.tsx`
- Modify: `components/nav-wrapper.tsx`

- [ ] **Step 1: Replace `components/nav.tsx`**

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'

export default async function Nav() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()

  let isAdmin = false
  if (user) {
    const { data: profile } = await db
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    isAdmin = profile?.is_admin ?? false
  }

  return (
    <nav className="px-6 h-14 flex items-center justify-between max-w-7xl mx-auto">
      <Link href="/" className="font-black text-xl text-primary tracking-tight">BidLock</Link>
      <div className="flex items-center gap-5 text-sm">
        {user ? (
          <>
            <Link href="/#live-auctions" className="text-muted-foreground hover:text-foreground transition-colors">Auctions</Link>
            <Link href="/listings/new" className="text-muted-foreground hover:text-foreground transition-colors">Sell</Link>
            <Link href="/me/listings" className="text-muted-foreground hover:text-foreground transition-colors">My listings</Link>
            <Link href="/me/bids" className="text-muted-foreground hover:text-foreground transition-colors">My bids</Link>
            <Link href="/me/profile" className="text-muted-foreground hover:text-foreground transition-colors">Profile</Link>
            {isAdmin && <Link href="/admin" className="text-primary hover:text-primary/80 font-semibold transition-colors">Admin</Link>}
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit" className="text-muted-foreground hover:text-foreground">Sign out</Button>
            </form>
          </>
        ) : (
          <>
            <Link href="/#live-auctions" className="text-muted-foreground hover:text-foreground transition-colors">Auctions</Link>
            <Link href="/auth/login" className="text-muted-foreground hover:text-foreground font-medium transition-colors">Sign in</Link>
            <Button size="sm" nativeButton={false} render={<Link href="/auth/signup" />}>
              Sign up
            </Button>
          </>
        )}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Update `components/nav-wrapper.tsx` — border only**

Only `border-violet-100` → `border-border`. The `bg-violet-50` transparent nav state stays raw — it must match the hero section's explicit `bg-violet-50`.

```tsx
'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function NavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!isHome) return
    const handler = () => setScrolled(window.scrollY > 10)
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [isHome])

  const white = !isHome || scrolled

  return (
    <header
      className={`sticky top-0 z-10 transition-colors duration-300 ${
        white ? 'bg-white border-b border-border' : 'bg-violet-50'
      }`}
    >
      {children}
    </header>
  )
}
```

- [ ] **Step 3: Full visual regression check**

Visit each of these and confirm no breakage:

| Page | What to check |
|---|---|
| `http://localhost:3000` | Logo violet, nav links muted-gray, hero intact, trust strip intact, carousel intact |
| Scroll down on home | Nav transitions to white with faint violet bottom border |
| `http://localhost:3000/auth/login` | Card has white bg + violet-tinted border, input borders violet-100, Sign in button violet-600 |
| `http://localhost:3000/listings/[any-live-id]` | Bid info box stone-50 (`bg-muted`), primary button violet |
| `/admin` (if admin account) | Form borders consistent, no jarring violet saturation |

- [ ] **Step 4: Commit**

```bash
git add components/nav.tsx components/nav-wrapper.tsx
git commit -F - <<'EOF'
refactor: migrate nav + nav-wrapper to semantic tokens

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
```

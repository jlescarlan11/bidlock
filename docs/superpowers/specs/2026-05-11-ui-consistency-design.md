# UI Consistency — Tailwind-Only + Semantic Token Layer

**Date:** 2026-05-11
**Status:** Approved

## Problem

Two separate issues that compound each other:

1. `hero-carousel.tsx` mixes inline `style={{}}` blocks with Tailwind classes. Most of those inline styles are static values that Tailwind can express directly.

2. `globals.css` only has `@import "tailwindcss"` — no `:root` CSS variable definitions. This means `bg-muted`, `bg-primary`, `bg-card`, `text-muted-foreground`, etc. in inner pages (`/listings/[id]`, `/auth/login`) are **currently unresolved** (rendering as transparent/default). The shadcn token system was initialized but never wired up.

3. The landing page uses raw Tailwind color classes (`bg-violet-50`, `text-stone-950`, `text-violet-600`) while inner pages use shadcn semantic tokens (`bg-muted`, `text-foreground`). These two systems are disconnected.

4. `CARD_GRADIENTS` and `cardGradient()` are duplicated verbatim between `landing-hero.tsx` and `listing-card.tsx`.

## Approach: Semantic Token Layer (Option C, Staged)

Define the violet brand as CSS variables in `globals.css`. Map shadcn tokens to those variables. Components reference semantic tokens — never raw color classes. Rebranding later = change three variables.

Inner pages: neutral base (white background), violet accents (borders, buttons, key text). Not violet-everywhere.

## Design

### Track 1: Token Foundation (`app/globals.css`)

Add two blocks after `@import "tailwindcss"`:

**`:root` block** — defines brand using Tailwind v4's built-in color vars:

```css
:root {
  --background:           var(--color-white);
  --foreground:           var(--color-stone-950);
  --primary:              var(--color-violet-600);
  --primary-foreground:   var(--color-white);
  --muted:                var(--color-violet-50);
  --muted-foreground:     var(--color-gray-500);
  --card:                 var(--color-white);
  --card-foreground:      var(--color-stone-950);
  --border:               var(--color-violet-100);
  --input:                var(--color-white);
  --ring:                 var(--color-violet-600);
  --secondary:            var(--color-violet-100);
  --secondary-foreground: var(--color-violet-900);
  --accent:               var(--color-violet-100);
  --accent-foreground:    var(--color-violet-900);
  --destructive:          var(--color-red-600);
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}
```

**`@theme inline` block** — wires Tailwind utilities to those vars:

```css
@theme inline {
  --color-background:          var(--background);
  --color-foreground:          var(--foreground);
  --color-primary:             var(--primary);
  --color-primary-foreground:  var(--primary-foreground);
  --color-muted:               var(--muted);
  --color-muted-foreground:    var(--muted-foreground);
  --color-card:                var(--card);
  --color-card-foreground:     var(--card-foreground);
  --color-border:              var(--border);
  --color-input:               var(--input);
  --color-ring:                var(--ring);
  --color-secondary:           var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-accent:              var(--accent);
  --color-accent-foreground:   var(--accent-foreground);
  --color-destructive:         var(--destructive);
  --radius-sm:                 var(--radius-sm);
  --radius-md:                 var(--radius-md);
  --radius-lg:                 var(--radius-lg);
  --radius-xl:                 var(--radius-xl);
}
```

Result: `bg-muted` = violet-50, `text-foreground` = stone-950, `bg-primary` = violet-600, `border` (as border color) = violet-100.

### Track 2: Landing Page Migration

Replace raw color classes with semantic tokens where semantically appropriate. Design-specific one-offs stay raw.

**`components/landing-hero.tsx`:**
- `text-stone-950` → `text-foreground`
- `text-violet-600`, `text-violet-500` → `text-primary`
- `text-gray-400`, `text-gray-500` → `text-muted-foreground`
- `bg-violet-200` (divider lines) → `bg-border`

**`app/page.tsx`:**
- `bg-violet-50` (reassurance cards) → `bg-muted`
- `border-violet-100` → `border-border`
- `hover:border-violet-300` → `hover:border-primary/40`
- `text-stone-950` → `text-foreground`
- `text-gray-400`, `text-gray-500` → `text-muted-foreground`
- `text-violet-500` (eyebrow labels) → `text-primary`

**`components/listing-card.tsx`:**
- `border-violet-100` → `border-border`
- `hover:border-violet-200` → `hover:border-primary/30`
- `text-stone-900` → `text-foreground`
- `text-violet-600` (price) → `text-primary`

**`components/nav.tsx`:**
- `text-violet-600` (logo) → `text-primary`
- `text-gray-500`, `text-gray-600` → `text-muted-foreground`

**`components/nav-wrapper.tsx`:**
- `border-violet-100` → `border-border`
- `bg-violet-50` (transparent nav state on home) → `bg-muted`

**Inner pages — no changes needed:**
`/listings/[id]`, `/auth/login`, `/auth/signup`, `/admin/*`, `/me/*` already use shadcn tokens (`bg-muted`, `text-muted-foreground`, `bg-primary` via Button). They automatically pick up the violet brand once Track 1 is in place.

**Stays raw (intentional design choices, not semantic):**
- `bg-violet-900` trust strip — one-off dark band
- `text-violet-200` inside trust strip
- `bg-orange-600` LIVE badge — orange, not brand
- All gradient classes (`from-violet-100 to-purple-50` etc.) — decoration
- `text-[11px]`, `tracking-[0.18em]` — fine-tuned typographic values

### Track 3: Carousel Cleanup (`components/hero-carousel.tsx`)

**Static inline styles → Tailwind classes:**

| Inline | Tailwind |
|---|---|
| `display: 'flex'` | `flex` |
| `padding: '0 8px'` | `px-2` |
| `flexShrink: 0` | `shrink-0` |
| `zIndex: isCenter ? 20 : 10` | `isCenter ? 'z-20' : 'z-10'` (in className) |
| `display: 'block'` | `block` |
| `aspectRatio: '3/4'` | `aspect-[3/4]` |
| `textShadow: '0 1px 2px rgba(0,0,0,0.3)'` | `[text-shadow:0_1px_2px_rgba(0,0,0,0.3)]` |

**Dynamic inline styles — stay as `style={{}}` (runtime-computed):**
- `width: ${(extLen / VISIBLE) * 100}%` — depends on live item count
- `transform: translateX(-${...}%)` — animation offset from state
- `transform: scale(${scale})` — coverflow depth
- `filter: brightness(${brightness})` — coverflow dim
- `transition: animated ? '...' : 'none'` — animation toggle

### Track 4: CARD_GRADIENTS De-dupe

Extract to `lib/utils/card-gradient.ts`. Use the 6-gradient set (currently in `listing-card.tsx`). Both `landing-hero.tsx` (currently 4 gradients) and `listing-card.tsx` import from the shared module.

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

## Execution Order

1. `globals.css` — token foundation (unblocks everything else)
2. `hero-carousel.tsx` — carousel cleanup (self-contained, no deps)
3. `lib/utils/card-gradient.ts` — extract shared utility
4. `landing-hero.tsx` + `listing-card.tsx` — import shared gradient, migrate tokens
5. `app/page.tsx` — migrate tokens
6. `components/nav.tsx` — migrate tokens
7. Visual check — confirm no regressions on landing page and inner pages

## Out of Scope

- Inner page layout changes (listing detail, auth, admin, profile)
- Dark mode support
- Any new features or components

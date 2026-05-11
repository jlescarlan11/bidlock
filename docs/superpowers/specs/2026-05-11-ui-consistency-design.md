# UI Consistency — Tailwind-Only + Semantic Token Layer

**Date:** 2026-05-11
**Status:** Approved (revised)

## Problem

Four separate issues that compound each other:

1. `hero-carousel.tsx` mixes inline `style={{}}` blocks with Tailwind classes. Most of those inline styles are static values that Tailwind can express directly.

2. `globals.css` only has `@import "tailwindcss"` — no `:root` CSS variable definitions. This means `bg-muted`, `bg-primary`, `bg-card`, `text-muted-foreground`, etc. in inner pages (`/listings/[id]`, `/auth/login`) are **currently unresolved** (rendering as transparent/default). The shadcn token system was initialized but never wired up.

3. The landing page uses raw Tailwind color classes (`bg-violet-50`, `text-stone-950`, `text-violet-600`) while inner pages use shadcn semantic tokens (`bg-muted`, `text-foreground`). These two systems are disconnected.

4. `CARD_GRADIENTS` and `cardGradient()` are duplicated verbatim between `landing-hero.tsx` and `listing-card.tsx`.

## Approach: Semantic Token Layer (Option C, Staged)

Define the violet brand as CSS variables in `globals.css`. Map shadcn tokens to those variables. Components reference semantic tokens — never raw color classes. Rebranding later = change a handful of variables.

Design intent: inner pages use a **neutral base** (white background, stone muted surfaces), violet shows up through **accents** — primary buttons, tinted borders, ring. Not violet-everywhere.

## Design

### Track 1: Token Foundation (`app/globals.css`)

Add two blocks after `@import "tailwindcss"`:

**`:root` block:**

```css
:root {
  --background:           var(--color-white);
  --foreground:           var(--color-stone-950);
  --primary:              var(--color-violet-600);
  --primary-foreground:   var(--color-white);
  --muted:                var(--color-stone-50);     /* neutral — not violet */
  --muted-foreground:     var(--color-gray-500);
  --card:                 var(--color-white);
  --card-foreground:      var(--color-stone-950);
  --border:               var(--color-violet-100);   /* faint violet tint on borders */
  --input:                var(--color-white);         /* input bg; border uses --border */
  --ring:                 var(--color-violet-600);
  --secondary:            var(--color-violet-100);
  --secondary-foreground: var(--color-violet-900);
  --accent:               var(--color-violet-100);
  --accent-foreground:    var(--color-violet-900);
  --destructive:          var(--color-red-600);
  --radius:    0.5rem;   /* shadcn's default var(--radius) reference */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}
```

**`@theme inline` block:**

```css
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

**Token choices and rationale:**

- `--muted: stone-50` (not violet-50) — shadcn uses `bg-muted` for skeleton loaders, hover states, disabled inputs, table stripes. Violet-tinted muted contaminates all of those. Brand comes through via `--primary`, `--border`, `--accent`, `--ring`.
- `--border: violet-100` — faint violet tint on all card/input/separator borders. Smaller blast radius than muted. Verify it reads correctly on `/admin/*` form-heavy pages before committing; if it reads off, fall back to `stone-200` and use explicit `border-primary/20` where violet tint is wanted.
- `--input: white` (background); border on inputs uses `border-input` in shadcn components, which maps to `--color-input`. Since we want input borders to match card borders (violet-100), set `--input: var(--color-violet-100)` if inputs use `border-input` for their border — check the Input component to confirm which var it references.
- `--radius` (singular, 0.5rem) — several shadcn components reference `var(--radius)` directly, not `--radius-md`. Omitting it causes square corners in those components.
- `hover:border-primary/40` — Tailwind v4 opacity modifiers work on CSS-var-backed colors only when the resolved value is in oklch/hsl/rgb form. Since this chains `var()` → `var()` → Tailwind's built-in oklch color, it should work. **Test this early** (step 1.5 in execution order). If `/40` renders as solid, the chain broke; revert to explicit `hover:border-violet-300`.

### Track 2: Landing Page Migration

Replace raw color classes with semantic tokens where semantically appropriate. Design-specific surfaces stay raw.

**`components/landing-hero.tsx`:**
- `text-stone-950` → `text-foreground`
- `text-violet-600`, `text-violet-500` → `text-primary`
- `text-gray-400`, `text-gray-500` → `text-muted-foreground`
- `bg-violet-200` (divider lines) → `bg-border`

**`app/page.tsx`:**
- `bg-violet-50` (reassurance cards) → `bg-muted` *(now stone-50; violet still shows via border-border)*
- `border-violet-100` → `border-border`
- `hover:border-violet-300` → `hover:border-primary/40` *(small visual drift — violet-600/40 ≈ violet-300 but not identical; acceptable, or leave raw if pixel-perfect is required)*
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

**Inner pages — no changes needed:**
`/listings/[id]`, `/auth/login`, `/auth/signup`, `/admin/*`, `/me/*` already use shadcn tokens. They pick up the violet brand automatically once Track 1 is in place.

**Stays raw (intentional design choices, not semantic):**
- `bg-violet-900` trust strip — one-off dark band
- `text-violet-200` inside trust strip
- `bg-orange-600` LIVE badge — orange, not brand
- `bg-violet-50` on hero section (`landing-hero.tsx`) — deliberate brand surface, not a generic muted zone
- `bg-violet-50` on nav transparent state (`nav-wrapper.tsx`) — must match hero background; migrating to `bg-muted` (stone-50) would break the visual blend
- All gradient classes (`from-violet-100 to-purple-50` etc.) — decoration
- `text-[11px]`, `tracking-[0.18em]` — fine-tuned typographic values
- `hover:border-violet-300` on reassurance cards — leave raw if drift from `hover:border-primary/40` is unacceptable

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

`[text-shadow:...]` is a Tailwind v4 arbitrary property — technically not hardcoded CSS but functionally the same string with different punctuation. Acceptable here because it's a single one-off use. If this shadow is ever needed elsewhere, promote it to a `@utility` in `globals.css`.

**Dynamic inline styles — stay as `style={{}}` (runtime-computed, cannot be static classes):**
- `width: ${(extLen / VISIBLE) * 100}%` — depends on live item count
- `transform: translateX(-${...}%)` — animation offset from state
- `transform: scale(${scale})` — coverflow depth
- `filter: brightness(${brightness})` — coverflow dim
- `transition: animated ? '...' : 'none'` — animation toggle

### Track 4: CARD_GRADIENTS De-dupe

Extract to `lib/utils/card-gradient.ts`. Use the 6-gradient set (currently in `listing-card.tsx`). Both `landing-hero.tsx` (currently 4 gradients) and `listing-card.tsx` import from the shared module. Landing hero gets the two extra gradients for free.

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
2. **Boot dev server. Confirm landing page renders identically before touching any component.** The token layer alone can shift things subtly if a class was doing something unexpected. Catch it before stacking migration commits on top.
3. `hero-carousel.tsx` — carousel cleanup (self-contained, no deps)
4. `lib/utils/card-gradient.ts` — extract shared gradient utility
5. `landing-hero.tsx` + `listing-card.tsx` — import shared gradient, migrate tokens
6. `app/page.tsx` — migrate tokens
7. `components/nav.tsx` + `components/nav-wrapper.tsx` — migrate tokens
8. Visual check — landing page, listing detail, auth, admin — confirm no regressions

## Out of Scope

- Inner page layout changes (listing detail, auth, admin, profile)
- Dark mode support
- Any new features or components

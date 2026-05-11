# BidLock — New Listing Page: Details Step Redesign

**Date:** 2026-05-11
**Scope:** `app/listings/new/page.tsx`, `app/listings/new/steps/details-step.tsx`, two new components
**Out of scope:** Photos step, Review step, routing, API calls, feed card itself

---

## Problem

The Details step renders in a `max-w-lg` centered column, leaving most of a desktop viewport empty. Sellers have no feedback on how their listing will look to bidders, which contributes to sparse or low-quality listings.

## Goal

Split the Details step into a two-column layout: form on the left, live preview card on the right. The preview mirrors the public `ListingCard` 1:1 and updates on every keystroke.

---

## Architecture

**State ownership:** `page.tsx` owns a `PreviewDraft` state (`title`, `startingBid`, `durationDays`). `DetailsStep` emits changes via an optional `onPreviewChange(draft: PreviewDraft)` callback, driven by react-hook-form's `watch()`. This keeps `DetailsStep` form-focused and layout/orchestration in the container.

**Why not lift all state to `page.tsx`:** `DetailsStep` already uses react-hook-form with `zodResolver`. Replacing that with manual `useState` + Zod is a bigger refactor with no UX gain.

**Why not put the layout inside `DetailsStep`:** Layout is a container concern. `DetailsStep` rendering a two-column grid would make it responsible for layout, which breaks the single-responsibility boundary.

---

## Files

### 1. `app/listings/new/page.tsx` (modified)

**Container width:** Change from `max-w-lg mx-auto p-4 pt-8` to `max-w-[1100px] mx-auto px-6 pt-8`.

**New state:**
```ts
const [previewDraft, setPreviewDraft] = useState<PreviewDraft>({
  title: '',
  startingBid: 0,
  durationDays: 3,
})
```

**Layout when `step === 0`:**
```
<div className="lg:grid lg:grid-cols-[480px_400px] lg:gap-12 lg:justify-center">
  {/* Left column */}
  <div>
    {/* Step indicator */}
    {/* FeeDisclosureCallout */}
    <DetailsStep ... onPreviewChange={setPreviewDraft} />
  </div>
  {/* Right column */}
  <div className="hidden lg:block">
    <div className="sticky top-24">
      <ListingPreviewCard {...previewDraft} />
    </div>
  </div>
</div>
```

**Responsive behavior:**
- `lg` (≥1024px): two-column grid as above; preview visible
- `md` (768–1023px): single column, preview rendered below the form (remove `hidden lg:block`, add `mt-8 lg:mt-0`)
- `<768px`: same as md — stacked, preview below form, not collapsible

**Step indicator:** Stays in `page.tsx`. No changes to its markup or styles.

**Fee disclosure:** Move the `<p>` text out of `page.tsx` and replace with `<FeeDisclosureCallout>` as the first item inside the left column div, below the step indicator.

**Step 1 and 2 (Photos, Review):** Remain inside a `max-w-lg mx-auto` inner wrapper so they don't span the full 1100px.

**New `PreviewDraft` type:** Defined and exported from `details-step.tsx` (it represents what step 1 controls), then imported in `page.tsx`. This avoids a circular dependency (`page.tsx` → `details-step.tsx` → `page.tsx`):
```ts
// in details-step.tsx (exported)
export type PreviewDraft = {
  title: string
  starting_bid: number
  duration_days: number
}
// in page.tsx (imported)
import DetailsStep, { type PreviewDraft } from './steps/details-step'
```

---

### 2. `app/listings/new/steps/details-step.tsx` (modified)

**New prop:**
```ts
type Props = {
  defaultValues: Partial<ListingDetailsInput>
  onNext: (values: ListingDetailsInput) => void
  onPreviewChange?: (draft: PreviewDraft) => void
}
```

**Live preview sync:** Add a `useEffect` that subscribes to watched fields and calls `onPreviewChange`:
```ts
const watchedTitle    = watch('title')
const watchedBid      = watch('starting_bid')
const watchedDuration = watch('duration_days')

useEffect(() => {
  onPreviewChange?.({
    title: watchedTitle ?? '',
    starting_bid: Number(watchedBid) || 0,
    duration_days: Number(watchedDuration) || 3,
  })
}, [watchedTitle, watchedBid, watchedDuration, onPreviewChange])
```

Pass `setPreviewDraft` directly from `useState` (stable reference) — no `useCallback` needed.

**Remove** the fee disclosure `<p>` (moved to `page.tsx`).

**Field order and spacing:** `space-y-5` wrapper (up from `space-y-4`).

**Label style across all fields:** `<Label className="text-sm font-medium mb-1.5">` — consistent across all fields.

**Title input:**
- `<Input {...register('title')} placeholder="5–100 characters" />`
- Below on the right: `<p className={`text-xs text-right mt-1 ${titleLen > 100 ? 'text-destructive' : 'text-muted-foreground'}`}>{titleLen}/100</p>`
- `titleLen = (watchedTitle ?? '').length`

**Description textarea:**
- `<Textarea {...register('description')} placeholder="20–2000 characters" className="min-h-[120px] resize-y" />`
- Below on the right: `<p className="text-xs text-right mt-1 text-muted-foreground">{descLen}/2000</p>`
- No red cap since 2000 is hard to hit accidentally; muted only.

**Starting bid input — peso prefix:**
```tsx
<div className="relative">
  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">₱</span>
  <Input
    id="starting_bid"
    type="number"
    step="1"
    className="pl-7"
    placeholder="0.00"
    {...register('starting_bid')}
  />
</div>
```

**Duration select:** Options stay as-is: `1 day`, `3 days`, `7 days` (dictated by the existing validator `[1, 3, 7]`).

**Next button:** `<Button type="submit" className="w-full">Next: Photos →</Button>` — no change.

**Focus style:** shadcn's Input/Textarea/Select already use `focus-visible:ring-ring`. No override needed — existing ring color follows the CSS variable `--ring`, which is already violet/purple in BidLock's theme.

---

### 3. `components/listings/listing-preview-card.tsx` (new)

Pure client display component. No async, no Supabase calls.

**Props:** (snake_case matching `WizardData` / `PreviewDraft`)
```ts
type Props = {
  title: string
  starting_bid: number
  duration_days: number
}
```

**"Live preview" label** (rendered above the card in the parent, not inside the card component):
```tsx
<div className="flex items-center gap-2 mb-3">
  <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" aria-hidden />
  <p className="text-xs text-muted-foreground font-medium">Live preview</p>
</div>
```
This label is rendered in `page.tsx` above `<ListingPreviewCard>`, keeping the component self-contained.

**Card shell:** Mirror `ListingCard` exactly:
```
rounded-2xl border overflow-hidden bg-card
hover:shadow-xl hover:shadow-violet-200/60 hover:-translate-y-1 hover:border-primary/30
transition-all duration-200 ease-out
```

**Image area:**
```tsx
<div className="aspect-[4/3] bg-gray-100 relative overflow-hidden opacity-60">
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
    <Camera className="text-gray-400" size={28} aria-hidden />
    <p className="text-xs text-gray-400">Add photos in step 2</p>
  </div>

  {/* Timer pill — top-right, same classes as ListingCard gray state */}
  <div className="absolute top-2.5 right-2.5">
    {duration_days > 0 ? (
      <div className="bg-black/60 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 leading-none backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" aria-hidden />
        Ends in {duration_days}d
      </div>
    ) : (
      <div className="bg-black/30 text-white/60 text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 leading-none backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" aria-hidden />
        Ends in —d
      </div>
    )}
  </div>

  <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
</div>
```

**Card body:** Mirror `ListingCard` info section:
```tsx
<div className="p-3.5 border-t-2 border-transparent">
  {/* Title */}
  {title ? (
    <p className="text-sm font-bold text-foreground line-clamp-2 leading-snug mb-2">{title}</p>
  ) : (
    <p className="text-sm font-bold text-gray-400 line-clamp-2 leading-snug mb-2">Your listing title</p>
  )}

  {/* Price row */}
  <div className="flex items-center justify-between gap-2 mb-1">
    {starting_bid > 0 ? (
      <p className="text-xl font-black text-primary leading-none">{formatPHP(starting_bid)}</p>
    ) : (
      <p className="text-xl font-black text-gray-400 leading-none">₱0.00</p>
    )}
    {/* Bid count pill — grayed out, not interactive */}
    {/* 0 bids: no pill shown (mirrors actual card behavior) */}
  </div>

  {/* Activity line — always h-4, mirrors real card */}
  <p className="h-4 text-[10px] leading-4 text-gray-400 opacity-60">No bids yet</p>
</div>
```

**Note on "No bids yet":** The actual `ListingCard` renders "No bids yet" as activity text in the reserved `h-4` slot at the bottom of the card body — not as a pill beside the price. The preview mirrors this exactly. The `opacity-60` marks it as uncontrolled by step 1.

**`formatPHP` import:** `import { formatPHP } from '@/lib/utils/currency'`

---

### 4. `components/listings/fee-disclosure-callout.tsx` (new)

```tsx
import { Info } from 'lucide-react'

export default function FeeDisclosureCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-purple-50 border border-purple-100 rounded-md px-4 py-3 flex items-start gap-2 mb-5">
      <Info size={14} className="text-purple-500 mt-0.5 shrink-0" aria-hidden />
      <p className="text-sm text-purple-900">{children}</p>
    </div>
  )
}
```

Used in `page.tsx`:
```tsx
<FeeDisclosureCallout>
  Listing fees are non-refundable once your auction goes live.
</FeeDisclosureCallout>
```

---

## What does NOT change

- `PhotosStep` and `ReviewStep` — out of scope
- `ListingCard` component — no changes
- Routing, server actions, API calls
- The existing `listingDetailsSchema` validator (duration stays 1/3/7)
- The step indicator markup and styles

---

## Responsive summary

| Breakpoint | Layout |
|---|---|
| `< 768px` | Single column: step indicator → fee callout → form → preview (stacked, not collapsible) |
| `768px–1023px` | Single column, preview below form, max-w-[640px] centered |
| `≥ 1024px` | Two-column grid `[480px 400px]`, gap-12, preview sticky top-24 |

---

## New files

```
components/listings/listing-preview-card.tsx   (new)
components/listings/fee-disclosure-callout.tsx (new)
```

## Modified files

```
app/listings/new/page.tsx
app/listings/new/steps/details-step.tsx
```

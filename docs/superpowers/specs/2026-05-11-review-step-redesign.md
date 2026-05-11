# BidLock — New Listing Wizard: Review Step Redesign

**Date:** 2026-05-11
**Scope:** `app/listings/new/steps/review-step.tsx`, `app/listings/new/page.tsx`
**Out of scope:** Photos step (separate spec), Pay flow, back-navigation state preservation, routing

---

## Problem

The Review step is a plain key-value list with a photo count (not thumbnails), no edit affordances, a generic "Submit listing" CTA, and no final preview. Sellers commit money without seeing their actual card. The step breaks the visual rhythm established by the Details and Photos steps.

## Goal

- Two-column layout completing the preview-card through-line: summary with edit icons on the left, full-opacity final preview card on the right
- Field-level edit icons that navigate back to the appropriate step
- Photo thumbnail strip in the summary
- `FeeDisclosureCallout` restated as the final pre-submit reminder
- `Post listing →` CTA with `Posting...` loading state (spinner, not silent disable)
- Caption shift: "This is how your listing will appear to buyers"

---

## Architecture

`ReviewStep` receives `data: WizardData` (unchanged) and a new `onEditStep: (step: number) => void` prop that replaces `onBack`. The edit icons call `onEditStep(0)` for Details fields and `onEditStep(1)` for Photos.

`ReviewStep` manages its own blob URLs for the photo thumbnail strip (created from `data.photos: File[]` via `useEffect`, revoked on unmount). These are local to the left-column thumbnail display.

`page.tsx` manages `previewPhotoUrl` for the right-column `ListingPreviewCard`. When PhotosStep calls `onNext(photos)`, page.tsx creates a blob URL from `photos[0]` and stores it in `previewPhotoUrl`. This URL is used in the right column for all remaining steps.

`page.tsx` extends the two-column layout to cover all three steps — the `step < 2` condition is removed.

---

## Files

### 1. `app/listings/new/steps/review-step.tsx` (modified — full replacement)

**Props:**
```ts
type Props = {
  data: WizardData
  onEditStep: (step: number) => void
}
```

**Blob URLs for thumbnail strip:**
```ts
const [thumbUrls, setThumbUrls] = useState<string[]>([])

useEffect(() => {
  const urls = data.photos.map((f) => URL.createObjectURL(f))
  setThumbUrls(urls)
  return () => urls.forEach((u) => URL.revokeObjectURL(u))
}, [data.photos])
```

**Submit handler:** Preserve existing `useTransition` + `createListing` + `toast.error` pattern exactly. Only the button label changes.

**`ReviewField` component** (defined locally in the same file):
```tsx
function ReviewField({
  label,
  value,
  onEdit,
}: {
  label: string
  value: string
  onEdit: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-sm text-foreground mt-0.5 line-clamp-3 break-words">{value}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-muted-foreground hover:text-primary transition-colors mt-0.5"
        aria-label={`Edit ${label}`}
      >
        <Pencil size={14} aria-hidden="true" />
      </button>
    </div>
  )
}
```

`line-clamp-3` on Description prevents the long text from dominating the summary. The full text is visible on the listing detail page.

**Summary card structure:**
```tsx
<div className="rounded-xl border border-border overflow-hidden">
  <ReviewField
    label="Title"
    value={data.title}
    onEdit={() => onEditStep(0)}
  />
  <ReviewField
    label="Description"
    value={data.description}
    onEdit={() => onEditStep(0)}
  />
  <ReviewField
    label="Starting bid"
    value={formatPHP(data.starting_bid)}
    onEdit={() => onEditStep(0)}
  />
  <ReviewField
    label="Duration"
    value={`${data.duration_days} day${data.duration_days !== 1 ? 's' : ''}`}
    onEdit={() => onEditStep(0)}
  />

  {/* Photo strip */}
  <div className="flex items-start justify-between gap-4 py-3 px-4 border-b border-border last:border-0">
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground font-medium mb-2">
        Photos <span className="text-muted-foreground/60">({data.photos.length})</span>
      </p>
      <div className="flex gap-2 flex-wrap">
        {thumbUrls.map((url, i) => (
          <div
            key={url}
            className="relative w-14 h-14 rounded-md overflow-hidden bg-muted shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
            {i === 0 && (
              <span className="absolute bottom-0 inset-x-0 text-[8px] text-center bg-primary/80 text-primary-foreground py-0.5 leading-tight">
                Cover
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
    <button
      type="button"
      onClick={() => onEditStep(1)}
      className="shrink-0 text-muted-foreground hover:text-primary transition-colors mt-0.5"
      aria-label="Edit Photos"
    >
      <Pencil size={14} aria-hidden="true" />
    </button>
  </div>
</div>
```

**`ReviewField` padding note:** The `ReviewField` component and photo strip both use `px-4` on their inner wrappers — the summary card's outer `rounded-xl border overflow-hidden` provides the visual boundary while inner rows handle their own horizontal spacing.

**Fee callout + CTA:**
```tsx
<FeeDisclosureCallout>
  Listing fees are non-refundable once your auction goes live.
</FeeDisclosureCallout>

<div className="flex gap-2">
  <Button
    type="button"
    variant="outline"
    className="flex-1"
    onClick={() => onEditStep(1)}
    disabled={pending}
  >
    ← Back
  </Button>
  <Button
    type="button"
    className="flex-1"
    onClick={handleSubmit}
    disabled={pending}
  >
    {pending ? (
      <span className="flex items-center gap-2">
        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        Posting...
      </span>
    ) : (
      'Post listing →'
    )}
  </Button>
</div>
```

`'Post listing →'` uses U+2192 (→) to match the arrows on "Next: Photos →" and "Next: Review →".

**Imports needed:**
```ts
import { useState, useEffect, useTransition } from 'react'
import { Pencil, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createListing } from '@/lib/actions/listings'
import { formatPHP } from '@/lib/utils/currency'
import { FeeDisclosureCallout } from '@/components/listings/fee-disclosure-callout'
import type { WizardData } from '../page'
import { Button } from '@/components/ui/button'
```

---

### 2. `app/listings/new/page.tsx` (modified — builds on Photos step changes)

**New logic on Photos → Review transition:**

Create a blob URL from the first photo File when Photos calls `onNext`, so the Review step's right-column preview has a real image:

```tsx
{step === 1 && (
  <PhotosStep
    onBack={() => { setPreviewPhotoUrl(undefined); setStep(0) }}
    onNext={(photos) => {
      const url = photos[0] ? URL.createObjectURL(photos[0]) : undefined
      setPreviewPhotoUrl(url)
      setData((d) => ({ ...d, photos }))
      setStep(2)
    }}
    onPhotosChange={(urls) => setPreviewPhotoUrl(urls[0])}
  />
)}
```

`previewPhotoUrl` created here persists for the Review step. It is not revoked until the user navigates back via an edit icon.

**`onEditStep` handler:**

```tsx
{step === 2 && (
  <ReviewStep
    data={data as WizardData}
    onEditStep={(s) => {
      if (s <= 1 && previewPhotoUrl) {
        URL.revokeObjectURL(previewPhotoUrl)
        setPreviewPhotoUrl(undefined)
      }
      setStep(s)
    }}
  />
)}
```

Revoking on edit-back prevents the stale blob URL from being reused after PhotosStep remounts and creates fresh URLs.

**Extend two-column layout to all steps:**

Remove the `step < 2` ternary that switched to a narrow wrapper for the Review step. All three steps now render inside the two-column grid:

```tsx
return (
  <div className="max-w-[1100px] mx-auto px-6 pt-8">
    <div className="max-w-[640px] mx-auto lg:max-w-none lg:grid lg:grid-cols-[480px_400px] lg:gap-12 lg:justify-center">
      {/* Left column */}
      <div>
        {stepIndicator}
        {step === 0 && (
          <>
            <FeeDisclosureCallout>
              Listing fees are non-refundable once your auction goes live.
            </FeeDisclosureCallout>
            <DetailsStep
              defaultValues={data}
              onNext={(values) => { setData((d) => ({ ...d, ...values })); setStep(1) }}
              onPreviewChange={setPreviewDraft}
            />
          </>
        )}
        {step === 1 && (
          <PhotosStep
            onBack={() => { setPreviewPhotoUrl(undefined); setStep(0) }}
            onNext={(photos) => {
              const url = photos[0] ? URL.createObjectURL(photos[0]) : undefined
              setPreviewPhotoUrl(url)
              setData((d) => ({ ...d, photos }))
              setStep(2)
            }}
            onPhotosChange={(urls) => setPreviewPhotoUrl(urls[0])}
          />
        )}
        {step === 2 && (
          <ReviewStep
            data={data as WizardData}
            onEditStep={(s) => {
              if (s <= 1 && previewPhotoUrl) {
                URL.revokeObjectURL(previewPhotoUrl)
                setPreviewPhotoUrl(undefined)
              }
              setStep(s)
            }}
          />
        )}
      </div>

      {/* Right column — preview persists across all steps */}
      <div className="mt-8 lg:mt-0">
        <div className="lg:sticky lg:top-24">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" aria-hidden="true" />
            <p className="text-xs text-muted-foreground font-medium">
              {step < 2 ? 'Live preview' : 'Final preview'}
            </p>
          </div>
          <ListingPreviewCard {...previewDraft} photoUrl={previewPhotoUrl} />
          <p className="text-xs text-muted-foreground mt-3 text-center">
            {step < 2
              ? 'How your listing appears in the feed'
              : 'This is how your listing will appear to buyers'}
          </p>
        </div>
      </div>
    </div>
  </div>
)
```

**`useMemo` dependency:** `stepIndicator` memoizes on `[step]` — unchanged, still correct for all three steps.

**`previewPhotoUrl` lifecycle summary:**
| Event | `previewPhotoUrl` |
|---|---|
| Details step (step 0) | `undefined` (no photos yet) |
| Photos step (step 1) | Updated live via `onPhotosChange` → first blob URL |
| Photos → Review transition | Created from `photos[0]` File, replaces live URL |
| Review edit back to Photos | Revoked + reset to `undefined` |
| Review edit back to Details | Revoked + reset to `undefined` |

---

## `ListingPreviewCard` on Review step

No changes to the component — the existing `photoUrl?` prop (added in the Photos step spec) handles the full-opacity image display. On the Review step, `photoUrl` is always set (the seller required at least 1 photo), so the Camera placeholder never shows.

The "No bids yet" activity line with `opacity-60` is correct on the Review preview — the listing hasn't been posted yet. This is accurate, not misleading.

---

## Responsive behavior

Same as Details and Photos steps:
- `< 1024px`: single column — summary card on top, preview below, "Post listing →" at the bottom
- `≥ 1024px`: two-column grid, preview sticky

---

## What does NOT change

- `createListing` server action call and FormData construction
- `toast.error` error handling
- `WizardData` type
- All other wizard steps
- Any post-submission routing (GCash payment flow — out of scope)

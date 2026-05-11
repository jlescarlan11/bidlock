# Review Step Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Review wizard step with field-level edit icons, a photo thumbnail strip, `FeeDisclosureCallout`, and a "Post listing →" CTA; extend the two-column preview layout to all three wizard steps.

**Architecture:** `ReviewStep` gets a local `ReviewField` subcomponent with Pencil edit icons, a photo thumbnail strip (blob URLs created from `data.photos` on mount), `FeeDisclosureCallout`, and "Post listing →" / "Posting..." with a `Loader2` spinner. The `onBack` prop is replaced by `onEditStep: (step: number) => void`. `page.tsx` removes the `step < 2` ternary so all three steps use the two-column grid; on Photos → Review transition it creates a `previewPhotoUrl` blob URL from `photos[0]`; on edit-back it revokes and clears that URL. Right-column label and caption update for step 2. This plan must run after the Photos Step plan (which adds `previewPhotoUrl` state to `page.tsx`).

**Tech Stack:** React 19, Next.js App Router, TypeScript, Tailwind CSS v4, shadcn/ui Button, lucide-react (Pencil, Loader2), sonner toast

---

### Task 1: Replace review-step.tsx

**Files:**
- Modify: `app/listings/new/steps/review-step.tsx`

- [ ] **Step 1: Replace the file**

```tsx
'use client'

import { useState, useEffect, useTransition } from 'react'
import { Pencil, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createListing } from '@/lib/actions/listings'
import { formatPHP } from '@/lib/utils/currency'
import { FeeDisclosureCallout } from '@/components/listings/fee-disclosure-callout'
import type { WizardData } from '../page'
import { Button } from '@/components/ui/button'

type Props = {
  data: WizardData
  onEditStep: (step: number) => void
}

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
    <div className="flex items-start justify-between gap-4 py-3 px-4 border-b border-border last:border-0">
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

export default function ReviewStep({ data, onEditStep }: Props) {
  const [thumbUrls, setThumbUrls] = useState<string[]>([])
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const urls = data.photos.map((f) => URL.createObjectURL(f))
    setThumbUrls(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [data.photos])

  function handleSubmit() {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('title', data.title)
      formData.set('description', data.description)
      formData.set('starting_bid', String(data.starting_bid))
      formData.set('duration_days', String(data.duration_days))
      data.photos.forEach((f) => formData.append('photos', f))

      const result = await createListing(undefined, formData)
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <div className="space-y-4">
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
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit 2>&1 | head -40`

Expected: TypeScript will report an error because `page.tsx` still passes `onBack` to `ReviewStep` instead of `onEditStep`. This error is expected and will be fixed in Task 2.

- [ ] **Step 3: Commit**

```bash
git add app/listings/new/steps/review-step.tsx
git commit -m "feat: redesign review step — field edit icons, photo thumbnails, Post listing CTA"
```

---

### Task 2: Update page.tsx — two-column for all steps, blob URL lifecycle

**Files:**
- Modify: `app/listings/new/page.tsx`

Current state (after Photos plan): `previewPhotoUrl` state exists; `step < 2` uses two-column; step 2 renders `<ReviewStep ... onBack={() => setStep(1)} />` in a narrow `max-w-lg mx-auto` wrapper.

Changes:
- Remove the `step < 2` ternary entirely — all steps share the two-column grid
- On Photos → Review (`onNext`): create a `previewPhotoUrl` blob URL from `photos[0]`
- `onEditStep` handler on `ReviewStep`: revoke + clear `previewPhotoUrl` when navigating back, then `setStep(s)`
- Right-column label: `"Live preview"` for steps 0–1, `"Final preview"` for step 2
- Sub-caption: `"How your listing appears in the feed"` for steps 0–1, `"This is how your listing will appear to buyers"` for step 2

- [ ] **Step 1: Replace page.tsx**

```tsx
'use client'

import { useMemo, useState } from 'react'
import DetailsStep, { type PreviewDraft } from './steps/details-step'
import PhotosStep from './steps/photos-step'
import ReviewStep from './steps/review-step'
import { ListingPreviewCard } from '@/components/listings/listing-preview-card'
import { FeeDisclosureCallout } from '@/components/listings/fee-disclosure-callout'

export type WizardData = {
  title: string
  description: string
  starting_bid: number
  duration_days: number
  photos: File[]
}

const STEPS = ['Details', 'Photos', 'Review']

export default function NewListingPage() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<Partial<WizardData>>({})
  const [previewDraft, setPreviewDraft] = useState<PreviewDraft>({
    title: '',
    starting_bid: 0,
    duration_days: 3,
  })
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | undefined>(undefined)

  const stepIndicator = useMemo(() => (
    <div className="flex gap-2 mb-6">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2 flex-1">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
              i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {i + 1}
          </div>
          <span className={`text-sm ${i === step ? 'font-semibold' : 'text-muted-foreground'}`}>
            {label}
          </span>
          {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
        </div>
      ))}
    </div>
  ), [step])

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
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit 2>&1 | head -40`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/listings/new/page.tsx
git commit -m "feat: extend two-column preview to all wizard steps; wire Review step blob URL lifecycle"
```

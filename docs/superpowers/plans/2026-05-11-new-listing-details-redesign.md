# New Listing Details Step Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the narrow single-column Details step with a two-column split layout: form on the left, live preview card on the right that mirrors the public feed card 1:1.

**Architecture:** `page.tsx` owns a `PreviewDraft` state that feeds a new `ListingPreviewCard` component. `DetailsStep` emits live form values via an `onPreviewChange` callback driven by react-hook-form's `watch()`. Two new components (`FeeDisclosureCallout`, `ListingPreviewCard`) are added under `components/listings/`.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, react-hook-form, Zod, Lucide icons

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `components/listings/fee-disclosure-callout.tsx` | Purple tinted callout with Info icon |
| Create | `components/listings/listing-preview-card.tsx` | Client-side mirror of `ListingCard` for live preview |
| Modify | `app/listings/new/steps/details-step.tsx` | Add `PreviewDraft` type + `onPreviewChange` prop + character counters + peso prefix |
| Modify | `app/listings/new/page.tsx` | Two-column layout for step 0, `previewDraft` state, import new components |

---

## Task 1: Create `FeeDisclosureCallout`

**Files:**
- Create: `components/listings/fee-disclosure-callout.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/listings/fee-disclosure-callout.tsx
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

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/listings/fee-disclosure-callout.tsx
git commit -m "feat: add FeeDisclosureCallout component"
```

---

## Task 2: Create `ListingPreviewCard`

This is a pure client display component that mirrors `components/listing-card.tsx` structure. It has no async logic, no Supabase calls. Check `components/listing-card.tsx` as the reference — every class name mirrors it exactly.

**Files:**
- Create: `components/listings/listing-preview-card.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/listings/listing-preview-card.tsx
'use client'

import { Camera } from 'lucide-react'
import { formatPHP } from '@/lib/utils/currency'

type Props = {
  title: string
  starting_bid: number
  duration_days: number
}

export default function ListingPreviewCard({ title, starting_bid, duration_days }: Props) {
  return (
    <div className="group rounded-2xl border overflow-hidden bg-card hover:shadow-xl hover:shadow-violet-200/60 hover:-translate-y-1 hover:border-primary/30 transition-all duration-200 ease-out">

      {/* Image area — grayed out, placeholder until step 2 */}
      <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden opacity-60">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
          <Camera className="text-gray-400" size={28} aria-hidden />
          <p className="text-xs text-gray-400">Add photos in step 2</p>
        </div>

        {/* Timer pill — mirrors ListingCard gray state (bg-black/60) */}
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

      {/* Card body — mirrors ListingCard info section */}
      <div className="p-3.5 border-t-2 border-transparent">
        {title ? (
          <p className="text-sm font-bold text-foreground line-clamp-2 leading-snug mb-2">{title}</p>
        ) : (
          <p className="text-sm font-bold text-gray-400 line-clamp-2 leading-snug mb-2">Your listing title</p>
        )}

        <div className="flex items-center justify-between gap-2 mb-1">
          {starting_bid > 0 ? (
            <p className="text-xl font-black text-primary leading-none">{formatPHP(starting_bid)}</p>
          ) : (
            <p className="text-xl font-black text-gray-400 leading-none">₱0.00</p>
          )}
        </div>

        {/* Activity line — always h-4 reserved slot, mirrors real card */}
        <p className="h-4 text-[10px] leading-4 text-gray-400 opacity-60">No bids yet</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/listings/listing-preview-card.tsx
git commit -m "feat: add ListingPreviewCard component for live listing preview"
```

---

## Task 3: Update `DetailsStep` — add `PreviewDraft` type, live sync, character counters, peso prefix

This task modifies `app/listings/new/steps/details-step.tsx`. The full file is replaced — copy exactly as shown.

**Key changes:**
- Export new `PreviewDraft` type (consumed by `page.tsx`)
- Add `onPreviewChange?: (draft: PreviewDraft) => void` prop
- Add `useEffect` + `watch()` to emit live values
- Character counters for title (red over 100) and description
- Peso prefix on starting bid with `pl-7` offset
- Field spacing: `space-y-5`
- Consistent `text-sm font-medium mb-1.5 block` label style

**Files:**
- Modify: `app/listings/new/steps/details-step.tsx`

- [ ] **Step 1: Replace the file**

```tsx
// app/listings/new/steps/details-step.tsx
'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { listingDetailsSchema, type ListingDetailsInput } from '@/lib/validators/listing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type PreviewDraft = {
  title: string
  starting_bid: number
  duration_days: number
}

type Props = {
  defaultValues: Partial<ListingDetailsInput>
  onNext: (values: ListingDetailsInput) => void
  onPreviewChange?: (draft: PreviewDraft) => void
}

export default function DetailsStep({ defaultValues, onNext, onPreviewChange }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ListingDetailsInput>({
    resolver: zodResolver(listingDetailsSchema) as any,
    defaultValues: { duration_days: 3, ...defaultValues },
  })

  const watchedTitle       = watch('title')
  const watchedDescription = watch('description')
  const watchedBid         = watch('starting_bid')
  const watchedDuration    = watch('duration_days')

  const titleLen = (watchedTitle ?? '').length
  const descLen  = (watchedDescription ?? '').length

  useEffect(() => {
    onPreviewChange?.({
      title:         watchedTitle ?? '',
      starting_bid:  Number(watchedBid) || 0,
      duration_days: Number(watchedDuration) || 3,
    })
  }, [watchedTitle, watchedBid, watchedDuration, onPreviewChange])

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <div>
        <Label htmlFor="title" className="text-sm font-medium mb-1.5 block">Title</Label>
        <Input id="title" {...register('title')} placeholder="5–100 characters" />
        <p className={`text-xs text-right mt-1 ${titleLen > 100 ? 'text-destructive' : 'text-muted-foreground'}`}>
          {titleLen}/100
        </p>
        {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <Label htmlFor="description" className="text-sm font-medium mb-1.5 block">Description</Label>
        <Textarea
          id="description"
          {...register('description')}
          rows={4}
          placeholder="20–2000 characters"
          className="min-h-[120px] resize-y"
        />
        <p className="text-xs text-right mt-1 text-muted-foreground">{descLen}/2000</p>
        {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
      </div>

      <div>
        <Label htmlFor="starting_bid" className="text-sm font-medium mb-1.5 block">Starting bid (₱)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none" aria-hidden>
            ₱
          </span>
          <Input
            id="starting_bid"
            type="number"
            step="1"
            className="pl-7"
            placeholder="0.00"
            {...register('starting_bid')}
          />
        </div>
        {errors.starting_bid && <p className="text-xs text-destructive mt-1">{errors.starting_bid.message}</p>}
      </div>

      <div>
        <Label className="text-sm font-medium mb-1.5 block">Duration</Label>
        <Select
          defaultValue={String(defaultValues.duration_days ?? 3)}
          onValueChange={(v) => setValue('duration_days', Number(v))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 day</SelectItem>
            <SelectItem value="3">3 days</SelectItem>
            <SelectItem value="7">7 days</SelectItem>
          </SelectContent>
        </Select>
        {errors.duration_days && <p className="text-xs text-destructive mt-1">{errors.duration_days.message}</p>}
      </div>

      <Button type="submit" className="w-full">Next: Photos →</Button>
    </form>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/listings/new/steps/details-step.tsx
git commit -m "feat: add PreviewDraft type, live sync, character counters, peso prefix to DetailsStep"
```

---

## Task 4: Restructure `page.tsx` — two-column layout, `previewDraft` state

This task modifies `app/listings/new/page.tsx`. The full file is replaced — copy exactly as shown.

**Key changes from current `page.tsx`:**
- Container: `max-w-lg mx-auto p-4 pt-8` → `max-w-[1100px] mx-auto px-6 pt-8`
- Add `previewDraft` state (type imported from `details-step.tsx`)
- Step 0: wrap in two-column grid `lg:grid lg:grid-cols-[480px_400px] lg:gap-12 lg:justify-center`
  - Left column: step indicator + `<FeeDisclosureCallout>` + `<DetailsStep onPreviewChange={setPreviewDraft} />`
  - Right column: "Live preview" label + `<ListingPreviewCard>` + description note
- Steps 1–2: stay in a `max-w-lg mx-auto` inner wrapper (Photos and Review unchanged)
- Fee disclosure moves from inline `<p>` to `<FeeDisclosureCallout>`
- `onPreviewChange={setPreviewDraft}` — `setPreviewDraft` from `useState` is a stable reference, no `useCallback` needed

**Files:**
- Modify: `app/listings/new/page.tsx`

- [ ] **Step 1: Replace the file**

```tsx
// app/listings/new/page.tsx
'use client'

import { useState } from 'react'
import DetailsStep, { type PreviewDraft } from './steps/details-step'
import PhotosStep from './steps/photos-step'
import ReviewStep from './steps/review-step'
import ListingPreviewCard from '@/components/listings/listing-preview-card'
import FeeDisclosureCallout from '@/components/listings/fee-disclosure-callout'

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

  const stepIndicator = (
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
  )

  return (
    <div className="max-w-[1100px] mx-auto px-6 pt-8">
      {step === 0 ? (
        <div className="max-w-[640px] mx-auto lg:max-w-none lg:grid lg:grid-cols-[480px_400px] lg:gap-12 lg:justify-center">
          {/* Left column: step indicator + fee callout + form */}
          <div>
            {stepIndicator}
            <FeeDisclosureCallout>
              Listing fees are non-refundable once your auction goes live.
            </FeeDisclosureCallout>
            <DetailsStep
              defaultValues={data}
              onNext={(values) => { setData((d) => ({ ...d, ...values })); setStep(1) }}
              onPreviewChange={setPreviewDraft}
            />
          </div>

          {/* Right column: live preview */}
          <div className="mt-8 lg:mt-0">
            <div className="lg:sticky lg:top-24">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" aria-hidden />
                <p className="text-xs text-muted-foreground font-medium">Live preview</p>
              </div>
              <ListingPreviewCard {...previewDraft} />
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Description shown on the listing detail page
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-lg mx-auto">
          {stepIndicator}
          {step === 1 && (
            <PhotosStep
              onBack={() => setStep(0)}
              onNext={(photos) => { setData((d) => ({ ...d, photos })); setStep(2) }}
            />
          )}
          {step === 2 && (
            <ReviewStep
              data={data as WizardData}
              onBack={() => setStep(1)}
            />
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Start dev server and verify visually**

```bash
cd "/Users/johnlesterescarlan/Personal Projects/bidlock"
npm run dev
```

Navigate to `http://localhost:3000/listings/new` and verify:

**Desktop (≥1024px):**
- [ ] Two-column layout: form on the left (~480px), preview card on the right (~400px)
- [ ] Step indicator above the form column only (not spanning full width)
- [ ] Purple fee callout with Info icon below the step indicator
- [ ] Preview card visible with "Add photos in step 2" placeholder and "Ends in 3d" pill
- [ ] Typing in Title → card title updates in real time
- [ ] Typing in Starting bid → card price updates (formatted ₱ with thousands separators)
- [ ] Changing Duration → pill text updates ("Ends in 1d", "Ends in 3d", "Ends in 7d")
- [ ] Character counter for title: right-aligned, turns red/destructive after 100 chars
- [ ] Character counter for description: right-aligned, muted
- [ ] Peso prefix (₱) visible inside the starting bid input, left-aligned
- [ ] Preview card is sticky (stays visible when scrolling the form)
- [ ] "Live preview" label with purple pulse dot above the card

**Tablet/Mobile (< 1024px):**
- [ ] Single column: step indicator → fee callout → form → preview (stacked)
- [ ] Preview card appears below the form, not hidden

**Step navigation:**
- [ ] Clicking "Next: Photos →" advances to step 1 (Photos)
- [ ] Photos and Review steps render in `max-w-lg` centered, not the two-column grid
- [ ] Going back to step 0 restores the two-column layout

- [ ] **Step 4: Commit**

```bash
git add app/listings/new/page.tsx
git commit -m "feat: restructure listing details step with two-column split layout and live preview"
```

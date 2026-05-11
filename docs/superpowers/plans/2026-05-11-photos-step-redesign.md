# Photos Step Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Photos wizard step with drag-and-drop upload, @dnd-kit sortable thumbnails, and a live `ListingPreviewCard` on the right column showing the seller's actual cover photo.

**Architecture:** `PhotosStep` gains a drop zone with visual drag states and a `@dnd-kit/sortable` thumbnail grid; it emits live blob URLs to `page.tsx` via `onPhotosChange`. `ListingPreviewCard` gets a `photoUrl?` prop that shows the real cover photo at full opacity when provided. `page.tsx` adds `previewPhotoUrl` state and extends the two-column layout from step 0 to also cover step 1 (`step < 2`).

**Tech Stack:** @dnd-kit/core, @dnd-kit/sortable, React 19, Next.js App Router, TypeScript, Tailwind CSS v4, shadcn/ui Button, lucide-react (ImagePlus)

---

### Task 1: Install @dnd-kit packages

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install packages**

Run: `npm install @dnd-kit/core @dnd-kit/sortable`

Expected: packages added to `node_modules/`, `package.json` and `package-lock.json` updated with `@dnd-kit/core` and `@dnd-kit/sortable`.

- [ ] **Step 2: Verify packages are importable**

Run: `node -e "require('@dnd-kit/core'); require('@dnd-kit/sortable'); console.log('OK')"`

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @dnd-kit/core and @dnd-kit/sortable for photo reordering"
```

---

### Task 2: Update ListingPreviewCard with photoUrl? prop

**Files:**
- Modify: `components/listings/listing-preview-card.tsx`

- [ ] **Step 1: Replace the file**

```tsx
'use client'

import { Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPHP } from '@/lib/utils/currency'

type Props = {
  title: string
  starting_bid: number
  duration_days: number
  photoUrl?: string
}

export function ListingPreviewCard({ title, starting_bid, duration_days, photoUrl }: Props) {
  return (
    <div className="group rounded-2xl border overflow-hidden bg-card hover:shadow-xl hover:shadow-violet-200/60 hover:-translate-y-1 hover:border-primary/30 transition-all duration-200 ease-out">

      {/* Image area — placeholder until photoUrl is provided */}
      <div className={cn('aspect-[4/3] relative overflow-hidden', !photoUrl && 'bg-gray-100 opacity-60')}>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
            <Camera className="text-gray-400" size={28} aria-hidden="true" />
            <p className="text-xs text-gray-400">Add photos in step 2</p>
          </div>
        )}

        {/* Timer pill — mirrors ListingCard gray state */}
        <div className="absolute top-2.5 right-2.5">
          {duration_days > 0 ? (
            <div className="bg-black/60 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 leading-none backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" aria-hidden="true" />
              Ends in {duration_days}d
            </div>
          ) : (
            <div className="bg-gray-500/60 text-white/60 text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 leading-none backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" aria-hidden="true" />
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
            <p className="text-xl font-black text-gray-400 leading-none">{formatPHP(0)}</p>
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

Run: `npx tsc --noEmit 2>&1 | head -30`

Expected: No errors in `listing-preview-card.tsx` or its consumers. (The `photoUrl` prop is optional, so existing call sites in `page.tsx` that don't pass it yet will not error.)

- [ ] **Step 3: Commit**

```bash
git add components/listings/listing-preview-card.tsx
git commit -m "feat: add photoUrl? prop to ListingPreviewCard for live photo preview"
```

---

### Task 3: Replace photos-step.tsx — drag-and-drop, sortable thumbnails, onPhotosChange

**Files:**
- Modify: `app/listings/new/steps/photos-step.tsx`

- [ ] **Step 1: Replace the file**

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { ImagePlus } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type PhotoEntry = { file: File; url: string }

type Props = {
  onBack: () => void
  onNext: (photos: File[]) => void
  onPhotosChange?: (urls: string[]) => void
}

function SortableThumbnail({
  entry,
  index,
  onRemove,
}: {
  entry: PhotoEntry
  index: number
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.url })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'relative aspect-square rounded-lg overflow-hidden bg-muted touch-none',
        isDragging && 'scale-105 shadow-xl ring-2 ring-primary z-10'
      )}
      {...attributes}
      {...listeners}
    >
      <Image src={entry.url} alt="" fill className="object-cover pointer-events-none" />
      {index === 0 && (
        <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          Cover
        </span>
      )}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-black/80"
        aria-label="Remove photo"
      >
        ×
      </button>
    </div>
  )
}

export default function PhotosStep({ onBack, onNext, onPhotosChange }: Props) {
  const [entries, setEntries] = useState<PhotoEntry[]>([])
  const [error, setError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Revoke all blob URLs on unmount
  useEffect(() => {
    return () => entries.forEach((e) => URL.revokeObjectURL(e.url))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync blob URLs to parent for live preview
  useEffect(() => {
    onPhotosChange?.(entries.map((e) => e.url))
  }, [entries, onPhotosChange])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setEntries((prev) => {
        const oldIndex = prev.findIndex((e) => e.url === active.id)
        const newIndex = prev.findIndex((e) => e.url === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  function handleFiles(selected: FileList | null) {
    if (!selected) return
    const arr = Array.from(selected)
    const invalid = arr.find(
      (f) => f.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    )
    if (invalid) { setError('Each file must be jpg/png/webp and under 5 MB.'); return }

    const remaining = 5 - entries.length
    const newEntries = arr.slice(0, remaining).map((f) => ({ file: f, url: URL.createObjectURL(f) }))
    setError('')
    setEntries((prev) => [...prev, ...newEntries])

    if (inputRef.current) inputRef.current.value = ''
  }

  function removeFile(i: number) {
    setEntries((prev) => {
      URL.revokeObjectURL(prev[i].url)
      return prev.filter((_, idx) => idx !== i)
    })
  }

  function handleNext() {
    if (entries.length < 1) { setError('Upload at least 1 photo.'); return }
    onNext(entries.map((e) => e.file))
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => entries.length < 5 && inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl py-10 text-center transition-colors',
          isDragOver && entries.length < 5
            ? 'border-primary bg-purple-50 cursor-copy'
            : entries.length >= 5
            ? 'border-muted opacity-60 cursor-not-allowed'
            : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30 cursor-pointer'
        )}
      >
        <ImagePlus className="mx-auto text-muted-foreground mb-2" size={28} aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">
          {entries.length >= 5 ? 'Maximum 5 photos reached' : 'Drag photos here or click to upload'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">1–5 · JPG, PNG, WebP · max 5 MB each</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <p className={cn('text-xs text-right', entries.length > 0 ? 'text-primary font-medium' : 'text-muted-foreground')}>
        {entries.length} / 5 photos
      </p>

      {entries.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={entries.map((e) => e.url)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-3">
              {entries.map((entry, i) => (
                <SortableThumbnail
                  key={entry.url}
                  entry={entry}
                  index={i}
                  onRemove={() => removeFile(i)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>← Back</Button>
        <Button type="button" className="flex-1" onClick={handleNext}>Next: Review →</Button>
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
git add app/listings/new/steps/photos-step.tsx
git commit -m "feat: redesign photos step — drag-and-drop upload, sortable thumbnails, live preview callback"
```

---

### Task 4: Update page.tsx — extend two-column to step 1, wire previewPhotoUrl

**Files:**
- Modify: `app/listings/new/page.tsx`

Current state: step 0 is two-column; steps 1 and 2 render in `max-w-lg mx-auto` narrow wrapper. `PhotosStep` call has no `onPhotosChange` prop.

Changes:
- Add `previewPhotoUrl` state
- Change `step === 0 ? (two-column) : (narrow)` to `step < 2 ? (two-column) : (narrow)`
- Move step 1 `PhotosStep` into the two-column left column
- Pass `onPhotosChange={(urls) => setPreviewPhotoUrl(urls[0])}` and update `onBack` to clear `previewPhotoUrl`
- Pass `photoUrl={previewPhotoUrl}` to `ListingPreviewCard`
- Step 2 narrow wrapper keeps `onBack` for now (Review plan replaces it with `onEditStep`)

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
      {step < 2 ? (
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
                onNext={(photos) => { setData((d) => ({ ...d, photos })); setStep(2) }}
                onPhotosChange={(urls) => setPreviewPhotoUrl(urls[0])}
              />
            )}
          </div>

          {/* Right column — live preview */}
          <div className="mt-8 lg:mt-0">
            <div className="lg:sticky lg:top-24">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" aria-hidden="true" />
                <p className="text-xs text-muted-foreground font-medium">Live preview</p>
              </div>
              <ListingPreviewCard {...previewDraft} photoUrl={previewPhotoUrl} />
              <p className="text-xs text-muted-foreground mt-3 text-center">
                How your listing appears in the feed
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-lg mx-auto">
          {stepIndicator}
          <ReviewStep
            data={data as WizardData}
            onBack={() => setStep(1)}
          />
        </div>
      )}
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
git commit -m "feat: extend two-column preview layout to Photos step; wire live photo preview"
```

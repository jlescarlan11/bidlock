# BidLock — New Listing Wizard: Photos Step Redesign

**Date:** 2026-05-11
**Scope:** `app/listings/new/steps/photos-step.tsx`, `app/listings/new/page.tsx`, `components/listings/listing-preview-card.tsx`
**Out of scope:** Details step (done), Review step (separate spec), routing, server actions

---

## Problem

The Photos step renders in a narrow centered column with a basic click-only upload zone and no live preview. Sellers can't see how their photos will look on the feed card until after submission. There is no drag-and-drop, no photo reordering, and no cover photo designation.

## Goal

- Drag-and-drop + click upload zone with visual states
- Drag-to-reorder thumbnails (`@dnd-kit/sortable`) so sellers can set the cover photo
- Two-column layout matching the Details step — live `ListingPreviewCard` on the right showing the actual first/cover photo
- Blob URL cleanup preserved

---

## New Dependency

```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

`@dnd-kit/core` (~12KB gzipped) + `@dnd-kit/sortable` (~4KB gzipped). React 19 compatible. No peer-dependency conflicts with existing stack.

---

## Architecture

`page.tsx` owns `previewPhotoUrl: string | undefined` state. `PhotosStep` emits the current blob URL array via `onPhotosChange?: (urls: string[]) => void` whenever entries change. `page.tsx` passes `urls[0]` to `ListingPreviewCard` as `photoUrl`. The two-column layout in `page.tsx` now renders for both `step === 0` and `step === 1`.

`ListingPreviewCard` gets a new optional `photoUrl?: string` prop. When provided, the image area shows the photo at full opacity using a plain `<img>` tag (not `next/image` — blob URLs are temporary client-side objects, not optimizable). When absent, the existing Camera placeholder remains.

---

## Files

### 1. `app/listings/new/steps/photos-step.tsx` (modified — full replacement)

**New prop:**
```ts
type Props = {
  onBack: () => void
  onNext: (photos: File[]) => void
  onPhotosChange?: (urls: string[]) => void
}
```

**State:**
```ts
const [entries, setEntries] = useState<PhotoEntry[]>([])
const [error, setError] = useState('')
const [isDragOver, setIsDragOver] = useState(false)
```

**`onPhotosChange` sync:** Call after every `setEntries` via `useEffect`:
```ts
useEffect(() => {
  onPhotosChange?.(entries.map((e) => e.url))
}, [entries, onPhotosChange])
```

**Blob URL cleanup:** Preserve existing pattern — revoke all on unmount:
```ts
useEffect(() => {
  return () => entries.forEach((e) => URL.revokeObjectURL(e.url))
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

**Upload zone:**
```tsx
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
```

**Photo counter below zone:**
```tsx
<p className={cn('text-xs text-right', entries.length > 0 ? 'text-primary font-medium' : 'text-muted-foreground')}>
  {entries.length} / 5 photos
</p>
```

**Thumbnail grid with `@dnd-kit/sortable`:**

```tsx
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
```

Each thumbnail is a `SortableThumbnail` component (defined in the same file):

```tsx
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
```

**Key detail on remove button:** `onPointerDown={(e) => e.stopPropagation()` — prevents the DnD sensor from capturing the pointer-down on the × button, so clicking remove doesn't start a drag.

Wrapped grid:
```tsx
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

// In JSX:
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
```

**`activationConstraint: { distance: 8 }`** — prevents accidental drags on tap/click. A pointer must move 8px before a drag starts.

**`handleFiles` validation:** Preserve existing logic exactly (5 MB, jpg/png/webp, max 5 total). Change: replace `setEntries((prev) => [...prev, ...newEntries].slice(0, 5))` with a check that only adds up to the remaining slots:
```ts
const remaining = 5 - entries.length
const newEntries = arr.slice(0, remaining).map((f) => ({ file: f, url: URL.createObjectURL(f) }))
```

**Navigation buttons:** Unchanged — `← Back` and `Next: Review →`.

---

### 2. `components/listings/listing-preview-card.tsx` (modified)

**New prop:** Add `photoUrl?: string` to the `Props` type.

**Image area changes:**
- Remove the hardcoded `opacity-60` from the image area `div` — apply it conditionally only when no photo
- When `photoUrl` is provided: render `<img src={photoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />` (plain `<img>`, not `next/image`)
- When `photoUrl` is absent: render existing Camera placeholder with `opacity-60`

```tsx
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
  {/* Timer pill and gradient overlay remain unchanged */}
  ...
</div>
```

**Import:** Add `import { cn } from '@/lib/utils'` (already present in the file after Task 1 fixes — actually `listing-preview-card.tsx` doesn't have `cn` yet; add it).

---

### 3. `app/listings/new/page.tsx` (modified)

**New state:**
```ts
const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | undefined>(undefined)
```

**Extend two-column layout to step 1:** Change the condition from `step === 0 ? (two-column) : (narrow)` to render the two-column layout for both steps 0 and 1, and the narrow layout only for step 2.

```tsx
{step < 2 ? (
  <div className="max-w-[640px] mx-auto lg:max-w-none lg:grid lg:grid-cols-[480px_400px] lg:gap-12 lg:justify-center">
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
    <ReviewStep data={data as WizardData} onBack={() => setStep(1)} />
  </div>
)}
```

**`useMemo` update:** The `stepIndicator` memo depends on `[step]` — no change needed.

**`previewPhotoUrl` cleanup:** When the user clicks Back from Photos to Details, `PhotosStep` unmounts and revokes its blob URLs. The `onBack` handler calls `setPreviewPhotoUrl(undefined)` before `setStep(0)` to clear the stale blob URL from the preview. If the user returns to Photos and re-uploads, `onPhotosChange` will update it again.

---

## Responsive behavior

Same as Details step:
- `< 1024px`: single column, upload zone on top, preview below
- `≥ 1024px`: two-column grid, preview sticky

---

## What does NOT change

- File validation logic (5 MB, jpg/png/webp, 1–5 photos)
- `onNext` / `onBack` prop contracts
- `handleNext` minimum 1 photo check
- Review step
- Any other wizard steps

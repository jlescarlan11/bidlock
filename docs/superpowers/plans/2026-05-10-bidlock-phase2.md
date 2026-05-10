# BidLock Phase 2 — Core Auction Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete auction loop: listing creation with GCash payment proof, admin review queue, public feed, listing detail page with real-time bidding and anti-snipe, and Vercel Cron finalization with winner reveal.

**Architecture:** Server Actions for all writes. `place_bid()` Postgres RPC handles bid atomicity. Supabase Realtime subscription on the detail page drives live bid updates. Vercel Cron route calls `finalize_auctions()` RPC on a schedule.

**Tech Stack:** Next.js 15 App Router, Supabase Storage, Supabase Realtime, react-hook-form + zod, sonner, shadcn/ui

**Prerequisite:** Phase 1 complete and deployed. Database schema applied. Types generated at `types/database.ts`.

---

## File Map

| File | Purpose |
|---|---|
| `lib/validators/listing.ts` | Zod schemas for listing creation |
| `lib/validators/bid.ts` | Zod schema for bid amount |
| `lib/actions/listings.ts` | createListing, submitPaymentProof, cancelListing Server Actions |
| `lib/actions/admin.ts` | approveListing, rejectListing Server Actions |
| `lib/actions/bids.ts` | placeBid Server Action |
| `lib/utils/currency.ts` | PHP peso formatter |
| `lib/utils/time.ts` | Countdown formatter |
| `app/listings/new/page.tsx` | Wizard shell (3-step state) |
| `app/listings/new/steps/details-step.tsx` | Step 1: title, description, starting_bid, duration |
| `app/listings/new/steps/photos-step.tsx` | Step 2: photo upload (1–5 files) |
| `app/listings/new/steps/review-step.tsx` | Step 3: summary + submit |
| `app/listings/[id]/pay/page.tsx` | GCash QR + proof upload |
| `app/listings/[id]/pay/proof-form.tsx` | Client component for proof upload |
| `app/page.tsx` | Public feed (live listings) |
| `app/listings/[id]/page.tsx` | Listing detail (gallery, bids, countdown, bid form) |
| `app/listings/[id]/bid-section.tsx` | Client component with Realtime + bid form |
| `app/me/listings/page.tsx` | My listings (all statuses) |
| `app/admin/listings/page.tsx` | Admin review queue |
| `app/api/cron/finalize-auctions/route.ts` | Cron endpoint |
| `components/listing-card.tsx` | Feed card (photo, title, bid, countdown) |
| `components/countdown.tsx` | Client-side countdown timer |

---

## Task 6: Listing validators and currency utils

**Files:**
- Create: `lib/validators/listing.ts`
- Create: `lib/validators/bid.ts`
- Create: `lib/utils/currency.ts`
- Create: `lib/utils/time.ts`

- [ ] **Step 1: Create `lib/validators/listing.ts`**

```typescript
import { z } from 'zod'

export const listingDetailsSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(2000),
  starting_bid: z.coerce
    .number()
    .positive('Starting bid must be positive')
    .max(1_000_000, 'Starting bid cannot exceed ₱1,000,000'),
  duration_days: z.coerce.number().refine((v) => [1, 3, 7].includes(v), {
    message: 'Duration must be 1, 3, or 7 days',
  }),
})

export type ListingDetailsInput = z.infer<typeof listingDetailsSchema>
```

- [ ] **Step 2: Create `lib/validators/bid.ts`**

```typescript
import { z } from 'zod'

export const bidSchema = z.object({
  amount: z.coerce.number().positive(),
  listing_id: z.string().uuid(),
})

export type BidInput = z.infer<typeof bidSchema>

export function minBidAmount(currentBid: number): number {
  return currentBid + Math.max(currentBid * 0.05, 10)
}
```

- [ ] **Step 3: Create `lib/utils/currency.ts`**

```typescript
const formatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
})

export function formatPHP(amount: number): string {
  return formatter.format(amount)
}
```

- [ ] **Step 4: Create `lib/utils/time.ts`**

```typescript
export function formatTimeRemaining(endsAt: string | Date): string {
  const end = new Date(endsAt).getTime()
  const now = Date.now()
  const diff = end - now

  if (diff <= 0) return 'Ended'

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (diff < 3600_000) {
    // Under 1 hour: mm:ss
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  parts.push(`${minutes}m`)
  return parts.join(' ')
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/validators/listing.ts lib/validators/bid.ts lib/utils/
git commit -m "feat: add listing/bid validators and currency/time utils"
```

---

## Task 7: Listing creation Server Actions

**Files:**
- Create: `lib/actions/listings.ts`

- [ ] **Step 1: Create `lib/actions/listings.ts`**

```typescript
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { listingDetailsSchema } from '@/lib/validators/listing'

export async function createListing(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Parse details
  const parsed = listingDetailsSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    starting_bid: formData.get('starting_bid'),
    duration_days: formData.get('duration_days'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Snapshot listing fee from settings
  const { data: settings } = await supabase
    .from('settings')
    .select('listing_fee')
    .eq('id', 1)
    .single()
  if (!settings) return { error: 'Could not retrieve listing fee.' }

  // Insert listing
  const { data: listing, error: insertError } = await supabase
    .from('listings')
    .insert({
      auctioneer_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      starting_bid: parsed.data.starting_bid,
      current_bid: parsed.data.starting_bid,
      duration_days: parsed.data.duration_days,
      listing_fee: settings.listing_fee,
      status: 'pending_payment',
    })
    .select('id')
    .single()

  if (insertError) return { error: insertError.message }

  // Upload photos
  const photos = formData.getAll('photos') as File[]
  if (photos.length < 1 || photos.length > 5) {
    return { error: 'Upload between 1 and 5 photos.' }
  }

  const uploadResults = await Promise.all(
    photos.map(async (file, index) => {
      const ext = file.name.split('.').pop()
      const path = `${listing.id}/${index}.${ext}`
      const { error } = await supabase.storage
        .from('listing-photos')
        .upload(path, file, { upsert: true })
      if (error) return { error: error.message, index }
      return { path, index }
    })
  )

  const uploadError = uploadResults.find((r) => 'error' in r && r.error)
  if (uploadError && 'error' in uploadError) return { error: uploadError.error }

  // Insert photo records
  await supabase.from('listing_photos').insert(
    uploadResults.map((r) => ({
      listing_id: listing.id,
      storage_path: (r as { path: string }).path,
      display_order: (r as { index: number }).index,
    }))
  )

  redirect(`/listings/${listing.id}/pay`)
}

export async function submitPaymentProof(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const listingId = formData.get('listing_id') as string
  const reference = (formData.get('payment_reference') as string)?.trim()
  if (!reference) return { error: 'GCash reference number is required.' }

  const proofFile = formData.get('proof') as File
  if (!proofFile || proofFile.size === 0) return { error: 'Payment proof screenshot is required.' }
  if (proofFile.size > 5 * 1024 * 1024) return { error: 'File must be under 5 MB.' }

  // Verify ownership
  const { data: listing } = await supabase
    .from('listings')
    .select('id, status, auctioneer_id')
    .eq('id', listingId)
    .eq('auctioneer_id', user.id)
    .single()
  if (!listing || listing.status !== 'pending_payment') {
    return { error: 'Listing not found or not awaiting payment.' }
  }

  const ext = proofFile.name.split('.').pop()
  const storagePath = `${user.id}/${listingId}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(storagePath, proofFile, { upsert: true })
  if (uploadError) return { error: uploadError.message }

  const { error: updateError } = await supabase
    .from('listings')
    .update({
      status: 'awaiting_review',
      payment_proof_url: storagePath,
      payment_reference: reference,
    })
    .eq('id', listingId)
  if (updateError) return { error: updateError.message }

  revalidatePath(`/listings/${listingId}/pay`)
  redirect('/me/listings')
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/actions/listings.ts
git commit -m "feat: add createListing and submitPaymentProof Server Actions"
```

---

## Task 8: Listing creation wizard UI

**Files:**
- Create: `app/listings/new/page.tsx`
- Create: `app/listings/new/steps/details-step.tsx`
- Create: `app/listings/new/steps/photos-step.tsx`
- Create: `app/listings/new/steps/review-step.tsx`

- [ ] **Step 1: Create `app/listings/new/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import DetailsStep from './steps/details-step'
import PhotosStep from './steps/photos-step'
import ReviewStep from './steps/review-step'

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

  return (
    <div className="max-w-lg mx-auto p-4 pt-8">
      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
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

      <p className="text-xs text-muted-foreground mb-6">
        Listing fees are non-refundable once your auction goes live.
      </p>

      {step === 0 && (
        <DetailsStep
          defaultValues={data}
          onNext={(values) => { setData((d) => ({ ...d, ...values })); setStep(1) }}
        />
      )}
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
  )
}
```

- [ ] **Step 2: Create `app/listings/new/steps/details-step.tsx`**

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { listingDetailsSchema, type ListingDetailsInput } from '@/lib/validators/listing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Props = {
  defaultValues: Partial<ListingDetailsInput>
  onNext: (values: ListingDetailsInput) => void
}

export default function DetailsStep({ defaultValues, onNext }: Props) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ListingDetailsInput>({
    resolver: zodResolver(listingDetailsSchema),
    defaultValues: { duration_days: 3, ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register('title')} placeholder="5–100 characters" />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register('description')} rows={4} placeholder="20–2000 characters" />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="starting_bid">Starting bid (₱)</Label>
        <Input id="starting_bid" type="number" step="1" {...register('starting_bid')} />
        {errors.starting_bid && <p className="text-xs text-destructive">{errors.starting_bid.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Duration</Label>
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
        {errors.duration_days && <p className="text-xs text-destructive">{errors.duration_days.message}</p>}
      </div>
      <Button type="submit" className="w-full">Next: Photos →</Button>
    </form>
  )
}
```

- [ ] **Step 3: Create `app/listings/new/steps/photos-step.tsx`**

```typescript
'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

type Props = {
  onBack: () => void
  onNext: (photos: File[]) => void
}

export default function PhotosStep({ onBack, onNext }: Props) {
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(selected: FileList | null) {
    if (!selected) return
    const arr = Array.from(selected)
    const invalid = arr.find(
      (f) => f.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    )
    if (invalid) { setError('Each file must be jpg/png/webp and under 5 MB.'); return }
    const combined = [...files, ...arr].slice(0, 5)
    setError('')
    setFiles(combined)
  }

  function handleNext() {
    if (files.length < 1) { setError('Upload at least 1 photo.'); return }
    onNext(files)
  }

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50"
        onClick={() => inputRef.current?.click()}
      >
        <p className="text-muted-foreground text-sm">
          Tap to add photos (1–5, max 5 MB each, jpg/png/webp)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative aspect-square rounded overflow-hidden bg-muted">
              <Image src={URL.createObjectURL(f)} alt="" fill className="object-cover" />
              <button
                type="button"
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
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

- [ ] **Step 4: Create `app/listings/new/steps/review-step.tsx`**

```typescript
'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { createListing } from '@/lib/actions/listings'
import { formatPHP } from '@/lib/utils/currency'
import type { WizardData } from '../page'
import { Button } from '@/components/ui/button'

type Props = { data: WizardData; onBack: () => void }

export default function ReviewStep({ data, onBack }: Props) {
  const [pending, startTransition] = useTransition()

  function handleSubmit() {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('title', data.title)
      formData.set('description', data.description)
      formData.set('starting_bid', String(data.starting_bid))
      formData.set('duration_days', String(data.duration_days))
      data.photos.forEach((f) => formData.append('photos', f))

      const result = await createListing(formData)
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 space-y-2 text-sm">
        <div><span className="font-semibold">Title:</span> {data.title}</div>
        <div><span className="font-semibold">Starting bid:</span> {formatPHP(data.starting_bid)}</div>
        <div><span className="font-semibold">Duration:</span> {data.duration_days} day{data.duration_days !== 1 ? 's' : ''}</div>
        <div><span className="font-semibold">Photos:</span> {data.photos.length}</div>
        <div><span className="font-semibold">Description:</span> {data.description}</div>
      </div>
      <p className="text-xs text-muted-foreground">
        After submitting, you'll be directed to pay the listing fee via GCash.
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack} disabled={pending}>← Back</Button>
        <Button type="button" className="flex-1" onClick={handleSubmit} disabled={pending}>
          {pending ? 'Submitting…' : 'Submit listing'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/listings/new/
git commit -m "feat: add listing creation wizard (3-step: details, photos, review)"
```

---

## Task 9: Payment page

**Files:**
- Create: `app/listings/[id]/pay/page.tsx`
- Create: `app/listings/[id]/pay/proof-form.tsx`

- [ ] **Step 1: Create `app/listings/[id]/pay/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ProofForm from './proof-form'
import Image from 'next/image'

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: listing } = await supabase
    .from('listings')
    .select('id, title, listing_fee, status, auctioneer_id')
    .eq('id', id)
    .eq('auctioneer_id', user.id)
    .single()

  if (!listing) notFound()
  if (listing.status !== 'pending_payment') redirect(`/me/listings`)

  const { data: settings } = await supabase
    .from('settings')
    .select('gcash_qr_url, gcash_number, gcash_name')
    .eq('id', 1)
    .single()

  const qrUrl = settings?.gcash_qr_url
    ? supabase.storage.from('listing-photos').getPublicUrl(settings.gcash_qr_url).data.publicUrl
    : null

  return (
    <div className="max-w-md mx-auto p-4 pt-8 space-y-6">
      <h1 className="text-2xl font-bold">Pay Listing Fee</h1>
      <div className="rounded-lg border p-4 space-y-2 text-sm">
        <p><span className="font-semibold">Listing:</span> {listing.title}</p>
        <p><span className="font-semibold">Amount:</span> ₱{listing.listing_fee}</p>
        <p><span className="font-semibold">GCash number:</span> {settings?.gcash_number}</p>
        <p><span className="font-semibold">GCash name:</span> {settings?.gcash_name}</p>
        <p className="text-muted-foreground">Use your BidLock username as the GCash message.</p>
      </div>
      {qrUrl && (
        <div className="flex justify-center">
          <Image src={qrUrl} alt="GCash QR code" width={200} height={200} className="rounded-lg" />
        </div>
      )}
      <ProofForm listingId={listing.id} />
    </div>
  )
}
```

- [ ] **Step 2: Create `app/listings/[id]/pay/proof-form.tsx`**

```typescript
'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { submitPaymentProof } from '@/lib/actions/listings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ProofForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState(submitPaymentProof, undefined)

  useEffect(() => {
    if (state?.error) toast.error(state.error)
  }, [state])

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="listing_id" value={listingId} />
      <div className="space-y-1">
        <Label htmlFor="payment_reference">GCash reference number</Label>
        <Input id="payment_reference" name="payment_reference" required placeholder="13-digit reference" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="proof">Payment screenshot</Label>
        <Input id="proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp" required />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Submitting…' : 'Submit proof'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/listings/
git commit -m "feat: add payment page with GCash QR and proof upload"
```

---

## Task 10: Admin review queue

**Files:**
- Create: `lib/actions/admin.ts`
- Create: `app/admin/listings/page.tsx`
- Create: `app/admin/page.tsx`

- [ ] **Step 1: Create `lib/actions/admin.ts`**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function approveListing(listingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return { error: 'Forbidden.' }

  const { data: listing } = await supabase
    .from('listings')
    .select('duration_days')
    .eq('id', listingId)
    .single()
  if (!listing) return { error: 'Listing not found.' }

  const now = new Date()
  const endsAt = new Date(now.getTime() + listing.duration_days * 86400 * 1000)

  const { error } = await supabase
    .from('listings')
    .update({
      status: 'live',
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .eq('id', listingId)
    .eq('status', 'awaiting_review')

  if (error) return { error: error.message }

  revalidatePath('/admin/listings')
  return { success: true }
}

export async function rejectListing(listingId: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return { error: 'Forbidden.' }

  if (!reason?.trim()) return { error: 'Rejection reason is required.' }

  const { error } = await supabase
    .from('listings')
    .update({ status: 'rejected', rejection_reason: reason.trim() })
    .eq('id', listingId)
    .eq('status', 'awaiting_review')

  if (error) return { error: error.message }

  revalidatePath('/admin/listings')
  return { success: true }
}
```

- [ ] **Step 2: Create `app/admin/listings/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { approveListing, rejectListing } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'
import { formatPHP } from '@/lib/utils/currency'

export default async function AdminListingsPage() {
  const supabase = await createClient()
  const { data: listings } = await supabase
    .from('listings')
    .select(`
      id, title, listing_fee, payment_reference, created_at,
      profiles!auctioneer_id (display_name, phone_number)
    `)
    .eq('status', 'awaiting_review')
    .order('created_at', { ascending: true })

  return (
    <div className="max-w-3xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-6">Review Queue</h1>
      {!listings?.length && (
        <p className="text-muted-foreground">No listings awaiting review.</p>
      )}
      <div className="space-y-4">
        {listings?.map((listing) => (
          <div key={listing.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{listing.title}</p>
                <p className="text-sm text-muted-foreground">
                  by {(listing.profiles as any)?.display_name} · {(listing.profiles as any)?.phone_number}
                </p>
                <p className="text-sm">Fee: {formatPHP(listing.listing_fee)} · Ref: {listing.payment_reference}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <form action={async () => { 'use server'; await approveListing(listing.id) }}>
                <Button type="submit" size="sm">Approve</Button>
              </form>
              <RejectForm listingId={listing.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RejectForm({ listingId }: { listingId: string }) {
  async function reject(formData: FormData) {
    'use server'
    await rejectListing(listingId, formData.get('reason') as string)
  }
  return (
    <form action={reject} className="flex gap-2">
      <input name="reason" placeholder="Rejection reason" className="border rounded px-2 py-1 text-sm flex-1" required />
      <Button type="submit" size="sm" variant="destructive">Reject</Button>
    </form>
  )
}
```

- [ ] **Step 3: Create `app/admin/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const supabase = await createClient()

  const [{ count: pending }, { count: live }, { count: openDisputes }] = await Promise.all([
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'awaiting_review'),
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'live'),
    supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
  ])

  return (
    <div className="max-w-3xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Pending review" value={pending ?? 0} />
        <StatCard label="Live auctions" value={live ?? 0} />
        <StatCard label="Open disputes" value={openDisputes ?? 0} />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded-lg p-4 text-center">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  )
}
```

- [ ] **Step 4: Promote a user to admin in Supabase dashboard**

```sql
UPDATE profiles SET is_admin = true WHERE id = 'YOUR_USER_UUID';
```

- [ ] **Step 5: Verify admin flow manually**

1. Sign in as your admin account
2. Create a test listing from another browser/account
3. Submit payment proof
4. As admin, visit `/admin/listings` — confirm listing appears
5. Approve it — confirm status changes to `live`
6. Create another and reject it — confirm status changes to `rejected`

- [ ] **Step 6: Commit**

```bash
git add lib/actions/admin.ts app/admin/
git commit -m "feat: add admin review queue (approve/reject) and dashboard"
```

---

## Task 11: Public feed and listing detail (read-only)

**Files:**
- Create: `components/listing-card.tsx`
- Create: `components/countdown.tsx`
- Modify: `app/page.tsx`
- Create: `app/listings/[id]/page.tsx`
- Create: `app/me/listings/page.tsx`

- [ ] **Step 1: Create `components/countdown.tsx`**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { formatTimeRemaining } from '@/lib/utils/time'

export default function Countdown({ endsAt }: { endsAt: string }) {
  const [display, setDisplay] = useState(formatTimeRemaining(endsAt))

  useEffect(() => {
    const interval = setInterval(() => setDisplay(formatTimeRemaining(endsAt)), 1000)
    return () => clearInterval(interval)
  }, [endsAt])

  return <span>{display}</span>
}
```

- [ ] **Step 2: Create `components/listing-card.tsx`**

```typescript
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import Countdown from './countdown'
import { formatPHP } from '@/lib/utils/currency'

type Props = {
  listing: {
    id: string
    title: string
    current_bid: number
    ends_at: string
    listing_photos: { storage_path: string }[]
  }
}

export default async function ListingCard({ listing }: Props) {
  const supabase = await createClient()
  const photo = listing.listing_photos[0]
  const photoUrl = photo
    ? supabase.storage.from('listing-photos').getPublicUrl(photo.storage_path).data.publicUrl
    : null

  return (
    <Link href={`/listings/${listing.id}`} className="block rounded-lg border overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-square bg-muted relative">
        {photoUrl ? (
          <Image src={photoUrl} alt={listing.title} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No photo</div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="font-semibold text-sm line-clamp-2">{listing.title}</p>
        <p className="text-sm">{formatPHP(listing.current_bid)}</p>
        <p className="text-xs text-muted-foreground">
          <Countdown endsAt={listing.ends_at} />
        </p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Replace `app/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import ListingCard from '@/components/listing-card'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, current_bid, ends_at, listing_photos(storage_path, display_order)')
    .eq('status', 'live')
    .order('ends_at', { ascending: true })

  return (
    <main className="max-w-2xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-6">Live Auctions</h1>
      {!listings?.length && (
        <p className="text-muted-foreground">No live auctions right now. Check back soon.</p>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {listings?.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={{ ...listing, listing_photos: (listing.listing_photos ?? []).sort((a, b) => a.display_order - b.display_order) }}
          />
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Create `app/listings/[id]/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { formatPHP } from '@/lib/utils/currency'
import Countdown from '@/components/countdown'
import BidSection from './bid-section'

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: listing } = await supabase
    .from('listings')
    .select(`
      id, title, description, current_bid, starts_at, ends_at, status,
      winner_id, auctioneer_id, starting_bid,
      listing_photos (storage_path, display_order),
      auctioneer:profiles!auctioneer_id (display_name),
      winner:profiles!winner_id (display_name, phone_number, gcash_name)
    `)
    .eq('id', id)
    .in('status', ['live', 'ended'])
    .single()

  if (!listing) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  const photos = (listing.listing_photos ?? [])
    .sort((a, b) => a.display_order - b.display_order)
    .map((p) => supabase.storage.from('listing-photos').getPublicUrl(p.storage_path).data.publicUrl)

  const { data: recentBids } = await supabase
    .from('bids')
    .select('id, amount, created_at, profiles!bidder_id(display_name)')
    .eq('listing_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  const isAuctioneer = user?.id === listing.auctioneer_id
  const isWinner = user?.id === listing.winner_id
  const showContactCard = listing.status === 'ended' && listing.winner_id !== null && (isAuctioneer || isWinner)

  return (
    <main className="max-w-2xl mx-auto p-4 pt-8 space-y-6">
      {/* Photo gallery */}
      {photos.length > 0 && (
        <div className="aspect-video relative rounded-lg overflow-hidden bg-muted">
          <Image src={photos[0]} alt={listing.title} fill className="object-contain" />
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">{listing.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          by {(listing.auctioneer as any)?.display_name}
        </p>
      </div>

      <p className="text-sm whitespace-pre-wrap">{listing.description}</p>

      {listing.status === 'live' && listing.ends_at && (
        <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Current bid</p>
            <p className="text-2xl font-bold">{formatPHP(listing.current_bid)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Ends in</p>
            <p className="text-xl font-semibold">
              <Countdown endsAt={listing.ends_at} />
            </p>
          </div>
        </div>
      )}

      {listing.status === 'ended' && (
        <div className="p-4 bg-muted rounded-lg">
          <p className="font-semibold">Auction ended</p>
          {listing.winner_id
            ? <p className="text-sm">Won by {(listing.winner as any)?.display_name} for {formatPHP(listing.current_bid)}</p>
            : <p className="text-sm text-muted-foreground">No bids were placed.</p>
          }
        </div>
      )}

      {showContactCard && (
        <div className="border rounded-lg p-4 space-y-2">
          <p className="font-semibold">Contact Information</p>
          <p className="text-xs text-muted-foreground">
            Coordinate delivery and final payment directly. We do not handle either. Report violations via the dispute form.
          </p>
          {isAuctioneer && (
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Winner's phone:</span> {(listing.winner as any)?.phone_number}</p>
              <p><span className="font-medium">Winner's GCash name:</span> {(listing.winner as any)?.gcash_name}</p>
            </div>
          )}
          {isWinner && (
            <div className="text-sm space-y-1">
              <p>Get the auctioneer's contact by visiting your bids page.</p>
            </div>
          )}
        </div>
      )}

      <BidSection
        listingId={id}
        currentBid={listing.current_bid}
        endsAt={listing.ends_at}
        status={listing.status}
        auctioneer_id={listing.auctioneer_id}
        userId={user?.id ?? null}
        initialBids={recentBids ?? []}
      />
    </main>
  )
}
```

- [ ] **Step 5: Create `app/listings/[id]/bid-section.tsx`** (client component, Realtime wired in Task 12)

```typescript
'use client'

import { useState, useEffect } from 'react'
import { formatPHP } from '@/lib/utils/currency'
import { minBidAmount } from '@/lib/validators/bid'

type Bid = {
  id: string
  amount: number
  created_at: string
  profiles: { display_name: string | null } | null
}

type Props = {
  listingId: string
  currentBid: number
  endsAt: string | null
  status: string
  auctioneer_id: string
  userId: string | null
  initialBids: Bid[]
}

export default function BidSection({
  listingId, currentBid: initialBid, endsAt, status,
  auctioneer_id, userId, initialBids
}: Props) {
  const [bids, setBids] = useState(initialBids)
  const [currentBid, setCurrentBid] = useState(initialBid)

  const canBid = status === 'live' && userId && userId !== auctioneer_id
  const minBid = minBidAmount(currentBid)

  return (
    <div className="space-y-4">
      {canBid && (
        <BidForm listingId={listingId} minBid={minBid} currentBid={currentBid}
          onBidPlaced={(amount) => setCurrentBid(amount)} />
      )}

      <div>
        <h3 className="font-semibold mb-2">Recent bids</h3>
        {bids.length === 0 && <p className="text-sm text-muted-foreground">No bids yet.</p>}
        <div className="space-y-2">
          {bids.map((bid) => (
            <div key={bid.id} className="flex justify-between text-sm">
              <span>{bid.profiles?.display_name ?? 'Anonymous'}</span>
              <span className="font-medium">{formatPHP(bid.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BidForm({ listingId, minBid, currentBid, onBidPlaced }: {
  listingId: string; minBid: number; currentBid: number; onBidPlaced: (a: number) => void
}) {
  const [amount, setAmount] = useState(String(Math.ceil(minBid)))
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    const { placeBid } = await import('@/lib/actions/bids')
    setPending(true)
    const fd = new FormData()
    fd.set('listing_id', listingId)
    fd.set('amount', amount)
    const result = await placeBid(fd)
    setPending(false)
    setConfirming(false)
    if (result?.error) { setError(result.error); return }
    onBidPlaced(Number(amount))
    setAmount(String(Math.ceil(minBidAmount(Number(amount)))))
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Minimum bid: {formatPHP(minBid)}</p>
      <div className="flex gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setError('') }}
          className="border rounded px-3 py-2 flex-1 text-sm"
          min={Math.ceil(minBid)}
          step="1"
        />
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={Number(amount) < minBid}
          className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          Place bid
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {confirming && (
        <div className="border rounded-lg p-3 bg-muted space-y-2">
          <p className="text-sm font-semibold">Confirm bid of {formatPHP(Number(amount))}?</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirming(false)} className="text-sm underline">Cancel</button>
            <button onClick={handleConfirm} disabled={pending} className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm">
              {pending ? 'Placing…' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create `app/me/listings/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatPHP } from '@/lib/utils/currency'
import { Badge } from '@/components/ui/badge'

const statusLabel: Record<string, string> = {
  pending_payment: 'Pending payment',
  awaiting_review: 'Under review',
  rejected: 'Rejected',
  live: 'Live',
  ended: 'Ended',
  cancelled: 'Cancelled',
}

export default async function MyListingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, current_bid, status, created_at, ends_at, rejection_reason')
    .eq('auctioneer_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-2xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-6">My Listings</h1>
      {!listings?.length && <p className="text-muted-foreground">You haven't listed anything yet.</p>}
      <div className="space-y-3">
        {listings?.map((listing) => (
          <div key={listing.id} className="border rounded-lg p-4 flex justify-between items-start gap-3">
            <div className="space-y-1 flex-1 min-w-0">
              <p className="font-semibold truncate">{listing.title}</p>
              <p className="text-sm">{formatPHP(listing.current_bid)}</p>
              {listing.rejection_reason && (
                <p className="text-xs text-destructive">Reason: {listing.rejection_reason}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline">{statusLabel[listing.status] ?? listing.status}</Badge>
              {listing.status === 'pending_payment' && (
                <Link href={`/listings/${listing.id}/pay`} className="text-xs underline">Pay now</Link>
              )}
              {listing.status === 'live' && (
                <Link href={`/listings/${listing.id}`} className="text-xs underline">View</Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx app/listings/ app/me/listings/ components/
git commit -m "feat: add public feed, listing detail page, and my listings"
```

---

## Task 12: Bidding with Realtime

**Files:**
- Create: `lib/actions/bids.ts`
- Modify: `app/listings/[id]/bid-section.tsx` (add Realtime)

- [ ] **Step 1: Create `lib/actions/bids.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { bidSchema } from '@/lib/validators/bid'

export async function placeBid(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to bid.' }

  const parsed = bidSchema.safeParse({
    listing_id: formData.get('listing_id'),
    amount: formData.get('amount'),
  })
  if (!parsed.success) return { error: 'Invalid bid.' }

  // Check ban status
  const { data: profile } = await supabase
    .from('profiles')
    .select('permabanned, banned_until')
    .eq('id', user.id)
    .single()
  if (profile?.permabanned || (profile?.banned_until && new Date(profile.banned_until) > new Date())) {
    return { error: 'You are currently banned from bidding.' }
  }

  const { data, error } = await supabase.rpc('place_bid', {
    p_listing_id: parsed.data.listing_id,
    p_bidder_id: user.id,
    p_amount: parsed.data.amount,
  })

  if (error) {
    const msg: Record<string, string> = {
      auction_not_live: 'This auction is not currently live.',
      auction_ended: 'This auction has already ended.',
      bidder_is_auctioneer: 'You cannot bid on your own listing.',
      bid_too_low: `Your bid is too low. Check the minimum bid amount.`,
      listing_not_found: 'Listing not found.',
    }
    return { error: msg[error.message] ?? error.message }
  }

  return { success: true, data }
}
```

- [ ] **Step 2: Add Realtime subscription to `app/listings/[id]/bid-section.tsx`**

Add the following `useEffect` inside the `BidSection` component, after the `useState` calls:

```typescript
useEffect(() => {
  const { createClient } = require('@/lib/supabase/client')
  const supabase = createClient()

  const channel = supabase
    .channel(`bids:${listingId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'bids', filter: `listing_id=eq.${listingId}` },
      (payload: any) => {
        const newBid = payload.new
        setCurrentBid(newBid.amount)
        setBids((prev) => [
          { id: newBid.id, amount: newBid.amount, created_at: newBid.created_at, profiles: null },
          ...prev.slice(0, 9),
        ])
      }
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [listingId])
```

Add `'use client'` is already at the top. The import needs to be dynamic because `createClient` from `@/lib/supabase/client` uses browser APIs.

Replace the `require` with a proper top-level import:

```typescript
import { createClient } from '@/lib/supabase/client'
```

This is already safe since `bid-section.tsx` is a Client Component.

- [ ] **Step 3: Enable Realtime on the `bids` table in Supabase**

In Supabase dashboard → Database → Replication → Tables → enable `bids` table for Realtime.

- [ ] **Step 4: Verify bidding manually**

1. Open a live listing in two browser windows (one as auctioneer, one as a different account)
2. Place a bid from the bidder window
3. Confirm the current bid updates in both windows without refresh
4. Test anti-snipe: manually set `ends_at` to 1 minute from now in the DB, then place a bid — confirm `ends_at` is extended by 2 minutes
5. Test bid floor: try bidding below the minimum — confirm toast error

- [ ] **Step 5: Commit**

```bash
git add lib/actions/bids.ts app/listings/
git commit -m "feat: add bidding with place_bid RPC and Realtime updates"
```

---

## Task 13: Auction finalization cron

**Files:**
- Create: `app/api/cron/finalize-auctions/route.ts`

- [ ] **Step 1: Create `app/api/cron/finalize-auctions/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service role key to bypass RLS
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data, error } = await supabase.rpc('finalize_auctions')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ finalized: data })
}
```

- [ ] **Step 2: Add Vercel Cron config to `vercel.json`**

```json
{
  "crons": [
    {
      "path": "/api/cron/finalize-auctions",
      "schedule": "* * * * *"
    }
  ]
}
```

Vercel Cron automatically passes `Authorization: Bearer <CRON_SECRET>` if you set `CRON_SECRET` in Vercel env vars. Alternatively, add `CRON_SECRET` manually and configure the header in the Vercel dashboard.

**Note:** Vercel Cron on the free plan runs at most once per day. For the hobby plan or paid plans, per-minute is available. For local testing, call the route manually:

```bash
curl -H "Authorization: Bearer your-cron-secret" http://localhost:3000/api/cron/finalize-auctions
```

- [ ] **Step 3: Verify finalization manually**

1. Create and approve a listing with `duration_days = 1`
2. In Supabase SQL editor, manually set `ends_at = now() - interval '1 minute'` for that listing
3. Call the cron route with curl (above)
4. Confirm `status = 'ended'` and `winner_id` is set in the `listings` table
5. Confirm notification rows were created in `notifications`
6. Visit the listing page as auctioneer — confirm contact card appears

- [ ] **Step 4: Commit**

```bash
git add app/api/ vercel.json
git commit -m "feat: add finalize-auctions cron route and Vercel cron config"
```

---

## Phase 2 Deploy Checkpoint

- [ ] `git push origin main`
- [ ] Verify Vercel deployment builds cleanly
- [ ] Enable Realtime for `bids` and `messages` tables in Supabase dashboard
- [ ] End-to-end smoke test:
  1. Create listing → pay → admin approves → listing goes live
  2. Bid from another account → see real-time update
  3. Manually finalize → winner revealed on listing page

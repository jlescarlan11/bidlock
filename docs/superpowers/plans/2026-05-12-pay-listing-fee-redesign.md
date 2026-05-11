# Pay Listing Fee Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/listings/[id]/pay` into a two-column layout with copyable payment fields, QR fallback, localStorage persistence, a sticky mobile bar, and a `payment_message` reconciliation field stored on the payment record.

**Architecture:** `page.tsx` remains a server component and gains a `profiles` query for `display_name`. All UI is split across four new colocated client components in `app/listings/[id]/pay/`: `CopyableField` (stateless row), `PaymentDetailsCard` (left column, owns copy state), `ProofSubmissionForm` (right column, owns form state), and `PayPageClient` (thin wrapper that owns the `IntersectionObserver` and sticky mobile bar). `proof-form.tsx` is deleted and replaced by `ProofSubmissionForm`.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui (Button, Input, Label), lucide-react, Supabase client, sonner toasts

---

## File map

| Action | Path |
|---|---|
| Create | `supabase/migrations/006_payment_message.sql` |
| Modify | `lib/actions/listings.ts` (lines 142–150) |
| Create | `app/listings/[id]/pay/copyable-field.tsx` |
| Create | `app/listings/[id]/pay/payment-details-card.tsx` |
| Create | `app/listings/[id]/pay/proof-submission-form.tsx` |
| Create | `app/listings/[id]/pay/pay-page-client.tsx` |
| Modify | `app/listings/[id]/pay/page.tsx` (full replacement) |
| Delete | `app/listings/[id]/pay/proof-form.tsx` |

---

## Task 1: Add `payment_message` column migration

**Files:**
- Create: `supabase/migrations/006_payment_message.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/006_payment_message.sql
ALTER TABLE listings ADD COLUMN IF NOT EXISTS payment_message text;
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: `Applying migration 006_payment_message.sql...` with no errors.

If the local Supabase CLI is not linked, apply the SQL directly in the Supabase dashboard SQL editor instead.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_payment_message.sql
git commit -m "feat: add payment_message column to listings table"
```

---

## Task 2: Store `payment_message` in `submitPaymentProof`

**Files:**
- Modify: `lib/actions/listings.ts`

- [ ] **Step 1: Add `paymentMessage` extraction after the existing `reference` extraction (around line 116)**

Open `lib/actions/listings.ts`. After this existing line:

```ts
const reference = (formData.get('payment_reference') as string)?.trim()
```

Add:

```ts
const paymentMessage = ((formData.get('payment_message') as string) ?? '').trim()
```

- [ ] **Step 2: Add `payment_message` to the DB update (around line 142)**

Find the existing `.update({...})` block:

```ts
.update({
  status: 'awaiting_review',
  payment_proof_url: storagePath,
  payment_reference: reference,
})
```

Replace with:

```ts
.update({
  status: 'awaiting_review',
  payment_proof_url: storagePath,
  payment_reference: reference,
  payment_message: paymentMessage,
})
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/listings.ts
git commit -m "feat: store payment_message on payment proof submission"
```

---

## Task 3: Create `CopyableField`

**Files:**
- Create: `app/listings/[id]/pay/copyable-field.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

type CopyableFieldProps = {
  label: string
  display: string
  copyValue: string
  fieldKey: string
  copiedField: string | null
  onCopy: (value: string, key: string) => void
}

export function CopyableField({
  label,
  display,
  copyValue,
  fieldKey,
  copiedField,
  onCopy,
}: CopyableFieldProps) {
  const isCopied = copiedField === fieldKey

  return (
    <div
      className="flex items-center gap-3 py-2 cursor-pointer"
      onClick={() => onCopy(copyValue, fieldKey)}
    >
      <span className="text-sm text-muted-foreground w-[120px] shrink-0">{label}</span>
      <span className="font-mono text-base font-semibold flex-1">{display}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-xs gap-1 shrink-0"
        onClick={(e) => {
          e.stopPropagation()
          onCopy(copyValue, fieldKey)
        }}
        aria-label={isCopied ? 'Copied' : `Copy ${label}`}
      >
        {isCopied ? (
          <>
            <Check size={14} className="text-green-600" />
            <span className="text-green-600">Copied</span>
          </>
        ) : (
          <>
            <Copy size={14} />
            <span>Copy</span>
          </>
        )}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/listings/[id]/pay/copyable-field.tsx
git commit -m "feat: add CopyableField component for pay page"
```

---

## Task 4: Create `PaymentDetailsCard`

**Files:**
- Create: `app/listings/[id]/pay/payment-details-card.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ImageIcon } from 'lucide-react'
import { CopyableField } from './copyable-field'
import { FeeDisclosureCallout } from '@/components/listings/fee-disclosure-callout'

type PaymentDetailsCardProps = {
  listingTitle: string
  listingFee: number
  gcashQrUrl: string | null
  gcashNumber: string
  gcashName: string
  messageValue: string
}

export function PaymentDetailsCard({
  listingTitle,
  listingFee,
  gcashQrUrl,
  gcashNumber,
  gcashName,
  messageValue,
}: PaymentDetailsCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopy = async (text: string, key: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    try {
      await navigator.clipboard.writeText(text.trim())
    } catch {
      const el = document.createElement('textarea')
      el.value = text.trim()
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopiedField(key)
    timerRef.current = setTimeout(() => setCopiedField(null), 1500)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      {/* Listing header */}
      <div>
        <p className="text-xs text-muted-foreground">Paying for</p>
        <p className="text-lg font-semibold">{listingTitle}</p>
      </div>

      {/* QR block */}
      <div className="flex flex-col items-center gap-2">
        {gcashQrUrl ? (
          <Image
            src={gcashQrUrl}
            alt="GCash QR code"
            width={200}
            height={200}
            className="rounded-lg"
          />
        ) : (
          <div className="w-[200px] h-[200px] bg-gray-100 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400">
            <ImageIcon size={32} />
            <p className="text-xs text-center px-4">
              QR not configured — use the GCash number below
            </p>
          </div>
        )}
        <p className="text-sm text-muted-foreground">Scan with GCash app</p>
      </div>

      {/* OR divider */}
      <div className="flex items-center gap-3">
        <hr className="flex-1 border-gray-200" />
        <span className="text-xs text-muted-foreground bg-white px-1">OR</span>
        <hr className="flex-1 border-gray-200" />
      </div>

      {/* Copyable fields */}
      <div className="divide-y divide-gray-100">
        <CopyableField
          label="GCash number"
          display={gcashNumber}
          copyValue={gcashNumber}
          fieldKey="gcash-number"
          copiedField={copiedField}
          onCopy={handleCopy}
        />
        <CopyableField
          label="Amount"
          display={`₱${listingFee}`}
          copyValue={String(listingFee)}
          fieldKey="amount"
          copiedField={copiedField}
          onCopy={handleCopy}
        />
        <CopyableField
          label="Message"
          display={messageValue}
          copyValue={messageValue.trim()}
          fieldKey="message"
          copiedField={copiedField}
          onCopy={handleCopy}
        />
      </div>

      {/* Recipient verification */}
      <FeeDisclosureCallout>
        Confirm the recipient shows as <strong>{gcashName}</strong> in GCash before sending.
      </FeeDisclosureCallout>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/listings/[id]/pay/payment-details-card.tsx
git commit -m "feat: add PaymentDetailsCard with copyable fields and QR fallback"
```

---

## Task 5: Create `ProofSubmissionForm`

**Files:**
- Create: `app/listings/[id]/pay/proof-submission-form.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { useRef, useState, useEffect, useActionState } from 'react'
import { toast } from 'sonner'
import { Upload, Clock, HelpCircle, Loader2 } from 'lucide-react'
import { submitPaymentProof } from '@/lib/actions/listings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type ProofSubmissionFormProps = {
  listingId: string
  messageValue: string
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ProofSubmissionForm({ listingId, messageValue }: ProofSubmissionFormProps) {
  const storageKey = `bidlock-pay-${listingId}`
  const [referenceNumber, setReferenceNumber] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [referenceError, setReferenceError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, action, pending] = useActionState(submitPaymentProof, undefined)

  // Restore reference number from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) setReferenceNumber(saved)
  }, [storageKey])

  // Sync reference number to localStorage on change
  useEffect(() => {
    localStorage.setItem(storageKey, referenceNumber)
  }, [referenceNumber, storageKey])

  // Show server-side errors as toasts
  useEffect(() => {
    if (state?.error) toast.error(state.error)
  }, [state])

  const applyFile = (f: File | undefined) => {
    if (!f) return
    setFile(f)
    setFileError(null)
  }

  const validate = (): boolean => {
    let valid = true
    if (!/^\d{13}$/.test(referenceNumber)) {
      setReferenceError('Enter a valid 13-digit GCash reference number.')
      valid = false
    } else {
      setReferenceError(null)
    }
    if (!file) {
      setFileError('Payment proof screenshot is required.')
      valid = false
    } else if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError('Only JPEG, PNG, and WebP images are allowed.')
      valid = false
    } else if (file.size > MAX_SIZE) {
      setFileError('File must be under 5 MB.')
      valid = false
    } else {
      setFileError(null)
    }
    return valid
  }

  // Clear localStorage optimistically before action fires.
  // The action calls redirect() on success so it never returns { success: true }.
  const wrappedAction = (formData: FormData) => {
    localStorage.removeItem(storageKey)
    return action(formData)
  }

  const isSubmittable = referenceNumber.length > 0 && file !== null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold">Submit payment proof</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-5">
        After sending payment, enter the details below.
      </p>

      <form
        action={wrappedAction}
        onSubmit={(e) => {
          if (!validate()) e.preventDefault()
        }}
        className="space-y-5"
      >
        <input type="hidden" name="listing_id" value={listingId} />
        <input type="hidden" name="payment_message" value={messageValue} />

        {/* GCash reference number */}
        <div>
          <Label htmlFor="payment_reference" className="text-sm font-medium mb-1.5 block">
            GCash reference number
          </Label>
          <Input
            id="payment_reference"
            name="payment_reference"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="13-digit reference"
            inputMode="numeric"
            className="focus-visible:ring-purple-500"
          />
          {referenceError ? (
            <p className="text-xs text-destructive mt-1">{referenceError}</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Find this in your GCash transaction history.
            </p>
          )}
        </div>

        {/* Payment screenshot upload */}
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Payment screenshot</Label>
          <input
            ref={fileInputRef}
            type="file"
            name="proof"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => applyFile(e.target.files?.[0])}
          />
          <div
            className={cn(
              'border-2 border-dashed rounded-md p-4 cursor-pointer transition-colors',
              isDragging ? 'border-purple-400 bg-purple-50' : 'border-gray-300',
              fileError && 'border-destructive'
            )}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              applyFile(e.dataTransfer.files[0])
            }}
          >
            {file ? (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                <Upload size={20} />
                <p className="text-sm">Choose a file or drag and drop</p>
                <p className="text-xs">JPG, PNG, max 5MB</p>
              </div>
            )}
          </div>
          {fileError ? (
            <p className="text-xs text-destructive mt-1">{fileError}</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Your screenshot is stored securely and only viewed for payment verification.
            </p>
          )}
        </div>

        {/* Verification timeline trust signal */}
        <div className="flex items-start gap-2 text-muted-foreground">
          <Clock size={14} className="mt-0.5 shrink-0" />
          <p className="text-sm">
            Payments are verified manually within 24 hours. Your listing goes live once verified.
          </p>
        </div>

        <Button
          type="submit"
          className="w-full bg-purple-600 hover:bg-purple-700"
          disabled={!isSubmittable || pending}
        >
          {pending ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              Submitting…
            </>
          ) : (
            'Submit proof'
          )}
        </Button>

        {/* Support contact */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <HelpCircle size={12} />
          <span>
            Wrong amount or missed the message?{' '}
            {/* TODO: wire to support feature */}
            <a href="#" className="underline">
              Contact support
            </a>
          </span>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/listings/[id]/pay/proof-submission-form.tsx
git commit -m "feat: add ProofSubmissionForm with file upload, validation, and localStorage"
```

---

## Task 6: Create `PayPageClient`

**Files:**
- Create: `app/listings/[id]/pay/pay-page-client.tsx`

`PayPageClient` is a thin client wrapper. It owns the `IntersectionObserver` that watches a sentinel `<div>` placed after the left column. When the sentinel scrolls out of view (card fully past the viewport), a sticky bar appears on mobile showing the GCash number with a one-tap copy button.

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { useRef, useState, useEffect, type ReactNode } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PayPageClientProps = {
  gcashNumber: string
  left: ReactNode
  right: ReactNode
}

export function PayPageClient({ gcashNumber, left, right }: PayPageClientProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [isCardVisible, setIsCardVisible] = useState(true)
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Observe the sentinel at the bottom of the left column.
  // When it exits the viewport, the payment details card is fully scrolled past.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsCardVisible(entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  const handleCopy = async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    try {
      await navigator.clipboard.writeText(gcashNumber)
    } catch {
      const el = document.createElement('textarea')
      el.value = gcashNumber
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    timerRef.current = setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      {/* Sticky mobile bar — only on mobile (md:hidden), only when card is scrolled past */}
      {!isCardVisible && (
        <div className="md:hidden fixed top-0 inset-x-0 z-50 bg-white border-b shadow-sm px-4 py-2 flex items-center justify-between">
          <span className="font-mono text-sm">{gcashNumber}</span>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1 shrink-0"
            onClick={handleCopy}
          >
            {copied ? (
              <><Check size={14} className="text-green-600" /><span className="text-green-600">Copied</span></>
            ) : (
              <><Copy size={14} /><span>Copy</span></>
            )}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:max-w-[560px] md:mx-auto lg:max-w-none lg:grid-cols-[480px_480px] lg:gap-12 lg:justify-center">
        {/* Left column — sentinel appended after card so observer fires when card exits */}
        <div>
          {left}
          <div ref={sentinelRef} />
        </div>
        {/* Right column */}
        {right}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/listings/[id]/pay/pay-page-client.tsx
git commit -m "feat: add PayPageClient with sticky mobile bar and IntersectionObserver"
```

---

## Task 7: Update `page.tsx` and delete `proof-form.tsx`

**Files:**
- Modify: `app/listings/[id]/pay/page.tsx` (full replacement)
- Delete: `app/listings/[id]/pay/proof-form.tsx`

- [ ] **Step 1: Delete `proof-form.tsx`**

```bash
rm "app/listings/[id]/pay/proof-form.tsx"
```

- [ ] **Step 2: Replace `page.tsx` with the full new version**

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Clock } from 'lucide-react'
import { PayPageClient } from './pay-page-client'
import { PaymentDetailsCard } from './payment-details-card'
import { ProofSubmissionForm } from './proof-submission-form'

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: listing } = await db
    .from('listings')
    .select('id, title, listing_fee, status, auctioneer_id')
    .eq('id', id)
    .eq('auctioneer_id', user.id)
    .single()

  if (!listing) notFound()
  if (listing.status !== 'pending_payment') redirect('/me/listings')

  const { data: settings } = await db
    .from('settings')
    .select('gcash_qr_url, gcash_number, gcash_name')
    .eq('id', 1)
    .single()

  if (!settings) {
    return (
      <div className="max-w-md mx-auto p-4 pt-8">
        <p className="text-destructive font-semibold">
          Unable to load payment details. Please refresh and try again.
        </p>
      </div>
    )
  }

  const { data: profile } = await db
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const messageValue =
    (profile?.display_name ?? '').trim() || user.email!.split('@')[0]

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-8">
      {/* Status pill */}
      <div className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs rounded-full px-3 py-1 mb-4">
        <Clock size={12} aria-hidden="true" />
        Payment pending
      </div>

      <h1 className="text-2xl font-bold mb-6">Pay Listing Fee</h1>

      <PayPageClient gcashNumber={settings.gcash_number}>
        <PaymentDetailsCard
          listingTitle={listing.title}
          listingFee={listing.listing_fee}
          gcashQrUrl={settings.gcash_qr_url ?? null}
          gcashNumber={settings.gcash_number}
          gcashName={settings.gcash_name}
          messageValue={messageValue}
        />
        <ProofSubmissionForm listingId={listing.id} messageValue={messageValue} />
      </PayPageClient>
    </div>
  )
}
```

Wait — `PayPageClient` expects `left` and `right` props, not `children`. Update the `page.tsx` call to match:

```tsx
<PayPageClient
  gcashNumber={settings.gcash_number}
  left={
    <PaymentDetailsCard
      listingTitle={listing.title}
      listingFee={listing.listing_fee}
      gcashQrUrl={settings.gcash_qr_url ?? null}
      gcashNumber={settings.gcash_number}
      gcashName={settings.gcash_name}
      messageValue={messageValue}
    />
  }
  right={
    <ProofSubmissionForm listingId={listing.id} messageValue={messageValue} />
  }
/>
```

Full `page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Clock } from 'lucide-react'
import { PayPageClient } from './pay-page-client'
import { PaymentDetailsCard } from './payment-details-card'
import { ProofSubmissionForm } from './proof-submission-form'

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: listing } = await db
    .from('listings')
    .select('id, title, listing_fee, status, auctioneer_id')
    .eq('id', id)
    .eq('auctioneer_id', user.id)
    .single()

  if (!listing) notFound()
  if (listing.status !== 'pending_payment') redirect('/me/listings')

  const { data: settings } = await db
    .from('settings')
    .select('gcash_qr_url, gcash_number, gcash_name')
    .eq('id', 1)
    .single()

  if (!settings) {
    return (
      <div className="max-w-md mx-auto p-4 pt-8">
        <p className="text-destructive font-semibold">
          Unable to load payment details. Please refresh and try again.
        </p>
      </div>
    )
  }

  const { data: profile } = await db
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const messageValue =
    (profile?.display_name ?? '').trim() || user.email!.split('@')[0]

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-8">
      <div className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs rounded-full px-3 py-1 mb-4">
        <Clock size={12} aria-hidden="true" />
        Payment pending
      </div>

      <h1 className="text-2xl font-bold mb-6">Pay Listing Fee</h1>

      <PayPageClient
        gcashNumber={settings.gcash_number}
        left={
          <PaymentDetailsCard
            listingTitle={listing.title}
            listingFee={listing.listing_fee}
            gcashQrUrl={settings.gcash_qr_url ?? null}
            gcashNumber={settings.gcash_number}
            gcashName={settings.gcash_name}
            messageValue={messageValue}
          />
        }
        right={
          <ProofSubmissionForm listingId={listing.id} messageValue={messageValue} />
        }
      />
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Start the dev server and open the page**

```bash
npm run dev
```

Navigate to a listing you own that is in `pending_payment` status at `http://localhost:3000/listings/<id>/pay`.

- [ ] **Step 5: Verify the desktop layout**

At `>= 1024px` viewport width:
- [ ] Two columns side-by-side: payment details left, form right
- [ ] "Payment pending" status pill above the h1
- [ ] Listing title shows under "Paying for"
- [ ] QR renders (or placeholder with `ImageIcon` if `gcash_qr_url` is null in settings)
- [ ] "Scan with GCash app" appears below QR
- [ ] OR divider between QR and copyable rows
- [ ] Three copyable rows: GCash number, Amount (₱-prefixed), Message (display_name or email prefix)
- [ ] Each row's Copy button swaps to "Copied" for 1.5s on click, then reverts
- [ ] Clicking anywhere in a row also triggers copy
- [ ] Only one row shows "Copied" at a time
- [ ] `FeeDisclosureCallout` shows `gcash_name` from settings (not hardcoded)
- [ ] Right column: form heading, reference input, file upload drop zone, clock trust signal, Submit button, support contact

- [ ] **Step 6: Verify the form**

- [ ] Submit with empty fields — both inline errors appear
- [ ] Enter a 12-digit reference — "Enter a valid 13-digit" error appears
- [ ] Enter a 13-digit reference — error clears
- [ ] Upload a file — drop zone shows filename and size, "Change" button appears
- [ ] Submit button is disabled until both fields have values
- [ ] Reload the page — reference number is restored from localStorage
- [ ] Submit a valid form — redirects to `/me/listings`
- [ ] localStorage entry for this listing is cleared after submit

- [ ] **Step 7: Verify mobile (< 768px)**

- [ ] Resize to 375px width — single column layout, payment details on top
- [ ] Scroll past the payment details card — sticky bar appears at top with GCash number and Copy button
- [ ] Tap Copy in sticky bar — "Copied" feedback for 1.5s
- [ ] Scroll back up — sticky bar disappears

- [ ] **Step 8: Commit**

```bash
git add app/listings/[id]/pay/page.tsx
git rm app/listings/[id]/pay/proof-form.tsx
git commit -m "feat: redesign pay listing fee page with two-column layout and copy fields"
```

---

## Spec coverage check

| Requirement | Task |
|---|---|
| Two-column desktop layout | Task 6, 7 |
| Status pill above h1 | Task 7 |
| QR from `gcash_qr_url` with fallback placeholder | Task 4 |
| OR divider between QR and manual fields | Task 4 |
| Three copyable rows (number, amount, message) | Tasks 3, 4 |
| Whole row clickable, 1.5s Copied feedback, single active state | Tasks 3, 4 |
| `display_name` with email prefix fallback | Task 7 |
| Recipient name from `gcash_name` (not hardcoded) | Task 4 |
| `FeeDisclosureCallout` reused | Task 4 |
| Form heading + subtext | Task 5 |
| Reference input with `inputMode="numeric"` | Task 5 |
| Custom file upload UI (drag-drop, empty/selected states) | Task 5 |
| Client validation mirrors server regex | Task 5 |
| Submit disabled until both fields filled | Task 5 |
| Loading state on submit | Task 5 |
| `payment_message` hidden field stored on record | Tasks 1, 2, 5 |
| localStorage persistence, cleared on submit | Task 5 |
| Clock trust signal | Task 5 |
| Support contact placeholder with TODO | Task 5 |
| Sticky mobile bar on scroll-past | Task 6 |
| `proof-form.tsx` deleted | Task 7 |
| Tablet single-column `max-w-[560px]` | Task 6 |

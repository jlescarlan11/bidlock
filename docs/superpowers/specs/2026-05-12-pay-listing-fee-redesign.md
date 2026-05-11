# BidLock — Pay Listing Fee Page Redesign

**Date:** 2026-05-12
**Scope:** `app/listings/[id]/pay/page.tsx`, `app/listings/[id]/pay/proof-form.tsx` (deleted), new files `payment-details-card.tsx`, `proof-submission-form.tsx`, `copyable-field.tsx` in the same directory
**Out of scope:** Routing, API endpoints, `submitPaymentProof` action logic (minor addition only), auth/session handling, header/footer/navigation

---

## Problem

The pay page is the highest-risk step in the listing flow. Typos in the GCash number, amount, or message cause reconciliation failures, support tickets, and listings stuck in `pending_payment`. The current page:

- Renders everything in a narrow `max-w-md` centered column — empty space on desktop
- Has a broken placeholder where the QR code should be (null `gcash_qr_url` renders nothing)
- Buries the message instruction in muted text; users must look up their own username and type it manually
- Provides no copy affordances on the GCash number, amount, or message
- Has no trust signals — no verification timeline, no recipient name confirmation, no support contact
- Contains a typo: `gcash_name` "John Lester EScarlan" (admin must correct in settings, spec fixes rendering)

---

## Goal

- Two-column layout on desktop: payment instructions + details left, proof submission right
- Copy buttons on all three critical fields (GCash number, amount, message)
- Pre-filled, copyable message field showing the user's `display_name`
- QR rendered from DB-stored `gcash_qr_url` with graceful fallback placeholder
- Anchored trust signals: recipient name confirmation, verification timeline, support contact
- `localStorage` persistence so users coming back from GCash don't lose their reference number
- Sticky mobile bar so the GCash number is accessible after app-switching

---

## Architecture

`page.tsx` remains a server component. It gains one new `profiles` query to fetch `display_name`. All fetched data is passed as props to two new client components that own their respective columns.

A thin client wrapper `PayPageClient` sits between `page.tsx` and the two column components. It owns the `IntersectionObserver` sentinel ref and `isCardVisible` state, and renders the sticky mobile bar conditionally. This keeps the server/client boundary clean — `page.tsx` never needs to become a client component.

```
page.tsx (server)
└── PayPageClient (client — owns sentinel ref, isCardVisible state)
    ├── PaymentDetailsCard (client — owns copiedField state)
    │   └── CopyableField ×3 (stateless)
    │   └── FeeDisclosureCallout (reused — recipient name callout)
    └── ProofSubmissionForm (client — owns form state, localStorage)
```

`proof-form.tsx` is deleted. `ProofSubmissionForm` is its replacement.

---

## Data layer (`page.tsx`)

Existing queries: `user` (auth), `listing` (title, listing_fee, status, auctioneer_id), `settings` (gcash_qr_url, gcash_number, gcash_name).

New query:

```ts
const { data: profile } = await db
  .from('profiles')
  .select('display_name')
  .eq('id', user.id)
  .single()
```

**`messageValue` resolution** (in order):

1. `profile?.display_name` if non-empty string
2. `user.email!.split('@')[0]` — always present, stable, human-readable for reconciliation

`messageValue` is passed to both `PaymentDetailsCard` (display) and `ProofSubmissionForm` (hidden field on submit).

---

## `submitPaymentProof` action (minor addition)

Add `payment_message` to the DB update so the stored record reflects exactly what the user was shown, regardless of subsequent `display_name` changes:

```ts
.update({
  status: 'awaiting_review',
  payment_proof_url: storagePath,
  payment_reference: reference,
  payment_message: formData.get('payment_message') as string,  // ← new
})
```

The action calls `redirect()` on success and never returns `{ success: true }`. localStorage is cleared by wrapping the action dispatch — the entry is removed optimistically before the action fires. If the action errors, component state still holds the reference number so nothing is lost.

---

## Files

### 1. `app/listings/[id]/pay/proof-form.tsx`

**Deleted.** Replaced by `proof-submission-form.tsx`.

---

### 2. `app/listings/[id]/pay/copyable-field.tsx` (new)

Stateless client component. Renders a single copy row.

**Props:**

```ts
type CopyableFieldProps = {
  label: string
  display: string       // formatted value shown to user (e.g., "₱20", display_name)
  copyValue: string     // raw value written to clipboard (trimmed, no currency prefix)
  fieldKey: string      // unique key for copiedField comparison
  copiedField: string | null
  onCopy: (value: string, key: string) => void
}
```

**Layout:** `flex items-center gap-3 py-2 cursor-pointer` (entire row is click target).
- Label: `text-sm text-muted-foreground w-[120px] shrink-0`
- Value: `font-mono text-base font-semibold flex-1`
- Copy button: `ghost` variant, `text-xs`, shows `Copy` icon + "Copy" normally; swaps to `Check` icon + "Copied" when `copiedField === fieldKey`

**`handleCopy` pattern (owned by `PaymentDetailsCard`, passed down):**

```ts
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
```

---

### 3. `app/listings/[id]/pay/payment-details-card.tsx` (new)

Client component. Owns `copiedField` state and `handleCopy`.

**Props:**

```ts
type PaymentDetailsCardProps = {
  listingTitle: string
  listingFee: number
  gcashQrUrl: string | null
  gcashNumber: string
  gcashName: string
  messageValue: string
  sentinelRef: React.RefObject<HTMLDivElement>
}
```

**Structure (top to bottom):**

1. **Listing header** — `"Paying for"` label (`text-xs text-muted-foreground`), listing title (`text-lg font-semibold`)
2. **QR block** — centered, `mt-4 mb-2`
   - If `gcashQrUrl`: `<Image src={gcashQrUrl} alt="GCash QR code" width={200} height={200} className="rounded-lg mx-auto" />`
   - If null: `200×200` muted placeholder card — `bg-gray-100 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 text-xs` — `ImageIcon` (lucide) at size 32 + "QR not configured — use the GCash number below"
   - Below QR: `"Scan with GCash app"` in `text-sm text-muted-foreground text-center`
3. **OR divider** — `flex items-center gap-3 my-3` — `<hr className="flex-1" />` + `<span className="text-xs text-muted-foreground bg-white px-1">OR</span>` + `<hr className="flex-1" />`
4. **Three `CopyableField` rows:**
   - GCash number — display: `gcashNumber`, copyValue: `gcashNumber`
   - Amount — display: `₱${listingFee}`, copyValue: `String(listingFee)`
   - Message — display: `messageValue`, copyValue: `messageValue.trim()`
5. **`FeeDisclosureCallout`** (reused) — `"Confirm the recipient shows as "` + `<strong>{ gcashName }</strong>` + `" in GCash before sending."` — renders `gcashName` from settings so the admin can correct the name without a deploy
6. **Sentinel** — `<div ref={sentinelRef} />` at the very end — zero height, observed by `PayPageClient`

**Card shell:** `bg-white rounded-2xl shadow-sm border border-gray-100 p-6`

---

### 4. `app/listings/[id]/pay/proof-submission-form.tsx` (new)

Client component. Replaces `proof-form.tsx`.

**Props:**

```ts
type ProofSubmissionFormProps = {
  listingId: string
  messageValue: string
}
```

**State:**

```ts
const [referenceNumber, setReferenceNumber] = useState('')
const [file, setFile] = useState<File | null>(null)
const [referenceError, setReferenceError] = useState<string | null>(null)
const [fileError, setFileError] = useState<string | null>(null)
const [isDragging, setIsDragging] = useState(false)
const fileInputRef = useRef<HTMLInputElement>(null)
const [state, action, pending] = useActionState(submitPaymentProof, undefined)
```

**`localStorage` sync:**

- Key: `bidlock-pay-${listingId}`
- On mount: `const saved = localStorage.getItem(key); if (saved) setReferenceNumber(saved)`
- On `referenceNumber` change: `localStorage.setItem(key, referenceNumber)` (direct, no debounce — acceptable at this scale)
- Clear: wrapped action dispatch removes the entry before the action fires

```ts
const wrappedAction = (formData: FormData) => {
  localStorage.removeItem(`bidlock-pay-${listingId}`)
  return action(formData)
}
```

**Client-side validation** (mirrors server regex exactly):

```ts
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
  } else if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    setFileError('Only JPEG, PNG, and WebP images are allowed.')
    valid = false
  } else if (file.size > 5 * 1024 * 1024) {
    setFileError('File must be under 5 MB.')
    valid = false
  } else {
    setFileError(null)
  }
  return valid
}
```

Called on form `onSubmit`; if invalid, `e.preventDefault()` and errors render below each field.

**Submit button:** disabled when `!referenceNumber || !file || pending`. Loading state: spinner + "Submitting…".

**File upload UI:**

- Hidden `<input type="file" ref={fileInputRef} accept="image/jpeg,image/png,image/webp" />`
- Drop zone: `border-2 border-dashed rounded-md p-4 cursor-pointer` — `border-gray-300` normally, `border-purple-400` when `isDragging`
- Empty state: `Upload` icon + "Choose a file or drag and drop" + `"JPG, PNG, max 5MB"` in `text-xs text-muted-foreground`
- Selected state: filename in `font-medium text-sm`, formatted size in `text-xs text-muted-foreground`, "Change" button
- `onDragOver`: `e.preventDefault()`, `setIsDragging(true)`
- `onDragLeave`: `setIsDragging(false)`
- `onDrop`: `e.preventDefault()`, `setIsDragging(false)`, take `e.dataTransfer.files[0]`

**`useEffect` for toast on error:**

```ts
useEffect(() => {
  if (state?.error) toast.error(state.error)
}, [state])
```

**Form structure (top to bottom):**

1. Heading: "Submit payment proof" (`text-lg font-semibold`) + subtext
2. Hidden fields: `listing_id`, `payment_message` (`messageValue`)
3. Reference number input + helper text + inline error
4. File upload drop zone + helper text + inline error
5. Trust signal: `Clock` icon + verification timeline note (`text-sm text-muted-foreground`)
6. Submit button (full-width, primary purple)
7. Support contact: `HelpCircle` icon + "Wrong amount or missed the message?" + `<a href="#" className="underline">Contact support</a>` + `{/* TODO: wire to support feature */}`

**Card shell:** same as `PaymentDetailsCard` — `bg-white rounded-2xl shadow-sm border border-gray-100 p-6`

---

### 5. `app/listings/[id]/pay/pay-page-client.tsx` (new)

Thin client wrapper. Owns `IntersectionObserver` and `isCardVisible` state.

```ts
'use client'
// Observes bottom sentinel of PaymentDetailsCard.
// When sentinel exits viewport (card fully scrolled past), renders sticky mobile bar.
```

**Sticky bar** (rendered when `!isCardVisible`, mobile only — `md:hidden`):

- `fixed top-0 inset-x-0 z-50 bg-white border-b shadow-sm px-4 py-2 flex items-center justify-between`
- Left: `font-mono text-sm` showing `gcashNumber` only (no "GCash:" label — avoids crowding on 320px)
- Right: ghost button with `Copy` icon — copies `gcashNumber` directly, no expand/scroll behavior needed since the number is the most re-needed value mid-flow

**Sentinel observation:**

```ts
useEffect(() => {
  if (!sentinelRef.current) return
  const observer = new IntersectionObserver(
    ([entry]) => setIsCardVisible(entry.isIntersecting),
    { threshold: 0 }
  )
  observer.observe(sentinelRef.current)
  return () => observer.disconnect()
}, [])
```

---

### 6. `app/listings/[id]/pay/page.tsx` (modified)

**New queries added:**

```ts
const { data: profile } = await db
  .from('profiles')
  .select('display_name')
  .eq('id', user.id)
  .single()

const messageValue =
  (profile?.display_name ?? '').trim() || user.email!.split('@')[0]
```

**New layout:**

```tsx
<div className="max-w-[1100px] mx-auto px-4 py-8">
  {/* Status pill */}
  <div className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs rounded-full px-3 py-1 mb-4">
    <Clock size={12} />
    Payment pending
  </div>

  <h1 className="text-2xl font-bold mb-6">Pay Listing Fee</h1>

  <PayPageClient gcashNumber={settings.gcash_number} messageValue={messageValue}>
    <PaymentDetailsCard ... />
    <ProofSubmissionForm listingId={listing.id} messageValue={messageValue} />
  </PayPageClient>
</div>
```

**Responsive grid (inside `PayPageClient`):**

```tsx
<div className="grid grid-cols-1 md:max-w-[560px] md:mx-auto lg:max-w-none lg:grid-cols-[480px_480px] lg:gap-12 lg:justify-center gap-6">
  {children}
</div>
```

---

## Validation rules (canonical)

| Field | Rule |
|---|---|
| Reference number | Required, `/^\d{13}$/` |
| Screenshot | Required, `image/jpeg \| image/png \| image/webp`, max 5 MB |

Same on client and server. Server is authoritative; client errors are UX only.

---

## Implementation notes

- `next/image` requires `gcash_qr_url` domain to be in `next.config` `remotePatterns`. If the URL is a Supabase storage URL, the domain is already configured. Verify before testing.
- The sticky bar shows the GCash number with a copy button rather than a "View details ↑" scroll button — simpler, covers the primary need (re-copying the number mid app-switch), and avoids layout complexity on narrow viewports.
- `FeeDisclosureCallout` renders `gcashName` from settings, not a hardcoded string, so the admin can correct typos or update the account name without a code change.
- `payment_message` column must exist on the `listings` table. If it doesn't, add a migration before implementing.

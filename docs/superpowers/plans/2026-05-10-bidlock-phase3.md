# BidLock Phase 3 — Social & Trust Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add post-auction chat, ratings, dispute + strike system, and all admin management tools (users, disputes, settings) to complete the MVP.

**Architecture:** Chat uses Supabase Realtime subscribed to the `messages` table filtered by `listing_id`. Ratings and disputes are Server Actions with server-side eligibility checks. Admin tools are Server Component pages backed by admin-only Server Actions.

**Tech Stack:** Next.js 15, Supabase Realtime, react-hook-form + zod, sonner, shadcn/ui

**Prerequisite:** Phase 2 complete and deployed.

---

## File Map

| File | Purpose |
|---|---|
| `lib/validators/message.ts` | Zod schema for chat message body |
| `lib/validators/rating.ts` | Zod schema for rating submission |
| `lib/validators/dispute.ts` | Zod schema for dispute submission |
| `lib/actions/messages.ts` | sendMessage Server Action |
| `lib/actions/ratings.ts` | submitRating Server Action |
| `lib/actions/disputes.ts` | submitDispute Server Action |
| `lib/actions/admin.ts` | Extend with banUser, unbanUser, resolveDispute, updateSettings |
| `app/listings/[id]/chat-section.tsx` | Client component: Realtime chat panel |
| `app/listings/[id]/rating-form.tsx` | Client component: up/down + comment |
| `app/listings/[id]/dispute-form.tsx` | Client component: dispute submission |
| `app/me/bids/page.tsx` | My bids (won/lost/active) |
| `app/admin/disputes/page.tsx` | Admin dispute queue |
| `app/admin/users/page.tsx` | Admin user search + ban management |
| `app/admin/settings/page.tsx` | Admin settings (listing fee, GCash details, QR upload) |

---

## Task 14: Chat

**Files:**
- Create: `lib/validators/message.ts`
- Create: `lib/actions/messages.ts`
- Create: `app/listings/[id]/chat-section.tsx`
- Modify: `app/listings/[id]/page.tsx`

- [ ] **Step 1: Create `lib/validators/message.ts`**

```typescript
import { z } from 'zod'

export const messageSchema = z.object({
  body: z.string().min(1).max(1000),
  listing_id: z.string().uuid(),
  recipient_id: z.string().uuid(),
})

export type MessageInput = z.infer<typeof messageSchema>
```

- [ ] **Step 2: Create `lib/actions/messages.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { messageSchema } from '@/lib/validators/message'

export async function sendMessage(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const parsed = messageSchema.safeParse({
    body: formData.get('body'),
    listing_id: formData.get('listing_id'),
    recipient_id: formData.get('recipient_id'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Verify sender is auctioneer or winner of this listing
  const { data: listing } = await supabase
    .from('listings')
    .select('auctioneer_id, winner_id, status')
    .eq('id', parsed.data.listing_id)
    .single()

  if (!listing || listing.status !== 'ended') {
    return { error: 'Chat is only available after an auction ends.' }
  }
  const isParticipant = user.id === listing.auctioneer_id || user.id === listing.winner_id
  if (!isParticipant) return { error: 'You are not a participant in this auction.' }

  // Ensure recipient is the other participant
  const expectedRecipient = user.id === listing.auctioneer_id
    ? listing.winner_id
    : listing.auctioneer_id
  if (parsed.data.recipient_id !== expectedRecipient) {
    return { error: 'Invalid recipient.' }
  }

  const { error } = await supabase.from('messages').insert({
    listing_id: parsed.data.listing_id,
    sender_id: user.id,
    recipient_id: parsed.data.recipient_id,
    body: parsed.data.body,
  })

  if (error) return { error: error.message }
  return { success: true }
}
```

- [ ] **Step 3: Create `app/listings/[id]/chat-section.tsx`**

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendMessage } from '@/lib/actions/messages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Message = {
  id: string
  body: string
  created_at: string
  sender_id: string
  profiles: { display_name: string | null } | null
}

type Props = {
  listingId: string
  recipientId: string
  userId: string
  initialMessages: Message[]
}

export default function ChatSection({ listingId, recipientId, userId, initialMessages }: Props) {
  const [messages, setMessages] = useState(initialMessages)
  const [body, setBody] = useState('')
  const [pending, setPending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`messages:${listingId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `listing_id=eq.${listingId}` },
        (payload: any) => {
          setMessages((prev) => [...prev, { ...payload.new, profiles: null }])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [listingId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setPending(true)
    const fd = new FormData()
    fd.set('body', body)
    fd.set('listing_id', listingId)
    fd.set('recipient_id', recipientId)
    const result = await sendMessage(fd)
    setPending(false)
    if (!result?.error) setBody('')
  }

  return (
    <div className="border rounded-lg flex flex-col h-80">
      <div className="p-3 border-b font-semibold text-sm">Messages</div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground">No messages yet. Start the conversation.</p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender_id === userId
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`rounded-lg px-3 py-2 text-sm max-w-xs ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {msg.body}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message…"
          maxLength={1000}
          disabled={pending}
        />
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>Send</Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Add ChatSection to `app/listings/[id]/page.tsx`**

After the `showContactCard` block, add:

```typescript
  // Fetch messages if chat is available
  const showChat = listing.status === 'ended' && listing.winner_id !== null && (isAuctioneer || isWinner)
  let initialMessages: any[] = []
  let recipientId: string | null = null

  if (showChat && user) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, body, created_at, sender_id, profiles!sender_id(display_name)')
      .eq('listing_id', id)
      .order('created_at', { ascending: true })
    initialMessages = msgs ?? []
    recipientId = isAuctioneer ? listing.winner_id : listing.auctioneer_id
  }
```

Then in the JSX, after the contact card:

```typescript
      {showChat && user && recipientId && (
        <ChatSection
          listingId={id}
          recipientId={recipientId}
          userId={user.id}
          initialMessages={initialMessages}
        />
      )}
```

Add `import ChatSection from './chat-section'` at the top of the file.

- [ ] **Step 5: Enable Realtime for `messages` table in Supabase**

In Supabase dashboard → Database → Replication → Tables → enable `messages`.

- [ ] **Step 6: Verify chat manually**

1. End a test auction (use the cron route)
2. Open the listing as auctioneer in one window and as winner in another
3. Send a message from one side — confirm it appears on the other side without refresh

- [ ] **Step 7: Commit**

```bash
git add lib/validators/message.ts lib/actions/messages.ts app/listings/
git commit -m "feat: add post-auction Realtime chat between auctioneer and winner"
```

---

## Task 15: Ratings

**Files:**
- Create: `lib/validators/rating.ts`
- Create: `lib/actions/ratings.ts`
- Create: `app/listings/[id]/rating-form.tsx`
- Modify: `app/listings/[id]/page.tsx`

- [ ] **Step 1: Create `lib/validators/rating.ts`**

```typescript
import { z } from 'zod'

export const ratingSchema = z.object({
  listing_id: z.string().uuid(),
  ratee_id: z.string().uuid(),
  verdict: z.enum(['up', 'down']),
  comment: z.string().max(500).optional(),
})

export type RatingInput = z.infer<typeof ratingSchema>
```

- [ ] **Step 2: Create `lib/actions/ratings.ts`**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ratingSchema } from '@/lib/validators/rating'

export async function submitRating(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const parsed = ratingSchema.safeParse({
    listing_id: formData.get('listing_id'),
    ratee_id: formData.get('ratee_id'),
    verdict: formData.get('verdict'),
    comment: formData.get('comment') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Server-side eligibility: listing must be ended, user must be auctioneer or winner
  const { data: listing } = await supabase
    .from('listings')
    .select('status, auctioneer_id, winner_id')
    .eq('id', parsed.data.listing_id)
    .single()

  if (!listing || listing.status !== 'ended') {
    return { error: 'Ratings are only available after an auction ends.' }
  }
  if (listing.winner_id === null) {
    return { error: 'No winner — cannot submit a rating.' }
  }
  const isParticipant = user.id === listing.auctioneer_id || user.id === listing.winner_id
  if (!isParticipant) return { error: 'You were not a participant in this auction.' }

  // Ratee must be the other participant
  const expectedRatee = user.id === listing.auctioneer_id ? listing.winner_id : listing.auctioneer_id
  if (parsed.data.ratee_id !== expectedRatee) return { error: 'Invalid ratee.' }

  const { error } = await supabase.from('ratings').insert({
    listing_id: parsed.data.listing_id,
    rater_id: user.id,
    ratee_id: parsed.data.ratee_id,
    verdict: parsed.data.verdict,
    comment: parsed.data.comment ?? null,
  })

  if (error?.code === '23505') return { error: 'You have already rated this auction.' }
  if (error) return { error: error.message }

  revalidatePath(`/listings/${parsed.data.listing_id}`)
  return { success: true }
}
```

- [ ] **Step 3: Create `app/listings/[id]/rating-form.tsx`**

```typescript
'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { submitRating } from '@/lib/actions/ratings'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  listingId: string
  rateeId: string
  rateeName: string
  existingRating: { verdict: string } | null
}

export default function RatingForm({ listingId, rateeId, rateeName, existingRating }: Props) {
  const [state, action, pending] = useActionState(submitRating, undefined)

  useEffect(() => {
    if (state?.success) toast.success('Rating submitted.')
    if (state?.error) toast.error(state.error)
  }, [state])

  if (existingRating) {
    return (
      <div className="border rounded-lg p-4 text-sm">
        <p>You rated <strong>{rateeName}</strong>: {existingRating.verdict === 'up' ? '👍' : '👎'}</p>
      </div>
    )
  }

  return (
    <form action={action} className="border rounded-lg p-4 space-y-3">
      <p className="font-semibold text-sm">Rate {rateeName}</p>
      <input type="hidden" name="listing_id" value={listingId} />
      <input type="hidden" name="ratee_id" value={rateeId} />
      <div className="flex gap-2">
        <button
          type="submit"
          name="verdict"
          value="up"
          disabled={pending}
          className="flex-1 border rounded-lg py-3 text-lg hover:bg-green-50 active:bg-green-100"
        >
          👍 Positive
        </button>
        <button
          type="submit"
          name="verdict"
          value="down"
          disabled={pending}
          className="flex-1 border rounded-lg py-3 text-lg hover:bg-red-50 active:bg-red-100"
        >
          👎 Negative
        </button>
      </div>
      <Textarea name="comment" placeholder="Optional comment (max 500 chars)" maxLength={500} rows={2} />
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  )
}
```

- [ ] **Step 4: Add RatingForm to `app/listings/[id]/page.tsx`**

After the chat section block, add:

```typescript
  // Fetch existing ratings
  let myRating = null
  let rateeId: string | null = null
  let rateeName: string | null = null

  if (listing.status === 'ended' && listing.winner_id && user && (isAuctioneer || isWinner)) {
    const { data: existing } = await supabase
      .from('ratings')
      .select('verdict')
      .eq('listing_id', id)
      .eq('rater_id', user.id)
      .maybeSingle()
    myRating = existing

    rateeId = isAuctioneer ? listing.winner_id : listing.auctioneer_id
    rateeName = isAuctioneer
      ? (listing.winner as any)?.display_name
      : (listing.auctioneer as any)?.display_name
  }
```

In the JSX, after the chat section:

```typescript
      {listing.status === 'ended' && listing.winner_id && user && rateeId && rateeName && (isAuctioneer || isWinner) && (
        <RatingForm
          listingId={id}
          rateeId={rateeId}
          rateeName={rateeName}
          existingRating={myRating}
        />
      )}
```

Add `import RatingForm from './rating-form'` at the top.

- [ ] **Step 5: Commit**

```bash
git add lib/validators/rating.ts lib/actions/ratings.ts app/listings/
git commit -m "feat: add post-auction ratings (up/down + comment)"
```

---

## Task 16: Disputes and strike system

**Files:**
- Create: `lib/validators/dispute.ts`
- Create: `lib/actions/disputes.ts`
- Create: `app/listings/[id]/dispute-form.tsx`
- Modify: `app/listings/[id]/page.tsx`
- Create: `app/admin/disputes/page.tsx`
- Modify: `lib/actions/admin.ts`

- [ ] **Step 1: Create `lib/validators/dispute.ts`**

```typescript
import { z } from 'zod'

export const disputeSchema = z.object({
  listing_id: z.string().uuid(),
  reported_user_id: z.string().uuid(),
  reason: z.string().min(20).max(1000),
})

export type DisputeInput = z.infer<typeof disputeSchema>
```

- [ ] **Step 2: Create `lib/actions/disputes.ts`**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { disputeSchema } from '@/lib/validators/dispute'

export async function submitDispute(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const parsed = disputeSchema.safeParse({
    listing_id: formData.get('listing_id'),
    reported_user_id: formData.get('reported_user_id'),
    reason: formData.get('reason'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  if (parsed.data.reported_user_id === user.id) {
    return { error: 'You cannot report yourself.' }
  }

  const { error } = await supabase.from('disputes').insert({
    listing_id: parsed.data.listing_id,
    reporter_id: user.id,
    reported_user_id: parsed.data.reported_user_id,
    reason: parsed.data.reason,
  })

  if (error) return { error: error.message }
  revalidatePath(`/listings/${parsed.data.listing_id}`)
  return { success: true }
}
```

- [ ] **Step 3: Create `app/listings/[id]/dispute-form.tsx`**

```typescript
'use client'

import { useState, useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { submitDispute } from '@/lib/actions/disputes'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type Props = { listingId: string; reportedUserId: string; reportedUserName: string }

export default function DisputeForm({ listingId, reportedUserId, reportedUserName }: Props) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(submitDispute, undefined)

  useEffect(() => {
    if (state?.success) { toast.success('Dispute submitted.'); setOpen(false) }
    if (state?.error) toast.error(state.error)
  }, [state])

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-destructive underline">
        Report a violation
      </button>
    )
  }

  return (
    <form action={action} className="border border-destructive rounded-lg p-4 space-y-3">
      <p className="font-semibold text-sm text-destructive">Report {reportedUserName}</p>
      <input type="hidden" name="listing_id" value={listingId} />
      <input type="hidden" name="reported_user_id" value={reportedUserId} />
      <Textarea
        name="reason"
        placeholder="Describe the violation (20–1000 characters)"
        minLength={20}
        maxLength={1000}
        rows={3}
        required
      />
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="text-xs underline">Cancel</button>
        <Button type="submit" variant="destructive" size="sm" disabled={pending}>
          {pending ? 'Submitting…' : 'Submit report'}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Add DisputeForm to `app/listings/[id]/page.tsx`**

After the rating form, add — for ended listings where the current user is a participant:

```typescript
      {listing.status === 'ended' && user && (isAuctioneer || isWinner) && rateeId && rateeName && (
        <DisputeForm
          listingId={id}
          reportedUserId={rateeId}
          reportedUserName={rateeName}
        />
      )}
```

Add `import DisputeForm from './dispute-form'` at the top.

- [ ] **Step 5: Add `resolveDispute` to `lib/actions/admin.ts`**

```typescript
export async function resolveDispute(disputeId: string, verdict: 'upheld' | 'dismissed', adminNote: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return { error: 'Forbidden.' }

  const { data: dispute } = await supabase
    .from('disputes')
    .select('reported_user_id')
    .eq('id', disputeId)
    .single()
  if (!dispute) return { error: 'Dispute not found.' }

  const { error: updateError } = await supabase
    .from('disputes')
    .update({ status: verdict, admin_note: adminNote, resolved_at: new Date().toISOString() })
    .eq('id', disputeId)
  if (updateError) return { error: updateError.message }

  if (verdict === 'upheld') {
    // Increment strike count and apply ban policy
    const { data: reportedUser } = await supabase
      .from('profiles')
      .select('strike_count')
      .eq('id', dispute.reported_user_id)
      .single()

    const newStrikes = (reportedUser?.strike_count ?? 0) + 1
    const banUpdate: Record<string, unknown> = { strike_count: newStrikes }

    if (newStrikes >= 5) {
      banUpdate.permabanned = true
    } else if (newStrikes >= 3) {
      banUpdate.banned_until = new Date(Date.now() + 7 * 86400 * 1000).toISOString()
    }

    await supabase
      .from('profiles')
      .update(banUpdate)
      .eq('id', dispute.reported_user_id)
  }

  revalidatePath('/admin/disputes')
  return { success: true }
}
```

- [ ] **Step 6: Create `app/admin/disputes/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { resolveDispute } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default async function AdminDisputesPage() {
  const supabase = await createClient()
  const { data: disputes } = await supabase
    .from('disputes')
    .select(`
      id, reason, status, admin_note, created_at,
      reporter:profiles!reporter_id (display_name),
      reported:profiles!reported_user_id (display_name, strike_count),
      listings (title)
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: true })

  return (
    <div className="max-w-3xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-6">Disputes</h1>
      {!disputes?.length && <p className="text-muted-foreground">No open disputes.</p>}
      <div className="space-y-4">
        {disputes?.map((d) => (
          <div key={d.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="font-semibold text-sm">{(d.listings as any)?.title}</p>
                <p className="text-xs text-muted-foreground">
                  Reporter: {(d.reporter as any)?.display_name} →
                  Reported: {(d.reported as any)?.display_name} (strikes: {(d.reported as any)?.strike_count})
                </p>
                <p className="text-sm">{d.reason}</p>
              </div>
              <Badge variant="outline">open</Badge>
            </div>
            <div className="flex gap-2">
              <ResolveForm disputeId={d.id} verdict="upheld" label="Uphold" />
              <ResolveForm disputeId={d.id} verdict="dismissed" label="Dismiss" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ResolveForm({ disputeId, verdict, label }: { disputeId: string; verdict: 'upheld' | 'dismissed'; label: string }) {
  async function resolve(formData: FormData) {
    'use server'
    await resolveDispute(disputeId, verdict, formData.get('note') as string ?? '')
  }
  return (
    <form action={resolve} className="flex gap-2 flex-1">
      <input name="note" placeholder="Admin note (optional)" className="border rounded px-2 py-1 text-xs flex-1" />
      <Button type="submit" size="sm" variant={verdict === 'upheld' ? 'destructive' : 'outline'}>
        {label}
      </Button>
    </form>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/validators/dispute.ts lib/actions/disputes.ts lib/actions/admin.ts app/listings/ app/admin/disputes/
git commit -m "feat: add disputes, strike system, and admin dispute resolution"
```

---

## Task 17: My Bids page

**Files:**
- Create: `app/me/bids/page.tsx`

- [ ] **Step 1: Create `app/me/bids/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatPHP } from '@/lib/utils/currency'
import { Badge } from '@/components/ui/badge'

export default async function MyBidsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: bids } = await supabase
    .from('bids')
    .select(`
      id, amount, created_at,
      listings (id, title, status, current_bid, winner_id, ends_at)
    `)
    .eq('bidder_id', user.id)
    .order('created_at', { ascending: false })

  const active = bids?.filter((b) => (b.listings as any)?.status === 'live') ?? []
  const won = bids?.filter((b) => (b.listings as any)?.status === 'ended' && (b.listings as any)?.winner_id === user.id) ?? []
  const lost = bids?.filter((b) => (b.listings as any)?.status === 'ended' && (b.listings as any)?.winner_id !== user.id) ?? []

  return (
    <div className="max-w-2xl mx-auto p-4 pt-8 space-y-8">
      <h1 className="text-2xl font-bold">My Bids</h1>

      <Section title="Active" items={active} userId={user.id} />
      <Section title="Won" items={won} userId={user.id} />
      <Section title="Lost" items={lost} userId={user.id} />
    </div>
  )
}

function Section({ title, items, userId }: { title: string; items: any[]; userId: string }) {
  return (
    <div>
      <h2 className="font-semibold mb-3">{title} ({items.length})</h2>
      {items.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
      <div className="space-y-2">
        {items.map((bid) => {
          const listing = bid.listings as any
          return (
            <div key={bid.id} className="border rounded-lg p-3 flex justify-between items-center">
              <div>
                <Link href={`/listings/${listing.id}`} className="font-medium text-sm hover:underline">
                  {listing.title}
                </Link>
                <p className="text-xs text-muted-foreground">Your bid: {formatPHP(bid.amount)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatPHP(listing.current_bid)}</p>
                <Badge variant="outline" className="text-xs">
                  {listing.winner_id === userId ? '🏆 Won' : listing.status}
                </Badge>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/me/bids/page.tsx
git commit -m "feat: add My Bids page (won/lost/active)"
```

---

## Task 18: Admin user management and settings

**Files:**
- Create: `app/admin/users/page.tsx`
- Create: `app/admin/settings/page.tsx`
- Modify: `lib/actions/admin.ts`

- [ ] **Step 1: Add `banUser`, `unbanUser`, `updateSettings` to `lib/actions/admin.ts`**

```typescript
export async function banUser(userId: string, permanent: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return { error: 'Forbidden.' }

  const update = permanent
    ? { permabanned: true }
    : { banned_until: new Date(Date.now() + 7 * 86400 * 1000).toISOString() }

  const { error } = await supabase.from('profiles').update(update).eq('id', userId)
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function unbanUser(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return { error: 'Forbidden.' }

  const { error } = await supabase
    .from('profiles')
    .update({ permabanned: false, banned_until: null })
    .eq('id', userId)
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function updateSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return { error: 'Forbidden.' }

  const listingFee = Number(formData.get('listing_fee'))
  if (isNaN(listingFee) || listingFee < 0) return { error: 'Invalid listing fee.' }

  const updates: Record<string, unknown> = {
    listing_fee: listingFee,
    gcash_number: formData.get('gcash_number'),
    gcash_name: formData.get('gcash_name'),
  }

  // Upload new QR if provided
  const qrFile = formData.get('gcash_qr') as File
  if (qrFile && qrFile.size > 0) {
    const { error: uploadError } = await supabase.storage
      .from('listing-photos')
      .upload('admin/gcash-qr.png', qrFile, { upsert: true })
    if (uploadError) return { error: uploadError.message }
    updates.gcash_qr_url = 'admin/gcash-qr.png'
  }

  const { error } = await supabase.from('settings').update(updates).eq('id', 1)
  if (error) return { error: error.message }

  revalidatePath('/admin/settings')
  return { success: true }
}
```

- [ ] **Step 2: Create `app/admin/users/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { banUser, unbanUser } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('profiles')
    .select('id, display_name, phone_number, strike_count, permabanned, banned_until, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (q) {
    query = query.ilike('display_name', `%${q}%`)
  }

  const { data: users } = await query

  return (
    <div className="max-w-3xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-6">Users</h1>
      <form className="mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by display name…"
          className="border rounded px-3 py-2 text-sm w-full max-w-xs"
        />
      </form>
      {!users?.length && <p className="text-muted-foreground">No users found.</p>}
      <div className="space-y-3">
        {users?.map((u) => {
          const isBanned = u.permabanned || (u.banned_until && new Date(u.banned_until) > new Date())
          return (
            <div key={u.id} className="border rounded-lg p-4 flex justify-between items-start gap-3">
              <div className="space-y-1">
                <p className="font-semibold">{u.display_name}</p>
                <p className="text-xs text-muted-foreground">{u.phone_number}</p>
                <p className="text-xs">Strikes: {u.strike_count}</p>
                {u.banned_until && !u.permabanned && (
                  <p className="text-xs text-destructive">
                    Banned until {new Date(u.banned_until).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {u.permabanned && <Badge variant="destructive">Permabanned</Badge>}
                {!u.permabanned && isBanned && <Badge variant="destructive">Temp banned</Badge>}
                {!isBanned && <Badge variant="outline">Active</Badge>}
                {!isBanned && (
                  <>
                    <form action={async () => { 'use server'; await banUser(u.id, false) }}>
                      <Button size="sm" variant="outline" type="submit">7-day ban</Button>
                    </form>
                    <form action={async () => { 'use server'; await banUser(u.id, true) }}>
                      <Button size="sm" variant="destructive" type="submit">Permaban</Button>
                    </form>
                  </>
                )}
                {isBanned && (
                  <form action={async () => { 'use server'; await unbanUser(u.id) }}>
                    <Button size="sm" variant="outline" type="submit">Unban</Button>
                  </form>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/admin/settings/page.tsx`**

```typescript
'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { updateSettings } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Note: fetch initial settings server-side by making this a hybrid page.
// Simplest approach for MVP: make it a client component that loads settings via a Server Component wrapper.

export default function SettingsPageClient({
  settings,
}: {
  settings: { listing_fee: number; gcash_number: string; gcash_name: string; gcash_qr_url: string }
}) {
  const [state, action, pending] = useActionState(updateSettings, undefined)

  useEffect(() => {
    if (state?.success) toast.success('Settings saved.')
    if (state?.error) toast.error(state.error)
  }, [state])

  return (
    <form action={action} className="space-y-4 max-w-md">
      <div className="space-y-1">
        <Label>Listing fee (₱)</Label>
        <Input name="listing_fee" type="number" step="1" defaultValue={settings.listing_fee} required />
      </div>
      <div className="space-y-1">
        <Label>GCash number</Label>
        <Input name="gcash_number" defaultValue={settings.gcash_number} required />
      </div>
      <div className="space-y-1">
        <Label>GCash name</Label>
        <Input name="gcash_name" defaultValue={settings.gcash_name} required />
      </div>
      <div className="space-y-1">
        <Label>GCash QR image (leave empty to keep current)</Label>
        <Input name="gcash_qr" type="file" accept="image/jpeg,image/png,image/webp" />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save settings'}</Button>
    </form>
  )
}
```

Create the Server Component wrapper `app/admin/settings/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import SettingsPageClient from './settings-client'

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('settings')
    .select('listing_fee, gcash_number, gcash_name, gcash_qr_url')
    .eq('id', 1)
    .single()

  return (
    <div className="max-w-2xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-6">Platform Settings</h1>
      <SettingsPageClient
        settings={settings ?? { listing_fee: 50, gcash_number: '', gcash_name: '', gcash_qr_url: '' }}
      />
    </div>
  )
}
```

Rename the client component file to `app/admin/settings/settings-client.tsx`.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/admin.ts app/admin/users/ app/admin/settings/ app/me/bids/
git commit -m "feat: add admin user management, settings page, and My Bids page"
```

---

## Task 19: Navigation

**Files:**
- Create: `components/nav.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `components/nav.tsx`**

```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'

export default async function Nav() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    isAdmin = profile?.is_admin ?? false
  }

  return (
    <nav className="border-b px-4 py-3 flex items-center justify-between">
      <Link href="/" className="font-bold text-lg">BidLock</Link>
      <div className="flex items-center gap-3 text-sm">
        {user ? (
          <>
            <Link href="/listings/new" className="hover:underline">Sell</Link>
            <Link href="/me/listings" className="hover:underline">My listings</Link>
            <Link href="/me/bids" className="hover:underline">My bids</Link>
            <Link href="/me/profile" className="hover:underline">Profile</Link>
            {isAdmin && <Link href="/admin" className="hover:underline text-primary">Admin</Link>}
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit">Sign out</Button>
            </form>
          </>
        ) : (
          <>
            <Link href="/auth/login" className="hover:underline">Sign in</Link>
            <Link href="/auth/signup">
              <Button size="sm">Sign up</Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Add Nav to `app/layout.tsx`**

```typescript
import Nav from '@/components/nav'

// Inside the <body>:
<body className={inter.className}>
  <Nav />
  {children}
  <Toaster position="top-right" richColors />
</body>
```

- [ ] **Step 3: Commit**

```bash
git add components/nav.tsx app/layout.tsx
git commit -m "feat: add global navigation bar"
```

---

## Phase 3 Deploy Checkpoint + Self-Review

- [ ] `git push origin main`
- [ ] End-to-end smoke test:
  1. Full listing lifecycle: create → pay → admin approve → live → bid → finalize → winner reveal → chat → rate → dispute → admin resolve
  2. Strike test: uphold 3 disputes for a user → confirm 7-day ban applied
  3. Admin settings: update listing fee → create a new listing → confirm new fee is snapshotted
  4. Permaban: uphold 2 more disputes (total 5) → confirm permabanned = true → confirm banned user cannot access /listings/new

---

## Spec Coverage Checklist

- [x] All 9 tables created in migration
- [x] RLS policies for all tables
- [x] place_bid() and finalize_auctions() Postgres functions
- [x] listing-photos (public) and payment-proofs (private) storage buckets
- [x] Auth: email + Google OAuth, profile completion gate, middleware guards
- [x] Listing creation wizard (3 steps), photo upload, payment proof submission
- [x] Admin review queue (approve/reject)
- [x] Public feed sorted by ends_at
- [x] Listing detail: gallery, current bid, countdown, bid history (last 10), bid form
- [x] place_bid Server Action → RPC → Realtime updates
- [x] Anti-snipe (in place_bid() SQL function)
- [x] Vercel Cron finalization → winner_id set → notifications inserted
- [x] Winner reveal + contact card (auctioneer and winner see each other's phone + gcash_name)
- [x] Post-auction Realtime chat (auctioneer ↔ winner only)
- [x] Ratings (up/down + comment, both sides, after ended)
- [x] Disputes + strike system (strikes ≥ 3 → 7-day ban, ≥ 5 → permaban)
- [x] Admin: dispute queue, user search + ban/unban, settings
- [x] Disclaimers on /listings/new and /listings/[id] after end
- [x] Mobile-first, peso formatting, countdown (2d 4h / mm:ss), loading skeletons TODO, sonner toasts, bid confirm dialog
- [x] STEP_N.md after each deliverable (write manually after each task)
- [ ] Loading skeletons — add after core pages are working (replace any Suspense boundaries)

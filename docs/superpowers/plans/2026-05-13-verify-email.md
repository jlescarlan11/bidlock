# Email Verification Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redirect users to a dedicated `/auth/verify-email` page after signup, with a 60-second cooldown resend button and honest expiry copy.

**Architecture:** Two changes — update `lib/actions/auth.ts` to add a resend action and change the signup redirect, then create a new client component page at `app/auth/verify-email/page.tsx` that reads the email from the URL search param and handles the countdown timer locally.

**Tech Stack:** Next.js App Router, Supabase Auth (`supabase.auth.resend`), React `useEffect`/`useState` for countdown, existing shadcn/ui components (`Button`, `Separator`), lucide-react (`Mail`).

---

## File Map

| Action | Path |
|--------|------|
| Modify | `lib/actions/auth.ts` |
| Create | `app/auth/verify-email/page.tsx` |

No other files need to change. The `emailRedirectTo` fix in `signup` was already applied in a prior session.

---

### Task 1: Add resend action + update signup redirect

**Files:**
- Modify: `lib/actions/auth.ts`

- [ ] **Step 1: Add `resendConfirmationEmail` server action**

Open `lib/actions/auth.ts`. Add this function after the `signup` action:

```ts
export async function resendConfirmationEmail(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData,
) {
  const email = formData.get('email')
  if (typeof email !== 'string' || !email) return { error: 'Email is required.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  })
  if (error) return { error: error.message }

  return { success: true }
}
```

- [ ] **Step 2: Update signup redirect**

In the same file, find the `signup` function's final line:

```ts
redirect('/me/profile')
```

Replace with:

```ts
redirect(`/auth/verify-email?email=${encodeURIComponent(parsed.data.email)}`)
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/auth.ts
git commit -m "feat: add resendConfirmationEmail action and update signup redirect"
```

---

### Task 2: Build the verify-email page

**Files:**
- Create: `app/auth/verify-email/page.tsx`

- [ ] **Step 1: Create the file**

Create `app/auth/verify-email/page.tsx` with this content:

```tsx
'use client'

import { useActionState, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { resendConfirmationEmail } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Mail } from 'lucide-react'
import Link from 'next/link'

const COOLDOWN_SECONDS = 60

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [state, action, pending] = useActionState(resendConfirmationEmail, undefined)
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  // Restart cooldown after a successful resend
  useEffect(() => {
    if (state?.success) setCooldown(COOLDOWN_SECONDS)
  }, [state])

  const disabled = pending || cooldown > 0

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-muted flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px] bg-card rounded-2xl border border-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] p-10">

        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-5">
          <Mail className="h-6 w-6 text-blue-500" />
        </div>

        <h1 className="text-2xl font-semibold text-card-foreground mb-1.5">Check your email</h1>
        <p className="text-sm text-muted-foreground mb-1">
          We sent a confirmation link to{' '}
          {email && <strong className="text-foreground">{email}</strong>}
          {!email && 'your email address'}
        </p>
        <p className="text-xs text-muted-foreground mb-6">The link expires in 24 hours.</p>

        <Separator className="mb-5" />

        <p className="text-sm text-muted-foreground mb-3">
          Didn&apos;t receive it? Check your spam folder or resend below.
        </p>

        <form action={action}>
          <input type="hidden" name="email" value={email} />
          <Button
            type="submit"
            variant="outline"
            disabled={disabled}
            className="w-full h-11"
          >
            {disabled && cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend confirmation email'}
          </Button>
        </form>

        {state?.success && (
          <p className="text-sm text-center text-muted-foreground mt-3">Email sent!</p>
        )}
        {state?.error && (
          <p className="text-sm text-center text-destructive mt-3" role="alert">{state.error}</p>
        )}

        <p className="text-sm text-center text-muted-foreground mt-6">
          Wrong email?{' '}
          <Link href="/auth/signup" className="text-primary font-medium hover:underline">
            Back to sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Start the dev server (`npm run dev`) and verify:

1. Go to `/auth/signup`, create a new account
2. You land on `/auth/verify-email?email=<your-email>` — NOT `/me/profile`
3. The email address is shown correctly in the card
4. The resend button is disabled and counts down from 60
5. After 60 seconds the button re-enables and shows "Resend confirmation email"
6. Click resend — button disables again, countdown restarts, "Email sent!" appears below
7. Check inbox — confirmation email arrives, link points to your production URL (not localhost) if `NEXT_PUBLIC_SITE_URL` is set correctly
8. "Back to sign up" link is purple (primary color) and navigates to `/auth/signup`
9. Navigate directly to `/auth/verify-email` (no email param) — page renders without crashing, shows "your email address" fallback

- [ ] **Step 4: Commit**

```bash
git add app/auth/verify-email/page.tsx
git commit -m "feat: add verify-email page with 60s resend cooldown"
```

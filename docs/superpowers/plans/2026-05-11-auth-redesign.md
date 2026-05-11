# Auth Pages Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign BidLock's four auth pages (login, signup, forgot-password, update-password) to a polished fintech standard with a shared `components/auth/` library, functional password reset flow, and consistent trust signals.

**Architecture:** Approach B — four small shared components in `components/auth/` (GoogleIcon, TrustSignals, SecurityBadge, PasswordInput) consumed by all page files. Two new server actions (`requestPasswordReset`, `updatePassword`) added to the existing `lib/actions/auth.ts`. The callback route gets a safe `next` redirect param to route password-reset links to the update-password page.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, shadcn/ui (Button, Input, Label, Separator), lucide-react, Supabase Auth, zod, `useActionState`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `components/auth/google-icon.tsx` | 18×18 Google "G" SVG, no props |
| Create | `components/auth/trust-signals.tsx` | Three-item trust row below every card |
| Create | `components/auth/security-badge.tsx` | Violet pill shown on login + signup |
| Create | `components/auth/password-input.tsx` | Input wrapper with show/hide eye toggle |
| Modify | `lib/validators/auth.ts` | Add `resetPasswordSchema`, `updatePasswordSchema` |
| Modify | `lib/actions/auth.ts` | Add `requestPasswordReset`, `updatePassword` |
| Modify | `app/auth/callback/route.ts` | Add safe `next` param redirect |
| Modify | `app/auth/login/page.tsx` | Full redesign |
| Modify | `app/auth/signup/page.tsx` | Full redesign |
| Create | `app/auth/forgot-password/page.tsx` | Email form + inline success state |
| Create | `app/auth/update-password/page.tsx` | New-password form |

---

## Task 1: Shared components

**Files:**
- Create: `components/auth/google-icon.tsx`
- Create: `components/auth/trust-signals.tsx`
- Create: `components/auth/security-badge.tsx`
- Create: `components/auth/password-input.tsx`

- [ ] **Step 1: Create `components/auth/google-icon.tsx`**

```tsx
export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
```

- [ ] **Step 2: Create `components/auth/trust-signals.tsx`**

```tsx
import { ShieldCheck, Lock, BadgeCheck } from 'lucide-react'

export function TrustSignals() {
  return (
    <div className="flex items-center gap-4 flex-wrap justify-center">
      <span className="flex items-center gap-1.5 text-xs text-slate-400">
        <ShieldCheck className="h-3 w-3" />
        Bank-grade encryption
      </span>
      <span className="text-slate-300 text-xs">·</span>
      <span className="flex items-center gap-1.5 text-xs text-slate-400">
        <Lock className="h-3 w-3" />
        Verified bidders only
      </span>
      <span className="text-slate-300 text-xs">·</span>
      <span className="flex items-center gap-1.5 text-xs text-slate-400">
        <BadgeCheck className="h-3 w-3" />
        Trusted by 10,000+ collectors
      </span>
    </div>
  )
}
```

- [ ] **Step 3: Create `components/auth/security-badge.tsx`**

```tsx
import { ShieldCheck } from 'lucide-react'

export function SecurityBadge() {
  return (
    <div className="inline-flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-full px-3 py-1">
      <ShieldCheck className="h-3 w-3 text-violet-700" />
      <span className="text-xs font-medium text-violet-700">Secure sign in</span>
    </div>
  )
}
```

- [ ] **Step 4: Create `components/auth/password-input.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface PasswordInputProps {
  id: string
  name: string
  required?: boolean
  minLength?: number
  autoComplete?: string
  className?: string
}

export function PasswordInput({ id, name, required, minLength, autoComplete, className }: PasswordInputProps) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className={`pr-10 h-11 rounded-lg border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-violet-600/20 focus-visible:border-violet-600 transition-colors duration-150 ${className ?? ''}`}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-150"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors from the four new files.

- [ ] **Step 6: Commit**

```bash
git add components/auth/
git commit -m "feat: add shared auth components (GoogleIcon, TrustSignals, SecurityBadge, PasswordInput)"
```

---

## Task 2: Validators, server actions, and callback route

**Files:**
- Modify: `lib/validators/auth.ts`
- Modify: `lib/actions/auth.ts`
- Modify: `app/auth/callback/route.ts`

- [ ] **Step 1: Add schemas to `lib/validators/auth.ts`**

Append after the existing exports:

```ts
export const resetPasswordSchema = z.object({
  email: z.string().email(),
})

export const updatePasswordSchema = z.object({
  password: z.string().min(8),
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
```

- [ ] **Step 2: Add actions to `lib/actions/auth.ts`**

Add this import at the top alongside the existing validator imports:
```ts
import { loginSchema, signupSchema, resetPasswordSchema, updatePasswordSchema } from '@/lib/validators/auth'
```

Then append these two functions after `signOut`:

```ts
export async function requestPasswordReset(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData,
) {
  const parsed = resetPasswordSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return { error: 'Please enter a valid email address.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/auth/update-password`,
  })
  if (error) return { error: error.message }

  return { success: true }
}

export async function updatePassword(
  _prevState: { error?: string } | undefined,
  formData: FormData,
) {
  const parsed = updatePasswordSchema.safeParse({ password: formData.get('password') })
  if (!parsed.success) return { error: 'Password must be at least 8 characters.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { error: error.message }

  redirect('/')
}
```

- [ ] **Step 3: Update `app/auth/callback/route.ts`**

Replace the entire file with:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/me/profile'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/me/profile'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/validators/auth.ts lib/actions/auth.ts app/auth/callback/route.ts
git commit -m "feat: add requestPasswordReset and updatePassword actions; safe next-param in callback"
```

---

## Task 3: Redesign login page

**Files:**
- Modify: `app/auth/login/page.tsx`

- [ ] **Step 1: Replace `app/auth/login/page.tsx` entirely**

```tsx
'use client'

import { useActionState } from 'react'
import { login, signInWithGoogle } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { GoogleIcon } from '@/components/auth/google-icon'
import { TrustSignals } from '@/components/auth/trust-signals'
import { SecurityBadge } from '@/components/auth/security-badge'
import { PasswordInput } from '@/components/auth/password-input'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 flex flex-col items-center justify-center px-4 py-12 gap-6">
      <SecurityBadge />

      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] p-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your BidLock account</p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="h-11 rounded-lg border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-violet-600/20 focus-visible:border-violet-600 transition-colors duration-150"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
              <Link href="/auth/forgot-password" className="text-xs text-violet-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              required
              minLength={6}
            />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive" role="alert">{state.error}</p>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="w-full h-11 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-medium rounded-lg focus-visible:ring-2 focus-visible:ring-violet-600/20 transition-colors duration-150"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
          </Button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <Separator className="flex-1" />
          <span className="text-xs text-slate-500 uppercase tracking-wider whitespace-nowrap">or continue with</span>
          <Separator className="flex-1" />
        </div>

        <form action={signInWithGoogle}>
          <Button
            type="submit"
            variant="outline"
            className="w-full h-11 bg-white border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors duration-150 flex items-center justify-center gap-2.5"
          >
            <GoogleIcon />
            Continue with Google
          </Button>
        </form>

        <p className="text-sm text-center text-slate-600 mt-6">
          No account?{' '}
          <Link href="/auth/signup" className="text-violet-600 font-medium hover:underline">Sign up</Link>
        </p>
      </div>

      <TrustSignals />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Start dev server and verify visually**

```bash
npm run dev
```
Visit `http://localhost:3000/auth/login`. Verify:
- Page background is off-white (slate-50), not violet
- Security badge (violet pill) appears above the card
- Card is white, rounded, soft shadow
- "Forgot password?" link is right-aligned next to the Password label
- Password show/hide eye toggle works
- Google button shows the G logo
- Trust signals row appears below the card
- Primary button turns darker violet on hover

- [ ] **Step 4: Commit**

```bash
git add app/auth/login/page.tsx
git commit -m "feat: redesign login page — fintech card layout, security badge, trust signals"
```

---

## Task 4: Redesign signup page

**Files:**
- Modify: `app/auth/signup/page.tsx`

- [ ] **Step 1: Replace `app/auth/signup/page.tsx` entirely**

```tsx
'use client'

import { useActionState } from 'react'
import { signup, signInWithGoogle } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { GoogleIcon } from '@/components/auth/google-icon'
import { TrustSignals } from '@/components/auth/trust-signals'
import { SecurityBadge } from '@/components/auth/security-badge'
import { PasswordInput } from '@/components/auth/password-input'

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined)

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 flex flex-col items-center justify-center px-4 py-12 gap-6">
      <SecurityBadge />

      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] p-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-500 mt-1">Start bidding on BidLock in under a minute</p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="display_name" className="text-sm font-medium text-slate-700">Display name</Label>
            <Input
              id="display_name"
              name="display_name"
              type="text"
              autoComplete="name"
              required
              className="h-11 rounded-lg border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-violet-600/20 focus-visible:border-violet-600 transition-colors duration-150"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="h-11 rounded-lg border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-violet-600/20 focus-visible:border-violet-600 transition-colors duration-150"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={6}
            />
            <p className="text-xs text-slate-400">Use 8+ characters with a number and symbol</p>
          </div>

          {state?.error && (
            <p className="text-sm text-destructive" role="alert">{state.error}</p>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="w-full h-11 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-medium rounded-lg focus-visible:ring-2 focus-visible:ring-violet-600/20 transition-colors duration-150"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}
          </Button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <Separator className="flex-1" />
          <span className="text-xs text-slate-500 uppercase tracking-wider whitespace-nowrap">or continue with</span>
          <Separator className="flex-1" />
        </div>

        <form action={signInWithGoogle}>
          <Button
            type="submit"
            variant="outline"
            className="w-full h-11 bg-white border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors duration-150 flex items-center justify-center gap-2.5"
          >
            <GoogleIcon />
            Continue with Google
          </Button>
        </form>

        <p className="text-sm text-center text-slate-600 mt-6">
          Have an account?{' '}
          <Link href="/auth/login" className="text-violet-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>

      <TrustSignals />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Verify visually**

Visit `http://localhost:3000/auth/signup`. Verify:
- Three fields: Display name, Email, Password
- Password hint ("Use 8+ characters…") appears below the password field in slate-400
- Password show/hide toggle works
- "Have an account? Sign in" link at the bottom

- [ ] **Step 4: Commit**

```bash
git add app/auth/signup/page.tsx
git commit -m "feat: redesign signup page — fintech card layout, security badge, trust signals"
```

---

## Task 5: Forgot password page

**Files:**
- Create: `app/auth/forgot-password/page.tsx`

- [ ] **Step 1: Create `app/auth/forgot-password/page.tsx`**

```tsx
'use client'

import { useActionState } from 'react'
import { requestPasswordReset } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail } from 'lucide-react'
import Link from 'next/link'
import { TrustSignals } from '@/components/auth/trust-signals'

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined)

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 flex flex-col items-center justify-center px-4 py-12 gap-6">
      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] p-10">
        {state?.success ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-violet-50 flex items-center justify-center">
                <Mail className="h-6 w-6 text-violet-600" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Check your email</h1>
              <p className="text-sm text-slate-500 mt-2">
                We've sent a password reset link to your email address. It expires in 1 hour.
              </p>
            </div>
            <Link href="/auth/login" className="text-sm text-violet-600 hover:underline block pt-2">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-slate-900">Reset your password</h1>
              <p className="text-sm text-slate-500 mt-1">Enter your email and we'll send you a reset link</p>
            </div>

            <form action={action} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="h-11 rounded-lg border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-violet-600/20 focus-visible:border-violet-600 transition-colors duration-150"
                />
              </div>

              {state?.error && (
                <p className="text-sm text-destructive" role="alert">{state.error}</p>
              )}

              <Button
                type="submit"
                disabled={pending}
                className="w-full h-11 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-medium rounded-lg focus-visible:ring-2 focus-visible:ring-violet-600/20 transition-colors duration-150"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
              </Button>
            </form>

            <p className="text-sm text-center text-slate-600 mt-6">
              <Link href="/auth/login" className="text-violet-600 font-medium hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>

      <TrustSignals />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Verify visually**

Visit `http://localhost:3000/auth/forgot-password`. Verify:
- Card shows heading "Reset your password" and email field
- "Back to sign in" link at the bottom

To test the success state without sending a real email, temporarily return `{ success: true }` early in the `requestPasswordReset` action, submit the form, then revert. Verify:
- Card transitions to the confirmation view with the mail icon
- "Check your email" heading and body text appear
- "Back to sign in" link works

- [ ] **Step 4: Commit**

```bash
git add app/auth/forgot-password/page.tsx
git commit -m "feat: add forgot-password page with email form and inline success confirmation"
```

---

## Task 6: Update password page

**Files:**
- Create: `app/auth/update-password/page.tsx`

- [ ] **Step 1: Create `app/auth/update-password/page.tsx`**

```tsx
'use client'

import { useActionState } from 'react'
import { updatePassword } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { TrustSignals } from '@/components/auth/trust-signals'
import { PasswordInput } from '@/components/auth/password-input'

export default function UpdatePasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, undefined)

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 flex flex-col items-center justify-center px-4 py-12 gap-6">
      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] p-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Set a new password</h1>
          <p className="text-sm text-slate-500 mt-1">Choose a strong password for your account</p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">New password</Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
            <p className="text-xs text-slate-400">Use 8+ characters with a number and symbol</p>
          </div>

          {state?.error && (
            <p className="text-sm text-destructive" role="alert">{state.error}</p>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="w-full h-11 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-medium rounded-lg focus-visible:ring-2 focus-visible:ring-violet-600/20 transition-colors duration-150"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
          </Button>
        </form>
      </div>

      <TrustSignals />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Verify visually**

Visit `http://localhost:3000/auth/update-password`. Verify:
- Card shows "Set a new password" heading
- Single password field with show/hide toggle
- Password hint below field
- No separator, no Google button, no bottom nav link

- [ ] **Step 4: Final end-to-end check**

With the dev server running, walk through these paths:
1. `/auth/login` → fills correctly, "Forgot password?" links to `/auth/forgot-password`
2. `/auth/signup` → fills correctly, "Sign in" link goes to `/auth/login`
3. `/auth/forgot-password` → submit with a real email → check inbox for reset link → click link → lands on `/auth/update-password` with a valid session → submit new password → redirects to `/`
4. Navigate directly to `/auth/update-password` without a session → submit → should receive an error from Supabase ("Auth session missing" or similar) — verify error displays inline

- [ ] **Step 5: Commit**

```bash
git add app/auth/update-password/page.tsx
git commit -m "feat: add update-password page; completes full password reset flow"
```

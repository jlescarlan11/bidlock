# Auth Pages Redesign — Design Spec
_Date: 2026-05-11_

## Overview

Redesign BidLock's four authentication pages to a polished, trustworthy fintech standard. The existing pages are functional but visually flat. The goal is a calm, credible feel — Stripe/Mercury/Wise — where purple remains the accent color and everything else is neutral.

---

## Scope

Four pages + one route update:

| File | Purpose |
|---|---|
| `app/auth/login/page.tsx` | Sign in with email/password or Google |
| `app/auth/signup/page.tsx` | Create account (display name, email, password) |
| `app/auth/forgot-password/page.tsx` | Request password reset email (+ inline success state) |
| `app/auth/update-password/page.tsx` | Set new password after clicking the reset link |
| `app/auth/callback/route.ts` | Add `next` param support to redirect to update-password |

---

## Architecture — Approach B: `components/auth/` shared library

Four shared pieces extracted to `components/auth/`:

| Component | Purpose |
|---|---|
| `google-icon.tsx` | 18×18 Google "G" SVG, no props |
| `trust-signals.tsx` | Three-item trust row rendered below every card |
| `security-badge.tsx` | Violet pill with ShieldCheck icon, used on login + signup |
| `password-input.tsx` | `Input` wrapper with show/hide eye toggle (Eye/EyeOff from lucide). Accepts `id`, `name`, `required`, `minLength`, `autoComplete`, and `className` as props. Manages `showPassword` boolean state internally. |

All four are purely presentational or have minimal client-side state. Each page file handles its own form state via `useActionState`.

---

## Server Actions

Add to `lib/actions/auth.ts`:

```ts
requestPasswordReset(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean }>
```
- Validates email with zod `z.string().email()`
- Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: '${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/auth/update-password' })`
- On success returns `{ success: true }` (do NOT redirect — show inline confirmation instead)
- On error returns `{ error: error.message }`

```ts
updatePassword(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }>
```
- Validates password with zod `z.string().min(8)`
- Calls `supabase.auth.updateUser({ password })`
- On success: `redirect('/')`
- On error returns `{ error: error.message }`

Add to `lib/validators/auth.ts`:
```ts
export const resetPasswordSchema = z.object({ email: z.string().email() })
export const updatePasswordSchema = z.object({ password: z.string().min(8) })
```

---

## Callback Route Update

`app/auth/callback/route.ts` — after `exchangeCodeForSession`, check for a `next` query param and redirect there if present. Fall back to `/me/profile` (existing behavior).

```ts
const next = searchParams.get('next') ?? '/me/profile'
return NextResponse.redirect(`${origin}${next}`)
```

Only allow `/`-prefixed relative paths to prevent open redirect. Validate: `next.startsWith('/') && !next.startsWith('//')`.

---

## Design System

### Background
Raw `bg-slate-50` on the page wrapper — intentionally overrides the app-wide `violet-50` theme background for auth pages, which need a more neutral feel. Do NOT use the `bg-background` semantic token here.

### Card
```
bg-white  rounded-2xl  border border-slate-200/60
shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)]
p-10  w-full  max-w-[420px]
```

### Inputs
```
h-11  rounded-lg  border-slate-200  bg-white
focus-visible:ring-2 focus-visible:ring-violet-600/20 focus-visible:border-violet-600
transition-colors duration-150
```
Use the existing shadcn `Input` component; pass `className` overrides for focus ring.

### Primary button
```
w-full  h-11  bg-violet-600  text-white  font-medium  rounded-lg
hover:bg-violet-700  active:bg-violet-800
focus-visible:ring-2 focus-visible:ring-violet-600/20
transition-colors duration-150
```
Loading state: replace label with `<Loader2 className="h-4 w-4 animate-spin" />` when `pending`.

### Google button
```
w-full  h-11  bg-white  border border-slate-200  text-slate-700  rounded-lg
hover:bg-slate-50  transition-colors duration-150
```
Left-aligned `<GoogleIcon />` (18×18) + "Continue with Google" text.

### Separator
shadcn `Separator` + centered `<span>` "or continue with" in `text-xs text-slate-500 uppercase tracking-wider`.

### Security badge (login + signup only)
```
inline-flex items-center gap-1.5
bg-violet-50  border border-violet-200  rounded-full
px-3 py-1  text-xs font-medium text-violet-700
```
Contains `<ShieldCheck className="h-3 w-3" />` + "Secure sign in".

### Trust signals row (all pages, below the card)
Three items separated by `·` dots, `text-xs text-slate-400`, icons at `h-3 w-3`:
- `<ShieldCheck />` "Bank-grade encryption"
- `<Lock />` "Verified bidders only"
- `<BadgeCheck />` "Trusted by 10,000+ collectors"

### Labels
`text-sm font-medium text-slate-700` above each input.

### Error state
`<p className="text-sm text-destructive">` below the last field, before the submit button. Shown when `state?.error` is set.

---

## Page Details

### Login (`app/auth/login/page.tsx`)
- `"use client"` — needs `useActionState` + password show/hide state
- Security badge above heading
- Heading: "Welcome back" (`text-2xl font-semibold text-slate-900`)
- Subtitle: "Sign in to your BidLock account" (`text-sm text-slate-500`)
- Fields: Email, Password (with `<PasswordInput />`)
- "Forgot password?" — `text-xs text-violet-600 hover:underline`, right-aligned beside the Password label, links to `/auth/forgot-password`
- Primary button: "Sign in" (loading: spinner)
- Separator
- Google button
- Bottom link: "No account? **Sign up**" → `/auth/signup`
- Trust signals row below card

### Signup (`app/auth/signup/page.tsx`)
- `"use client"` — needs `useActionState` + password show/hide state
- Security badge above heading
- Heading: "Create your account"
- Subtitle: "Start bidding on BidLock in under a minute"
- Fields: Display name, Email, Password (with `<PasswordInput />`)
- Password hint below field: "Use 8+ characters with a number and symbol" (`text-xs text-slate-400`)
- Primary button: "Create account" (loading: spinner)
- Separator
- Google button
- Bottom link: "Have an account? **Sign in**" → `/auth/login`
- Trust signals row below card

### Forgot Password (`app/auth/forgot-password/page.tsx`)
- `"use client"` — needs `useActionState`
- No security badge
- Heading: "Reset your password"
- Subtitle: "Enter your email and we'll send you a reset link"
- Field: Email
- Primary button: "Send reset link" (loading: spinner)
- **Inline success state**: when `state?.success`, replace the form with a confirmation message:
  - Heading: "Check your email"
  - Body: "We've sent a password reset link to your email address. It expires in 1 hour."
  - Small link: "Back to sign in" → `/auth/login`
- No Google button, no separator
- Bottom link: "Back to sign in" → `/auth/login` (shown when form is visible)
- Trust signals row below card

### Update Password (`app/auth/update-password/page.tsx`)
- `"use client"` — needs `useActionState` + password show/hide state
- No security badge
- Heading: "Set a new password"
- Subtitle: "Choose a strong password for your account"
- Field: Password (with `<PasswordInput />`, autoComplete="new-password")
- Password hint: "Use 8+ characters with a number and symbol"
- Primary button: "Update password" (loading: spinner)
- No Google button, no separator, no bottom link
- Trust signals row below card

---

## Semantic HTML & Accessibility

- All `<form>` elements use `action={serverAction}`
- All `<label>` elements have `htmlFor` matching input `id`
- `autoComplete` attributes:
  - email: `autoComplete="email"`
  - login password: `autoComplete="current-password"`
  - signup/update password: `autoComplete="new-password"`
  - display name: `autoComplete="name"`
- Password input `type` toggles between `"password"` and `"text"`; eye button has `aria-label="Show password"` / `"Hide password"` and `type="button"` to prevent accidental form submit
- Error messages use `role="alert"` so screen readers announce them

---

## File Structure (final)

```
app/auth/
  login/page.tsx
  signup/page.tsx
  forgot-password/page.tsx
  update-password/page.tsx
  callback/route.ts          ← updated

components/auth/
  google-icon.tsx
  trust-signals.tsx
  security-badge.tsx
  password-input.tsx

lib/actions/auth.ts          ← add requestPasswordReset, updatePassword
lib/validators/auth.ts       ← add resetPasswordSchema, updatePasswordSchema
```

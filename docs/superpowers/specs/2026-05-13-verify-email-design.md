# Email Verification Screen — Design Spec

**Date:** 2026-05-13
**Status:** Approved

---

## Overview

After a user completes signup, redirect them to a dedicated `/auth/verify-email` page instead of `/me/profile`. This page tells them to check their email, shows the address the link was sent to, states the expiry window, and lets them resend with a 60-second cooldown.

---

## Route

`/auth/verify-email?email=<encoded-email>`

The email is passed as a URL search param from the signup redirect. If the param is missing or the user navigates directly, the page renders without an email address shown (graceful degradation — no crash).

---

## Page Layout

Matches the existing auth card pattern: `bg-muted` page background, centered card with `rounded-2xl border shadow`, no top-level security badge, no footer trust signals.

### Card contents (top to bottom)

1. **Icon** — envelope icon in a small rounded tile (e.g. `bg-blue-50` square, `Mail` from lucide-react)
2. **Heading** — `"Check your email"` (`text-2xl font-semibold`)
3. **Subtext** — `"We sent a confirmation link to"` + `<email>` on the next line in `font-medium text-foreground`
4. **Expiry line** — `"The link expires in 24 hours."` in `text-xs text-muted-foreground` (matches Supabase's default OTP expiry of 86400s; update this line if the project changes the expiry in the Supabase dashboard)
5. **Divider** — `<Separator />`
6. **Helper copy** — `"Didn't receive it? Check your spam folder or resend below."` (`text-sm text-muted-foreground`)
7. **Resend button** — outlined variant, full width (see Resend Behavior below)
8. **Back to sign up** — `text-sm text-center text-muted-foreground` + `text-primary font-medium` link to `/auth/signup`

No `SecurityBadge`, no `TrustSignals` component — these are not appropriate for a passive waiting screen.

---

## Resend Behavior

### Server action
Add `resendConfirmationEmail(email: string)` to `lib/actions/auth.ts`:
- Calls `supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: ... } })`
- Returns `{ error?: string; success?: boolean }`

### Client-side cooldown
The page is a **client component** (`'use client'`) to support the countdown timer.

- On mount, start a 60-second countdown via `useEffect` + `setInterval`
- Button is `disabled` and shows `"Resend in Xs"` during countdown
- Button re-enables and shows `"Resend confirmation email"` when countdown reaches 0
- On click: call the server action, restart the 60-second timer, optionally show a brief success message (`"Email sent!"` inline below the button, fades or resets on next resend)
- Resend errors display inline below the button in `text-destructive`

---

## Signup Action Change

In `lib/actions/auth.ts`, change the `signup` function's final redirect from:
```ts
redirect('/me/profile')
```
to:
```ts
redirect(`/auth/verify-email?email=${encodeURIComponent(parsed.data.email)}`)
```

The `emailRedirectTo` option is already set to `${env.NEXT_PUBLIC_SITE_URL}/auth/callback` (fixed in a prior session).

---

## Design Tokens

- All links (including "Back to sign up") use `text-primary` — the brand purple — consistent with login/signup pages
- Resend button: `variant="outline"` in disabled state; same `variant="outline"` re-enabled (not a primary CTA)
- Countdown text color: `text-muted-foreground` while disabled

---

## What This Does Not Include

- Email preview / "open Gmail" deep link button — adds complexity for minimal gain
- Server-side rendering of the email param — not needed, no auth required to view this page
- Persistent cooldown across page refreshes — timer resets on reload, acceptable UX

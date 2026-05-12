# My Profile Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the My Profile page to use a `max-w-7xl` container matching the nav header, with a two-column layout: identity card (left) + form card (right).

**Architecture:** `page.tsx` is a server component that fetches the user session and profile, renders the identity card directly, and wraps `ProfileForm` in a card. `ProfileForm` stays a pure client form component — only its Save button layout changes. Two page-local helper functions (`getInitials`, `formatMemberSince`) live in `page.tsx`.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, Supabase server client, shadcn/ui Button/Input/Label

---

## File Map

| File | Change |
|---|---|
| `app/me/profile/page.tsx` | Add helpers, swap container, add identity card + form card wrapper |
| `app/me/profile/profile-form.tsx` | Add divider, right-align Save button |

---

### Task 1: Rebuild `page.tsx` — helpers, layout, identity card, form card wrapper

**Files:**
- Modify: `app/me/profile/page.tsx`

- [ ] **Step 1: Replace the full contents of `page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './profile-form'

function getInitials(name: string | null): string {
  if (!name?.trim()) return '?'
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

function formatMemberSince(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('display_name, phone_number, gcash_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[profile page] profileError:', JSON.stringify(profileError))
    throw new Error('Failed to load profile. Please refresh.')
  }

  const initials = getInitials(profile?.display_name ?? null)
  const memberSince = formatMemberSince(user.created_at)

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Identity card */}
        <div className="w-full md:w-56 shrink-0 bg-white border border-border rounded-xl shadow-sm p-6 text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl font-bold tracking-tight">{initials}</span>
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">{profile?.display_name ?? '—'}</p>
          <span className="inline-block text-xs font-semibold text-primary bg-primary/10 rounded px-2 py-0.5 mb-4">
            Member
          </span>
          <div className="border-t border-border my-4" />
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Member since</p>
          <p className="text-sm text-muted-foreground mb-4">{memberSince}</p>
          <a href="#" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            View public profile →
          </a>
        </div>

        {/* Form card */}
        <div className="flex-1 bg-white border border-border rounded-xl shadow-sm p-7">
          <div className="mb-6">
            <h1 className="text-lg font-bold text-foreground">Your Profile</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Update your display name, phone, and GCash details.
            </p>
          </div>
          <ProfileForm profile={profile} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript build check**

```bash
npx tsc --noEmit
```

Expected: no errors. If `user.created_at` is flagged as possibly undefined, cast with `user.created_at ?? new Date().toISOString()`.

- [ ] **Step 3: Commit**

```bash
git add app/me/profile/page.tsx
git commit -m "feat(profile): rebuild page with identity card and max-w-7xl container"
```

---

### Task 2: Update `ProfileForm` — divider + right-aligned Save button

**Files:**
- Modify: `app/me/profile/profile-form.tsx`

- [ ] **Step 1: Replace the `<Button>` block at the bottom of the form**

Find this in `profile-form.tsx` (last element before the closing `</form>`):

```tsx
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving…' : 'Save profile'}
      </Button>
```

Replace with:

```tsx
      <div className="border-t border-border pt-5 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
```

- [ ] **Step 2: TypeScript build check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Visual check — open the browser**

Start the dev server if not running:

```bash
npm run dev
```

Open `http://localhost:3000/me/profile`. Verify:
- Page content width matches the nav header
- Identity card appears on the left with your initials in a violet circle, display name, "Member" badge, "Member since Month YYYY", and "View public profile →"
- On mobile (resize below `md` breakpoint ~768px): identity card stacks above the form card, both full-width
- Form card is on the right with "Your Profile" heading, subtitle, the three fields, a divider line, and a right-aligned Save button
- Saving the form still works (shows a success toast)

- [ ] **Step 4: Commit**

```bash
git add app/me/profile/profile-form.tsx
git commit -m "feat(profile): right-align save button with divider"
```

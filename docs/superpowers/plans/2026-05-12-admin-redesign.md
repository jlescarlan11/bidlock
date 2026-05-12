# Admin Section Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the BidLock admin section with a persistent top tab bar, correct content width matching the nav header, and a triage-oriented dashboard with conditional urgency highlighting.

**Architecture:** A new `app/admin/layout.tsx` provides the shared container (`max-w-7xl mx-auto px-6 py-8`) and tab bar for all admin pages. The tab bar is extracted into `app/admin/admin-tab-bar.tsx` as a client component (needs `usePathname()` for active detection). Sub-pages shed their own container divs. The dashboard gets new full-clickable stat cards with conditional urgency highlighting.

**Tech Stack:** Next.js App Router, Tailwind CSS, TypeScript. No test framework is installed — TDD steps are omitted; verify via browser instead.

---

### Task 1: AdminTabBar client component

**Files:**
- Create: `app/admin/admin-tab-bar.tsx`

- [ ] **Step 1: Create `app/admin/admin-tab-bar.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

const tabs = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Listings', href: '/admin/listings' },
  { label: 'Disputes', href: '/admin/disputes' },
  { label: 'Users', href: '/admin/users' },
  { label: 'Settings', href: '/admin/settings' },
]

export default function AdminTabBar() {
  const pathname = usePathname()
  const activeRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [pathname])

  return (
    <div className="border-b">
      <nav className="max-w-7xl mx-auto px-6 flex overflow-x-auto">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              ref={isActive ? activeRef : undefined}
              className={`shrink-0 px-4 py-3 text-sm border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
```

Note on border placement: `border-b` is on the outer `<div>` (no width constraint) so the line spans edge-to-edge. The inner `<nav>` carries `max-w-7xl mx-auto px-6` and holds only the tab links.

- [ ] **Step 2: Commit**

```bash
git add app/admin/admin-tab-bar.tsx
git commit -m "feat(admin): add AdminTabBar client component with active tab detection"
```

---

### Task 2: Admin layout

**Files:**
- Create: `app/admin/layout.tsx`

- [ ] **Step 1: Create `app/admin/layout.tsx`**

```tsx
import AdminTabBar from './admin-tab-bar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminTabBar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `/admin`. Confirm:
- Tab bar appears below the main nav with a full-width bottom border
- "Dashboard" tab is active (violet underline, bold)
- Content area aligns with the tab labels (same `px-6` inset)

- [ ] **Step 3: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat(admin): add admin section layout with shared container and tab bar"
```

---

### Task 3: Dashboard redesign

**Files:**
- Modify: `app/admin/page.tsx`

The `StatCard` becomes a full `<Link>`, gains a conditional violet highlight (urgency-eligible + count > 0), and shows an arrow action label at the bottom. The outer container div is removed (the layout handles it). The old nav links (Listings / Disputes / Users / Settings buttons) are removed — the tab bar replaces them.

- [ ] **Step 1: Replace `app/admin/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [{ count: pending }, { count: live }, { count: openDisputes }] = await Promise.all([
    db.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'awaiting_review'),
    db.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'live'),
    db.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Pending review"
          value={pending ?? 0}
          href="/admin/listings"
          actionLabel="Review queue"
          urgent={(pending ?? 0) > 0}
        />
        <StatCard
          label="Live auctions"
          value={live ?? 0}
          href="/admin/listings"
          actionLabel="All listings"
          urgent={false}
        />
        <StatCard
          label="Open disputes"
          value={openDisputes ?? 0}
          href="/admin/disputes"
          actionLabel="Disputes"
          urgent={(openDisputes ?? 0) > 0}
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  href,
  actionLabel,
  urgent,
}: {
  label: string
  value: number
  href: string
  actionLabel: string
  urgent: boolean
}) {
  return (
    <Link
      href={href}
      className={`block border rounded-lg p-5 transition-colors ${
        urgent
          ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
          : 'hover:bg-muted'
      }`}
    >
      <p className={`text-3xl font-bold ${urgent ? 'text-primary' : ''}`}>{value}</p>
      <p className={`text-sm mt-1 ${urgent ? 'text-primary/80' : 'text-muted-foreground'}`}>
        {label}
      </p>
      <p className={`text-xs mt-3 ${urgent ? 'text-primary/70' : 'text-muted-foreground/60'}`}>
        → {actionLabel}
      </p>
    </Link>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `/admin`. Confirm:
- 3 stat cards in a 3-column grid (desktop), 2-column (tablet), 1-column (mobile)
- "Pending review" and "Open disputes" show violet when count > 0, neutral when 0
- "Live auctions" is always neutral regardless of count
- Clicking anywhere on a card navigates to the correct route
- Arrow label ("→ Review queue", "→ All listings", "→ Disputes") is visible at card bottom

- [ ] **Step 3: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat(admin): redesign dashboard with triage stat cards and conditional urgency"
```

---

### Task 4: Remove containers from sub-pages

**Files:**
- Modify: `app/admin/listings/page.tsx`
- Modify: `app/admin/disputes/page.tsx`
- Modify: `app/admin/users/page.tsx`
- Modify: `app/admin/settings/page.tsx`

Each page wraps its return in `<div className="max-w-3xl mx-auto p-4 pt-8">`. Remove that outer div and replace with a plain `<div>` (or remove the wrapper entirely if the children don't need a block container). The layout's `max-w-7xl mx-auto px-6 py-8` replaces it. Content inside stays unchanged.

- [ ] **Step 1: Update `app/admin/listings/page.tsx`**

In the `return` block, change:
```tsx
<div className="max-w-3xl mx-auto p-4 pt-8">
```
to:
```tsx
<div>
```

- [ ] **Step 2: Update `app/admin/disputes/page.tsx`**

Same change: replace `<div className="max-w-3xl mx-auto p-4 pt-8">` with `<div>`.

- [ ] **Step 3: Update `app/admin/users/page.tsx`**

Same change: replace `<div className="max-w-3xl mx-auto p-4 pt-8">` with `<div>`.

- [ ] **Step 4: Update `app/admin/settings/page.tsx`**

Same change: replace `<div className="max-w-3xl mx-auto p-4 pt-8">` with `<div>`.

- [ ] **Step 5: TypeScript build check**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Verify in browser**

Navigate to each of `/admin/listings`, `/admin/disputes`, `/admin/users`, `/admin/settings`. Confirm:
- Content spans the full `max-w-7xl` width (no narrow column)
- No double padding (content left edge aligns with tab labels)
- Active tab is highlighted correctly on each route
- Clicking a tab from a sub-page navigates correctly

- [ ] **Step 7: Commit**

```bash
git add app/admin/listings/page.tsx app/admin/disputes/page.tsx app/admin/users/page.tsx app/admin/settings/page.tsx
git commit -m "fix(admin): remove max-w-3xl containers from sub-pages — layout handles width"
```

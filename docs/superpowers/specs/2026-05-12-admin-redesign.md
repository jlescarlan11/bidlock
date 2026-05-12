# Admin Section UI/UX Redesign

**Date:** 2026-05-12  
**Status:** Approved

## Problem

All admin pages use `max-w-3xl mx-auto` (~48rem) while the nav header uses `max-w-7xl mx-auto px-6` (~80rem). This leaves the content left-shifted and narrow, with no persistent navigation between admin sections. The dashboard stat cards are dead ends — numbers without actions.

## Goals

1. Fix content width to match the nav header (`max-w-7xl mx-auto px-6`)
2. Add a persistent top tab bar for admin section navigation
3. Redesign the dashboard into a triage surface: each stat card shows its count and navigates directly to the relevant queue

## Architecture

### New: `app/admin/layout.tsx` (server component)
Wraps all `/admin/*` pages. Renders `AdminTabBar` and a shared container:

```
AdminLayout
├── AdminTabBar (client component)
└── <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
```

### New: `app/admin/admin-tab-bar.tsx` (client component)
Renders the five admin tabs. Uses `usePathname()` for active tab detection.

**Tabs:** Dashboard (`/admin`) · Listings (`/admin/listings`) · Disputes (`/admin/disputes`) · Users (`/admin/users`) · Settings (`/admin/settings`)

**Active tab style:** violet underline (`border-b-2 border-primary`), `text-primary font-semibold`  
**Inactive tab style:** `text-muted-foreground hover:text-foreground border-b-2 border-transparent`

**Mobile behavior:** Tab bar scrolls horizontally (`overflow-x-auto`). Active tab scrolls into view on route change (`element.scrollIntoView({ inline: 'nearest' })`).

The tab bar sits below the main nav, separated by a bottom border on its container: `border-b` on the wrapping div, `max-w-7xl mx-auto px-6` on the inner nav.

### Updated: `app/admin/page.tsx`
New dashboard layout — no container div (layout handles it).

**Stat cards grid:** `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`

Each card is a full `<Link>` wrapping the entire card surface (not just the arrow text).

**Card data:**

| Label | Value | Arrow text | href | Urgency-eligible |
|---|---|---|---|---|
| Pending review | `pending ?? 0` | → Review queue | `/admin/listings` | Yes |
| Live auctions | `live ?? 0` | → All listings | `/admin/listings` | No |
| Open disputes | `openDisputes ?? 0` | → Disputes | `/admin/disputes` | Yes |

**Conditional violet highlight** — applies only when urgency-eligible AND count > 0:
- Card: `border-primary/30 bg-primary/5`
- Number: `text-primary`
- Label: `text-primary/80`
- Arrow: `text-primary/70`

When calm (not urgent or count === 0):
- Card: default `border rounded-lg`
- Number: default foreground
- Label: `text-muted-foreground`
- Arrow: `text-muted-foreground/60`

**"Live auctions" is always calm** — it is a status metric, not an action queue.

### Updated: sub-pages (listings, disputes, users, settings)
Remove the outer `<div className="max-w-3xl mx-auto p-4 pt-8">` container from each page. The layout provides `max-w-7xl mx-auto px-6 py-8`. Content inside each page is otherwise unchanged.

Files to update:
- `app/admin/listings/page.tsx`
- `app/admin/disputes/page.tsx`
- `app/admin/users/page.tsx`
- `app/admin/settings/page.tsx`

## Interaction Details

- **Full-card click target:** The `<Link>` wraps the entire card. The `→ action` text is a visual affordance only — no nested anchor.
- **Hover state:** `hover:bg-muted` on calm cards; `hover:bg-primary/10` on highlighted cards.
- **Tab active matching:** Dashboard tab uses exact match (`pathname === '/admin'`). All other tabs use prefix match (`pathname.startsWith(tab.href)`) so nested routes like `/admin/listings/123` correctly highlight the Listings tab.

## Responsive Breakpoints

| Breakpoint | Dashboard grid | Tab bar |
|---|---|---|
| < md (mobile) | 1 column | horizontal scroll, active tab in view |
| md (768px+) | 2 columns | full row, no scroll needed |
| lg (1024px+) | 3 columns | full row |

## Files Created / Modified

| File | Action |
|---|---|
| `app/admin/layout.tsx` | Create |
| `app/admin/admin-tab-bar.tsx` | Create |
| `app/admin/page.tsx` | Update (dashboard) |
| `app/admin/listings/page.tsx` | Update (remove container) |
| `app/admin/disputes/page.tsx` | Update (remove container) |
| `app/admin/users/page.tsx` | Update (remove container) |
| `app/admin/settings/page.tsx` | Update (remove container) |

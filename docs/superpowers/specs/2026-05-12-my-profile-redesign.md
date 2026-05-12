# My Profile Page — UI/UX Redesign Spec

**Date:** 2026-05-12
**Status:** Approved
**Files in scope:** `app/me/profile/page.tsx`, `app/me/profile/profile-form.tsx`

---

## Problem

The current profile page uses `max-w-md mx-auto` for its container, which is much narrower than the nav header's `max-w-7xl mx-auto px-6`. On desktop the form floats as a narrow column in the centre of a wide page — dead whitespace flanking a form that doesn't earn the screen real estate. There is also no visual identity anchor: no avatar, no "Member since" context, nothing that makes the page feel like *your* profile.

---

## Design: Avatar Card + Form (Option C)

Two-column layout within a `max-w-7xl mx-auto px-6` container, matching the nav header exactly.

### Container

```
max-w-7xl mx-auto px-6 py-10
flex gap-6 items-start
```

### Left — Identity Card (fixed ~220px)

A white card with `border border-border rounded-xl shadow-sm p-6 text-center`.

| Element | Detail |
|---|---|
| Avatar | 64×64px violet circle (`bg-primary`), initials from `display_name` (first char of each word, max 2), white bold text. Falls back to `?` if display_name is null. |
| Name | `text-sm font-semibold` below avatar |
| Badge | "Member" — small violet pill badge (`bg-primary/10 text-primary`) |
| Divider | `border-t` separator |
| Member since | Label: "Member since" (muted uppercase). Value: `user.created_at` formatted as `"Month YYYY"` (e.g. "November 2025"). Accessed server-side via `supabase.auth.getUser()` which is already called in the page loader. |
| View public profile | `text-primary text-sm font-medium` link. Rendered as a placeholder today (no-op `href="#"`). Wired to a real URL once the public profile page exists. |

**Future slot note:** The identity card is intentionally designed with room to grow. Future additions (reputation/rating, listing count) slot in below the divider without restructuring the layout.

**Access pattern for `created_at`:** Use `user.created_at` from `supabase.auth.getUser()` already called in `page.tsx`. No new queries needed. If "Member since" needs to appear on a public profile page in the future, migrate to a `profiles.joined_at` column mirrored via a Supabase trigger at that point — not now.

### Right — Form Card (flex-1)

A white card with `border border-border rounded-xl shadow-sm p-7`.

| Element | Detail |
|---|---|
| Heading | `"Your Profile"` — `text-lg font-bold` |
| Subtitle | `"Update your display name, phone, and GCash details."` — `text-sm text-muted-foreground` |
| Fields | Display name, Phone number, GCash name — unchanged from current `ProfileForm` |
| Divider | `border-t` before the submit row |
| Save button | Right-aligned (`flex justify-end`), not full-width. Full-width is a mobile pattern; right-aligned anchors the action cleanly on a wide form. |

### Responsive behaviour

On mobile (`< md`) the two columns stack vertically: identity card on top, form card below. Both expand to full width.

---

## Implementation Notes

- `page.tsx` handles data fetching and passes both `profile` and `userCreatedAt` to `ProfileForm`.
- `ProfileForm` receives `userCreatedAt: string` as a new prop and renders the identity card alongside the form — or the identity card can be a separate inline component in `page.tsx` if keeping `ProfileForm` focused on the form only is preferred. **Preferred approach:** keep `ProfileForm` as a pure form component; render the identity card directly in `page.tsx` (it needs no client-side interactivity).
- `formatMemberSince(dateString: string): string` — helper that formats `created_at` as `"Month YYYY"` using `toLocaleDateString('en-US', { month: 'long', year: 'numeric' })`.
- `getInitials(name: string | null): string` — splits on whitespace, takes first char of each word (max 2), uppercases. Falls back to `"?"`.

---

## Out of Scope

- Sidebar navigation (B pattern) — premature until multiple account sections exist.
- Avatar upload — not in this iteration.
- Public profile page — the "View public profile" link is a placeholder; the page itself is a future feature.
- `profiles.joined_at` trigger — only needed if "Member since" needs to appear in multiple places (e.g. public profiles). Deferred.

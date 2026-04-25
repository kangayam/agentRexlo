# Portal Navigation Design

**Date:** 2026-04-25

## Goal

Add a persistent side sidebar to both the CA portal and the client portal so users can navigate between pages without typing URLs.

## Architecture

One shared `AppSidebar` component accepts a `navItems` prop. Two server-component layouts consume it:

- `app/ca/layout.tsx` (new) — wraps all `/ca/*` pages
- `app/client/layout.tsx` (update) — already exists, adds sidebar alongside the existing `ActingAsBanner`

## File Map

- **Create:** `components/nav/AppSidebar.tsx` — shared sidebar UI, `'use client'`
- **Create:** `app/ca/layout.tsx` — CA portal layout, server component
- **Modify:** `app/client/layout.tsx` — add sidebar, keep `ActingAsBanner`

## Component: AppSidebar

```tsx
interface NavItem {
  label: string
  href: string
  icon?: React.ReactNode  // optional, use text-only for MVP
}

interface AppSidebarProps {
  navItems: NavItem[]
  userName: string
  userEmail: string
}
```

**Layout (fixed left, full height):**
- Top: AgentFlow logo / wordmark
- Middle: nav links stacked vertically, active link highlighted (bold + dark bg)
- Bottom: user name + email (truncated), Sign Out button

**Active link detection:** `usePathname()` from `next/navigation` — highlight the link whose `href` matches the start of the current path (e.g. `/ca/clients/abc` highlights `/ca/clients`).

**Sign Out:** calls `POST /api/auth/signout` then redirects to `/login`. The existing sign-out API route handles this.

**Width:** 220px fixed. Page content fills the remaining width via `flex` layout on the layout wrapper.

## CA Portal Layout (`app/ca/layout.tsx`)

Server component. Calls `getAuthedUser()` — redirects to `/login` if unauthenticated or if `user.role === 'CLIENT'`. Passes user name + email down to `AppSidebar`.

Nav items:
- Dashboard → `/ca/dashboard`
- Clients → `/ca/clients`
- Team → `/ca/team`

## Client Portal Layout (`app/client/layout.tsx`)

Server component. Already handles `ActingAsBanner`. Add `getAuthedUser()` call (already imported), pass name + email to `AppSidebar`. Keep `ActingAsBanner` rendering above the main content area (not inside the sidebar).

Nav items:
- Dashboard → `/client/dashboard`
- Upload → `/client/upload`
- History → `/client/history`

## Sign Out API

Check whether `POST /api/auth/signout` exists. If not, create it: calls `supabase.auth.signOut()`, clears the `actingAsClientId` cookie, returns `{ ok: true }`.

## Error Handling

- Auth failure in layout → `redirect('/login')`
- Sign out failure → silently redirect to `/login` anyway (user is effectively logged out of the UI)

## Testing

- `npx tsc --noEmit` must pass
- Manually verify: active link highlights on each page, sign out clears session and redirects, `ActingAsBanner` still appears for CA acting-as in client portal

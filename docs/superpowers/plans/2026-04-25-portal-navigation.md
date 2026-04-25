# Portal Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent left sidebar to both the CA portal (`/ca/*`) and client portal (`/client/*`) so users can navigate between pages.

**Architecture:** One shared `AppSidebar` client component takes `navItems`, `userName`, and `userEmail` as props. Two server-component layouts (`app/ca/layout.tsx` and updated `app/client/layout.tsx`) fetch the authed user and render the sidebar alongside page content. A new `POST /api/auth/signout` route handles session teardown.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Tailwind CSS, Supabase Auth (`@supabase/ssr`), `next/navigation` (`usePathname`).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `components/nav/AppSidebar.tsx` | Create | Shared sidebar UI — nav links, user info, sign-out button |
| `app/api/auth/signout/route.ts` | Create | POST: calls `supabase.auth.signOut()`, clears cookie, returns `{ ok: true }` |
| `app/ca/layout.tsx` | Create | CA portal layout — auth guard, renders sidebar + children |
| `app/client/layout.tsx` | Modify | Add sidebar; keep `ActingAsBanner` above content area |

---

## Task 1: `POST /api/auth/signout` route

**Files:**
- Create: `app/api/auth/signout/route.ts`

No unit test needed — this is a thin API handler. Verify manually in Task 4.

- [ ] **Step 1: Create the route**

```typescript
// app/api/auth/signout/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()

  const cookieStore = await cookies()
  cookieStore.delete('actingAsClientId')

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 3: Commit**

```bash
git add app/api/auth/signout/route.ts
git commit -m "feat: add POST /api/auth/signout route"
```

---

## Task 2: `AppSidebar` component

**Files:**
- Create: `components/nav/AppSidebar.tsx`

This is a `'use client'` component. It uses `usePathname()` to detect the active link and calls the signout route on button click.

- [ ] **Step 1: Create the component**

```typescript
// components/nav/AppSidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

export interface NavItem {
  label: string
  href: string
}

interface AppSidebarProps {
  navItems: NavItem[]
  userName: string
  userEmail: string
}

export function AppSidebar({ navItems, userName, userEmail }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } finally {
      router.push('/login')
    }
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-200 bg-white px-3 py-4 flex-shrink-0">
      {/* Logo */}
      <div className="mb-6 px-2">
        <span className="text-lg font-bold text-gray-900">AgentFlow</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1">
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User info + sign out */}
      <div className="border-t border-gray-200 pt-4 space-y-2">
        <div className="px-3">
          <p className="truncate text-sm font-medium text-gray-900">{userName}</p>
          <p className="truncate text-xs text-gray-500">{userEmail}</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/nav/AppSidebar.tsx
git commit -m "feat: add AppSidebar component"
```

---

## Task 3: CA portal layout

**Files:**
- Create: `app/ca/layout.tsx`

Server component. Fetches the authed user, redirects to `/login` if unauthenticated or if the user is `CLIENT` role. Renders the sidebar + children side by side.

- [ ] **Step 1: Create the layout**

```typescript
// app/ca/layout.tsx
import { redirect } from 'next/navigation'
import { getAuthedUser } from '@/lib/auth/session'
import { AppSidebar } from '@/components/nav/AppSidebar'

const CA_NAV = [
  { label: 'Dashboard', href: '/ca/dashboard' },
  { label: 'Clients',   href: '/ca/clients' },
  { label: 'Team',      href: '/ca/team' },
]

export default async function CaLayout({ children }: { children: React.ReactNode }) {
  let user: Awaited<ReturnType<typeof getAuthedUser>>
  try {
    user = await getAuthedUser()
  } catch {
    redirect('/login')
    return
  }

  if (user.role === 'CLIENT') {
    redirect('/client/dashboard')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        navItems={CA_NAV}
        userName={user.name}
        userEmail={user.email}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/ca/layout.tsx
git commit -m "feat: add CA portal layout with sidebar"
```

---

## Task 4: Client portal layout

**Files:**
- Modify: `app/client/layout.tsx`

Add `getAuthedUser()` call, render `AppSidebar` on the left. Keep `ActingAsBanner` above the content area (not inside the sidebar).

The current layout only renders the `ActingAsBanner`. Replace it entirely with:

```typescript
// app/client/layout.tsx  — full file replacement
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { getAuthedUser } from '@/lib/auth/session'
import { ActingAsBanner } from '@/components/acting-as-banner'
import { AppSidebar } from '@/components/nav/AppSidebar'

const CLIENT_NAV = [
  { label: 'Dashboard', href: '/client/dashboard' },
  { label: 'Upload',    href: '/client/upload' },
  { label: 'History',   href: '/client/history' },
]

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  let user: Awaited<ReturnType<typeof getAuthedUser>>
  try {
    user = await getAuthedUser()
  } catch {
    redirect('/login')
    return
  }

  const cookieStore = await cookies()
  const actingAsClientId = cookieStore.get('actingAsClientId')?.value ?? null

  let actingAsFirmName: string | null = null
  if (actingAsClientId && user.org_id) {
    const client = await prisma.client.findUnique({
      where: { id: actingAsClientId, org_id: user.org_id },
      select: { name: true },
    })
    actingAsFirmName = client?.name ?? null
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        navItems={CLIENT_NAV}
        userName={user.name}
        userEmail={user.email}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {actingAsClientId && actingAsFirmName && (
          <ActingAsBanner firmName={actingAsFirmName} clientId={actingAsClientId} />
        )}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 1: Replace `app/client/layout.tsx` with the code above**

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/client/layout.tsx
git commit -m "feat: add client portal layout with sidebar"
```

---

## Task 5: Smoke test

No code changes. Manually verify the following in the browser (dev server already running on port 3000).

- [ ] **CA portal sidebar**
  - Visit `http://localhost:3000/ca/dashboard` — sidebar appears with Dashboard, Clients, Team links
  - Dashboard link is highlighted (active state: white text on dark bg)
  - Click Clients — navigates to `/ca/clients`, Clients link is now highlighted
  - Click Team — navigates to `/ca/team`, Team link is highlighted
  - User name and email appear at the bottom of the sidebar
  - Click Sign out — redirects to `/login`, session is cleared

- [ ] **Client portal sidebar**
  - Log in as a client user (or use acting-as from the CA side)
  - Visit `http://localhost:3000/client/dashboard` — sidebar appears with Dashboard, Upload, History
  - When acting-as, the amber `ActingAsBanner` appears above the content area (not inside the sidebar)
  - Click Exit in the banner — redirects to `/ca/clients`, sidebar disappears

- [ ] **Auth guard**
  - Visit `http://localhost:3000/ca/dashboard` while logged out — redirects to `/login`
  - Visit `http://localhost:3000/client/dashboard` while logged out — redirects to `/login`

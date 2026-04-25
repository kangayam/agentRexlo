# Notification Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a polling notification bell to the sidebar that shows unread count and a dropdown of recent notifications, backed by two API endpoints.

**Architecture:** A `NotificationBell` client component polls `GET /api/notifications` every 30s for unread count and recent items. `PATCH /api/notifications/read` marks one or all notifications read. `AppSidebar` is updated to render `NotificationBell` above the user info block.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Tailwind CSS, Prisma ORM, `useEffect`/`setInterval` for polling.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/api/notifications/route.ts` | Create | GET list + PATCH mark-read |
| `components/nav/NotificationBell.tsx` | Create | Bell, badge, dropdown, polling |
| `components/nav/AppSidebar.tsx` | Modify | Add `<NotificationBell />` above user info |

---

## Task 1: `GET /api/notifications` and `PATCH /api/notifications/read`

**Files:**
- Create: `app/api/notifications/route.ts`

No unit test — thin API handlers verified manually in Task 3.

- [ ] **Step 1: Create the route file**

```typescript
// app/api/notifications/route.ts
import { NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const user = await getAuthedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const notifications = await prisma.notification.findMany({
    where: { recipient_id: user.id },
    orderBy: { created_at: 'desc' },
    take: 10,
    select: {
      id: true,
      message: true,
      type: true,
      is_read: true,
      created_at: true,
    },
  })

  const unreadCount = await prisma.notification.count({
    where: { recipient_id: user.id, is_read: false },
  })

  return NextResponse.json({
    notifications: notifications.map(n => ({
      id: n.id,
      message: n.message,
      type: n.type,
      isRead: n.is_read,
      createdAt: n.created_at.toISOString(),
    })),
    unreadCount,
  })
}

export async function PATCH(request: Request) {
  const user = await getAuthedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { id?: string; all?: boolean }

  if (body.all) {
    await prisma.notification.updateMany({
      where: { recipient_id: user.id, is_read: false },
      data: { is_read: true },
    })
  } else if (body.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, recipient_id: user.id },
      data: { is_read: true },
    })
  } else {
    return NextResponse.json({ error: 'Provide id or all' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/api/notifications/route.ts
git commit -m "feat: add GET/PATCH /api/notifications routes"
```

---

## Task 2: `NotificationBell` component

**Files:**
- Create: `components/nav/NotificationBell.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/nav/NotificationBell.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface NotificationItem {
  id: string
  message: string
  type: 'CA_NOTIFY_CLIENT' | 'CLIENT_COMPLETED' | 'CLIENT_UPLOADED' | 'UPLOAD_FAILED'
  isRead: boolean
  createdAt: string
}

interface NotificationsResponse {
  notifications: NotificationItem[]
  unreadCount: number
}

const TYPE_LABELS: Record<NotificationItem['type'], { label: string; className: string }> = {
  CA_NOTIFY_CLIENT:  { label: 'Reminder',  className: 'bg-amber-100 text-amber-800' },
  CLIENT_UPLOADED:   { label: 'Uploaded',  className: 'bg-blue-100 text-blue-800' },
  CLIENT_COMPLETED:  { label: 'Completed', className: 'bg-emerald-100 text-emerald-800' },
  UPLOAD_FAILED:     { label: 'Failed',    className: 'bg-red-100 text-red-800' },
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
  return `${Math.floor(diff / 86400)} days ago`
}

export function NotificationBell() {
  const [data, setData] = useState<NotificationsResponse>({ notifications: [], unreadCount: 0 })
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) setData(await res.json())
    } catch {
      // silently ignore fetch failures
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleOpen = () => {
    setOpen(v => !v)
    fetchNotifications()
  }

  const markRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      await fetchNotifications()
    } catch {
      // silently ignore
    }
  }

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      await fetchNotifications()
    } catch {
      // silently ignore
    }
  }

  return (
    <div ref={containerRef} className="relative px-3">
      <button
        type="button"
        onClick={handleOpen}
        className="flex w-full items-center gap-2 rounded-md px-0 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      >
        <span className="relative inline-flex">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {data.unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {data.unreadCount > 9 ? '9+' : data.unreadCount}
            </span>
          )}
        </span>
        <span>Notifications</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Notifications
            </span>
            {data.unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Mark all read
              </button>
            )}
          </div>

          {data.notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">No notifications</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {data.notifications.map(n => (
                <li
                  key={n.id}
                  onClick={() => !n.isRead && markRead(n.id)}
                  className={`cursor-pointer px-4 py-3 hover:bg-gray-50 ${!n.isRead ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-800 line-clamp-2">{n.message}</p>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${TYPE_LABELS[n.type].className}`}>
                      {TYPE_LABELS[n.type].label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{timeAgo(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
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
git add components/nav/NotificationBell.tsx
git commit -m "feat: add NotificationBell component with polling"
```

---

## Task 3: Add `NotificationBell` to `AppSidebar`

**Files:**
- Modify: `components/nav/AppSidebar.tsx`

The current bottom section of `AppSidebar` (line 60 onwards) looks like:

```tsx
<div className="border-t border-gray-200 pt-4 space-y-2">
  <div className="px-3">
    <p className="truncate text-sm font-medium text-gray-900">{userName}</p>
    <p className="truncate text-xs text-gray-500">{userEmail}</p>
  </div>
  <button ...>Sign out</button>
</div>
```

Add `import { NotificationBell } from '@/components/nav/NotificationBell'` at the top of the file, then insert `<NotificationBell />` as the first child inside the bottom `div`:

```tsx
import { NotificationBell } from '@/components/nav/NotificationBell'

// ... rest of component ...

<div className="border-t border-gray-200 pt-4 space-y-2">
  <NotificationBell />
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
```

- [ ] **Step 1: Add the import to `AppSidebar.tsx`**

At the top of `components/nav/AppSidebar.tsx`, after the existing imports, add:

```typescript
import { NotificationBell } from '@/components/nav/NotificationBell'
```

- [ ] **Step 2: Add `<NotificationBell />` inside the bottom section**

Insert `<NotificationBell />` as the first element inside the `<div className="border-t border-gray-200 pt-4 space-y-2">` block (before the user name/email `div`).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add components/nav/AppSidebar.tsx
git commit -m "feat: wire NotificationBell into AppSidebar"
```

---

## Task 4: Smoke test

No code changes. Verify in the browser (dev server on port 3000).

- [ ] Log in and open any portal page — bell icon appears above user name in sidebar
- [ ] If there are notifications in the DB: red badge shows unread count
- [ ] Click bell — dropdown opens with notification list; unread items have blue-gray background
- [ ] Click an unread notification — it turns white (read), badge count decrements
- [ ] Click "Mark all read" — all items turn white, badge disappears
- [ ] Wait 30 seconds — if a new notification was created in the DB, badge updates automatically
- [ ] Click outside dropdown — it closes

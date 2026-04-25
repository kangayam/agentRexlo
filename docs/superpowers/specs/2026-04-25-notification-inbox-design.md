# Notification Inbox Design

**Date:** 2026-04-25

## Goal

Surface in-platform notifications to users via a bell icon in the sidebar. Unread count auto-refreshes every 30 seconds.

## Architecture

Three new files, one modified:

| File | Action | Responsibility |
|------|--------|----------------|
| `app/api/notifications/route.ts` | Create | GET: list notifications; PATCH: mark read |
| `components/nav/NotificationBell.tsx` | Create | Bell icon, badge, dropdown, polling |
| `components/nav/AppSidebar.tsx` | Modify | Add `NotificationBell` above user info |

## API: `GET /api/notifications`

Auth required. Returns the 10 most recent notifications for the authed user, ordered by `created_at` desc.

Response:
```json
{
  "notifications": [
    {
      "id": "uuid",
      "message": "Mangal Enterprises uploaded files for Feb 2026.",
      "type": "CLIENT_UPLOADED",
      "isRead": false,
      "createdAt": "2026-04-25T10:30:00Z"
    }
  ],
  "unreadCount": 3
}
```

## API: `PATCH /api/notifications/read`

Auth required. Body: `{ id?: string, all?: boolean }`. Marks one notification (by `id`) or all notifications as read, scoped to the authed user. Returns `{ ok: true }`.

## Component: `NotificationBell`

`'use client'`. Props: none (fetches its own data).

**State:**
- `notifications` — array of notification items
- `unreadCount` — integer
- `open` — boolean (dropdown visible)
- `loading` — boolean (initial load)

**Behaviour:**
- On mount: fetch `GET /api/notifications`
- Every 30s: refetch (use `setInterval` in `useEffect`, clear on unmount)
- Click bell: toggle `open`, fetch latest on open
- Click notification item: `PATCH { id }`, refetch, keep dropdown open
- Click "Mark all read": `PATCH { all: true }`, refetch
- Click outside dropdown: close (use a wrapping `div` with `onBlur` or a backdrop)

**Visual:**
- Bell icon (use `🔔` text or a simple SVG) with a red badge showing `unreadCount` when > 0
- Dropdown: `absolute` positioned, `z-50`, white bg, shadow, rounded, min-w-72
- Each notification row: message text (truncated at 2 lines), coloured type tag, "X min ago" timestamp
- Unread rows: `bg-blue-50`; read rows: plain white
- "Mark all read" link at the top of the dropdown, only shown when `unreadCount > 0`
- Empty state: "No notifications" centred in dropdown

**Type tag colours:**
- `CA_NOTIFY_CLIENT` → amber
- `CLIENT_UPLOADED` → blue
- `CLIENT_COMPLETED` → emerald
- `UPLOAD_FAILED` → red

**Time formatting:** use a simple relative formatter (`< 1 min ago`, `5 min ago`, `2 hr ago`, `3 days ago`) — no external library.

## AppSidebar modification

Add `<NotificationBell />` inside the bottom section, above the user name/email block:

```tsx
<div className="border-t border-gray-200 pt-4 space-y-2">
  <NotificationBell />           {/* NEW */}
  <div className="px-3">        {/* existing user info */}
    ...
  </div>
  <button ...>Sign out</button>  {/* existing */}
</div>
```

## Error handling

- Fetch failure: silently ignore (badge stays at last known count, no crash)
- PATCH failure: silently ignore (optimistic read state not needed for MVP)

## Testing

- `npx tsc --noEmit` must pass
- Manually verify: badge shows correct unread count, updates after 30s, dropdown opens/closes, marking read clears badge

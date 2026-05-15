# Notifications
**Type:** Low-Level Design (LLD)  
**Audience:** Developers + CA firm partners  
**Last updated:** 2026-05-15  
**Source files:** `lib/notifications/`, `app/api/notify/route.ts`, `app/api/ca/notifications/`

---

## What It Does (Plain English)

Notifications keep CAs and clients informed about actions that need their attention. In the current phase, all notifications are **in-platform only** — they appear in the notification bell in the app header. Email and WhatsApp are designed in (the slot exists in `lib/notifications/index.ts`) but not yet active.

A CA sees notifications when a client uploads files or completes their action queue. A client sees notifications when their CA sends them a reminder.

---

## Notification Types

| Type | Triggered when | Sender | Recipient |
|---|---|---|---|
| `CA_NOTIFY_CLIENT` | CA clicks "Send Reminder" for a client | CA user | Client user(s) |
| `CLIENT_UPLOADED` | Client uploads IMS or Tally file | System | CA users in the org |
| `CLIENT_COMPLETED` | Client marks all reconciliation items as done | System | CA users in the org |
| `UPLOAD_FAILED` | File upload or reconciliation fails | System | CA users in the org |

---

## Architecture

```
Action occurs (upload, reminder click, etc.)
        ↓
sendNotification(payload)       ← lib/notifications/index.ts
        ↓
createInPlatformNotification()  ← lib/notifications/in-platform.ts
        ↓
Deduplication check (24-hour window)
        ↓
INSERT into notifications table
        ↓
NotificationBell component polls /api/notifications
        ↓
Bell shows unread count badge
```

**Phase 2 slot:** `sendNotification()` will also call an email/WhatsApp provider once those are wired up. The calling code does not change — only `lib/notifications/index.ts` adds the additional channels.

---

## Deduplication

To prevent flooding — e.g. a client uploading the same file repeatedly — identical notifications are deduplicated within a 24-hour window.

A notification is considered duplicate if all of these match an existing notification within the last 24 hours:
- `recipient_id`
- `sender_id`
- `client_id`
- `type`

If a duplicate is found, `createInPlatformNotification()` returns early without inserting.

---

## Notification Bell

The `NotificationBell` component in the app header (`components/nav/NotificationBell.tsx`):
- Polls `/api/notifications` on page load and after certain actions
- Shows a red badge with the count of unread notifications
- Clicking opens a dropdown list of recent notifications
- Marking as read calls `POST /api/ca/notifications/mark-read`

---

## Send Reminder Flow (CA → Client)

```
CA clicks "Send Reminder" on a client row
        ↓
POST /api/ca/send-reminder  { clientId }
        ↓
Finds all CLIENT users linked to this client
        ↓
For each client user:
  sendNotification({
    recipientId: clientUser.id,
    senderId:    caUser.id,
    clientId:    clientId,
    type:        'CA_NOTIFY_CLIENT',
    message:     'Your CA has sent a reminder to review your GST reconciliation.'
  })
        ↓
Client sees bell badge on next page load
```

---

## Data Model

```sql
notifications
  id           UUID PK
  recipient_id TEXT FK → users.id
  sender_id    TEXT FK → users.id (nullable — system notifications have no sender)
  client_id    UUID FK → clients.id (nullable)
  type         NotificationType ENUM
  message      TEXT
  is_read      BOOLEAN DEFAULT false
  created_at   TIMESTAMP
```

---

## API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | Any auth | Fetch unread notifications for the current user |
| POST | `/api/ca/notifications/mark-read` | CA | Mark one or all notifications as read |
| POST | `/api/ca/send-reminder` | CA | Send reminder notification to a client |
| POST | `/api/notify` | CA | Generic notify endpoint (used internally) |

---

## What Is Not Built Yet

- Email notifications (Phase 2) — Resend is already integrated for invite emails; extending to notification emails is straightforward
- WhatsApp notifications (Phase 2) — slot exists in `sendNotification()`
- Notification preferences — currently all types are always on
- Notification history page — only bell dropdown exists today

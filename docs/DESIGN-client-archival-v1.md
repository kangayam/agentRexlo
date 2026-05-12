# Design Document — Client Archival, Restore & Deletion
**Feature:** Client lifecycle management with admin-only access  
**Version:** 1.0  
**Status:** Shipped  

---

## 1. Overview

Chartered Accountants occasionally need to offboard clients — either temporarily (client paused, dispute, non-payment) or permanently (client closed, moved to another CA). This feature adds a structured lifecycle:

```
Active → Archived → Permanently Deleted
                ↑
           (Restore within 30 days)
```

All lifecycle actions are restricted to **CA_ADMIN** role only. CA_STAFF and CLIENT users cannot archive, restore, or delete clients.

---

## 2. Screens & User Flows

### 2.1 Add New Client — `/ca/clients/new`

**Access:** CA_ADMIN and CA_STAFF

**Screen layout:**
- Breadcrumb: Client Portfolio → Add Client
- Page title: "Add New Client"
- Form card with three fields:
  - **Firm / Business Name** (text, required)
  - **Primary GSTIN** (text, required, auto-uppercased, 15-char enforced, live counter)
  - **Contact Email** (email, required — invite is sent here)
- Cancel button (returns to portfolio)
- Submit button: "Add Client & Send Invite"
- Info banner: invite expires in 7 days, resendable from client detail page

**Flow:**
1. CA clicks "Add Client" on the portfolio page
2. Fills in firm name, GSTIN, contact email
3. Submits → API creates client + sends invite email
4. On success → redirected to new client's detail page
5. On error → inline error shown (e.g. "GSTIN already registered")

**Validation:**
- Firm name: required
- GSTIN: exactly 15 alphanumeric characters (uppercase only)
- Email: valid email format
- GSTIN uniqueness: checked server-side

---

### 2.2 Client Portfolio — `/ca/clients`

**Access:** All CA users (CA_ADMIN and CA_STAFF)

#### Active clients view (default)

**New elements for CA_ADMIN:**
- **"Archived" toggle button** (top-right, next to Add Client) — switches to archived view
- **`···` overflow menu** on each client row with two options:
  - Edit Client → navigates to client detail page
  - **Archive Client** (red, Admin badge) → opens archive confirmation modal

**Archive confirmation modal:**
- Title: "Archive [Client Name]?"
- Summary of what gets archived: GSTIN, portal access (revoked immediately), reconciliation data (retained 30 days)
- Amber warning: restorable within 30 days by any Admin
- **Type-to-confirm** input — user must type the exact client name before the Archive button enables
- Two buttons: Cancel / Archive Client (red, disabled until confirmed)

#### Archived clients view (`?showArchived=true`)

Accessed via the "Archived" toggle. Shows a different table layout:

| Column | Description |
|---|---|
| Client | Firm name |
| GSTIN | Primary GSTIN |
| Archived On | Date archived |
| Permanent Delete | Date of automatic deletion (archivedAt + 30 days) |
| Actions | Restore / Delete Now buttons |

**Restore flow:**
1. CA_ADMIN clicks "Restore" on an archived client
2. API clears archived fields, re-enables portal access
3. Table refreshes — client disappears from archived view

**Permanent delete flow:**
1. CA_ADMIN clicks "Delete Now"
2. Confirmation modal: "Permanently delete [Client Name]?" — warns this cannot be undone
3. CA confirms → API cascades deletes all data
4. Table refreshes

---

### 2.3 Client Detail Page — `/ca/clients/[clientId]`

**New element for CA_ADMIN:**

A **Danger Zone** section appears at the bottom of the page (only if client is not already archived):

```
┌─────────────────────────────────────────────────────────┐
│ Danger Zone                               [Admin only]  │
├─────────────────────────────────────────────────────────┤
│ Archive this client                                      │
│ Revokes portal access immediately. All reconciliation   │
│ data is retained for 30 days and can be restored.       │
│                                [Archive Client]         │
└─────────────────────────────────────────────────────────┘
```

Clicking "Archive Client" opens the same type-to-confirm archive modal as the portfolio page. On confirmation, the CA is redirected back to `/ca/clients`.

---

## 3. Permission Model

| Action | CA_ADMIN | CA_STAFF | CLIENT |
|---|:---:|:---:|:---:|
| View active client list | ✓ | ✓ | — |
| Add new client | ✓ | ✓ | — |
| View client detail | ✓ | ✓ | — |
| View archived clients | ✓ | — | — |
| Archive a client | ✓ | — | — |
| Restore an archived client | ✓ | — | — |
| Permanently delete a client | ✓ | — | — |

All admin-only actions return **HTTP 403** if called by a non-admin user.

---

## 4. API Endpoints

### `POST /api/clients` (existing, extended)

Creates a new client. Unchanged from before.

**Request body:**
```json
{
  "action": "create",
  "firmName": "Sharma Traders Pvt Ltd",
  "primaryGstin": "27AABCU9603R1ZX",
  "contactEmail": "accounts@sharmatraders.com"
}
```

**Response (201):**
```json
{
  "client": {
    "id": "uuid",
    "name": "Sharma Traders Pvt Ltd",
    "contact_email": "accounts@sharmatraders.com",
    "gstins": [{ "id": "uuid", "gstin": "27AABCU9603R1ZX", "is_primary": true }]
  }
}
```

**Errors:**
- `400` — missing/invalid fields, GSTIN already registered
- `403` — not a CA user
- `500` — invite email failed to send

---

### `POST /api/ca/clients/[clientId]/archive`

Archives a client. **CA_ADMIN only.**

**Response (200):**
```json
{
  "success": true,
  "scheduledDeleteAt": "2026-06-09T00:00:00.000Z",
  "message": "Sharma Traders archived. Data retained for 30 days."
}
```

**Errors:**
- `401` — not authenticated
- `403` — not CA_ADMIN
- `404` — client not found or already archived

**Side effects:**
- Sets `archived_at`, `archived_by_id`, `scheduled_delete_at` on the client record
- Sets `is_active = false` on all portal user accounts linked to this client

---

### `POST /api/ca/clients/[clientId]/restore`

Restores an archived client. **CA_ADMIN only.**

**Response (200):**
```json
{
  "success": true,
  "message": "Sharma Traders has been restored successfully."
}
```

**Errors:**
- `401` — not authenticated
- `403` — not CA_ADMIN
- `404` — client not found or not archived

**Side effects:**
- Clears `archived_at`, `archived_by_id`, `scheduled_delete_at`
- Sets `is_active = true` on all linked portal user accounts

---

### `DELETE /api/ca/clients/[clientId]/delete`

Permanently deletes an archived client and all associated data. **CA_ADMIN only.**  
Client must be archived first — cannot permanently delete an active client.

**Response (200):**
```json
{
  "success": true,
  "message": "Sharma Traders and all related data permanently deleted."
}
```

**Errors:**
- `400` — client is not archived (must archive first)
- `401` — not authenticated
- `403` — not CA_ADMIN
- `404` — client not found

**Cascade delete order:**
1. `ReconciliationResult` records
2. `ImsInvoice` records
3. `TallyEntry` records
4. `UploadSession` records
5. `ClientGstin` records
6. `Notification` records linked to client
7. `User` accounts linked to client (portal users)
8. `Client` record

---

### `GET /api/cron/cleanup-archived-clients`

Internal cron job — not called by users. Runs daily at 02:00 UTC via Vercel Cron.

**Auth:** Bearer token via `CRON_SECRET` environment variable.

Finds all clients where `scheduled_delete_at <= now` and permanently deletes them using the same cascade as the manual delete endpoint.

---

## 5. Data Model Changes

### `clients` table

| Column | Type | Default | Description |
|---|---|---|---|
| `archived_at` | `TIMESTAMP` | `NULL` | When the client was archived. NULL = active. |
| `archived_by_id` | `TEXT` | `NULL` | User ID of the CA_ADMIN who archived. |
| `scheduled_delete_at` | `TIMESTAMP` | `NULL` | `archived_at + 30 days`. Cron deletes after this date. |

### `users` table

| Column | Type | Default | Description |
|---|---|---|---|
| `is_active` | `BOOLEAN` | `true` | Set to `false` when client is archived to revoke portal access. Reset to `true` on restore. |

**Migration:** `prisma/migrations/20260510080124_add_client_archival/migration.sql`

---

## 6. 30-Day Data Retention Policy

```
Day 0   — Client archived → portal access revoked immediately
Day 1–29 — Data retained, restorable by any CA_ADMIN
Day 30  — Cron job runs at 02:00 UTC → permanent cascade delete
```

The "Permanent Delete" date is shown in the archived clients table so CAs know exactly when data will be erased.

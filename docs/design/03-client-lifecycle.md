# Client Lifecycle
**Type:** Low-Level Design (LLD)  
**Audience:** Developers + CA firm partners  
**Last updated:** 2026-05-15  
**Source files:** `app/api/ca/clients/[clientId]/`, `app/api/cron/cleanup-archived-clients/`

---

## What It Is (Plain English)

When a CA firm stops working with a client — due to non-payment, the client closing down, or moving to another firm — they need a way to offboard that client safely. Simply deleting the client immediately would destroy reconciliation history that may be needed for audits or disputes.

The client lifecycle gives CA_ADMIN users a structured offboarding flow:

```
Active  →  Archive  →  (30-day window)  →  Permanent deletion
              ↑                ↓
           Restore         Auto-deleted by cron
         (within 30d)
```

---

## States

| State | Meaning | `archived_at` field |
|---|---|---|
| Active | Normal, visible in all views | `NULL` |
| Archived | Hidden from active views, portal access revoked, data retained | Set to archive timestamp |
| Permanently deleted | All data erased from database | Record no longer exists |

---

## Actions and Who Can Perform Them

| Action | Role required | What happens |
|---|---|---|
| Archive | CA_ADMIN only | Sets `archived_at`, `archived_by_id`, `scheduled_delete_at` (= now + 30 days). Sets `is_active = false` on all portal user accounts linked to this client. |
| Restore | CA_ADMIN only | Clears `archived_at`, `archived_by_id`, `scheduled_delete_at`. Sets `is_active = true` on all portal user accounts. |
| Delete Now | CA_ADMIN only | Must be archived first. Cascades delete in FK order (see below). |
| Auto-delete | Cron job (system) | Runs daily at 02:00 UTC. Deletes all clients where `scheduled_delete_at ≤ now`. |

---

## Archive Flow (Step by Step)

1. CA_ADMIN clicks "Archive Client" on portfolio page or client detail page
2. Confirmation modal appears — user must type the exact client name to confirm
3. On confirm, `POST /api/ca/clients/[clientId]/archive` is called
4. API verifies role = CA_ADMIN and client belongs to this org
5. Client record updated: `archived_at = now`, `scheduled_delete_at = now + 30 days`
6. All `User` records with `client_id = clientId` set to `is_active = false`
7. UI redirects to portfolio; client no longer appears in active view
8. Client appears in "Archived" view (`?showArchived=true`) with restore/delete buttons

**Portal access is revoked immediately** — if the client tries to log in, their account is inactive.

---

## Cascade Delete Order

When a client is permanently deleted (manually or by cron), data is erased in this order to respect foreign key constraints:

```
1. ReconciliationResult  (references ImsInvoice)
2. ImsInvoice            (references UploadSession)
3. TallyEntry            (references UploadSession)
4. UploadSession         (references ClientGstin)
5. ClientGstin           (references Client)
6. Notification          (references Client)
7. User                  (portal users linked to Client)
8. Client                (the record itself)
```

---

## 30-Day Retention Timeline

```
Day 0    Client archived → portal access revoked immediately
Day 1–29  Data retained, restorable by any CA_ADMIN
Day 30   Cron runs at 02:00 UTC → permanent cascade delete
```

The "Permanent Delete" date is displayed in the archived clients table so CAs know exactly when data will be erased.

---

## Cron Job

**Route:** `GET /api/cron/cleanup-archived-clients`  
**Schedule:** Daily at 02:00 UTC (configured in `vercel.json`)  
**Auth:** Bearer token via `CRON_SECRET` environment variable

The cron finds all clients where `scheduled_delete_at ≤ now` and permanently deletes them using the same cascade as the manual delete endpoint. Results (deleted / error per client) are returned in the response body for logging.

---

## Data Model Changes

Added to `clients` table (migration `20260510080124_add_client_archival`):

| Column | Type | Description |
|---|---|---|
| `archived_at` | `TIMESTAMP?` | When archived. NULL = active. |
| `archived_by_id` | `TEXT?` | User ID of the CA_ADMIN who archived. |
| `scheduled_delete_at` | `TIMESTAMP?` | `archived_at + 30 days`. Cron deletes after this date. |

Added to `users` table (same migration):

| Column | Type | Default | Description |
|---|---|---|---|
| `is_active` | `BOOLEAN` | `true` | Set to `false` on archive, `true` on restore. |

---

## API Endpoints

| Method | Route | Role | Description |
|---|---|---|---|
| POST | `/api/ca/clients/[clientId]/archive` | CA_ADMIN | Archive a client |
| POST | `/api/ca/clients/[clientId]/restore` | CA_ADMIN | Restore an archived client |
| DELETE | `/api/ca/clients/[clientId]/delete` | CA_ADMIN | Permanently delete (must be archived first) |
| GET | `/api/cron/cleanup-archived-clients` | CRON_SECRET | Auto-delete expired clients |

---

## UI Entry Points

| Screen | Where |
|---|---|
| Portfolio page | `···` menu → "Archive Client" (CA_ADMIN only) |
| Portfolio archived view | "Restore" and "Delete Now" buttons |
| Client detail page | Danger Zone section at bottom of page (CA_ADMIN, active clients only) |

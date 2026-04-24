# Client Dashboard + CA Multi-Client Dashboard — Design Spec

**Date:** 2026-04-24

---

## Overview

Two dashboards that close the loop after reconciliation:

1. **`/client/dashboard`** — Client-facing action queue. After a CA reconciles their files, the client sees every IMS invoice sorted by ITC at risk. They can mark invoices "Done on GSTN" with a single click.
2. **`/ca/dashboard`** — CA-facing client overview. One row per client: ITC at risk, pending actions count, status badge, one-click notify, and a link to view that client's queue (via the acting-as mechanism).

---

## 1. Client Dashboard (`/client/dashboard`)

### Default Period

On load, show the **most recently reconciled period** for the effective client (the period with the latest `upload_sessions.updated_at` where `status = 'DONE'`). If no reconciliation exists yet, show an empty state prompting the user to upload files.

A period dropdown (same `PeriodPicker` component) lets the user switch to any reconciled period.

### Summary Cards

Four cards across the top, calculated from the current period's `reconciliation_results`:

| Card | Calculation |
|------|------------|
| ₹ ITC Safe | Sum IGST+CGST+SGST for `AUTO_ACCEPTED` rows |
| ₹ ITC At Risk | Sum IGST+CGST+SGST for `AUTO_REJECTED` + `PENDING_REVIEW` + `NOT_IN_BOOKS` where `is_done = false` |
| ₹ ITC Blocked | Sum IGST+CGST+SGST for `AUTO_REJECTED` + `NOT_IN_BOOKS` where `is_done = false` |
| ₹ ITC Unverified | Sum IGST+CGST+SGST for `PENDING_REVIEW` where `is_done = false` |

All amounts displayed with `₹` prefix and Indian number formatting (e.g., `₹1,23,456`).

### Filter Chips

Five chips below the summary cards, styled as pill toggles. Only one active at a time. Default: **All**.

| Chip | Rows shown |
|------|-----------|
| All | Every row (incl. AUTO_ACCEPTED) |
| Action Required | `AUTO_REJECTED` + `NOT_IN_BOOKS` where `is_done = false` |
| Flagged | `PENDING_REVIEW` where `is_done = false` |
| Not in Books | `NOT_IN_BOOKS` where `is_done = false` |
| Done | All rows where `is_done = true` |

### Flat Table

Columns (in order):

| Column | Source | Notes |
|--------|--------|-------|
| Supplier GSTIN | `ims_invoices.supplier_gstin` | |
| Invoice # | `ims_invoices.invoice_number` | Normalised display |
| Invoice Date | `ims_invoices.invoice_date` | `dd MMM yyyy` |
| Taxable Value | `ims_invoices.taxable_value` | `₹` formatted |
| IGST | `ims_invoices.igst` | |
| CGST | `ims_invoices.cgst` | |
| SGST | `ims_invoices.sgst` | |
| ITC at Risk | Computed: IGST+CGST+SGST | Only for non-AUTO_ACCEPTED |
| Status | `reconciliation_results.match_outcome` | Colour-coded badge |
| Reason | `reconciliation_results.reason_code` | Short human label |
| Action | "Mark Done" toggle | See below |

**Default sort:** ITC at Risk descending (highest risk at top). `AUTO_ACCEPTED` rows have ITC at Risk = ₹0 and sort to the bottom.

**No pagination for MVP.** Render all rows. (Clients typically have < 200 invoices per period.)

### Mark Done Toggle

A single button per row: **"Mark Done on GSTN"** (when `is_done = false`) or **"✓ Done"** (when `is_done = true`, muted style).

Clicking either:
- Calls `PATCH /api/reconciliation/mark-done` with `{ resultId, isDone: !current }`
- Optimistically updates the UI immediately
- On error, reverts and shows a toast

Only rows with outcome `AUTO_REJECTED`, `PENDING_REVIEW`, or `NOT_IN_BOOKS` show this button. `AUTO_ACCEPTED` rows show nothing in the Action column.

The toggle does **not** move the row out of the current filter view immediately — it updates the badge and button state in place. The filter count in the chip updates after the row re-renders.

---

## 2. CA Multi-Client Dashboard (`/ca/dashboard`)

### Layout

No summary cards at the top. Just a heading and a single table — one row per client in the CA's org.

### Client Table

Columns:

| Column | Source | Notes |
|--------|--------|-------|
| Client | `clients.name` | |
| GSTINs | Count of GSTINs on the client | e.g., "2 GSTINs" |
| ITC at Risk (This Month) | Sum of at-risk ITC across all GSTINs for the most recent reconciled period | `₹` formatted; "—" if no upload |
| Pending Actions | Count of non-done, non-AUTO_ACCEPTED rows for most recent period | Integer; "—" if no upload |
| Status | Derived badge | See below |
| Actions | Notify + View Queue buttons | |

**Status badges:**

| Badge | Condition | Colour |
|-------|-----------|--------|
| Urgent | Pending actions > 0 and at-risk > ₹10,000 | Red |
| Pending | Pending actions > 0 (any amount) | Amber |
| All Done | Pending actions = 0, upload exists | Green |
| No Upload | No DONE upload session this month | Grey |

"This month" = the current calendar month. The CA dashboard always shows current-month data (no period picker). If a client uploaded for an earlier period but not the current month, they show "No Upload".

### Action Buttons

**Notify:** Opens a small inline confirmation — "Send reminder to [client email]?" with Confirm/Cancel. On confirm, calls `POST /api/notify` with `{ clientId }`. For MVP, this records a notification in the DB (no actual email sent yet — the email slot is reserved for Phase 2).

**View Queue:** Sets the `actingAsClientId` cookie and navigates to `/client/dashboard`. Same mechanic as the existing "Act as Client" button on `/ca/clients/[clientId]`.

### Sorting

Default sort: Status priority (Urgent → Pending → All Done → No Upload), then ITC at Risk descending within each group. Not user-sortable in MVP.

---

## 3. Routing Changes

- `/client/dashboard` currently shows "Action Queue — coming soon". Replace with the real dashboard.
- `/ca/dashboard` currently shows "Multi-client view — coming soon". Replace with the real dashboard.
- Both routes must respect the existing auth + acting-as patterns:
  - Client dashboard: uses `getEffectiveClientId()` (handles acting-as cookie)
  - CA dashboard: requires CA role, fetches all clients in org

---

## 4. New API Routes

### `GET /api/dashboard/client`

Query params: `clientId`, `period` (YYYY-MM format, optional — defaults to most recent reconciled period).

Returns:
```json
{
  "period": "2026-02",
  "summaryCards": {
    "safe": "45000.00",
    "atRisk": "12000.00",
    "blocked": "8000.00",
    "unverified": "4000.00"
  },
  "rows": [
    {
      "resultId": "...",
      "supplierGstin": "27AABCU9603R1ZX",
      "invoiceNumber": "INV-001",
      "invoiceDate": "2026-02-01",
      "taxableValue": "10000.00",
      "igst": "1800.00",
      "cgst": "0.00",
      "sgst": "0.00",
      "itcAtRisk": "1800.00",
      "matchOutcome": "AUTO_REJECTED",
      "reasonCode": "WRONG_GSTIN",
      "isDone": false
    }
  ]
}
```

### `PATCH /api/reconciliation/mark-done`

Body: `{ resultId: string, isDone: boolean }`

Auth: effective client must own the result. Sets `is_done`, `done_at` (if marking done), `done_by_id`.

Returns: `{ resultId, isDone, doneAt }`.

### `GET /api/dashboard/ca`

No params (uses session org).

Returns one entry per client:
```json
{
  "clients": [
    {
      "clientId": "...",
      "name": "Mangal Enterprises",
      "gstinCount": 1,
      "period": "2026-02",
      "itcAtRisk": "12000.00",
      "pendingActions": 3,
      "status": "Urgent"
    }
  ]
}
```

### `POST /api/notify`

Body: `{ clientId: string }`

Auth: CA must own the client. Records a `Notification` row in DB (type = `REMINDER`, channel = `IN_APP`). Returns `{ notificationId }`.

---

## 5. DB Changes

### `reconciliation_results` — no schema changes needed

Fields `is_done`, `done_at`, `done_by_id` already exist (added in the reconciliation engine spec).

### `notifications` table — already exists

The existing `Notification` model (added in Week 3 spec) handles the `POST /api/notify` route. No schema changes needed.

---

## 6. Components

| Component | File | Description |
|-----------|------|-------------|
| `SummaryCards` | `components/dashboard/SummaryCards.tsx` | Four stat cards |
| `FilterChips` | `components/dashboard/FilterChips.tsx` | Five pill chips, single-select |
| `InvoiceTable` | `components/dashboard/InvoiceTable.tsx` | Sortable table + Mark Done button |
| `MarkDoneButton` | `components/dashboard/MarkDoneButton.tsx` | Optimistic toggle button |
| `CaClientTable` | `components/dashboard/CaClientTable.tsx` | CA multi-client list |
| `StatusBadge` | `components/dashboard/StatusBadge.tsx` | Colour-coded outcome/status badge |
| `NotifyButton` | `components/dashboard/NotifyButton.tsx` | Inline confirm + POST /api/notify |

All components are client components (`'use client'`). Pages are server components that fetch initial data and pass it as props.

---

## 7. Error and Empty States

- **No upload yet:** Full-page empty state with "Upload files to see your action queue" and a link to `/client/upload`.
- **No rows after filter:** Inline "No invoices match this filter" message within the table area.
- **API error on mark-done:** Toast notification "Failed to update. Please try again." Row reverts to previous state.
- **No clients in CA org:** "No clients yet. Add your first client above." (already exists on `/ca/clients`).

---

## 8. Out of Scope (MVP)

- Invoice-level comment/note field
- Export to CSV/Excel
- Date range filter (beyond period picker)
- Multi-select bulk mark-done
- Actual email sending for Notify (DB record only)
- Real-time updates via websocket/polling

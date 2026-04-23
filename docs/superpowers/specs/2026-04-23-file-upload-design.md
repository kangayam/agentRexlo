# File Upload — Design Spec
**Date:** 2026-04-23
**SPEC reference:** Section 5, Feature Group B
**Status:** Approved — ready for implementation planning

---

## Context

Week 4 of the Phase 1 build plan. The reconciliation engine (`lib/reconciliation/`) and parsers (`lib/parsers/`) are complete and tested. This feature wires them up end-to-end: file upload UI → API → parse → store → trigger reconciliation.

---

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Who uploads | Both CA and client equally (50/50) | CAs act on behalf of clients often; page must work for both |
| Upload timing | Files uploaded separately (IMS first, Tally later) | IMS only available from GSTN on the 14th; Tally export may take a day |
| GSTIN layout | One section per GSTIN on the page | CA needs to see all GSTIN statuses at a glance |
| Period selection | Auto-default per GSTIN, overridable | Smart default removes friction; override handles catch-up months |
| API approach | Two-step: upload → reconcile as separate calls | Clean separation; reconciliation can be retried without re-uploading |
| Tally column mapping | Full mapping UI: auto-detect + dropdown fallback + save template | Tally exports vary widely across firms |

---

## Architecture

### API Endpoints

#### `POST /api/upload`
Accepts multipart form data. Parses, persists, and triggers reconciliation if both files are present.

**Request:**
```
Content-Type: multipart/form-data
file        — the uploaded file (IMS JSON or Tally CSV/Excel)
type        — "ims" | "tally"
clientGstinId — UUID of the ClientGstin record
period      — "YYYY-MM" (e.g. "2026-02")
columnMapping — JSON string (Tally only, when auto-detect fails)
```

**Behaviour:**
1. Auth check — caller must be CA (admin or staff) or the client user linked to this clientGstinId
2. Upsert `UploadSession` for `(clientGstinId, period)` — create if missing, update if exists
3. **IMS path:** parse with `imsJsonParser` → upsert `ImsInvoice` rows (additive: skip rows whose invoice number already exists in this session) → set `ims_uploaded_at`, `ims_file_url`
4. **Tally path:** parse with `tallyCsvParser` / `tallyExcelParser` (using provided `columnMapping` if given) → delete all existing `TallyEntry` rows for this session → insert fresh rows → set `tally_uploaded_at`, `tally_file_url`
5. Save file to Supabase Storage at `uploads/{orgId}/{clientId}/{period}/{type}.{ext}` — non-blocking; storage failure does not fail the upload
6. Set `UploadSession.status = PROCESSING`
7. If both `ims_uploaded_at` and `tally_uploaded_at` are now set → call `runReconciliation(sessionId)` (internal function, not a network call)
8. Fire `CLIENT_UPLOADED` in-platform notification to CA org members

**Response:**
```json
{
  "sessionId": "uuid",
  "status": "DONE | PROCESSING | PENDING",
  "imsCount": 47,
  "tallyCount": 312,
  "reconOutcomes": {
    "AUTO_ACCEPTED": 41,
    "AUTO_REJECTED": 4,
    "PENDING_REVIEW": 3,
    "NOT_IN_BOOKS": 1
  }
}
```

#### `POST /api/reconciliation`
Runs reconciliation for an existing session. Called internally by the upload route; can also be called externally to retry.

**Request:** `{ "sessionId": "uuid" }`

**Behaviour:**
1. Load `ImsInvoice` + `TallyEntry` rows for the session from DB
2. Normalise using existing `lib/reconciliation/normalize.ts`
3. Run `reconcile()` from `lib/reconciliation/index.ts`
4. Upsert `ReconciliationResult` rows (preserve `is_done`, `done_at`, `done_by_id` on existing rows)
5. Set `UploadSession.status = DONE`

**Response:** `{ "AUTO_ACCEPTED": n, "AUTO_REJECTED": n, "PENDING_REVIEW": n, "NOT_IN_BOOKS": n }`

#### `GET /api/upload?clientGstinId=xxx&period=YYYY-MM`
Returns current `UploadSession` state for the upload page to render on load.

**Response:**
```json
{
  "sessionId": "uuid | null",
  "status": "PENDING | PROCESSING | DONE | ERROR | null",
  "imsUploadedAt": "ISO datetime | null",
  "imsCount": 47,
  "tallyUploadedAt": "ISO datetime | null",
  "tallyCount": 312
}
```

### Internal function: `runReconciliation(sessionId)`

Lives in `lib/reconciliation/run.ts`. Called by the upload route after both files are present. Not an API call — just a function. This keeps the two-step separation clean in code while avoiding a network round-trip for the common case.

---

## Upload Page UI (`/client/upload`)

### Layout

- Page title: "Upload Files" + client name (from acting-as cookie if CA is acting)
- One card per GSTIN, stacked vertically
- Period selector in each card header (auto-defaults to most recent period; see Period Logic below)
- Status badge per card: `Reconciled` (green) / `Tally pending` (amber) / `IMS pending` (amber) / `No upload` (grey) / `Processing` (blue)

### Per-GSTIN card states

| State | IMS zone | Tally zone | Badge |
|---|---|---|---|
| No upload | Dashed drop zone | Dashed drop zone | Grey "No upload" |
| IMS only | Green "✅ N invoices · date" + Re-upload link | Amber dashed drop zone | Amber "Tally pending" |
| Tally only | Amber dashed drop zone | Green "✅ N rows · date" + Re-upload link | Amber "IMS pending" |
| Both uploaded, processing | Green (IMS) | Green (Tally) | Blue "Processing…" |
| Reconciled | Green (IMS) | Green (Tally) | Green "Reconciled" |
| Error | Red error zone with message | Red error zone with message | Red "Upload failed" |

### Period Logic

- Default period = previous calendar month if today is on or after the 14th (GSTN publishes IMS on the 14th); current month if before the 14th
- Override: clicking the period selector opens a month-picker dropdown (last 12 months only — no future periods)
- Period is per-GSTIN; different GSTINs can be on different periods

### File acceptance

- IMS zone: accepts `.json` only; validates that `docdata.b2b` key exists before submitting
- Tally zone: accepts `.csv`, `.xls`, `.xlsx`; file size limit 10 MB

### Upload flow

1. User drops / clicks file → immediate client-side validation (type, size)
2. If Tally: attempt auto-column-detection (see Column Mapping below)
3. Show inline progress bar while `POST /api/upload` runs
4. On success: zone turns green, badge updates, outcome summary toast appears if reconciliation ran
5. On error: zone turns red, error message inline (not a toast — user needs to see it while fixing)

---

## Column Mapping UI

Appears as a full-screen modal after Tally file is selected, when auto-detection does not match all required fields.

### Auto-detection

The parser attempts to match column headers using a list of known aliases:

| Required field | Known aliases |
|---|---|
| Supplier GSTIN | Party GSTIN, Supplier GSTIN, GSTIN, Vendor GSTIN, Tax Registration No |
| Supplier Name | Ledger Name, Party Name, Supplier Name, Vendor Name |
| Invoice Number | Voucher No, Bill No, Invoice No, Ref No, Bill Reference |
| Invoice Date | Date, Voucher Date, Bill Date, Invoice Date, Posting Date |
| Taxable Value | Taxable Amount, Taxable Amt, Taxable Value, Basic Amount |
| IGST | IGST Amt, IGST Amount, Integrated Tax, IGST |
| CGST | CGST Amt, CGST Amount, Central Tax, CGST |
| SGST | SGST Amt, SGST Amount, State Tax, SGST |

If all required fields are matched → skip modal, proceed directly to upload.
If any required field is unmatched → show mapping modal.

### Mapping modal

- Table with one row per required field
- Columns: Required field | Sample values from file | Your column (dropdown or green ✓ badge)
- Auto-matched rows: green badge, no interaction needed
- Unmatched rows: amber dropdown, pre-filled with best-guess (highest fuzzy similarity score)
- Sample values: first 3 non-empty values from that column in the file
- "Save as template" checkbox — checked by default; saves mapping keyed by `orgId` to localStorage (MVP) for next upload
- Confirm button: "Confirm mapping → Process N rows"
- Cancel closes the modal and removes the file

### Template recall

On next Tally upload for the same org, retrieve saved template from localStorage and pre-apply. User sees the mapping pre-filled and can adjust before confirming.

---

## Error Handling

| Error | User-facing message |
|---|---|
| IMS JSON missing `docdata.b2b` | "This file doesn't look like a GSTN IMS export. Download the JSON export from the IMS tab on the GSTN portal." |
| Tally file has no recognisable columns | Column mapping modal opens |
| File too large (>10 MB) | "File is too large. Export a smaller date range from Tally, or contact support." |
| Upload session already being processed | "This GSTIN + period is currently being processed. Please wait a moment and refresh." |
| Storage save fails | Silent — upload proceeds, file URL left null. Log error server-side. |
| Reconciliation fails | `UploadSession.status = ERROR`. Badge shows "Upload failed". User can retry via a "Retry reconciliation" button (calls `POST /api/reconciliation`). |

---

## Re-upload Behaviour (SPEC §5B)

- **IMS re-upload:** Additive. New `ImsInvoice` rows are inserted. Invoices already in the session (matched by normalised invoice number) are skipped. Existing `ReconciliationResult` rows where `is_done = true` are preserved unchanged — reconciliation does not overwrite completed actions. A diff count is shown: "3 new invoices added".
- **Tally re-upload:** Replace-all. All existing `TallyEntry` rows for the session are deleted and replaced. If reconciliation has already run, it re-runs automatically after the new Tally is processed.

---

## Files to create / modify

### New files
- `app/client/upload/page.tsx` — upload page (replaces 3-line stub)
- `components/upload/GstinUploadCard.tsx` — per-GSTIN upload section
- `components/upload/FileDropZone.tsx` — drag-and-drop zone with states
- `components/upload/ColumnMappingModal.tsx` — Tally column mapping modal
- `components/upload/PeriodPicker.tsx` — month picker dropdown
- `lib/reconciliation/run.ts` — `runReconciliation(sessionId)` orchestrator
- `lib/storage/supabase-storage.ts` — Supabase Storage implementation (replaces stub)

### Modified files
- `app/api/upload/route.ts` — full implementation (replaces 7-line stub)
- `app/api/reconciliation/route.ts` — full implementation (replaces 7-line stub)
- `lib/storage/index.ts` — wire up Supabase implementation

### New API route
- `app/api/upload/route.ts` — add `GET` handler alongside existing `POST`

---

## Out of scope for this sprint

- Upload history page (`/client/history`) — stub stays
- CA dashboard (`/ca/dashboard`) — stays stub until client dashboard is built
- Client dashboard (`/client/dashboard`) — next sprint after upload
- WhatsApp / email notifications — Phase 2

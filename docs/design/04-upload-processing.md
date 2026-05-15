# Upload Processing
**Type:** Low-Level Design (LLD)  
**Audience:** Developers + CA firm partners  
**Last updated:** 2026-05-15  
**Source files:** `lib/parsers/`, `lib/upload/`, `app/api/upload/route.ts`

---

## What It Does (Plain English)

Every month, a client uploads two files:

1. **IMS JSON** — downloaded from the GSTN portal (Invoice Management System). Contains the list of invoices their suppliers have filed against them.
2. **Tally file** — exported from Tally as CSV or Excel. Contains the purchase invoices recorded in the client's own accounting books.

The upload system parses both files, stores the invoices in the database, triggers reconciliation, and saves the resulting action queue. It handles format variations, re-uploads, and partial uploads gracefully.

---

## Filing Period Logic

The system needs to know which GST month (period) an upload belongs to.

```ts
// lib/upload/period.ts
function getDefaultPeriodValue(): string {
  // GSTN publishes IMS on the 14th
  // Before the 14th → current month (still waiting for IMS)
  // On or after the 14th → previous month (IMS now available)
  const useCurrentMonth = today.getDate() < 14
  return useCurrentMonth ? thisMonth : lastMonth
}
```

**Example:** On 15 May 2026, the default period is April 2026 (`2026-04`), because the April IMS was published on 14 May.

The client can also manually select a period from a dropdown when uploading.

---

## Upload Session States

Each client GSTIN + period has one `UploadSession` record tracking what's been uploaded.

| State | Meaning |
|---|---|
| `PENDING` | Session created, no files uploaded yet |
| `PROCESSING` | Files uploaded, reconciliation running |
| `DONE` | Reconciliation complete, results available |
| `ERROR` | Reconciliation failed |

---

## IMS JSON Parsing

**File format:** JSON exported from the GSTN IMS portal  
**Parser:** `lib/parsers/ims-json-parser.ts`

The IMS JSON has a specific nested structure from GSTN. The parser:
1. Extracts each invoice record
2. Normalises GSTIN (uppercase), invoice number (stripped), date (ISO 8601), values (2dp)
3. Converts tax components (IGST/CGST/SGST) from GSTN's format to `Decimal` objects

**Key fields extracted per invoice:**

| Field | Source field | Normalisation |
|---|---|---|
| `supplierGstin` | `ctin` | Uppercase |
| `invoiceNo` | `inum` | Lowercase, strip `/\-_# `, remove leading zeros |
| `invoiceDate` | `dt` | `DD-MM-YYYY` → `YYYY-MM-DD` |
| `totalValue` | `val` | Decimal, 2dp |
| `igst` | `itms[].itm_det.iamt` | Sum across line items, Decimal |
| `cgst` | `itms[].itm_det.camt` | Sum across line items, Decimal |
| `sgst` | `itms[].itm_det.samt` | Sum across line items, Decimal |

---

## Tally File Parsing

**File formats:** CSV (papaparse) or Excel (.xlsx, .xls — xlsx library)  
**Parsers:** `lib/parsers/tally-csv-parser.ts`, `lib/parsers/tally-excel-parser.ts`

Tally exports have no fixed column order — CAs use different Tally configurations. The system auto-detects columns using `lib/parsers/tally-column-detect.ts`.

**Column detection strategy:**
1. Read the header row
2. Match each header against a dictionary of known synonyms (e.g. "Party GSTIN", "Supplier GST", "Vendor GSTIN" all map to `supplierGstin`)
3. If any required column cannot be matched, surface a mapping UI so the user can manually map columns

**Required columns (after mapping):**

| Logical field | Example Tally headers |
|---|---|
| `supplierGstin` | Party GSTIN, Supplier GST No, Vendor GSTIN |
| `supplierName` | Party Name, Vendor Name |
| `voucherNumber` | Voucher No, Invoice No, Bill No |
| `voucherDate` | Date, Invoice Date, Voucher Date |
| `totalAmount` | Amount, Total, Gross Amount |
| `igst` | IGST, Integrated Tax |
| `cgst` | CGST, Central Tax |
| `sgst` | SGST, State Tax |

---

## Re-Upload Behaviour

| File | Behaviour |
|---|---|
| **IMS JSON** | **Replace-all**: existing IMS invoices and their reconciliation results are deleted, new file is inserted fresh. Source: `lib/upload/ims.ts` |
| **Tally CSV/Excel** | **Replace-all**: existing Tally entries for this session are deleted and replaced. |

**Why replace-all?** GSTN may correct or add invoices between uploads. Replacing ensures the database always reflects the latest file, not an accumulation of old + new data.

**Is_done preservation:** When IMS is re-uploaded, any invoice that still appears in the new file and was previously marked `is_done = true` retains its done status. The CA's work is not lost.

---

## Reconciliation Trigger

After both IMS and Tally files are uploaded and stored, reconciliation runs automatically:

```
Upload complete
      ↓
Session status → PROCESSING
      ↓
lib/reconciliation/run.ts called
      ↓
Normalise → Match → Classify (see doc 01)
      ↓
ReconciliationResult rows created
      ↓
Session status → DONE
```

Reconciliation can also be triggered manually by a CA from the client detail page.

---

## Storage

Uploaded files are stored in **Supabase Storage** (not in the database). The file URL is saved on the `UploadSession` record (`ims_file_url`, `tally_file_url`). The database stores the parsed, normalised invoice data — not the raw file.

---

## Data Model

```
ClientGstin
  └── UploadSession (one per GSTIN+period)
        ├── ims_uploaded_at, ims_file_url
        ├── tally_uploaded_at, tally_file_url
        ├── status: PENDING | PROCESSING | DONE | ERROR
        ├── ImsInvoice[] (parsed from IMS file)
        └── TallyEntry[] (parsed from Tally file)
```

---

## API Endpoint

| Method | Route | Description |
|---|---|---|
| POST | `/api/upload` | Accept IMS or Tally file, parse, store, trigger reconciliation |

The upload endpoint accepts `multipart/form-data` with fields: `file`, `type` (`ims` or `tally`), `clientGstinId`, `period`.

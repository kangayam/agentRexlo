# Reconciliation Engine
**Type:** Low-Level Design (LLD)  
**Audience:** Developers + CA firm partners  
**Last updated:** 2026-05-16  
**Source files:** `lib/reconciliation/`, `lib/parsers/`

---

## What It Does (Plain English)

Every month the government publishes a list of invoices your suppliers say they issued to you (the IMS data). Your Tally software has a separate list of purchase invoices you recorded yourself. These two lists should match — but they often don't, due to typos, format differences, or genuine errors.

The reconciliation engine compares every invoice in the IMS list against the Tally list and gives each one a verdict:

- **AUTO_ACCEPTED** — matched perfectly, ITC is safe, no action needed
- **AUTO_REJECTED** — matched but something is definitely wrong (GSTIN mismatch, value off by >10%), ITC is at risk
- **PENDING_REVIEW** — matched but needs human judgement (value off by 2–10%, or invoice number looks different)
- **NOT_IN_BOOKS** — no match found in Tally at all, ITC is at risk

---

## Pipeline Overview

```
IMS JSON file        Tally CSV/Excel file
      ↓                      ↓
  IMS Parser              Tally Parser
      ↓                      ↓
  Normalise            Normalise
  (GSTIN, invoice#,    (same rules)
   dates, values)
      ↓                      ↓
      └──────────┬───────────┘
                 ↓
           Matcher
     (Strategy A → Strategy B)
                 ↓
           Classifier
     (6 rules in order)
                 ↓
        ReconciliationResult
     (one row per IMS invoice)
```

---

## Step 1 — Normalise

Both files are normalised before any comparison. This ensures format differences don't cause false mismatches.

| Field | Rule | Example |
|---|---|---|
| GSTIN | Uppercase, trim whitespace | `27aabcu9603r1zx` → `27AABCU9603R1ZX` |
| Invoice number | Lowercase, strip `/ - _ \ # space`, remove leading zeros | `INV/2026/001` → `inv2026001` |
| Date | Parse `DD-MM-YYYY` (IMS) or `DD/MM/YYYY` (Tally) → ISO 8601 | `15-02-2026` → `2026-02-15` |
| Values | Round to 2 decimal places | `11700.005` → `11700.01` |

**Source:** `lib/reconciliation/normalize.ts`

---

## Step 2 — Match

For each IMS invoice, the matcher looks for a corresponding Tally entry using two strategies tried in order.

### Strategy A — Exact invoice number match
Look up the normalised invoice number in a pre-built Tally index. If one or more rows match, pick the best one (smallest value delta; tie-break on smallest date gap).

### Strategy B — Fuzzy GSTIN + value match (fallback)
If Strategy A finds nothing, search all Tally rows for entries where:
- Normalised GSTIN matches, AND
- Total value is within 2% of the IMS value

If found, this is a "soft" invoice number match — the invoice exists in Tally but under a different number.

If neither strategy finds anything → **NOT_IN_BOOKS**.

**Source:** `lib/reconciliation/matcher.ts`

---

## Step 3 — Classify

Once a Tally candidate is found (or not), the classifier applies 6 rules **in strict order**. The first rule that fires determines the outcome.

| Priority | Rule | Outcome | ITC at Risk |
|---|---|---|---|
| 0 | Invoice appears more than once in IMS (duplicate) | AUTO_REJECTED | Full IGST+CGST+SGST |
| 1 | No Tally match found (Strategy A or B both failed) | NOT_IN_BOOKS | Full IGST+CGST+SGST |
| 2 | Tally GSTIN ≠ IMS GSTIN (after normalisation) | AUTO_REJECTED | Full IGST+CGST+SGST |
| 3 | Value delta > 10% | AUTO_REJECTED | Full IGST+CGST+SGST |
| 4 | Value delta 2–10% | PENDING_REVIEW | Full IGST+CGST+SGST |
| 5 | Strategy B match (invoice# different, value ≤2%) | PENDING_REVIEW | Full IGST+CGST+SGST |
| 6 | Format-only variation (same normalised invoice#, different raw strings) | AUTO_ACCEPTED | Zero |
| 7 | Date gap > 7 days | PENDING_REVIEW | Full IGST+CGST+SGST |
| 8 | Clean match — all checks pass | AUTO_ACCEPTED | Zero |

**ITC at risk definition:** For non-AUTO_ACCEPTED invoices, ITC at risk = IGST + CGST + SGST of that invoice. For AUTO_ACCEPTED invoices, ITC at risk = 0.

**Source:** `lib/reconciliation/rules.ts`

---

## Worked Example (Golden Test Set)

The golden test set lives in `data/fixtures/` and covers 51 IMS invoice entries (50 unique GSTIN+invoice# pairs + 1 deliberate duplicate) for GSTIN `27AABCU9603R1ZX`, period February 2026. The duplicate pair collapses to one result row, giving 50 result rows total. Expected totals:

| Outcome | Count | Scenarios |
|---|---|---|
| AUTO_ACCEPTED | 43 | 42 EXACT_MATCH + 1 FORMAT_VARIATION |
| AUTO_REJECTED | 3 | 1 WRONG_GSTIN + 1 VALUE_OVER_10 + 1 DUPLICATE |
| PENDING_REVIEW | 3 | 1 VALUE_MISMATCH_2_10 + 1 INVOICE_NUMBER_MISMATCH + 1 DATE_GAP |
| NOT_IN_BOOKS | 1 | — |
| **Total** | **50 rows** | — |

### Example: FORMAT_VARIATION scenario
- IMS invoice number: `INV/2026/001`
- Tally voucher number: `INV2026001`
- Normalised: both become `inv2026001` → Strategy A match
- GSTIN check: passes
- Value delta: 0%
- Format-only difference detected → **AUTO_ACCEPTED**, ITC at risk = ₹0

### Example: WRONG_GSTIN scenario
- IMS: supplier GSTIN `27AABCU9603R1ZX`
- Tally: same invoice# but GSTIN `27AABCU9603R1ZY` (last char differs)
- After normalisation: GSTINs differ → **AUTO_REJECTED**, ITC at risk = full tax amount

### Example: NOT_IN_BOOKS scenario
- IMS: invoice exists
- Tally: no entry with this invoice# or matching GSTIN+value
- Strategy A: no match; Strategy B: no match → **NOT_IN_BOOKS**

---

## Re-Upload Behaviour

| File type | Re-upload behaviour |
|---|---|
| IMS JSON | **Additive / upsert-by-key** — existing `ImsInvoice` rows are matched to the new upload by `GSTIN::invoice#`. Matched rows are **updated in-place** (same DB row ID), so the linked `ReconciliationResult` FK stays alive and `is_done` / `done_at` are preserved. Invoices absent from the new file are deleted along with their reconciliation results. Genuinely new invoices are inserted. |
| Tally CSV/Excel | **Replace-all** — existing Tally entries for this session are deleted and replaced entirely. |

**Why different behaviours?** Tally is the CA's own books — a re-export always represents the full current state. The IMS file comes from GSTN and may be uploaded incrementally or corrected; the CA may have already actioned some invoices (`is_done = true`), and those actions must survive the re-upload.

---

## Data Model

```
UploadSession
  ├── ImsInvoice (one per IMS row)
  │     └── ReconciliationResult (one per ImsInvoice)
  │           ├── outcome: AUTO_ACCEPTED | AUTO_REJECTED | PENDING_REVIEW | NOT_IN_BOOKS
  │           ├── reason_code: string (e.g. "GSTIN_MISMATCH")
  │           ├── reason_text: human-readable explanation
  │           ├── itc_at_risk: Decimal string
  │           ├── is_done: boolean (CA marked as actioned)
  │           └── tally_entry_id: FK to matched TallyEntry (nullable)
  └── TallyEntry (one per Tally row)
```

---

## What Is Not Built Yet

- AI/LLM fuzzy matching for invoice numbers that differ beyond format variation (Phase 2)
- GSTR-2B reconciliation (post-14th, Phase 2)
- 3-way match: IMS + Tally + PO/GRN (Phase 3)
- Direct GSTN API pull — currently manual file upload (Phase 3)

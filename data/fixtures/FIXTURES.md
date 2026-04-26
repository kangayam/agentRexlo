# Golden Test Fixtures — Reconciliation Engine

**This is the ground-truth test set for the reconciliation engine.** Every unit test and integration test in `tests/reconciliation.test.ts` must use these files and assert that the engine produces output matching `27AABCU9603R1ZX-recon-expected-2026-02.csv` exactly.

If you change the reconciliation logic, you change the expected output file. They move together.

---

## The Files

| File | Purpose | Format |
|---|---|---|
| `27AABCU9603R1ZX-ims-2026-02.json` | Uploaded IMS data from GSTN for period Feb 2026, GSTIN `27AABCU9603R1ZX` | GSTN GSTR-2B-compatible JSON (`docdata.b2b[]`) |
| `27AABCU9603R1ZX-tally-2026-02.csv` | Uploaded Tally purchase register for same period | Flat CSV, DD/MM/YYYY dates, standard Tally headers |
| `27AABCU9603R1ZX-recon-expected-2026-02.csv` | **Ground truth** — what the engine must output | One row per IMS invoice with scenario label, expected `Recon_Output`, and `Error_Reason` |

---

## Scenario Catalogue

The expected file uses nine distinct `Scenario` labels. The engine must produce the matching `Recon_Output` for each one.

| # | Scenario | Result rows | Expected Output | Trigger |
|---|---|---|---|---|
| 1 | `EXACT_MATCH` | 42 | `AUTO_ACCEPTED` | GSTIN + normalised invoice# + value (±2%) + date all match |
| 2 | `WRONG_GSTIN` | 1 | `AUTO_REJECTED` | Invoice# matches Tally but GSTINs differ (likely wrong-state registration) |
| 3 | `NOT_IN_BOOKS` | 1 | `NOT_IN_BOOKS` | IMS invoice with no matching Tally entry |
| 4 | `VALUE_OVER_10` | 1 | `AUTO_REJECTED` | Value difference between IMS and Tally > 10% |
| 5 | `VALUE_MISMATCH_2_10` | 1 | `PENDING_REVIEW` | Value difference 2–10% (freight / packing suspected) |
| 6 | `FORMAT_VARIATION` | 1 | `AUTO_ACCEPTED` | `INV/26/021` vs `INV-26-021` — normalises to same key |
| 7 | `INVOICE_NUMBER_MISMATCH` | 1 | `PENDING_REVIEW` | Different invoice numbers, but same GSTIN + value (soft match) |
| 8 | `DATE_GAP` | 1 | `PENDING_REVIEW` | Invoice date differs by > 7 days between IMS and Tally |
| 9 | `DUPLICATE` | 1 | `AUTO_REJECTED` | Same invoice# uploaded twice in IMS — collapsed into one rejected row |
| | **Total** | **50 result rows** | | |

*Note: the IMS file contains 51 invoice entries (50 unique GSTIN+invoice# pairs + 1 duplicate of an existing entry). The duplicate group is collapsed into a single `AUTO_REJECTED` result row, so the engine emits 50 reconciliation rows total.*

---

## Worked Examples (One Per Scenario)

### Scenario 1 — `EXACT_MATCH` → `AUTO_ACCEPTED`

```
IMS:     GSTIN=27ERMJD3988G1ZJ  Inv=BILL26001  Date=02-02-2026  Val=484064
Tally:   GSTIN=27ERMJD3988G1ZJ  Inv=BILL26001  Date=02/02/2026  Val=484064
→ AUTO_ACCEPTED (no reason needed)
```

### Scenario 2 — `WRONG_GSTIN` → `AUTO_REJECTED`

```
IMS:     GSTIN=19HYHPA1337A1ZR  Inv=INV/26/002  Val=27300
Tally:   GSTIN=21HYHPA1337A1ZR  Inv=INV/26/002  Val=27300
→ AUTO_REJECTED — "Supplier GSTIN mismatch — IMS: 19... / Tally: 21..."
```

The match is made on invoice number + value + vendor similarity, then GSTIN comparison flags it for rejection. **This is a critical case — see §10.1 of SPEC.md.**

### Scenario 3 — `NOT_IN_BOOKS` → `NOT_IN_BOOKS`

```
IMS:     GSTIN=34CDDJT0968K1Z1  Inv=INV-26-005  Val=313344
Tally:   (no match)
→ NOT_IN_BOOKS
```

### Scenario 4 — `VALUE_OVER_10` → `AUTO_REJECTED`

```
IMS:     Inv=PKG-008-26  Val=67072
Tally:   Inv=PKG-008-26  Val=77840
Delta = (77840 - 67072) / 67072 = +16.1% → exceeds 10% threshold
→ AUTO_REJECTED — "Value delta: Tally ₹77840 vs IMS ₹67072 (+16.1% — exceeds 10% threshold)"
```

### Scenario 5 — `VALUE_MISMATCH_2_10` → `PENDING_REVIEW`

```
IMS:     Inv=INV-26-028  Val=434910
Tally:   Inv=INV-26-028  Val=477629
Delta = (477629 - 434910) / 434910 = +9.8% → within 2–10% band
→ PENDING_REVIEW — "Value delta: Tally ₹477629 vs IMS ₹434910 (+9.8% — within 2–10% band)"
```

### Scenario 6 — `FORMAT_VARIATION` → `AUTO_ACCEPTED`

```
IMS:     Inv=INV/26/021
Tally:   Inv=INV-26-021
normalise("INV/26/021")  = "inv2621"
normalise("INV-26-021")  = "inv2621"   → same key
→ AUTO_ACCEPTED (format-only diff; normalises to same key)
```

### Scenario 7 — `INVOICE_NUMBER_MISMATCH` → `PENDING_REVIEW`

```
IMS:     Inv=INV/26/044       GSTIN=27RMHPW0036R1Z5  Val=117504
Tally:   Inv=MISC-05044-26    GSTIN=27RMHPW0036R1Z5  Val=117504
Normalised keys differ, but GSTIN + value + tax all match
→ PENDING_REVIEW — "Invoice# mismatch — IMS: 'INV/26/044' / Tally: 'MISC-05044-26'"
```

### Scenario 8 — `DATE_GAP` → `PENDING_REVIEW`

```
IMS:     Inv=PKG-038-26  Date=15-02-2026
Tally:   Inv=PKG-038-26  Date=25/02/2026
Gap = 10 days → exceeds 7-day threshold
→ PENDING_REVIEW — "Date gap: 10 days — IMS: 15-02-2026 / Tally: 25/02/2026"
```

### Scenario 9 — `DUPLICATE` → `AUTO_REJECTED`

```
IMS:     INV-26-034 appears twice in the same upload (same supplier, same value)
Tally:   INV-26-034 appears once
→ ONE collapsed AUTO_REJECTED row —
  "Duplicate IMS entry — same invoice uploaded twice by supplier (2 IMS entries for 1 Tally row)"
```

The engine intentionally collapses a duplicate group into a single result row rather than emitting one row per duplicate copy. The CA / client has one decision to make ("which copy is real?"), so the dashboard surfaces one action item.

---

## Format-Specific Notes

### IMS JSON structure

Top-level: `{ gstin, ret_period, docdata: { b2b: [ ... ] } }`

Each `b2b[]` entry represents one supplier:

```json
{
  "ctin": "27ERMJD3988G1ZJ",
  "inv": [
    {
      "inum": "BILL26001",
      "idt": "02-02-2026",          // DD-MM-YYYY with HYPHENS
      "val": 484064,
      "pos": "27",
      "itc_avl": "Y",
      "itms": [
        {
          "num": 1,
          "itm_det": {
            "rt": 12,                // GST rate
            "txval": 432200,         // Taxable value
            "iamt": 0,               // IGST
            "camt": 25932,           // CGST
            "samt": 25932,           // SGST
            "csamt": 0               // Cess
          }
        }
      ]
    }
  ]
}
```

Parser must **sum item-level tax amounts** across all `itms[]` entries for multi-line invoices. The `val` field is the total incl. GST.

### Tally CSV structure

Fixed headers: `Supplier GSTIN,Supplier Name,Invoice Number,Invoice Date,Taxable Value,IGST Amount,CGST Amount,SGST Amount,Cess Amount,Total Amount,HSN Code`

Dates are `DD/MM/YYYY` with **slashes** (not hyphens like IMS). The parser must accept both formats.

### Date format mismatch

- IMS: `02-02-2026` (hyphens)
- Tally: `02/02/2026` (slashes)

These refer to the same day. Normalisation must convert both to ISO 8601 (`2026-02-02`) before comparison. The `DATE_GAP` scenario requires comparing the underlying date, not the string.

---

## Aggregate Numbers (Sanity Check)

The engine's dashboard summary for this fixture should produce:

| Metric | Expected |
|---|---|
| Total IMS entries | 51 (50 unique GSTIN+invoice# pairs + 1 duplicate copy) |
| Total result rows | 50 (the duplicate group collapses to one row) |
| AUTO_ACCEPTED | 43 (42 EXACT_MATCH + 1 FORMAT_VARIATION) |
| AUTO_REJECTED | 3 (1 wrong GSTIN + 1 value over 10% + 1 collapsed duplicate) |
| PENDING_REVIEW | 3 (1 value 2–10% + 1 invoice# mismatch + 1 date gap) |
| NOT_IN_BOOKS | 1 |
| Tally rows unmatched | 0 (every Tally entry finds its IMS match) |

If your engine produces different counts, it's wrong.

---

## How Tests Should Use This

In `tests/reconciliation.test.ts`:

```typescript
import { parseImsJson } from '@/lib/parsers/ims-json-parser';
import { parseTallyCsv } from '@/lib/parsers/tally-csv-parser';
import { reconcile } from '@/lib/reconciliation';
import fs from 'fs';
import path from 'path';

const FIXTURES = 'data/fixtures';

test('golden fixture: Feb 2026 reconciliation produces expected results', () => {
  const ims = parseImsJson(fs.readFileSync(path.join(FIXTURES, '27AABCU9603R1ZX-ims-2026-02.json'), 'utf-8'));
  const tally = parseTallyCsv(fs.readFileSync(path.join(FIXTURES, '27AABCU9603R1ZX-tally-2026-02.csv'), 'utf-8'));
  const expected = loadExpectedRecon(path.join(FIXTURES, '27AABCU9603R1ZX-recon-expected-2026-02.csv'));

  const results = reconcile(ims, tally);

  expect(results.length).toBe(expected.length);
  for (const row of expected) {
    const actual = results.find(r => r.imsInvoiceId === row.IMS_Invoice_ID && r.imsGstin === row.IMS_Supplier_GSTIN);
    expect(actual?.result).toBe(row.Recon_Output);
  }
});
```

Then add per-scenario unit tests so failures localise quickly:

```typescript
test('WRONG_GSTIN — matches on invoice# then rejects on GSTIN differ', () => { ... });
test('VALUE_OVER_10 — rejects when delta exceeds 10%', () => { ... });
test('FORMAT_VARIATION — normalises INV/26/021 and INV-26-021 to same key', () => { ... });
// ... one per scenario
```

---

## When you add a new scenario

1. Add a synthetic IMS invoice + matching (or intentionally mismatching) Tally row.
2. Add the expected row to `27AABCU9603R1ZX-recon-expected-2026-02.csv` with a fresh `Scenario` label.
3. Update the Scenario Catalogue table above.
4. Add a per-scenario test in `tests/reconciliation.test.ts`.
5. Run tests; engine must produce the new expected output.

---

*This fixture set is the single source of truth for reconciliation engine correctness. Keep it pristine.*

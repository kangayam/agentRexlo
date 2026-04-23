# File Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the full upload pipeline — Tally column detection, file upload API, reconciliation trigger, and the upload UI — so a CA or client can drop IMS JSON + Tally files and immediately see reconciliation results.

**Architecture:** Two API routes (`POST /api/upload` and `POST /api/reconciliation`) called sequentially; `GET /api/upload` returns current session state. Parsers run server-side; column auto-detection runs client-side so the mapping modal can appear before the file is submitted. Reconciliation is triggered automatically when both files are present for a GSTIN + period.

**Tech Stack:** Next.js 14 App Router, Prisma, Supabase Storage, `xlsx`, `papaparse`, `decimal.js`, shadcn/ui, Tailwind CSS, Vitest

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/parsers/tally-excel-parser.ts` | Modify | Implement `detectColumnMap` + `parseTallyFile`; return `NormalizedTallyRow[]` |
| `lib/parsers/tally-csv-parser.ts` | Modify | Accept optional `TallyColumnMap` parameter |
| `lib/parsers/tally-column-detect.ts` | Create | Browser-safe `extractTallyFileInfo(file)` for the mapping modal |
| `lib/reconciliation/run.ts` | Create | `runReconciliation(sessionId)` — DB read → engine → DB write |
| `lib/storage/supabase-storage.ts` | Create | Implement `uploadFile` + `getFileUrl` using Supabase Storage |
| `lib/storage/index.ts` | Modify | Re-export from `supabase-storage.ts` |
| `app/api/upload/route.ts` | Modify | Full `POST` + new `GET` handler |
| `app/api/reconciliation/route.ts` | Modify | Full `POST` handler calling `runReconciliation` |
| `components/upload/PeriodPicker.tsx` | Create | Month-picker dropdown (client component) |
| `components/upload/FileDropZone.tsx` | Create | Drag-and-drop zone with upload states (client component) |
| `components/upload/ColumnMappingModal.tsx` | Create | Tally column mapping modal (client component) |
| `components/upload/GstinUploadCard.tsx` | Create | Per-GSTIN upload card (client component) |
| `app/client/upload/page.tsx` | Modify | Server component — fetches GSTINs + session state, renders cards |
| `tests/tally-column-detect.test.ts` | Create | Tests for `detectColumnMap` |
| `tests/run-reconciliation.test.ts` | Create | Tests for `runReconciliation` helpers |

---

## Task 1: Update `parseTallyCsv` to accept a column map

The current implementation hardcodes column names that match the golden fixture. It needs to accept a `TallyColumnMap` so the column mapping UI can override them.

**Files:**
- Modify: `lib/parsers/tally-csv-parser.ts`
- Modify: `tests/parsers.test.ts`

- [ ] **Step 1: Add a failing test for custom column mapping**

Open `tests/parsers.test.ts` and add after the existing `parseTallyCsv` describe block:

```typescript
describe('parseTallyCsv with custom column map', () => {
  const CUSTOM_CSV = `Party GSTIN,Ledger Name,Bill Reference,Voucher Date,Taxable Amt,IGST Amt,Central Tax,State Tax,Total Amt
27ERMJD3988G1ZJ,National Chemicals Ltd,BILL26001,02/02/2026,432200,0,25932,25932,484064
`
  const CUSTOM_MAP: import('@/lib/parsers/tally-excel-parser').TallyColumnMap = {
    supplierGstin:  'Party GSTIN',
    supplierName:   'Ledger Name',
    voucherNumber:  'Bill Reference',
    voucherDate:    'Voucher Date',
    totalAmount:    'Total Amt',
    taxableValue:   'Taxable Amt',
    igst:           'IGST Amt',
    cgst:           'Central Tax',
    sgst:           'State Tax',
    hsnCode:        '',
  }

  test('parses CSV using a custom column map', () => {
    const rows = parseTallyCsv(CUSTOM_CSV, CUSTOM_MAP)
    expect(rows).toHaveLength(1)
    expect(rows[0].supplierGstin).toBe('27ERMJD3988G1ZJ')
    expect(rows[0].invoiceNum).toBe('BILL26001')
    expect(rows[0].cgst.toNumber()).toBe(25932)
  })

  test('falls back to default column names when no map provided', () => {
    const STANDARD_CSV = `Supplier GSTIN,Supplier Name,Invoice Number,Invoice Date,Taxable Value,IGST Amount,CGST Amount,SGST Amount,Cess Amount,Total Amount,HSN Code
27ERMJD3988G1ZJ,Nat Chem,BILL26001,02/02/2026,432200,0,25932,25932,0,484064,3904
`
    const rows = parseTallyCsv(STANDARD_CSV)
    expect(rows[0].supplierGstin).toBe('27ERMJD3988G1ZJ')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /Users/bhaskar/Documents/github/agentflow-core && npx vitest run tests/parsers.test.ts 2>&1 | tail -20
```

Expected: FAIL — `parseTallyCsv` doesn't accept a second argument yet.

- [ ] **Step 3: Update `parseTallyCsv` to accept optional column map**

Replace the entire contents of `lib/parsers/tally-csv-parser.ts`.

Note: `NormalizedTallyRow` is now defined in `tally-excel-parser.ts` to avoid a circular dependency (`tally-excel-parser.ts` needs to return this type). We re-export it here so existing imports in `lib/reconciliation/rules.ts` don't need to change.

```typescript
import Decimal from 'decimal.js'
import Papa from 'papaparse'
import { normalizeDate } from '@/lib/reconciliation/normalize'
import { TallyColumnMap, DEFAULT_TALLY_COLUMN_MAP, NormalizedTallyRow } from '@/lib/parsers/tally-excel-parser'

// Re-export so reconciliation engine imports remain unchanged
export type { NormalizedTallyRow } from '@/lib/parsers/tally-excel-parser'

export function parseTallyCsv(csv: string, columnMap?: TallyColumnMap): NormalizedTallyRow[] {
  const map = columnMap ?? DEFAULT_TALLY_COLUMN_MAP
  const { data } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  })

  return data.map(row => ({
    supplierGstin:  (row[map.supplierGstin]  ?? '').trim(),
    supplierName:   (row[map.supplierName]   ?? '').trim(),
    invoiceNum:     (row[map.voucherNumber]  ?? '').trim(),
    invoiceDate:    normalizeDate((row[map.voucherDate] ?? '').trim()),
    taxableValue:   new Decimal(row[map.taxableValue]  || '0'),
    igst:           new Decimal(row[map.igst]          || '0'),
    cgst:           new Decimal(row[map.cgst]          || '0'),
    sgst:           new Decimal(row[map.sgst]          || '0'),
    totalAmount:    new Decimal(row[map.totalAmount]   || '0'),
  }))
}
```

- [ ] **Step 4: Run all parser tests**

```bash
cd /Users/bhaskar/Documents/github/agentflow-core && npx vitest run tests/parsers.test.ts 2>&1 | tail -20
```

Expected: all tests PASS.

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
cd /Users/bhaskar/Documents/github/agentflow-core && npx vitest run 2>&1 | tail -20
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/parsers/tally-csv-parser.ts tests/parsers.test.ts
git commit -m "feat: parseTallyCsv accepts optional TallyColumnMap"
```

---

## Task 2: Implement `detectColumnMap` and `parseTallyFile`

The Excel parser stubs need real implementations. `detectColumnMap` does fuzzy alias matching on column headers. `parseTallyFile` parses CSV or Excel content using a column map and returns `NormalizedTallyRow[]`.

**Files:**
- Modify: `lib/parsers/tally-excel-parser.ts`
- Create: `tests/tally-column-detect.test.ts`

- [ ] **Step 1: Write failing tests for `detectColumnMap`**

Create `tests/tally-column-detect.test.ts`:

```typescript
import { describe, test, expect } from 'vitest'
import { detectColumnMap, DEFAULT_TALLY_COLUMN_MAP } from '@/lib/parsers/tally-excel-parser'

describe('detectColumnMap', () => {
  test('detects exact alias matches', () => {
    const headers = ['Party GSTIN', 'Ledger Name', 'Voucher No', 'Voucher Date',
                     'Taxable Amount', 'IGST Amt', 'CGST Amt', 'SGST Amt', 'Total Amount']
    const map = detectColumnMap(headers)
    expect(map).not.toBeNull()
    expect(map!.supplierGstin).toBe('Party GSTIN')
    expect(map!.supplierName).toBe('Ledger Name')
    expect(map!.voucherNumber).toBe('Voucher No')
    expect(map!.taxableValue).toBe('Taxable Amount')
  })

  test('returns null when required fields cannot be mapped', () => {
    const headers = ['Random Col 1', 'Random Col 2', 'Something Else']
    const map = detectColumnMap(headers)
    expect(map).toBeNull()
  })

  test('matches case-insensitively', () => {
    const headers = ['party gstin', 'LEDGER NAME', 'VOUCHER NO', 'voucher date',
                     'taxable value', 'igst amount', 'cgst amount', 'sgst amount', 'total amount']
    const map = detectColumnMap(headers)
    expect(map).not.toBeNull()
    expect(map!.supplierGstin).toBe('party gstin')
  })

  test('uses default map when standard fixture headers are present', () => {
    const headers = ['Supplier GSTIN', 'Supplier Name', 'Invoice Number', 'Invoice Date',
                     'Taxable Value', 'IGST Amount', 'CGST Amount', 'SGST Amount', 'Total Amount']
    const map = detectColumnMap(headers)
    expect(map).not.toBeNull()
    expect(map!.supplierGstin).toBe('Supplier GSTIN')
  })

  test('maps optional hsnCode to empty string when not found', () => {
    const headers = ['Party GSTIN', 'Ledger Name', 'Voucher No', 'Voucher Date',
                     'Taxable Amount', 'IGST Amt', 'CGST Amt', 'SGST Amt', 'Total Amount']
    const map = detectColumnMap(headers)
    expect(map!.hsnCode).toBe('')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /Users/bhaskar/Documents/github/agentflow-core && npx vitest run tests/tally-column-detect.test.ts 2>&1 | tail -20
```

Expected: FAIL — `detectColumnMap` throws "not yet implemented".

- [ ] **Step 3: Implement `detectColumnMap` and `parseTallyFile`**

Replace the entire contents of `lib/parsers/tally-excel-parser.ts`:

```typescript
import Decimal from 'decimal.js'
import * as XLSX from 'xlsx'
import { normalizeDate } from '@/lib/reconciliation/normalize'

// NormalizedTallyRow lives here (not in tally-csv-parser) to avoid a circular import.
// tally-csv-parser imports TallyColumnMap from this file, so it cannot also be imported here.
export interface NormalizedTallyRow {
  supplierGstin: string
  supplierName:  string
  invoiceNum:    string
  invoiceDate:   string   // ISO 8601
  taxableValue:  Decimal
  igst:          Decimal
  cgst:          Decimal
  sgst:          Decimal
  totalAmount:   Decimal
}

export interface TallyColumnMap {
  supplierName:  string
  supplierGstin: string
  voucherNumber: string
  voucherDate:   string
  totalAmount:   string
  taxableValue:  string
  igst:          string
  cgst:          string
  sgst:          string
  hsnCode:       string
}

export const DEFAULT_TALLY_COLUMN_MAP: TallyColumnMap = {
  supplierName:  'Supplier Name',
  supplierGstin: 'Supplier GSTIN',
  voucherNumber: 'Invoice Number',
  voucherDate:   'Invoice Date',
  totalAmount:   'Total Amount',
  taxableValue:  'Taxable Value',
  igst:          'IGST Amount',
  cgst:          'CGST Amount',
  sgst:          'SGST Amount',
  hsnCode:       'HSN Code',
}

// Aliases for each required field (case-insensitive matching)
const ALIASES: Record<keyof TallyColumnMap, string[]> = {
  supplierGstin: ['supplier gstin', 'party gstin', 'gstin', 'vendor gstin', 'tax registration no'],
  supplierName:  ['supplier name', 'ledger name', 'party name', 'vendor name'],
  voucherNumber: ['invoice number', 'voucher no', 'voucher number', 'bill no', 'ref no', 'bill reference', 'invoice no'],
  voucherDate:   ['invoice date', 'voucher date', 'bill date', 'date', 'posting date'],
  taxableValue:  ['taxable value', 'taxable amount', 'taxable amt', 'basic amount'],
  igst:          ['igst amount', 'igst amt', 'integrated tax', 'igst'],
  cgst:          ['cgst amount', 'cgst amt', 'central tax', 'cgst'],
  sgst:          ['sgst amount', 'sgst amt', 'state tax', 'sgst'],
  totalAmount:   ['total amount', 'total amt', 'invoice value', 'total'],
  hsnCode:       ['hsn code', 'hsn', 'hsn/sac'],
}

const REQUIRED_FIELDS: Array<keyof TallyColumnMap> = [
  'supplierGstin', 'supplierName', 'voucherNumber', 'voucherDate',
  'taxableValue', 'igst', 'cgst', 'sgst', 'totalAmount',
]

export function detectColumnMap(headers: string[]): TallyColumnMap | null {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim())
  const result = {} as TallyColumnMap

  for (const field of Object.keys(ALIASES) as Array<keyof TallyColumnMap>) {
    const aliases = ALIASES[field]
    const matchedIdx = lowerHeaders.findIndex(h => aliases.includes(h))
    result[field] = matchedIdx >= 0 ? headers[matchedIdx] : ''
  }

  const allRequiredMatched = REQUIRED_FIELDS.every(f => result[f] !== '')
  return allRequiredMatched ? result : null
}

export function parseTallyFile(content: string, columnMap?: TallyColumnMap): NormalizedTallyRow[] {
  const map = columnMap ?? DEFAULT_TALLY_COLUMN_MAP

  // Try to parse as CSV first (faster), fall back to xlsx for Excel files
  let rows: Record<string, string>[]
  try {
    const wb = XLSX.read(content, { type: 'string' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
  } catch {
    // Already a plain CSV — parse line by line
    const lines = content.split('\n').filter(Boolean)
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    rows = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
    })
  }

  return rows
    .filter(row => row[map.supplierGstin]?.trim())
    .map(row => ({
      supplierGstin: (row[map.supplierGstin] ?? '').trim(),
      supplierName:  (row[map.supplierName]  ?? '').trim(),
      invoiceNum:    (row[map.voucherNumber] ?? '').trim(),
      invoiceDate:   normalizeDate((row[map.voucherDate] ?? '').trim()),
      taxableValue:  new Decimal(row[map.taxableValue]  || '0'),
      igst:          new Decimal(row[map.igst]          || '0'),
      cgst:          new Decimal(row[map.cgst]          || '0'),
      sgst:          new Decimal(row[map.sgst]          || '0'),
      totalAmount:   new Decimal(row[map.totalAmount]   || '0'),
    }))
}
```

- [ ] **Step 4: Run all tests**

```bash
cd /Users/bhaskar/Documents/github/agentflow-core && npx vitest run 2>&1 | tail -20
```

Expected: all tests PASS including the new `tally-column-detect.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add lib/parsers/tally-excel-parser.ts tests/tally-column-detect.test.ts
git commit -m "feat: implement detectColumnMap and parseTallyFile"
```

---

## Task 3: Create browser-safe column detection helper

The `ColumnMappingModal` runs in the browser and needs to extract headers + sample values from the dropped file before submitting it. This thin helper wraps `papaparse` and `xlsx` (both work in the browser).

**Files:**
- Create: `lib/parsers/tally-column-detect.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/parsers/tally-column-detect.ts
// Browser-safe: no Node-only imports. Used by ColumnMappingModal.
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { detectColumnMap } from '@/lib/parsers/tally-excel-parser'
import type { TallyColumnMap } from '@/lib/parsers/tally-excel-parser'

export interface TallyFileInfo {
  headers: string[]
  samples: Record<string, string[]>   // header → first 3 non-empty values
  detectedMap: TallyColumnMap | null  // null = auto-detect failed, show modal
}

export async function extractTallyFileInfo(file: File): Promise<TallyFileInfo> {
  const isCsv = file.name.endsWith('.csv')
  let headers: string[] = []
  let allRows: Record<string, string>[] = []

  if (isCsv) {
    const text = await file.text()
    const { data } = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
    })
    headers = Object.keys(data[0] ?? {})
    allRows = data
  } else {
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array', sheetRows: 6 })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
    headers = Object.keys(data[0] ?? {})
    allRows = data
  }

  const samples: Record<string, string[]> = {}
  for (const h of headers) {
    samples[h] = allRows
      .map(r => String(r[h] ?? '').trim())
      .filter(Boolean)
      .slice(0, 3)
  }

  return { headers, samples, detectedMap: detectColumnMap(headers) }
}
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

```bash
cd /Users/bhaskar/Documents/github/agentflow-core && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/parsers/tally-column-detect.ts
git commit -m "feat: browser-safe tally column detection helper"
```

---

## Task 4: Implement `runReconciliation`

This function reads IMS + Tally rows from the DB for a session, runs the reconciliation engine, and upserts `ReconciliationResult` rows. It is the glue between the upload API and the engine.

**Files:**
- Create: `lib/reconciliation/run.ts`
- Create: `tests/run-reconciliation.test.ts`

- [ ] **Step 1: Write tests for the `matchOutcomeToMatchLevel` helper**

Create `tests/run-reconciliation.test.ts`:

```typescript
import { describe, test, expect } from 'vitest'
import { matchOutcomeToMatchLevel } from '@/lib/reconciliation/run'

describe('matchOutcomeToMatchLevel', () => {
  test('AUTO_ACCEPTED → EXACT', () => {
    expect(matchOutcomeToMatchLevel('AUTO_ACCEPTED')).toBe('EXACT')
  })
  test('NOT_IN_BOOKS → NO_MATCH', () => {
    expect(matchOutcomeToMatchLevel('NOT_IN_BOOKS')).toBe('NO_MATCH')
  })
  test('PENDING_REVIEW → VALUE_TOLERANCE', () => {
    expect(matchOutcomeToMatchLevel('PENDING_REVIEW')).toBe('VALUE_TOLERANCE')
  })
  test('AUTO_REJECTED → SOFT_INVOICE', () => {
    expect(matchOutcomeToMatchLevel('AUTO_REJECTED')).toBe('SOFT_INVOICE')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /Users/bhaskar/Documents/github/agentflow-core && npx vitest run tests/run-reconciliation.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `lib/reconciliation/run.ts`**

```typescript
import Decimal from 'decimal.js'
import { prisma } from '@/lib/db/prisma'
import { reconcile } from '@/lib/reconciliation/index'
import { normalizeInvoiceNumber, normalizeGstin } from '@/lib/reconciliation/normalize'
import type { NormalizedImsInvoice } from '@/lib/parsers/ims-json-parser'
import type { NormalizedTallyRow } from '@/lib/parsers/tally-csv-parser'
import type { MatchLevel, ReconciliationOutcome } from '@prisma/client'

export function matchOutcomeToMatchLevel(outcome: string): MatchLevel {
  switch (outcome) {
    case 'AUTO_ACCEPTED': return 'EXACT'
    case 'NOT_IN_BOOKS':  return 'NO_MATCH'
    case 'PENDING_REVIEW': return 'VALUE_TOLERANCE'
    default:              return 'SOFT_INVOICE'
  }
}

export async function runReconciliation(sessionId: string): Promise<Record<ReconciliationOutcome, number>> {
  const imsRows    = await prisma.imsInvoice.findMany({ where: { upload_session_id: sessionId } })
  const tallyRows  = await prisma.tallyEntry.findMany({ where: { upload_session_id: sessionId } })

  const imsInvoices: NormalizedImsInvoice[] = imsRows.map(r => ({
    supplierGstin: r.supplier_gstin,
    invoiceNum:    r.invoice_number,
    invoiceDate:   r.invoice_date.toISOString().split('T')[0],
    totalValue:    new Decimal(r.invoice_value),
    igst:          new Decimal(r.igst),
    cgst:          new Decimal(r.cgst),
    sgst:          new Decimal(r.sgst),
    pos:           r.place_of_supply ?? '',
  }))

  const tallyNorm: NormalizedTallyRow[] = tallyRows.map(r => ({
    supplierGstin: r.supplier_gstin,
    supplierName:  r.supplier_name,
    invoiceNum:    r.voucher_number,
    invoiceDate:   r.voucher_date.toISOString().split('T')[0],
    taxableValue:  new Decimal(r.taxable_value),
    igst:          new Decimal(r.igst),
    cgst:          new Decimal(r.cgst),
    sgst:          new Decimal(r.sgst),
    totalAmount:   new Decimal(r.total_amount),
  }))

  // Build lookup: normalised GSTIN::invoiceNum → DB UUID
  const imsUuidByKey = new Map<string, string>()
  for (const r of imsRows) {
    const key = `${normalizeGstin(r.supplier_gstin)}::${normalizeInvoiceNumber(r.invoice_number)}`
    imsUuidByKey.set(key, r.id)
  }

  // Build lookup: normalised invoiceNum → TallyEntry UUID
  const tallyUuidByInvoice = new Map<string, string>()
  for (const r of tallyRows) {
    tallyUuidByInvoice.set(normalizeInvoiceNumber(r.voucher_number), r.id)
  }

  const results = reconcile(imsInvoices, tallyNorm)

  const counts: Record<ReconciliationOutcome, number> = {
    AUTO_ACCEPTED:  0,
    AUTO_REJECTED:  0,
    PENDING_REVIEW: 0,
    NOT_IN_BOOKS:   0,
  }

  await prisma.$transaction(
    results.map(r => {
      counts[r.result]++
      const imsUuid = imsUuidByKey.get(
        `${normalizeGstin(r.imsGstin)}::${normalizeInvoiceNumber(r.imsInvoiceNum)}`
      )!
      const tallyUuid = r.matchedTallyInvoiceNum
        ? (tallyUuidByInvoice.get(normalizeInvoiceNumber(r.matchedTallyInvoiceNum)) ?? null)
        : null

      return prisma.reconciliationResult.upsert({
        where:  { ims_invoice_id: imsUuid },
        create: {
          ims_invoice_id: imsUuid,
          tally_entry_id: tallyUuid,
          match_level:    matchOutcomeToMatchLevel(r.result),
          outcome:        r.result as ReconciliationOutcome,
          reason_code:    r.result,
          reason_text:    r.reason ?? '',
          itc_at_risk:    r.itcAtRisk.toFixed(2),
        },
        update: {
          tally_entry_id: tallyUuid,
          match_level:    matchOutcomeToMatchLevel(r.result),
          outcome:        r.result as ReconciliationOutcome,
          reason_code:    r.result,
          reason_text:    r.reason ?? '',
          itc_at_risk:    r.itcAtRisk.toFixed(2),
          // is_done / done_at / done_by_id deliberately NOT updated — preserve completed actions
        },
      })
    })
  )

  await prisma.uploadSession.update({
    where: { id: sessionId },
    data:  { status: 'DONE' },
  })

  return counts
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/bhaskar/Documents/github/agentflow-core && npx vitest run tests/run-reconciliation.test.ts 2>&1 | tail -10
```

Expected: all PASS.

- [ ] **Step 5: Run full suite**

```bash
cd /Users/bhaskar/Documents/github/agentflow-core && npx vitest run 2>&1 | tail -10
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/reconciliation/run.ts tests/run-reconciliation.test.ts
git commit -m "feat: runReconciliation — DB orchestrator for recon engine"
```

---

## Task 5: Implement Supabase Storage

The upload API saves files to Supabase Storage for history. Storage failure is non-blocking — it must not cause the upload to fail.

**Files:**
- Create: `lib/storage/supabase-storage.ts`
- Modify: `lib/storage/index.ts`

- [ ] **Step 1: Create `lib/storage/supabase-storage.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'uploads'

export async function uploadFile(
  path: string,
  file: Buffer | Uint8Array,
  contentType: string
): Promise<{ url: string; path: string }> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType, upsert: true })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

export async function getFileUrl(path: string): Promise<string> {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
```

- [ ] **Step 2: Update `lib/storage/index.ts`**

Replace the entire contents:

```typescript
export { uploadFile, getFileUrl } from '@/lib/storage/supabase-storage'
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/bhaskar/Documents/github/agentflow-core && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/storage/supabase-storage.ts lib/storage/index.ts
git commit -m "feat: Supabase Storage implementation"
```

---

## Task 6: Implement `GET /api/upload` and `POST /api/upload`

The GET returns current session state for the upload page. The POST receives a file, parses it, persists rows, and triggers reconciliation when both files are present.

**Files:**
- Modify: `app/api/upload/route.ts`

- [ ] **Step 1: Replace `app/api/upload/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { parseImsJson } from '@/lib/parsers/ims-json-parser'
import { parseTallyCsv } from '@/lib/parsers/tally-csv-parser'
import { parseTallyFile } from '@/lib/parsers/tally-excel-parser'
import type { TallyColumnMap } from '@/lib/parsers/tally-excel-parser'
import { normalizeInvoiceNumber } from '@/lib/reconciliation/normalize'
import { runReconciliation } from '@/lib/reconciliation/run'
import { uploadFile } from '@/lib/storage/index'
import { sendNotification } from '@/lib/notifications/index'

// GET /api/upload?clientGstinId=xxx&period=YYYY-MM
export async function GET(req: NextRequest) {
  const user = await getAuthedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const clientGstinId = searchParams.get('clientGstinId')
  const period = searchParams.get('period')

  if (!clientGstinId || !period) {
    return NextResponse.json({ error: 'clientGstinId and period are required' }, { status: 400 })
  }

  const session = await prisma.uploadSession.findUnique({
    where: { client_gstin_id_period: { client_gstin_id: clientGstinId, period } },
    include: {
      _count: { select: { ims_invoices: true, tally_entries: true } },
    },
  })

  if (!session) {
    return NextResponse.json({ sessionId: null, status: null, imsUploadedAt: null, imsCount: 0, tallyUploadedAt: null, tallyCount: 0 })
  }

  return NextResponse.json({
    sessionId:      session.id,
    status:         session.status,
    imsUploadedAt:  session.ims_uploaded_at?.toISOString() ?? null,
    imsCount:       session._count.ims_invoices,
    tallyUploadedAt: session.tally_uploaded_at?.toISOString() ?? null,
    tallyCount:     session._count.tally_entries,
  })
}

// POST /api/upload
export async function POST(req: NextRequest) {
  const user = await getAuthedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file          = formData.get('file') as File | null
  const type          = formData.get('type') as 'ims' | 'tally' | null
  const clientGstinId = formData.get('clientGstinId') as string | null
  const period        = formData.get('period') as string | null
  const columnMapRaw  = formData.get('columnMapping') as string | null

  if (!file || !type || !clientGstinId || !period) {
    return NextResponse.json({ error: 'file, type, clientGstinId, and period are required' }, { status: 400 })
  }

  // Verify the user has access to this GSTIN's client
  const gstin = await prisma.clientGstin.findUnique({
    where: { id: clientGstinId },
    include: { client: true },
  })
  if (!gstin) return NextResponse.json({ error: 'GSTIN not found' }, { status: 404 })

  const isCAMember = user.role === 'CA_ADMIN' || user.role === 'CA_STAFF'
  const isLinkedClient = user.role === 'CLIENT' && user.client_id === gstin.client_id
  if (!isCAMember && !isLinkedClient) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Upsert upload session
  const session = await prisma.uploadSession.upsert({
    where: { client_gstin_id_period: { client_gstin_id: clientGstinId, period } },
    create: {
      client_gstin_id: clientGstinId,
      period,
      uploaded_by_id: user.id,
      status: 'PENDING',
    },
    update: {},
  })

  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const fileText   = fileBuffer.toString('utf-8')

  // Save to storage (non-blocking)
  const storagePath = `${gstin.client.org_id}/${gstin.client_id}/${period}/${type}.${file.name.split('.').pop()}`
  uploadFile(storagePath, fileBuffer, file.type).catch(err =>
    console.error('[storage] upload failed (non-fatal):', err)
  )

  if (type === 'ims') {
    let parsed
    try {
      parsed = parseImsJson(fileText)
    } catch {
      return NextResponse.json({ error: 'Invalid IMS JSON — expected docdata.b2b structure' }, { status: 422 })
    }

    // Additive: find existing invoice numbers for this session
    const existing = await prisma.imsInvoice.findMany({
      where: { upload_session_id: session.id },
      select: { invoice_number: true },
    })
    const existingKeys = new Set(existing.map(r => normalizeInvoiceNumber(r.invoice_number)))

    const toInsert = parsed.filter(
      inv => !existingKeys.has(normalizeInvoiceNumber(inv.invoiceNum))
    )

    if (toInsert.length > 0) {
      await prisma.imsInvoice.createMany({
        data: toInsert.map(inv => ({
          upload_session_id: session.id,
          supplier_gstin:    inv.supplierGstin,
          invoice_number:    inv.invoiceNum,
          invoice_date:      new Date(inv.invoiceDate),
          invoice_value:     inv.totalValue.toFixed(2),
          taxable_value:     inv.totalValue.toFixed(2),
          igst:              inv.igst.toFixed(2),
          cgst:              inv.cgst.toFixed(2),
          sgst:              inv.sgst.toFixed(2),
          place_of_supply:   inv.pos,
        })),
      })
    }

    await prisma.uploadSession.update({
      where: { id: session.id },
      data:  { ims_uploaded_at: new Date(), ims_file_url: storagePath, status: 'PROCESSING' },
    })
  } else {
    // Tally: replace-all
    const columnMap: TallyColumnMap | undefined = columnMapRaw
      ? JSON.parse(columnMapRaw)
      : undefined

    let parsed
    try {
      parsed = file.name.endsWith('.csv')
        ? parseTallyCsv(fileText, columnMap)
        : parseTallyFile(fileText, columnMap)
    } catch {
      return NextResponse.json({ error: 'Could not parse Tally file — check file format' }, { status: 422 })
    }

    await prisma.tallyEntry.deleteMany({ where: { upload_session_id: session.id } })

    await prisma.tallyEntry.createMany({
      data: parsed.map(row => ({
        upload_session_id: session.id,
        supplier_gstin:    row.supplierGstin,
        supplier_name:     row.supplierName,
        voucher_number:    row.invoiceNum,
        voucher_date:      new Date(row.invoiceDate),
        total_amount:      row.totalAmount.toFixed(2),
        taxable_value:     row.taxableValue.toFixed(2),
        igst:              row.igst.toFixed(2),
        cgst:              row.cgst.toFixed(2),
        sgst:              row.sgst.toFixed(2),
      })),
    })

    await prisma.uploadSession.update({
      where: { id: session.id },
      data:  { tally_uploaded_at: new Date(), tally_file_url: storagePath, status: 'PROCESSING' },
    })
  }

  // Reload session to check if both files are now present
  const updated = await prisma.uploadSession.findUniqueOrThrow({ where: { id: session.id } })

  let reconOutcomes: Record<string, number> | undefined
  if (updated.ims_uploaded_at && updated.tally_uploaded_at) {
    reconOutcomes = await runReconciliation(session.id)

    // Notify CA org members
    const caUsers = await prisma.user.findMany({
      where: {
        org_id: gstin.client.org_id,
        role:   { in: ['CA_ADMIN', 'CA_STAFF'] },
      },
    })
    await Promise.all(
      caUsers.map(ca =>
        sendNotification({
          recipientId: ca.id,
          clientId:    gstin.client_id,
          type:        'CLIENT_UPLOADED',
          message:     `${gstin.client.name} uploaded files for ${period}. Reconciliation complete.`,
        })
      )
    )
  }

  const finalSession = await prisma.uploadSession.findUniqueOrThrow({
    where:   { id: session.id },
    include: { _count: { select: { ims_invoices: true, tally_entries: true } } },
  })

  return NextResponse.json({
    sessionId:     session.id,
    status:        finalSession.status,
    imsCount:      finalSession._count.ims_invoices,
    tallyCount:    finalSession._count.tally_entries,
    reconOutcomes: reconOutcomes ?? null,
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/bhaskar/Documents/github/agentflow-core && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/upload/route.ts
git commit -m "feat: GET + POST /api/upload — parse, persist, trigger recon"
```

---

## Task 7: Implement `POST /api/reconciliation`

External endpoint for retrying reconciliation without re-uploading files.

**Files:**
- Modify: `app/api/reconciliation/route.ts`

- [ ] **Step 1: Replace `app/api/reconciliation/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { runReconciliation } from '@/lib/reconciliation/run'

export async function POST(req: NextRequest) {
  const user = await getAuthedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await req.json() as { sessionId?: string }
  if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })

  const session = await prisma.uploadSession.findUnique({
    where:   { id: sessionId },
    include: { client_gstin: { include: { client: true } } },
  })
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  // Auth: CA must belong to the same org; client must be linked to this client
  const isCAMember = (user.role === 'CA_ADMIN' || user.role === 'CA_STAFF') &&
                     user.org_id === session.client_gstin.client.org_id
  const isLinkedClient = user.role === 'CLIENT' &&
                         user.client_id === session.client_gstin.client_id
  if (!isCAMember && !isLinkedClient) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!session.ims_uploaded_at || !session.tally_uploaded_at) {
    return NextResponse.json({ error: 'Both IMS and Tally must be uploaded before reconciliation' }, { status: 422 })
  }

  const outcomes = await runReconciliation(sessionId)
  return NextResponse.json(outcomes)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/bhaskar/Documents/github/agentflow-core && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/reconciliation/route.ts
git commit -m "feat: POST /api/reconciliation — retry recon by sessionId"
```

---

## Task 8: `PeriodPicker` component

Dropdown that defaults to the most recent relevant period and allows override.

**Files:**
- Create: `components/upload/PeriodPicker.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PeriodPickerProps {
  value: string          // "YYYY-MM"
  onChange: (period: string) => void
}

function getDefaultPeriod(): string {
  const now = new Date()
  // GSTN publishes IMS on the 14th — use previous month on or after the 14th
  const useCurrentMonth = now.getDate() < 14
  const target = useCurrentMonth ? now : new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`
}

function buildPeriodOptions(): { value: string; label: string }[] {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }
  return options
}

export function getDefaultPeriodValue(): string {
  return getDefaultPeriod()
}

export function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  const options = useMemo(buildPeriodOptions, [])

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-36 h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/bhaskar/Documents/github/agentflow-core && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/upload/PeriodPicker.tsx
git commit -m "feat: PeriodPicker component with smart default"
```

---

## Task 9: `FileDropZone` component

Handles drag-and-drop or click-to-upload with visual states: empty, dragging, uploading (progress bar), done, error.

**Files:**
- Create: `components/upload/FileDropZone.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useRef, useState, DragEvent } from 'react'
import { cn } from '@/lib/utils'

export type DropZoneStatus = 'empty' | 'dragging' | 'uploading' | 'done' | 'error'

interface FileDropZoneProps {
  type: 'ims' | 'tally'
  uploadedAt?: string | null        // ISO datetime string
  uploadedCount?: number
  status: DropZoneStatus
  errorMessage?: string | null
  onFile: (file: File) => void
  onReupload?: () => void
}

const ACCEPT: Record<'ims' | 'tally', string> = {
  ims:   '.json',
  tally: '.csv,.xls,.xlsx',
}

const LABELS: Record<'ims' | 'tally', { title: string; hint: string; icon: string }> = {
  ims:   { title: 'IMS JSON',       hint: 'Download from GSTN → IMS tab → Export JSON', icon: '📄' },
  tally: { title: 'Tally CSV/Excel', hint: 'Export purchase register from Tally',        icon: '📊' },
}

export function FileDropZone({ type, uploadedAt, uploadedCount, status, errorMessage, onFile, onReupload }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const { title, hint, icon } = LABELS[type]

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    e.target.value = ''
  }

  if (status === 'done' && uploadedAt) {
    const date = new Date(uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    return (
      <div className="flex items-center gap-3 rounded-lg border-2 border-emerald-400 bg-emerald-50 p-3">
        <span className="text-xl">✅</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-emerald-800">{title}</p>
          <p className="text-xs text-gray-500">{uploadedCount} rows · {date}</p>
        </div>
        {onReupload && (
          <button onClick={onReupload} className="text-xs text-emerald-600 hover:underline shrink-0">
            Re-upload
          </button>
        )}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="rounded-lg border-2 border-red-400 bg-red-50 p-3">
        <p className="text-xs font-semibold text-red-800 mb-1">{title} — upload failed</p>
        <p className="text-xs text-red-600">{errorMessage}</p>
        <button
          onClick={() => inputRef.current?.click()}
          className="mt-2 text-xs text-red-700 underline"
        >
          Try again
        </button>
        <input ref={inputRef} type="file" accept={ACCEPT[type]} className="hidden" onChange={handleChange} />
      </div>
    )
  }

  if (status === 'uploading') {
    return (
      <div className="flex items-center gap-3 rounded-lg border-2 border-indigo-300 bg-indigo-50 p-3 animate-pulse">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="text-xs font-semibold text-indigo-800">{title}</p>
          <p className="text-xs text-indigo-500">Processing…</p>
        </div>
      </div>
    )
  }

  const isDragging = dragging || status === 'dragging'
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'cursor-pointer rounded-lg border-2 border-dashed p-3 text-center transition-colors',
        isDragging
          ? 'border-indigo-400 bg-indigo-50'
          : 'border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50',
        type === 'tally' && status === 'empty' && 'border-amber-300'
      )}
    >
      <span className="text-xl mb-1 block">{icon}</span>
      <p className="text-xs font-semibold text-gray-700">{title}</p>
      <p className="text-xs text-gray-400 mt-0.5">
        {isDragging ? 'Drop to upload' : 'Click or drop to upload'}
      </p>
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[type]}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/bhaskar/Documents/github/agentflow-core && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/upload/FileDropZone.tsx
git commit -m "feat: FileDropZone with drag-drop and upload state management"
```

---

## Task 10: `ColumnMappingModal` component

Full-screen modal for mapping Tally columns. Appears when `extractTallyFileInfo` returns `detectedMap: null`. Uses shadcn Dialog.

**Files:**
- Create: `components/upload/ColumnMappingModal.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { TallyColumnMap } from '@/lib/parsers/tally-excel-parser'
import type { TallyFileInfo } from '@/lib/parsers/tally-column-detect'

const REQUIRED_FIELDS: Array<{ key: keyof TallyColumnMap; label: string; required: boolean }> = [
  { key: 'supplierGstin', label: 'Supplier GSTIN',  required: true },
  { key: 'supplierName',  label: 'Supplier Name',   required: false },
  { key: 'voucherNumber', label: 'Invoice Number',  required: true },
  { key: 'voucherDate',   label: 'Invoice Date',    required: true },
  { key: 'taxableValue',  label: 'Taxable Value',   required: true },
  { key: 'igst',          label: 'IGST',            required: true },
  { key: 'cgst',          label: 'CGST',            required: true },
  { key: 'sgst',          label: 'SGST',            required: true },
  { key: 'totalAmount',   label: 'Total Amount',    required: true },
  { key: 'hsnCode',       label: 'HSN Code',        required: false },
]

const STORAGE_KEY = 'tally_column_map_template'

interface ColumnMappingModalProps {
  open: boolean
  fileInfo: TallyFileInfo | null
  onConfirm: (map: TallyColumnMap) => void
  onCancel: () => void
}

export function ColumnMappingModal({ open, fileInfo, onConfirm, onCancel }: ColumnMappingModalProps) {
  const [mapping, setMapping] = useState<Partial<TallyColumnMap>>({})

  useEffect(() => {
    if (!open || !fileInfo) return
    // Pre-fill from detected map, then from saved template
    const saved = localStorage.getItem(STORAGE_KEY)
    const template: Partial<TallyColumnMap> = saved ? JSON.parse(saved) : {}
    const initial = fileInfo.detectedMap ?? template
    setMapping(initial as Partial<TallyColumnMap>)
  }, [open, fileInfo])

  const [saveTemplate, setSaveTemplate] = useState(true)

  if (!fileInfo) return null

  const headers = fileInfo.headers

  function handleConfirm() {
    const complete = mapping as TallyColumnMap
    if (saveTemplate) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(complete))
    }
    onConfirm(complete)
  }

  const allRequiredMapped = REQUIRED_FIELDS
    .filter(f => f.required)
    .every(f => !!mapping[f.key])

  return (
    <Dialog open={open} onOpenChange={val => { if (!val) onCancel() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Map your Tally columns</DialogTitle>
          <p className="text-xs text-gray-500">
            {headers.length} columns detected. Match each required field to a column in your file.
          </p>
        </DialogHeader>

        <div className="border rounded-lg overflow-hidden text-xs">
          {/* Header row */}
          <div className="grid grid-cols-[180px_1fr_160px] bg-gray-100 px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide text-[10px] border-b">
            <span>Required field</span>
            <span>Sample values</span>
            <span>Your column</span>
          </div>

          {REQUIRED_FIELDS.map(field => {
            const currentVal = mapping[field.key] ?? ''
            const isMatched = !!currentVal
            const samples = currentVal ? (fileInfo.samples[currentVal] ?? []) : []

            return (
              <div
                key={field.key}
                className={`grid grid-cols-[180px_1fr_160px] items-center px-4 py-2.5 border-b last:border-b-0 ${
                  isMatched ? '' : 'bg-amber-50'
                }`}
              >
                <span className="font-semibold text-gray-700">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </span>

                <span className="text-gray-400 font-mono truncate pr-4">
                  {samples.length > 0 ? samples.join(', ') : '—'}
                </span>

                {isMatched ? (
                  <div className="flex items-center gap-1.5 border border-emerald-400 rounded px-2 py-1 bg-emerald-50 text-emerald-700">
                    <span>✓</span>
                    <span className="truncate">{currentVal}</span>
                  </div>
                ) : (
                  <Select
                    value={currentVal}
                    onValueChange={v => setMapping(m => ({ ...m, [field.key]: v }))}
                  >
                    <SelectTrigger className="h-7 text-xs border-amber-400 bg-amber-50">
                      <SelectValue placeholder="— Select —" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map(h => (
                        <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )
          })}
        </div>

        <DialogFooter className="flex items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={saveTemplate}
              onChange={e => setSaveTemplate(e.target.checked)}
              className="accent-indigo-600"
            />
            Save as template for future uploads
          </label>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
            <Button
              size="sm"
              disabled={!allRequiredMapped}
              onClick={handleConfirm}
            >
              Confirm mapping
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/bhaskar/Documents/github/agentflow-core && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/upload/ColumnMappingModal.tsx
git commit -m "feat: ColumnMappingModal for Tally column mapping"
```

---

## Task 11: `GstinUploadCard` component

Handles the full upload flow for a single GSTIN. Manages period selection, file detection, column mapping modal, API calls, and status display.

**Files:**
- Create: `components/upload/GstinUploadCard.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { FileDropZone, DropZoneStatus } from '@/components/upload/FileDropZone'
import { PeriodPicker } from '@/components/upload/PeriodPicker'
import { ColumnMappingModal } from '@/components/upload/ColumnMappingModal'
import { extractTallyFileInfo, TallyFileInfo } from '@/lib/parsers/tally-column-detect'
import type { TallyColumnMap } from '@/lib/parsers/tally-excel-parser'

export interface SessionState {
  sessionId: string | null
  status:    string | null
  imsUploadedAt:   string | null
  imsCount:        number
  tallyUploadedAt: string | null
  tallyCount:      number
}

interface GstinUploadCardProps {
  clientGstinId: string
  gstin:         string
  stateName:     string
  defaultPeriod: string
  initialSession: SessionState
}

type ZoneState = { status: DropZoneStatus; error?: string | null }

const statusBadge: Record<string, { label: string; className: string }> = {
  DONE:       { label: 'Reconciled',    className: 'bg-emerald-100 text-emerald-800' },
  PROCESSING: { label: 'Processing…',  className: 'bg-blue-100 text-blue-800' },
  ERROR:      { label: 'Upload failed', className: 'bg-red-100 text-red-800' },
  PENDING:    { label: 'Pending',       className: 'bg-gray-100 text-gray-600' },
}

export function GstinUploadCard({
  clientGstinId,
  gstin,
  stateName,
  defaultPeriod,
  initialSession,
}: GstinUploadCardProps) {
  const [period, setPeriod] = useState(defaultPeriod)
  const [session, setSession] = useState<SessionState>(initialSession)
  const [imsZone, setImsZone]   = useState<ZoneState>({ status: initialSession.imsUploadedAt ? 'done' : 'empty' })
  const [tallyZone, setTallyZone] = useState<ZoneState>({ status: initialSession.tallyUploadedAt ? 'done' : 'empty' })

  // Column mapping state
  const [pendingTallyFile, setPendingTallyFile]   = useState<File | null>(null)
  const [tallyFileInfo, setTallyFileInfo]         = useState<TallyFileInfo | null>(null)
  const [mappingModalOpen, setMappingModalOpen]   = useState(false)

  async function submit(file: File, type: 'ims' | 'tally', columnMap?: TallyColumnMap) {
    const setter = type === 'ims' ? setImsZone : setTallyZone
    setter({ status: 'uploading' })

    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', type)
    fd.append('clientGstinId', clientGstinId)
    fd.append('period', period)
    if (columnMap) fd.append('columnMapping', JSON.stringify(columnMap))

    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Upload failed' }))
      setter({ status: 'error', error: body.error ?? 'Upload failed' })
      return
    }

    const data = await res.json() as SessionState & { reconOutcomes?: Record<string, number> }
    setSession(data)
    setImsZone({ status: data.imsUploadedAt ? 'done' : 'empty' })
    setTallyZone({ status: data.tallyUploadedAt ? 'done' : 'empty' })
  }

  const handleImsFile = useCallback(async (file: File) => {
    // Client-side validation
    if (!file.name.endsWith('.json')) {
      setImsZone({ status: 'error', error: 'IMS must be a .json file' })
      return
    }
    const text = await file.text()
    if (!text.includes('docdata')) {
      setImsZone({ status: 'error', error: "This doesn't look like a GSTN IMS export. Download from GSTN → IMS tab → Export JSON." })
      return
    }
    await submit(file, 'ims')
  }, [period, clientGstinId])

  const handleTallyFile = useCallback(async (file: File) => {
    const info = await extractTallyFileInfo(file)
    if (!info.detectedMap) {
      // Auto-detect failed — show mapping modal
      setPendingTallyFile(file)
      setTallyFileInfo(info)
      setMappingModalOpen(true)
    } else {
      await submit(file, 'tally', info.detectedMap)
    }
  }, [period, clientGstinId])

  function handleMappingConfirm(map: TallyColumnMap) {
    setMappingModalOpen(false)
    if (pendingTallyFile) submit(pendingTallyFile, 'tally', map)
    setPendingTallyFile(null)
  }

  function handleMappingCancel() {
    setMappingModalOpen(false)
    setPendingTallyFile(null)
    setTallyFileInfo(null)
  }

  async function handlePeriodChange(newPeriod: string) {
    setPeriod(newPeriod)
    // Reload session for new period
    const res = await fetch(`/api/upload?clientGstinId=${clientGstinId}&period=${newPeriod}`)
    const data = await res.json() as SessionState
    setSession(data)
    setImsZone({ status: data.imsUploadedAt ? 'done' : 'empty' })
    setTallyZone({ status: data.tallyUploadedAt ? 'done' : 'empty' })
  }

  const badge = session.status ? statusBadge[session.status] : { label: 'No upload', className: 'bg-gray-100 text-gray-500' }
  const noUpload = !session.imsUploadedAt && !session.tallyUploadedAt

  return (
    <>
      <div className={`rounded-xl border bg-white overflow-hidden ${
        session.status === 'DONE' ? 'border-emerald-200' :
        session.status === 'ERROR' ? 'border-red-200' :
        session.imsUploadedAt || session.tallyUploadedAt ? 'border-amber-200' :
        'border-gray-200'
      }`}>
        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{gstin}</span>
            <span className="text-gray-400 text-xs">{stateName}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Period:</span>
            <PeriodPicker value={period} onChange={handlePeriodChange} />
          </div>
        </div>

        {/* Upload zones */}
        <div className="grid grid-cols-2 gap-3 p-4">
          <FileDropZone
            type="ims"
            uploadedAt={session.imsUploadedAt}
            uploadedCount={session.imsCount}
            status={imsZone.status}
            errorMessage={imsZone.error}
            onFile={handleImsFile}
            onReupload={() => setImsZone({ status: 'empty' })}
          />
          <FileDropZone
            type="tally"
            uploadedAt={session.tallyUploadedAt}
            uploadedCount={session.tallyCount}
            status={tallyZone.status}
            errorMessage={tallyZone.error}
            onFile={handleTallyFile}
            onReupload={() => setTallyZone({ status: 'empty' })}
          />
        </div>
      </div>

      <ColumnMappingModal
        open={mappingModalOpen}
        fileInfo={tallyFileInfo}
        onConfirm={handleMappingConfirm}
        onCancel={handleMappingCancel}
      />
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/bhaskar/Documents/github/agentflow-core && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/upload/GstinUploadCard.tsx
git commit -m "feat: GstinUploadCard — per-GSTIN upload UI with period picker"
```

---

## Task 12: Upload page

Server component that fetches the client's GSTINs and current session states, then renders a `GstinUploadCard` for each.

**Files:**
- Modify: `app/client/upload/page.tsx`

- [ ] **Step 1: Replace `app/client/upload/page.tsx`**

```typescript
import { redirect } from 'next/navigation'
import { getAuthedUser, getEffectiveClientId } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { GstinUploadCard, SessionState } from '@/components/upload/GstinUploadCard'
import { getDefaultPeriodValue } from '@/components/upload/PeriodPicker'

export default async function ClientUploadPage() {
  const user = await getAuthedUser().catch(() => null)
  if (!user) redirect('/login')

  const clientId = await getEffectiveClientId()
  if (!clientId) redirect('/ca/clients')

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      gstins: {
        include: {
          upload_sessions: {
            where: { period: getDefaultPeriodValue() },
            include: {
              _count: { select: { ims_invoices: true, tally_entries: true } },
            },
            take: 1,
          },
        },
        orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }],
      },
    },
  })

  if (!client) redirect('/login')

  const defaultPeriod = getDefaultPeriodValue()

  // Map state code to state name (first 2 chars of GSTIN = state code)
  const STATE_NAMES: Record<string, string> = {
    '01': 'J&K', '02': 'Himachal', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand',
    '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'UP', '10': 'Bihar',
    '11': 'Sikkim', '12': 'Arunachal', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
    '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand',
    '21': 'Odisha', '22': 'Chhattisgarh', '23': 'MP', '24': 'Gujarat', '25': 'Daman & Diu',
    '26': 'DNH', '27': 'Maharashtra', '28': 'AP (old)', '29': 'Karnataka', '30': 'Goa',
    '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
    '35': 'A&N Islands', '36': 'Telangana', '37': 'AP',
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Upload Files</h1>
        <p className="text-sm text-gray-500 mt-1">{client.name}</p>
      </div>

      <div className="flex flex-col gap-4">
        {client.gstins.map(g => {
          const s = g.upload_sessions[0]
          const initialSession = {
            sessionId:       s?.id ?? null,
            status:          s?.status ?? null,
            imsUploadedAt:   s?.ims_uploaded_at?.toISOString() ?? null,
            imsCount:        s?._count.ims_invoices ?? 0,
            tallyUploadedAt: s?.tally_uploaded_at?.toISOString() ?? null,
            tallyCount:      s?._count.tally_entries ?? 0,
          }
          return (
            <GstinUploadCard
              key={g.id}
              clientGstinId={g.id}
              gstin={g.gstin}
              stateName={STATE_NAMES[g.gstin.slice(0, 2)] ?? 'Unknown'}
              defaultPeriod={defaultPeriod}
              initialSession={initialSession}
            />
          )
        })}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/bhaskar/Documents/github/agentflow-core && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Run the dev server and manually verify the upload page**

```bash
cd /Users/bhaskar/Documents/github/agentflow-core && npm run dev
```

Navigate to `http://localhost:3000/client/upload` (log in as a client user or use acting-as as a CA). Verify:
- All GSTINs for the client appear as cards
- Period defaults correctly (previous month if on or after 14th)
- IMS drop zone accepts `.json` only
- Tally drop zone accepts `.csv`, `.xls`, `.xlsx`
- Dropping a well-formatted Tally file with known headers uploads without showing the modal
- Dropping a Tally file with unknown headers opens the column mapping modal
- After mapping and confirming, upload proceeds
- After both files upload for a GSTIN, badge changes to "Reconciled"

- [ ] **Step 4: Run all tests to confirm no regressions**

```bash
cd /Users/bhaskar/Documents/github/agentflow-core && npx vitest run 2>&1 | tail -20
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add app/client/upload/page.tsx
git commit -m "feat: /client/upload page — GSTIN cards with file upload flow"
```

---

## Done

When all tasks are complete, the upload feature is fully functional:
- CA or client drops IMS JSON + Tally files per GSTIN
- Column mapping modal handles non-standard Tally exports
- Both files trigger automatic reconciliation
- CA is notified in-platform when upload completes
- Results are available in `reconciliation_results` for the client dashboard (next sprint)

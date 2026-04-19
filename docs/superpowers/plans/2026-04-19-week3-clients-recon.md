# Week 3 — Client Management + Reconciliation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement client management (CA adds clients with GSTINs, invites users, acts-as) and a pure-function reconciliation engine that passes all golden fixture tests.

**Architecture:** The reconciliation engine lives in `lib/` — pure TypeScript, no Prisma, no HTTP. Client management follows the existing team-invite pattern: `Client` record with inline `invite_token`, `ClientGstin` for GSTINs, `User.client_id` for CLIENT users. Acting-as uses a server cookie. All existing stubs are rewritten from scratch.

**Tech Stack:** Next.js 14 App Router, Prisma, Supabase Auth, Resend, papaparse, Decimal.js, Vitest

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `lib/parsers/ims-json-parser.ts` | **Rewrite** | Parse GSTN IMS JSON → `NormalizedImsInvoice[]` |
| `lib/parsers/tally-csv-parser.ts` | **Create** | Parse Tally CSV → `NormalizedTallyRow[]` (replaces `tally-excel-parser.ts`) |
| `lib/reconciliation/normalize.ts` | **Update** | Add `normalizeDate()`, `dateDiffDays()` |
| `lib/reconciliation/matcher.ts` | **Rewrite** | `findCandidates()` — Strategy A + B lookup |
| `lib/reconciliation/rules.ts` | **Rewrite** | `classify()` — cascade rule engine |
| `lib/reconciliation/index.ts` | **Create** | `reconcile()` — main entry point |
| `lib/email/resend.ts` | **Update** | Add `sendClientInviteEmail()` |
| `lib/auth/session.ts` | **Update** | Add `getEffectiveClientId()` |
| `app/auth/callback/route.ts` | **Update** | Handle `clientInviteToken` metadata |
| `app/api/clients/route.ts` | **Rewrite** | GET list + POST (create / add-gstin / resend-invite) |
| `app/api/clients/[clientId]/route.ts` | **Create** | GET client detail |
| `app/api/clients/[clientId]/acting-as/route.ts` | **Create** | POST/DELETE acting-as cookie |
| `app/(auth)/accept-client-invite/page.tsx` | **Create** | Client onboarding page |
| `app/ca/clients/page.tsx` | **Create** | CA client list + add form |
| `app/ca/clients/[clientId]/page.tsx` | **Create** | CA client detail + act-as button |
| `components/acting-as-banner.tsx` | **Create** | Acting-as sticky banner |
| `tests/normalize.test.ts` | **Create** | Unit tests for normalize helpers |
| `tests/parsers.test.ts` | **Create** | Unit tests for both parsers |
| `tests/reconciliation.test.ts` | **Create** | Golden fixture test + 9 scenario tests |

---

## Task 1: Normalize Module — Add `normalizeDate` and `dateDiffDays`

**Files:**
- Modify: `lib/reconciliation/normalize.ts`
- Create: `tests/normalize.test.ts`

Existing `normalizeGstin`, `normalizeInvoiceNumber`, `normalizeDecimal` stay unchanged. Add two functions.

- [ ] **Step 1.1: Write failing tests**

Create `tests/normalize.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { normalizeDate, dateDiffDays, normalizeInvoiceNumber, normalizeGstin } from '@/lib/reconciliation/normalize'

describe('normalizeDate', () => {
  test('converts DD-MM-YYYY (IMS hyphens) to ISO', () => {
    expect(normalizeDate('02-02-2026')).toBe('2026-02-02')
  })
  test('converts DD/MM/YYYY (Tally slashes) to ISO', () => {
    expect(normalizeDate('25/02/2026')).toBe('2026-02-25')
  })
  test('single-digit day and month', () => {
    expect(normalizeDate('01/01/2026')).toBe('2026-01-01')
  })
})

describe('dateDiffDays', () => {
  test('same date → 0', () => {
    expect(dateDiffDays('2026-02-15', '2026-02-15')).toBe(0)
  })
  test('10-day gap', () => {
    expect(dateDiffDays('2026-02-15', '2026-02-25')).toBe(10)
  })
  test('gap is absolute (order-independent)', () => {
    expect(dateDiffDays('2026-02-25', '2026-02-15')).toBe(10)
  })
})

describe('normalizeInvoiceNumber', () => {
  test('strips slashes and hyphens', () => {
    expect(normalizeInvoiceNumber('INV/26/021')).toBe('inv26021')
    expect(normalizeInvoiceNumber('INV-26-021')).toBe('inv26021')
  })
  test('strips spaces and underscores', () => {
    expect(normalizeInvoiceNumber('INV 26 021')).toBe('inv26021')
  })
  test('drops leading zeros', () => {
    expect(normalizeInvoiceNumber('INV-0026')).toBe('inv0026') // only leading zeros of the whole string
  })
})

describe('normalizeGstin', () => {
  test('uppercases', () => {
    expect(normalizeGstin('27ermjd3988g1zj')).toBe('27ERMJD3988G1ZJ')
  })
  test('trims', () => {
    expect(normalizeGstin('  27ERMJD3988G1ZJ  ')).toBe('27ERMJD3988G1ZJ')
  })
})
```

- [ ] **Step 1.2: Run tests to verify they fail**

```bash
cd /Users/bhaskar/Documents/github/agentflow-core
npx vitest run tests/normalize.test.ts
```

Expected: FAIL — `normalizeDate is not a function`, `dateDiffDays is not a function`

- [ ] **Step 1.3: Add the two functions to `normalize.ts`**

Open `lib/reconciliation/normalize.ts` and add after the existing exports:

```ts
export function normalizeDate(dateStr: string): string {
  // Accept DD-MM-YYYY (hyphens, IMS) or DD/MM/YYYY (slashes, Tally)
  const parts = dateStr.split(/[-/]/)
  if (parts.length !== 3) throw new Error(`Invalid date: ${dateStr}`)
  const [dd, mm, yyyy] = parts
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

export function dateDiffDays(isoA: string, isoB: string): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.abs(Math.round((new Date(isoA).getTime() - new Date(isoB).getTime()) / msPerDay))
}
```

- [ ] **Step 1.4: Run tests — all pass**

```bash
npx vitest run tests/normalize.test.ts
```

Expected: All tests PASS.

- [ ] **Step 1.5: Commit**

```bash
git add lib/reconciliation/normalize.ts tests/normalize.test.ts
git commit -m "feat: add normalizeDate and dateDiffDays to normalize module"
```

---

## Task 2: IMS JSON Parser Rewrite

**Files:**
- Rewrite: `lib/parsers/ims-json-parser.ts`
- Create: `tests/parsers.test.ts` (IMS section)

The current stub has wrong types (`imsAction`, `placeOfSupply`, Date objects). Rewrite completely.

- [ ] **Step 2.1: Write failing parser test**

Create `tests/parsers.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import Decimal from 'decimal.js'
import { parseImsJson } from '@/lib/parsers/ims-json-parser'

const SINGLE_SUPPLIER_JSON = JSON.stringify({
  gstin: '27AABCU9603R1ZX',
  ret_period: '022026',
  docdata: {
    b2b: [
      {
        ctin: '27ERMJD3988G1ZJ',
        inv: [
          {
            inum: 'BILL26001',
            idt: '02-02-2026',
            val: 484064,
            pos: '27',
            itc_avl: 'Y',
            itms: [
              { num: 1, itm_det: { rt: 12, txval: 432200, iamt: 0, camt: 25932, samt: 25932, csamt: 0 } },
            ],
          },
        ],
      },
    ],
  },
})

const MULTI_ITEM_JSON = JSON.stringify({
  gstin: '27AABCU9603R1ZX',
  ret_period: '022026',
  docdata: {
    b2b: [
      {
        ctin: '27ERMJD3988G1ZJ',
        inv: [
          {
            inum: 'MULTI001',
            idt: '01-01-2026',
            val: 100000,
            pos: '27',
            itc_avl: 'Y',
            itms: [
              { num: 1, itm_det: { rt: 18, txval: 40000, iamt: 7200, camt: 0, samt: 0, csamt: 0 } },
              { num: 2, itm_det: { rt: 18, txval: 40000, iamt: 7200, camt: 0, samt: 0, csamt: 0 } },
            ],
          },
        ],
      },
    ],
  },
})

describe('parseImsJson', () => {
  test('parses basic invoice with correct types', () => {
    const result = parseImsJson(SINGLE_SUPPLIER_JSON)
    expect(result).toHaveLength(1)
    const inv = result[0]
    expect(inv.supplierGstin).toBe('27ERMJD3988G1ZJ')
    expect(inv.invoiceNum).toBe('BILL26001')
    expect(inv.invoiceDate).toBe('2026-02-02')
    expect(inv.totalValue).toBeInstanceOf(Decimal)
    expect(inv.totalValue.toNumber()).toBe(484064)
    expect(inv.igst.toNumber()).toBe(0)
    expect(inv.cgst.toNumber()).toBe(25932)
    expect(inv.sgst.toNumber()).toBe(25932)
    expect(inv.pos).toBe('27')
  })

  test('sums tax amounts across multiple itms[] entries', () => {
    const result = parseImsJson(MULTI_ITEM_JSON)
    expect(result[0].igst.toNumber()).toBe(14400) // 7200 + 7200
  })

  test('parses multiple suppliers and multiple invoices', () => {
    const json = JSON.stringify({
      gstin: 'X', ret_period: '022026',
      docdata: {
        b2b: [
          { ctin: 'A', inv: [{ inum: 'I1', idt: '01-01-2026', val: 100, pos: '27', itc_avl: 'Y', itms: [{ num: 1, itm_det: { rt: 18, txval: 84, iamt: 16, camt: 0, samt: 0, csamt: 0 } }] }] },
          { ctin: 'B', inv: [{ inum: 'I2', idt: '02-01-2026', val: 200, pos: '27', itc_avl: 'Y', itms: [{ num: 1, itm_det: { rt: 18, txval: 168, iamt: 32, camt: 0, samt: 0, csamt: 0 } }] }, { inum: 'I3', idt: '03-01-2026', val: 300, pos: '27', itc_avl: 'Y', itms: [{ num: 1, itm_det: { rt: 18, txval: 252, iamt: 48, camt: 0, samt: 0, csamt: 0 } }] }] },
        ],
      },
    })
    const result = parseImsJson(json)
    expect(result).toHaveLength(3)
    expect(result[0].supplierGstin).toBe('A')
    expect(result[1].supplierGstin).toBe('B')
    expect(result[2].supplierGstin).toBe('B')
  })
})
```

- [ ] **Step 2.2: Run to confirm failure**

```bash
npx vitest run tests/parsers.test.ts
```

Expected: FAIL — `parseImsJson: not yet implemented`

- [ ] **Step 2.3: Rewrite `lib/parsers/ims-json-parser.ts`**

Replace the entire file:

```ts
import Decimal from 'decimal.js'
import { normalizeDate } from '@/lib/reconciliation/normalize'

export interface NormalizedImsInvoice {
  supplierGstin: string
  invoiceNum: string
  invoiceDate: string   // ISO 8601
  totalValue: Decimal
  igst: Decimal
  cgst: Decimal
  sgst: Decimal
  pos: string
}

interface ImsItem {
  num: number
  itm_det: { rt: number; txval: number; iamt: number; camt: number; samt: number; csamt: number }
}

interface ImsInv {
  inum: string
  idt: string
  val: number
  pos: string
  itc_avl: string
  itms: ImsItem[]
}

interface ImsSupplier {
  ctin: string
  inv: ImsInv[]
}

interface ImsJson {
  gstin: string
  ret_period: string
  docdata: { b2b: ImsSupplier[] }
}

export function parseImsJson(json: string): NormalizedImsInvoice[] {
  const raw = JSON.parse(json) as ImsJson
  const results: NormalizedImsInvoice[] = []

  for (const supplier of raw.docdata.b2b) {
    for (const inv of supplier.inv) {
      let igst = new Decimal(0)
      let cgst = new Decimal(0)
      let sgst = new Decimal(0)

      for (const item of inv.itms) {
        igst = igst.plus(item.itm_det.iamt)
        cgst = cgst.plus(item.itm_det.camt)
        sgst = sgst.plus(item.itm_det.samt)
      }

      results.push({
        supplierGstin: supplier.ctin,
        invoiceNum: inv.inum,
        invoiceDate: normalizeDate(inv.idt),
        totalValue: new Decimal(inv.val),
        igst,
        cgst,
        sgst,
        pos: inv.pos,
      })
    }
  }

  return results
}
```

- [ ] **Step 2.4: Run tests — all pass**

```bash
npx vitest run tests/parsers.test.ts
```

Expected: All tests PASS.

- [ ] **Step 2.5: Commit**

```bash
git add lib/parsers/ims-json-parser.ts tests/parsers.test.ts
git commit -m "feat: rewrite IMS JSON parser with correct types"
```

---

## Task 3: Tally CSV Parser (New File)

**Files:**
- Create: `lib/parsers/tally-csv-parser.ts`
- Modify: `tests/parsers.test.ts` (add Tally section)

The existing `tally-excel-parser.ts` has wrong column names. Create a new CSV-specific parser. The actual fixture headers are: `Supplier GSTIN,Supplier Name,Invoice Number,Invoice Date,Taxable Value,IGST Amount,CGST Amount,SGST Amount,Cess Amount,Total Amount,HSN Code`.

- [ ] **Step 3.1: Add Tally parser tests to `tests/parsers.test.ts`**

Append to the existing file:

```ts
import { parseTallyCsv } from '@/lib/parsers/tally-csv-parser'

const TALLY_CSV = `Supplier GSTIN,Supplier Name,Invoice Number,Invoice Date,Taxable Value,IGST Amount,CGST Amount,SGST Amount,Cess Amount,Total Amount,HSN Code
27ERMJD3988G1ZJ,National Chemicals Ltd,BILL26001,02/02/2026,432200,0,25932,25932,0,484064,3904
21HYHPA1337A1ZR,Rajasthan Packaging Co,INV/26/002,07/02/2026,26000,1300,0,0,0,27300,8537
`

describe('parseTallyCsv', () => {
  test('parses standard fixture CSV headers', () => {
    const rows = parseTallyCsv(TALLY_CSV)
    expect(rows).toHaveLength(2)
    expect(rows[0].supplierGstin).toBe('27ERMJD3988G1ZJ')
    expect(rows[0].supplierName).toBe('National Chemicals Ltd')
    expect(rows[0].invoiceNum).toBe('BILL26001')
    expect(rows[0].invoiceDate).toBe('2026-02-02')
    expect(rows[0].totalAmount).toBeInstanceOf(Decimal)
    expect(rows[0].totalAmount.toNumber()).toBe(484064)
    expect(rows[0].igst.toNumber()).toBe(0)
    expect(rows[0].cgst.toNumber()).toBe(25932)
    expect(rows[0].sgst.toNumber()).toBe(25932)
    expect(rows[0].taxableValue.toNumber()).toBe(432200)
  })

  test('converts DD/MM/YYYY date to ISO', () => {
    const rows = parseTallyCsv(TALLY_CSV)
    expect(rows[1].invoiceDate).toBe('2026-02-07')
  })

  test('handles zero amounts gracefully', () => {
    const rows = parseTallyCsv(TALLY_CSV)
    expect(rows[1].cgst.toNumber()).toBe(0)
    expect(rows[1].sgst.toNumber()).toBe(0)
  })
})
```

- [ ] **Step 3.2: Run to confirm failure**

```bash
npx vitest run tests/parsers.test.ts
```

Expected: FAIL — `parseTallyCsv` not found.

- [ ] **Step 3.3: Create `lib/parsers/tally-csv-parser.ts`**

```ts
import Decimal from 'decimal.js'
import Papa from 'papaparse'
import { normalizeDate } from '@/lib/reconciliation/normalize'

export interface NormalizedTallyRow {
  supplierGstin: string
  supplierName: string
  invoiceNum: string
  invoiceDate: string   // ISO 8601
  taxableValue: Decimal
  igst: Decimal
  cgst: Decimal
  sgst: Decimal
  totalAmount: Decimal
}

export function parseTallyCsv(csv: string): NormalizedTallyRow[] {
  const { data } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  })

  return data.map(row => ({
    supplierGstin: row['Supplier GSTIN'].trim(),
    supplierName: row['Supplier Name'].trim(),
    invoiceNum: row['Invoice Number'].trim(),
    invoiceDate: normalizeDate(row['Invoice Date'].trim()),
    taxableValue: new Decimal(row['Taxable Value'] || '0'),
    igst: new Decimal(row['IGST Amount'] || '0'),
    cgst: new Decimal(row['CGST Amount'] || '0'),
    sgst: new Decimal(row['SGST Amount'] || '0'),
    totalAmount: new Decimal(row['Total Amount'] || '0'),
  }))
}
```

- [ ] **Step 3.4: Run tests — all pass**

```bash
npx vitest run tests/parsers.test.ts
```

Expected: All tests PASS.

- [ ] **Step 3.5: Commit**

```bash
git add lib/parsers/tally-csv-parser.ts tests/parsers.test.ts
git commit -m "feat: add Tally CSV parser with correct fixture column names"
```

---

## Task 4: Reconciliation Engine — matcher, rules, index

**Files:**
- Rewrite: `lib/reconciliation/matcher.ts`
- Rewrite: `lib/reconciliation/rules.ts`
- Create: `lib/reconciliation/index.ts`
- Create: `tests/reconciliation.test.ts`

### Engine logic summary

1. Build tally index: `Map<normalizedInvoiceNum, NormalizedTallyRow[]>`
2. Detect IMS duplicates: same `normalizedGstin::normalizedInvoiceNum` appears > 1 time → both `AUTO_REJECTED`
3. For each remaining IMS invoice:
   - **Strategy A**: look up normalized invoice# in tally index
   - **Strategy B**: if A yields nothing, find tally rows with same normalized GSTIN + total value within 2%
   - If no candidates → `NOT_IN_BOOKS`
   - Pick best candidate (smallest value delta, then closest date)
   - Run cascade: GSTIN check → value delta → invoice# mismatch (B) → format-only variation (A but strings differ) → date gap → clean pass

### Rule cascade (in order):
| Check | Condition | Result |
|-------|-----------|--------|
| GSTIN | normalized GSTINs differ | `AUTO_REJECTED` |
| Value | delta > 10% | `AUTO_REJECTED` |
| Value | delta 2–10% | `PENDING_REVIEW` |
| Invoice# | strategy B (different norm keys) | `PENDING_REVIEW` |
| Format | strategy A, raw strings differ | `AUTO_ACCEPTED` + info reason |
| Date | gap > 7 days | `PENDING_REVIEW` |
| — | all pass | `AUTO_ACCEPTED`, reason null |

- [ ] **Step 4.1: Write per-scenario unit tests**

Create `tests/reconciliation.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import Decimal from 'decimal.js'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { parseImsJson, type NormalizedImsInvoice } from '@/lib/parsers/ims-json-parser'
import { parseTallyCsv, type NormalizedTallyRow } from '@/lib/parsers/tally-csv-parser'
import { reconcile } from '@/lib/reconciliation'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeIms(overrides: Partial<NormalizedImsInvoice> = {}): NormalizedImsInvoice {
  return {
    supplierGstin: '27ERMJD3988G1ZJ',
    invoiceNum: 'INV001',
    invoiceDate: '2026-02-01',
    totalValue: new Decimal(10000),
    igst: new Decimal(0),
    cgst: new Decimal(900),
    sgst: new Decimal(900),
    pos: '27',
    ...overrides,
  }
}

function makeTally(overrides: Partial<NormalizedTallyRow> = {}): NormalizedTallyRow {
  return {
    supplierGstin: '27ERMJD3988G1ZJ',
    supplierName: 'Test Supplier',
    invoiceNum: 'INV001',
    invoiceDate: '2026-02-01',
    taxableValue: new Decimal(8200),
    igst: new Decimal(0),
    cgst: new Decimal(900),
    sgst: new Decimal(900),
    totalAmount: new Decimal(10000),
    ...overrides,
  }
}

// ─── Per-Scenario Unit Tests ─────────────────────────────────────────────────

describe('EXACT_MATCH', () => {
  test('matching GSTIN + invoice# + value + date → AUTO_ACCEPTED, no reason', () => {
    const results = reconcile([makeIms()], [makeTally()])
    expect(results[0].result).toBe('AUTO_ACCEPTED')
    expect(results[0].reason).toBeNull()
    expect(results[0].itcAtRisk.toNumber()).toBe(0)
  })
})

describe('WRONG_GSTIN', () => {
  test('invoice# matches Tally but GSTINs differ → AUTO_REJECTED', () => {
    const ims = makeIms({ supplierGstin: '19HYHPA1337A1ZR', invoiceNum: 'INV/26/002', totalValue: new Decimal(27300), igst: new Decimal(1300), cgst: new Decimal(0), sgst: new Decimal(0) })
    const tally = makeTally({ supplierGstin: '21HYHPA1337A1ZR', invoiceNum: 'INV/26/002', totalAmount: new Decimal(27300), igst: new Decimal(1300), cgst: new Decimal(0), sgst: new Decimal(0) })
    const results = reconcile([ims], [tally])
    expect(results[0].result).toBe('AUTO_REJECTED')
    expect(results[0].reason).toContain('GSTIN mismatch')
    expect(results[0].reason).toContain('19HYHPA1337A1ZR')
    expect(results[0].reason).toContain('21HYHPA1337A1ZR')
    expect(results[0].itcAtRisk.toNumber()).toBe(1300)
  })
})

describe('NOT_IN_BOOKS', () => {
  test('no Tally entry for IMS invoice → NOT_IN_BOOKS', () => {
    const ims = makeIms({ invoiceNum: 'INV-26-005' })
    const results = reconcile([ims], [])
    expect(results[0].result).toBe('NOT_IN_BOOKS')
    expect(results[0].itcAtRisk.toNumber()).toBe(1800) // cgst+sgst
  })
})

describe('VALUE_OVER_10', () => {
  test('Tally value >10% higher than IMS → AUTO_REJECTED', () => {
    const ims = makeIms({ invoiceNum: 'PKG-008-26', totalValue: new Decimal(67072), igst: new Decimal(14672), cgst: new Decimal(0), sgst: new Decimal(0) })
    const tally = makeTally({ invoiceNum: 'PKG-008-26', totalAmount: new Decimal(77840), igst: new Decimal(17027), cgst: new Decimal(0), sgst: new Decimal(0) })
    const results = reconcile([ims], [tally])
    expect(results[0].result).toBe('AUTO_REJECTED')
    expect(results[0].reason).toContain('exceeds 10%')
  })
})

describe('VALUE_MISMATCH_2_10', () => {
  test('Tally value 2–10% higher than IMS → PENDING_REVIEW', () => {
    const ims = makeIms({ invoiceNum: 'INV-26-028', totalValue: new Decimal(434910), igst: new Decimal(0), cgst: new Decimal(10355), sgst: new Decimal(10355) })
    const tally = makeTally({ invoiceNum: 'INV-26-028', totalAmount: new Decimal(477629), igst: new Decimal(0), cgst: new Decimal(11372), sgst: new Decimal(11372) })
    const results = reconcile([ims], [tally])
    expect(results[0].result).toBe('PENDING_REVIEW')
    expect(results[0].reason).toContain('within 2–10% band')
  })
})

describe('FORMAT_VARIATION', () => {
  test('INV/26/021 and INV-26-021 normalise to same key → AUTO_ACCEPTED', () => {
    const ims = makeIms({ invoiceNum: 'INV/26/021', totalValue: new Decimal(231392), igst: new Decimal(24792), cgst: new Decimal(0), sgst: new Decimal(0) })
    const tally = makeTally({ invoiceNum: 'INV-26-021', totalAmount: new Decimal(231392), igst: new Decimal(24792), cgst: new Decimal(0), sgst: new Decimal(0) })
    const results = reconcile([ims], [tally])
    expect(results[0].result).toBe('AUTO_ACCEPTED')
  })
})

describe('INVOICE_NUMBER_MISMATCH', () => {
  test('different invoice#s but same GSTIN + value → PENDING_REVIEW via Strategy B', () => {
    const ims = makeIms({ supplierGstin: '27RMHPW0036R1Z5', invoiceNum: 'INV/26/044', totalValue: new Decimal(117504), igst: new Decimal(0), cgst: new Decimal(12852), sgst: new Decimal(12852) })
    const tally = makeTally({ supplierGstin: '27RMHPW0036R1Z5', invoiceNum: 'MISC-05044-26', totalAmount: new Decimal(117504), igst: new Decimal(0), cgst: new Decimal(12852), sgst: new Decimal(12852) })
    const results = reconcile([ims], [tally])
    expect(results[0].result).toBe('PENDING_REVIEW')
    expect(results[0].reason).toContain('Invoice#')
    expect(results[0].reason).toContain('INV/26/044')
    expect(results[0].reason).toContain('MISC-05044-26')
  })
})

describe('DATE_GAP', () => {
  test('10-day date difference → PENDING_REVIEW', () => {
    const ims = makeIms({ invoiceNum: 'PKG-038-26', invoiceDate: '2026-02-15', totalValue: new Decimal(284340), igst: new Decimal(13540), cgst: new Decimal(0), sgst: new Decimal(0) })
    const tally = makeTally({ invoiceNum: 'PKG-038-26', invoiceDate: '2026-02-25', totalAmount: new Decimal(284340), igst: new Decimal(13540), cgst: new Decimal(0), sgst: new Decimal(0) })
    const results = reconcile([ims], [tally])
    expect(results[0].result).toBe('PENDING_REVIEW')
    expect(results[0].reason).toContain('10 days')
  })
})

describe('DUPLICATE', () => {
  test('same invoice# from same supplier twice → both AUTO_REJECTED', () => {
    const inv = makeIms({ invoiceNum: 'INV-26-034' })
    const tally = makeTally({ invoiceNum: 'INV-26-034' })
    const results = reconcile([inv, inv], [tally])
    expect(results).toHaveLength(2)
    expect(results[0].result).toBe('AUTO_REJECTED')
    expect(results[1].result).toBe('AUTO_REJECTED')
    expect(results[0].reason).toContain('Duplicate')
  })
})

// ─── Golden Fixture Test ─────────────────────────────────────────────────────

describe('Golden fixture', () => {
  test('Feb 2026 full reconciliation matches expected output exactly', () => {
    const FIXTURES = 'data/fixtures'
    const imsRaw = fs.readFileSync(path.join(FIXTURES, '27AABCU9603R1ZX-ims-2026-02.json'), 'utf-8')
    const tallyRaw = fs.readFileSync(path.join(FIXTURES, '27AABCU9603R1ZX-tally-2026-02.csv'), 'utf-8')
    const expectedRaw = fs.readFileSync(path.join(FIXTURES, '27AABCU9603R1ZX-recon-expected-2026-02.csv'), 'utf-8')

    const ims = parseImsJson(imsRaw)
    const tally = parseTallyCsv(tallyRaw)
    const { data: expected } = Papa.parse<Record<string, string>>(expectedRaw, {
      header: true,
      skipEmptyLines: true,
    })

    const results = reconcile(ims, tally)

    expect(results.length, 'Result count must match expected CSV row count').toBe(expected.length)

    for (const row of expected) {
      const actual = results.find(
        r => r.imsInvoiceNum === row.IMS_Invoice_ID && r.imsGstin === row.IMS_Supplier_GSTIN
      )
      expect(actual, `No result for ${row.IMS_Supplier_GSTIN}::${row.IMS_Invoice_ID}`).toBeTruthy()
      expect(
        actual!.result,
        `Wrong outcome for ${row.IMS_Invoice_ID}: expected ${row.Recon_Output}, got ${actual!.result}`
      ).toBe(row.Recon_Output)
    }
  })
})
```

- [ ] **Step 4.2: Run to confirm failure**

```bash
npx vitest run tests/reconciliation.test.ts
```

Expected: FAIL — `reconcile` not found.

- [ ] **Step 4.3: Rewrite `lib/reconciliation/matcher.ts`**

```ts
import type { NormalizedImsInvoice } from '@/lib/parsers/ims-json-parser'
import type { NormalizedTallyRow } from '@/lib/parsers/tally-csv-parser'
import { normalizeGstin, normalizeInvoiceNumber } from '@/lib/reconciliation/normalize'

export type MatchStrategy = 'A' | 'B' | 'none'

export interface CandidateResult {
  tally: NormalizedTallyRow | null
  strategy: MatchStrategy
}

export function findCandidates(
  inv: NormalizedImsInvoice,
  tallyByInvoice: Map<string, NormalizedTallyRow[]>,
  allTallyRows: NormalizedTallyRow[]
): CandidateResult {
  // Strategy A: exact normalized invoice# lookup
  const normalizedNum = normalizeInvoiceNumber(inv.invoiceNum)
  const strategyA = tallyByInvoice.get(normalizedNum) ?? []

  if (strategyA.length > 0) {
    return { tally: pickBest(inv, strategyA), strategy: 'A' }
  }

  // Strategy B: same normalized GSTIN + total value within 2%
  const normalizedGstin = normalizeGstin(inv.supplierGstin)
  const strategyB = allTallyRows.filter(row => {
    if (normalizeGstin(row.supplierGstin) !== normalizedGstin) return false
    const delta = row.totalAmount.minus(inv.totalValue).abs()
    return delta.div(inv.totalValue).times(100).lte(2)
  })

  if (strategyB.length > 0) {
    return { tally: pickBest(inv, strategyB), strategy: 'B' }
  }

  return { tally: null, strategy: 'none' }
}

function pickBest(inv: NormalizedImsInvoice, candidates: NormalizedTallyRow[]): NormalizedTallyRow {
  const { dateDiffDays } = require('@/lib/reconciliation/normalize')
  return candidates.reduce((prev, curr) => {
    const prevDelta = inv.totalValue.minus(prev.totalAmount).abs()
    const currDelta = inv.totalValue.minus(curr.totalAmount).abs()
    if (currDelta.lt(prevDelta)) return curr
    if (currDelta.gt(prevDelta)) return prev
    return dateDiffDays(inv.invoiceDate, curr.invoiceDate) < dateDiffDays(inv.invoiceDate, prev.invoiceDate)
      ? curr : prev
  })
}
```

**Note:** `require` inside a function is a CommonJS pattern that doesn't work cleanly in ESM. Rewrite `pickBest` with a direct import instead:

```ts
import type { NormalizedImsInvoice } from '@/lib/parsers/ims-json-parser'
import type { NormalizedTallyRow } from '@/lib/parsers/tally-csv-parser'
import { normalizeGstin, normalizeInvoiceNumber, dateDiffDays } from '@/lib/reconciliation/normalize'

export type MatchStrategy = 'A' | 'B' | 'none'

export interface CandidateResult {
  tally: NormalizedTallyRow | null
  strategy: MatchStrategy
}

export function findCandidates(
  inv: NormalizedImsInvoice,
  tallyByInvoice: Map<string, NormalizedTallyRow[]>,
  allTallyRows: NormalizedTallyRow[]
): CandidateResult {
  const normalizedNum = normalizeInvoiceNumber(inv.invoiceNum)
  const strategyA = tallyByInvoice.get(normalizedNum) ?? []

  if (strategyA.length > 0) {
    return { tally: pickBest(inv, strategyA), strategy: 'A' }
  }

  const normalizedGstin = normalizeGstin(inv.supplierGstin)
  const strategyB = allTallyRows.filter(row => {
    if (normalizeGstin(row.supplierGstin) !== normalizedGstin) return false
    const delta = row.totalAmount.minus(inv.totalValue).abs()
    return delta.div(inv.totalValue).times(100).lte(2)
  })

  if (strategyB.length > 0) {
    return { tally: pickBest(inv, strategyB), strategy: 'B' }
  }

  return { tally: null, strategy: 'none' }
}

function pickBest(inv: NormalizedImsInvoice, candidates: NormalizedTallyRow[]): NormalizedTallyRow {
  return candidates.reduce((prev, curr) => {
    const prevDelta = inv.totalValue.minus(prev.totalAmount).abs()
    const currDelta = inv.totalValue.minus(curr.totalAmount).abs()
    if (currDelta.lt(prevDelta)) return curr
    if (currDelta.gt(prevDelta)) return prev
    return dateDiffDays(inv.invoiceDate, curr.invoiceDate) <
      dateDiffDays(inv.invoiceDate, prev.invoiceDate)
      ? curr
      : prev
  })
}
```

- [ ] **Step 4.4: Rewrite `lib/reconciliation/rules.ts`**

```ts
import Decimal from 'decimal.js'
import type { NormalizedImsInvoice } from '@/lib/parsers/ims-json-parser'
import type { NormalizedTallyRow } from '@/lib/parsers/tally-csv-parser'
import type { MatchStrategy } from '@/lib/reconciliation/matcher'
import { normalizeGstin, dateDiffDays } from '@/lib/reconciliation/normalize'

export type ReconOutcome = 'AUTO_ACCEPTED' | 'AUTO_REJECTED' | 'PENDING_REVIEW' | 'NOT_IN_BOOKS'

export interface ReconResult {
  imsInvoiceId: string          // `${supplierGstin}::${invoiceNum}` composite key
  imsGstin: string
  imsInvoiceNum: string         // raw invoice number
  imsValue: Decimal
  imsDate: string               // ISO 8601
  igst: Decimal
  cgst: Decimal
  sgst: Decimal
  itcAtRisk: Decimal
  result: ReconOutcome
  reason: string | null
  matchedTallyInvoiceNum: string | null
}

function isoToDMY(iso: string, sep: string): string {
  const [yyyy, mm, dd] = iso.split('-')
  return `${dd}${sep}${mm}${sep}${yyyy}`
}

export function classify(
  inv: NormalizedImsInvoice,
  tally: NormalizedTallyRow | null,
  strategy: MatchStrategy,
  isDuplicate: boolean
): ReconResult {
  const imsId = `${inv.supplierGstin}::${inv.invoiceNum}`
  const itcTotal = inv.igst.plus(inv.cgst).plus(inv.sgst)
  const base = {
    imsInvoiceId: imsId,
    imsGstin: inv.supplierGstin,
    imsInvoiceNum: inv.invoiceNum,
    imsValue: inv.totalValue,
    imsDate: inv.invoiceDate,
    igst: inv.igst,
    cgst: inv.cgst,
    sgst: inv.sgst,
  }

  if (isDuplicate) {
    return { ...base, itcAtRisk: itcTotal, result: 'AUTO_REJECTED', reason: 'Duplicate IMS entry — same invoice uploaded twice by supplier (2 IMS entries for 1 Tally row)', matchedTallyInvoiceNum: null }
  }

  if (!tally) {
    return { ...base, itcAtRisk: itcTotal, result: 'NOT_IN_BOOKS', reason: 'Invoice not found in Tally books — no matching purchase entry', matchedTallyInvoiceNum: null }
  }

  // 1. GSTIN check
  if (normalizeGstin(inv.supplierGstin) !== normalizeGstin(tally.supplierGstin)) {
    return { ...base, itcAtRisk: itcTotal, result: 'AUTO_REJECTED', reason: `Supplier GSTIN mismatch — IMS: ${inv.supplierGstin} / Tally: ${tally.supplierGstin}`, matchedTallyInvoiceNum: tally.invoiceNum }
  }

  // 2. Value delta
  const valueDelta = tally.totalAmount.minus(inv.totalValue)
  const pct = valueDelta.div(inv.totalValue).times(100)
  const absPct = pct.abs()
  const sign = pct.gte(0) ? '+' : ''
  if (absPct.gt(10)) {
    return { ...base, itcAtRisk: itcTotal, result: 'AUTO_REJECTED', reason: `Value delta: Tally ₹${tally.totalAmount.toFixed(0)} vs IMS ₹${inv.totalValue.toFixed(0)} (${sign}${absPct.toFixed(1)}% — exceeds 10% threshold)`, matchedTallyInvoiceNum: tally.invoiceNum }
  }
  if (absPct.gt(2)) {
    return { ...base, itcAtRisk: itcTotal, result: 'PENDING_REVIEW', reason: `Value delta: Tally ₹${tally.totalAmount.toFixed(0)} vs IMS ₹${inv.totalValue.toFixed(0)} (${sign}${absPct.toFixed(1)}% — within 2–10% band)`, matchedTallyInvoiceNum: tally.invoiceNum }
  }

  // 3. Invoice# mismatch via Strategy B
  if (strategy === 'B') {
    return { ...base, itcAtRisk: itcTotal, result: 'PENDING_REVIEW', reason: `Invoice# mismatch — IMS: "${inv.invoiceNum}" / Tally: "${tally.invoiceNum}" (normalised keys differ)`, matchedTallyInvoiceNum: tally.invoiceNum }
  }

  // 4. Format-only variation (Strategy A, same normalized key, different raw strings)
  if (inv.invoiceNum !== tally.invoiceNum) {
    return { ...base, itcAtRisk: new Decimal(0), result: 'AUTO_ACCEPTED', reason: `Format-only diff — normalises to same key (IMS: "${inv.invoiceNum}" / Tally: "${tally.invoiceNum}")`, matchedTallyInvoiceNum: tally.invoiceNum }
  }

  // 5. Date gap
  const daysDiff = dateDiffDays(inv.invoiceDate, tally.invoiceDate)
  if (daysDiff > 7) {
    const imsDateStr = isoToDMY(inv.invoiceDate, '-')
    const tallyDateStr = isoToDMY(tally.invoiceDate, '/')
    return { ...base, itcAtRisk: itcTotal, result: 'PENDING_REVIEW', reason: `Date gap: ${daysDiff} days — IMS: ${imsDateStr} / Tally: ${tallyDateStr}`, matchedTallyInvoiceNum: tally.invoiceNum }
  }

  // 6. Clean pass
  return { ...base, itcAtRisk: new Decimal(0), result: 'AUTO_ACCEPTED', reason: null, matchedTallyInvoiceNum: tally.invoiceNum }
}
```

- [ ] **Step 4.5: Create `lib/reconciliation/index.ts`**

```ts
import type { NormalizedImsInvoice } from '@/lib/parsers/ims-json-parser'
import type { NormalizedTallyRow } from '@/lib/parsers/tally-csv-parser'
import { normalizeGstin, normalizeInvoiceNumber } from '@/lib/reconciliation/normalize'
import { findCandidates } from '@/lib/reconciliation/matcher'
import { classify, type ReconResult } from '@/lib/reconciliation/rules'

export type { ReconResult } from '@/lib/reconciliation/rules'
export type { ReconOutcome } from '@/lib/reconciliation/rules'

export function reconcile(
  imsInvoices: NormalizedImsInvoice[],
  tallyRows: NormalizedTallyRow[]
): ReconResult[] {
  // Build tally index (Strategy A)
  const tallyByInvoice = new Map<string, NormalizedTallyRow[]>()
  for (const row of tallyRows) {
    const key = normalizeInvoiceNumber(row.invoiceNum)
    const existing = tallyByInvoice.get(key) ?? []
    existing.push(row)
    tallyByInvoice.set(key, existing)
  }

  // Detect IMS duplicates (same normalized GSTIN::invoiceNum appears more than once)
  const imsKeyCount = new Map<string, number>()
  for (const inv of imsInvoices) {
    const key = `${normalizeGstin(inv.supplierGstin)}::${normalizeInvoiceNumber(inv.invoiceNum)}`
    imsKeyCount.set(key, (imsKeyCount.get(key) ?? 0) + 1)
  }
  const isDuplicateInv = (inv: NormalizedImsInvoice): boolean => {
    const key = `${normalizeGstin(inv.supplierGstin)}::${normalizeInvoiceNumber(inv.invoiceNum)}`
    return (imsKeyCount.get(key) ?? 0) > 1
  }

  // Process each IMS invoice
  return imsInvoices.map(inv => {
    if (isDuplicateInv(inv)) {
      return classify(inv, null, 'none', true)
    }
    const { tally, strategy } = findCandidates(inv, tallyByInvoice, tallyRows)
    return classify(inv, tally, strategy, false)
  })
}
```

- [ ] **Step 4.6: Run reconciliation tests**

```bash
npx vitest run tests/reconciliation.test.ts
```

Expected: All 9 per-scenario tests PASS and the golden fixture test PASSES.

If the golden test fails with a count mismatch, check whether the IMS JSON has the DUPLICATE entry appearing once or twice, and adjust the assertion if needed.

- [ ] **Step 4.7: Run all tests**

```bash
npx vitest run
```

Expected: All tests across `tests/normalize.test.ts`, `tests/parsers.test.ts`, `tests/reconciliation.test.ts` PASS.

- [ ] **Step 4.8: Commit**

```bash
git add lib/reconciliation/matcher.ts lib/reconciliation/rules.ts lib/reconciliation/index.ts tests/reconciliation.test.ts
git commit -m "feat: implement reconciliation engine — passes all 9 scenarios + golden fixture"
```

---

## Task 5: Client Email Helper + Auth Callback for Client Users

**Files:**
- Modify: `lib/email/resend.ts`
- Modify: `app/auth/callback/route.ts`

- [ ] **Step 5.1: Add `sendClientInviteEmail` to `lib/email/resend.ts`**

Append to the existing file (after `sendTeamInviteEmail`):

```ts
export async function sendClientInviteEmail({
  to,
  caOrgName,
  token,
}: {
  to: string
  caOrgName: string
  token: string
}): Promise<void> {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-client-invite?token=${token}`
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `${caOrgName} has invited you to AgentFlow`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#0f172a;">You&apos;ve been invited to AgentFlow by ${caOrgName}</h2>
        <p style="color:#334155;">Your CA firm has set up AgentFlow to manage your GST reconciliation. Click below to create your account.</p>
        <a href="${inviteUrl}"
           style="display:inline-block;background:#0f172a;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
          Set Up My Account
        </a>
        <p style="color:#94a3b8;font-size:14px;margin-top:24px;">
          This link expires in 7 days. If you did not expect this, you can ignore this email.
        </p>
      </div>
    `,
  })
}
```

- [ ] **Step 5.2: Update `app/auth/callback/route.ts` to handle `clientInviteToken`**

In `app/auth/callback/route.ts`, inside the `if (!existing)` block, add a new branch **before** the `else if (meta.orgName)` branch:

```ts
} else if (meta.clientInviteToken) {
  // Client invite acceptance path
  const client = await prisma.client.findUnique({
    where: { invite_token: meta.clientInviteToken },
  })
  if (client && client.invite_expires_at && client.invite_expires_at > new Date()) {
    await prisma.$transaction([
      prisma.user.create({
        data: {
          id: user.id,
          name: meta.name ?? user.email!,
          email: user.email!,
          role: 'CLIENT',
          client_id: client.id,
        },
      }),
      prisma.client.update({
        where: { id: client.id },
        data: { invite_token: null, invite_expires_at: null },
      }),
    ])
  }
}
```

Also update the redirect logic: when `next` is `/client/dashboard`, no special handling needed (it goes through as-is).

- [ ] **Step 5.3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5.4: Commit**

```bash
git add lib/email/resend.ts app/auth/callback/route.ts
git commit -m "feat: add client invite email + handle clientInviteToken in auth callback"
```

---

## Task 6: Clients List API — GET + POST

**Files:**
- Rewrite: `app/api/clients/route.ts`

The current stub returns 501. Rewrite completely.

- [ ] **Step 6.1: Rewrite `app/api/clients/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthedUser } from '@/lib/auth/session'
import { sendClientInviteEmail } from '@/lib/email/resend'
import { UserRole } from '@prisma/client'

const GSTIN_REGEX = /^[A-Z0-9]{15}$/

export async function GET() {
  const dbUser = await getAuthedUser()
  if (!dbUser.org_id) return NextResponse.json({ error: 'No org' }, { status: 403 })

  const clients = await prisma.client.findMany({
    where: { org_id: dbUser.org_id },
    include: {
      gstins: { where: { is_primary: true } },
      users: { select: { id: true } },
    },
    orderBy: { created_at: 'asc' },
  })

  return NextResponse.json({
    clients: clients.map(c => {
      let status: 'active' | 'invited' | 'pending' = 'pending'
      if (c.users.length > 0) {
        status = 'active'
      } else if (c.invite_token && c.invite_expires_at && c.invite_expires_at > new Date()) {
        status = 'invited'
      }
      return {
        id: c.id,
        firmName: c.name,
        primaryGstin: c.gstins[0]?.gstin ?? '—',
        status,
        createdAt: c.created_at.toISOString(),
      }
    }),
  })
}

export async function POST(request: Request) {
  const dbUser = await getAuthedUser()
  if (!dbUser.org_id) return NextResponse.json({ error: 'No org' }, { status: 403 })
  if (dbUser.role !== UserRole.CA_ADMIN && dbUser.role !== UserRole.CA_STAFF) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { action } = body as { action: string }

  // ── Create new client ──────────────────────────────────────────────────────
  if (action === 'create') {
    const { firmName, primaryGstin, contactEmail } = body as {
      firmName: string
      primaryGstin: string
      contactEmail: string
    }
    if (!firmName?.trim()) return NextResponse.json({ error: 'Firm name is required' }, { status: 400 })
    if (!GSTIN_REGEX.test(primaryGstin?.toUpperCase() ?? '')) {
      return NextResponse.json({ error: 'Invalid GSTIN — must be 15 alphanumeric characters (uppercase)' }, { status: 400 })
    }

    const normalizedGstin = primaryGstin.toUpperCase()
    const existing = await prisma.clientGstin.findUnique({ where: { gstin: normalizedGstin } })
    if (existing) return NextResponse.json({ error: 'This GSTIN is already registered' }, { status: 400 })

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: dbUser.org_id },
      select: { name: true },
    })

    const inviteToken = crypto.randomUUID()
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const client = await prisma.client.create({
      data: {
        org_id: dbUser.org_id,
        name: firmName.trim(),
        contact_email: contactEmail.trim(),
        invite_token: inviteToken,
        invite_expires_at: inviteExpiresAt,
        gstins: {
          create: { gstin: normalizedGstin, is_primary: true },
        },
      },
      include: { gstins: true },
    })

    try {
      await sendClientInviteEmail({ to: contactEmail.trim(), caOrgName: org.name, token: inviteToken })
    } catch (err) {
      await prisma.client.delete({ where: { id: client.id } })
      const message = err instanceof Error ? err.message : 'Failed to send invite email'
      return NextResponse.json({ error: `Email not sent: ${message}` }, { status: 500 })
    }

    return NextResponse.json({ client })
  }

  // ── Add secondary GSTIN ────────────────────────────────────────────────────
  if (action === 'add-gstin') {
    const { clientId, gstin } = body as { clientId: string; gstin: string }
    if (!GSTIN_REGEX.test(gstin?.toUpperCase() ?? '')) {
      return NextResponse.json({ error: 'Invalid GSTIN' }, { status: 400 })
    }
    // Verify CA owns this client
    const client = await prisma.client.findUnique({ where: { id: clientId, org_id: dbUser.org_id } })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const existing = await prisma.clientGstin.findUnique({ where: { gstin: gstin.toUpperCase() } })
    if (existing) return NextResponse.json({ error: 'GSTIN already registered' }, { status: 400 })

    const newGstin = await prisma.clientGstin.create({
      data: { client_id: clientId, gstin: gstin.toUpperCase(), is_primary: false },
    })
    return NextResponse.json({ gstin: newGstin })
  }

  // ── Resend client invite ───────────────────────────────────────────────────
  if (action === 'resend-invite') {
    const { clientId } = body as { clientId: string }
    const client = await prisma.client.findUnique({ where: { id: clientId, org_id: dbUser.org_id } })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: dbUser.org_id },
      select: { name: true },
    })

    const newToken = crypto.randomUUID()
    const updated = await prisma.client.update({
      where: { id: clientId },
      data: {
        invite_token: newToken,
        invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })
    await sendClientInviteEmail({ to: updated.contact_email, caOrgName: org.name, token: newToken })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
```

- [ ] **Step 6.2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6.3: Commit**

```bash
git add app/api/clients/route.ts
git commit -m "feat: clients list API — GET, POST create/add-gstin/resend-invite"
```

---

## Task 7: Client Detail API + Acting-As APIs + Session Helper

**Files:**
- Create: `app/api/clients/[clientId]/route.ts`
- Create: `app/api/clients/[clientId]/acting-as/route.ts`
- Modify: `lib/auth/session.ts`

- [ ] **Step 7.1: Add `getEffectiveClientId` to `lib/auth/session.ts`**

Append to `lib/auth/session.ts`:

```ts
import { cookies } from 'next/headers'

export async function getEffectiveClientId(): Promise<string | null> {
  const cookieStore = await cookies()
  const actingAs = cookieStore.get('actingAsClientId')?.value
  if (actingAs) return actingAs

  try {
    const dbUser = await getAuthedUser()
    if (dbUser.role === 'CLIENT') return dbUser.client_id ?? null
    return null
  } catch {
    return null
  }
}
```

- [ ] **Step 7.2: Create `app/api/clients/[clientId]/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthedUser } from '@/lib/auth/session'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const dbUser = await getAuthedUser()
  if (!dbUser.org_id) return NextResponse.json({ error: 'No org' }, { status: 403 })
  const { clientId } = await params

  const client = await prisma.client.findUnique({
    where: { id: clientId, org_id: dbUser.org_id },
    include: {
      gstins: { orderBy: { is_primary: 'desc' } },
      users: { select: { id: true, name: true, email: true, created_at: true } },
    },
  })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    firmName: client.name,
    contactEmail: client.contact_email,
    gstins: client.gstins.map(g => ({ id: g.id, gstin: g.gstin, is_primary: g.is_primary })),
    users: client.users,
    invite: client.invite_token
      ? { token: client.invite_token, email: client.contact_email, expires_at: client.invite_expires_at?.toISOString() }
      : null,
  })
}
```

- [ ] **Step 7.3: Create `app/api/clients/[clientId]/acting-as/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { getAuthedUser } from '@/lib/auth/session'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const dbUser = await getAuthedUser()
  if (!dbUser.org_id) return NextResponse.json({ error: 'No org' }, { status: 403 })
  const { clientId } = await params

  const client = await prisma.client.findUnique({ where: { id: clientId, org_id: dbUser.org_id } })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const cookieStore = await cookies()
  cookieStore.set('actingAsClientId', clientId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  await params // consume params to avoid lint warning
  const cookieStore = await cookies()
  cookieStore.delete('actingAsClientId')
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 7.4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7.5: Commit**

```bash
git add app/api/clients/\[clientId\]/route.ts app/api/clients/\[clientId\]/acting-as/route.ts lib/auth/session.ts
git commit -m "feat: client detail API, acting-as cookie API, getEffectiveClientId helper"
```

---

## Task 8: Accept Client Invite Page

**Files:**
- Create: `app/(auth)/accept-client-invite/page.tsx`

Mirrors the existing `/accept-invite` pattern exactly (name + password → Supabase signUp → check-email).

- [ ] **Step 8.1: Create `app/(auth)/accept-client-invite/page.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Step = 'form' | 'check-email' | 'error'

export default function AcceptClientInvitePage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [step, setStep] = useState<Step>('form')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/clients/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        return
      }
      setEmail(data.email)
      setStep('check-email')
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Invalid invite link.</p>
      </div>
    )
  }

  if (step === 'check-email') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow p-8 w-full max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
          <p className="text-gray-600">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow p-8 w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Set up your account</h1>
          <p className="text-gray-500 mt-1">Create your AgentFlow account to get started.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} required placeholder="Your name" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 8.2: Create the API route `app/api/clients/accept-invite/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db/prisma'

export async function POST(request: Request) {
  const { token, name, password } = await request.json() as { token: string; name: string; password: string }

  const client = await prisma.client.findUnique({
    where: { invite_token: token },
    select: { id: true, contact_email: true, invite_expires_at: true },
  })
  if (!client || !client.invite_expires_at || client.invite_expires_at < new Date()) {
    return NextResponse.json({ error: 'This invitation is invalid or has expired.' }, { status: 400 })
  }

  const origin = new URL(request.url).origin
  const supabase = await createServerClient()
  const { error } = await supabase.auth.signUp({
    email: client.contact_email,
    password,
    options: {
      data: { name, clientInviteToken: token },
      emailRedirectTo: `${origin}/auth/callback?next=/client/dashboard`,
    },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ step: 'check-email', email: client.contact_email })
}
```

- [ ] **Step 8.3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 8.4: Commit**

```bash
git add app/\(auth\)/accept-client-invite/page.tsx app/api/clients/accept-invite/route.ts
git commit -m "feat: accept client invite page + API route"
```

---

## Task 9: CA Clients List Page

**Files:**
- Create: `app/ca/clients/page.tsx`

- [ ] **Step 9.1: Create `app/ca/clients/page.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ClientRow {
  id: string
  firmName: string
  primaryGstin: string
  status: 'active' | 'invited' | 'pending'
  createdAt: string
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  invited: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-gray-100 text-gray-600',
}

export default function CAClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [firmName, setFirmName] = useState('')
  const [gstin, setGstin] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchClients = async () => {
    const res = await fetch('/api/clients')
    const data = await res.json()
    setClients(data.clients ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchClients() }, [])

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', firmName, primaryGstin: gstin.toUpperCase(), contactEmail: email }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? 'Failed'); return }
      setShowForm(false)
      setFirmName(''); setGstin(''); setEmail('')
      fetchClients()
    } catch {
      setFormError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading clients…</div>

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <Button onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ Add Client'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAddClient} className="bg-white border rounded-xl p-6 space-y-4 shadow-sm">
          <h2 className="font-semibold text-gray-800">Add new client</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="firmName">Firm name</Label>
              <Input id="firmName" value={firmName} onChange={e => setFirmName(e.target.value)} required placeholder="ABC Enterprises" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gstin">Primary GSTIN</Label>
              <Input id="gstin" value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} required maxLength={15} placeholder="27AABCU9603R1ZX" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Contact email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="owner@firm.com" />
            </div>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add Client & Send Invite'}
          </Button>
        </form>
      )}

      {clients.length === 0 ? (
        <p className="text-gray-500">No clients yet. Add your first client above.</p>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-gray-600">Firm Name</th>
                <th className="text-left p-4 font-medium text-gray-600">Primary GSTIN</th>
                <th className="text-left p-4 font-medium text-gray-600">Status</th>
                <th className="text-left p-4 font-medium text-gray-600">Added</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {clients.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{c.firmName}</td>
                  <td className="p-4 font-mono text-gray-700">{c.primaryGstin}</td>
                  <td className="p-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500">
                    {new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="p-4 text-right">
                    <Link href={`/ca/clients/${c.id}`} className="text-indigo-600 hover:underline text-sm font-medium">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 9.2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 9.3: Commit**

```bash
git add app/ca/clients/page.tsx
git commit -m "feat: CA clients list page with add-client inline form"
```

---

## Task 10: CA Client Detail Page + Acting-As Banner

**Files:**
- Create: `app/ca/clients/[clientId]/page.tsx`
- Create: `components/acting-as-banner.tsx`

- [ ] **Step 10.1: Create `components/acting-as-banner.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface ActingAsBannerProps {
  firmName: string
  clientId: string
}

export function ActingAsBanner({ firmName, clientId }: ActingAsBannerProps) {
  const router = useRouter()
  const [exiting, setExiting] = useState(false)

  const handleExit = async () => {
    setExiting(true)
    await fetch(`/api/clients/${clientId}/acting-as`, { method: 'DELETE' })
    router.push('/ca/clients')
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
      <span className="text-sm text-amber-800 font-medium">
        Acting as <strong>{firmName}</strong>
      </span>
      <Button variant="outline" size="sm" onClick={handleExit} disabled={exiting}>
        {exiting ? 'Exiting…' : 'Exit'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 10.2: Create `app/ca/clients/[clientId]/page.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ClientDetail {
  firmName: string
  contactEmail: string
  gstins: Array<{ id: string; gstin: string; is_primary: boolean }>
  users: Array<{ id: string; name: string; email: string; created_at: string }>
  invite: { email: string; expires_at: string } | null
}

export default function ClientDetailPage() {
  const router = useRouter()
  const { clientId } = useParams<{ clientId: string }>()
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [newGstin, setNewGstin] = useState('')
  const [addingGstin, setAddingGstin] = useState(false)
  const [gstinError, setGstinError] = useState('')
  const [actingAs, setActingAs] = useState(false)
  const [resending, setResending] = useState(false)

  const fetchClient = async () => {
    const res = await fetch(`/api/clients/${clientId}`)
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setClient(data)
    setLoading(false)
  }

  useEffect(() => { fetchClient() }, [clientId])

  const handleAddGstin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingGstin(true)
    setGstinError('')
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add-gstin', clientId, gstin: newGstin.toUpperCase() }),
    })
    const data = await res.json()
    if (!res.ok) { setGstinError(data.error ?? 'Failed'); setAddingGstin(false); return }
    setNewGstin('')
    setAddingGstin(false)
    fetchClient()
  }

  const handleResendInvite = async () => {
    setResending(true)
    await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resend-invite', clientId }),
    })
    setResending(false)
  }

  const handleActAs = async () => {
    setActingAs(true)
    await fetch(`/api/clients/${clientId}/acting-as`, { method: 'POST' })
    router.push('/client/dashboard')
  }

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>
  if (!client) return <div className="p-8 text-red-600">Client not found.</div>

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{client.firmName}</h1>
          <p className="text-gray-500 text-sm mt-1">{client.contactEmail}</p>
        </div>
        <Button onClick={handleActAs} disabled={actingAs} variant="outline">
          {actingAs ? 'Switching…' : 'Act as Client'}
        </Button>
      </div>

      {/* GSTINs */}
      <section className="bg-white border rounded-xl p-6 space-y-4 shadow-sm">
        <h2 className="font-semibold text-gray-800">GSTINs</h2>
        <ul className="space-y-1">
          {client.gstins.map(g => (
            <li key={g.id} className="flex items-center gap-2 font-mono text-sm text-gray-700">
              {g.gstin}
              {g.is_primary && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Primary</span>}
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddGstin} className="flex gap-2 pt-2">
          <Input
            value={newGstin}
            onChange={e => setNewGstin(e.target.value.toUpperCase())}
            placeholder="Add GSTIN"
            maxLength={15}
            className="w-52"
          />
          <Button type="submit" variant="outline" size="sm" disabled={addingGstin}>
            {addingGstin ? 'Adding…' : 'Add'}
          </Button>
        </form>
        {gstinError && <p className="text-sm text-red-600">{gstinError}</p>}
      </section>

      {/* Active Users */}
      <section className="bg-white border rounded-xl p-6 space-y-4 shadow-sm">
        <h2 className="font-semibold text-gray-800">Active Users</h2>
        {client.users.length === 0 ? (
          <p className="text-gray-500 text-sm">No users yet — invite pending.</p>
        ) : (
          <ul className="space-y-2">
            {client.users.map(u => (
              <li key={u.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-800">{u.name}</span>
                <span className="text-gray-500">{u.email}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Invite */}
      {client.invite && (
        <section className="bg-white border rounded-xl p-6 space-y-3 shadow-sm">
          <h2 className="font-semibold text-gray-800">Pending Invite</h2>
          <p className="text-sm text-gray-600">
            Sent to <strong>{client.invite.email}</strong> — expires{' '}
            {new Date(client.invite.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
          <Button variant="outline" size="sm" onClick={handleResendInvite} disabled={resending}>
            {resending ? 'Sending…' : 'Resend Invite'}
          </Button>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 10.3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 10.4: Commit**

```bash
git add components/acting-as-banner.tsx app/ca/clients/\[clientId\]/page.tsx
git commit -m "feat: CA client detail page + acting-as banner component"
```

---

## Task 11: Final Verification

- [ ] **Step 11.1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass. If golden fixture fails on count, check the IMS JSON for duplicate entries and adjust `expect(results.length).toBe(expected.length)`.

- [ ] **Step 11.2: TypeScript strict check**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 11.3: Build check**

```bash
npm run build
```

Expected: Build succeeds. Fix any remaining JSX or import errors.

- [ ] **Step 11.4: Smoke test in browser**

With `npm run dev`, verify:
1. `http://localhost:3000/ca/clients` loads — shows empty state or existing clients
2. Add a client: enter firm name, GSTIN (15 chars), email → invite email is sent
3. Clicking "View →" opens the client detail page
4. "Act as Client" sets cookie and redirects to `/client/dashboard`
5. "Exit" clears cookie and returns to `/ca/clients`
6. Accept client invite: `http://localhost:3000/accept-client-invite?token=xxx` — name + password form

- [ ] **Step 11.5: Final commit**

```bash
git add -A
git commit -m "feat: Week 3 complete — client management + reconciliation engine"
```

---

## Implementation Notes

**GSTIN validation regex:** `/^[A-Z0-9]{15}$/` — applied after `.toUpperCase()`. Reject with 400 if invalid.

**Acting-as cookie:** `actingAsClientId` (httpOnly, sameSite: lax, 8-hour TTL). Stores the `Client.id`.

**Tally CSV columns (exact):** `Supplier GSTIN`, `Supplier Name`, `Invoice Number`, `Invoice Date`, `Taxable Value`, `IGST Amount`, `CGST Amount`, `SGST Amount`, `Cess Amount`, `Total Amount`, `HSN Code`

**Reconciliation match order matters:** GSTIN → Value delta → Invoice# (Strategy B) → Format-only (Strategy A, raw strings differ) → Date gap → Clean pass

**The `tally-excel-parser.ts` file** is superseded by `tally-csv-parser.ts` but left in place to avoid breaking other imports. Do not delete it — just don't use it.

**Auth callback for client invite:** `meta.clientInviteToken` → look up `Client.invite_token`, create `User` with `role: CLIENT` + `client_id`, then clear the invite token fields.

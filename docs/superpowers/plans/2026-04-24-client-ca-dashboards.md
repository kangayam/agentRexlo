# Client Dashboard + CA Multi-Client Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/client/dashboard` (action queue with filter chips + mark-done toggle) and `/ca/dashboard` (multi-client ITC risk overview with notify + act-as) to replace their "coming soon" stubs.

**Architecture:** Server components fetch initial data from Prisma directly (matching existing upload page pattern) and pass typed props to client components. Client-side mutations (mark-done, notify) go through dedicated API routes. Pure helper functions in `lib/dashboard/` handle all aggregation logic and are unit-tested independently of the DB.

**Tech Stack:** Next.js 14 App Router, Prisma, Decimal.js, Vitest, Tailwind CSS, TypeScript strict.

---

## File Structure

**Create:**
- `lib/dashboard/client.ts` — Pure helpers: `computeSummaryCards`, `filterRows`, `countByChip`, types
- `lib/dashboard/ca.ts` — Pure helpers: `deriveClientStatus`, `sortCaRows`, types
- `app/api/dashboard/client/route.ts` — `GET /api/dashboard/client`
- `app/api/dashboard/ca/route.ts` — `GET /api/dashboard/ca`
- `app/api/reconciliation/mark-done/route.ts` — `PATCH /api/reconciliation/mark-done`
- `app/api/notify/route.ts` — `POST /api/notify`
- `components/dashboard/StatusBadge.tsx` — Colour-coded badge (shared by both dashboards)
- `components/dashboard/SummaryCards.tsx` — Four ITC stat cards
- `components/dashboard/FilterChips.tsx` — Five pill chips, single-select
- `components/dashboard/MarkDoneButton.tsx` — Optimistic toggle, calls PATCH mark-done
- `components/dashboard/InvoiceTable.tsx` — Full table, owns filter state
- `components/dashboard/NotifyButton.tsx` — Inline confirm flow, calls POST /api/notify
- `components/dashboard/CaClientTable.tsx` — CA client list table
- `tests/dashboard-client.test.ts` — Tests for lib/dashboard/client.ts
- `tests/dashboard-ca.test.ts` — Tests for lib/dashboard/ca.ts

**Modify:**
- `app/client/dashboard/page.tsx` — Replace stub with real server component
- `app/ca/dashboard/page.tsx` — Replace stub with real server component

---

### Task 1: Client dashboard pure helpers

**Files:**
- Create: `lib/dashboard/client.ts`
- Create (test): `tests/dashboard-client.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/dashboard-client.test.ts
import { describe, test, expect } from 'vitest'
import {
  computeSummaryCards,
  filterRows,
  countByChip,
  type ReconRow,
} from '@/lib/dashboard/client'

function makeRow(overrides: Partial<ReconRow>): ReconRow {
  return {
    resultId: 'r1',
    supplierGstin: '27AABCU9603R1ZX',
    invoiceNumber: 'INV-001',
    invoiceDate: '2026-02-01',
    taxableValue: '10000.00',
    igst: '1800.00',
    cgst: '0.00',
    sgst: '0.00',
    itcAtRisk: '0.00',
    matchOutcome: 'AUTO_ACCEPTED',
    reasonCode: 'AUTO_ACCEPTED',
    isDone: false,
    doneAt: null,
    ...overrides,
  }
}

describe('computeSummaryCards', () => {
  test('safe = sum IGST+CGST+SGST for AUTO_ACCEPTED', () => {
    const rows: ReconRow[] = [
      makeRow({ matchOutcome: 'AUTO_ACCEPTED', igst: '1800.00', cgst: '0.00', sgst: '0.00' }),
      makeRow({ matchOutcome: 'AUTO_ACCEPTED', igst: '0.00', cgst: '450.00', sgst: '450.00' }),
    ]
    const cards = computeSummaryCards(rows)
    expect(cards.safe).toBe('2700.00')
    expect(cards.atRisk).toBe('0.00')
  })

  test('atRisk = sum itcAtRisk for non-accepted, non-done rows', () => {
    const rows: ReconRow[] = [
      makeRow({ matchOutcome: 'AUTO_REJECTED', itcAtRisk: '1800.00', isDone: false }),
      makeRow({ matchOutcome: 'PENDING_REVIEW', itcAtRisk: '900.00', isDone: false }),
      makeRow({ matchOutcome: 'NOT_IN_BOOKS', itcAtRisk: '500.00', isDone: true }), // done — excluded
    ]
    const cards = computeSummaryCards(rows)
    expect(cards.atRisk).toBe('2700.00')
  })

  test('blocked = AUTO_REJECTED + NOT_IN_BOOKS only', () => {
    const rows: ReconRow[] = [
      makeRow({ matchOutcome: 'AUTO_REJECTED', itcAtRisk: '1000.00', isDone: false }),
      makeRow({ matchOutcome: 'NOT_IN_BOOKS',  itcAtRisk: '500.00',  isDone: false }),
      makeRow({ matchOutcome: 'PENDING_REVIEW', itcAtRisk: '300.00', isDone: false }),
    ]
    const cards = computeSummaryCards(rows)
    expect(cards.blocked).toBe('1500.00')
    expect(cards.unverified).toBe('300.00')
  })

  test('done rows excluded from all risk cards', () => {
    const rows: ReconRow[] = [
      makeRow({ matchOutcome: 'AUTO_REJECTED', itcAtRisk: '1800.00', isDone: true }),
    ]
    const cards = computeSummaryCards(rows)
    expect(cards.atRisk).toBe('0.00')
    expect(cards.blocked).toBe('0.00')
  })
})

describe('filterRows', () => {
  const rows: ReconRow[] = [
    makeRow({ resultId: 'r1', matchOutcome: 'AUTO_ACCEPTED',  isDone: false }),
    makeRow({ resultId: 'r2', matchOutcome: 'AUTO_REJECTED',  isDone: false }),
    makeRow({ resultId: 'r3', matchOutcome: 'PENDING_REVIEW', isDone: false }),
    makeRow({ resultId: 'r4', matchOutcome: 'NOT_IN_BOOKS',   isDone: false }),
    makeRow({ resultId: 'r5', matchOutcome: 'AUTO_REJECTED',  isDone: true }),
  ]

  test('all returns every row', () => {
    expect(filterRows(rows, 'all')).toHaveLength(5)
  })

  test('action-required returns AUTO_REJECTED + NOT_IN_BOOKS where not done', () => {
    const result = filterRows(rows, 'action-required')
    expect(result.map(r => r.resultId)).toEqual(['r2', 'r4'])
  })

  test('flagged returns PENDING_REVIEW where not done', () => {
    const result = filterRows(rows, 'flagged')
    expect(result.map(r => r.resultId)).toEqual(['r3'])
  })

  test('not-in-books returns NOT_IN_BOOKS where not done', () => {
    const result = filterRows(rows, 'not-in-books')
    expect(result.map(r => r.resultId)).toEqual(['r4'])
  })

  test('done returns rows where isDone is true', () => {
    const result = filterRows(rows, 'done')
    expect(result.map(r => r.resultId)).toEqual(['r5'])
  })
})

describe('countByChip', () => {
  test('returns correct counts for all chips', () => {
    const rows: ReconRow[] = [
      makeRow({ resultId: 'r1', matchOutcome: 'AUTO_ACCEPTED',  isDone: false }),
      makeRow({ resultId: 'r2', matchOutcome: 'AUTO_REJECTED',  isDone: false }),
      makeRow({ resultId: 'r3', matchOutcome: 'PENDING_REVIEW', isDone: false }),
      makeRow({ resultId: 'r4', matchOutcome: 'NOT_IN_BOOKS',   isDone: false }),
      makeRow({ resultId: 'r5', matchOutcome: 'AUTO_REJECTED',  isDone: true }),
    ]
    const counts = countByChip(rows)
    expect(counts.all).toBe(5)
    expect(counts['action-required']).toBe(2)
    expect(counts.flagged).toBe(1)
    expect(counts['not-in-books']).toBe(1)
    expect(counts.done).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run tests/dashboard-client.test.ts
```

Expected: FAIL — module `@/lib/dashboard/client` not found.

- [ ] **Step 3: Implement `lib/dashboard/client.ts`**

```typescript
// lib/dashboard/client.ts
import Decimal from 'decimal.js'

export type FilterChip = 'all' | 'action-required' | 'flagged' | 'not-in-books' | 'done'

export interface ReconRow {
  resultId:      string
  supplierGstin: string
  invoiceNumber: string
  invoiceDate:   string
  taxableValue:  string
  igst:          string
  cgst:          string
  sgst:          string
  itcAtRisk:     string
  matchOutcome:  'AUTO_ACCEPTED' | 'AUTO_REJECTED' | 'PENDING_REVIEW' | 'NOT_IN_BOOKS'
  reasonCode:    string
  isDone:        boolean
  doneAt:        string | null
}

export interface SummaryCards {
  safe:       string
  atRisk:     string
  blocked:    string
  unverified: string
}

export function computeSummaryCards(rows: ReconRow[]): SummaryCards {
  let safe = new Decimal(0)
  let atRisk = new Decimal(0)
  let blocked = new Decimal(0)
  let unverified = new Decimal(0)

  for (const row of rows) {
    if (row.matchOutcome === 'AUTO_ACCEPTED') {
      safe = safe.plus(new Decimal(row.igst)).plus(row.cgst).plus(row.sgst)
    } else if (!row.isDone) {
      const itc = new Decimal(row.itcAtRisk)
      atRisk = atRisk.plus(itc)
      if (row.matchOutcome === 'AUTO_REJECTED' || row.matchOutcome === 'NOT_IN_BOOKS') {
        blocked = blocked.plus(itc)
      }
      if (row.matchOutcome === 'PENDING_REVIEW') {
        unverified = unverified.plus(itc)
      }
    }
  }

  return {
    safe:       safe.toFixed(2),
    atRisk:     atRisk.toFixed(2),
    blocked:    blocked.toFixed(2),
    unverified: unverified.toFixed(2),
  }
}

export function filterRows(rows: ReconRow[], chip: FilterChip): ReconRow[] {
  switch (chip) {
    case 'all':
      return rows
    case 'action-required':
      return rows.filter(
        r => !r.isDone && (r.matchOutcome === 'AUTO_REJECTED' || r.matchOutcome === 'NOT_IN_BOOKS'),
      )
    case 'flagged':
      return rows.filter(r => !r.isDone && r.matchOutcome === 'PENDING_REVIEW')
    case 'not-in-books':
      return rows.filter(r => !r.isDone && r.matchOutcome === 'NOT_IN_BOOKS')
    case 'done':
      return rows.filter(r => r.isDone)
  }
}

export function countByChip(rows: ReconRow[]): Record<FilterChip, number> {
  return {
    all:              rows.length,
    'action-required': rows.filter(
      r => !r.isDone && (r.matchOutcome === 'AUTO_REJECTED' || r.matchOutcome === 'NOT_IN_BOOKS'),
    ).length,
    flagged:          rows.filter(r => !r.isDone && r.matchOutcome === 'PENDING_REVIEW').length,
    'not-in-books':   rows.filter(r => !r.isDone && r.matchOutcome === 'NOT_IN_BOOKS').length,
    done:             rows.filter(r => r.isDone).length,
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run tests/dashboard-client.test.ts
```

Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard/client.ts tests/dashboard-client.test.ts
git commit -m "feat: add client dashboard pure helpers (computeSummaryCards, filterRows, countByChip)"
```

---

### Task 2: CA dashboard pure helpers

**Files:**
- Create: `lib/dashboard/ca.ts`
- Create (test): `tests/dashboard-ca.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/dashboard-ca.test.ts
import { describe, test, expect } from 'vitest'
import { deriveClientStatus, sortCaRows, type CaClientRow } from '@/lib/dashboard/ca'

describe('deriveClientStatus', () => {
  test('No Upload when hasUpload is false', () => {
    expect(deriveClientStatus(0, '0.00', false)).toBe('No Upload')
  })

  test('All Done when pending actions = 0 and hasUpload is true', () => {
    expect(deriveClientStatus(0, '0.00', true)).toBe('All Done')
  })

  test('Urgent when pending actions > 0 and ITC > 10000', () => {
    expect(deriveClientStatus(3, '15000.00', true)).toBe('Urgent')
  })

  test('Pending when pending actions > 0 but ITC <= 10000', () => {
    expect(deriveClientStatus(2, '5000.00', true)).toBe('Pending')
  })

  test('Pending when pending actions > 0 and ITC exactly 10000', () => {
    expect(deriveClientStatus(1, '10000.00', true)).toBe('Pending')
  })
})

describe('sortCaRows', () => {
  function makeRow(overrides: Partial<CaClientRow>): CaClientRow {
    return {
      clientId: 'c1',
      name: 'Test',
      gstinCount: 1,
      period: '2026-04',
      itcAtRisk: '0.00',
      pendingActions: 0,
      status: 'All Done',
      ...overrides,
    }
  }

  test('sorts Urgent before Pending before All Done before No Upload', () => {
    const rows = [
      makeRow({ clientId: 'c4', status: 'No Upload' }),
      makeRow({ clientId: 'c2', status: 'Pending',  itcAtRisk: '5000.00' }),
      makeRow({ clientId: 'c1', status: 'Urgent',   itcAtRisk: '20000.00' }),
      makeRow({ clientId: 'c3', status: 'All Done' }),
    ]
    const sorted = sortCaRows(rows)
    expect(sorted.map(r => r.clientId)).toEqual(['c1', 'c2', 'c3', 'c4'])
  })

  test('within same status, sorts by ITC at risk descending', () => {
    const rows = [
      makeRow({ clientId: 'c1', status: 'Urgent', itcAtRisk: '10000.00' }),
      makeRow({ clientId: 'c2', status: 'Urgent', itcAtRisk: '50000.00' }),
    ]
    const sorted = sortCaRows(rows)
    expect(sorted.map(r => r.clientId)).toEqual(['c2', 'c1'])
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run tests/dashboard-ca.test.ts
```

Expected: FAIL — module `@/lib/dashboard/ca` not found.

- [ ] **Step 3: Implement `lib/dashboard/ca.ts`**

```typescript
// lib/dashboard/ca.ts
import Decimal from 'decimal.js'

export type ClientStatus = 'Urgent' | 'Pending' | 'All Done' | 'No Upload'

export interface CaClientRow {
  clientId:       string
  name:           string
  gstinCount:     number
  period:         string | null
  itcAtRisk:      string
  pendingActions: number
  status:         ClientStatus
}

export function deriveClientStatus(
  pendingActions: number,
  itcAtRisk: string,
  hasUpload: boolean,
): ClientStatus {
  if (!hasUpload) return 'No Upload'
  if (pendingActions === 0) return 'All Done'
  if (new Decimal(itcAtRisk).gt(10000)) return 'Urgent'
  return 'Pending'
}

const STATUS_ORDER: Record<ClientStatus, number> = {
  Urgent:      0,
  Pending:     1,
  'All Done':  2,
  'No Upload': 3,
}

export function sortCaRows(rows: CaClientRow[]): CaClientRow[] {
  return [...rows].sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (statusDiff !== 0) return statusDiff
    return parseFloat(b.itcAtRisk) - parseFloat(a.itcAtRisk)
  })
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run tests/dashboard-ca.test.ts
```

Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard/ca.ts tests/dashboard-ca.test.ts
git commit -m "feat: add CA dashboard pure helpers (deriveClientStatus, sortCaRows)"
```

---

### Task 3: PATCH /api/reconciliation/mark-done

**Files:**
- Create: `app/api/reconciliation/mark-done/route.ts`

- [ ] **Step 1: Implement the route**

```typescript
// app/api/reconciliation/mark-done/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, getEffectiveClientId } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = await getEffectiveClientId()
  if (!clientId) return NextResponse.json({ error: 'No client context' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body.resultId !== 'string' || typeof body.isDone !== 'boolean') {
    return NextResponse.json(
      { error: 'resultId (string) and isDone (boolean) are required' },
      { status: 400 },
    )
  }
  const { resultId, isDone } = body as { resultId: string; isDone: boolean }

  // Verify ownership: result → ims_invoice → upload_session → client_gstin → client_id
  const result = await prisma.reconciliationResult.findUnique({
    where: { id: resultId },
    include: {
      ims_invoice: {
        include: {
          upload_session: { include: { client_gstin: { select: { client_id: true } } } },
        },
      },
    },
  })

  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (result.ims_invoice.upload_session.client_gstin.client_id !== clientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updated = await prisma.reconciliationResult.update({
    where: { id: resultId },
    data: {
      is_done:    isDone,
      done_at:    isDone ? new Date() : null,
      done_by_id: isDone ? user.id : null,
    },
  })

  return NextResponse.json({
    resultId: updated.id,
    isDone:   updated.is_done,
    doneAt:   updated.done_at?.toISOString() ?? null,
  })
}
```

- [ ] **Step 2: Verify the route file compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `app/api/reconciliation/mark-done/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/api/reconciliation/mark-done/route.ts
git commit -m "feat: add PATCH /api/reconciliation/mark-done route"
```

---

### Task 4: POST /api/notify

**Files:**
- Create: `app/api/notify/route.ts`

- [ ] **Step 1: Implement the route**

```typescript
// app/api/notify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { sendNotification } from '@/lib/notifications/index'

export async function POST(req: NextRequest) {
  const user = await getAuthedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!user.org_id) return NextResponse.json({ error: 'No org' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body.clientId !== 'string') {
    return NextResponse.json({ error: 'clientId (string) is required' }, { status: 400 })
  }
  const { clientId } = body as { clientId: string }

  const client = await prisma.client.findUnique({
    where: { id: clientId, org_id: user.org_id },
    include: { users: { select: { id: true } } },
  })
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  for (const recipient of client.users) {
    await sendNotification({
      recipientId: recipient.id,
      senderId:    user.id,
      clientId:    client.id,
      type:        'CA_NOTIFY_CLIENT',
      message:     'Your CA has sent you a reminder to review your IMS action queue.',
    })
  }

  return NextResponse.json({ ok: true, notifiedCount: client.users.length })
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/notify/route.ts
git commit -m "feat: add POST /api/notify route"
```

---

### Task 5: GET /api/dashboard/client and GET /api/dashboard/ca

**Files:**
- Create: `app/api/dashboard/client/route.ts`
- Create: `app/api/dashboard/ca/route.ts`

- [ ] **Step 1: Implement GET /api/dashboard/client**

```typescript
// app/api/dashboard/client/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, getEffectiveClientId } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { computeSummaryCards } from '@/lib/dashboard/client'
import type { ReconRow } from '@/lib/dashboard/client'

export async function GET(req: NextRequest) {
  try {
    await getAuthedUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = await getEffectiveClientId()
  if (!clientId) return NextResponse.json({ error: 'No client context' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  let period = searchParams.get('period') ?? null

  if (!period) {
    const latest = await prisma.uploadSession.findFirst({
      where: { client_gstin: { client_id: clientId }, status: 'DONE' },
      orderBy: { period: 'desc' },
      select: { period: true },
    })
    if (!latest) return NextResponse.json({ period: null, summaryCards: null, rows: [] })
    period = latest.period
  }

  const results = await prisma.reconciliationResult.findMany({
    where: {
      ims_invoice: {
        upload_session: {
          client_gstin: { client_id: clientId },
          period,
          status: 'DONE',
        },
      },
    },
    include: { ims_invoice: true },
  })

  const rows: ReconRow[] = results.map(r => ({
    resultId:      r.id,
    supplierGstin: r.ims_invoice.supplier_gstin,
    invoiceNumber: r.ims_invoice.invoice_number,
    invoiceDate:   r.ims_invoice.invoice_date.toISOString().slice(0, 10),
    taxableValue:  r.ims_invoice.taxable_value,
    igst:          r.ims_invoice.igst,
    cgst:          r.ims_invoice.cgst,
    sgst:          r.ims_invoice.sgst,
    itcAtRisk:     r.itc_at_risk,
    matchOutcome:  r.outcome,
    reasonCode:    r.reason_code,
    isDone:        r.is_done,
    doneAt:        r.done_at?.toISOString() ?? null,
  }))

  rows.sort((a, b) => parseFloat(b.itcAtRisk) - parseFloat(a.itcAtRisk))

  return NextResponse.json({ period, summaryCards: computeSummaryCards(rows), rows })
}
```

- [ ] **Step 2: Implement GET /api/dashboard/ca**

```typescript
// app/api/dashboard/ca/route.ts
import { NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { deriveClientStatus, sortCaRows } from '@/lib/dashboard/ca'
import type { CaClientRow } from '@/lib/dashboard/ca'
import Decimal from 'decimal.js'

export async function GET() {
  const user = await getAuthedUser().catch(() => null)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!user.org_id) return NextResponse.json({ error: 'No org' }, { status: 403 })

  const now = new Date()
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const clients = await prisma.client.findMany({
    where: { org_id: user.org_id },
    include: {
      gstins: {
        include: {
          upload_sessions: {
            where: { period: currentPeriod, status: 'DONE' },
            include: {
              ims_invoices: {
                include: {
                  reconciliation_result: {
                    select: { outcome: true, itc_at_risk: true, is_done: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  const rows: CaClientRow[] = clients.map(client => {
    let itcAtRisk = new Decimal(0)
    let pendingActions = 0
    let hasUpload = false

    for (const gstin of client.gstins) {
      for (const session of gstin.upload_sessions) {
        hasUpload = true
        for (const invoice of session.ims_invoices) {
          const result = invoice.reconciliation_result
          if (result && result.outcome !== 'AUTO_ACCEPTED' && !result.is_done) {
            itcAtRisk = itcAtRisk.plus(new Decimal(result.itc_at_risk))
            pendingActions++
          }
        }
      }
    }

    const itcStr = itcAtRisk.toFixed(2)
    return {
      clientId:       client.id,
      name:           client.name,
      gstinCount:     client.gstins.length,
      period:         hasUpload ? currentPeriod : null,
      itcAtRisk:      itcStr,
      pendingActions,
      status:         deriveClientStatus(pendingActions, itcStr, hasUpload),
    }
  })

  return NextResponse.json({ clients: sortCaRows(rows) })
}
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no new type errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/dashboard/client/route.ts app/api/dashboard/ca/route.ts
git commit -m "feat: add GET /api/dashboard/client and GET /api/dashboard/ca routes"
```

---

### Task 6: StatusBadge + SummaryCards + FilterChips components

**Files:**
- Create: `components/dashboard/StatusBadge.tsx`
- Create: `components/dashboard/SummaryCards.tsx`
- Create: `components/dashboard/FilterChips.tsx`

- [ ] **Step 1: Implement StatusBadge**

```tsx
// components/dashboard/StatusBadge.tsx
const BADGE_STYLES: Record<string, { label: string; className: string }> = {
  AUTO_ACCEPTED:  { label: 'Accepted',      className: 'bg-emerald-100 text-emerald-800' },
  AUTO_REJECTED:  { label: 'Rejected',      className: 'bg-red-100 text-red-800' },
  PENDING_REVIEW: { label: 'Review needed', className: 'bg-amber-100 text-amber-800' },
  NOT_IN_BOOKS:   { label: 'Not in books',  className: 'bg-gray-100 text-gray-700' },
  Urgent:         { label: 'Urgent',        className: 'bg-red-100 text-red-800' },
  Pending:        { label: 'Pending',       className: 'bg-amber-100 text-amber-800' },
  'All Done':     { label: 'All done',      className: 'bg-emerald-100 text-emerald-800' },
  'No Upload':    { label: 'No upload',     className: 'bg-gray-100 text-gray-500' },
}

export function StatusBadge({ value }: { value: string }) {
  const style = BADGE_STYLES[value] ?? { label: value, className: 'bg-gray-100 text-gray-700' }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.className}`}
    >
      {style.label}
    </span>
  )
}
```

- [ ] **Step 2: Implement SummaryCards**

```tsx
// components/dashboard/SummaryCards.tsx
import type { SummaryCards as SummaryData } from '@/lib/dashboard/client'

function formatINR(amount: string): string {
  const num = parseFloat(amount)
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const CARDS = [
  { key: 'safe',       label: 'ITC Safe',       border: 'border-emerald-200', bg: 'bg-emerald-50' },
  { key: 'atRisk',     label: 'ITC At Risk',     border: 'border-amber-200',   bg: 'bg-amber-50' },
  { key: 'blocked',    label: 'ITC Blocked',     border: 'border-red-200',     bg: 'bg-red-50' },
  { key: 'unverified', label: 'ITC Unverified',  border: 'border-gray-200',    bg: 'bg-gray-50' },
] as const

export function SummaryCards({ data }: { data: SummaryData }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {CARDS.map(card => (
        <div key={card.key} className={`rounded-lg border p-4 ${card.border} ${card.bg}`}>
          <p className="text-sm text-gray-500">{card.label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {formatINR(data[card.key])}
          </p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Implement FilterChips**

```tsx
// components/dashboard/FilterChips.tsx
'use client'

import type { FilterChip } from '@/lib/dashboard/client'

const CHIPS: { id: FilterChip; label: string }[] = [
  { id: 'all',             label: 'All' },
  { id: 'action-required', label: 'Action Required' },
  { id: 'flagged',         label: 'Flagged' },
  { id: 'not-in-books',    label: 'Not in Books' },
  { id: 'done',            label: 'Done' },
]

interface FilterChipsProps {
  active:   FilterChip
  counts:   Record<FilterChip, number>
  onChange: (chip: FilterChip) => void
}

export function FilterChips({ active, counts, onChange }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHIPS.map(chip => (
        <button
          key={chip.id}
          onClick={() => onChange(chip.id)}
          className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
            active === chip.id
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
          }`}
        >
          {chip.label}
          <span className="ml-1.5 tabular-nums text-xs opacity-75">({counts[chip.id]})</span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no new type errors.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/StatusBadge.tsx components/dashboard/SummaryCards.tsx components/dashboard/FilterChips.tsx
git commit -m "feat: add StatusBadge, SummaryCards, FilterChips dashboard components"
```

---

### Task 7: MarkDoneButton + InvoiceTable

**Files:**
- Create: `components/dashboard/MarkDoneButton.tsx`
- Create: `components/dashboard/InvoiceTable.tsx`

- [ ] **Step 1: Implement MarkDoneButton**

```tsx
// components/dashboard/MarkDoneButton.tsx
'use client'

import { useState } from 'react'

interface MarkDoneButtonProps {
  resultId: string
  isDone:   boolean
  onToggle: (resultId: string, isDone: boolean) => void
}

export function MarkDoneButton({ resultId, isDone, onToggle }: MarkDoneButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setLoading(true)
    setError(null)
    const newDone = !isDone
    onToggle(resultId, newDone) // optimistic
    try {
      const res = await fetch('/api/reconciliation/mark-done', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultId, isDone: newDone }),
      })
      if (!res.ok) {
        onToggle(resultId, isDone) // revert
        setError('Failed. Try again.')
      }
    } catch {
      onToggle(resultId, isDone) // revert
      setError('Failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`text-sm font-medium transition-colors disabled:opacity-50 ${
          isDone
            ? 'text-emerald-600 hover:text-emerald-800'
            : 'text-blue-600 hover:text-blue-800'
        }`}
      >
        {isDone ? '✓ Done' : 'Mark Done on GSTN'}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  )
}
```

- [ ] **Step 2: Implement InvoiceTable**

This component owns the filter state and the local row state. It uses two parallel state arrays:
- `allRows` — source of truth for chip counts; updated when isDone changes
- `visibleRows` — what's rendered; snapshot filtered at chip change, updated in-place for isDone (so marked rows stay visible in the current filter view)

```tsx
// components/dashboard/InvoiceTable.tsx
'use client'

import { useState, useCallback } from 'react'
import { FilterChips } from '@/components/dashboard/FilterChips'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { MarkDoneButton } from '@/components/dashboard/MarkDoneButton'
import { filterRows, countByChip } from '@/lib/dashboard/client'
import type { ReconRow, FilterChip } from '@/lib/dashboard/client'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatINR(amount: string): string {
  const num = parseFloat(amount)
  if (num === 0) return '—'
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const REASON_LABELS: Record<string, string> = {
  AUTO_ACCEPTED:         'Matched',
  AUTO_REJECTED:         'Mismatch',
  NOT_IN_BOOKS:          'Not in books',
  PENDING_REVIEW:        'Review',
  WRONG_GSTIN:           'Wrong GSTIN',
  VALUE_MISMATCH_2_10:   'Value diff (2–10%)',
  VALUE_OVER_10:         'Value diff (>10%)',
  DATE_GAP:              'Date mismatch',
  FORMAT_VARIATION:      'Format variation',
  INVOICE_NUMBER_MISMATCH: 'Invoice # mismatch',
  DUPLICATE:             'Duplicate',
}

interface InvoiceTableProps {
  initialRows: ReconRow[]
}

export function InvoiceTable({ initialRows }: InvoiceTableProps) {
  const [allRows, setAllRows] = useState<ReconRow[]>(initialRows)
  const [visibleRows, setVisibleRows] = useState<ReconRow[]>(initialRows)
  const [activeChip, setActiveChip] = useState<FilterChip>('all')

  const handleChipChange = useCallback(
    (chip: FilterChip) => {
      setActiveChip(chip)
      setVisibleRows(filterRows(allRows, chip))
    },
    [allRows],
  )

  const handleToggle = useCallback((resultId: string, isDone: boolean) => {
    const updateRow = (r: ReconRow) =>
      r.resultId === resultId ? { ...r, isDone } : r

    setAllRows(prev => prev.map(updateRow))
    setVisibleRows(prev => prev.map(updateRow))
  }, [])

  const counts = countByChip(allRows)

  return (
    <div className="space-y-4">
      <FilterChips active={activeChip} counts={counts} onChange={handleChipChange} />

      {visibleRows.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">
          No invoices match this filter.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  'Supplier GSTIN', 'Invoice #', 'Date', 'Taxable',
                  'IGST', 'CGST', 'SGST', 'ITC at Risk',
                  'Status', 'Reason', 'Action',
                ].map(h => (
                  <th
                    key={h}
                    className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {visibleRows.map(row => (
                <tr key={row.resultId} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{row.supplierGstin}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{row.invoiceNumber}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{formatDate(row.invoiceDate)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs">{formatINR(row.taxableValue)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs">{formatINR(row.igst)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs">{formatINR(row.cgst)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs">{formatINR(row.sgst)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-medium">
                    {row.matchOutcome === 'AUTO_ACCEPTED' ? '—' : formatINR(row.itcAtRisk)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <StatusBadge value={row.matchOutcome} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">
                    {REASON_LABELS[row.reasonCode] ?? row.reasonCode}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {row.matchOutcome !== 'AUTO_ACCEPTED' && (
                      <MarkDoneButton
                        resultId={row.resultId}
                        isDone={row.isDone}
                        onToggle={handleToggle}
                      />
                    )}
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

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no new type errors.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/MarkDoneButton.tsx components/dashboard/InvoiceTable.tsx
git commit -m "feat: add MarkDoneButton and InvoiceTable client dashboard components"
```

---

### Task 8: NotifyButton + CaClientTable

**Files:**
- Create: `components/dashboard/NotifyButton.tsx`
- Create: `components/dashboard/CaClientTable.tsx`

- [ ] **Step 1: Implement NotifyButton**

```tsx
// components/dashboard/NotifyButton.tsx
'use client'

import { useState } from 'react'

type ButtonState = 'idle' | 'confirm' | 'sending' | 'done'

export function NotifyButton({ clientId }: { clientId: string }) {
  const [state, setState] = useState<ButtonState>('idle')

  const handleConfirm = async () => {
    setState('sending')
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
    } finally {
      setState('done')
      setTimeout(() => setState('idle'), 2000)
    }
  }

  if (state === 'confirm') {
    return (
      <span className="inline-flex items-center gap-1 text-sm">
        <span className="text-gray-500 text-xs">Send reminder?</span>
        <button
          onClick={handleConfirm}
          className="font-medium text-blue-600 hover:text-blue-800"
        >
          Send
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={() => setState('idle')}
          className="text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </span>
    )
  }

  if (state === 'sending') {
    return <span className="text-xs text-gray-400">Sending…</span>
  }

  if (state === 'done') {
    return <span className="text-xs font-medium text-emerald-600">Sent ✓</span>
  }

  return (
    <button
      onClick={() => setState('confirm')}
      className="text-sm font-medium text-blue-600 hover:text-blue-800"
    >
      Notify
    </button>
  )
}
```

- [ ] **Step 2: Implement CaClientTable**

The "View Queue" button sets the actingAsClientId cookie (via the existing `/api/clients/[clientId]/acting-as` endpoint) then navigates to `/client/dashboard`.

```tsx
// components/dashboard/CaClientTable.tsx
'use client'

import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { NotifyButton } from '@/components/dashboard/NotifyButton'
import type { CaClientRow } from '@/lib/dashboard/ca'

function formatINR(amount: string): string {
  const num = parseFloat(amount)
  if (num === 0) return '—'
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function CaClientTable({ rows }: { rows: CaClientRow[] }) {
  const router = useRouter()

  const handleViewQueue = async (clientId: string) => {
    const res = await fetch(`/api/clients/${clientId}/acting-as`, { method: 'POST' })
    if (res.ok) router.push('/client/dashboard')
  }

  if (rows.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-400">
        No clients yet. Add your first client above.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Client', 'GSTINs', 'ITC at Risk', 'Pending Actions', 'Status', 'Actions'].map(h => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map(row => (
            <tr key={row.clientId} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
              <td className="px-4 py-3 text-gray-500">
                {row.gstinCount} {row.gstinCount === 1 ? 'GSTIN' : 'GSTINs'}
              </td>
              <td className="px-4 py-3 tabular-nums">{formatINR(row.itcAtRisk)}</td>
              <td className="px-4 py-3 tabular-nums">
                {row.pendingActions > 0 ? row.pendingActions : '—'}
              </td>
              <td className="px-4 py-3">
                <StatusBadge value={row.status} />
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-4">
                  <NotifyButton clientId={row.clientId} />
                  <button
                    onClick={() => handleViewQueue(row.clientId)}
                    className="text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    View Queue →
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no new type errors.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/NotifyButton.tsx components/dashboard/CaClientTable.tsx
git commit -m "feat: add NotifyButton and CaClientTable CA dashboard components"
```

---

### Task 9: Wire up /client/dashboard page

**Files:**
- Modify: `app/client/dashboard/page.tsx`

- [ ] **Step 1: Replace the stub with the real server component**

```tsx
// app/client/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { getAuthedUser, getEffectiveClientId } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { computeSummaryCards } from '@/lib/dashboard/client'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { InvoiceTable } from '@/components/dashboard/InvoiceTable'
import { PeriodPicker } from '@/components/upload/PeriodPicker'
import type { ReconRow } from '@/lib/dashboard/client'

interface Props {
  searchParams: Promise<{ period?: string }>
}

export default async function ClientDashboardPage({ searchParams }: Props) {
  const user = await getAuthedUser().catch(() => null)
  if (!user) redirect('/login')

  const clientId = await getEffectiveClientId()
  if (!clientId) redirect('/ca/clients')

  const params = await searchParams
  let period = params.period ?? null

  // Default to most recent DONE period
  if (!period) {
    const latest = await prisma.uploadSession.findFirst({
      where: { client_gstin: { client_id: clientId }, status: 'DONE' },
      orderBy: { period: 'desc' },
      select: { period: true },
    })
    period = latest?.period ?? null
  }

  // No DONE upload session yet
  if (!period) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Action Queue</h1>
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <p className="text-gray-500">No reconciliation data yet.</p>
          <a href="/client/upload" className="text-sm font-medium text-blue-600 hover:text-blue-800">
            Upload files to get started →
          </a>
        </div>
      </main>
    )
  }

  // Load reconciliation results for the period
  const results = await prisma.reconciliationResult.findMany({
    where: {
      ims_invoice: {
        upload_session: {
          client_gstin: { client_id: clientId },
          period,
          status: 'DONE',
        },
      },
    },
    include: { ims_invoice: true },
  })

  const rows: ReconRow[] = results.map(r => ({
    resultId:      r.id,
    supplierGstin: r.ims_invoice.supplier_gstin,
    invoiceNumber: r.ims_invoice.invoice_number,
    invoiceDate:   r.ims_invoice.invoice_date.toISOString().slice(0, 10),
    taxableValue:  r.ims_invoice.taxable_value,
    igst:          r.ims_invoice.igst,
    cgst:          r.ims_invoice.cgst,
    sgst:          r.ims_invoice.sgst,
    itcAtRisk:     r.itc_at_risk,
    matchOutcome:  r.outcome,
    reasonCode:    r.reason_code,
    isDone:        r.is_done,
    doneAt:        r.done_at?.toISOString() ?? null,
  }))

  rows.sort((a, b) => parseFloat(b.itcAtRisk) - parseFloat(a.itcAtRisk))

  const summaryCards = computeSummaryCards(rows)

  // Build available periods for the picker (all DONE periods for this client)
  const allSessions = await prisma.uploadSession.findMany({
    where: { client_gstin: { client_id: clientId }, status: 'DONE' },
    select: { period: true },
    distinct: ['period'],
    orderBy: { period: 'desc' },
  })
  const availablePeriods = allSessions.map(s => s.period)

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Action Queue</h1>
        <PeriodPicker
          defaultValue={period}
          availablePeriods={availablePeriods}
          onChangePath="/client/dashboard"
        />
      </div>
      <div className="space-y-6">
        <SummaryCards data={summaryCards} />
        <InvoiceTable initialRows={rows} />
      </div>
    </main>
  )
}
```

> **Note:** `PeriodPicker` currently renders as a standalone month selector. It needs a small addition: an `onChangePath` prop that, when the period changes, navigates to `${onChangePath}?period=${value}` using `router.push`. If `availablePeriods` is provided, render only those options. See Step 2 below.

- [ ] **Step 2: Update PeriodPicker to support navigation mode**

Read the current file first:

```bash
cat -n components/upload/PeriodPicker.tsx
```

Then add the `onChangePath` + `availablePeriods` props. The full file after the change:

```tsx
// components/upload/PeriodPicker.tsx
'use client'

import { useRouter } from 'next/navigation'
export { getDefaultPeriodValue } from '@/lib/upload/period'

interface PeriodPickerProps {
  defaultValue:     string
  onChange?:        (value: string) => void
  availablePeriods?: string[]
  onChangePath?:    string
}

function periodLabel(value: string): string {
  const [year, month] = value.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1, 1)
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

// Generate last 12 months in YYYY-MM format
function last12Months(): string[] {
  const result: string[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return result
}

export function PeriodPicker({ defaultValue, onChange, availablePeriods, onChangePath }: PeriodPickerProps) {
  const router = useRouter()
  const options = availablePeriods ?? last12Months()

  const handleChange = (value: string) => {
    if (onChangePath) {
      router.push(`${onChangePath}?period=${value}`)
    } else {
      onChange?.(value)
    }
  }

  return (
    <select
      defaultValue={defaultValue}
      onChange={e => handleChange(e.target.value)}
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
    >
      {options.map(val => (
        <option key={val} value={val}>{periodLabel(val)}</option>
      ))}
    </select>
  )
}
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no new type errors.

- [ ] **Step 4: Commit**

```bash
git add app/client/dashboard/page.tsx components/upload/PeriodPicker.tsx
git commit -m "feat: implement /client/dashboard page with summary cards, filter chips, and action table"
```

---

### Task 10: Wire up /ca/dashboard page

**Files:**
- Modify: `app/ca/dashboard/page.tsx`

- [ ] **Step 1: Replace the stub with the real server component**

```tsx
// app/ca/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { getAuthedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { deriveClientStatus, sortCaRows } from '@/lib/dashboard/ca'
import { CaClientTable } from '@/components/dashboard/CaClientTable'
import type { CaClientRow } from '@/lib/dashboard/ca'
import Decimal from 'decimal.js'

export default async function CADashboardPage() {
  const user = await getAuthedUser().catch(() => null)
  if (!user) redirect('/login')
  if (!user.org_id) redirect('/login')

  const now = new Date()
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const clients = await prisma.client.findMany({
    where: { org_id: user.org_id },
    include: {
      gstins: {
        include: {
          upload_sessions: {
            where: { period: currentPeriod, status: 'DONE' },
            include: {
              ims_invoices: {
                include: {
                  reconciliation_result: {
                    select: { outcome: true, itc_at_risk: true, is_done: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  const rows: CaClientRow[] = clients.map(client => {
    let itcAtRisk = new Decimal(0)
    let pendingActions = 0
    let hasUpload = false

    for (const gstin of client.gstins) {
      for (const session of gstin.upload_sessions) {
        hasUpload = true
        for (const invoice of session.ims_invoices) {
          const result = invoice.reconciliation_result
          if (result && result.outcome !== 'AUTO_ACCEPTED' && !result.is_done) {
            itcAtRisk = itcAtRisk.plus(new Decimal(result.itc_at_risk))
            pendingActions++
          }
        }
      }
    }

    const itcStr = itcAtRisk.toFixed(2)
    return {
      clientId:       client.id,
      name:           client.name,
      gstinCount:     client.gstins.length,
      period:         hasUpload ? currentPeriod : null,
      itcAtRisk:      itcStr,
      pendingActions,
      status:         deriveClientStatus(pendingActions, itcStr, hasUpload),
    }
  })

  return (
    <main className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Client Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          {currentPeriod} — ITC risk across all clients
        </p>
      </div>
      <CaClientTable rows={sortCaRows(rows)} />
    </main>
  )
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no new type errors.

- [ ] **Step 3: Run all tests to confirm nothing regressed**

```bash
npx vitest run
```

Expected: all existing tests pass plus the new dashboard-client and dashboard-ca tests.

- [ ] **Step 4: Commit**

```bash
git add app/ca/dashboard/page.tsx
git commit -m "feat: implement /ca/dashboard page with multi-client ITC risk overview"
```

---

### Task 11: Smoke test

No code changes — manual verification steps.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test /client/dashboard as a logged-in client**

1. Log in as the client user (or use CA "Act as Client" from `/ca/clients/[clientId]`)
2. Navigate to `http://localhost:3000/client/dashboard`
3. Verify: summary cards show ₹ amounts, filter chips show counts, invoice table renders
4. Click "Action Required" chip — only rejected/not-in-books rows appear
5. Click "Mark Done on GSTN" on one row — button changes to "✓ Done", chip counts update
6. Click "✓ Done" — button reverts to "Mark Done on GSTN"
7. Switch period via dropdown — page reloads with correct period's data

- [ ] **Step 3: Test /ca/dashboard as a logged-in CA**

1. Log in as CA user
2. Navigate to `http://localhost:3000/ca/dashboard`
3. Verify: client table shows client name, GSTIN count, ITC at risk, status badge
4. Click "Notify" → confirm dialog appears → click "Send" → "Sent ✓" appears
5. Click "View Queue →" → navigates to `/client/dashboard` acting as that client
6. Verify acting-as banner appears at top of client dashboard

- [ ] **Step 4: Verify empty state**

Log in as a client with no DONE upload sessions. Navigate to `/client/dashboard`. Should show "No reconciliation data yet." with link to upload.

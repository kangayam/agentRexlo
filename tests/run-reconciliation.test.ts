import { describe, test, expect, vi, beforeEach } from 'vitest'
import { matchOutcomeToMatchLevel } from '@/lib/reconciliation/run'

// ── matchOutcomeToMatchLevel ──────────────────────────────────────────────────

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

// ── imsUuidByKey must include supplier GSTIN ──────────────────────────────────
//
// Bug: when keyed only on invoice#, two suppliers sharing the same invoice#
// collide in the map and the second supplier's result is written to the WRONG
// ImsInvoice row — overwriting the first supplier's reconciliation entry and
// leaving the second with no result at all.
//
// Fix: key = normalizeGstin(supplier_gstin) + '::' + normalizeInvoiceNumber(invoice_number)

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    imsInvoice:             { findMany: vi.fn() },
    tallyEntry:             { findMany: vi.fn() },
    reconciliationResult:   { upsert: vi.fn() },
    uploadSession:          { update: vi.fn() },
    $transaction:           vi.fn(),
  },
}))

import { prisma } from '@/lib/db/prisma'
import { runReconciliation } from '@/lib/reconciliation/run'

function makeImsRow(overrides: {
  id: string
  supplierGstin: string
  invoiceNumber: string
  invoiceValue: string
  cgst: string
  sgst: string
}) {
  return {
    id:               overrides.id,
    supplier_gstin:   overrides.supplierGstin,
    invoice_number:   overrides.invoiceNumber,
    invoice_date:     new Date('2026-02-01T00:00:00.000Z'),
    invoice_value:    overrides.invoiceValue,
    igst:             '0',
    cgst:             overrides.cgst,
    sgst:             overrides.sgst,
    place_of_supply:  overrides.supplierGstin.slice(0, 2),
  }
}

function makeTallyRow(overrides: {
  id: string
  supplierGstin: string
  voucherNumber: string
  totalAmount: string
  cgst: string
  sgst: string
}) {
  return {
    id:             overrides.id,
    supplier_gstin: overrides.supplierGstin,
    voucher_number: overrides.voucherNumber,
    voucher_date:   new Date('2026-02-01T00:00:00.000Z'),
    total_amount:   overrides.totalAmount,
    taxable_value:  '0',
    igst:           '0',
    cgst:           overrides.cgst,
    sgst:           overrides.sgst,
  }
}

describe('runReconciliation — imsUuidByKey GSTIN prefix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // $transaction: resolve each upsert promise in order
    vi.mocked(prisma.$transaction).mockImplementation(
      async (ops: unknown) => Promise.all(ops as Promise<unknown>[])
    )
    vi.mocked(prisma.reconciliationResult.upsert).mockResolvedValue({} as never)
    vi.mocked(prisma.uploadSession.update).mockResolvedValue({} as never)
  })

  test('assigns the correct ImsInvoice UUID when two suppliers share the same invoice#', async () => {
    const imsUuidA = 'ims-uuid-supplier-A'
    const imsUuidB = 'ims-uuid-supplier-B'

    vi.mocked(prisma.imsInvoice.findMany).mockResolvedValue([
      makeImsRow({ id: imsUuidA, supplierGstin: '27AABCU9603R1ZX', invoiceNumber: 'INV-001', invoiceValue: '10000', cgst: '900', sgst: '900' }),
      makeImsRow({ id: imsUuidB, supplierGstin: '29AABCU9603R1ZX', invoiceNumber: 'INV-001', invoiceValue: '20000', cgst: '1800', sgst: '1800' }),
    ] as never)

    vi.mocked(prisma.tallyEntry.findMany).mockResolvedValue([
      makeTallyRow({ id: 'tally-A', supplierGstin: '27AABCU9603R1ZX', voucherNumber: 'INV-001', totalAmount: '10000', cgst: '900', sgst: '900' }),
      makeTallyRow({ id: 'tally-B', supplierGstin: '29AABCU9603R1ZX', voucherNumber: 'INV-001', totalAmount: '20000', cgst: '1800', sgst: '1800' }),
    ] as never)

    await runReconciliation('session-test')

    // Each upsert must target the correct ImsInvoice row for its supplier
    const upsertedIds = vi.mocked(prisma.reconciliationResult.upsert).mock.calls
      .map(call => call[0].where.ims_invoice_id)

    expect(upsertedIds).toContain(imsUuidA)
    expect(upsertedIds).toContain(imsUuidB)  // BUG: current code uses imsUuidA here too
  })
})

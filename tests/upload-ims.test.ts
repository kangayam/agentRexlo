import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma before importing the module under test
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    imsInvoice: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      update:    vi.fn(),
    },
    reconciliationResult: {
      deleteMany: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db/prisma'
import { replaceImsInvoices } from '@/lib/upload/ims'
import type { ParsedIMSInvoice } from '@/lib/parsers/ims-json-parser'

function makeInvoice(overrides: Partial<ParsedIMSInvoice> = {}): ParsedIMSInvoice {
  return {
    supplierGstin: '29AABCU9603R1ZX',
    invoiceNo: 'INV-001',
    invoiceDate: new Date('2026-03-01'),
    taxableValue: 1000,
    igst: 180,
    cgst: 0,
    sgst: 0,
    totalValue: 1180,
    ...overrides,
  }
}

describe('replaceImsInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('stale rows (not in new upload) have their recon results deleted then are deleted themselves', async () => {
    // Old rows have different supplier+invoice# than the new upload → they are stale
    vi.mocked(prisma.imsInvoice.findMany).mockResolvedValue([
      { id: 'id-old-1', supplier_gstin: 'STALE-GSTIN', invoice_number: 'OLD-001' },
      { id: 'id-old-2', supplier_gstin: 'STALE-GSTIN', invoice_number: 'OLD-002' },
    ] as never)
    vi.mocked(prisma.reconciliationResult.deleteMany).mockResolvedValue({ count: 2 })
    vi.mocked(prisma.imsInvoice.deleteMany).mockResolvedValue({ count: 2 })
    vi.mocked(prisma.imsInvoice.createMany).mockResolvedValue({ count: 1 })

    // makeInvoice() → supplierGstin='29AABCU9603R1ZX', invoiceNo='INV-001' (not stale)
    await replaceImsInvoices('session-123', [makeInvoice()])

    // Recon results for stale rows deleted first (FK constraint)
    expect(prisma.reconciliationResult.deleteMany).toHaveBeenCalledWith({
      where: { ims_invoice_id: { in: ['id-old-1', 'id-old-2'] } },
    })

    // Stale ImsInvoice rows deleted by ID (not session-wide wipe)
    expect(prisma.imsInvoice.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['id-old-1', 'id-old-2'] } },
    })

    // New invoice created (it had no matching existing row)
    expect(prisma.imsInvoice.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            upload_session_id: 'session-123',
            invoice_number: 'INV-001',
          }),
        ]),
      })
    )
  })

  it('calls neither deleteMany when there are no existing invoices and nothing to delete', async () => {
    vi.mocked(prisma.imsInvoice.findMany).mockResolvedValue([])
    vi.mocked(prisma.imsInvoice.createMany).mockResolvedValue({ count: 0 })

    await replaceImsInvoices('session-new', [])

    // No stale rows → no deletes of any kind
    expect(prisma.reconciliationResult.deleteMany).not.toHaveBeenCalled()
    expect(prisma.imsInvoice.deleteMany).not.toHaveBeenCalled()
  })

  it('stale rows are removed and M new rows created — no accumulation', async () => {
    // Old rows have different invoice# than the 2 new invoices → all stale
    vi.mocked(prisma.imsInvoice.findMany).mockResolvedValue([
      { id: 'old-1', supplier_gstin: 'STALE-GSTIN', invoice_number: 'STALE-001' },
      { id: 'old-2', supplier_gstin: 'STALE-GSTIN', invoice_number: 'STALE-002' },
      { id: 'old-3', supplier_gstin: 'STALE-GSTIN', invoice_number: 'STALE-003' },
    ] as never)
    vi.mocked(prisma.reconciliationResult.deleteMany).mockResolvedValue({ count: 3 })
    vi.mocked(prisma.imsInvoice.deleteMany).mockResolvedValue({ count: 3 })
    vi.mocked(prisma.imsInvoice.createMany).mockResolvedValue({ count: 2 })

    const newInvoices = [
      makeInvoice({ invoiceNo: 'NEW-001' }),
      makeInvoice({ invoiceNo: 'NEW-002' }),
    ]

    await replaceImsInvoices('session-123', newInvoices)

    const createCall = vi.mocked(prisma.imsInvoice.createMany).mock.calls[0][0]
    // Exactly 2 records created — old 3 are stale-deleted, not accumulated
    expect((createCall as { data: unknown[] }).data).toHaveLength(2)
  })

  it('maps all invoice fields correctly', async () => {
    vi.mocked(prisma.imsInvoice.findMany).mockResolvedValue([])
    vi.mocked(prisma.imsInvoice.deleteMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.imsInvoice.createMany).mockResolvedValue({ count: 1 })

    const inv = makeInvoice({
      supplierGstin: '27AABCU9603R1ZX',
      invoiceNo: 'INV-999',
      invoiceDate: new Date(2026, 2, 15),  // March 15
      taxableValue: 10000,
      igst: 1800,
      cgst: 0,
      sgst: 0,
      totalValue: 11800,
      pos: '27',
    })

    await replaceImsInvoices('session-abc', [inv])

    const createCall = vi.mocked(prisma.imsInvoice.createMany).mock.calls[0][0]
    const row = (createCall as { data: Record<string, unknown>[] }).data[0]
    expect(row.supplier_gstin).toBe('27AABCU9603R1ZX')
    expect(row.invoice_number).toBe('INV-999')
    expect(row.igst).toBe('1800.00')
    expect(row.cgst).toBe('0.00')
    expect(row.sgst).toBe('0.00')
    expect(row.taxable_value).toBe('10000.00')
    expect(row.invoice_value).toBe('11800.00')
    expect(row.place_of_supply).toBe('27')
    expect(row.ims_action).toBe('PENDING')
  })

  it('uses epoch date when invoiceDate is null', async () => {
    vi.mocked(prisma.imsInvoice.findMany).mockResolvedValue([])
    vi.mocked(prisma.imsInvoice.deleteMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.imsInvoice.createMany).mockResolvedValue({ count: 1 })

    await replaceImsInvoices('session-abc', [makeInvoice({ invoiceDate: null })])

    const createCall = vi.mocked(prisma.imsInvoice.createMany).mock.calls[0][0]
    const row = (createCall as { data: Record<string, unknown>[] }).data[0]
    expect(row.invoice_date).toEqual(new Date(0))
  })

  it('re-uploading the same invoice# updates in-place — ReconciliationResult (is_done) is NOT deleted', async () => {
    // Existing row matches the new invoice by supplier_gstin + invoice_number
    vi.mocked(prisma.imsInvoice.findMany).mockResolvedValue([
      { id: 'existing-id-1', supplier_gstin: '29AABCU9603R1ZX', invoice_number: 'INV-001' },
    ] as never)
    vi.mocked(prisma.imsInvoice.update).mockResolvedValue({} as never)
    vi.mocked(prisma.imsInvoice.createMany).mockResolvedValue({ count: 0 })

    // makeInvoice() defaults: supplierGstin='29AABCU9603R1ZX', invoiceNo='INV-001'
    await replaceImsInvoices('session-123', [makeInvoice()])

    // ReconciliationResult must NOT be deleted — is_done is preserved
    expect(prisma.reconciliationResult.deleteMany).not.toHaveBeenCalled()
    // ImsInvoice row must NOT be deleted — it is updated in-place
    expect(prisma.imsInvoice.deleteMany).not.toHaveBeenCalled()
    // The existing row must be updated in-place (same id → FK to ReconciliationResult intact)
    expect(prisma.imsInvoice.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'existing-id-1' } }),
    )
    // No new rows created (the invoice already existed)
    const createCalls = vi.mocked(prisma.imsInvoice.createMany).mock.calls
    const createCount = createCalls.length === 0
      ? 0
      : (createCalls[0][0] as { data: unknown[] }).data.length
    expect(createCount).toBe(0)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma before importing the module under test
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    imsInvoice: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
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

  it('deletes reconciliation results then IMS invoices before inserting new ones', async () => {
    const existingIds = ['id-old-1', 'id-old-2']
    vi.mocked(prisma.imsInvoice.findMany).mockResolvedValue(
      existingIds.map(id => ({ id })) as never
    )
    vi.mocked(prisma.reconciliationResult.deleteMany).mockResolvedValue({ count: 2 })
    vi.mocked(prisma.imsInvoice.deleteMany).mockResolvedValue({ count: 2 })
    vi.mocked(prisma.imsInvoice.createMany).mockResolvedValue({ count: 1 })

    await replaceImsInvoices('session-123', [makeInvoice()])

    // Must delete recon results first (FK constraint: recon refs ims_invoice)
    expect(prisma.reconciliationResult.deleteMany).toHaveBeenCalledWith({
      where: { ims_invoice_id: { in: existingIds } },
    })

    // Must then delete IMS invoices
    expect(prisma.imsInvoice.deleteMany).toHaveBeenCalledWith({
      where: { upload_session_id: 'session-123' },
    })

    // Must insert the new invoices
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

  it('skips reconciliationResult.deleteMany when no existing invoices', async () => {
    vi.mocked(prisma.imsInvoice.findMany).mockResolvedValue([])
    vi.mocked(prisma.imsInvoice.deleteMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.imsInvoice.createMany).mockResolvedValue({ count: 0 })

    await replaceImsInvoices('session-new', [])

    expect(prisma.reconciliationResult.deleteMany).not.toHaveBeenCalled()
    expect(prisma.imsInvoice.deleteMany).toHaveBeenCalled()
  })

  it('inserts exactly M new records even when N old records existed — no accumulation', async () => {
    vi.mocked(prisma.imsInvoice.findMany).mockResolvedValue(
      ['old-1', 'old-2', 'old-3'].map(id => ({ id })) as never
    )
    vi.mocked(prisma.reconciliationResult.deleteMany).mockResolvedValue({ count: 3 })
    vi.mocked(prisma.imsInvoice.deleteMany).mockResolvedValue({ count: 3 })
    vi.mocked(prisma.imsInvoice.createMany).mockResolvedValue({ count: 2 })

    const newInvoices = [
      makeInvoice({ invoiceNo: 'NEW-001' }),
      makeInvoice({ invoiceNo: 'NEW-002' }),
    ]

    await replaceImsInvoices('session-123', newInvoices)

    const createCall = vi.mocked(prisma.imsInvoice.createMany).mock.calls[0][0]
    // Exactly 2 records inserted — old 3 are gone, not accumulated
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
})

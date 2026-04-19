import { describe, test, expect } from 'vitest'
import Decimal from 'decimal.js'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { parseImsJson, type NormalizedImsInvoice } from '@/lib/parsers/ims-json-parser'
import { parseTallyCsv, type NormalizedTallyRow } from '@/lib/parsers/tally-csv-parser'
import { reconcile } from '@/lib/reconciliation'

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

describe('EXACT_MATCH', () => {
  test('matching GSTIN + invoice# + value + date → AUTO_ACCEPTED, no reason, itcAtRisk=0', () => {
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
  test('no Tally entry → NOT_IN_BOOKS', () => {
    const ims = makeIms({ invoiceNum: 'INV-26-005', igst: new Decimal(0), cgst: new Decimal(900), sgst: new Decimal(900) })
    const results = reconcile([ims], [])
    expect(results[0].result).toBe('NOT_IN_BOOKS')
    expect(results[0].itcAtRisk.toNumber()).toBe(1800)
  })
})

describe('VALUE_OVER_10', () => {
  test('Tally >10% higher than IMS → AUTO_REJECTED', () => {
    const ims = makeIms({ invoiceNum: 'PKG-008-26', totalValue: new Decimal(67072), igst: new Decimal(14672), cgst: new Decimal(0), sgst: new Decimal(0) })
    const tally = makeTally({ invoiceNum: 'PKG-008-26', totalAmount: new Decimal(77840), igst: new Decimal(17027), cgst: new Decimal(0), sgst: new Decimal(0) })
    const results = reconcile([ims], [tally])
    expect(results[0].result).toBe('AUTO_REJECTED')
    expect(results[0].reason).toContain('exceeds 10%')
  })
})

describe('VALUE_MISMATCH_2_10', () => {
  test('Tally 2–10% higher than IMS → PENDING_REVIEW', () => {
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
  test('10-day gap → PENDING_REVIEW', () => {
    const ims = makeIms({ invoiceNum: 'PKG-038-26', invoiceDate: '2026-02-15', totalValue: new Decimal(284340), igst: new Decimal(13540), cgst: new Decimal(0), sgst: new Decimal(0) })
    const tally = makeTally({ invoiceNum: 'PKG-038-26', invoiceDate: '2026-02-25', totalAmount: new Decimal(284340), igst: new Decimal(13540), cgst: new Decimal(0), sgst: new Decimal(0) })
    const results = reconcile([ims], [tally])
    expect(results[0].result).toBe('PENDING_REVIEW')
    expect(results[0].reason).toContain('10 days')
  })
})

describe('DUPLICATE', () => {
  test('same invoice# from same supplier twice → AUTO_REJECTED with Duplicate reason', () => {
    const inv = makeIms({ invoiceNum: 'INV-26-034' })
    const tally = makeTally({ invoiceNum: 'INV-26-034' })
    const results = reconcile([inv, inv], [tally])
    // Golden fixture shows 1 result per unique GSTIN+invoice pair (deduplicated)
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].result).toBe('AUTO_REJECTED')
    expect(results[0].reason).toContain('Duplicate')
  })
})

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
        `Wrong outcome for ${row.IMS_Invoice_ID}: expected ${row.Recon_Output}`
      ).toBe(row.Recon_Output)
    }
  })
})

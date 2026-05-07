import { describe, test, expect } from 'vitest'
import Decimal from 'decimal.js'
import { parseImsJson } from '@/lib/parsers/ims-json-parser'
import { parseTallyCsv } from '@/lib/parsers/tally-csv-parser'

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
    expect(result[0].cgst.toNumber()).toBe(0)
    expect(result[0].sgst.toNumber()).toBe(0)
  })

  test('parses multiple suppliers and multiple invoices', () => {
    const json = JSON.stringify({
      gstin: 'X',
      ret_period: '022026',
      docdata: {
        b2b: [
          {
            ctin: 'A',
            inv: [{ inum: 'I1', idt: '01-01-2026', val: 100, pos: '27', itc_avl: 'Y', itms: [{ num: 1, itm_det: { rt: 18, txval: 84, iamt: 16, camt: 0, samt: 0, csamt: 0 } }] }],
          },
          {
            ctin: 'B',
            inv: [
              { inum: 'I2', idt: '02-01-2026', val: 200, pos: '27', itc_avl: 'Y', itms: [{ num: 1, itm_det: { rt: 18, txval: 168, iamt: 32, camt: 0, samt: 0, csamt: 0 } }] },
              { inum: 'I3', idt: '03-01-2026', val: 300, pos: '27', itc_avl: 'Y', itms: [{ num: 1, itm_det: { rt: 18, txval: 252, iamt: 48, camt: 0, samt: 0, csamt: 0 } }] },
            ],
          },
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

  test('auto-detects non-standard column names without an explicit map', () => {
    // Uses alias names (Party GSTIN, Ledger Name, Voucher No) not in DEFAULT_TALLY_COLUMN_MAP
    const ALT_CSV = `Party GSTIN,Ledger Name,Voucher No,Invoice Date,Taxable Value,IGST Amount,CGST Amount,SGST Amount,Total Amount
27ERMJD3988G1ZJ,National Chemicals,BILL26001,02/02/2026,432200,0,25932,25932,484064
`
    const rows = parseTallyCsv(ALT_CSV)   // no columnMap — must auto-detect
    expect(rows).toHaveLength(1)
    expect(rows[0].supplierGstin).toBe('27ERMJD3988G1ZJ')
    expect(rows[0].invoiceNum).toBe('BILL26001')
    expect(rows[0].cgst.toNumber()).toBe(25932)
  })
})

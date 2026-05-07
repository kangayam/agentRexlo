import { describe, it, expect } from 'vitest'
import { parseIMSJson } from '@/lib/parsers/ims-json-parser'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const GSTN_DOCDATA = {
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
            itms: [{ num: 1, itm_det: { rt: 12, txval: 432200, iamt: 0, camt: 25932, samt: 25932, csamt: 0 } }],
          },
        ],
      },
    ],
  },
}

const FLAT_FORMAT = {
  gstin: '27AABCU9603R1ZX',
  period: '032026',
  invoices: [
    {
      supplier_gstin: '29AABCN9012R1ZK',
      invoice_no: 'INV/2026/001',
      invoice_date: '01/03/2026',
      taxable_value: 50000,
      igst: 9000,
      cgst: 0,
      sgst: 0,
      total_value: 59000,
    },
  ],
}

// ── parseIMSJson — standard GSTN docdata/b2b format ─────────────────────────

describe('parseIMSJson — GSTN docdata/b2b format', () => {
  it('extracts gstin and period from top-level fields', () => {
    const result = parseIMSJson(GSTN_DOCDATA)
    expect(result.gstin).toBe('27AABCU9603R1ZX')
    expect(result.period).toBe('022026')
  })

  it('flattens supplier → invoice structure and sets supplierGstin from ctin', () => {
    const result = parseIMSJson(GSTN_DOCDATA)
    expect(result.invoices).toHaveLength(1)
    expect(result.invoices[0].supplierGstin).toBe('27ERMJD3988G1ZJ')
    expect(result.invoices[0].invoiceNo).toBe('BILL26001')
  })

  it('reads tax values from itms[0].itm_det', () => {
    const result = parseIMSJson(GSTN_DOCDATA)
    const inv = result.invoices[0]
    expect(inv.igst).toBe(0)
    expect(inv.cgst).toBe(25932)
    expect(inv.sgst).toBe(25932)
    expect(inv.taxableValue).toBe(432200)
  })

  it('parses DD-MM-YYYY date into a Date object', () => {
    const inv = parseIMSJson(GSTN_DOCDATA).invoices[0]
    expect(inv.invoiceDate).toBeInstanceOf(Date)
    expect(inv.invoiceDate?.getFullYear()).toBe(2026)
    expect(inv.invoiceDate?.getMonth()).toBe(1)  // 0-indexed February
    expect(inv.invoiceDate?.getDate()).toBe(2)
  })

  it('sums tax across multiple itms entries', () => {
    const input = {
      gstin: '27X',
      ret_period: '022026',
      docdata: {
        b2b: [{
          ctin: '27ERMJD3988G1ZJ',
          inv: [{
            inum: 'MULTI001', idt: '01-01-2026', val: 100000, pos: '27',
            itms: [
              { num: 1, itm_det: { rt: 18, txval: 40000, iamt: 7200, camt: 0, samt: 0, csamt: 0 } },
              { num: 2, itm_det: { rt: 18, txval: 40000, iamt: 7200, camt: 0, samt: 0, csamt: 0 } },
            ],
          }],
        }],
      },
    }
    const inv = parseIMSJson(input).invoices[0]
    expect(inv.igst).toBe(14400)
    expect(inv.taxableValue).toBe(80000)
  })
})

// ── parseIMSJson — flat / alternative format ─────────────────────────────────

describe('parseIMSJson — flat invoice array format', () => {
  it('finds invoices array and extracts supplier_gstin / invoice_no', () => {
    const result = parseIMSJson(FLAT_FORMAT)
    expect(result.invoices).toHaveLength(1)
    const inv = result.invoices[0]
    expect(inv.supplierGstin).toBe('29AABCN9012R1ZK')
    expect(inv.invoiceNo).toBe('INV/2026/001')
  })

  it('reads period from "period" key (not ret_period)', () => {
    expect(parseIMSJson(FLAT_FORMAT).period).toBe('032026')
  })

  it('parses DD/MM/YYYY date', () => {
    const inv = parseIMSJson(FLAT_FORMAT).invoices[0]
    expect(inv.invoiceDate).toBeInstanceOf(Date)
    expect(inv.invoiceDate?.getFullYear()).toBe(2026)
    expect(inv.invoiceDate?.getMonth()).toBe(2)  // March
  })

  it('reads flat tax fields directly', () => {
    const inv = parseIMSJson(FLAT_FORMAT).invoices[0]
    expect(inv.igst).toBe(9000)
    expect(inv.taxableValue).toBe(50000)
    expect(inv.totalValue).toBe(59000)
  })
})

// ── parseIMSJson — computed totalValue ───────────────────────────────────────

describe('parseIMSJson — totalValue fallback', () => {
  it('computes totalValue from tax components when total field is absent', () => {
    const input = {
      gstin: '27X',
      ret_period: '022026',
      invoices: [{
        supplier_gstin: '27ERMJD3988G1ZJ',
        invoice_no: 'INV001',
        taxable_value: 1000,
        igst: 180,
        cgst: 0,
        sgst: 0,
      }],
    }
    expect(parseIMSJson(input).invoices[0].totalValue).toBe(1180)
  })
})

// ── parseIMSJson — validation / filtering ────────────────────────────────────

describe('parseIMSJson — validation', () => {
  it('filters out invoices without supplierGstin or invoiceNo', () => {
    const input = {
      gstin: '27X', ret_period: '022026',
      invoices: [
        { supplier_gstin: '27ERMJD3988G1ZJ', invoice_no: 'INV001', igst: 0, cgst: 0, sgst: 0, taxable_value: 100, total_value: 100 },
        { invoice_no: 'INV002', igst: 0, cgst: 0, sgst: 0, taxable_value: 100, total_value: 100 },
        { supplier_gstin: '27ERMJD3988G1ZJ', igst: 0, cgst: 0, sgst: 0, taxable_value: 100, total_value: 100 },
      ],
    }
    const result = parseIMSJson(input)
    expect(result.invoices).toHaveLength(1)
    expect(result.invoices[0].invoiceNo).toBe('INV001')
  })

  it('throws a descriptive error for null input', () => {
    expect(() => parseIMSJson(null)).toThrow('Invalid file')
  })

  it('throws a descriptive error for non-object input', () => {
    expect(() => parseIMSJson('not an object')).toThrow('Invalid file')
    expect(() => parseIMSJson(42)).toThrow('Invalid file')
  })

  it('throws when no invoice array can be found anywhere', () => {
    expect(() => parseIMSJson({ gstin: 'X', ret_period: '022026' })).toThrow('No invoices found')
  })

  it('throws with the "no valid invoices" message when all invoices fail validation', () => {
    const input = {
      gstin: '27X', ret_period: '022026',
      invoices: [
        { invoice_no: 'INV001' },  // missing supplierGstin
      ],
    }
    expect(() => parseIMSJson(input)).toThrow('No valid invoices found')
  })
})

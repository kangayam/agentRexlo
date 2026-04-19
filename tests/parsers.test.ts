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

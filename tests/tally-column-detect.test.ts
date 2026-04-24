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

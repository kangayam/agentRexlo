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
})

describe('normalizeGstin', () => {
  test('uppercases', () => {
    expect(normalizeGstin('27ermjd3988g1zj')).toBe('27ERMJD3988G1ZJ')
  })
  test('trims', () => {
    expect(normalizeGstin('  27ERMJD3988G1ZJ  ')).toBe('27ERMJD3988G1ZJ')
  })
})

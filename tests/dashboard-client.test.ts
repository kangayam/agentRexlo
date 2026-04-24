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

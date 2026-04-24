import { describe, test, expect } from 'vitest'
import { deriveClientStatus, sortCaRows, type CaClientRow } from '@/lib/dashboard/ca'

describe('deriveClientStatus', () => {
  test('No Upload when hasUpload is false', () => {
    expect(deriveClientStatus(0, '0.00', false)).toBe('No Upload')
  })

  test('All Done when pending actions = 0 and hasUpload is true', () => {
    expect(deriveClientStatus(0, '0.00', true)).toBe('All Done')
  })

  test('Urgent when pending actions > 0 and ITC > 10000', () => {
    expect(deriveClientStatus(3, '15000.00', true)).toBe('Urgent')
  })

  test('Pending when pending actions > 0 but ITC <= 10000', () => {
    expect(deriveClientStatus(2, '5000.00', true)).toBe('Pending')
  })

  test('Pending when pending actions > 0 and ITC exactly 10000', () => {
    expect(deriveClientStatus(1, '10000.00', true)).toBe('Pending')
  })
})

describe('sortCaRows', () => {
  function makeRow(overrides: Partial<CaClientRow>): CaClientRow {
    return {
      clientId: 'c1',
      name: 'Test',
      gstinCount: 1,
      period: '2026-04',
      itcAtRisk: '0.00',
      pendingActions: 0,
      status: 'All Done',
      ...overrides,
    }
  }

  test('sorts Urgent before Pending before All Done before No Upload', () => {
    const rows = [
      makeRow({ clientId: 'c4', status: 'No Upload' }),
      makeRow({ clientId: 'c2', status: 'Pending',  itcAtRisk: '5000.00' }),
      makeRow({ clientId: 'c1', status: 'Urgent',   itcAtRisk: '20000.00' }),
      makeRow({ clientId: 'c3', status: 'All Done' }),
    ]
    const sorted = sortCaRows(rows)
    expect(sorted.map(r => r.clientId)).toEqual(['c1', 'c2', 'c3', 'c4'])
  })

  test('within same status, sorts by ITC at risk descending', () => {
    const rows = [
      makeRow({ clientId: 'c1', status: 'Urgent', itcAtRisk: '10000.00' }),
      makeRow({ clientId: 'c2', status: 'Urgent', itcAtRisk: '50000.00' }),
    ]
    const sorted = sortCaRows(rows)
    expect(sorted.map(r => r.clientId)).toEqual(['c2', 'c1'])
  })
})

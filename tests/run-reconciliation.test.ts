import { describe, test, expect } from 'vitest'
import { matchOutcomeToMatchLevel } from '@/lib/reconciliation/run'

describe('matchOutcomeToMatchLevel', () => {
  test('AUTO_ACCEPTED → EXACT', () => {
    expect(matchOutcomeToMatchLevel('AUTO_ACCEPTED')).toBe('EXACT')
  })
  test('NOT_IN_BOOKS → NO_MATCH', () => {
    expect(matchOutcomeToMatchLevel('NOT_IN_BOOKS')).toBe('NO_MATCH')
  })
  test('PENDING_REVIEW → VALUE_TOLERANCE', () => {
    expect(matchOutcomeToMatchLevel('PENDING_REVIEW')).toBe('VALUE_TOLERANCE')
  })
  test('AUTO_REJECTED → SOFT_INVOICE', () => {
    expect(matchOutcomeToMatchLevel('AUTO_REJECTED')).toBe('SOFT_INVOICE')
  })
})

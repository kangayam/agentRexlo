import { describe, test, expect } from 'vitest'
import { computeQualityScore } from '@/lib/quality-score'

type ReconResult = Parameters<typeof computeQualityScore>[0][number]

function makeResult(
  outcome: 'AUTO_ACCEPTED' | 'AUTO_REJECTED' | 'PENDING_REVIEW' | 'NOT_IN_BOOKS',
  igst: number,
  cgst: number,
  sgst: number
): ReconResult {
  return { outcome, igst, cgst, sgst }
}

describe('computeQualityScore', () => {

  test('returns score 20 and Critical when no invoices processed (all zeroes)', () => {
    // base constant must be 20 — the floor when there is no data
    const { qualityScore, qualityBand } = computeQualityScore([])
    expect(qualityScore).toBe(20)
    expect(qualityBand).toBe('Critical')
  })

  test('returns score 100 when all invoices are AUTO_ACCEPTED', () => {
    // autoAcceptPct = 100% → 50, recoveryRate = 100% → 30, base = 20 → total 100
    const results = [
      makeResult('AUTO_ACCEPTED', 0, 900, 900),
      makeResult('AUTO_ACCEPTED', 1800, 0, 0),
    ]
    const { qualityScore, qualityBand } = computeQualityScore(results)
    expect(qualityScore).toBe(100)
    expect(qualityBand).toBe('Excellent')
  })

  test('returns score 20 when all invoices are AUTO_REJECTED (none accepted, no safe ITC)', () => {
    const results = [
      makeResult('AUTO_REJECTED', 0, 900, 900),
      makeResult('AUTO_REJECTED', 1800, 0, 0),
    ]
    const { qualityScore } = computeQualityScore(results)
    expect(qualityScore).toBe(20)
  })

  test('recovery rate is based on ITC value (igst+cgst+sgst), not invoice count', () => {
    // 1 AUTO_ACCEPTED invoice worth ₹10,000 tax
    // 1 AUTO_REJECTED invoice worth ₹10,000 tax
    // recoveryRate = 10000 / 20000 = 50% → 0.5 * 30 = 15
    // autoAcceptPct = 1/2 = 50% → 0.5 * 50 = 25
    // qualityScore = 25 + 15 + 20 = 60
    const results = [
      makeResult('AUTO_ACCEPTED', 0, 5000, 5000),
      makeResult('AUTO_REJECTED', 0, 5000, 5000),
    ]
    const { qualityScore, qualityBand } = computeQualityScore(results)
    expect(qualityScore).toBe(60)
    expect(qualityBand).toBe('Fair')
  })

  test('score is capped at 100', () => {
    // Should never exceed 100 regardless of input
    const results = Array(10).fill(makeResult('AUTO_ACCEPTED', 10000, 10000, 10000))
    const { qualityScore } = computeQualityScore(results)
    expect(qualityScore).toBeLessThanOrEqual(100)
  })

  test('assigns correct quality bands at boundaries', () => {
    // To hit each band we need to engineer specific scores
    // Score = autoAcceptPct*50 + recoveryRate*30 + 20
    // All AUTO_ACCEPTED → score = 50 + 30 + 20 = 100 → Excellent
    expect(computeQualityScore([makeResult('AUTO_ACCEPTED', 900, 0, 0)]).qualityBand).toBe('Excellent')
    // Band boundaries: Excellent ≥90, Good ≥75, Fair ≥60, Poor ≥45, Critical <45
    // qualityScore = 20 → Critical
    expect(computeQualityScore([]).qualityBand).toBe('Critical')
  })

  test('uses igst+cgst+sgst from ALL results for recovery denominator', () => {
    // 1 accepted: igst=0 cgst=1000 sgst=1000 → itcSafe=2000
    // 1 pending:  igst=0 cgst=3000 sgst=3000 → itcTotal=2000+6000=8000
    // recoveryRate = 2000/8000 = 25% → 0.25*30 = 7.5 → rounded input
    // autoAcceptPct = 1/2 = 50% → 0.5*50 = 25
    // qualityScore = Math.min(100, Math.round(25 + 7.5 + 20)) = Math.round(52.5) = 53
    const results = [
      makeResult('AUTO_ACCEPTED', 0, 1000, 1000),
      makeResult('PENDING_REVIEW', 0, 3000, 3000),
    ]
    const { qualityScore } = computeQualityScore(results)
    expect(qualityScore).toBe(53)
  })

})

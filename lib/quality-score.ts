type ReconResult = {
  outcome: 'AUTO_ACCEPTED' | 'AUTO_REJECTED' | 'PENDING_REVIEW' | 'NOT_IN_BOOKS'
  igst:    number
  cgst:    number
  sgst:    number
}

export function computeQualityScore(results: ReconResult[]): {
  qualityScore: number
  qualityBand:  'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical'
} {
  const total    = results.length || 1
  const accepted = results.filter(r => r.outcome === 'AUTO_ACCEPTED').length

  const autoAcceptPct = accepted / total

  const itcSafe  = results
    .filter(r => r.outcome === 'AUTO_ACCEPTED')
    .reduce((s, r) => s + r.igst + r.cgst + r.sgst, 0)

  const itcTotal = results
    .reduce((s, r) => s + r.igst + r.cgst + r.sgst, 0) || 1

  const recoveryRate = itcSafe / itcTotal

  const qualityScore = Math.min(100,
    Math.round((autoAcceptPct * 50) + (recoveryRate * 30) + 20)
  )

  const qualityBand = qualityScore >= 90 ? 'Excellent'
                    : qualityScore >= 75 ? 'Good'
                    : qualityScore >= 60 ? 'Fair'
                    : qualityScore >= 45 ? 'Poor'
                    : 'Critical'

  return { qualityScore, qualityBand }
}

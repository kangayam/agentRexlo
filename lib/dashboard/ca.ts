import Decimal from 'decimal.js'

export type ClientStatus = 'Urgent' | 'Pending' | 'All Done' | 'No Upload'
export type QualityBand = 'Excellent' | 'Good' | 'Fair' | 'Poor'

export interface CaClientRow {
  clientId:       string
  name:           string
  gstinCount:     number
  period:         string | null
  itcAtRisk:      string
  itcLeakage:     string
  leakagePct:     number
  qualityScore:   number
  qualityBand:    QualityBand
  daysUntil14th:  number
  pre14thAtRisk:  string
  scoreHistory:   number[]
  pendingActions: number
  status:         ClientStatus
}

export function deriveClientStatus(
  pendingActions: number,
  itcAtRisk: string,
  hasUpload: boolean,
): ClientStatus {
  if (!hasUpload) return 'No Upload'
  if (pendingActions === 0) return 'All Done'
  if (new Decimal(itcAtRisk).gt(10000)) return 'Urgent'
  return 'Pending'
}

export function deriveQualityBand(score: number): QualityBand {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Poor'
}

const STATUS_ORDER: Record<ClientStatus, number> = {
  Urgent:      0,
  Pending:     1,
  'All Done':  2,
  'No Upload': 3,
}

export function sortCaRows(rows: CaClientRow[]): CaClientRow[] {
  return [...rows].sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (statusDiff !== 0) return statusDiff
    return new Decimal(b.itcAtRisk).minus(a.itcAtRisk).toNumber()
  })
}

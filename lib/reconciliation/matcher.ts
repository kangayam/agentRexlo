import type { NormalizedImsInvoice } from '@/lib/parsers/ims-json-parser'
import type { NormalizedTallyRow } from '@/lib/parsers/tally-csv-parser'
import { normalizeGstin, normalizeInvoiceNumber, dateDiffDays } from '@/lib/reconciliation/normalize'

export type MatchStrategy = 'A' | 'B' | 'none'

export interface CandidateResult {
  tally: NormalizedTallyRow | null
  strategy: MatchStrategy
}

export function findCandidates(
  inv: NormalizedImsInvoice,
  tallyByInvoice: Map<string, NormalizedTallyRow[]>,
  allTallyRows: NormalizedTallyRow[]
): CandidateResult {
  // Strategy A: exact normalized invoice# lookup
  const normalizedNum = normalizeInvoiceNumber(inv.invoiceNum)
  const strategyA = tallyByInvoice.get(normalizedNum) ?? []

  if (strategyA.length > 0) {
    return { tally: pickBest(inv, strategyA), strategy: 'A' }
  }

  // Strategy B: same normalized GSTIN + total value within 2%
  const normalizedGstin = normalizeGstin(inv.supplierGstin)
  const strategyB = allTallyRows.filter(row => {
    if (normalizeGstin(row.supplierGstin) !== normalizedGstin) return false
    const delta = row.totalAmount.minus(inv.totalValue).abs()
    return delta.div(inv.totalValue).times(100).lte(2)
  })

  if (strategyB.length > 0) {
    return { tally: pickBest(inv, strategyB), strategy: 'B' }
  }

  return { tally: null, strategy: 'none' }
}

function pickBest(inv: NormalizedImsInvoice, candidates: NormalizedTallyRow[]): NormalizedTallyRow {
  return candidates.reduce((prev, curr) => {
    const prevDelta = inv.totalValue.minus(prev.totalAmount).abs()
    const currDelta = inv.totalValue.minus(curr.totalAmount).abs()
    if (currDelta.lt(prevDelta)) return curr
    if (currDelta.gt(prevDelta)) return prev
    return dateDiffDays(inv.invoiceDate, curr.invoiceDate) <
      dateDiffDays(inv.invoiceDate, prev.invoiceDate)
      ? curr
      : prev
  })
}
